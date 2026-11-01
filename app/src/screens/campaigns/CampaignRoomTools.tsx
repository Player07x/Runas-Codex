import { useEffect, useState } from "react"
import { stringify } from "yaml"
import { vtt } from "../../vtt/api"
import type { RoomCollaboration, RoomPrompt } from "../../vtt/shared/collaboration"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../../components/ui"

const KIND_LABEL: Record<RoomPrompt["kind"], string> = {
  diario: "Diário dos jogadores",
  avaliacao: "Avaliação da sessão",
  enquete: "Enquete de data",
}

const average = (ratings: { score: number }[]) => ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length

/**
 * Atividades pela sala do VTT: o mestre abre um diário, uma avaliação anônima ou uma enquete de data e guarda as
 * respostas no cofre. Consulta a sala a cada 2 s com ela ligada e a cada 8 s com ela desligada. `onlyPoll` mostra só
 * a enquete (a Agenda usa).
 */
export function CampaignRoomTools({ campaign, root, readOnly, onlyPoll = false }: { campaign: string; root: string; readOnly: boolean; onlyPoll?: boolean }) {
  const vault = useVault()
  const toast = useToast()
  const [state, setState] = useState<RoomCollaboration>()
  const [kind, setKind] = useState<RoomPrompt["kind"]>(onlyPoll ? "enquete" : "diario")
  const [title, setTitle] = useState("")
  const [options, setOptions] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sessionPath, setSessionPath] = useState("")
  const sessions = vault.index!.notesIn(root).filter((n) => n.meta.frontmatter?.data?.tipo === "sessao")

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      let on = false
      try {
        const [collaboration, player] = await Promise.all([vtt.collaboration?.state(), vtt.player.state()])
        on = player.enabled
        if (active) {
          setState(collaboration)
          setEnabled(player.enabled)
        }
      } catch {
        /* a sala ainda não respondeu: tenta de novo no próximo ciclo */
      }
      if (active) timer = setTimeout(() => void load(), on ? 2000 : 8000)
    }
    void load()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  const run = (task: () => Promise<void>) => {
    setBusy(true)
    void task().catch((e: unknown) => toast(e instanceof Error ? e.message : String(e))).finally(() => setBusy(false))
  }
  const openPrompt = () => run(async () => {
    const prompt: RoomPrompt = {
      id: crypto.randomUUID(),
      kind,
      title: title.trim() || `${campaign} — ${KIND_LABEL[kind]}`,
      options: options.split("\n").map((v) => v.trim()).filter(Boolean),
    }
    setState(await vtt.collaboration!.command({ type: "prompt", prompt }))
  })
  const saveDiary = (diary: RoomCollaboration["diaries"][number]) => run(async () => {
    await vault.createNote(`${root}Diário dos jogadores`, `${diary.id.slice(0, 8)} — Diário`, `---\n${stringify({ tipo: "diario-jogador", jogador: diary.author })}---\n# ${diary.title}\n\n${diary.text}\n`)
    setState(await vtt.collaboration!.command({ type: "consume-diary", id: diary.id }))
    toast("Entrada do diário guardada no cofre.")
  })
  const saveResults = (current: RoomCollaboration) => run(async () => {
    const summary = current.ratings.length
      ? current.ratings.map((r) => `- ${r.score}/10 — ${r.text}`).join("\n")
      : current.prompt!.options.map((option, i) => `- ${option}: ${current.votes[i] ?? 0} votos`).join("\n")
    // A média das avaliações vira a nota da sessão escolhida.
    if (current.ratings.length && sessionPath) await vault.setProperty(sessionPath, "avaliacao", Number(average(current.ratings).toFixed(2)))
    await vault.createNote(`${root}Atividades da sala`, `${new Date().toISOString().replace(/[:.]/g, "-")} — Respostas`, `# ${current.prompt?.title ?? "Resultados"}\n\n${summary}\n`)
    toast("Resultados guardados no cofre.")
  })

  return (
    <section className="card stack campaign-room">
      <h2>Atividades pela sala</h2>
      {!enabled && <p className="muted">Abra uma mesa e inicie a sala do VTT para receber respostas dos jogadores.</p>}
      <form className="row-wrap" onSubmit={(e) => { e.preventDefault(); openPrompt() }}>
        <label>
          Atividade
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as RoomPrompt["kind"])}>
            {!onlyPoll && (
              <>
                <option value="diario">Diário dos jogadores</option>
                <option value="avaliacao">Avaliação anônima da sessão</option>
              </>
            )}
            <option value="enquete">Enquete de data</option>
          </select>
        </label>
        <label>
          Título da atividade
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </label>
        {!onlyPoll && kind === "avaliacao" && (
          <label>
            Sessão avaliada
            <select className="input" value={sessionPath} onChange={(e) => setSessionPath(e.target.value)}>
              <option value="">Escolha a sessão para registrar a média…</option>
              {sessions.map((n) => <option key={n.path} value={n.path}>{n.name}</option>)}
            </select>
          </label>
        )}
        {kind === "enquete" && (
          <label>
            Datas e horários (um por linha)
            <textarea className="input" rows={4} placeholder={"25/10 às 19:30\n26/10 às 20:00"} value={options} onChange={(e) => setOptions(e.target.value)} />
          </label>
        )}
        <button className="btn primary" disabled={readOnly || busy || !enabled || !vtt.collaboration}>Abrir atividade para os jogadores</button>
      </form>
      {state?.prompt && !state.closed && (
        <>
          <p><strong>{state.prompt.title}</strong> · {state.responses} respostas</p>
          <button className="btn" disabled={readOnly || busy} onClick={() => run(async () => setState(await vtt.collaboration!.command({ type: "prompt", prompt: null })))}>
            Encerrar atividade
          </button>
        </>
      )}
      {!onlyPoll && state && state.ratings.length > 0 && (
        <section>
          <h3>Avaliações sem identificação</h3>
          <p>Média: {average(state.ratings).toFixed(1)} / 10</p>
          {state.ratings.map((rating, i) => <p key={i}>{rating.score} / 10 · {rating.text}</p>)}
        </section>
      )}
      {state?.prompt?.kind === "enquete" && (
        <ul>
          {state.prompt.options.map((option, i) => <li key={i}>{option}: {state.votes[i] ?? 0} votos</li>)}
        </ul>
      )}
      {!onlyPoll && state && state.diaries.length > 0 && (
        <section>
          <h3>Diários recebidos</h3>
          {state.diaries.map((diary) => (
            <article className="card stack" key={diary.id}>
              <strong>{diary.title} · {diary.author}</strong>
              <p className="preserve-lines">{diary.text}</p>
              <button className="btn" disabled={readOnly || busy} onClick={() => saveDiary(diary)}>Guardar entrada como nota</button>
            </article>
          ))}
        </section>
      )}
      {state && (state.ratings.length > 0 || state.prompt?.kind === "enquete") && (
        <button className="btn" disabled={readOnly || busy} onClick={() => saveResults(state)}>Guardar resultados como nota</button>
      )}
      <p className="small">Guarde os diários e resultados no cofre antes de abrir outra atividade ou fechar a mesa. As avaliações chegam ao mestre sem o nome do jogador.</p>
    </section>
  )
}
