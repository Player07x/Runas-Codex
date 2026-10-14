import type { Note } from "./types"

/** Espaço "Notas": bloco de notas livre, isolado da wiki e das campanhas. */
export const NOTES: Note[] = [
  {
    id: "ideias-soltas",
    title: "Ideias soltas",
    space: "notas",
    path: "Notas/Ideias soltas.md",
    tags: ["ideia"],
    updated: "2026-10-13T08:12:00",
    pinned: true,
    color: "gold",
    markdown: `# Ideias soltas

- Um culto que venera o reflexo do [[Wikis/Ordem x Caos/Locais/Lago Espelhado|Lago Espelhado]] #ideia
- NPC: ferreira cega que reconhece armas pelo som
- Encontro aleatório: carroça de cinzas puxada por um boi sem olhos
- [ ] Transformar o culto numa missão para a sessão 13

> [!dica] Ligar com a campanha
> Usar o culto como gancho em [[Campanhas/As Cinzas de Valdris/Sessões/Sessão 12|Sessão 12]].
`,
  },
  {
    id: "checklist-sabado",
    title: "Checklist de sábado",
    space: "notas",
    path: "Notas/Checklist de sábado.md",
    tags: ["tarefa"],
    updated: "2026-10-12T22:30:00",
    pinned: true,
    color: "cyan",
    markdown: `# Checklist de sábado

- [x] Imprimir o mapa da Cidade Alta
- [x] Separar miniaturas dos lobos
- [ ] Comprar pilhas para o leitor de dados 📅 2026-10-17
- [ ] Mandar o lembrete no grupo 📅 2026-10-16
- [ ] Preparar trilha da taverna
`,
  },
  {
    id: "regras-da-casa",
    title: "Regras da casa",
    space: "notas",
    path: "Notas/Regras da casa.md",
    tags: ["regras"],
    updated: "2026-10-01T19:00:00",
    color: "red",
    markdown: `# Regras da casa

| Regra | Como funciona |
|:--|:--|
| Crítico | Dano máximo + rolagem extra |
| Descanso | Só em local seguro |
| Atraso | Personagem chega "atrasado" na cena |

Combinado na sessão zero[^1].

[^1]: Ver [[2026-10-13|nota do dia]].
`,
  },
  {
    id: "2026-10-13",
    title: "2026-10-13",
    space: "notas",
    path: "Notas/Diário/2026-10-13.md",
    tags: ["diario"],
    updated: "2026-10-13T09:30:00",
    markdown: `# Terça, 13 de outubro de 2026

- Revisar o plano do Runas-Codex
- Pensar nos lobos da sessão 12 — ver [[Wikis/Ordem x Caos/Criaturas/Lobo de Cinzas|Lobo de Cinzas]]
`,
  },
  {
    id: "corvo-manco",
    title: "Rascunho — O Corvo Manco",
    space: "notas",
    path: "Notas/Rascunho — O Corvo Manco.md",
    tags: ["rascunho", "taverna"],
    updated: "2026-09-28T14:00:00",
    color: "violet",
    markdown: `# O Corvo Manco

Taverna no Mercado das Brasas. Dona: **Marta Fuligem**, ex-contrabandista.

- Prato da casa: ensopado de raiz-de-cinza
- Bebida: hidromel "Lua Vermelha" (\`dice: 1d6\` para ver quem aguenta)
`,
  },
  {
    id: "guia-formatacao",
    title: "Guia de formatação",
    space: "notas",
    path: "Notas/Guia de formatação.md",
    tags: ["referencia"],
    updated: "2026-10-13T10:00:00",
    markdown: `# Guia de formatação

Todos os formatadores do Runas-Codex numa nota só.

## Texto

**Negrito**, *itálico*, ***os dois***, ~~tachado~~, ==destaque==, \`código\`, <u>sublinhado</u>, x<sup>2</sup>, H<sub>2</sub>O, <span style="font-variant: small-caps">versalete</span>, <span style="color: #c76561">cor</span>, <span style="font-family: 'Cinzel'">outra fonte</span>, <span style="font-size: 1.3em">maior</span>, <kbd>Ctrl</kbd> + <kbd>K</kbd>. %%Comentário que só aparece no código-fonte.%%

<p align="center">Parágrafo centralizado</p>

## Listas

1. Primeiro
   - Aninhado
     - Mais fundo
2. Segundo
- [x] Tarefa feita
- [ ] Tarefa pendente

## Links

[[Ideias soltas]] · [[Ideias soltas#Ligar com a campanha|título]] · [[Nota que não existe]] · [site](https://example.com) · #tag/aninhada

## Blocos

> Citação
>> aninhada

> [!nota] Callout
> Com **Markdown** dentro.

> [!aviso]+ Callout que dobra
> Clique no título.

\`\`\`ts
const rolagem = "2d6+3"
\`\`\`

$$ CA = 10 + \\text{Destreza} $$

\`\`\`mermaid
graph LR; Aldren --> Ordem
\`\`\`

<details><summary>Seção recolhível</summary>Conteúdo escondido.</details>

---

Nota de rodapé[^a] e rolagem \`dice: 1d20+5\`.

[^a]: Texto do rodapé.
`,
  },
]
