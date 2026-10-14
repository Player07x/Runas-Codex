# ADR 0007 — Editor completo: leitor, live preview, modelos e gráfico

- **Status:** aceita (2026-10-14)

## Contexto
Etapa 3b (docs/02, seção 8): live preview, transclusão, **todos os formatadores** (checklist, seção E.1), gráfico em
WebGL e modelos. Pronto quando a nota de teste com todos os formatadores aparece igual no app e no Obsidian. O risco
apontado no plano é ter dois leitores de Markdown (editor e leitura) discordando.

## Decisão
**Um leitor, num documento só** (`app/src/components/Markdown.tsx`): remark com CommonMark, GFM e matemática, mais dois
plugins próprios — `remarkBlocks` (callouts `> [!tipo]` com dobra, metadados e aninhamento; contêineres `::: nome`) e
`remarkObsidian` (wikilinks, embeds, tags com as regras do Obsidian, `==destaque==`, `^[rodapé inline]`, `^bloco`,
`{.classe}`, abreviações, listas de definição, `:emoji:`). Por trabalharem sobre a árvore, nada acontece dentro de
código, matemática ou HTML. O HTML das notas passa pela sanitização (sem script, sem eventos); `style` e `class` ficam
porque o dialeto aprovado usa. KaTeX e Mermaid só carregam quando a nota usa; o realce de código usa highlight.js.

**Transclusão** pelo mesmo leitor: nota, `#seção`, `#seção#subseção` e `#^bloco` (`core/sections.ts`, com as regras
do Obsidian), com limite de profundidade e parada em laço. Anexos (imagem, áudio, vídeo) vêm por um protocolo próprio
do desktop, `vault-file://`, que só serve tipos de mídia, nada em pastas com ponto e nada fora do cofre; PDF abre no
leitor do sistema. Imagens da internet não carregam (o app não faz chamadas de rede fora da mesa).

**Live preview** no CodeMirror 6 (`components/vault/live-preview.tsx`), sem segundo leitor de Markdown para os blocos:
- o parser do editor ganha a sintaxe do Obsidian (`markdown/lezer-obsidian.ts`);
- fora do cursor, as marcas somem (títulos, ênfases, links, citações, listas, tarefas clicáveis);
- tabelas, callouts, HTML, fórmulas, Mermaid, sumário, embeds sozinhos na linha e o frontmatter viram widgets
  desenhados pelo **mesmo** `Markdown` do modo leitura; clicar põe o cursor no bloco e mostra o código.
Os três modos do Obsidian: Leitura, Editar (live preview) e Código.

**Modelos** com as variáveis do plugin Templates do Obsidian (e os nomes em português), lendo
`.obsidian/templates.json` e `.obsidian/daily-notes.json`. Ao inserir, as propriedades do modelo entram no frontmatter
sem trocar as da nota.

**Gráfico em WebGL**: dados em TypeScript puro (`core/graph-data.ts`, testado) e desenho em PixiJS 8 com d3-force.
Notas de outro espaço aparecem como portais (losangos). Filtros, grupos de cor, forças, setas e o gráfico local com
profundidade.

**Snippet do Obsidian** (`markdown/runas-codex.css`), instalado por Configurações em
`.obsidian/snippets/runas-codex.css` — o único arquivo que o app grava dentro de `.obsidian`.

## Consequências
- A nota `Notas/Formatadores.md` (cofre de teste do desktop e exemplo do navegador) é o teste de aceitação: os testes
  renderizam cada formatador e o `--smoke` abre a nota com a CSP real (KaTeX, Mermaid, anexos, transclusão, rodapés).
- Itens que o Obsidian não tem (`{.classe}`, `:::`, listas de definição, abreviações, `:emoji:`) aparecem como texto
  comum lá; a nota de teste os separa em "Só no Runas-Codex".
- O sumário automático usa o bloco ```` ```table-of-contents ```` do plugin Automatic Table of Contents; sem o plugin,
  o Obsidian mostra um bloco de código vazio. Rolagem `dice:` segue o plugin Dice Roller.
- Ficam para depois: timelapse do gráfico, prévia de link por hover, comandos `/`, `@` para linkar, abas e painéis.
- A CSP passa a aceitar `vault-file:` em imagens e mídia e `data:` em fontes (o KaTeX embute as menores).
