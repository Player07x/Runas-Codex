import { createHash } from 'node:crypto'

/** Exercita a ponte real: áudio de 92 MB da mesa e ZIP avulso de 270 MB, sem uma mensagem do tamanho do arquivo. */
export async function verifyBinaryChunks(run, check, metrics, mode) {
  const invoke = (method, options = {}) => run(`window.Capacitor.Plugins.RunasVault[${JSON.stringify(method)}](${JSON.stringify(options)})`)
  const chunk = Buffer.alloc(2 * 1024 * 1024)
  for (let i = 0; i < chunk.length; i++) chunk[i] = i % 251
  const base64 = chunk.toString('base64')
  const sizes = mode === 'external' ? [2] : [92, 270]
  metrics.largeBinaries = []
  for (const mb of sizes) {
    const managed = mb === 92
    const path = managed ? '.runas/mesas/u80-test/assets/audio/audio-92.mp3' : `Notas/U80/arquivo-${mb}.zip`
    let id
    try {
      const start = Date.now(), size = mb * 1024 * 1024
      ;({ id } = await invoke('binaryWriteStart', { path, size, managed, expected: null }))
      const expected = createHash('sha256')
      for (let at = 0; at < size; at += chunk.length) { await invoke('binaryWriteChunk', { id, base64 }); expected.update(chunk) }
      const entry = await invoke('binaryWriteFinish', { id }); id = undefined
      check(`U80 ${mb} MB: publica arquivo completo e caminho correto`, entry.path === path && entry.size === size, entry)
      const writeMs = Date.now() - start
      const read = await invoke('binaryReadStart', { path }); id = read.id
      check(`U80 ${mb} MB: tamanho lido corresponde ao gravado`, read.size === size, read)
      const actual = createHash('sha256'); let count = 0, received = 0
      while (received < size) {
        const part = await invoke('binaryReadChunk', { id })
        const bytes = Buffer.from(part.base64, 'base64')
        if (!bytes.length || bytes.length > chunk.length || received + bytes.length > size) throw Error('Pedaço inválido na ponte Android.')
        actual.update(bytes); received += bytes.length; count++
      }
      await invoke('binaryReadFinish', { id }); id = undefined
      check(`U80 ${mb} MB: SHA-256 idêntico após ida e volta`, actual.digest('hex') === expected.digest('hex'))
      metrics.largeBinaries.push({ mb, path, chunks: count, maxChunkBytes: chunk.length, writeMs, roundTripMs: Date.now() - start })
    } finally { if (id !== undefined) await invoke('binaryAbort', { id }) }
  }
  const { id } = await invoke('binaryWriteStart', { path: 'Notas/U80/cancelado.bin', size: 10, expected: null })
  await invoke('binaryWriteChunk', { id, base64: 'AQID' }); await invoke('binaryAbort', { id })
  const listed = await invoke('list', { prefix: 'Notas/U80' })
  check('U80: cancelar não publica arquivo parcial no cofre', !listed.entries.some(e => e.path === 'Notas/U80/cancelado.bin'))
}
