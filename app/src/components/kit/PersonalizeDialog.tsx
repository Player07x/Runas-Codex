import { useMemo, useState } from "react"
import { lookOf, lookProperties, type Look } from "../../core/personalization"
import { setProperty } from "../../core/properties"
import { EMBLEMS, TONES, parseTone, type Tone } from "../../core/tones"
import { extname } from "../../core/text"
import { useVault } from "../../platform/VaultProvider"
import { Modal, useToast } from "../ui"
import { CoverBand, Crest, emblemIcon } from "./Emblem"
import { Notice } from "./Layout"

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"])

/**
 * “Personalizar” de uma campanha ou categoria da Wiki (ADR 0027): cor (12 tons ou uma cor livre, ajustada para o
 * contraste), ícone, capa e, na categoria, uma descrição. Grava na nota; se a nota da categoria não existe, cria com
 * `tipo: categoria`.
 */
export function PersonalizeDialog({ title, name, path, createIn, withDescription = false, onClose }: {
  title: string; name: string; path: string
  /** Pasta onde criar a nota, se ela ainda não existe (categoria). */
  createIn?: string
  withDescription?: boolean
  onClose(): void
}) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const note = index.note(path)
  const data = note?.meta.frontmatter?.data ?? {}
  const initial = useMemo(() => lookOf(data), [path])
  const [toneId, setToneId] = useState(initial.tone?.id ?? "")
  const [custom, setCustom] = useState(initial.tone && !initial.tone.cssClass ? initial.tone.id : "#c2553a")
  const [emblem, setEmblem] = useState(initial.emblem ?? "")
  const [cover, setCover] = useState(initial.cover ?? "")
  const [description, setDescription] = useState(initial.description ?? "")
  const [busy, setBusy] = useState(false)
  const images = useMemo(() => index.allFiles().filter((f) => IMAGE_EXTENSIONS.has(extname(f.path).toLowerCase())).map((f) => f.path).sort((a, b) => a.localeCompare(b, "pt-BR")), [index, vault.version])

  const tone: Tone | null = toneId === "livre" ? parseTone(custom) : toneId ? parseTone(toneId) : null
  const look: Look = { tone, emblem: emblem || null, cover: cover.trim().replace(/^!?\[\[|\]\]$/g, "") || null, ...(withDescription ? { description } : {}) }
  const readOnly = vault.info?.readOnly ?? true

  const save = async () => {
    setBusy(true)
    try {
      let text = note?.text ?? `# ${name}\n`
      // Só a nota nova de uma categoria leva `tipo: categoria`; a de uma campanha que ainda não tem nota fica sem tipo.
      if (!note && createIn) text = setProperty(text, "tipo", "categoria")
      for (const [key, value] of lookProperties(look, data, withDescription)) text = setProperty(text, key, value)
      if (note) await vault.save(path, text)
      else await vault.createNote(createIn ?? path.slice(0, path.lastIndexOf("/")), name, text)
      toast("Personalização gravada")
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error))
      setBusy(false)
    }
  }

  const toneOptions = [{ id: "", label: "Nenhuma", tone: null as Tone | null }, ...TONES.map((t) => ({ id: t.id, label: t.label, tone: t })), { id: "livre", label: "Cor livre", tone: parseTone(custom) }]

  return (
    <Modal
      title={title}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn primary" onClick={() => void save()} disabled={busy || readOnly || (toneId === "livre" && !tone)}>{busy ? "Gravando…" : "Salvar"}</button>
        </>
      }
    >
      <div className="personalize">
        {readOnly && <Notice tone="warn" title="Cofre em somente leitura">Libere a gravação em Configurações › Cofre para personalizar.</Notice>}
        <div className="personalize-preview" aria-label="Prévia">
          <Crest tone={tone} emblem={look.emblem} name={name} size={48} />
          <strong className={tone ? "toned" : undefined} style={tone ? { ["--tone-dark" as string]: tone.dark, ["--tone-light" as string]: tone.light, color: "var(--tone, var(--text))" } : undefined}>{name}</strong>
          <span className="grow" />
          <CoverBand tone={tone} cover={look.cover} from={path} height={64} />
        </div>

        <fieldset>
          <legend>Cor</legend>
          <div className="tone-options" role="radiogroup" aria-label="Cor">
            {toneOptions.map((option) => (
              <label key={option.id || "nenhuma"} className={`tone-option${toneId === option.id ? " on" : ""}`}>
                <input type="radio" name="personalizar-cor" checked={toneId === option.id} onChange={() => setToneId(option.id)} />
                <span className={`tone-dot${option.tone ? "" : " none"}`} style={option.tone ? { ["--sw-dark" as string]: option.tone.dark, ["--sw-light" as string]: option.tone.light } : undefined} aria-hidden="true" />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {toneId === "livre" && (
            <label className="field">
              <span>Cor livre (hexadecimal)</span>
              <span className="row" style={{ gap: 8 }}>
                <input type="color" className="input" style={{ width: 56, padding: 2 }} value={/^#[0-9a-f]{6}$/i.test(custom) ? custom : "#c2553a"} onChange={(e) => setCustom(e.target.value)} aria-label="Escolher a cor livre" />
                <input className="input mono" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Cor livre em hexadecimal" aria-describedby="personalizar-cor-ajuda" />
              </span>
              <span id="personalizar-cor-ajuda" className="small muted">
                {!tone ? "Use o formato #rrggbb." : tone.adjusted ? "O tom foi ajustado para o texto ficar legível nos temas escuro e claro. Uma cor livre aparece só no Runas-Codex; os 12 tons prontos aparecem também no Obsidian (snippet runas-codex.css)." : "Essa cor já é legível nos dois temas. Ela aparece só no Runas-Codex."}
              </span>
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>Ícone</legend>
          <div className="emblem-options" role="radiogroup" aria-label="Ícone">
            {[["", "Sem ícone (inicial)", ""] as [string, string, string], ...EMBLEMS].map(([id, label]) => {
              const Icon = emblemIcon(id)
              return (
                <label key={id || "nenhum"} className={`emblem-option${emblem === id ? " on" : ""}`} title={label}>
                  <input type="radio" name="personalizar-icone" checked={emblem === id} onChange={() => setEmblem(id)} aria-label={label} />
                  {Icon ? <Icon size={20} aria-hidden="true" /> : <span aria-hidden="true">{Array.from(name)[0]?.toLocaleUpperCase("pt-BR")}</span>}
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend>Capa</legend>
          <label className="field">
            <span>Imagem do cofre · opcional</span>
            <input className="input" list="personalizar-imagens" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Imagens/capa.png" aria-label="Imagem de capa" />
            <datalist id="personalizar-imagens">
              {images.map((image) => <option key={image} value={image} />)}
            </datalist>
          </label>
        </fieldset>

        {withDescription && (
          <fieldset>
            <legend>Descrição</legend>
            <label className="field">
              <span>Uma frase sobre a categoria · opcional</span>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Descrição da categoria" />
            </label>
          </fieldset>
        )}
        <p className="small muted">Fica na nota {note ? <code>{path}</code> : <>nova <code>{path}</code>{createIn ? <>, com <code>tipo: categoria</code></> : null}</>}, então vale em todos os aparelhos. Em Configurações › Aparência dá para desligar as cores próprias.</p>
      </div>
    </Modal>
  )
}
