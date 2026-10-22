// Servidor de releases fictícias, apenas para o APK separado do CI. Instala a versão nova pelo instalador real.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
const [endpoint, output, candidatePath, wrongSignerPath, otherPackagePath] = process.argv.slice(2)
await mkdir(output,{recursive:true})
const apk = await readFile(candidatePath), wrongSigner = await readFile(wrongSignerPath), otherPackage = await readFile(otherPackagePath)
const adb = (...args) => execFileSync('adb',args,{timeout:30000,maxBuffer:4*1024*1024}).toString()
const sleep = ms => new Promise(r=>setTimeout(r,ms))
const result={checks:{},errors:[]}, check=(name,ok,detail)=>{result.checks[name]=Boolean(ok);if(!ok)throw Error(name+': '+JSON.stringify(detail))}
let mode='ok', origin, socket, sequence=0, pending=new Map()
const filename='Runas-Codex-0.1.0-beta.14-android.apk'
const payload=()=>mode==='invalid'?Buffer.from('isto não é um APK'):mode==='signer'?wrongSigner:mode==='package'?otherPackage:apk
const server=createServer((req,res)=>{
  if(req.url==='/releases') {
    res.setHeader('Content-Type','application/json')
    res.end(JSON.stringify([{tag_name:'v0.1.0-beta.14',prerelease:true,body:'Atualização de teste',assets:[{name:filename,size:payload().length+(mode==='incomplete'?1:0),browser_download_url:origin+'/apk'},{name:'SHA256SUMS.txt',size:100,browser_download_url:origin+'/sums'}]}]))
  } else if(req.url==='/apk') { res.setHeader('Content-Length',payload().length);res.end(payload()) }
  else if(req.url==='/sums')res.end((mode==='hash'?'0'.repeat(64):createHash('sha256').update(payload()).digest('hex'))+'  '+filename+'\n')
  else { res.statusCode=404;res.end() }
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const port=server.address().port; origin='http://127.0.0.1:'+port
adb('reverse','tcp:'+port,'tcp:'+port)
async function connect() {
  // A instalação de APK pode reiniciar o WebView depois que o processo já
  // voltou ao foreground. Dê tempo suficiente para o socket de depuração
  // reaparecer em emuladores mais lentos.
  for(let i=0;i<300;i++) {
    try {
      const target=(await fetch(endpoint+'/json').then(r=>r.json())).find(t=>t.type==='page'&&t.webSocketDebuggerUrl)
      if(target) {
        socket=new WebSocket(target.webSocketDebuggerUrl)
        await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j})
        socket.onmessage=event=>{
          const msg=JSON.parse(event.data),call=pending.get(msg.id);if(!call)return
          pending.delete(msg.id);clearTimeout(call.timer)
          if(msg.error||msg.result?.exceptionDetails)call.reject(Error(JSON.stringify(msg.error??msg.result.exceptionDetails)))
          else call.resolve(msg.result?.result?.value)
        }
        return
      }
    }catch{}
    await sleep(200)
  }
  throw Error('O WebView não reabriu.')
}
const run=expression=>new Promise((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('WebView: '+expression.slice(0,120)))},45000)
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}))
})
async function until(expression) {for(let i=0;i<250;i++){if(await run(`Boolean(${expression})`))return;await sleep(100)}throw Error('Não aconteceu: '+expression)}
async function nativeSource() { await run(`window.Capacitor.Plugins.RunasUpdates.testSource({port:${port}})`)}
async function checkNative() { await run('window.Capacitor.Plugins.RunasUpdates.check()') }
async function startInstall() { await run(`window.__updateResult=null;window.Capacitor.Plugins.RunasUpdates.install({tag:'v0.1.0-beta.14'}).then(value=>window.__updateResult={value},error=>window.__updateResult={error:String(error.message)});true`) }
async function waitResult() {await until('window.__updateResult!==null');return run('window.__updateResult')}
async function foreground(pattern) {for(let i=0;i<60;i++){if(pattern.test(adb('shell','dumpsys','activity','activities').split('\n').filter(l=>/mResumedActivity|topResumedActivity/.test(l)).join('\n')))return true;await sleep(150)}return false}
try {
  await connect();await until('window.Capacitor?.Plugins?.RunasUpdates')
  const before=await run('window.Capacitor.Plugins.RunasVault.current()')
  await run("location.hash='/config';true")
  await until('document.querySelector("[data-updates]")')
  check('Android não mostra a configuração de atalhos',await run('!document.querySelector("[aria-label^=\\"Atalho:\\"]") && !document.querySelector(".topbar kbd")'))
  await run('document.querySelector("[aria-label=\\"Buscar notas e comandos\\"]").click();true')
  await until('document.querySelector(".palette-list")')
  check('paleta Android não mostra combinações de teclado',await run('![...document.querySelectorAll(".palette-item small")].some(el=>/Mod\\+|Ctrl|Alt/.test(el.textContent)) && !document.querySelector(".palette-foot")'))
  await run('document.querySelector(".palette-backdrop")?.click();true')
  // Fecha pelo Escape, caso o backdrop seja tratado apenas no alvo externo.
  await run('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));true')
  await nativeSource()
  for(const scenario of ['hash','incomplete','invalid','signer','package']) {
    mode=scenario;await checkNative();await startInstall();const response=await waitResult()
    check('recusa APK: '+scenario,Boolean(response.error),response)
    check('não abre instalador após recusa: '+scenario,!/packageinstaller/.test(adb('shell','dumpsys','activity','activities').split('\n').filter(l=>/mResumedActivity|topResumedActivity/.test(l)).join('\n')))
  }
  mode='ok';await checkNative()
  adb('shell','appops','set','dev.runas.codex','REQUEST_INSTALL_PACKAGES','deny')
  await startInstall();check('pede autorização do Android',await foreground(/settings/i))
  adb('shell','uiautomator','dump','/sdcard/runas-update-permission.xml')
  adb('shell','input','keyevent','KEYCODE_BACK')
  const denied=await waitResult();check('recusa de autorização mantém o app aberto',denied.error?.includes('não autorizada'),denied)
  adb('shell','appops','set','dev.runas.codex','REQUEST_INSTALL_PACKAGES','allow')
  // Agora percorre os botões da interface de produção, usando o mesmo transporte nativo.
  await run("location.hash='/config';true")
  await until('document.querySelector("[data-updates]")')
  await run('[...document.querySelectorAll("[data-updates] button")].find(b=>b.textContent.trim()==="Verificar").click();true')
  await until('document.querySelector("[data-updates]").textContent.includes("0.1.0-beta.14 disponível")')
  await run('[...document.querySelectorAll("[data-updates] button")].find(b=>b.textContent.includes("Baixar e instalar")).click();true')
  check('abre o instalador sem navegador',await foreground(/packageinstaller/i))
  adb('shell','uiautomator','dump','/sdcard/runas-update-cancel.xml')
  adb('shell','input','keyevent','KEYCODE_BACK')
  check('cancelar devolve o app ao primeiro plano',await foreground(/dev.runas.codex/))
  check('cancelar mantém a versão anterior',adb('shell','dumpsys','package','dev.runas.codex').includes('versionName=0.1.0-beta.13'))
  const afterCancel=await run('window.Capacitor.Plugins.RunasVault.current()')
  check('cancelar mantém a árvore SAF e o modo de gravação',afterCancel.vault?.path===before.vault?.path && afterCancel.vault?.readOnly===before.vault?.readOnly)
  await startInstall();await waitResult();check('pode tentar de novo',await foreground(/packageinstaller/i))
  adb('shell','uiautomator','dump','/sdcard/runas-update.xml')
  const xml=adb('shell','cat','/sdcard/runas-update.xml');await writeFile(join(output,'installer.xml'),xml)
  await writeFile(join(output,'installer.png'),execFileSync('adb',['exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024}))
  const node=(xml.match(/<node\b[^>]*>/g)??[]).find(n=>n.includes('enabled="true"')&&/resource-id="(?:android:id\/button1|[^\"]*:id\/ok_button)"/.test(n))
  const bounds=node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  if(!bounds)throw Error('O instalador não ofereceu confirmação; veja installer.xml.')
  const [,x1,y1,x2,y2]=bounds.map(Number);adb('shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2)))
  let installed=false
  for(let i=0;i<150;i++){if(adb('shell','dumpsys','package','dev.runas.codex').includes('versionName=0.1.0-beta.14')){installed=true;break}await sleep(200)}
  check('o Android instala após confirmação explícita',installed)
  socket.close();
  adb('shell','am','force-stop','dev.runas.codex');
  adb('shell','am','start','-n','dev.runas.codex/.MainActivity');
  let nextPid=''
  for(let i=0;i<300&&!nextPid;i++){try{nextPid=adb('shell','pidof','dev.runas.codex').trim()}catch{}if(!nextPid)await sleep(200)}
  if(!nextPid)throw Error('O app atualizado não iniciou.')
  adb('forward','tcp:'+new URL(endpoint).port,'localabstract:webview_devtools_remote_'+nextPid)
  await connect();await until('window.Capacitor?.Plugins?.RunasVault')
  const after=await run('window.Capacitor.Plugins.RunasVault.current()')
  check('versão nova preserva o cofre SAF e suas permissões',after.vault?.path===before.vault?.path && after.vault?.readOnly===false,after)
  const note=await run('window.Capacitor.Plugins.RunasVault.read({paths:["Notas/Teclado.md"]})')
  check('conteúdo do cofre permanece depois de atualizar',note.texts?.['Notas/Teclado.md']?.includes('teclado Android'),note)
  await nativeSource();const latest=await run('window.Capacitor.Plugins.RunasUpdates.check()')
  check('a consulta passa a informar a versão instalada nova',latest.current==='0.1.0-beta.14')
} catch(error) { result.errors.push(String(error.stack??error)) }
finally {
  for(const call of pending.values())clearTimeout(call.timer)
  socket?.close();server.close();adb('reverse','--remove','tcp:'+port)
  result.ok=result.errors.length===0&&Object.values(result.checks).every(Boolean)
  await writeFile(join(output,'updates.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
}
if(!result.ok)process.exit(1)
