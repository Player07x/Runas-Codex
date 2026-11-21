// R4 (docs/adr/0032-tunel-publico-android.md): a sala hospedada no emulador ganha o link público pela Cloudflare e um
// navegador de fora (o próprio runner do CI, pela internet) abre a sala por ele. Depende da internet e da Cloudflare,
// por isso roda no job de revisão, que não segura a publicação.
// Uso: node mobile/tests/room-tunnel.cdp.mjs <pasta com fixture.json e fixture/> [endpoint devtools]
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { lookup as systemLookup, Resolver } from 'node:dns/promises'
import { request } from 'node:https'
import { connectDevtools, sleep } from './devtools-client.mjs'

const output = process.argv[2] ?? '/tmp/runas-android-review/tunel'
const endpoint = process.argv[3] ?? 'http://127.0.0.1:9224'
const result = { checks: [], timings: {} }
const check = (label, ok, detail) => { result.checks.push({ label, ok: Boolean(ok), detail }); console.log(ok ? 'OK:' : 'FALHOU:', label, ok ? '' : detail ?? '') }
const app = await connectDevtools(endpoint, t => t.url.startsWith('https://localhost'))
const appButton = async text => {
  await app.until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim().startsWith(${JSON.stringify(text)}))`)
  await app.run(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)})).click();true`)
}
// O nome *.trycloudflare.com só existe depois que a Cloudflare o publica; antes disso a resposta é NXDOMAIN, que o
// resolvedor do runner guarda por até 60 s (TTL mínimo do SOA de trycloudflare.com). Consultado cedo demais, todas as
// tentativas falhavam na hora com "fetch failed" (3 vezes na 1.6/1.7). Por isso o link público é resolvido por
// resolvedores públicos, que não guardam a resposta entre consultas, e cada falha registra a causa.
const publicDns = new Resolver({ timeout: 3000, tries: 2 })
publicDns.setServers(['1.1.1.1', '8.8.8.8'])
const describe = error => {
  const cause = error?.cause ?? error
  return [error?.message, cause?.code, cause?.hostname].filter((v, i, all) => v && all.indexOf(v) === i).join(' · ')
}
const publicLookup = (hostname, options, callback) => {
  const done = addresses => options.all ? callback(null, addresses.map(address => ({ address, family: 4 }))) : callback(null, addresses[0], 4)
  publicDns.resolve4(hostname).then(done, error =>
    // Sem acesso aos resolvedores públicos (bloqueio de rede), vale o DNS do sistema.
    ['ENOTFOUND', 'ENODATA'].includes(error.code) ? callback(error) : systemLookup(hostname, { family: 4, all: true }).then(found => done(found.map(f => f.address)), callback))
}
const publicFetch = (url, { method = 'GET', headers = {}, body } = {}, timeout = 10000) => new Promise((resolve, reject) => {
  const sent = body === undefined ? headers : { ...headers, 'Content-Length': Buffer.byteLength(body) }
  const req = request(url, { method, headers: sent, lookup: publicLookup, timeout }, res => {
    const chunks = []
    res.on('data', chunk => chunks.push(chunk))
    res.on('end', () => { const text = Buffer.concat(chunks).toString('utf8'); resolve({ status: res.statusCode, text: async () => text }) })
    res.on('error', reject)
  })
  req.on('timeout', () => req.destroy(Object.assign(new Error('tempo esgotado'), { code: 'ETIMEDOUT' })))
  req.on('error', reject)
  if (body !== undefined) req.write(body)
  req.end()
})
result.retries = []
const fetchRetry = async (url, init, tries = 20) => {
  let last
  for (let n = 0; n < tries; n++) {
    try { const response = await publicFetch(url, init); if (response.status < 500) return response; last = new Error(`status ${response.status}`) } catch (error) { last = error }
    if (result.retries.length < 40) result.retries.push(`${new URL(url).pathname} #${n + 1}: ${describe(last)}`)
    await sleep(1500)
  }
  throw last
}
try {
  await app.until('window.Capacitor?.Plugins?.RunasVault')
  // A ponte do cofre grava a mesa na área oculta, como no smoke da sala.
  const seed = async (folder, prefix = '') => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const relative = prefix + entry.name, full = folder + '/' + entry.name
      if (entry.isDirectory()) await seed(full, relative + '/')
      else if (relative.startsWith('.runas/mesas/')) await app.run(`window.Capacitor.Plugins.RunasVault.writeManagedTransfer(${JSON.stringify({ path: relative, base64: (await readFile(full)).toString('base64'), expected: null })})`)
    }
  }
  await seed(output + '/fixture')
  check('o APK traz o cloudflared desta arquitetura', (await app.run(`window.Capacitor.Plugins.RunasRoom.tunnelAvailable()`))?.available === true)
  await app.run(`location.hash='#/vtt/mesa/x7-ci';true`)
  await app.until(`document.querySelector('.table-title')?.textContent.includes('Sala Android X7')`)
  await app.run(`document.querySelector('[title="Sala dos jogadores"]').click();true`)
  await appButton('Ligar transmissão')
  await app.until(`document.querySelector('[aria-label="Link da sala"]')?.value`)
  const lan = await app.run(`document.querySelector('[aria-label="Link da sala"]').value`)
  const key = new URL(lan).searchParams.get('k')
  // A confirmação do mestre vem do diálogo nativo; aqui ela é aceita pelo teste.
  await app.run(`window.confirm=()=>true;true`)
  const started = Date.now()
  await appButton('Gerar link público')
  let link = null, error = null
  for (let n = 0; n < 120 && !link && !error; n++) {
    await sleep(1000)
    const state = await app.run(`({link:document.querySelector('[aria-label="Link da sala"]')?.value??'',error:document.querySelector('.player-panel .error')?.textContent??null})`)
    if (/trycloudflare\.com/.test(state.link)) link = state.link
    else if (state.error) error = state.error
  }
  result.timings.tunnelMs = Date.now() - started
  check('o celular abre o túnel e o painel mostra o link público', link, error ?? 'sem link em 120 s')
  if (!link) throw new Error(error ?? 'Túnel não abriu.')
  const publicUrl = new URL(link), base = publicUrl.origin
  check('o link público leva a chave da sala', publicUrl.searchParams.get('k') === key)
  // Diagnóstico: quanto tempo o nome leva para existir nos resolvedores públicos. O DNS do runner fica para depois do
  // “Testar link”: o emulador pergunta a ele, e uma consulta feita cedo demais guardava o “não existe” por 60 s (TTL
  // negativo de trycloudflare.com), que o app recebia no lugar da resposta (4 de 8 falhas em 20/11).
  result.dns = { host: publicUrl.hostname }
  const dnsStarted = Date.now()
  let addresses = null
  for (let n = 0; n < 45 && !addresses; n++) {
    try { addresses = await publicDns.resolve4(publicUrl.hostname) } catch (error) { result.dns.public = describe(error); await sleep(2000) }
  }
  result.timings.dnsMs = Date.now() - dnsStarted
  if (addresses) result.dns.public = addresses.join(', ')
  check('o nome do link público existe no DNS', addresses, result.dns.public)
  const health = await fetchRetry(base + '/healthz')
  check('a sala responde pela internet', health.status === 200 && (await health.text()) === 'ok', health.status)
  const page = await fetchRetry(link)
  check('a página dos jogadores abre pelo link público', page.status === 200 && /<html/i.test(await page.text()), page.status)
  check('sem a chave, a página não abre', (await fetchRetry(base + '/')).status === 404)
  check('o mestre pelo navegador não passa pelo túnel', (await fetchRetry(base + '/master')).status === 404)
  const foreign = await fetchRetry(`${base}/seat/join?k=${key}`, { method: 'POST', headers: { Origin: 'https://externo.invalid', 'Content-Type': 'application/json' }, body: '{"code":"AAAAAAAA"}' })
  check('origem de outro site é recusada pelo túnel', foreign.status === 403, foreign.status)
  // O nativo espera até 10 s pela conexão e 10 s pela resposta.
  const testLink = async () => {
    await appButton('Testar link')
    const answer = `document.querySelector('.player-panel')?.textContent.match(/O link responde|O link não respondeu[^.]*|ainda não existe para o DNS/)?.[0]`
    await app.until(answer, 200)
    return app.run(answer)
  }
  let linkTest = await testLink()
  // Nome ainda desconhecido para o DNS do emulador: o painel pede um minuto, e o teste segue o conselho uma vez.
  if (linkTest === 'ainda não existe para o DNS') {
    result.linkTestRetry = true
    await sleep(65000)
    linkTest = await testLink()
  }
  try { result.dns.system = (await systemLookup(publicUrl.hostname)).address } catch (error) { result.dns.system = describe(error) }
  check('“Testar link” confirma do próprio celular', linkTest === 'O link responde', linkTest)
  const shot = await app.send('Page.captureScreenshot', { format: 'png' })
  await writeFile(output + '/sala-tunel.png', Buffer.from(shot.data, 'base64'))
  await appButton('Desligar')
  let closed = false
  for (let n = 0; n < 20 && !closed; n++) {
    await sleep(1500)
    try { closed = (await publicFetch(base + '/healthz', {}, 8000)).status !== 200 } catch { closed = true }
  }
  check('desligar a sala derruba o link público', closed)
} catch (error) {
  result.error = error instanceof Error ? describe(error) : String(error)
  console.error(result.error)
  if (result.retries.length) console.error(result.retries.slice(-5).join('\n'))
} finally {
  result.errors = app.errors.slice(0, 5)
  await writeFile(output + '/resultado.json', JSON.stringify(result, null, 2))
  app.close()
}
if (result.error || result.checks.some(c => !c.ok)) process.exit(1)
