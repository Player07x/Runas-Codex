import { isoDate } from "./agenda"
import type { IndexedNote, VaultIndex } from "./vault-index"
export interface ExampleNote { folder: string; name: string; text: string }
const marked = (properties: string, body: string) => `---\nexemplo_runas: true\n${properties}---\n${body}\n`
/** Somente notas com a marca explícita entram na remoção em lote, inclusive depois de renomeadas. */
export function exampleNotes(index: VaultIndex): IndexedNote[] { return index.allNotes().filter(note => note.meta.frontmatter?.data?.exemplo_runas === true) }
export function starterNotes(now = new Date()): ExampleNote[] {
  const date = isoDate(now)
  return [
    { folder: "Notas", name: "Exemplo - Primeira ideia", text: marked("", "# Primeira ideia\n\nEscreva uma ideia e ligue ao [[Farol das Brumas]].\n\n- [ ] Preparar a próxima história\n- [ ] Explorar a Wiki\n\nEsta nota é um exemplo. Pode editá-la ou removê-la com os outros exemplos em Configurações.") },
    { folder: "Agenda", name: "Exemplo - Preparar aventura", text: marked(`title: Preparar aventura (exemplo)\ntype: single\nallDay: true\ndate: "${date}"\n`, "# Preparar aventura\n\n- [ ] Separar os ganchos\n- [ ] Combinar o próximo encontro") },
    { folder: "Wikis/Ilha das Brumas (exemplo)", name: "Ilha das Brumas (exemplo)", text: marked("tipo: wiki\n", "# Ilha das Brumas\n\nUma ilha pequena, um farol e muitas histórias. Comece pelo [[Farol das Brumas]].") },
    { folder: "Wikis/Ilha das Brumas (exemplo)/Locais", name: "Farol das Brumas", text: marked("tipo: local\nresumo: Um farol cuja luz guarda memórias.\n", "# Farol das Brumas\n\nToda noite, sua luz revela uma lembrança do mar.\n\n> [!segredo] Só o mestre\n> A guardiã procura a chave do sino submerso.") },
    { folder: "Campanhas/Primeira aventura (exemplo)", name: "Primeira aventura (exemplo)", text: marked("tipo: campanha\nstatus: ativa\nwiki: Ilha das Brumas (exemplo)\nresumo: Descubra o mistério do farol.\n", "# Primeira aventura\n\nO grupo chega à ilha quando a luz do [[Farol das Brumas]] se apaga.\n\n- [ ] Encontrar a guardiã\n- [ ] Explorar a praia") },
    { folder: "Livros/Primeiro livro (exemplo)", name: "Primeiro livro (exemplo)", text: marked('tipo: livro\nautor: ""\nmeta_palavras: 1000\nestrutura:\n  - "[[Exemplo - A chegada]]"\n', "# Primeiro livro\n\nUm começo para a sua próxima história.") },
    { folder: "Livros/Primeiro livro (exemplo)", name: "Exemplo - A chegada", text: marked("tipo: capitulo\nstatus: rascunho\n", "# A chegada\n\nA névoa abriu caminho para o barco. No alto da ilha, o farol permanecia escuro.\n\nEscreva o próximo parágrafo e experimente a prévia do livro.") },
    { folder: "Mesas", name: "Exemplo - Sua primeira mesa", text: marked("tipo: documento\n", "# Sua primeira mesa\n\n1. Abra VTT → Criar Sala → Criar Nova.\n2. Crie uma cena e coloque os tokens.\n3. Abra o painel Sala quando quiser receber jogadores.\n\nA mesa só usa a rede quando você abre a sala. Cenas e mapas ficam na pasta local do cofre.") },
  ]
}
