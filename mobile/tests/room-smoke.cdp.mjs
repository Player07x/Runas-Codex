// X7: servidor no Android, jogador no Chromium do job, rede local e Activity em segundo plano.
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {connectDevtools,sleep} from './devtools-client.mjs'
import {checkRemoteMaster} from './room-master.cdp.mjs'
const output=process.argv[2] ?? '/tmp/runas-android-room'
const endpoint=process.argv[3] ?? 'http://127.0.0.1:9224'
const chromeEndpoint=process.argv[4] ?? 'http://127.0.0.1:9225'
const fixture=JSON.parse(await readFile(output+'/fixture.json','utf8'))
const adb=(...args)=>execFileSync('adb',args,{timeout:30000,maxBuffer:16*1024*1024}).toString()
const result={checks:[],errors:[]},check=(label,condition)=>{if(!condition)throw new Error(label);result.checks.push(label);console.log("OK:",label)}
const app=await connectDevtools(endpoint,t=>t.url.startsWith('https://localhost'))
let browser,guest,androidPlayer,master
async function screenshot(client,name){const shot=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`${output}/${name}.png`,Buffer.from(shot.data,'base64'))}
async function click(client,selector){await client.until(`document.querySelector(${JSON.stringify(selector)})`);await client.run(`document.querySelector(${JSON.stringify(selector)}).click();true`)}
async function appButton(text){await app.until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)})`);await app.run(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click();true`)}
async function waitFrames(client,predicate){for(let n=0;n<100;n++){const message=client.frames.find(predicate);if(message)return message;await sleep(150)}throw new Error('Resposta não chegou pelo WebSocket do navegador')}
async function waitMessage(socket,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.removeEventListener('message',on);reject(new Error('Mensagem não chegou'))},12000);function on(event){const value=JSON.parse(event.data);if(predicate(value)){clearTimeout(timer);socket.removeEventListener('message',on);resolve(value)}}socket.addEventListener('message',on)})}
try {
  await app.until('window.Capacitor?.Plugins?.RunasVault')
  // A própria ponte cria a área oculta: o shell do emulador não tem as permissões do aplicativo.
  const seed=async(folder,prefix='')=>{
    for(const entry of await readdir(folder,{withFileTypes:true})) {
      const relative=prefix+entry.name,full=folder+'/'+entry.name
      if(entry.isDirectory())await seed(full,relative+'/')
      else if(relative.startsWith('.runas/mesas/')) {
        const base64=(await readFile(full)).toString('base64')
        await app.run(`window.Capacitor.Plugins.RunasVault.writeManagedTransfer(${JSON.stringify({path:relative,base64,expected:null})})`)
      }
    }
  }
  await seed(output+'/fixture')
  await app.run(`location.hash='#/vtt/mesa/x7-ci';true`)
  await app.until(`document.querySelector('.table-title')?.textContent.includes('Sala Android X7')`)
  await click(app,'[title="Sala dos jogadores"]')
  await appButton('Ligar transmissão')
  await app.until(`document.querySelector('[aria-label="Link da sala"]')?.value`)
  const link=await app.run(`document.querySelector('[aria-label="Link da sala"]').value`),key=new URL(link).searchParams.get('k')
  const code=await app.run(`document.querySelector('.player-seats code').textContent`)
  check('sala usa endereço da rede local',/^http:\/\/(10\.|192\.168\.|172\.)/.test(link))
  check('código individual disponível ao mestre',/^[A-Z0-9]{8}$/.test(code))
  // R4: o link público também existe no Android (o teste de ponta a ponta fica no job android-revisao).
  check('controle de túnel público no Android',await app.run(`document.body.innerText.includes('Gerar link público')`))
  await screenshot(app,'android-sala')
  const base='http://127.0.0.1:30000',playerUrl=`${base}/?k=${key}`
  check('página exige chave',(await fetch(base)).status===404)
  check('cofre não é servido',(await fetch(base+'/mesa.json?k='+key)).status===404)
  check('asset oculto não é servido',(await fetch(`${base}/assets/${fixture.secret}?k=${key}`)).status===404)
  const range=await fetch(`${base}/assets/${fixture.map}?k=${key}`,{headers:{Range:'bytes=2-5'}})
  check('Range retorna somente o trecho',range.status===206 && (await range.arrayBuffer()).byteLength===4 && range.headers.get('content-range')===`bytes 2-5/${fixture.imageBytes}`)
  check('origem externa é recusada',(await fetch(`${base}/seat/join?k=${key}`,{method:'POST',headers:{Origin:'https://externo.invalid','Content-Type':'application/json'},body:JSON.stringify({code})})).status===403)
  browser=await connectDevtools(chromeEndpoint)
  await browser.send('Page.navigate',{url:playerUrl})
  await browser.until(`document.querySelector('.player-lobby input')`)
  await browser.run(`(()=>{const input=document.querySelector('.player-lobby input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(code)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`)
  await click(browser,'.player-lobby button[type="submit"]')
  await browser.until(`document.querySelector('.player-seat-badge')?.textContent.includes('Jogador 1')`)
  await browser.run(`window.__testWire=new WebSocket('ws://127.0.0.1:30000/socket?k=${key}');true`)
  await browser.until(`window.__testWire?.readyState===WebSocket.OPEN`)
  await browser.until(`document.querySelector('canvas')`)
  check('jogador do navegador autenticado',true)
  master=await checkRemoteMaster({app,browser,base,playerKey:key,fixture,output,chromeEndpoint,check,adb})
  check('projeção não revela token nem parede privados',!JSON.stringify(browser.frames).includes('SEGREDO-X7') && !JSON.stringify(browser.frames).includes('"wall"'))
  browser.frames.length=0
  await browser.run(`window.__testWire.send(JSON.stringify({type:'move',tokenId:'hero',x:250,y:250}));true`)
  await waitFrames(browser,m=>m.type==='move-result' && m.ok)
  check('movimento autorizado confirmado',true)
  await browser.run(`window.__testWire.send(JSON.stringify({type:'move',tokenId:'hero',x:750,y:250}));true`)
  await waitFrames(browser,m=>m.type==='move-result' && !m.ok && /parede/.test(m.reason))
  check('parede bloqueia movimento',true)
  await screenshot(browser,'jogador-no-navegador')
  guest=new WebSocket(`ws://127.0.0.1:30000/socket?k=${key}`)
  const first=waitMessage(guest,m=>m.type==='snapshot');await first
  const rejected=waitMessage(guest,m=>m.type==='move-result');guest.send(JSON.stringify({type:'move',tokenId:'hero',x:350,y:350}));check('espectador não controla token',!(await rejected).ok)
  // A autoridade continua respondendo sem a Activity visível e com a tela apagada.
  adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');await sleep(3000)
  const pong=waitMessage(guest,m=>m.type==='pong');guest.send('{"type":"ping"}');await pong
  browser.frames.length=0
  await browser.run(`window.__testWire.send(JSON.stringify({type:'move',tokenId:'hero',x:350,y:350}));true`)
  await waitFrames(browser,m=>m.type==='move-result' && m.ok)
  check('autoridade ativa em segundo plano e com tela apagada',true)
  await master.background()
  const services=adb('shell','dumpsys','activity','services','dev.runas.codex')
  check('serviço em primeiro plano ativo',services.includes('RoomService') && /isForeground=true/.test(services))
  await writeFile(output+'/service.txt',services)
  // A nota do cofre é preservada; só a partição da cena mudou.
  check('movimento persistido no cofre',JSON.parse(adb('exec-out','cat','/sdcard/Documents/cofre-room/.runas/mesas/ci-x7/cenas/scene.json')).find(d=>d.id==='hero').data.x===350)
  check('nota preservada',adb('exec-out','cat','/sdcard/Documents/cofre-room/Notas/Intacta.md')==='# Nota intacta\n')
  adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');adb('shell','am','start','-n','dev.runas.codex/.MainActivity')
  await app.until('document.hasFocus()')
  await master.afterWake()
  await app.run(`[...document.querySelectorAll('.player-seats button')].find(b=>b.textContent.includes('Regenerar')).click();true`)
  await browser.until(`window.__testWire.readyState===WebSocket.CLOSED`)
  check('regenerar revoga conexão anterior',true)
  guest.close();guest=null
  // Entrar Sala abre o jogador no navegador do próprio aparelho, com a autoridade em segundo plano.
  const rotatedCode=await app.run(`document.querySelector('.player-seats code').textContent`)
  await app.run(`window.Capacitor.Plugins.RunasRoom.openUrl({url:${JSON.stringify(link)}});true`)
  androidPlayer=await connectDevtools('http://127.0.0.1:9226',target=>target.url.startsWith(link))
  await androidPlayer.until(`document.querySelector('.player-lobby input')`)
  await androidPlayer.run(`(()=>{const input=document.querySelector('.player-lobby input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(rotatedCode)});input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)
  await click(androidPlayer,'.player-lobby button[type="submit"]')
  await androidPlayer.until(`document.querySelector('.player-seat-badge')?.textContent.includes('Jogador 1')`,400)
  await androidPlayer.until(`document.querySelector('.player-host canvas') && document.querySelector('.player-tools')`,400)
  check('Android entra como jogador da sala hospedada no próprio aparelho',true)
  await writeFile(output+'/android-jogador.png',execFileSync('adb',['exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024}))
  adb('shell','am','start','-n','dev.runas.codex/.MainActivity');await app.until('document.hasFocus()')
  await appButton('Desligar')
  const closed=async()=>{for(let i=0;i<30;i++){try{const response=await fetch(base+'/healthz',{cache:'no-store',signal:AbortSignal.timeout(3000)});if(!response.ok)return true}catch{return true}await sleep(250)}return false}
  let closedRoom=await closed()
  if(!closedRoom){await app.run(`window.Capacitor.Plugins.RunasRoom.stop();true`);closedRoom=await closed()}
  check('encerrar fecha porta',closedRoom)
  check('sem exceções na interface',app.errors.length===0 && browser.errors.length===0 && androidPlayer.errors.length===0)
} catch(error) {
  result.errors.push(error.stack ?? String(error))
  if(browser)try{
    result.browser=await browser.run(`({url:location.href,ready:document.readyState,body:document.body?.innerText,socket:window.__testWire?.readyState})`)
    result.browserErrors=browser.errors;result.network=browser.network;result.frames=browser.frames
    result.cookies=(await browser.send('Network.getCookies')).cookies.map(({name,domain,path,sameSite,secure})=>({name,domain,path,sameSite,secure}))
    await screenshot(browser,'falha-jogador')
  }catch{}
  if(androidPlayer)try{
    result.androidPlayer=await androidPlayer.run(`({url:location.href,ready:document.readyState,body:document.body?.innerText})`)
    result.androidPlayerErrors=androidPlayer.errors;result.androidPlayerNetwork=androidPlayer.network;result.androidPlayerFrames=androidPlayer.frames
    await screenshot(androidPlayer,'falha-android-jogador')
  }catch{}
  try{await screenshot(app,'falha-android')}catch{}
  throw error
}
finally {
  master?.close();guest?.close();browser?.close();androidPlayer?.close();app.close();await mkdir(output,{recursive:true});await writeFile(output+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
  // Um socket preso no adb forward (DevTools ou a sala) segura o processo e o job espera até o limite de 30 min.
  setTimeout(()=>process.exit(),3000).unref()
}
