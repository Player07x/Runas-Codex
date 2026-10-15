// Verificação do APK em um WebView depurável. Usa só APIs nativas do Node e o protocolo do Chromium.
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
const endpoint = process.argv[2] ?? 'http://127.0.0.1:9223'
const output = process.argv[3] ?? '/tmp/runas-touch-webview'
await mkdir(output, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let page
for (let n = 0; n < 100 && !page; n++) {
  try { page = (await fetch(endpoint + '/json').then(r => r.json())).find(t => t.type === 'page' && t.webSocketDebuggerUrl) } catch { /* o WebView ainda está iniciando */ }
  if (!page) await sleep(300)
}
if (!page) throw new Error('O WebView depurável não abriu.')
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let sequence = 0
const pending = new Map()
const browserErrors = []
socket.onmessage = event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown' || message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') browserErrors.push(message.params)
  if (!message.id) return
  const action = pending.get(message.id)
  pending.delete(message.id)
  if (action) clearTimeout(action.timer)
  if (message.error) action?.reject(new Error(message.error.message))
  else action?.resolve(message.result)
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  const timer = setTimeout(() => { pending.delete(id); reject(new Error('Tempo excedido: ' + method)) }, 20000)
  pending.set(id, { resolve, reject, timer })
  socket.send(JSON.stringify({ id, method, params }))
})
const run = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result?.value
}
const until = async expression => {
  for (let n = 0; n < 200; n++) { const result = await run(`(()=>{const value=(${expression});return value instanceof Node?true:value})()`); if (result) return result; await sleep(100) }
  throw new Error('Não apareceu: ' + expression)
}
const touch = (type, points) => send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, index) => ({ id: index + 1, radiusX: 5, radiusY: 5, force: 1, ...point })) })
const tapPoint = async point => { await touch('touchStart', [point]); await sleep(100); await touch('touchEnd', []); await sleep(350) }
// A preparação aciona os controles da interface; no canvas os gestos são ponteiros nativos do WebView.
const tap = async expression => {
  await until(`!!(${expression})`)
  await run(`(${expression}).click()`)
  await sleep(150)
}
const label = text => tap(`Array.from(document.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(text)}&&e.getClientRects().length)`)
const button = text => tap(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(text)}&&e.getClientRects().length)`)
const tool = async text => {
  if (!await run(`Array.from(document.querySelectorAll('.scene-tools button')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(text)})?.getClientRects().length`)) await label('Mostrar ferramentas')
  await label(text)
}
const input = async (name, value) => { await run(`(()=>{const e=Array.from(document.querySelectorAll('label.field')).find(e=>e.querySelector('span')?.textContent===${JSON.stringify(name)})?.querySelector('input,select');if(!e)throw new Error('Campo: '+${JSON.stringify(name)});const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`);await sleep(100);await run(`(()=>{const e=Array.from(document.querySelectorAll('label.field')).find(e=>e.querySelector('span')?.textContent===${JSON.stringify(name)})?.querySelector('input,select');e?.dispatchEvent(new FocusEvent('focusout',{bubbles:true}))})()`) }
const field = name => run(`Array.from(document.querySelectorAll('.properties label.field')).find(e=>e.querySelector('span')?.textContent===${JSON.stringify(name)})?.querySelector('input')?.value`)
const shot = async name => {
  // captureScreenshot do DevTools pode alterar a viewport do WebView antigo. No Android, captura a tela nativa.
  if (await run(`navigator.userAgent.includes('Android')`)) await writeFile(output + '/' + name + '.png', execFileSync('adb', ['exec-out', 'screencap', '-p'], { timeout: 15000, maxBuffer: 16 * 1024 * 1024 }))
  else { const image = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(output + '/' + name + '.png', Buffer.from(image.data, 'base64')) }
}
const at = (x, y, size = 3000, height = 2000) => run(`(()=>{const r=document.querySelector('.scene-host canvas').getBoundingClientRect(),z=Math.min(r.width/${size},r.height/${height})*.92;return{x:r.x+(r.width-${size}*z)/2+${x}*z,y:r.y+(r.height-${height}*z)/2+${y}*z}})()`)
const benchmark = () => run(`new Promise(resolve=>{const canvas=document.querySelector('.scene-host canvas'),r=canvas.getBoundingClientRect();const start=performance.now(),times=[];let previous=start;const emit=(type,id,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,button:0,buttons:type==='pointerup'?0:1,clientX:r.x+x,clientY:r.y+y}));emit('pointerdown',101,r.width*.35,r.height*.45);emit('pointerdown',102,r.width*.65,r.height*.45);function frame(now){times.push(now-previous);previous=now;const shift=Math.sin((now-start)/500)*20;emit('pointermove',101,r.width*.35+shift,r.height*.45);emit('pointermove',102,r.width*.65+shift,r.height*.45);if(now-start<5000){requestAnimationFrame(frame);return}emit('pointerup',101,r.width*.35,r.height*.45);emit('pointerup',102,r.width*.65,r.height*.45);times.sort((a,b)=>a-b);resolve({fps:Math.round(times.length*10000/(now-start))/10,p95ms:Math.round(times[Math.floor(times.length*.95)]*10)/10,resolution:canvas.dataset.renderResolution,zoom:canvas.dataset.viewZoom,cameraX:canvas.dataset.viewX,cameraY:canvas.dataset.viewY,physicalWidth:canvas.width,physicalHeight:canvas.height,frames:times.length})}requestAnimationFrame(frame)})`)
const results = {}
try {
  await send('Runtime.enable'); await send('Log.enable')
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  if (process.argv.includes('--mobile')) await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2.75, mobile: true })
  await run(`location.hash='/vtt/criar'`)
  await tap(`document.querySelector('.empty .btn.primary,.mesa-card.new')`)
  await until(`document.querySelector('input[aria-label="Nome da mesa"]')`)
  await run(`(()=>{const e=document.querySelector('input[aria-label="Nome da mesa"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Toque no Android');e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await label('Confirmar criar mesa')
  await until(`document.querySelector('.vtt-root .side-tabs')`)
  await label('Cenas'); await button('Nova cena')
  await until(`document.querySelector('.scene-host canvas')`); await sleep(700)
  console.log('Mesa criada; movendo token por toque nativo.')
  if (process.argv.includes('--slow')) await run(`new Promise(resolve=>{const interval=setInterval(()=>{const end=performance.now()+90;while(performance.now()<end){}},120);setTimeout(()=>{clearInterval(interval);resolve(true)},4000)})`)
  await label('Enquadrar cena')
  await tool('Novo token'); await tapPoint(await at(1250, 950))
  await until(`document.querySelector('.properties')`)
  results.initialToken = { x: Number(await field('Posição X')), y: Number(await field('Posição Y')) }
  if (results.initialToken.x !== 1250 || results.initialToken.y !== 950) throw new Error('O enquadramento não corresponde ao tamanho CSS do canvas: '+JSON.stringify(results.initialToken))
  await input('Disposição', 'friendly')
  await sleep(150)
  await label('Fechar propriedades'); await tool('Selecionar e mover')
  const from = await at(1250, 950), to = await at(1450, 1050)
  // Enfileira o gesto inteiro: aguardar cada ACK de um emulador lento pode virar um toque longo.
  await Promise.all([touch('touchStart', [from]), touch('touchMove', [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }]), touch('touchMove', [to]), touch('touchEnd', [])])
  await until(`document.querySelector('.properties')`)
  await until(`Array.from(document.querySelectorAll('.properties label.field')).find(e=>e.querySelector('span')?.textContent==='Posição X')?.querySelector('input')?.value==='1450'`)
  results.token = { x: Number(await field('Posição X')), y: Number(await field('Posição Y')) }
  if (results.token.x !== 1450 || results.token.y !== 1050) throw new Error('O token não acompanhou o toque: ' + JSON.stringify(results.token))
  await shot('android-propriedades')
  await label('Fechar propriedades'); await tool('Desenhar'); await label('Mão livre')
  const a = await at(700, 1300), b = await at(1700, 1450)
  const trace = [touch('touchStart', [a])]
  for (let n = 1; n <= 6; n++) trace.push(touch('touchMove', [{ x: a.x + (b.x - a.x) * n / 6, y: a.y + (b.y - a.y) * n / 6 }]))
  trace.push(touch('touchEnd', [])); await Promise.all(trace)
  await until(`document.querySelector('[aria-label="Propriedades: Desenho"]')`)
  results.undoEnabled = await run(`!document.querySelector('[aria-label="Desfazer"]').disabled`)
  await label('Desfazer'); await until(`!document.querySelector('[aria-label="Refazer"]').disabled`)
  results.redoEnabled = await run(`!document.querySelector('[aria-label="Refazer"]').disabled`)
  await label('Refazer'); await tool('Selecionar e mover')
  const held = await at(1450, 1050)
  await touch('touchStart', [held]); await sleep(700)
  results.menu = await run(`!!document.querySelector('[role="menu"][aria-label="Ações do objeto"]')`)
  await touch('touchEnd', []); await button('Fechar menu')
  await label('Soltar seleção'); await label('Enquadrar cena'); await sleep(3000)
  console.log("Gestos concluídos; medindo a cena de exemplo.")
  results.example = await benchmark()
  await label('Cenas')
  // Imagem sintética local: textura real de 4096 x 4096, sem rede nem material do cofre do dono.
  await run(`new Promise(resolve=>{const c=document.createElement('canvas');c.width=c.height=4096;const g=c.getContext('2d');g.fillStyle='#383b43';g.fillRect(0,0,4096,4096);g.strokeStyle='#999079';g.lineWidth=8;for(let x=0;x<4096;x+=256){g.strokeRect(x,128,220,1800);g.strokeRect(128,x,1800,220)}c.toBlob(blob=>{const data=new DataTransfer();data.items.add(new File([blob],'Mapa 4096.png',{type:'image/png'}));const e=document.querySelector('.scene-config .background-picker input[type=file]');e.files=data.files;e.dispatchEvent(new Event('change',{bubbles:true}));resolve()},'image/png')})`)
  await until(`document.querySelector('.background-picker img')?.complete && document.querySelector('.background-picker img')?.naturalWidth === 4096`)
  await tap(`Array.from(document.querySelectorAll('.scene-config label.check')).find(e=>e.textContent.includes('Névoa de guerra'))`)
  await tap(`Array.from(document.querySelectorAll('.scene-config label.check')).find(e=>e.textContent.includes('Luz do dia'))`)
  results.vision = await run(`(()=>{const fields=Array.from(document.querySelectorAll('.scene-config label.check'));return {fog:fields.find(e=>e.textContent.includes('Névoa de guerra'))?.querySelector('input').checked,daylight:fields.find(e=>e.textContent.includes('Luz do dia'))?.querySelector('input').checked}})()`)
  if (!results.vision.fog || results.vision.daylight) throw new Error('A cena grande precisa de névoa e luz do dia desligada.')
  await label('Cenas'); await label('Enquadrar cena'); await tool('Luzes')
  await tapPoint(await at(1200, 1200, 4096, 4096)); await label('Fechar propriedades')
  await tapPoint(await at(2000, 1700, 4096, 4096)); await label('Fechar propriedades')
  await tool('Selecionar e mover'); if (await run(`!!document.querySelector('[aria-label="Soltar seleção"]')`)) await label('Soltar seleção'); await label('Enquadrar cena'); await sleep(3000)
  console.log("Medindo o mapa de 4096 px com névoa e duas luzes.")
  await tool('Ver como os jogadores'); if (await run(`document.querySelector('[aria-label="Mostrar ferramentas"]')?.getAttribute('aria-expanded')==='true'`)) await label('Mostrar ferramentas'); await sleep(1000)
  results.largeMap = await benchmark()
  await shot('android-mapa-4096')
  results.device = await run(`({userAgent:navigator.userAgent,dpr:devicePixelRatio,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth})`)
  await writeFile(output + '/metrics.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  if (!results.undoEnabled || !results.redoEnabled || !results.menu || results.device.scrollWidth > results.device.width) throw new Error('A verificação do toque falhou.')
} catch (error) {
  await shot('erro').catch(() => {})
  await writeFile(output + '/error.txt', String(error))
  throw error
} finally { await writeFile(output + '/browser-errors.json', JSON.stringify(browserErrors, null, 2)); socket.close() }
