import { parseMapExtras, type MapExtras } from "./wiki-map-extras"
import { parse as parseYaml } from "yaml"
import { findCodeBlocks } from "./codeblocks"
import { CalendarError, dayNumber, defaultAbbr, noteDateText, parseCalendar, parseWorldDate, sameAbbr, type Calendar, type WorldDate } from "./calendar"
import type { LinkRef } from "./parse"
import { extname, noteName } from "./text"
import type { IndexedNote, VaultIndex } from "./vault-index"

/**
 * Wiki (etapa 6): cada wiki é uma pasta `Wikis/<nome>/`, cada artigo é uma nota comum. O tipo do artigo vem da
 * propriedade `tipo`; a ficha (infobox) é montada das propriedades; datas do mundo são as propriedades que terminam em
 * `_mundo`, no calendário da propriedade `calendario`; relações são propriedades com listas de links (`aliados`,
 * `pais`, `membro_de`…), vistas dos dois lados.
 */

export const WIKI_ROOT = "Wikis/"

// ---------- Tipos de artigo ----------

export type FieldKind = "texto" | "numero" | "link" | "links" | "data" | "imagem"

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
}

export interface ArticleKind {
  id: string
  label: string
  /** Pasta padrão dentro da wiki. */
  folder: string
  /** Nome do ícone (lucide). */
  icon: string
  fields: FieldDef[]
  /** Perguntas-guia: ficam como comentários `%%` no artigo novo (somem na leitura e no Obsidian). */
  questions: string[]
  sections: string[]
}

const f = (key: string, label: string, kind: FieldKind = "texto"): FieldDef => ({ key, label, kind })
const nascimento = f("nascimento_mundo", "Nascimento", "data")
const fundacao = f("fundacao_mundo", "Fundação", "data")
const inicio = f("data_mundo", "Início", "data")
const fim = f("data_fim_mundo", "Fim", "data")

