import type { ReactNode } from "react"
import { Bell, FolderOpen, Keyboard, Lock, Network, Palette, ShieldCheck, Vault } from "lucide-react"
import { Switch, useProtoAction, useToast } from "../components/ui"
import { useVault } from "../platform/VaultProvider"
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
  const chooseVault = () => vault.choose().catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
  const vaultHint = !desktop
    ? "Exemplo em memória — abrir uma pasta real só no app desktop"
    : vault.info
      ? vault.info.path
      : "Nenhum cofre aberto"
  const notesHint = vault.loading
    ? "Lendo o cofre…"
    : vault.error
      ? `Erro: ${vault.error}`
      : vault.notes
        ? `${vault.notes.length} notas Markdown lidas`
        : "Usando as notas de exemplo"
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
          <Row title="Pasta do cofre" hint={vaultHint}>
            <button className="btn sm" onClick={chooseVault} disabled={!desktop} title={desktop ? "Escolher a pasta do cofre" : "Disponível no app desktop"}>
              <FolderOpen size={14} /> {vault.info && desktop ? "Trocar" : "Abrir pasta…"}
            </button>
          </Row>
          <Row title="Notas" hint={notesHint}>
            <span className="tiny faint">{vault.info?.name ?? "—"}</span>
          </Row>
          <Row title="Somente leitura" hint="Até a etapa 3a o app só lê o cofre: nenhum arquivo é criado ou alterado">
            <Switch on label="Somente leitura" />
          </Row>
          <Row title="Espaços" hint="Notas/, Agenda/, Wikis/, Campanhas/, Livros/, Mesas/">
            <button className="btn sm" onClick={proto("renomear pastas dos espaços")}>Ajustar</button>
          </Row>
          <Row title="Backup automático" hint="Snapshots locais, guarda os 15 últimos">
            <select className="select" defaultValue="diario">
              <option value="hora">A cada hora</option>
              <option value="diario">Todo dia</option>
              <option value="semanal">Toda semana</option>
            </select>
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
