/**
 * Ajuda offline (T5): a documentação do app em tópicos, cada um um texto Markdown em `data/ajuda/` desenhado pelo leitor
 * compartilhado (os exemplos aparecem como ficam numa nota). Aqui ficam só a lista dos tópicos e a busca, sem React;
 * os textos são carregados com a tela de ajuda.
 */

export interface HelpTopic {
  id: string
  title: string
  group: HelpGroup
  /** Uma frase: o que o tópico explica (aparece no índice e na busca). */
  summary: string
}

export const HELP_GROUPS = ["Começar", "Escrever", "Espaços", "Mesa e jogo", "Arquivos e sistema"] as const
export type HelpGroup = (typeof HELP_GROUPS)[number]

export const HELP_TOPICS: HelpTopic[] = [
  { id: "comecar", title: "Primeiros passos", group: "Começar", summary: "O que é o Runas-Codex, os espaços, a barra de navegação, a busca Ctrl K e o botão Novo." },
  { id: "cofre", title: "Cofre, arquivos e segurança", group: "Começar", summary: "Onde ficam as notas, somente leitura, gravação segura, lixeira, histórico, backups e conflitos de sincronização." },
  { id: "celular", title: "No celular e no tablet", group: "Começar", summary: "Barra inferior, captura rápida, compartilhar com o app, widget, PIN e o cofre no Android." },
  { id: "editor", title: "O editor de notas", group: "Escrever", summary: "Leitura, Editar e Código, a barra da nota, o menu /, a galeria Formatar, imagens, links e o corretor." },
  { id: "formatadores", title: "Todos os formatadores", group: "Escrever", summary: "Cada formatador do catálogo com a sintaxe, para que serve e como aparece." },
  { id: "fichas", title: "Fichas e caixas (callouts)", group: "Escrever", summary: "Callouts, segredos, statblock e as fichas de magia, runa, habilidade, item, criatura, raça, classe e efeito." },
  { id: "blocos", title: "Blocos especiais", group: "Escrever", summary: "Calendário, mapa, tabela rolável, idioma, encontro, tarefas, consultas, diagramas, sumário, colunas e dados." },
  { id: "notas", title: "Notas", group: "Espaços", summary: "Árvore, abas, favoritos, busca com operadores, propriedades, modelos, nota do dia, gráfico, quadros, bases e consultas." },
  { id: "agenda", title: "Agenda", group: "Espaços", summary: "Mês, semana, dia e lista, eventos, recorrência, lembretes, sessões, .ics e enquete de data." },
  { id: "tarefas", title: "Tarefas (formato Tasks)", group: "Espaços", summary: "Caixas de tarefa com datas, prioridade e recorrência, consultas tasks e o tempo livre." },
  { id: "wiki", title: "Wiki: artigos e categorias", group: "Espaços", summary: "Página inicial, tipos de artigo, ficha, categorias novas, filtros, relações, segredos e a visão dos jogadores." },
  { id: "wiki-tempo", title: "Wiki: calendários e linha do tempo", group: "Espaços", summary: "Calendários do mundo, datas com sigla, hoje no mundo, sincronizar calendários e a linha do tempo." },
  { id: "wiki-mapas", title: "Wiki: mapas, relações e ferramentas", group: "Espaços", summary: "Mapas com pinos e camadas, árvore genealógica, organograma, teia diplomática, geradores, tabelas e idiomas." },
  { id: "campanhas", title: "Campanhas", group: "Espaços", summary: "Painel, sessões, missões, elenco, quadro, ferramentas, Tela do Mestre e personalização." },
  { id: "livros", title: "Livros", group: "Espaços", summary: "Livro e capítulos, Escrever, Organizar e Diagramar, estilo do livro, capa, fichas no papel e exportações." },
  { id: "vtt", title: "VTT: mesas e sala", group: "Mesa e jogo", summary: "Mesas, cenas, tokens, ferramentas do mapa, áudio, registro, dados, a sala dos jogadores e o mestre pelo celular." },
  { id: "transferir", title: "Importar e exportar", group: "Arquivos e sistema", summary: "Pacote para outro aparelho, ZIP para o Obsidian, documentos e sites, importadores e mesas." },
  { id: "obsidian", title: "Compatibilidade com o Obsidian", group: "Arquivos e sistema", summary: "O mesmo cofre nos dois apps, o snippet runas-codex.css, propriedades e plugins de RPG." },
  { id: "configuracoes", title: "Configurações", group: "Arquivos e sistema", summary: "O que cada seção das Configurações faz." },
  { id: "acessibilidade", title: "Acessibilidade e aparência", group: "Arquivos e sistema", summary: "Tema, tamanho do texto, fonte para leitura, contraste alto, movimento, foco e navegação por teclado." },
  { id: "atalhos", title: "Atalhos de teclado", group: "Arquivos e sistema", summary: "Todos os atalhos do app e do editor." },
  { id: "privacidade", title: "Privacidade e atualizações", group: "Arquivos e sistema", summary: "Sem telemetria, o que usa a rede e como atualizar o app." },
]

export const helpTopic = (id: string | undefined): HelpTopic | undefined => HELP_TOPICS.find((topic) => topic.id === id)

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")

/** Texto sem a marcação mais comum, para a busca e os trechos (não precisa ser um Markdown perfeito). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, alias?: string) => alias ?? target)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^>\s?\[![^\]]+\][-+]?/gm, "")
    .replace(/[*_`#>|=~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Títulos `###` de um tópico (o “Nesta página”). */
export function helpHeadings(markdown: string): string[] {
  const out: string[] = []
  let fence = false
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const match = !fence && /^###\s+(.+?)\s*#*\s*$/.exec(line)
    if (match) out.push(plainText(match[1]!))
  }
  return out
}

export interface HelpHit { topic: HelpTopic; snippet: string; score: number }

/**
 * Busca sem acento e sem caixa em título, resumo e texto. Todas as palavras precisam aparecer; título vale mais que o
 * resumo, que vale mais que o texto. O trecho mostra a primeira ocorrência no texto.
 */
export function searchHelp(query: string, bodies: Readonly<Record<string, string>>, topics: readonly HelpTopic[] = HELP_TOPICS): HelpHit[] {
  const words = fold(query).split(/\s+/).filter((word) => word.length > 1)
  if (!words.length) return []
  const hits: HelpHit[] = []
  for (const topic of topics) {
    const body = plainText(bodies[topic.id] ?? "")
    const title = fold(topic.title), summary = fold(topic.summary), text = fold(body)
    if (!words.every((word) => title.includes(word) || summary.includes(word) || text.includes(word))) continue
    const score = words.reduce((sum, word) => sum + (title.includes(word) ? 10 : 0) + (summary.includes(word) ? 4 : 0) + Math.min(5, text.split(word).length - 1), 0)
    const at = text.indexOf(words[0]!)
    const start = Math.max(0, at - 60)
    const snippet = at < 0 ? topic.summary : `${start > 0 ? "…" : ""}${body.slice(start, at + 140).trim()}${at + 140 < body.length ? "…" : ""}`
    hits.push({ topic, snippet, score })
  }
  return hits.sort((a, b) => b.score - a.score || HELP_TOPICS.indexOf(a.topic) - HELP_TOPICS.indexOf(b.topic))
}
