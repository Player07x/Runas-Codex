// Cliente de teste para o WebView e o Chromium do CI; não faz parte do app publicado.
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
export async function connectDevtools(endpoint,match=()=>true) {
  let target
  for(let n=0;n<180 && !target;n++) {
    try {target=(await fetch(endpoint+'/json').then(r=>r.json())).find(t=>{let view={};try{view=JSON.parse(t.description||'{}')}catch{}return t.type==='page' && t.webSocketDebuggerUrl && view.attached!==false && view.visible!==false && match(t)})}catch{}
    if(!target)await sleep(250)
  }
  if(!target)throw new Error('Página de teste não abriu: '+endpoint)
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let sequence=0
  const errors=[],network=[],frames=[]
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
  socket.onmessage=event=>{
    const message=JSON.parse(event.data)
    if(message.method==='Network.webSocketFrameReceived'){try{frames.push(JSON.parse(message.params.response.payloadData))}catch{}}
    if(message.method==='Network.loadingFailed' || message.method==='Network.responseReceived'){network.push({method:message.method,params:message.params});if(network.length>100)network.shift()}
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description ?? 'exceção no navegador')
    if(!message.id)return
    const action=pending.get(message.id);if(!action)return;pending.delete(message.id);clearTimeout(action.timer)
    if(message.error)action.reject(new Error(message.error.message));else action.resolve(message.result)
  }
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Tempo excedido: '+method))},30000)
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))
  })
  const run=async expression=>{
    const reply=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})
    if(reply.exceptionDetails)throw new Error(reply.exceptionDetails.exception?.description ?? JSON.stringify(reply.exceptionDetails))
    return reply.result?.value
  }
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable')
  return {send,run,errors,network,frames,close:()=>socket.close(),until:async(expression,tries=200)=>{
    for(let n=0;n<tries;n++){if(await run(`(()=>{try{return Boolean(${expression})}catch{return false}})()`))return;await sleep(150)}
    throw new Error('Não aconteceu: '+expression)
  }}
}