export const ARTICLE_KINDS: ArticleKind[] = [
  { id: "personagem", label: "Personagem", folder: "Personagens", icon: "user", fields: [f("retrato", "Retrato", "imagem"), f("especie", "Espécie", "link"), f("ocupacao", "Ocupação"), nascimento, f("morte_mundo", "Morte", "data"), f("residencia", "Residência", "link"), f("afiliacao", "Afiliação", "links"), f("status", "Situação")], questions: ["O que essa pessoa quer mais do que tudo?", "Do que ela tem medo?", "Como os jogadores a conhecem (ou vão conhecer)?", "Que segredo ela guarda?"], sections: ["Aparência", "Personalidade", "História"] },
  { id: "local", label: "Local", folder: "Locais", icon: "map-pin", fields: [f("imagem", "Imagem", "imagem"), f("tipo_de_local", "Tipo"), f("localizado_em", "Fica em", "link"), f("clima", "Clima"), f("perigo", "Perigo")], questions: ["O que se vê, ouve e cheira ao chegar?", "Quem manda aqui?", "Que perigo ou tesouro o lugar esconde?"], sections: ["Descrição", "História", "Ganchos"] },
  { id: "cidade", label: "Cidade", folder: "Locais", icon: "castle", fields: [f("imagem", "Imagem", "imagem"), f("localizado_em", "Fica em", "link"), f("populacao", "População", "numero"), f("governante", "Governante", "link"), fundacao, f("religiao", "Religião", "link"), f("economia", "Economia")], questions: ["Pelo que a cidade é conhecida?", "Quem manda de verdade (e quem acha que manda)?", "Qual o problema que todos comentam?", "Onde os viajantes se hospedam?"], sections: ["Visão geral", "Bairros", "Personalidades", "Ganchos"] },
  { id: "construcao", label: "Construção", folder: "Locais", icon: "landmark", fields: [f("localizado_em", "Fica em", "link"), f("dono", "Dono", "link"), f("construcao_mundo", "Construída em", "data"), f("funcao", "Função")], questions: ["Para que foi construída — e para que é usada hoje?", "O que tem de diferente lá dentro?"], sections: ["Descrição", "Salas", "História"] },
  { id: "organizacao", label: "Organização", folder: "Organizações", icon: "shield", fields: [f("simbolo", "Símbolo", "imagem"), f("lider", "Líder", "link"), f("sede", "Sede", "link"), fundacao, f("membros_aprox", "Membros", "numero"), f("objetivo", "Objetivo")], questions: ["O que a organização quer?", "Como alguém entra (e sai)?", "Quem são os inimigos dela?"], sections: ["Objetivos", "Estrutura", "História"] },
  { id: "pais", label: "País", folder: "Países", icon: "flag", fields: [f("bandeira", "Bandeira", "imagem"), f("capital", "Capital", "link"), f("governante", "Governante", "link"), f("governo", "Governo"), f("populacao", "População", "numero"), f("idioma", "Idioma", "link"), f("religiao", "Religião", "link"), fundacao], questions: ["Como o país é governado?", "Com quem ele está em conflito?", "O que os vizinhos pensam dele?"], sections: ["Geografia", "Política", "História", "Cultura"] },
  { id: "item", label: "Item", folder: "Itens", icon: "gem", fields: [f("imagem", "Imagem", "imagem"), f("tipo_de_item", "Tipo"), f("raridade", "Raridade"), f("dono_atual", "Com quem está", "link"), f("criado_por", "Criado por", "link"), f("criacao_mundo", "Criado em", "data")], questions: ["Quem o criou e por quê?", "O que acontece com quem o usa?", "Quem mais o quer?"], sections: ["Descrição", "Poderes", "História"] },
  { id: "material", label: "Material", folder: "Materiais", icon: "layers", fields: [f("origem", "Origem", "link"), f("raridade", "Raridade"), f("valor", "Valor")], questions: ["Onde ele é encontrado?", "Para que serve?"], sections: ["Propriedades", "Usos"] },
  { id: "especie", label: "Espécie", folder: "Espécies", icon: "paw-print", fields: [f("imagem", "Imagem", "imagem"), f("habitat", "Habitat", "link"), f("expectativa_de_vida", "Expectativa de vida"), f("tamanho", "Tamanho"), f("dieta", "Dieta")], questions: ["Como a espécie vive em grupo?", "Como os outros povos a veem?"], sections: ["Aparência", "Comportamento", "Sociedade"] },
  { id: "cultura", label: "Cultura", folder: "Culturas", icon: "users", fields: [f("regiao", "Região", "link"), f("idioma", "Idioma", "link"), f("religiao", "Religião", "link"), f("valores", "Valores")], questions: ["O que essa cultura celebra?", "O que é tabu?", "Como recebe estrangeiros?"], sections: ["Costumes", "Festas", "Arte"] },
  { id: "religiao", label: "Religião", folder: "Religiões", icon: "sun", fields: [f("simbolo", "Símbolo", "imagem"), f("divindades", "Divindades", "links"), f("sede", "Sede", "link"), f("dogma", "Dogma")], questions: ["O que os fiéis acreditam que acontece após a morte?", "Quais são os ritos principais?", "Que heresias existem?"], sections: ["Crenças", "Ritos", "Clero"] },
  { id: "idioma", label: "Idioma", folder: "Idiomas", icon: "languages", fields: [f("falado_em", "Falado em", "links"), f("escrita", "Escrita"), f("familia", "Família")], questions: ["Como ele soa?", "Que palavras os jogadores vão ouvir primeiro?"], sections: ["Pronúncia", "Gramática", "Dicionário"] },
  { id: "magia", label: "Magia", folder: "Magia", icon: "sparkles", fields: [f("fonte", "Fonte"), f("custo", "Custo"), f("praticantes", "Praticantes", "links")], questions: ["De onde vem o poder?", "Qual o preço de usá-lo?", "Quem proíbe e por quê?"], sections: ["Regras", "Tradições", "Perigos"] },
  { id: "tecnologia", label: "Tecnologia", folder: "Tecnologia", icon: "cog", fields: [f("inventor", "Inventor", "link"), f("invencao_mundo", "Inventada em", "data"), f("uso", "Uso")], questions: ["Que problema ela resolve?", "Quem a controla?"], sections: ["Funcionamento", "Impacto"] },
  { id: "veiculo", label: "Veículo", folder: "Veículos", icon: "ship", fields: [f("imagem", "Imagem", "imagem"), f("tipo_de_veiculo", "Tipo"), f("capacidade", "Capacidade"), f("dono", "Dono", "link")], questions: ["Para onde ele leva quem viaja nele?", "O que tem a bordo?"], sections: ["Descrição", "Tripulação"] },
  { id: "mito", label: "Mito", folder: "Mitos", icon: "book-open", fields: [f("cultura", "Cultura", "link"), f("verdade", "O que é verdade")], questions: ["Quem conta esse mito e por quê?", "O que realmente aconteceu?"], sections: ["A história", "Versões"] },
  { id: "evento", label: "Acontecimento", folder: "Acontecimentos", icon: "flame", fields: [inicio, fim, f("local", "Local", "link"), f("envolvidos", "Envolvidos", "links"), f("consequencia", "Consequência")], questions: ["O que provocou o acontecimento?", "Quem saiu ganhando e quem perdeu?", "Como isso ainda afeta o presente?"], sections: ["Antecedentes", "O que aconteceu", "Consequências"] },
  { id: "guerra", label: "Guerra", folder: "Guerras", icon: "swords", fields: [inicio, fim, f("lados", "Lados", "links"), f("vencedor", "Vencedor", "link"), f("baixas", "Baixas")], questions: ["Por que a guerra começou?", "Qual foi a batalha decisiva?", "Como terminou (se terminou)?"], sections: ["Causas", "Batalhas", "Fim"] },
  { id: "documento", label: "Documento", folder: "Documentos", icon: "scroll-text", fields: [f("autor", "Autor", "link"), f("escrita_mundo", "Escrito em", "data"), f("idioma", "Idioma", "link")], questions: ["Quem pode ler este documento?", "O que ele revela?"], sections: ["Texto", "Notas"] },
  { id: "condicao", label: "Condição", folder: "Condições", icon: "activity", fields: [f("efeitos", "Efeitos"), f("duracao", "Duração"), f("cura", "Cura")], questions: ["Como se pega?", "Como se cura?"], sections: ["Efeitos", "Tratamento"] },
  { id: "era", label: "Era", folder: "Eras", icon: "hourglass", fields: [inicio, fim], questions: ["O que marcou o começo e o fim da era?"], sections: ["Visão geral", "Acontecimentos"] },
  { id: "calendario", label: "Calendário", folder: "Calendários", icon: "calendar-days", fields: [], questions: [], sections: [] },
  { id: "mapa", label: "Mapa", folder: "Mapas", icon: "map", fields: [], questions: [], sections: [] },
]

