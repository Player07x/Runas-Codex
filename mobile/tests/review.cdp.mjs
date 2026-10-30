// R1 (docs/tarefas/revisao-1.0.md): revisão das telas no WebView do app, no emulador Android. Descobre as rotas pelos
// links da própria interface e, em cada uma, mede rolagem para os lados, título da página, `h1`, `aria-current`, alvos
// de toque menores que 44 px, erros de JavaScript e, se pedido, a varredura do axe-core e uma captura da tela.
// Com `android`, confere também o botão voltar do sistema e o teclado sobre o editor.
// Uso: node mobile/tests/review.cdp.mjs <endpoint> <pasta de saída> <passada> <axe.min.js|-> [capturas] [android] [tema=claro]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { connectDevtools, sleep } from './devtools-client.mjs'

const [endpoint = 'http://127.0.0.1:9224', outputRoot = '/tmp/runas-android-review', pass = 'retrato', axePath = '-', ...flags] = process.argv.slice(2)
const output = join(outputRoot, pass)
await mkdir(join(output, 'capturas'), { recursive: true })
const shots = flags.includes('capturas'), android = flags.includes('android')
const theme = flags.find(flag => flag.startsWith('tema='))?.slice(5)
const axe = axePath === '-' ? null : await readFile(axePath, 'utf8')
const adb = (...args) => execFileSync('adb', args, { timeout: 60000 }).toString()
const { run, send, errors, close } = await connectDevtools(endpoint, t => /^https?:\/\/localhost/.test(t.url ?? ''))
const go = async (route, wait = 1300) => { await run(`location.hash = ${JSON.stringify('#' + route)}; true`); await sleep(wait) }

// O tema troca pelo botão do topo, sem recarregar (recarregar perderia o cofre aberto pela intent do teste).
if (theme) {
  await go('/')
  const want = theme === 'claro' ? 'light' : 'dark'
  if (await run(`document.documentElement.dataset.theme`) !== want) await run(`document.querySelector('[aria-label="Usar o tema ${theme === 'claro' ? 'claro' : 'escuro'}"]')?.click(); true`)
  await sleep(800)
  console.log('tema:', await run(`document.documentElement.dataset.theme`))
}
const page = { run, send, errors }

