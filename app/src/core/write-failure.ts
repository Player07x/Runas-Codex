/**
 * Por que uma gravação falhou, em português e com o passo a passo (U91). O erro chega do sistema como texto (o código
 * do Node, como `EPERM`, vem no meio da mensagem do IPC; o Android manda a mensagem da exceção), então a leitura é pelo
 * texto. No Windows, `EPERM`/`EACCES` ao gravar quase sempre é o Acesso controlado a pastas ou um antivírus.
 */
export type WriteFailureKind = "seguranca" | "em-uso" | "sem-espaco" | "sem-permissao" | "somente-leitura" | "pasta-sumiu" | "outro"
export type WriteSystem = "windows" | "android" | "outro"

export interface WriteFailure {
  kind: WriteFailureKind
  title: string
  steps: string[]
  /** Mostra o botão que abre a Proteção contra ransomware do Windows (endereço local, sem rede). */
  windowsProtection: boolean
}

/** Último passo de todo aviso de gravação de nota; o “Testar gravação” não grava nota e o deixa de fora. */
export const KEEP_STEP = "O texto está guardado neste aparelho e o app tenta gravar de novo sozinho."
const KEEP = KEEP_STEP

export function writeFailure(message: string, system: WriteSystem): WriteFailure {
  const text = message.toLowerCase()
  if (/\benospc\b|no space|not enough space|espaço insuficiente|sem espaço|disk full/.test(text))
    return { kind: "sem-espaco", title: "Não há espaço para gravar", steps: ["Libere espaço no disco ou no cartão onde fica o cofre.", KEEP], windowsProtection: false }
  if (/\berofs\b|read-only file system|somente leitura|somente-leitura/.test(text))
    return { kind: "somente-leitura", title: "A pasta do cofre está só para leitura", steps: ["Confira se o disco, o pendrive ou o cartão não está travado contra gravação.", KEEP], windowsProtection: false }
  if (/\bebusy\b|\bemfile\b|resource busy|being used by another process|em uso/.test(text))
    return { kind: "em-uso", title: "O arquivo está em uso por outro programa", steps: ["Espere a verificação do antivírus ou a sincronização terminar, ou feche o programa que abriu a nota.", KEEP], windowsProtection: false }
  if (/\beperm\b|\beacces\b|access is denied|access denied|operation not permitted|permission denied|securityexception|sem permissão|permissão negada/.test(text)) {
    if (system === "windows") return {
      kind: "seguranca",
      title: "O Windows bloqueou a gravação",
      steps: [
        "Abra a Segurança do Windows › Proteção contra vírus e ameaças › Proteção contra ransomware › Acesso controlado a pastas.",
        "Em “Permitir um app pelo Acesso controlado a pastas”, adicione o Runas-Codex.",
        "Se você usa outro antivírus, libere o Runas-Codex nele também.",
        "Ou mova o cofre para uma pasta fora de Documentos, Área de trabalho e Imagens (por exemplo, C:\\Runas) e abra-o de novo.",
        KEEP,
      ],
      windowsProtection: true,
    }
    if (system === "android") return {
      kind: "sem-permissao",
      title: "O Android tirou a permissão da pasta do cofre",
      steps: ["Em Configurações › Cofre, escolha a pasta do cofre de novo para devolver a permissão.", "Apps de limpeza ou de segurança podem tirar essa permissão: libere o Runas-Codex neles.", KEEP],
      windowsProtection: false,
    }
    return { kind: "sem-permissao", title: "Sem permissão para gravar na pasta do cofre", steps: ["Confira se o seu usuário pode gravar na pasta do cofre.", KEEP], windowsProtection: false }
  }
  if (/\benoent\b|no such file|não encontrad/.test(text))
    return { kind: "pasta-sumiu", title: "A pasta do cofre não foi encontrada", steps: ["Reconecte o disco ou o cartão, ou abra o cofre de novo em Configurações › Cofre.", KEEP], windowsProtection: false }
  return { kind: "outro", title: "Não deu para gravar", steps: [KEEP], windowsProtection: false }
}

/** Espera até a próxima tentativa automática: rápida no começo, depois uma vez por minuto. */
export function retryDelay(attempt: number): number {
  return [5_000, 15_000, 30_000][attempt] ?? 60_000
}
