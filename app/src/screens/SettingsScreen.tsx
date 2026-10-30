import { flushOpenNotes } from "../lib/vault-notes"
import { ImageFolderSettings } from "../components/vault/NoteImages"
import { AccessibilitySettings, AppearanceSettings } from "../components/Appearance"
import { HelpScreen } from "./HelpScreen"
import { DesktopTraySettings } from "../platform/DesktopTray"
import { useEffect, useState, type ReactNode } from "react"
import { Accessibility, Archive, Bell, ChevronLeft, CircleHelp, Dices, FileWarning, FolderOpen, Keyboard, Network, Palette, Plus, RefreshCw, ShieldCheck, Vault } from "lucide-react"
import { useNarrow } from "../components/editor/use-narrow"
import { Modal, Switch, useToast } from "../components/ui"
import { attachmentFolderLabel, unusedAttachments } from "../core/attachments"
import { useVault } from "../platform/VaultProvider"
import type { UpdateInfo } from "../core/updates"
import snippetCss from "../markdown/runas-codex.css?raw"
import { PinRow } from "../components/vault/PinSettings"
import { BackupSettings } from "../components/vault/BackupSettings"
import { SyncConflictSettings } from "../components/vault/SyncConflicts"
import { ShortcutSettings, SnippetSettings } from "../components/vault/Customization"
import { TasksSettingsCard } from "../components/tasks/TasksSettings"
import { useRoute } from "../lib/router"
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

function SettingsCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card">
      <span className="section-title row settings-card-head">
        {icon} {title}
      </span>
      {children}
    </section>
  )
}

