import type { WikiArticle } from "./types"

/** Wiki de exemplo. Os nomes são fictícios e servem só para o protótipo. */
export const WIKI = {
  id: "ordem-x-caos",
  title: "Ordem x Caos",
  path: "Wikis/Ordem x Caos",
  description: "Mundo das campanhas do Livro Vermelho. Dados de exemplo do protótipo.",
}

export const WIKIS = [
  WIKI,
  { id: "sagas-de-cronos", title: "Sagas de Cronos", path: "Wikis/Sagas de Cronos", description: "Segunda wiki, para mostrar a troca entre wikis." },
]

export const CATEGORIES = [
  { id: "Personagens", icon: "user", color: "var(--gold)" },
  { id: "Locais", icon: "map-pin", color: "var(--green)" },
  { id: "Organizações", icon: "shield", color: "var(--cyan)" },
  { id: "Itens", icon: "gem", color: "var(--violet)" },
  { id: "Criaturas", icon: "paw", color: "var(--red)" },
  { id: "Acontecimentos", icon: "flame", color: "var(--gold)" },
  { id: "Calendários", icon: "calendar", color: "var(--cyan)" },
  { id: "Religiões", icon: "sun", color: "var(--violet)" },
] as const

const p = (name: string) => `${WIKI.path}/${name}.md`

