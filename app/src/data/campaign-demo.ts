/**
 * Campanhas do cofre de exemplo (navegador): notas comuns no formato da etapa 7 (docs/adr/0011-campanhas.md).
 * Os NPCs e facções apontam para os artigos da wiki de exemplo; a Sessão 12 é a do evento de exemplo da Agenda.
 */
const C = "Campanhas/As Cinzas de Valdris"
const W = "Wikis/Ordem x Caos"

const home = `---
tipo: campanha
status: ativa
resumo: "Lobos de brasa nos esgotos de Valdris e a disputa entre o Conde e a Ordem."
wiki: Ordem x Caos
npcs: ["[[${W}/Personagens/Aldren Vael|Aldren Vael]] (aliado)", "[[${W}/Personagens/Conde Ormund|Conde Ormund]] (hostil)", "[[${W}/Personagens/Edric Ormund|Edric Ormund]] (desconfiado)"]
faccoes: ["[[${W}/Organizações/Ordem da Chama Cinzenta|Ordem da Chama Cinzenta]] (+1)", "[[${W}/Organizações/Culto de Morr|Culto de Morr]] (-2)"]
linhas: [crianças em perigo]
veus: [tortura, aranhas gigantes]
fixadas: ["[[Notas/Regras da casa]]", "[[${W}/Locais/Valdris|Valdris]]"]
---
# As Cinzas de Valdris

Os personagens investigam lobos de brasa nos esgotos de [[${W}/Locais/Valdris|Valdris]] e acabam no meio da disputa entre o Conde e a Ordem.

## Segredos e pistas

- [x] Os lobos são criados por um alquimista da Ordem. — revelado em [[${C}/Sessões/Sessão 11]]
- [ ] O Conde deve dez mil moedas à Ordem.
- [ ] Aldren é filho bastardo do Conde.
- [ ] A carta selada pede a prisão de Aldren.

## Relógios

\`\`\`runas-relogios
- { nome: Ritual da Chama Cinzenta, segmentos: 8, preenchidos: 5, tipo: ameaca }
- { nome: Paciência do Conde, segmentos: 6, preenchidos: 2, tipo: ameaca }
- { nome: Confiança de Aldren, segmentos: 4, preenchidos: 3, tipo: progresso }
\`\`\`
`

const pcs = (...names: string[]) => `[${names.map((n) => `"[[${C}/Personagens/${n}]]"`).join(", ")}]`

function session(n: number, date: string, world: string, status: string, title: string, present: string, body: string): string {
  return `---
tipo: sessao
numero: ${n}
status: ${status}
data: "${date}"
hora: "19:30"
hora_fim: "23:00"
data_mundo: "${world}"
presentes: ${present}${status === "realizada" ? `\navaliacao: ${n === 10 ? 8 : 9}` : ""}
---
# Sessão ${n} — ${title}

${body}
`
}

const sessions: Record<string, string> = {
  "Sessão 9": session(9, "2026-09-26", "4031-07-08", "realizada", "Chegada a Valdris", pcs("Ilsa Brasa", "Torvak", "Mirela", "Sef"), `## Anotações

- Audiência com o [[${W}/Personagens/Conde Ormund|Conde Ormund]]: ele quer os lobos mortos até o festival.

## O que aconteceu

O grupo chegou a Valdris, foi recebido pelo Conde e aceitou caçar os lobos de brasa.
`),
  "Sessão 10": session(10, "2026-10-03", "4031-07-11", "realizada", "Mercado das Brasas", pcs("Ilsa Brasa", "Torvak", "Sef"), `## O que aconteceu

Negociação com Marta Fuligem no Corvo Manco; Sef perdeu o grimório para um batedor de carteiras.
`),
  "Sessão 11": session(11, "2026-10-10", "4031-07-15", "realizada", "Os esgotos de brasa", pcs("Ilsa Brasa", "Torvak", "Mirela", "Sef"), `## Anotações

- [[${W}/Personagens/Aldren Vael|Aldren]] apareceu no covil e salvou a Ilsa.

## O que aconteceu

O grupo achou o covil dos lobos e descobriu o símbolo da Ordem nas jaulas. Aldren salvou a Ilsa do alfa.
`),
}

sessions["Sessão 12"] = `---
tipo: sessao
numero: 12
status: planejada
data: "2026-10-17"
data_mundo: "4031-07-16"
presentes: ${pcs("Ilsa Brasa", "Torvak", "Mirela")}
---
# Sessão 12 — O selo na carta

## Preparação

- [x] **Recapitulação** — Os esgotos, o covil dos lobos e Aldren salvando a Ilsa.
- [x] **Início forte** — A guarda bate à porta do Corvo Manco com uma carta selada.
- [x] **Cenas possíveis** — Audiência com o Conde · emboscada no Portão do Lago · conversa com Aldren.
- [ ] **Segredos e pistas** — Escolher 3 dos 4 segredos da campanha.
- [ ] **Locais** — Cidade Alta, Portão do Lago.
- [ ] **NPCs** — Aldren, Conde Ormund, a capitã da guarda.
- [ ] **Recompensas** — O favor do Conde ou a confiança de Aldren.

## Anotações

## O que aconteceu
`

const players: Record<string, [string, string, string]> = {
  "Ilsa Brasa": ["Ana", "Ladina de rua", "#ffa48e"],
  Torvak: ["Bruno", "Guerreiro do norte", "#bec6ff"],
  Mirela: ["Carla", "Sacerdotisa de Selene", "#ecc484"],
  Sef: ["Diego", "Aprendiz de mago", "#bfadf1"],
}

