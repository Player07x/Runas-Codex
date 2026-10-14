export type Design = "original" | "atlas" | "orbita"

export function readDesign(): Design {
  const value = new URLSearchParams(window.location.search).get("design")
  return value === "atlas" || value === "orbita" ? value : "original"
}

export function PrototypeBar({ design, onChange }: { design: Design; onChange: (design: Design) => void }) {
  return <div className="prototype-bar">
    <span className="prototype-label">LAB DE DESIGN <span> / Runas-Codex</span></span>
    <div className="prototype-options" role="group" aria-label="Comparar protótipos">
      {([["original", "Original"], ["atlas", "01 Atlas"], ["orbita", "02 Órbita"]] as const).map(([id, label]) =>
        <button key={id} aria-pressed={design === id} onClick={() => onChange(id)}>{label}</button>)}
    </div>
    <span className="prototype-caption">{design === "atlas" ? "Editorial · foco e leitura" : design === "orbita" ? "Imersivo · foco na mesa" : "Protótipo atual"}</span>
  </div>
}
