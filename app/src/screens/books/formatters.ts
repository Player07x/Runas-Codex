/** Catálogo de formatadores (seção E.1 da checklist) com a sintaxe proposta no plano. */
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
      { label: "Títulos H1–H6", syntax: "# … ######" },
      { label: "Alinhar à esquerda/centro/direita", syntax: '<p align="center">texto</p>' },
      { label: "Justificar", syntax: '<p align="justify">texto</p>' },
      { label: "Citação (aninhada)", syntax: "> texto\n>> texto" },
      { label: "Lista", syntax: "- item\n  - aninhado" },
      { label: "Lista numerada", syntax: "1. item" },
      { label: "Lista de tarefas", syntax: "- [ ] tarefa" },
      { label: "Lista de definição", syntax: "Termo\n: definição" },
      { label: "Linha horizontal", syntax: "---" },
      { label: "Separador decorativo", syntax: '<div class="separador"></div>' },
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
      { label: "Diagrama Mermaid", syntax: "```mermaid" },
    ],
  },
  {
    title: "Inserir",
    items: [
      { label: "Tabela (com alinhamento)", syntax: "| a | b |\n|:--|--:|" },
      { label: "Tabela com células mescladas", syntax: "<table>…colspan…</table>" },
      { label: "Imagem com tamanho", syntax: "![[mapa.png|400]]" },
      { label: "Legenda de imagem", syntax: '<figure>…<figcaption>…</figcaption></figure>' },
      { label: "Imagem flutuante", syntax: '<img class="flutua-direita" …>' },
      { label: "Link para nota", syntax: "[[Nota|apelido]]" },
      { label: "Transclusão", syntax: "![[Nota#Seção]]" },
      { label: "Nota de rodapé", syntax: "texto[^1]\n[^1]: nota" },
      { label: "Rolagem", syntax: "`dice: 2d6+3`" },
      { label: "Tag", syntax: "#tag/aninhada" },
    ],
  },
  {
    title: "Livro",
    items: [
      { label: "Duas colunas", syntax: "> [!colunas]" },
      { label: "Quebra de coluna", syntax: '<div class="quebra-coluna"></div>' },
      { label: "Quebra de página", syntax: '<div class="quebra-pagina"></div>' },
      { label: "Bloco largo", syntax: "> [!largo]" },
      { label: "Sumário automático", syntax: "[TOC]" },
    ],
  },
]
