import { ImageFolderSettings } from "../components/vault/NoteImages"
import { AppearanceSettings } from "../components/Appearance"
import { OnboardingSettings } from "../components/Onboarding"
import { DesktopTraySettings } from "../platform/DesktopTray"
import { useEffect, useState, type ReactNode } from "react"
import { Archive, Bell, FolderOpen, Keyboard, Network, Plus, RefreshCw, ShieldCheck, Vault } from "lucide-react"
import { Modal, Switch, useToast } from "../components/ui"
import { attachmentFolderLabel, unusedAttachments } from "../core/attachments"
import { useVault } from "../platform/VaultProvider"
import type { BackupInfo } from "../platform/platform"
import type { UpdateInfo } from "../core/updates"
import snippetCss from "../markdown/runas-codex.css?raw"
import { PinRow } from "../components/vault/PinSettings"
import { CustomizationSettings } from "../components/vault/Customization"
import "./transfer.css"

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <span className="small" style={{ fontWeight: 650 }}>{title}</span>
        {hint && <span className="tiny faint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function SettingsScreen({ theme, onTheme }: { theme: string; onTheme: (theme: string) => void }) {
  const toast = useToast()
  const vault = useVault()
  const desktop = vault.platform.kind !== "memory"
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [busy, setBusy] = useState(false)
  const run = (action: () => Promise<unknown>) => () => {
    setBusy(true)
    action()
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }
  useEffect(() => {
    if (vault.info) vault.platform.listBackups().then(setBackups, () => setBackups([]))
  }, [vault.info, vault.platform])
  const vaultHint = vault.info ? vault.info.path : "Nenhum cofre aberto"
  const notesHint = vault.loading ? "Lendo o cofre…" : vault.error ? `Erro: ${vault.error}` : vault.index ? `${vault.index.size} notas Markdown no índice` : "—"
  const lastBackup = backups[0]
  const [unused, setUnused] = useState<string[] | null>(null)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  async function findUnused() {
    const index = vault.index
    if (!index) return
    // Os quadros (.canvas) também usam anexos; o índice só guarda o texto das notas.
    const canvases = index.allFiles().filter((f) => f.path.toLowerCase().endsWith(".canvas")).map((f) => f.path)
    const texts = canvases.length ? Object.values(await vault.platform.readTexts(canvases)) : []
    setUnused(unusedAttachments(index, texts))
    setChosen(new Set())
  }
  async function trashChosen() {
    for (const path of chosen) await vault.trash(path)
    toast(`${chosen.size} ${chosen.size === 1 ? "anexo foi" : "anexos foram"} para a lixeira do cofre (.trash)`)
    setUnused((list) => list?.filter((path) => !chosen.has(path)) ?? null)
    setChosen(new Set())
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Tudo fica neste aparelho</span>
          <h1 className="page-title">Configurações</h1>
        </div>
      </div>
      <div className="settings-grid">
        <AppearanceSettings theme={theme} onTheme={onTheme} />
        <OnboardingSettings />
        <ImageFolderSettings />
        <CustomizationSettings />
        <DesktopTraySettings />
        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Vault size={16} /> Cofre
          </span>
          <Row title={vault.info?.name ?? "Pasta do cofre"} hint={vaultHint}>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={run(vault.choose)} disabled={!desktop || busy} title={desktop ? "Abrir um cofre que já existe" : "Disponível no app desktop"}>
                <FolderOpen size={14} /> Abrir pasta…
              </button>
              <button className="btn sm" onClick={run(vault.create)} disabled={!desktop || busy} title={desktop ? "Criar um cofre novo numa pasta vazia" : "Disponível no app desktop"}>
                <Plus size={14} /> Criar cofre
              </button>
            </div>
          </Row>
          <Row title="Notas" hint={notesHint}>
            <button className="btn sm" onClick={run(vault.reload)} disabled={!vault.info || busy}>
              <RefreshCw size={14} /> Reler
            </button>
          </Row>
          <Row title="Permitir gravação" hint={vault.info?.readOnly ? "Desligado: o app só lê este cofre. Ao ligar, ele faz um backup antes." : "Ligado: o app cria, edita, renomeia e manda notas para a lixeira (.trash)."}>
            <Switch on={Boolean(vault.info && !vault.info.readOnly)} label="Permitir gravação" onChange={(on) => run(() => vault.setWritable(on).then(() => vault.platform.listBackups().then(setBackups)))()} />
          </Row>
          <Row title="Backups" hint={lastBackup ? `Último: ${new Date(lastBackup.createdAt).toLocaleString("pt-BR")} · ${backups.length} guardado(s), até 15. Automático antes da 1ª gravação do dia.` : "Nenhum ainda. Feitos antes da 1ª gravação de cada dia (só o texto das notas, fora do cofre)."}>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={run(() => vault.platform.backup().then(() => vault.platform.listBackups().then(setBackups)).then(() => toast("Backup feito")))} disabled={!vault.info || busy}>
                <Archive size={14} /> Fazer agora
              </button>
              {desktop && (
                <button className="btn sm ghost" onClick={run(vault.platform.revealBackups)} disabled={!vault.info}>
                  Abrir pasta
                </button>
              )}
            </div>
          </Row>
          <Row title="Espaços" hint="Notas/, Agenda/, Wikis/, Campanhas/, Livros/, Mesas/">
            <span className="small muted">Pastas padrão do cofre</span>
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Network size={16} /> Compatibilidade com o Obsidian
          </span>
          <Row title="Formato de link novo" hint="Lido de .obsidian/app.json (mude no Obsidian, em Arquivos e links)">
            <span className="small">
              {{ shortest: "Mais curto possível", relative: "Relativo", absolute: "Caminho completo" }[vault.config.app.newLinkFormat]}
              {vault.config.app.useMarkdownLinks ? " · links em Markdown" : " · wikilinks"}
            </span>
          </Row>
          <Row title="Pasta dos demais anexos" hint="Áudios, vídeos e PDFs seguem a pasta de .obsidian/app.json. Imagens usam Anexos/Imagens.">
            <span className="small">{attachmentFolderLabel(vault.config.app.attachmentFolder)}</span>
          </Row>
          <Row title="Anexos sem uso" hint="Imagens, áudios, vídeos e PDFs que nenhuma nota nem quadro usa.">
            <button className="btn sm" disabled={!vault.index || busy} onClick={run(findUnused)}>
              Procurar
            </button>
          </Row>
          <Row title="Snippet runas-codex.css" hint="Faz callouts, colunas e capitulares aparecerem iguais no Obsidian. Depois de instalar, ligue em Obsidian › Aparência › Trechos de CSS.">
            <button
              className="btn sm"
              disabled={!desktop || !vault.info || vault.info.readOnly || busy}
              title={!desktop ? "Disponível no app desktop" : vault.info?.readOnly ? "Libere a gravação no cofre primeiro" : "Grava .obsidian/snippets/runas-codex.css"}
              onClick={run(() => vault.platform.installSnippet(snippetCss).then((path) => toast(`Snippet gravado em ${path}`)))}
            >
              Instalar
            </button>
          </Row>
          <Row title="Avisar quando um link resolveria diferente no Obsidian">
            <span className="small muted">Avisos no editor</span>
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Bell size={16} /> Agenda e lembretes
          </span>
          <Row title="Lembretes" hint="Configure cada lembrete no evento da Agenda. O app precisa continuar aberto ou na bandeja.">
            <a className="btn sm" href="#/agenda">Abrir Agenda</a>
          </Row>
          <Row title="Iniciar com o sistema (desktop)" hint="Necessário para lembrar com o app fechado">
            <span className="small muted">Em preparação para o lançamento</span>
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Network size={16} /> Sala do VTT
          </span>
          <Row title="Conexão dos jogadores" hint="Abra uma mesa e configure o acesso no painel Sala. O endereço e o código só existem com a sala aberta.">
            <a className="btn sm" href="#/vtt/criar">Abrir minhas mesas</a>
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <ShieldCheck size={16} /> Privacidade
          </span>
          <Row title="Telemetria" hint="Não existe. O app não chama a internet fora da sala.">
            <span className="chip green">desligada sempre</span>
          </Row>
          <UpdateRow />
          <PinRow />
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Keyboard size={16} /> Atalhos
          </span>
          {[
            ["Buscar / paleta de comandos", "Ctrl K"],
            ["Nova nota", "Ctrl N"],
            ["Alternar modo de edição", "Ctrl E"],
            ["Régua (VTT)", "R"],
            ["Selecionar (VTT)", "V"],
          ].map(([label, keys]) => (
            <Row key={label} title={label}>
              <kbd>{keys}</kbd>
            </Row>
          ))}
        </section>
      </div>
      {unused && (
        <Modal
          title="Anexos sem uso"
          onClose={() => setUnused(null)}
          footer={
            <>
              <button className="btn" onClick={() => setUnused(null)}>Fechar</button>
              <button className="btn danger" disabled={!chosen.size || busy || vault.info?.readOnly} title={vault.info?.readOnly ? "Libere a gravação no cofre primeiro" : undefined} onClick={run(trashChosen)}>
                Mandar {chosen.size || ""} para a lixeira
              </button>
            </>
          }
        >
          {unused.length === 0 ? (
            <p className="muted">Todos os anexos do cofre são usados por alguma nota ou quadro.</p>
          ) : (
            <>
              <p className="small muted" style={{ marginBottom: 8 }}>
                Nenhuma nota nem quadro cita estes arquivos. Os escolhidos vão para a lixeira do cofre (<code>.trash</code>), a mesma do Obsidian.
              </p>
              <label className="check" style={{ marginBottom: 6 }}>
                <input type="checkbox" checked={chosen.size === unused.length} onChange={(event) => setChosen(event.target.checked ? new Set(unused) : new Set())} /> Escolher todos ({unused.length})
              </label>
              {unused.map((path) => (
                <label key={path} className="check mono small">
                  <input
                    type="checkbox"
                    checked={chosen.has(path)}
                    onChange={(event) => setChosen((set) => { const next = new Set(set); if (event.target.checked) next.add(path); else next.delete(path); return next })}
                  />{" "}
                  {path}
                </label>
              ))}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

const formatBytes = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)

/**
 * "Verificar atualizações" (ADR 0017): o app só vai à internet quando você clica. Mostra a versão nova, baixa o
 * instalador deste sistema da release do GitHub, confere a soma SHA-256 e instala.
 */
function UpdateRow() {
  const vault = useVault()
  const toast = useToast()
  const platform = vault.platform
  const [version, setVersion] = useState("")
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [state, setState] = useState<"parado" | "verificando" | "baixando">("parado")
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    platform.appVersion?.().then(setVersion, () => setVersion(""))
  }, [platform])

  if (!platform.checkUpdate || !platform.installUpdate) {
    return (
      <Row title="Atualizações" hint="No navegador o app já é a versão publicada. No Android, baixe o APK novo na página de versões: github.com/Player07x/Runas-Codex/releases">
        <span className="small muted">—</span>
      </Row>
    )
  }
  const check = () => {
    setState("verificando")
    setError("")
    platform.checkUpdate!().then(setInfo, (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))).finally(() => setState("parado"))
  }
  const install = () => {
    setState("baixando")
    setError("")
    setProgress(null)
    platform.installUpdate!((received, total) => setProgress({ received, total })).then(
      (result) => {
        if (result === "instalador-aberto") toast("O instalador abriu. O Runas-Codex vai fechar para ele trocar os arquivos.")
        else if (result === "reiniciar") toast("Atualizado. O Runas-Codex está reiniciando.")
        else toast("O pacote abriu no instalador do sistema; conclua a instalação por lá e abra o app de novo.")
      },
      (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)),
    ).finally(() => setState("parado"))
  }
  const latest = info?.latest
  const hint = !info
    ? `Versão instalada: ${version || "…"}. O app só consulta a internet (as versões publicadas no GitHub) quando você clica.`
    : !info.newer
      ? `Você está na versão mais nova (${info.current}).`
      : `Versão ${latest!.version} disponível${latest!.publishedAt ? `, publicada em ${new Date(latest!.publishedAt).toLocaleDateString("pt-BR")}` : ""}. Instalada: ${info.current}.`
  return (
    <div className="setting-row" style={{ flexWrap: "wrap" }} data-updates>
      <div>
        <span className="small" style={{ fontWeight: 650 }}>Verificar atualizações</span>
        <span className="tiny faint">{hint}</span>
        {info?.newer && !info.asset && <span className="tiny" style={{ color: "var(--gold)" }}>Esta versão não tem instalador para este sistema.</span>}
        {state === "baixando" && <span className="tiny">{progress && progress.total > 0 && progress.received >= progress.total ? info?.asset?.name.endsWith(".deb") ? "Instalando… Confirme a autorização do sistema. O app reinicia após atualizar." : "Preparando a instalação…" : progress ? `Baixando ${formatBytes(progress.received)} de ${formatBytes(progress.total)}…` : "Baixando…"}</span>}
        {error && <span className="tiny" role="alert" style={{ color: "var(--red)" }}>{error}</span>}
        {info?.newer && latest?.notes && (
          <details className="tiny" style={{ marginTop: 4 }}>
            <summary>O que mudou</summary>
            <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", maxHeight: 180, overflow: "auto" }}>{latest.notes.slice(0, 2000)}</pre>
          </details>
        )}
      </div>
      <div className="row-wrap">
        <button className="btn sm" disabled={state !== "parado"} onClick={check}>
          {state === "verificando" ? "Verificando…" : "Verificar"}
        </button>
        {info?.newer && info.asset && (
          <button className="btn sm primary" disabled={state !== "parado"} onClick={install}>
            Baixar e instalar ({formatBytes(info.asset.size)})
          </button>
        )}
      </div>
    </div>
  )
}
