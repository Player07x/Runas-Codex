/** Catálogo de formatadores (seção E.1 da checklist) com a sintaxe do dialeto aprovado. */
export interface Formatter {
  label: string
  syntax: string
}

export const FORMATTER_GROUPS: { title: string; items: Formatter[] }[] = [
  {
    title: "Texto",
    items: [
      { label: "Negrito", syntax: "**texto**" },
      { label: "Itálico", syntax: "*texto*" },
      { label: "Negrito + itálico", syntax: "***texto***" },
      { label: "Tachado", syntax: "~~texto~~" },
      { label: "Destaque", syntax: "==texto==" },
      { label: "Sublinhado", syntax: "<u>texto</u>" },
      { label: "Sobrescrito", syntax: "x<sup>2</sup>" },
      { label: "Subscrito", syntax: "H<sub>2</sub>O" },
      { label: "Versalete", syntax: '<span style="font-variant: small-caps">texto</span>' },
      { label: "Código inline", syntax: "`código`" },
      { label: "Teclas", syntax: "<kbd>Ctrl</kbd>" },
      { label: "Comentário oculto", syntax: "%%texto%%" },
      { label: "Emoji", syntax: ":espada:" },
      { label: "Abreviação", syntax: '<abbr title="Mestre do Jogo">MJ</abbr>' },
    ],
  },
  {
    title: "Fonte e cor",
    items: [
      { label: "Família de fonte", syntax: "<span style=\"font-family: 'Cinzel'\">texto</span>" },
      { label: "Tamanho", syntax: '<span style="font-size: 1.3em">texto</span>' },
      { label: "Cor do texto", syntax: '<span style="color: #8b1e1e">texto</span>' },
      { label: "Realce colorido", syntax: '<span style="background: #b99b6555">texto</span>' },
      { label: "Capitular", syntax: '<span class="capitular">O</span>' },
    ],
  },
  {
    title: "Parágrafo",
    items: [
      { label: "Título H1", syntax: "# Título" },
      { label: "Título H2", syntax: "## Título" },
      { label: "Título H3", syntax: "### Título" },
      { label: "Título H4", syntax: "#### Título" },
      { label: "Título H5", syntax: "##### Título" },
      { label: "Título H6", syntax: "###### Título" },
      { label: "Alinhar à esquerda/centro/direita", syntax: '<p align="center">texto</p>' },
      { label: "Justificar", syntax: '<p align="justify">texto</p>' },
      { label: "Citação (aninhada)", syntax: "> texto\n>> texto" },
      { label: "Lista", syntax: "- item\n  - aninhado" },
      { label: "Lista numerada", syntax: "1. item" },
      { label: "Lista de tarefas", syntax: "- [ ] tarefa" },
      { label: "Lista de definição", syntax: "Termo\n: definição" },
      { label: "Linha horizontal", syntax: "---" },
      { label: "Separador decorativo", syntax: '<hr class="ornamento">' },
      { label: "Quebra de linha", syntax: "texto\\" },
      { label: "Atributos / classe", syntax: "{.classe}" },
      { label: "Contêiner nomeado", syntax: "::: nome\n…\n:::" },
    ],
  },
  {
    title: "Blocos",
    items: [
      { label: "Callout", syntax: "> [!nota] Título" },
      { label: "Callout que dobra", syntax: "> [!aviso]- Título" },
      { label: "Leia em voz alta", syntax: "> [!descritivo]" },
      { label: "Barra lateral", syntax: "> [!barra-lateral]" },
      { label: "Statblock", syntax: "> [!statblock] Nome" },
      { label: "Segredo do mestre", syntax: "> [!segredo]" },
      { label: "Bloco de código", syntax: "```ts\n…\n```" },
      { label: "Seção recolhível", syntax: "<details><summary>…</summary>…</details>" },
      { label: "Fórmula LaTeX", syntax: "$$ … $$" },
      { label: "Diagrama Mermaid", syntax: "```mermaid\ngraph LR\n  A --> B\n```" },
    ],
  },
  {
    title: "Inserir",
    items: [
      { label: "Tabela (com alinhamento)", syntax: "| a | b |\n|:--|--:|\n| A | B |" },
      { label: "Tabela com células mescladas", syntax: "<table><tr><th colspan=\"2\">Título</th></tr><tr><td>A</td><td>B</td></tr></table>" },
      { label: "Imagem com tamanho", syntax: "![[mapa.png|400]]" },
      { label: "Legenda de imagem", syntax: '<figure><img src="runa.png" alt="Runa"><figcaption>Legenda</figcaption></figure>' },
      { label: "Imagem flutuante", syntax: '<img class="flutuar-direita" src="runa.png" alt="Runa">' },
      { label: "Link para nota", syntax: "[[Nota|apelido]]" },
      { label: "Transclusão", syntax: "![[Nota#Seção]]" },
      { label: "Nota de rodapé", syntax: "texto[^1]\n[^1]: nota" },
      { label: "Rolagem", syntax: "`dice: 2d6+3`" },
      { label: "Link com título", syntax: '[texto](https://example.com "Título")' },
      { label: "Imagem com título", syntax: '![Runa](runa.png "Título")' },
      { label: "Autolink", syntax: "<https://example.com>" },
      { label: "Escapes", syntax: "\\*texto\\*" },
      { label: "Rodapé inline", syntax: "^[Texto da nota]" },
      { label: "Matemática inline", syntax: "$x^2$" },
      { label: "Alinhar à esquerda", syntax: '<p align="left">texto</p>' },
      { label: "Alinhar à direita", syntax: '<p align="right">texto</p>' },
      { label: "Tabela listrada", syntax: "| A | B |\n|---|---|\n| 1 | 2 |\n\n{.listrada}" },
      { label: "Tabela compacta", syntax: "| A | B |\n|---|---|\n| 1 | 2 |\n\n{.compacta}" },
      { label: "Tabela destaque", syntax: "| A | B |\n|---|---|\n| 1 | 2 |\n\n{.destaque}" },
      { label: "Imagem sangrando", syntax: '<img class="sangrar" src="runa.png" alt="Runa">' },
      { label: "Imagem à esquerda", syntax: '<img class="flutuar-esquerda" src="runa.png" alt="Runa">' },
      { label: "Três colunas", syntax: "<div style=\"column-count: 3\">Texto das colunas.</div>" },
      { label: "Tag", syntax: "#tag/aninhada" },
    ],
  },
  {
    title: "Livro",
    items: [
      ...([1, 2, 3, 4] as const).map(count => ({ label: `Colunas automáticas: ${count}`, syntax: `\n::: runas-colunas-${count}\n\nEscreva aqui. O conteúdo flui automaticamente pelas colunas.\n\n:::\n` })),
      { label: "Duas colunas manuais", syntax: "> [!colunas]\n> Primeira coluna.\n> <div class=\"quebra-coluna\"></div>\n> Segunda coluna." },
      { label: "Quebra de coluna", syntax: '<div class="quebra-coluna"></div>' },
      { label: "Quebra de página", syntax: '<div class="quebra-pagina"></div>' },
      { label: "Bloco largo", syntax: "> [!largo]" },
      { label: "Sumário automático", syntax: "```table-of-contents\n```" },
    ],
  },
]