const KIND_ALIASES: Record<string, string> = { acontecimento: "evento", "país": "pais", organização: "organizacao", construção: "construcao", espécie: "especie", religião: "religiao", condição: "condicao", veículo: "veiculo", calendário: "calendario", "item mágico": "item" }

export function articleKind(tipo: unknown): ArticleKind | undefined {
  if (typeof tipo !== "string") return undefined
  const key = tipo.trim().toLocaleLowerCase("pt-BR")
  return ARTICLE_KINDS.find((k) => k.id === (KIND_ALIASES[key] ?? key))
}

const ARTICLE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"])

/** Arte representativa: campo do tipo, ou primeiro embed de imagem do corpo já indexado. */
export function articleImage(note: IndexedNote): string | null {
  const data = note.meta.frontmatter?.data ?? {}
  for (const field of articleKind(data.tipo)?.fields ?? []) {
    if (field.kind !== "imagem") continue
    const value = values(data[field.key]).find(value => value.trim())?.trim()
    if (value) return linkTargetOf(value.replace(/^!/, ""))?.target ?? value
  }
  return note.meta.links.find(link => link.embed && !link.inFrontmatter && ARTICLE_IMAGE_EXTENSIONS.has(extname(link.target)))?.target ?? null
}

// ---------- Wikis ----------

export interface WikiInfo {
  name: string
  /** `Wikis/<nome>/` */
  root: string
  /** Nota inicial (`Wikis/<nome>/<nome>.md`), se existe. */
  home?: string
  articles: number
}

export function listWikis(index: VaultIndex): WikiInfo[] {
  const names = new Set<string>()
  for (const file of index.allFiles()) {
    const m = /^Wikis\/([^/]+)\//.exec(file.path)
    if (m) names.add(m[1]!)
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((name) => {
      const root = `${WIKI_ROOT}${name}/`
      const home = `${root}${name}.md`
      return { name, root, ...(index.note(home) ? { home } : {}), articles: index.notesIn(root).filter((n) => n.path !== home).length }
    })
}

export function wikiRootOf(path: string): string | null {
  const m = /^(Wikis\/[^/]+\/)/.exec(path)
  return m ? m[1]! : null
}

// ---------- Notas novas ----------

const yamlString = (value: string) => JSON.stringify(value)

/** Texto de um artigo novo: `tipo`, os campos vazios da ficha, seções e perguntas-guia. O calendário de cada data vem
 * da sigla escrita nela (`"3999-02-12 OC"`). */
export function newArticleNote(kind: ArticleKind, title: string): string {
  const lines = ["---", `tipo: ${kind.id}`]
  for (const field of kind.fields) lines.push(field.kind === "links" ? `${field.key}: []` : `${field.key}:`)
  lines.push("---", `# ${title}`, "")
  if (kind.questions.length) lines.push(...kind.questions.map((q) => `%% ${q} %%`), "")
  for (const section of kind.sections) lines.push(`## ${section}`, "", "")
  if (kind.id === "idioma") lines.push('```runas-idioma', `nome: ${yamlString(title)}`, 'regras: ""', 'palavras:', '  - palavra: exemplo', '    traducao: significado', '    pronuncia: pronúncia', '```', '')
  return lines.join("\n").replace(/\n{3,}$/, "\n\n")
}

export function newWikiNote(name: string): string {
  return `---\ntipo: wiki\n---\n# ${name}\n\nApresentação do mundo: o tom, o que os jogadores precisam saber primeiro e por onde começar.\n`
}

export const CALENDAR_EXAMPLE = `nome: Calendário
sigla: CAL
sufixo: D.R.
semana: [Lua, Fogo, Água, Madeira, Ouro, Terra, Sol]
meses:
  - { nome: Despertar, dias: 30, estacao: Primavera }
  - { nome: Florada, dias: 30, estacao: Primavera }
  - { nome: Sol Alto, dias: 30, estacao: Verão }
  - { nome: Colheita, dias: 30, estacao: Outono }
  - { nome: Bruma, dias: 30, estacao: Outono }
  - { nome: Gelo, dias: 30, estacao: Inverno }
  - { nome: Noite Longa, dias: 5, intercalar: true }
luas:
  - { nome: Lua, ciclo: 29.5, cheia_em: "1000-01-10" }
eras:
  - { nome: Era do Reino, inicio: 1 }
hoje: "1000-01-01"`

export function newCalendarNote(name: string): string {
  return `---\ntipo: calendario\n---\n# ${name}\n\nMeses, semana, luas e eras do mundo. Edite o bloco abaixo (a ajuda está no app, em Wiki › Calendário).\n\n\`\`\`runas-calendario\n${CALENDAR_EXAMPLE.replace(/^nome: Calendário$/m, `nome: ${name}`).replace(/^sigla: CAL$/m, `sigla: ${defaultAbbr(name)}`)}\n\`\`\`\n`
}

export function newMapNote(name: string, image: string): string {
  return `---\ntipo: mapa\n---\n# ${name}\n\n\`\`\`runas-mapa\nimagem: ${yamlString(`[[${image}]]`)}\ncamadas: [Locais, Perigos, Segredos]\npinos: []\n\`\`\`\n`
}

// ---------- Ligação por link (sem React) ----------

function linkTargetOf(value: string): { target: string; extra: string } | null {
  const m = /^\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*(.*)$/.exec(value)
  if (m) return { target: m[1]!.trim(), extra: m[2]!.replace(/^\(|\)$/g, "").trim() }
  return null
}

function resolveTarget(index: VaultIndex, target: string, from: string): string | null {
  const link: LinkRef = { kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: true }
  return index.resolve(link, from).dest
}

/** Valores de uma propriedade como lista (texto ou lista). */
function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined).map(String)
  if (typeof value === "string" && value.trim()) return [value]
  return []
}

