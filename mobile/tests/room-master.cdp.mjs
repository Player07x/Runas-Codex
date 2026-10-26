// R5: usa o mesmo HTTP/SSE do desktop contra o servidor real do APK.
import { readFile, writeFile } from 'node:fs/promises'
import { connectDevtools, sleep } from './devtools-client.mjs'

export async function checkRemoteMaster({ app, browser, base, playerKey, fixture, output, chromeEndpoint, check, adb }) {
  let state = await app.run('window.Capacitor.Plugins.RunasRoom.masterState()')
  const key = state.key, url = `${base}/master?m=${key}`
  check('mestre tem chave própria de 128 bits', /^[a-f0-9]{32}$/.test(key) && key !== playerKey)
  check('chave do jogador não abre o mestre', (await fetch(`${base}/master?m=${playerKey}`)).status === 404)
  check('master.html é servido com chave', (await fetch(url)).status === 200)
  check('origem externa não abre o mestre', (await fetch(url, { headers: { Origin: 'https://externo.invalid' } })).status === 404)
  const controller = new AbortController(), messages = []
  const response = await fetch(`${base}/master/events?m=${key}`, { signal: controller.signal })
  check('canal SSE do mestre abre', response.status === 200)
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let finished = false, streamFailure
  const pump = (async () => {
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        for (let index; (index = buffer.indexOf('\n\n')) >= 0;) {
          const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2)
          const event = frame.split('\n').find(line => line.startsWith('event: '))?.slice(7)
          const data = frame.split('\n').find(line => line.startsWith('data: '))?.slice(6)
          if (event && data) messages.push({ event, data: JSON.parse(data) })
        }
      }
    } catch (error) { if (!controller.signal.aborted) streamFailure = error }
    finally { finished = true }
  })()
  // Falhas de rede podem chegar antes do próximo ponto de espera.
  pump.catch(() => {})
  const wait = async predicate => {
    for (let i = 0; i < 100; i++) { const result = messages.find(predicate); if (result) return result; await sleep(100) }
    throw new Error('Evento do mestre não chegou', { cause: streamFailure })
  }
  try {
    const hello = await wait(message => message.event === 'hello'), session = hello.data.session
    check('SSE identifica a mesa hospedada no Android', hello.data.world.id === 'x7-ci')
    check('segundo mestre recebe 409', (await fetch(`${base}/master/events?m=${key}`)).status === 409)
    const request = (channel, args = [], token = session) => fetch(`${base}/master/rpc?m=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-runas-session': token }, body: JSON.stringify({ channel, args }),
    })
    const rpc = async (channel, ...args) => {
      const response = await request(channel, args), value = await response.json()
      if (!response.ok) throw new Error(`${channel}: ${JSON.stringify(value)}`)
      return value.result
    }
    check('canal fora da lista recebe 403', (await request('vault:read')).status === 403)
    check('RPC exige sessão do SSE', (await request('vtt:documents-list', ['scene'], 'errada')).status === 403)
    const token = { id: 'r5-token', type: 'token', parentId: 'scene', data: { name: 'Token do tablet R5', x: 350, y: 150, disposition: 'friendly' } }
    browser.frames.length = 0
    await rpc('vtt:documents-put', token)
    await wait(message => message.event === 'vtt:documents-changed' && message.data.document?.id === token.id)
    for (let i = 0; i < 100 && !JSON.stringify(browser.frames).includes('Token do tablet R5'); i++) await sleep(100)
    check('jogador vê o token criado pelo mestre remoto', JSON.stringify(browser.frames).includes('Token do tablet R5'))
    const stored = JSON.parse(adb('exec-out', 'cat', '/sdcard/Documents/cofre-room/.runas/mesas/ci-x7/cenas/scene.json'))
    check('token remoto está gravado na cena do celular', stored.some(document => document.id === token.id))
    const range = await fetch(`${base}/master/asset/${fixture.secret}?m=${key}`, { headers: { Range: 'bytes=2-5' } })
    check('mestre lê asset privado com Range', range.status === 206 && (await range.arrayBuffer()).byteLength === 4)
    check('asset privado continua oculto do jogador', (await fetch(`${base}/assets/${fixture.secret}?k=${playerKey}`)).status === 404)
    const image = await readFile(`${output}/fixture/.runas/mesas/ci-x7/assets/${fixture.secret}`)
    const imported = await fetch(`${base}/master/asset?m=${key}&kind=tiles&name=tablet.png`, {
      method: 'POST', headers: { 'x-runas-session': session }, body: image,
    })
    check('mestre importa imagem na mesa', imported.ok && (await imported.json()).result.startsWith('tiles/'))
    await rpc('vtt:documents-put', { id: 'r5-scene', type: 'scene', parentId: null, data: { name: 'Cena do tablet' } })
    await rpc('vtt:player-set-scene', 'r5-scene')
    check('mestre troca a cena transmitida', (await rpc('vtt:player-state')).sceneId === 'r5-scene')
    await rpc('vtt:player-set-scene', 'scene')
    await rpc('vtt:documents-put', { id: 'r5-playlist', type: 'playlist', parentId: null, data: { name: 'Sons R5', mode: 'soundboard' } })
    // WAV PCM silencioso e curto, para testar o serviço sem arquivos externos.
    const wav = Buffer.alloc(46); wav.write('RIFF'); wav.writeUInt32LE(38, 4); wav.write('WAVEfmt ', 8)
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24)
    wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(2, 40)
    const audioResponse = await fetch(`${base}/master/asset?m=${key}&kind=audio&name=silencio.wav`, { method: 'POST', headers: { 'x-runas-session': session }, body: wav })
    const audio = (await audioResponse.json()).result
    await rpc('vtt:documents-put', { id: 'r5-track', type: 'track', parentId: 'r5-playlist', data: { name: 'Som R5', audio, loop: true } })
    await rpc('vtt:audio-play-track', 'r5-track')
    const audioEvent = await wait(message => message.event === 'vtt:audio-state-changed' && message.data.sounds?.some(sound => sound.trackId === 'r5-track'))
    check('mestre aciona áudio na autoridade do celular', Boolean(audioEvent))
    await rpc('vtt:audio-stop-all')
    return {
      async background() {
        await rpc('vtt:documents-put', { ...token, data: { ...token.data, x: 450 } })
        const persisted = JSON.parse(adb('exec-out', 'cat', '/sdcard/Documents/cofre-room/.runas/mesas/ci-x7/cenas/scene.json'))
        check('mestre comanda e grava com tela do celular apagada', persisted.find(document => document.id === token.id)?.data.x === 450)
      },
      async afterWake() {
        state = await app.run('window.Capacitor.Plugins.RunasRoom.masterRotate()')
        for (let i = 0; i < 50 && !finished; i++) await sleep(100)
        check('trocar chave derruba stream antigo', finished)
        await pump
        check('link antigo deixa de funcionar', (await fetch(url)).status === 404)
        const masterUrl = `${base}/master?m=${state.key}`
        const target = await browser.send('Target.createTarget', { url: masterUrl })
        let masterBrowser
        try {
          masterBrowser = await connectDevtools(chromeEndpoint, tab => tab.url === masterUrl)
          await masterBrowser.until(`document.querySelector('.table-title')?.textContent.includes('Sala Android X7') && document.querySelector('canvas')`)
          await masterBrowser.until(`Number(document.querySelector('canvas')?.dataset.viewZoom) > 0`)
          await masterBrowser.run('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
          const point = await masterBrowser.run(`(() => {
            const canvas = document.querySelector('canvas'), box = canvas.getBoundingClientRect(), zoom = Number(canvas.dataset.viewZoom)
            return { x: box.x + Number(canvas.dataset.viewX) + 450 * zoom, y: box.y + Number(canvas.dataset.viewY) + 150 * zoom }
          })()`)
          await masterBrowser.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
          await masterBrowser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
          await masterBrowser.until(`[...document.querySelectorAll('.properties input')].some(input => input.value === 'Token do tablet R5')`)
          check('mestre seleciona no canvas o token gravado pelo tablet', true)
          check('mesma RemoteVttApi abre mesa real pelo navegador', masterBrowser.errors.length === 0)
          const shot = await masterBrowser.send('Page.captureScreenshot', { format: 'png' })
          await writeFile(`${output}/mestre-no-navegador.png`, Buffer.from(shot.data, 'base64'))
          await app.run('window.Capacitor.Plugins.RunasRoom.masterDisconnect()')
          await masterBrowser.until(`document.querySelector('[role="alert"]')`)
          check('desconectar encerra mestre no navegador', true)
        } finally {
          masterBrowser?.close()
          await browser.send('Target.closeTarget', { targetId: target.targetId })
        }
      },
      close() { controller.abort() },
    }
  } catch (error) { controller.abort(); throw error }
}