export interface FormatterEntry extends Formatter { group: string }

/** Todos os formatadores numa lista só, com o grupo de cada um (galeria, menu `/` e busca). */
export const FORMATTERS: FormatterEntry[] = FORMATTER_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })))

/** Para buscar sem acento e sem caixa: “italico” acha “Itálico”. */
export const foldSearch = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")

/** Formatadores cujo nome ou grupo contém a busca; os que começam pela busca vêm antes. */
export function searchFormatters(query: string, list: readonly FormatterEntry[] = FORMATTERS): FormatterEntry[] {
  const q = foldSearch(query.trim())
  if (!q) return [...list]
  const hits = list.filter((item) => foldSearch(item.label).includes(q) || foldSearch(item.group).includes(q))
  const starts = (item: FormatterEntry) => (foldSearch(item.label).startsWith(q) ? 0 : 1)
  return hits.sort((a, b) => starts(a) - starts(b))
}

/** Item do menu `/`: insere um texto ou pede uma ação do editor (abrir a galeria, escolher imagem ou modelo). */
export type SlashItem =
  | { kind: "insert"; label: string; detail: string; insert: string; block: boolean }
  | { kind: "action"; label: string; detail: string; action: "format" | "image" | "template" | "link" | "date" }

/** Formatadores que viram bloco próprio (título, lista, caixa, tabela…) entram numa linha só deles. */
export const isBlockSyntax = (syntax: string) => /^(#{1,6} |> |- |\d+\. |\||```|:::|<(div|table|figure|details|p|hr)\b|\$\$|---$)/.test(syntax.trimStart()) || syntax.startsWith("\n")

/**
 * O menu `/` do editor: primeiro as ações (galeria, imagem, modelo, link, data) e os comandos que já existiam, depois o
 * catálogo inteiro de formatadores, filtrado pelo que se digita depois da barra.
 */
export function slashItems(query: string, commands: readonly { label: string; detail: string; insert: string }[], extra: readonly FormatterEntry[] = []): SlashItem[] {
  const actions: SlashItem[] = [
    { kind: "action", label: "Formatar…", detail: "Todos os formatadores, com busca", action: "format" },
    { kind: "action", label: "Imagem…", detail: "Escolher imagens do computador", action: "image" },
    { kind: "action", label: "Modelo…", detail: "Inserir um modelo do cofre", action: "template" },
    { kind: "action", label: "Link…", detail: "Ligar outra nota", action: "link" },
    { kind: "action", label: "Data de hoje", detail: "AAAA-MM-DD", action: "date" },
  ]
  const legacy: SlashItem[] = commands.filter((c) => !["link", "imagem", "data"].includes(c.label)).map((c) => ({ kind: "insert", label: c.label.charAt(0).toLocaleUpperCase("pt-BR") + c.label.slice(1), detail: c.detail, insert: c.insert, block: true }))
  // Os do espaço (a aba Wiki, por exemplo) vêm antes do catálogo geral.
  const formatters: SlashItem[] = [...extra, ...FORMATTERS].map((f) => ({ kind: "insert", label: f.label, detail: f.group, insert: f.syntax, block: isBlockSyntax(f.syntax) }))
  const q = foldSearch(query.trim())
  const all = [...actions, ...legacy, ...formatters]
  if (!q) return all
  const hits = all.filter((item) => foldSearch(item.label).includes(q) || foldSearch(item.detail).includes(q))
  const starts = (item: SlashItem) => (foldSearch(item.label).startsWith(q) ? 0 : 1)
  return hits.sort((a, b) => starts(a) - starts(b))
}