const quests: [string, string, string, string, string][] = [
  ["Descobrir quem solta os lobos", "ativa", "1", "Conde Ormund", "200 moedas"],
  ["Recuperar o grimório de Sef", "ativa", "1.1", "", ""],
  ["Entregar a carta selada", "pausada", "2", "Aldren Vael", ""],
  ["O culto do reflexo", "ideia", "3", "", ""],
  ["A torre de Vesper", "ideia", "4", "", ""],
  ["Escoltar a caravana de sal", "concluida", "0.5", "", "Favor de Marta"],
  ["Salvar o ferreiro", "falhou", "0.7", "", ""],
]

// Quadro no formato do Obsidian (tabs, sem quebra de linha no fim).
const board = JSON.stringify(
  {
    nodes: [
      { id: "a0c1e2f3a4b5c6d7", type: "group", x: -20, y: -40, width: 600, height: 320, label: "Ato 2 — A carta" },
      { id: "b1d2e3f4a5b6c7d8", type: "file", file: `${W}/Personagens/Aldren Vael.md`, x: 0, y: 0, width: 240, height: 120 },
      { id: "c2e3f4a5b6c7d8e9", type: "text", text: "**A carta selada**\n\nPede a prisão de Aldren. Quem a escreveu?", x: 320, y: 0, width: 240, height: 110, color: "3" },
      { id: "d3f4a5b6c7d8e9f0", type: "file", file: `${W}/Personagens/Conde Ormund.md`, x: 0, y: 150, width: 240, height: 110 },
      { id: "e4a5b6c7d8e9f0a1", type: "text", text: "**Escolha do grupo**\n\nEntregar a carta, queimar ou mostrar ao Aldren.", x: 320, y: 150, width: 240, height: 110 },
      { id: "f5b6c7d8e9f0a1b2", type: "text", text: "**Final A**\n\nAldren foge para a Torre de Vesper.", x: 660, y: 40, width: 240, height: 90, color: "6" },
      { id: "a6c7d8e9f0a1b2c3", type: "text", text: "**Final B**\n\nO Conde ganha a Ordem como aliada.", x: 660, y: 180, width: 240, height: 90, color: "1" },
    ],
    edges: [
      { id: "0a1b2c3d4e5f6a7b", fromNode: "b1d2e3f4a5b6c7d8", fromSide: "right", toNode: "c2e3f4a5b6c7d8e9", toSide: "left", label: "é alvo de" },
      { id: "1b2c3d4e5f6a7b8c", fromNode: "d3f4a5b6c7d8e9f0", fromSide: "right", toNode: "c2e3f4a5b6c7d8e9", toSide: "left", label: "escreveu?" },
      { id: "2c3d4e5f6a7b8c9d", fromNode: "c2e3f4a5b6c7d8e9", fromSide: "bottom", toNode: "e4a5b6c7d8e9f0a1", toSide: "top" },
      { id: "3d4e5f6a7b8c9d0e", fromNode: "e4a5b6c7d8e9f0a1", fromSide: "right", toNode: "f5b6c7d8e9f0a1b2", toSide: "left", label: "queimar" },
      { id: "4e5f6a7b8c9d0e1f", fromNode: "e4a5b6c7d8e9f0a1", fromSide: "right", toNode: "a6c7d8e9f0a1b2c3", toSide: "left", label: "entregar" },
    ],
  },
  null,
  "\t",
)

const q = (value: string) => JSON.stringify(value)

/** Os arquivos das campanhas de exemplo (caminho → texto). */
export function campaignDemoFiles(): Record<string, string> {
  const files: Record<string, string> = { [`${C}/As Cinzas de Valdris.md`]: home, [`${C}/Quadro.canvas`]: board }
  for (const [name, text] of Object.entries(sessions)) files[`${C}/Sessões/${name}.md`] = text
  for (const [name, [player, concept, color]] of Object.entries(players)) {
    files[`${C}/Personagens/${name}.md`] = `---\ntipo: personagem-jogador\njogador: ${player}\nconceito: ${q(concept)}\ncor: ${q(color)}\n---\n# ${name}\n\n## Antecedentes\n`
  }
  for (const [title, status, order, giver, reward] of quests) {
    const props = [`tipo: missao`, `status: ${status}`, `ordem: ${q(order)}`, ...(giver ? [`contratante: ${q(`[[${W}/Personagens/${giver}|${giver}]]`)}`] : []), ...(reward ? [`recompensa: ${q(reward)}`] : [])]
    files[`${C}/Missões/${title}.md`] = `---\n${props.join("\n")}\n---\n# ${title}\n`
  }
  files["Campanhas/Coroa Partida/Coroa Partida.md"] = `---\ntipo: campanha\nstatus: pausada\nresumo: "Intriga palaciana na Era das Migrações. Pausada até janeiro."\nwiki: Ordem x Caos\n---\n# Coroa Partida\n`
  files["Campanhas/Coroa Partida/Sessões/Sessão 3.md"] = `---\ntipo: sessao\nnumero: 3\nstatus: realizada\ndata: "2026-08-22"\nhora: "20:00"\n---\n# Sessão 3 — O herdeiro falso\n\n## O que aconteceu\n\nO herdeiro foi desmascarado no baile.\n`
  files["Campanhas/A Cripta (one-shot)/A Cripta (one-shot).md"] = `---\ntipo: campanha\nstatus: concluida\nresumo: "Aventura de uma noite para novos jogadores."\n---\n# A Cripta\n`
  files["Campanhas/A Cripta (one-shot)/Sessões/Sessão 1.md"] = `---\ntipo: sessao\nnumero: 1\nstatus: realizada\ndata: "2026-07-04"\n---\n# Sessão 1 — A Cripta\n`
  return files
}