// ---------- Calendário de uma nota ----------

export interface CalendarRef {
  calendar: Calendar
  /** Nota que tem o bloco. */
  path: string
}

const calendarCache = new Map<string, { text: string; result: CalendarRef | { error: string } }>()

/** O calendário definido no primeiro bloco ```runas-calendario``` de uma nota. */
export function calendarInNote(note: IndexedNote): CalendarRef | { error: string } | null {
  const cached = calendarCache.get(note.path)
  if (cached && cached.text === note.text) return cached.result
  const block = findCodeBlocks(note.text, "runas-calendario")[0]
  if (!block) return null
  let result: CalendarRef | { error: string }
  try {
    result = { calendar: parseCalendar(block.content), path: note.path }
  } catch (error) {
    result = { error: error instanceof CalendarError ? error.message : String(error) }
  }
  calendarCache.set(note.path, { text: note.text, result })
  return result
}

/** Todos os calendários do cofre (ou de uma wiki). */
export function listCalendars(index: VaultIndex, root = ""): (CalendarRef | { path: string; error: string })[] {
  return index
    .notesIn(root)
    .filter((note) => note.text.includes("runas-calendario"))
    .flatMap((note): (CalendarRef | { path: string; error: string })[] => {
      const found = calendarInNote(note)
      if (!found) return []
      return "error" in found ? [{ path: note.path, error: found.error }] : [found]
    })
}

/** O calendário com esta sigla: primeiro na wiki da nota, depois no cofre todo. */
export function calendarByAbbr(index: VaultIndex, abbr: string, from = ""): CalendarRef | { error: string } {
  const root = wikiRootOf(from)
  const found = (list: ReturnType<typeof listCalendars>) => list.find((c): c is CalendarRef => "calendar" in c && sameAbbr(c.calendar.abbr, abbr))
  return (root ? found(listCalendars(index, root)) : undefined) ?? found(listCalendars(index)) ?? { error: `Nenhum calendário tem a sigla “${abbr}” (ponha sigla: ${abbr} no bloco runas-calendario).` }
}

/**
 * O calendário de uma data de uma nota: o da sigla escrita na data (`"3999-02-12 OC"`). Sem `date`, vale a sigla da
 * primeira data da nota que tiver uma. Datas antigas, sem sigla, usam a propriedade `calendario` (link para a nota com
 * o bloco) ou, sem ela, o da wiki — se a wiki tem um calendário só.
 */
export function calendarFor(index: VaultIndex, path: string, date?: WorldDate): CalendarRef | { error: string } | null {
  const note = index.note(path)
  if (!note) return null
  const own = calendarInNote(note)
  if (own) return own
  const abbr = date ? date.calendar : noteDates(note.meta.frontmatter?.data).find((d) => d.date.calendar)?.date.calendar
  if (abbr) return calendarByAbbr(index, abbr, path)
  const link = note.meta.frontmatter?.data?.calendario
  if (typeof link === "string" && link.trim()) {
    const target = linkTargetOf(link)?.target ?? link.trim()
    const dest = resolveTarget(index, target, path)
    const calendarNote = dest ? index.note(dest) : undefined
    if (!calendarNote) return { error: `O calendário “${target}” não está no cofre.` }
    return calendarInNote(calendarNote) ?? { error: `A nota “${noteName(calendarNote.path)}” não tem um bloco runas-calendario.` }
  }
  const root = wikiRootOf(path)
  const candidates = root ? listCalendars(index, root).filter((c): c is CalendarRef => "calendar" in c) : []
  return candidates.length === 1 ? candidates[0]! : null
}