export const ARTICLES: WikiArticle[] = [
  {
    id: "aldren-vael",
    title: "Aldren Vael",
    aliases: ["Aldren", "o Cinzento"],
    space: "wiki",
    path: p("Personagens/Aldren Vael"),
    kind: "personagem",
    category: "Personagens",
    summary: "Cavaleiro renegado da Ordem da Chama Cinzenta, guardião da Lâmina de Obsidiana.",
    tags: ["personagem", "npc/aliado", "ordem-da-chama"],
    updated: "2026-10-12T21:40:00",
    worldDate: "3999-02-12",
    infobox: [
      { label: "Raça", value: "Humano" },
      { label: "Nascimento", value: "", worldDate: "3999-02-12" },
      { label: "Afiliação", value: "[[Ordem da Chama Cinzenta]]" },
      { label: "Residência", value: "[[Valdris]]" },
      { label: "Status", value: "Vivo" },
    ],
    markdown: `---
tipo: personagem
calendario: "[[Calendário de Ordem x Caos]]"
nascimento_mundo: "3999-02-12"
especie: Humano
ocupacao: Cavaleiro renegado
residencia: "[[Valdris]]"
status: Vivo
relacoes: ["[[Ordem da Chama Cinzenta]] (ex-membro)", "[[Lâmina de Obsidiana]] (guardião)"]
aliases: [Aldren, o Cinzento]
tags: [personagem, npc/aliado, ordem-da-chama]
---
# Aldren Vael

**Aldren Vael**, chamado *o Cinzento*, foi cavaleiro da [[Ordem da Chama Cinzenta]] até a [[A Queda de Myrr|Queda de Myrr]]. Hoje vive à margem de [[Valdris]], vigiando a estrada do [[Lago Espelhado]]. #npc/aliado

> [!descritivo] Primeira impressão
> Um homem alto, de armadura fosca, que nunca tira a luva da mão esquerda. Fala pouco e olha sempre para o norte.

## História

Nascido numa família de ferreiros, Aldren entrou para a Ordem aos 14 anos. Carrega a ==Lâmina de Obsidiana== desde que o antigo mestre morreu em Myrr — ver [[Lâmina de Obsidiana]].

- Serviu como escudeiro de [[Conde Ormund]]
  - Rompeu com ele depois de Myrr
- Conhece o caminho até a [[Torre de Vesper]]

> [!segredo] Só o mestre vê
> A mão esquerda de Aldren está tomada pela corrupção de Morr. Se a lua vermelha ficar cheia durante uma luta, ele perde o controle por \`dice: 1d4\` rodadas.

## Relações

| Quem | Relação | Atitude |
|:--|:--|:--:|
| [[Conde Ormund]] | antigo senhor | hostil |
| [[Ordem da Chama Cinzenta]] | ex-membro | tensa |
| Ilsa (jogadora) | dívida de vida | aliada |

> [!aviso]- Spoiler da campanha
> Aldren é o filho bastardo do Conde.

%% Lembrar: decidir se ele aparece na sessão 12 %%
`,
  },
  {
    id: "valdris",
    title: "Valdris",
    space: "wiki",
    path: p("Locais/Valdris"),
    kind: "cidade",
    category: "Locais",
    summary: "Capital do condado, construída sobre as ruínas de uma fortaleza dos Magos.",
    tags: ["local/cidade"],
    updated: "2026-10-11T18:05:00",
    infobox: [
      { label: "Tipo", value: "Cidade murada" },
      { label: "População", value: "42.000" },
      { label: "Governante", value: "[[Conde Ormund]]" },
      { label: "Fundação", value: "", worldDate: "3655-05-01" },
    ],
    markdown: `---
tipo: cidade
calendario: "[[Calendário de Ordem x Caos]]"
localizado_em: "[[Lago Espelhado]]"
governante: "[[Conde Ormund]]"
populacao: 12000
fundacao_mundo: "3712-05-10"
aliados: ["[[Ordem da Chama Cinzenta]]"]
---
# Valdris

Capital do condado, erguida sobre a fortaleza de um mago da [[Era dos Magos]]. As cinzas da [[A Queda de Myrr|Queda de Myrr]] ainda cobrem os telhados no outono. #local/cidade

## Distritos

1. **Cidade Alta** — palácio de [[Conde Ormund]]
2. **Mercado das Brasas** — onde a taverna O Corvo Manco fica
3. **Portão do Lago** — saída para o [[Lago Espelhado]]

> [!nota] Ganchos
> - Uma carta com o selo da [[Ordem da Chama Cinzenta]] chega à guarda.
> - Mendigos falam de lobos cinzentos nos esgotos — ver [[Lobo de Cinzas]].
`,
  },
  {
    id: "ordem-chama-cinzenta",
    title: "Ordem da Chama Cinzenta",
    space: "wiki",
    path: p("Organizações/Ordem da Chama Cinzenta"),
    kind: "organizacao",
    category: "Organizações",
    summary: "Ordem de cavaleiros que guarda relíquias da Era dos Magos.",
    tags: ["organizacao", "ordem-da-chama"],
    updated: "2026-10-09T10:00:00",
    infobox: [
      { label: "Tipo", value: "Ordem militar" },
      { label: "Sede", value: "[[Valdris]]" },
      { label: "Líder", value: "Grão-mestre Ilário" },
      { label: "Fundação", value: "", worldDate: "3890-01-01" },
    ],
    markdown: `---
tipo: organizacao
calendario: "[[Calendário de Ordem x Caos]]"
sede: "[[Valdris]]"
fundacao_mundo: "3895-02-01"
objetivo: Guardar as lâminas forjadas em Myrr
em_guerra_com: ["[[Culto de Morr]]"]
---
# Ordem da Chama Cinzenta

Guardiões de relíquias da [[Era dos Magos]]. Desde a [[A Queda de Myrr|Queda de Myrr]] estão divididos.

> [!nota] Membros conhecidos
> - [[Aldren Vael]] (ex-membro)
> - Grão-mestre Ilário

Relíquias sob guarda: [[Lâmina de Obsidiana]] (perdida).
`,
  },
  {
    id: "lamina-obsidiana",
    title: "Lâmina de Obsidiana",
    space: "wiki",
    path: p("Itens/Lâmina de Obsidiana"),
    kind: "item",
    category: "Itens",
    summary: "Espada forjada com vidro vulcânico de Myrr. Absorve luz.",
    tags: ["item/reliquia"],
    updated: "2026-10-07T15:20:00",
    infobox: [
      { label: "Tipo", value: "Espada longa (relíquia)" },
      { label: "Portador", value: "[[Aldren Vael]]" },
      { label: "Forjada em", value: "", worldDate: "3201-09-30" },
    ],
    markdown: `---
tipo: item
calendario: "[[Calendário de Ordem x Caos]]"
dono_atual: "[[Aldren Vael]]"
raridade: Lendária
criacao_mundo: "3880-11-02"
---
# Lâmina de Obsidiana

Forjada na [[Era dos Magos]] com vidro de Myrr. Hoje com [[Aldren Vael]].

> [!statblock] Lâmina de Obsidiana
> **Dano** 1d10 · **Alcance** corpo a corpo
> **Propriedade** apaga chamas não mágicas num raio de 3 m.
`,
  },
  {
    id: "queda-de-myrr",
    title: "A Queda de Myrr",
    space: "wiki",
    path: p("Acontecimentos/A Queda de Myrr"),
    kind: "acontecimento",
    category: "Acontecimentos",
    summary: "Erupção que destruiu a cidade de Myrr e espalhou cinzas sobre o condado.",
    tags: ["acontecimento"],
    updated: "2026-10-05T09:00:00",
    worldDate: "4012-03-09",
    infobox: [
      { label: "Data", value: "", worldDate: "4012-03-09" },
      { label: "Local", value: "Myrr (destruída)" },
      { label: "Mortos", value: "≈ 9.000" },
    ],
    markdown: `---
tipo: acontecimento
calendario: "[[Calendário de Ordem x Caos]]"
data_mundo: "4027-07-01"
data_fim_mundo: "4027-07-03"
trilha: "[[Ordem da Chama Cinzenta]]"
envolvidos: ["[[Aldren Vael]]", "[[Conde Ormund]]"]
---
# A Queda de Myrr

Em 9 de Semeadura de 4012 C.E. o vulcão sob Myrr despertou. A [[Ordem da Chama Cinzenta]] perdeu metade dos cavaleiros, e [[Aldren Vael]] saiu de lá com a [[Lâmina de Obsidiana]].
`,
  },
  {
    id: "conde-ormund",
    title: "Conde Ormund",
    space: "wiki",
    path: p("Personagens/Conde Ormund"),
    kind: "personagem",
    category: "Personagens",
    summary: "Senhor de Valdris. Velho, desconfiado e endividado com a Ordem.",
    tags: ["personagem", "npc/antagonista"],
    updated: "2026-10-10T20:00:00",
    worldDate: "3968-05-03",
    infobox: [
      { label: "Raça", value: "Humano" },
      { label: "Nascimento", value: "", worldDate: "3968-05-03" },
      { label: "Título", value: "Conde de [[Valdris]]" },
      { label: "Status", value: "Vivo" },
    ],
    markdown: `---
tipo: personagem
calendario: "[[Calendário de Ordem x Caos]]"
nascimento_mundo: "3975-09-03"
ocupacao: Conde de Valdris
residencia: "[[Valdris]]"
filhos: ["[[Edric Ormund]]"]
conjuges: ["[[Ilyra Ormund]]"]
lider_de: "[[Ordem da Chama Cinzenta]]"
inimigos: ["[[Aldren Vael]] (hostil)"]
---
# Conde Ormund

Governa [[Valdris]] há trinta anos. Foi senhor de [[Aldren Vael]]. #npc/antagonista
`,
  },
  {
    id: "lobo-de-cinzas",
    title: "Lobo de Cinzas",
    space: "wiki",
    path: p("Criaturas/Lobo de Cinzas"),
    kind: "criatura",
    category: "Criaturas",
    summary: "Lobos cobertos de brasa que surgiram depois de Myrr.",
    tags: ["criatura"],
    updated: "2026-10-03T11:00:00",
    infobox: [
      { label: "Habitat", value: "Ruínas de Myrr, esgotos de [[Valdris]]" },
      { label: "Perigo", value: "Moderado" },
    ],
    markdown: `---
tipo: especie
habitat: "[[Lago Espelhado]]"
dieta: Carniça e brasas
---
# Lobo de Cinzas

Surgiram depois da [[A Queda de Myrr|Queda de Myrr]]. Caçam em matilhas perto do [[Lago Espelhado]].
`,
  },
  {
    id: "lago-espelhado",
    title: "Lago Espelhado",
    space: "wiki",
    path: p("Locais/Lago Espelhado"),
    kind: "local",
    category: "Locais",
    summary: "Lago de águas imóveis ao norte de Valdris. Reflete as duas luas mesmo de dia.",
    tags: ["local"],
    updated: "2026-10-02T08:00:00",
    infobox: [
      { label: "Região", value: "Norte de [[Valdris]]" },
      { label: "Perigo", value: "Baixo (de dia)" },
    ],
    markdown: `---
tipo: local
tipo_de_local: Lago
localizado_em: "[[Valdris]]"
perigo: Reflexos que mostram Myrr
---
# Lago Espelhado

Ao norte de [[Valdris]]. Dizem que na cheia de Morr o reflexo mostra Myrr antes da queda.
`,
  },
  {
    id: "era-dos-magos",
    title: "Era dos Magos",
    space: "wiki",
    path: p("Acontecimentos/Era dos Magos"),
    kind: "era",
    category: "Acontecimentos",
    summary: "3.122 a 3.888 C.E. Época das grandes fortalezas arcanas.",
    tags: ["era"],
    updated: "2026-09-30T08:00:00",
    infobox: [
      { label: "Início", value: "3.122 C.E." },
      { label: "Fim", value: "3.888 C.E." },
    ],
    markdown: `---
tipo: era
calendario: "[[Calendário de Ordem x Caos]]"
data_mundo: "3122-01-01"
data_fim_mundo: "3887-10-36"
trilha: Eras
---
# Era dos Magos

De 3.122 a 3.888 C.E. Deixou fortalezas como a que está sob [[Valdris]] e relíquias como a [[Lâmina de Obsidiana]].
`,
  },
  {
    id: "calendario-oxc",
    title: "Calendário de Ordem x Caos",
    space: "wiki",
    path: p("Calendários/Calendário de Ordem x Caos"),
    kind: "calendario",
    category: "Calendários",
    summary: "10 meses de 36 dias, 5 Dias de Logi, semana de 6 dias, duas luas.",
    tags: ["calendario"],
    updated: "2026-10-13T09:00:00",
    infobox: [
      { label: "Meses", value: "10 × 36 dias" },
      { label: "Intercalares", value: "5 Dias de Logi" },
      { label: "Semana", value: "6 dias" },
      { label: "Luas", value: "Selene (28 d), Morr (45 d)" },
    ],
    markdown: `---
tipo: calendario
---
# Calendário de Ordem x Caos

Dez meses de 36 dias, os cinco Dias de Logi fora da semana (seis no ano bissexto), semana de seis dias e duas luas. A wiki inteira calcula datas por este bloco.

\`\`\`runas-calendario
nome: Calendário de Ordem x Caos
sufixo: C.E.
semana: [Pedra, Raiz, Chama, Vento, Maré, Sombra]
meses:
  - { nome: Gelo, dias: 36, estacao: Inverno }
  - { nome: Degelo, dias: 36, estacao: Inverno }
  - { nome: Semeadura, dias: 36, estacao: Primavera }
  - { nome: Brotos, dias: 36, estacao: Primavera }
  - { nome: Sol Alto, dias: 36, estacao: Verão }
  - { nome: Colheita, dias: 36, estacao: Verão }
  - { nome: Cinzas, dias: 36, estacao: Outono }
  - { nome: Brumas, dias: 36, estacao: Outono }
  - { nome: Longa Noite, dias: 36, estacao: Inverno }
  - { nome: Vigília, dias: 36, estacao: Inverno }
  - { nome: Dias de Logi, dias: 5, intercalar: true }
bissexto: { a_cada: 4, mes: Dias de Logi, dias: 1 }
luas:
  - { nome: Selene, ciclo: 28, cheia_em: "4031-01-04", cor: "#bec6ff" }
  - { nome: Morr, ciclo: 45, cheia_em: "4031-01-21", cor: "#ffa48e" }
eras:
  - { nome: Era dos Magos, inicio: 3122 }
  - { nome: Era das Migrações, inicio: 3888 }
  - { nome: Era dos Caçadores, sigla: E.C., inicio: 4027 }
equivalentes:
  - { nome: Logi, deslocamento: 4027 }
feriados:
  - { nome: Festa das Cinzas, data: "07-01" }
  - { nome: Noite de Morr, data: "09-36" }
hoje: "4031-07-15"
\`\`\`
`,
  },
  {
    id: "edric-ormund",
    title: "Edric Ormund",
    space: "wiki",
    path: p("Personagens/Edric Ormund"),
    kind: "personagem",
    category: "Personagens",
    summary: "Filho do Conde, escudeiro da Ordem.",
    tags: ["personagem"],
    updated: "2026-10-14T08:00:00",
    infobox: [],
    markdown: `---
tipo: personagem
calendario: "[[Calendário de Ordem x Caos]]"
nascimento_mundo: "4010-04-18"
pais: ["[[Conde Ormund]]"]
membro_de: ["[[Ordem da Chama Cinzenta]]"]
subordinado_a: "[[Conde Ormund]]"
---
# Edric Ormund

Herdeiro de [[Valdris]], escudeiro da [[Ordem da Chama Cinzenta]]. Admira [[Aldren Vael]] sem saber por quê.
`,
  },
  {
    id: "culto-de-morr",
    title: "Culto de Morr",
    space: "wiki",
    path: p("Organizações/Culto de Morr"),
    kind: "organizacao",
    category: "Organizações",
    summary: "Seita que venera a lua vermelha.",
    tags: ["organizacao", "vilao"],
    updated: "2026-10-14T08:10:00",
    infobox: [],
    markdown: `---
tipo: organizacao
objetivo: Trazer Myrr de volta pela lua vermelha
paz_tensa_com: ["[[Valdris]]"]
---
# Culto de Morr

Seita que se reúne nas cheias de Morr. Em guerra aberta com a [[Ordem da Chama Cinzenta]].

> [!segredo]
> O covil fica sob as raízes da floresta do leste (pino secreto no mapa do condado).
`,
  },
  {
    id: "mapa-condado",
    title: "Condado de Valdris",
    space: "wiki",
    path: p("Mapas/Condado de Valdris"),
    kind: "mapa",
    category: "Mapas",
    summary: "Mapa do condado com Valdris, o Lago Espelhado e as ruínas de Myrr.",
    tags: ["mapa"],
    updated: "2026-10-14T08:20:00",
    infobox: [],
    markdown: `---
tipo: mapa
---
# Condado de Valdris

\`\`\`runas-mapa
imagem: "[[mapa-condado-de-valdris.svg]]"
camadas: [Locais, Perigos, Segredos]
escala: { pixels: 100, distancia: 10, unidade: km }
viagem: { por_dia: 30 }
pinos:
  - { nota: "[[Valdris]]", x: 0.52, y: 0.59, camada: Locais }
  - { nota: "[[Lago Espelhado]]", x: 0.47, y: 0.36, camada: Locais }
  - { nota: "[[A Queda de Myrr]]", x: 0.2, y: 0.33, camada: Perigos }
  - { nota: "[[Lobo de Cinzas]]", x: 0.15, y: 0.62, camada: Perigos }
  - { nota: "[[Culto de Morr]]", rotulo: Covil do culto, x: 0.82, y: 0.78, camada: Segredos }
\`\`\`
`,
  },
]

