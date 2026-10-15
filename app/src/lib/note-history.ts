import { addSnapshot, type NoteSnapshot } from "../core/note-tools"
let database: Promise<IDBDatabase> | undefined
function open(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("runas-codex:historico", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("notas")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error("Não foi possível abrir o histórico local."))
  })
  return database
}
export async function versions(vault: string, path: string): Promise<NoteSnapshot[]> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = db.transaction("notas").objectStore("notas").get(vault + "\0" + path)
    request.onsuccess = () => resolve((request.result as NoteSnapshot[] | undefined) ?? [])
    request.onerror = () => reject(new Error("Não foi possível ler as versões locais."))
  })
}
export async function recordVersion(vault: string, path: string, text: string, force = false): Promise<void> {
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("notas", "readwrite"), store = transaction.objectStore("notas"), key = vault + "\0" + path
      const request = store.get(key)
      request.onsuccess = () => store.put(addSnapshot((request.result as NoteSnapshot[] | undefined) ?? [], text, Date.now(), force), key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error("Sem espaço para guardar uma versão local. A nota continua sendo salva no cofre."))
      transaction.onabort = () => reject(new Error("O histórico local não pôde ser atualizado."))
    })
  } catch (e) {
    // Histórico indisponível não impede a gravação do documento principal; a interface informa o problema.
    window.dispatchEvent(new CustomEvent("runas-codex:erro-historico", { detail: e instanceof Error ? e.message : String(e) }))
  }
}

export async function renameVersions(vault: string, from: string, to: string): Promise<void> {
  try {
    const db = await open(), prefix = vault + "\0" + from
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("notas", "readwrite"), store = transaction.objectStore("notas"), request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        const key = String(cursor.key)
        if (key === prefix || key.startsWith(prefix + "/")) { store.put(cursor.value, vault + "\0" + to + key.slice(prefix.length)); cursor.delete() }
        cursor.continue()
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error("O histórico ficou no caminho anterior da nota."))
    })
  } catch (error) { window.dispatchEvent(new CustomEvent("runas-codex:erro-historico", { detail: String(error) })) }
}