// ---------- Datas do mundo nas notas ----------

export interface NoteDate {
  key: string
  label: string
  date: WorldDate
}

const DATE_LABELS: Record<string, string> = { data_mundo: "Data", data_fim_mundo: "Fim", nascimento_mundo: "Nascimento", morte_mundo: "Morte", fundacao_mundo: "Fundação" }

/** Propriedades que terminam em `_mundo` (datas no calendário fictício). */
export function noteDates(data: Record<string, unknown> | null | undefined): NoteDate[] {
  if (!data) return []
  return Object.entries(data).flatMap(([key, value]) => {
    if (!key.endsWith("_mundo")) return []
    const date = parseWorldDate(value)
    if (!date) return []
    const label = DATE_LABELS[key] ?? key.replace(/_mundo$/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
    return [{ key, label, date }]
  })
}

/**
 * O calendário principal de uma wiki: o da nota inicial (propriedade `calendario`), senão o que mais datas da wiki
 * usam, senão o primeiro. Assim um calendário novo, ainda sem datas, não toma o lugar do que já está em uso.
 */
export function mainCalendar(index: VaultIndex, root: string, home?: string): CalendarRef | null {
  const list = listCalendars(index, root).filter((c): c is CalendarRef => "calendar" in c)
  const fromHome = home ? calendarFor(index, home) : null
  if (fromHome && "calendar" in fromHome) return fromHome
  const uses = new Map<string, number>()
  for (const note of index.notesIn(root)) {
    for (const d of noteDates(note.meta.frontmatter?.data)) {
      const found = calendarFor(index, note.path, d.date)
      if (found && "calendar" in found) uses.set(found.path, (uses.get(found.path) ?? 0) + 1)
    }
  }
  return [...list].sort((a, b) => (uses.get(b.path) ?? 0) - (uses.get(a.path) ?? 0))[0] ?? null
}

/**
 * Datas `_mundo` da nota ainda sem sigla, já com a do calendário que valia para elas (para regravar no formato novo).
 * Datas cujo calendário não se descobre ficam de fora.
 */
export function datesMissingAbbr(index: VaultIndex, path: string): { key: string; text: string }[] {
  const note = index.note(path)
  if (!note) return []
  return noteDates(note.meta.frontmatter?.data).flatMap((d) => {
    if (d.date.calendar) return []
    const found = calendarFor(index, path, d.date)
    return found && "calendar" in found ? [{ key: d.key, text: noteDateText(d.date, found.calendar) }] : []
  })
}

// ---------- Relações ----------

export interface RelationType {
  key: string
  label: string
  /** Como aparece na outra nota (as simétricas aparecem igual dos dois lados). */
  inverse: string
  symmetric?: boolean
  group: "familia" | "organizacao" | "diplomacia" | "outras"
}

export const RELATION_TYPES: RelationType[] = [
  { key: "pais", label: "Pais", inverse: "Filhos", group: "familia" },
  { key: "filhos", label: "Filhos", inverse: "Pais", group: "familia" },
  { key: "conjuges", label: "Cônjuges", inverse: "Cônjuges", symmetric: true, group: "familia" },
  { key: "irmaos", label: "Irmãos", inverse: "Irmãos", symmetric: true, group: "familia" },
  { key: "mentor", label: "Mentor", inverse: "Discípulos", group: "outras" },
  { key: "membro_de", label: "Membro de", inverse: "Membros", group: "organizacao" },
  { key: "lider_de", label: "Líder de", inverse: "Liderado por", group: "organizacao" },
  { key: "subordinado_a", label: "Subordinado a", inverse: "Subordinados", group: "organizacao" },
  { key: "aliados", label: "Aliados", inverse: "Aliados", symmetric: true, group: "diplomacia" },
  { key: "inimigos", label: "Inimigos", inverse: "Inimigos", symmetric: true, group: "diplomacia" },
  { key: "rivais", label: "Rivais", inverse: "Rivais", symmetric: true, group: "diplomacia" },
  { key: "em_guerra_com", label: "Em guerra com", inverse: "Em guerra com", symmetric: true, group: "diplomacia" },
  { key: "paz_tensa_com", label: "Paz tensa com", inverse: "Paz tensa com", symmetric: true, group: "diplomacia" },
  { key: "vassalo_de", label: "Vassalo de", inverse: "Vassalos", group: "diplomacia" },
  { key: "localizado_em", label: "Fica em", inverse: "Contém", group: "outras" },
  { key: "relacoes", label: "Outras relações", inverse: "Outras relações", symmetric: true, group: "outras" },
]

const RELATION_BY_KEY = new Map(RELATION_TYPES.map((r) => [r.key, r]))

export interface Relation {
  type: RelationType
  /** Outra nota (`null` se o link está quebrado). */
  other: string | null
  /** O alvo do link como escrito. */
  target: string
  /** Texto entre parênteses depois do link: a atitude ou o tipo livre ("hostil", "amigo de infância"). */
  note?: string
  /** `true` quando a relação foi escrita na outra nota (o app mostra o lado inverso). */
  inverse: boolean
}

/** Relações que a própria nota declara. */
function declaredRelations(index: VaultIndex, note: IndexedNote): { type: RelationType; other: string | null; target: string; note?: string }[] {
  const data = note.meta.frontmatter?.data
  if (!data) return []
  return Object.entries(data).flatMap(([key, value]) => {
    const type = RELATION_BY_KEY.get(key)
    if (!type) return []
    return values(value).flatMap((item) => {
      const link = linkTargetOf(item)
      if (!link) return []
      return [{ type, other: resolveTarget(index, link.target, note.path), target: link.target, ...(link.extra ? { note: link.extra } : {}) }]
    })
  })
}

/** As relações de uma nota: as que ela declara e as que outras notas declaram com ela (no sentido inverso). */
export function relationsOf(index: VaultIndex, path: string, scope = ""): Relation[] {
  const note = index.note(path)
  if (!note) return []
  const own: Relation[] = declaredRelations(index, note).map((r) => ({ ...r, inverse: false }))
  const seen = new Set(own.map((r) => `${r.type.symmetric ? r.type.key : r.type.key}|${r.other}`))
  const incoming: Relation[] = []
  for (const other of index.notesIn(scope)) {
    if (other.path === path || !other.text.includes("[[")) continue
    for (const r of declaredRelations(index, other)) {
      if (r.other !== path) continue
      // Do lado de cá, `pais` escrito no filho vira "Filhos"; as simétricas continuam do mesmo tipo.
      const type = r.type.symmetric ? r.type : (RELATION_TYPES.find((t) => t.key === INVERSE_KEY[r.type.key]) ?? { ...r.type, label: r.type.inverse })
      const key = `${type.key}|${other.path}`
      if (seen.has(key)) continue
      seen.add(key)
      incoming.push({ type, other: other.path, target: noteName(other.path), ...(r.note ? { note: r.note } : {}), inverse: true })
    }
  }
  return [...own, ...incoming]
}

const INVERSE_KEY: Record<string, string> = { pais: "filhos", filhos: "pais" }

// ---------- Árvore genealógica, organograma e diplomacia ----------

export interface FamilyTree {
  center: string
  /** Gerações: -2 avós, -1 pais, 0 a pessoa (com cônjuges e irmãos), 1 filhos, 2 netos. */
  generations: Map<number, string[]>
  /** Ligações pai/mãe → filho e entre cônjuges. */
  edges: { from: string; to: string; kind: "filiacao" | "casamento" }[]
}

export function familyTree(index: VaultIndex, center: string, depth = 2, scope = ""): FamilyTree {
  const parentsOf = (path: string) => relationsOf(index, path, scope).filter((r) => r.other && r.type.key === "pais").map((r) => r.other!)
  const childrenOf = (path: string) => relationsOf(index, path, scope).filter((r) => r.other && r.type.key === "filhos").map((r) => r.other!)
  const spousesOf = (path: string) => relationsOf(index, path, scope).filter((r) => r.other && r.type.key === "conjuges").map((r) => r.other!)
  const generations = new Map<number, string[]>([[0, [center]]])
  const placed = new Set([center])
  const edges: FamilyTree["edges"] = []
  const place = (generation: number, path: string) => {
    if (placed.has(path)) return false
    placed.add(path)
    generations.set(generation, [...(generations.get(generation) ?? []), path])
    return true
  }
  for (const spouse of spousesOf(center)) {
    place(0, spouse)
    edges.push({ from: center, to: spouse, kind: "casamento" })
  }
  // Irmãos: quem tem os mesmos pais.
  for (const parent of parentsOf(center)) for (const sibling of childrenOf(parent)) if (sibling !== center) place(0, sibling)
  for (const r of relationsOf(index, center, scope)) if (r.other && r.type.key === "irmaos") place(0, r.other)
  let up = [center]
  for (let g = -1; g >= -depth; g--) {
    const next: string[] = []
    for (const person of up) for (const parent of parentsOf(person)) {
      edges.push({ from: parent, to: person, kind: "filiacao" })
      if (place(g, parent)) next.push(parent)
    }
    up = next
  }
  let down = [center, ...spousesOf(center)]
  for (let g = 1; g <= depth; g++) {
    const next: string[] = []
    for (const person of down) for (const child of childrenOf(person)) {
      edges.push({ from: person, to: child, kind: "filiacao" })
      if (place(g, child)) next.push(child)
    }
    down = next
  }
  const unique = new Map(edges.map((e) => [`${e.from}|${e.to}|${e.kind}`, e]))
  return { center, generations, edges: [...unique.values()] }
}

export interface OrgNode {
  path: string
  role?: "lider"
  children: OrgNode[]
}

/** Organograma: a organização, os líderes e os membros, com a hierarquia de `subordinado_a`. */
export function orgChart(index: VaultIndex, org: string, scope = ""): OrgNode {
  const members = new Set<string>()
  const leaders = new Set<string>()
  // Só o que os membros declaram (`membro_de`/`lider_de` apontando para a organização).
  for (const r of relationsOf(index, org, scope)) {
    if (!r.other || !r.inverse) continue
    if (r.type.key === "membro_de") members.add(r.other)
    if (r.type.key === "lider_de") leaders.add(r.other)
  }
  const leaderField = index.note(org)?.meta.frontmatter?.data?.lider
  for (const value of values(leaderField)) {
    const dest = linkTargetOf(value) ? resolveTarget(index, linkTargetOf(value)!.target, org) : null
    if (dest) leaders.add(dest)
  }
  const everyone = new Set([...members, ...leaders])
  const bossOf = new Map<string, string>()
  for (const person of everyone) {
    const boss = relationsOf(index, person, scope).find((r) => r.type.key === "subordinado_a" && !r.inverse && r.other && everyone.has(r.other))
    if (boss) bossOf.set(person, boss.other!)
  }
  const build = (path: string, seen: Set<string>): OrgNode => ({
    path,
    ...(leaders.has(path) ? { role: "lider" as const } : {}),
    children: [...everyone].filter((p) => bossOf.get(p) === path && !seen.has(p)).sort().map((p) => build(p, new Set([...seen, p]))),
  })
  const top = [...everyone].filter((p) => !bossOf.has(p)).sort((a, b) => Number(leaders.has(b)) - Number(leaders.has(a)) || a.localeCompare(b, "pt-BR"))
  return { path: org, children: top.map((p) => build(p, new Set([p]))) }
}

export interface DiplomacyEdge {
  from: string
  to: string
  kind: string
  label: string
}

/** Tipos que entram na teia diplomática (facções, não pessoas). */
const FACTIONS = new Set(["organizacao", "pais", "cultura", "religiao", "especie", "cidade"])

/** Teia diplomática da wiki: alianças, guerras, rivalidades e vassalagem entre organizações, países e povos. */
export function diplomacy(index: VaultIndex, root: string): { nodes: string[]; edges: DiplomacyEdge[] } {
  const edges = new Map<string, DiplomacyEdge>()
  const faction = (path: string) => FACTIONS.has(articleKind(index.note(path)?.meta.frontmatter?.data?.tipo)?.id ?? "")
  for (const note of index.notesIn(root)) {
    if (!faction(note.path)) continue
    for (const r of declaredRelations(index, note)) {
      if (r.type.group !== "diplomacia" || !r.other || !faction(r.other)) continue
      const [a, b] = r.type.symmetric ? [note.path, r.other].sort() : [note.path, r.other]
      edges.set(`${a}|${b}|${r.type.key}`, { from: a!, to: b!, kind: r.type.key, label: r.type.label })
    }
  }
  const list = [...edges.values()]
  return { nodes: [...new Set(list.flatMap((e) => [e.from, e.to]))].sort(), edges: list }
}

// ---------- Linha do tempo ----------

export interface TimelineEvent {
  path: string
  title: string
  start: WorldDate
  end?: WorldDate
  startDay: number
  endDay: number
  kind?: ArticleKind
  /** Trilha (faixa paralela): a propriedade `trilha`, ou o tipo do artigo. */
  track: string
  tags: string[]
  /** Nascimento/morte de personagem (mostrados com a opção "pessoas"). */
  life?: "nascimento" | "morte"
}

/** Acontecimentos da wiki no calendário `calendar` (notas com `data_mundo`; opcionalmente nascimentos e mortes). */
export function timelineEvents(index: VaultIndex, root: string, ref: CalendarRef, options: { people?: boolean } = {}): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const note of index.notesIn(root)) {
    const data = note.meta.frontmatter?.data
    if (!data) continue
    const dates = noteDates(data)
    if (!dates.length) continue
    const inRef = (date: WorldDate) => { const found = calendarFor(index, note.path, date); return Boolean(found && "calendar" in found && found.path === ref.path) }
    const kind = articleKind(data.tipo)
    const trackValue = typeof data.trilha === "string" ? data.trilha : Array.isArray(data.trilha) ? String(data.trilha[0] ?? "") : ""
    const track = (linkTargetOf(trackValue)?.target ?? trackValue.trim()) || kind?.label || "Outros"
    const start = dates.find((d) => d.key === "data_mundo" && inRef(d.date))?.date
    const end = dates.find((d) => d.key === "data_fim_mundo" && inRef(d.date))?.date
    const base = { path: note.path, kind, track: track.split("/").pop()!, tags: note.meta.tags }
    if (start) {
      const startDay = dayNumber(ref.calendar, start)
      const endDay = end ? Math.max(startDay, dayNumber(ref.calendar, end)) : startDay
      events.push({ ...base, title: noteName(note.path), start, ...(end ? { end } : {}), startDay, endDay })
    }
    if (options.people) {
      for (const life of ["nascimento", "morte"] as const) {
        const date = dates.find((d) => d.key === `${life}_mundo`)?.date
        if (!date || !inRef(date)) continue
        const day = dayNumber(ref.calendar, date)
        events.push({ ...base, title: `${life === "nascimento" ? "Nasce" : "Morre"} ${noteName(note.path)}`, start: date, startDay: day, endDay: day, life })
      }
    }
  }
  return events.sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title, "pt-BR"))
}

