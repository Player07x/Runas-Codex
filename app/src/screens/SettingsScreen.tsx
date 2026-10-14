import { useEffect, useState, type ReactNode } from "react"
import { Archive, Bell, FolderOpen, Keyboard, Lock, Network, Palette, Plus, RefreshCw, ShieldCheck, Vault } from "lucide-react"
import { Switch, useProtoAction, useToast } from "../components/ui"
import { useVault } from "../platform/VaultProvider"
import type { BackupInfo } from "../platform/platform"
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
  const proto = useProtoAction()
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
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Tudo fica neste aparelho</span>
          <h1 className="page-title">Configurações</h1>
        </div>
      </div>
      <div className="settings-grid">
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
            <button className="btn sm" onClick={proto("renomear pastas dos espaços")}>Ajustar</button>
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Network size={16} /> Compatibilidade com o Obsidian
          </span>
          <Row title="Formato de link novo" hint="Lido de .obsidian/app.json">
            <select className="select" defaultValue="curto">
              <option value="curto">Mais curto possível</option>
              <option value="relativo">Relativo</option>
              <option value="absoluto">Caminho completo</option>
            </select>
          </Row>
          <Row title="Pasta de anexos" hint="Lida de .obsidian/app.json">
            <input className="input mono small" defaultValue="./Anexos" />
          </Row>
          <Row title="Instalar snippet runas-codex.css" hint="Faz callouts, colunas e capitulares aparecerem iguais no Obsidian">
            <Switch on label="Snippet" />
          </Row>
          <Row title="Avisar quando um link resolveria diferente no Obsidian">
            <Switch on label="Aviso de link" />
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Palette size={16} /> Aparência
          </span>
          <Row title="Tema">
            <select className="select" value={theme} onChange={(e) => onTheme(e.target.value)}>
              <option value="dark">Escuro (Livro Vermelho)</option>
              <option value="light">Claro (papel)</option>
            </select>
          </Row>
          <Row title="Tamanho do texto">
            <input type="range" defaultValue={50} style={{ accentColor: "var(--cyan)" }} />
          </Row>
          <Row title="Idioma">
            <select className="select">
              <option>Português (Brasil)</option>
              <option>English</option>
            </select>
          </Row>
          <Row title="Reduzir animações">
            <Switch on={false} label="Reduzir animações" />
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Bell size={16} /> Agenda e lembretes
          </span>
          <Row title="Notificações" hint="Android: notificação local · Desktop: bandeja">
            <Switch on label="Notificações" />
          </Row>
          <Row title="Iniciar com o sistema (desktop)" hint="Necessário para lembrar com o app fechado">
            <Switch on={false} label="Iniciar com o sistema" />
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <Network size={16} /> Sala do VTT
          </span>
          <Row title="Porta na rede local">
            <input className="input mono small" defaultValue="30000" style={{ width: 100, minWidth: 0 }} />
          </Row>
          <Row title="Túnel para a internet" hint="Baixado e verificado só quando você ligar">
            <select className="select">
              <option>Cloudflare (padrão)</option>
              <option>Porta 443 (redes restritas)</option>
            </select>
          </Row>
        </section>

        <section className="card">
          <span className="section-title row" style={{ marginBottom: 8 }}>
            <ShieldCheck size={16} /> Privacidade
          </span>
          <Row title="Telemetria" hint="Não existe. O app não chama a internet fora da sala.">
            <span className="chip green">desligada sempre</span>
          </Row>
          <Row title="Verificar atualizações" hint="Só quando você pedir">
            <button className="btn sm" onClick={proto("abriria a página de versões")}>Verificar</button>
          </Row>
          <Row title="Bloquear o espaço Notas com PIN" hint="Impede abrir no app; não criptografa os arquivos">
            <button className="btn sm" onClick={proto("definir PIN")}>
              <Lock size={14} /> Definir
            </button>
          </Row>
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
    </div>
  )
}
