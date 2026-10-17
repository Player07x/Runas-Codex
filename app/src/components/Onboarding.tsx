import { useEffect, useRef, useState } from "react"
import { BookOpen, Compass } from "lucide-react"
import { starterNotes, exampleNotes } from "../core/onboarding"
import { useVault } from "../platform/VaultProvider"
import { href } from "../lib/router"
import { flushOpenNotes } from "../lib/vault-notes"
import { Modal, useToast } from "./ui"
const EVENT = "runas-codex:tour"
const STEPS = [
  { title: "Seu universo fica neste cofre", text: "As notas são arquivos Markdown locais. Você pode abrir a mesma pasta no Obsidian. Os exemplos têm uma marca e podem ser removidos juntos nas Configurações.", route: "/notas", action: "Conhecer as notas" },
  { title: "Dê forma e tempo à história", text: "Na Wiki, conecte pessoas e lugares. Na Agenda, marque eventos e lembretes. Nas Campanhas, prepare sessões, missões e o tesouro do grupo.", route: "/wiki", action: "Explorar a Wiki" },
  { title: "Escreva e reúna seu grupo", text: "Livros organiza capítulos e exportações. No VTT, crie cenas e abra uma sala quando quiser jogar. A rede só é usada pela sala e pela verificação de atualização que você pedir.", route: "/vtt", action: "Conhecer o VTT" },
]
const keyFor = (path: string) => `runas-codex:primeiros-passos:${path}`
const wasShown = (path: string) => { try { return localStorage.getItem(keyFor(path)) === "feito" } catch { return false } }
const remember = (path: string) => { try { localStorage.setItem(keyFor(path), "feito") } catch { /* Tour pode reaparecer no próximo início. */ } }
export function OnboardingRuntime() {
  const vault = useVault(), toast = useToast()
  const [step, setStep] = useState<number | null>(null), [status, setStatus] = useState("")
  const preparing = useRef(new Set<string>())
  useEffect(() => { const show = () => setStep(0); window.addEventListener(EVENT, show); return () => window.removeEventListener(EVENT, show) }, [])
  useEffect(() => {
    const info = vault.info
    if (!info || vault.loading || !vault.index || info.readOnly || vault.index.size !== 0 || wasShown(info.path) || preparing.current.has(info.path)) return
    preparing.current.add(info.path); setStep(0); setStatus("Preparando as notas de exemplo…")
    void (async () => {
      try {
        for (const note of starterNotes()) await vault.createNote(note.folder, note.name, note.text)
        remember(info.path); setStatus("Oito notas de exemplo estão prontas. Você pode editá-las ou remover todas nas Configurações.")
      } catch (error) { setStatus("Não foi possível criar todos os exemplos. Você pode completar pelas Configurações."); toast(String(error)) }
    })()
  }, [vault, toast])
  if (step === null) return null
  const current = STEPS[step]!
  const close = () => { if (vault.info) remember(vault.info.path); setStep(null) }
  return <Modal title={`Primeiros passos · ${step + 1} de ${STEPS.length}`} onClose={close} footer={<>
    <button className="btn ghost" onClick={close}>Concluir depois</button>
    {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Anterior</button>}
    <button className="btn primary" onClick={() => step + 1 === STEPS.length ? close() : setStep(step + 1)}>{step + 1 === STEPS.length ? "Começar a explorar" : "Próximo"}</button>
  </>}><div className="tour-step"><Compass size={36} aria-hidden="true" /><h2>{current.title}</h2><p>{current.text}</p><a className="btn" href={href(current.route)} onClick={close}>{current.action}</a><p className="small muted" role="status">{status}</p><p className="tiny muted">Reabra este tour em Configurações → Primeiros passos.</p></div></Modal>
}
export function OnboardingSettings() {
  const vault = useVault(), toast = useToast(), [busy, setBusy] = useState(false)
  const count = vault.index ? exampleNotes(vault.index).length : 0
  const run = async (remove: boolean) => {
    if (!vault.index) return
    setBusy(true)
    try {
      await flushOpenNotes()
      if (remove) { for (const note of exampleNotes(vault.index)) await vault.trash(note.path); toast("As notas de exemplo foram para a lixeira do cofre.") }
      else {
        let added = 0
        for (const note of starterNotes()) {
          const path = `${note.folder}/${note.name}.md`
          if (vault.index.hasFile(path)) continue
          await vault.createNote(note.folder, note.name, note.text); added++
        }
        toast(`${added} notas de exemplo adicionadas.`)
      }
    } catch (error) { toast(String(error)) } finally { setBusy(false) }
  }
  return <section className="card stack" aria-labelledby="onboarding-title"><h2 id="onboarding-title" className="section-title row"><BookOpen size={16} /> Primeiros passos</h2>
    <p className="small muted">Um tour curto e exemplos para Notas, Agenda, Wiki, Campanhas, Livros e Mesa. {count > 0 ? `${count} notas de exemplo neste cofre.` : "Nenhuma nota de exemplo marcada neste cofre."}</p>
    <button className="btn" onClick={() => window.dispatchEvent(new Event(EVENT))}>Rever o tour</button>
    <button className="btn" disabled={busy || !vault.index || vault.info?.readOnly} onClick={() => void run(false)}>Adicionar exemplos que faltam</button>
    <button className="btn danger" disabled={busy || !count || vault.info?.readOnly} onClick={() => void run(true)}>Remover todas as notas de exemplo ({count})</button>
    <p className="tiny muted">A remoção usa a lixeira recuperável do cofre e só inclui notas com a propriedade exemplo_runas: true. Para conservar uma nota, retire essa propriedade antes.</p>
  </section>
}