// ---------- Mapas (bloco runas-mapa) ----------

export interface MapPin {
  /** Alvo do link da nota do pino (`[[alvo]]`), ou nada num pino só com rótulo. */
  note?: string
  label?: string
  x: number
  y: number
  category?: string
  layer?: string
  secret?: boolean
}

export interface MapSpec extends MapExtras {
  image: string
  layers: string[]
  pins: MapPin[]
  /** `pixels` da imagem valem `distance` na `unit`. */
  scale?: { pixels: number; distance: number; unit: string }
  /** Distância por dia de viagem (na mesma unidade). */
  travelPerDay?: number
}

export function parseMap(content: string): MapSpec {
  let data: unknown
  try {
    data = parseYaml(content)
  } catch (error) {
    throw new Error(`YAML inválido: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`)
  }
  const d = (data && typeof data === "object" && !Array.isArray(data) ? data : {}) as Record<string, unknown>
  const image = typeof d.imagem === "string" ? (linkTargetOf(d.imagem)?.target ?? d.imagem.trim()) : ""
  if (!image) throw new Error('Falta a "imagem" do mapa (ex.: imagem: "[[mapa.png]]").')
  const clamp = (n: unknown) => Math.min(1, Math.max(0, typeof n === "number" && Number.isFinite(n) ? n : 0.5))
  const pins = (Array.isArray(d.pinos) ? d.pinos : []).flatMap((p): MapPin[] => {
    if (!p || typeof p !== "object") return []
    const o = p as Record<string, unknown>
    const note = typeof o.nota === "string" ? (linkTargetOf(o.nota)?.target ?? o.nota.trim()) : undefined
    const label = typeof o.rotulo === "string" ? o.rotulo.trim() : undefined
    if (!note && !label) return []
    return [{ ...(note ? { note } : {}), ...(label ? { label } : {}), x: clamp(o.x), y: clamp(o.y), ...(typeof o.categoria === "string" ? { category: o.categoria } : {}), ...(typeof o.camada === "string" ? { layer: o.camada } : {}), ...(o.segredo === true ? { secret: true } : {}) }]
  })
  const scale = d.escala && typeof d.escala === "object" ? (d.escala as Record<string, unknown>) : null
  const viagem = d.viagem && typeof d.viagem === "object" ? (d.viagem as Record<string, unknown>) : null
  return {
    image,
    ...parseMapExtras(d),
    layers: Array.isArray(d.camadas) ? d.camadas.map(String) : [],
    pins,
    ...(scale && typeof scale.pixels === "number" && typeof scale.distancia === "number" ? { scale: { pixels: scale.pixels, distance: scale.distancia, unit: typeof scale.unidade === "string" ? scale.unidade : "km" } } : {}),
    ...(viagem && typeof viagem.por_dia === "number" ? { travelPerDay: viagem.por_dia } : {}),
  }
}

/** Pinos no formato do bloco (para `setBlockKeys`). */
export function pinsToYaml(pins: MapPin[]): Record<string, unknown>[] {
  const round = (n: number) => Math.round(n * 10_000) / 10_000
  return pins.map((p) => ({
    ...(p.note ? { nota: `[[${p.note}]]` } : {}),
    ...(p.label ? { rotulo: p.label } : {}),
    x: round(p.x),
    y: round(p.y),
    ...(p.category ? { categoria: p.category } : {}),
    ...(p.layer ? { camada: p.layer } : {}),
    ...(p.secret ? { segredo: true } : {}),
  }))
}

/** Mapas da wiki: notas com um bloco ```runas-mapa```. */
export function listMaps(index: VaultIndex, root: string): IndexedNote[] {
  return index.notesIn(root).filter((note) => findCodeBlocks(note.text, "runas-mapa").length > 0)
}

/** Mapa "de dentro" de um pino: a nota do pino é ela mesma um mapa (mapas aninhados). */
export function isMapNote(index: VaultIndex, path: string | null): boolean {
  return Boolean(path && index.note(path) && findCodeBlocks(index.note(path)!.text, "runas-mapa").length)
}
