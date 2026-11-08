import { ImagePlus, X } from "lucide-react"
import { useId, useMemo, useRef, useState } from "react"
import "./kit.css"
import { basename, extname } from "../../core/text"
import { useVault } from "../../platform/VaultProvider"

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"])

/**
 * Imagem da capa pelo seletor (L4): as imagens do cofre em miniatura, com filtro, ou uma imagem nova do computador,
 * gravada como anexo perto da nota. O valor é um link `[[caminho]]`, como o Obsidian entende. Usado na capa do livro
 * e no Personalizar (campanha, categoria e wiki).
 */
export function CoverImagePicker({ value, onChange, nearNote, legend = "Imagem da capa" }: { value: string; onChange(link: string): void; nearNote: string; legend?: string }) {
  const vault = useVault(), index = vault.index!
  const name = useId()
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const images = useMemo(() => index.allFiles().filter((f) => IMAGE_EXTENSIONS.has(extname(f.path).toLowerCase())).map((f) => f.path).sort((a, b) => a.localeCompare(b, "pt-BR")), [index, vault.version])
  const link = value.replace(/^!?\[\[|\]\]$/g, "").split("|")[0]!.trim()
  const current = images.find((path) => path === link || path.endsWith(`/${link}`))
  const query = filter.trim().toLocaleLowerCase("pt-BR")
  const shown = images.filter((path) => !query || path.toLocaleLowerCase("pt-BR").includes(query)).slice(0, 48)
  if (current && !shown.includes(current)) shown.unshift(current)

  async function upload(file: File) {
    setError("")
    try {
      const path = await vault.addAttachment(file.name, new Uint8Array(await file.arrayBuffer()), nearNote)
      onChange(`[[${path}]]`)
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
  }

  return <fieldset className="book-cover-picker kit-cover-picker">
    <legend>{legend}</legend>
    <div className="row-wrap">
      <input className="input" type="search" aria-label="Filtrar imagens do cofre" placeholder="Filtrar imagens do cofre" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <button type="button" className="btn sm" disabled={vault.info?.readOnly} onClick={() => input.current?.click()}><ImagePlus size={15} /> Do computador…</button>
      {value && <button type="button" className="btn sm ghost" onClick={() => onChange("")}><X size={15} /> Sem imagem</button>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file) }} />
    </div>
    {error && <p role="alert" className="book-style-error kit-cover-error">{error}</p>}
    {images.length === 0 ? <p className="small muted">Ainda não há imagens no cofre. Use “Do computador…”.</p> : <div className="book-cover-grid kit-cover-grid" role="radiogroup" aria-label="Imagens do cofre">
      {shown.map((path) => <label key={path} className={`book-cover-thumb kit-cover-thumb${path === current ? " on" : ""}`} title={path}>
        <input type="radio" name={name} checked={path === current} onChange={() => onChange(`[[${path}]]`)} />
        <img src={vault.platform.fileUrl(path) ?? ""} alt="" loading="lazy" />
        <span>{basename(path)}</span>
      </label>)}
    </div>}
    {images.length > shown.length && <p className="small muted">Mostrando {shown.length} de {images.length} imagens; filtre pelo nome.</p>}
  </fieldset>
}