// Rotas: as dos espaços e as que os links das telas principais mostram (como na revisão do desktop).
const routes = new Set(['/', '/notas', '/notas/grafico', '/agenda', '/wiki', '/campanhas', '/livros', '/vtt', '/transferir', '/config'])
const harvest = async (from, prefix, max) => {
  await page.run(`location.hash = ${JSON.stringify('#' + from)}; true`); await sleep(1500)
  const hrefs = await page.run(`[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))`)
  let added = 0
  for (const href of hrefs ?? []) {
    const route = (href ?? '').replace(/^#/, '')
    if (route.startsWith(prefix) && !routes.has(route) && added < max) { routes.add(route); added++ }
  }
}
await harvest('/wiki', '/wiki/', 12); await harvest('/campanhas', '/campanhas/', 3)
const campaign = [...routes].find(r => /^\/campanhas\/[^/]+$/.test(r)); if (campaign) await harvest(campaign, campaign + '/', 8)
await harvest('/livros', '/livros/', 3); await harvest('/config', '/config/', 14); await harvest('/notas', '/notas/', 3)
await harvest('/vtt', '/vtt/', 3); await harvest('/agenda', '/agenda/', 3)
const book = [...routes].find(r => /^\/livros\/[^/]+$/.test(r)); if (book) await harvest(book, book + '/', 5)

const measure = `(() => {
  const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth
  const over = []
  if (sw > cw + 1) for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > cw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') { over.push(String(el.className || el.tagName).slice(0, 60)); if (over.length > 4) break } }
  const small = []
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=button], summary')) {
    const r = el.getBoundingClientRect(), st = getComputedStyle(el)
    if (r.width && r.height && st.visibility !== 'hidden' && r.height < 44 && r.width < 44) small.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ':' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
  }
  return { title: document.title, h1: document.querySelectorAll('h1').length, current: document.querySelectorAll('[aria-current]').length, width: innerWidth, sw, cw, over, small: small.slice(0, 10), smallCount: small.length }
})()`
const results = []
let index = 0
console.log(`${routes.size} telas`)
for (const route of routes) {
  const before = page.errors.length, began = Date.now()
  try {
  await go(route)
  const info = await page.run(measure)
  let violations = []
  if (axe) {
    // Pelo DevTools, sem eval na página (a CSP do app não permite).
    if (!await page.run(`Boolean(window.axe)`)) await page.send('Runtime.evaluate', { expression: axe })
    violations = await page.run(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }).then(r => r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 2).map(n => n.target.join(' ') + ' — ' + (n.failureSummary || '').split('\\n').slice(1, 2).join('')) })))`)
  }
  if (shots) {
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(output, 'capturas', `${String(++index).padStart(2, '0')}-${route.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.png`), Buffer.from(data, 'base64'))
  }
  results.push({ route, ...info, axe: violations, errors: page.errors.slice(before) })
  } catch (error) {
    // Uma tela que falha não derruba a passada: fica registrada como erro.
    results.push({ route, title: '', h1: -1, current: 0, width: 0, sw: 0, cw: 0, over: [], small: [], smallCount: 0, axe: [], errors: ['falha da revisão: ' + (error instanceof Error ? error.message : String(error))] })
  }
  console.log(`  ${route} (${Date.now() - began} ms)`)
}

// Android: o botão voltar do sistema volta uma tela; o teclado aparece sobre o editor sem cobrir a linha do cursor.
const checks = {}
if (android) try {
  await go('/notas')
  const note = await page.run(`document.querySelector('[data-vault-tree] [data-note-path]')?.getAttribute('data-note-path') ?? null`)
  if (note) {
    await go('/notas/' + encodeURIComponent(note), 2000)
    const historyBefore = await page.run(`history.length`)
    adb('logcat', '-c')
    adb('shell', 'input', 'keyevent', '4'); await sleep(1500)
    // Com prazo curto: se o app saiu da frente, o WebView para de responder.
    const hash = await Promise.race([page.run(`location.hash`), sleep(5000).then(() => null)]).catch(() => null)
    checks.voltar = { esperado: '#/notas', obtido: hash, historico: historyBefore }
    checks.voltar.ok = hash === '#/notas'
    if (!checks.voltar.ok) {
      const resumed = (adb('shell', 'dumpsys', 'activity', 'activities').match(/(top)?ResumedActivity[^\n]*/g) ?? []).slice(0, 2)
      const log = adb('logcat', '-d').split('\n').filter(l => /runas|chromium|AndroidRuntime|FATAL|OnBack|BackInvoked|ActivityTaskManager|Capacitor/i.test(l)).slice(-30)
      Object.assign(checks.voltar, { resumed, log })
      adb('shell', 'am', 'start', '-n', 'dev.runas.codex/.MainActivity'); await sleep(3000)
    }
    await go('/notas/' + encodeURIComponent(note), 2500)
    // Um toque de verdade no texto, para o Android abrir o teclado (foco por script não abre).
    const box = await page.run(`(()=>{const el=document.querySelector('.cm-content')||document.querySelector('.editor-body');if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.left+20),y:Math.round(r.top+20)}})()`)
    if (box) {
      await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [box] })
      await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await sleep(2500)
      const ime = adb('shell', 'dumpsys', 'input_method')
      const view = await page.run(`(()=>{const sel=getSelection();const r=sel&&sel.rangeCount?sel.getRangeAt(0).getBoundingClientRect():null;return {viewport:Math.round(visualViewport?.height??innerHeight),inner:innerHeight,caret:r?Math.round(r.bottom):null,focus:document.activeElement?.className?.toString().slice(0,40)}})()`)
      checks.teclado = { aberto: /mInputShown=true/.test(ime), ...view }
      checks.teclado.ok = checks.teclado.aberto && (checks.teclado.caret === null || checks.teclado.caret <= checks.teclado.viewport)
      const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(output, 'capturas', 'teclado.png'), Buffer.from(data, 'base64'))
      adb('shell', 'input', 'keyevent', '111')
    } else checks.teclado = { ok: false, detalhe: 'editor não encontrado' }
  } else checks.voltar = { ok: false, detalhe: 'nenhuma nota na lista' }
} catch (error) {
  checks.erro = error instanceof Error ? error.message : String(error)
}

close()
await writeFile(join(output, 'resultado.json'), JSON.stringify({ pass, routes: results.length, checks, results }, null, 1))

// Resumo no log do CI (o artefato tem o JSON e as capturas).
const list = (label, items) => console.log(`${label}: ${items.length ? '\n  ' + items.join('\n  ') : 'nenhum'}`)
console.log(`\n== Revisão no Android — ${pass} (${results.length} telas, largura ${results[0]?.width} px)`)
list('Rolagem para os lados', results.filter(r => r.sw > r.cw + 1).map(r => `${r.route} → ${r.over.join(', ')}`))
list('Telas sem um h1', results.filter(r => r.h1 !== 1).map(r => `${r.route} (${r.h1})`))
list('Sem aria-current', results.filter(r => !r.current).map(r => r.route))
list('Títulos repetidos', [...new Set(results.map(r => r.title).filter((t, i, all) => all.indexOf(t) !== i))])
list('Erros de JavaScript', results.filter(r => r.errors.length).map(r => `${r.route}: ${r.errors[0]}`))
const small = new Map()
for (const r of results) for (const s of r.small) { const key = s.replace(/ \d+x\d+$/, ''); if (!small.has(key)) small.set(key, `${s} (${r.route})`) }
list('Alvos de toque < 44 px', [...small.values()].slice(0, 40))
const axeAll = new Map()
for (const r of results) for (const v of r.axe) { const k = v.id; const e = axeAll.get(k) ?? { impact: v.impact, pages: 0, ex: [] }; e.pages++; if (e.ex.length < 3) e.ex.push(`${r.route}: ${v.ex[0]}`); axeAll.set(k, e) }
list('axe', [...axeAll].map(([id, e]) => `${id} (${e.impact}, ${e.pages} telas) — ${e.ex.join(' | ')}`))
if (android) console.log('Android:', JSON.stringify(checks, null, 1))