export function SettingsScreen({ theme, onTheme }: { theme: string; onTheme: (theme: string) => void }) {
  const toast = useToast()
  const vault = useVault()
  // /config/<seção> (Ctrl K › “Acessibilidade” leva a /config/acessibilidade) abre e foca a seção.
  const section = useRoute()[1]
  const desktop = vault.platform.kind !== "memory"
  const [busy, setBusy] = useState(false)
  const run = (action: () => Promise<unknown>) => () => {
    setBusy(true)
    action()
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }
  const vaultHint = vault.info
    ? vault.platform.kind === "capacitor" && vault.info.path.startsWith("content://")
      ? "Pasta escolhida no aplicativo de arquivos. Mudanças externas são relidas ao voltar para o app."
      : vault.info.path
    : "Nenhum cofre aberto"
  const notesHint = vault.loading ? "Lendo o cofre…" : vault.error ? `Erro: ${vault.error}` : vault.index ? `${vault.index.size} notas Markdown no índice` : "—"
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
  const sections: { id: string; title: string; icon: ReactNode; body: ReactNode }[] = [
    { id: "cofre", title: "Cofre", icon: <Vault size={16} />, body: (
      <SettingsCard icon={<Vault size={16} />} title="Cofre">
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
          <Switch on={Boolean(vault.info && !vault.info.readOnly)} label="Permitir gravação" onChange={(on) => run(() => vault.setWritable(on))()} />
        </Row>
        <Row title="Espaços" hint="Notas/, Agenda/, Wikis/, Campanhas/, Livros/, Mesas/">
          <span className="small muted">Pastas padrão do cofre</span>
        </Row>
      </SettingsCard>
    ) },
    { id: "backups", title: "Backups", icon: <Archive size={16} />, body: <BackupSettings /> },
    { id: "conflitos", title: "Conflitos de sincronização", icon: <FileWarning size={16} />, body: <SyncConflictSettings /> },
    { id: "obsidian", title: "Obsidian e anexos", icon: <Network size={16} />, body: (
      <>
        <SettingsCard icon={<Network size={16} />} title="Compatibilidade com o Obsidian">
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
          <Row title="Snippet runas-codex.css" hint="Faz callouts, colunas, capitulares e as cores de campanhas e categorias aparecerem iguais no Obsidian. Depois de instalar, ligue em Obsidian › Aparência › Trechos de CSS.">
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
        </SettingsCard>
        <ImageFolderSettings />
      </>
    ) },
    { id: "aparencia", title: "Aparência", icon: <Palette size={16} />, body: <AppearanceSettings theme={theme} onTheme={onTheme} /> },
    { id: "acessibilidade", title: "Acessibilidade", icon: <Accessibility size={16} />, body: <AccessibilitySettings routeFocus={false} /> },
    { id: "editor", title: "Editor e atalhos", icon: <Keyboard size={16} />, body: (
      <>
        {vault.platform.kind !== "capacitor" && <ShortcutSettings />}
        <SnippetSettings />
      </>
    ) },
    { id: "agenda", title: "Agenda e tarefas", icon: <Bell size={16} />, body: (
      <>
        <SettingsCard icon={<Bell size={16} />} title="Agenda e lembretes">
          <Row title="Lembretes" hint="Configure cada lembrete no evento da Agenda. O app precisa continuar aberto ou na bandeja.">
            <a className="btn sm" href="#/agenda">Abrir Agenda</a>
          </Row>
          <Row title="Iniciar com o sistema (desktop)" hint="Necessário para lembrar com o app fechado">
            <span className="small muted">Em preparação para o lançamento</span>
          </Row>
          <DesktopTraySettings />
        </SettingsCard>
        <TasksSettingsCard />
      </>
    ) },
    { id: "vtt", title: "Sala do VTT", icon: <Dices size={16} />, body: (
      <SettingsCard icon={<Dices size={16} />} title="Sala do VTT">
        <Row title="Conexão dos jogadores" hint="Abra uma mesa e configure o acesso no painel Sala. O endereço e o código só existem com a sala aberta.">
          <a className="btn sm" href="#/vtt/criar">Abrir minhas mesas</a>
        </Row>
      </SettingsCard>
    ) },
    { id: "privacidade", title: "Privacidade e atualizações", icon: <ShieldCheck size={16} />, body: (
      <SettingsCard icon={<ShieldCheck size={16} />} title="Privacidade e atualizações">
        <Row title="Telemetria" hint="Não existe. O app não chama a internet fora da sala.">
          <span className="chip green">desligada sempre</span>
        </Row>
        <UpdateRow />
        <PinRow />
      </SettingsCard>
    ) },
    { id: "ajuda", title: "Ajuda e exemplos", icon: <CircleHelp size={16} />, body: <HelpScreen /> },
  ]
  // Cada seção é uma página: /config/<seção> mostra só ela. No computador o índice fica ao lado e /config abre a
  // primeira seção; no celular /config é a lista de seções e a seção tem o caminho de volta.
  const narrow = useNarrow()
  const asked = sections.some((item) => item.id === section) ? section : undefined
  const current = asked ?? (narrow ? undefined : sections[0]!.id)
  useEffect(() => {
    if (asked) document.getElementById(`config-${asked}`)?.scrollIntoView({ block: "start" })
  }, [asked])
  return (
    <div className={`page settings-page${current ? " has-current" : ""}`}>
      <div className="page-head">
        <div>
          <span className="eyebrow">Tudo fica neste aparelho, menos o que é do cofre</span>
          <h1 className="page-title">Configurações</h1>
        </div>
      </div>
      <div className="settings-layout">
        <nav className="settings-index" aria-label="Seções das Configurações">
          {sections.map((item) => (
            <a key={item.id} href={`#/config/${item.id}`} aria-current={item.id === current ? "true" : undefined}>
              {item.icon}
              <span>{item.title}</span>
            </a>
          ))}
        </nav>
        <div className="settings-sections">
          {current && <a className="settings-back" href="#/config"><ChevronLeft size={16} /> Configurações</a>}
          {sections.map((item) => (
            <section key={item.id} id={`config-${item.id}`} className={`settings-section${item.id === current ? " is-current" : ""}`} aria-label={item.title} tabIndex={-1} data-route-focus={item.id === current || undefined}>
              {item.body}
            </section>
          ))}
        </div>
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
      <Row title="Atualizações" hint="No navegador o app já é a versão publicada.">
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
    flushOpenNotes().then(() => platform.installUpdate!((received, total) => setProgress({ received, total }))).then(
      (result) => {
        if (result === "instalador-aberto") toast("O instalador abriu. O Runas-Codex vai fechar para ele trocar os arquivos.")
        else if (result === "reiniciar") toast("Atualizado. O Runas-Codex está reiniciando.")
        else toast("O instalador do sistema abriu. Confirme a atualização por lá; cancelar mantém o app atual.")
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
