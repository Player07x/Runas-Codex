import type { Book } from "./types"

const capitulo1 = `# Capítulo 1 — O Condado de Valdris

<span class="capitular">O</span> condado de Valdris ocupa o vale entre as Montanhas Cinzentas e o Lago Espelhado. Desde a Queda de Myrr, as cinzas caem todo outono e cobrem os telhados de um cinza que nunca sai por completo.

> [!descritivo] Leia em voz alta
> A estrada sobe entre pinheiros queimados. Lá embaixo, Valdris parece uma brasa apagada: muros escuros, torres finas e fumaça subindo da Cidade Alta.

## Como usar este capítulo

Este capítulo apresenta a região para o mestre. Os trechos em caixa podem ser lidos para os jogadores; o resto é material de referência.

> [!nota] Para o mestre
> Use a tabela de rumores abaixo sempre que o grupo passar uma noite numa taverna.

<div class="quebra-coluna"></div>

### Rumores em Valdris

| d6 | Rumor |
|:--:|:--|
| 1 | Lobos de brasa saem dos esgotos à noite. |
| 2 | O Conde não sai do palácio há um mês. |
| 3 | Um cavaleiro de luva negra vigia o lago. |
| 4 | A Ordem procura uma espada perdida. |
| 5 | O hidromel do Corvo Manco cura queimaduras. |
| 6 | Na cheia de Morr, o lago mostra Myrr inteira. |

> [!statblock] Lobo de Cinzas
> *Fera média, hostil*
>
> **Defesa** 13 · **Vida** 22 · **Deslocamento** 12 m
>
> **Mordida em brasa.** 1d8 de dano + 1d4 de fogo.
> **Matilha.** Vantagem se um aliado estiver adjacente ao alvo.

<div class="quebra-pagina"></div>

## Lugares importantes

**Cidade Alta.** Palácio do Conde Ormund, guardado dia e noite. Visitantes precisam de um selo da guarda.

**Mercado das Brasas.** Barracas de ferreiros, ervas e contrabando. A taverna *O Corvo Manco* fica no centro do mercado.

**Portão do Lago.** A única saída para o norte. Fecha ao pôr do sol desde que os lobos apareceram[^lobos].

[^lobos]: Ver o bestiário no capítulo 4.
`

export const BOOKS: Book[] = [
  {
    id: "guia-valdris",
    title: "Guia do Condado de Valdris",
    subtitle: "Suplemento para Ordem x Caos",
    theme: "Manual de RPG",
    page: "A4",
    goal: 40000,
    chapters: [
      { id: "c0", title: "Créditos e sumário", part: "Abertura", words: 320, status: "pronto", markdown: "# Créditos" },
      { id: "c1", title: "O Condado de Valdris", part: "Parte I — O lugar", words: 4820, status: "revisão", markdown: capitulo1 },
      { id: "c2", title: "A Cidade Alta", part: "Parte I — O lugar", words: 3150, status: "rascunho", markdown: "# A Cidade Alta" },
      { id: "c3", title: "O Lago Espelhado", part: "Parte I — O lugar", words: 1980, status: "rascunho", markdown: "# O Lago Espelhado" },
      { id: "c4", title: "Bestiário das Cinzas", part: "Parte II — Ameaças", words: 6230, status: "revisão", markdown: "# Bestiário das Cinzas" },
      { id: "c5", title: "Aventura: Os Esgotos de Brasa", part: "Parte III — Aventuras", words: 7410, status: "rascunho", markdown: "# Os Esgotos de Brasa" },
    ],
  },
  {
    id: "livro-casa",
    title: "Regras da Casa",
    subtitle: "Ajustes usados na mesa",
    theme: "Minimalista",
    page: "A5",
    goal: 5000,
    chapters: [
      { id: "h1", title: "Combate", part: "Regras", words: 1200, status: "pronto", markdown: "# Combate" },
      { id: "h2", title: "Descanso e viagem", part: "Regras", words: 900, status: "rascunho", markdown: "# Descanso" },
    ],
  },
]
