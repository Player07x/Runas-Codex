// R4 (docs/adr/0032-tunel-publico-android.md): a sala hospedada no emulador ganha o link público pela Cloudflare e um
// navegador de fora (o próprio runner do CI, pela internet) abre a sala por ele. Depende da internet e da Cloudflare,
// por isso roda no job de revisão, que não segura a publicação.
// Uso: node mobile/tests/room-tunnel.cdp.mjs <pasta com fixture.json e fixture/> [endpoint devtools]
import { readFile, readdir, writeFile } from 'node:fs/promises'
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
const fetchRetry = async (url, init, tries = 20) => {
  let last
  for (let n = 0; n < tries; n++) {
    try { const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) }); if (response.status < 500) return response; last = new Error(`status ${response.status}`) } catch (error) { last = error }
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
  const health = await fetchRetry(base + '/healthz')
  check('a sala responde pela internet', health.status === 200 && (await health.text()) === 'ok', health.status)
  const page = await fetchRetry(link)
  check('a página dos jogadores abre pelo link público', page.status === 200 && /<html/i.test(await page.text()), page.status)
  check('sem a chave, a página não abre', (await fetchRetry(base + '/')).status === 404)
  check('o mestre pelo navegador não passa pelo túnel', (await fetchRetry(base + '/master')).status === 404)
  const foreign = await fetchRetry(`${base}/seat/join?k=${key}`, { method: 'POST', headers: { Origin: 'https://externo.invalid', 'Content-Type': 'application/json' }, body: '{"code":"AAAAAAAA"}' })
  check('origem de outro site é recusada pelo túnel', foreign.status === 403, foreign.status)
  await appButton('Testar link')
  await app.until(`/O link responde/.test(document.querySelector('.player-panel')?.textContent ?? '')`, 120)
  check('“Testar link” confirma do próprio celular', true)
  const shot = await app.send('Page.captureScreenshot', { format: 'png' })
  await writeFile(output + '/sala-tunel.png', Buffer.from(shot.data, 'base64'))
  await appButton('Desligar')
  let closed = false
  for (let n = 0; n < 20 && !closed; n++) {
    await sleep(1500)
    try { closed = (await fetch(base + '/healthz', { signal: AbortSignal.timeout(8000) })).status !== 200 } catch { closed = true }
  }
  check('desligar a sala derruba o link público', closed)
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error)
  console.error(result.error)
} finally {
  result.errors = app.errors.slice(0, 5)
  await writeFile(output + '/resultado.json', JSON.stringify(result, null, 2))
  app.close()
}
if (result.error || result.checks.some(c => !c.ok)) process.exit(1)
