import { useEffect, useRef } from "react"
import { expandEvents } from "../core/agenda"
import { attachmentEmbed } from "../core/attachments"
import { SHARE_FOLDER, sharedNoteText, sharedNoteTitle, widgetItems } from "../core/android-share"
import { agendaEvents } from "../lib/agenda-data"
import { navigate } from "../lib/router"
import { vaultRoute } from "../lib/vault-notes"
import { useToast } from "../components/ui"
import { fromBase64, RunasVault, type SharedItem } from "./capacitor-platform"
import { useVault } from "./VaultProvider"

/**
 * O que só existe no Android: "Compartilhar com" (texto, link ou imagem de outro app vira nota na caixa de entrada),
 * o toque no widget da Agenda e os próximos eventos que o widget mostra.
 */
export function AndroidRuntime() {
  const vault = useVault()
  if (vault.platform.kind !== "capacitor") return null
  return <AndroidRuntimeInner />
}

function AndroidRuntimeInner() {
  const vault = useVault()
  const toast = useToast()
  const latest = useRef(vault)
  latest.current = vault
  const queue = useRef<SharedItem[]>([])

  const saveShared = async (item: SharedItem) => {
    const v = latest.current
    if (!v.index || !v.info) throw new Error("Abra um cofre para guardar o que foi compartilhado.")
    if (v.info.readOnly) throw new Error("O cofre está em somente leitura: libere a gravação em Configurações para guardar o que foi compartilhado.")
    const now = new Date()
    const title = sharedNoteTitle(item.subject, item.text, now)
    const notePath = `${SHARE_FOLDER}/${title}.md`
    const embeds: string[] = []
    for (const file of item.files) {
      const saved = await v.addAttachment(file.name, fromBase64(file.base64), notePath)
      embeds.push(attachmentEmbed(saved, notePath, v.config.app, v.index))
    }
    let name = title
    for (let n = 2; v.index.note(`${SHARE_FOLDER}/${name}.md`); n++) name = `${title} ${n}`
    const created = await v.createNote(SHARE_FOLDER, name, sharedNoteText(item.subject, item.text, embeds, now))
    navigate(vaultRoute(created))
  }

  // O que chega antes de o cofre abrir espera na fila.
  useEffect(() => {
    if (!vault.index || !queue.current.length) return
    const pending = queue.current.splice(0)
    void (async () => {
      for (const item of pending) await saveShared(item).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)))
    })()
  }, [vault.index])

  useEffect(() => {
    const share = RunasVault.addListener("share", (item) => {
      if (!latest.current.index) queue.current.push(item)
      else void saveShared(item).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)))
    })
    const open = RunasVault.addListener("open", ({ route }) => navigate(route))
    return () => {
      void share.then((h) => h.remove())
      void open.then((h) => h.remove())
    }
  }, [toast])

  // Widget: os próximos eventos depois de cada mudança na Agenda (e a cada hora, para os que já passaram saírem).
  useEffect(() => {
    if (!vault.index) return
    const index = vault.index
    const run = () => {
      const now = new Date()
      const items = widgetItems(expandEvents(agendaEvents(index), now, new Date(now.getTime() + 60 * 86_400_000)), now)
      void RunasVault.setAgendaWidget({ items }).catch(() => undefined)
    }
    run()
    const timer = setInterval(run, 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [vault.index, vault.version])

  return null
}
