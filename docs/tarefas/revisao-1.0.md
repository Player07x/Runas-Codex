# Revisão para a 1.0 (R1) — 30/10/2026

**Base:** `main` da beta.21 (`f6f28dc`) mais os commits desta branch (geradores, T6). **Feita por:** Claude Code, numa
sessão na nuvem (Linux, Chromium sem placa de vídeo, Node 22 e 24), a pedido do dono. **Roteiro:**
[`rumo-a-1.0.md`](rumo-a-1.0.md) (R1) e [`revisao-completa-complementar.md`](revisao-completa-complementar.md), com o
critério de [`docs/ux-ui-acessibilidade.md`](../ux-ui-acessibilidade.md).

> A R1 era do Codex e pede um aparelho Android. Este ambiente não tem aparelho nem emulador, então tudo o que depende
> do Android, de leitor de tela real, de impressão ou de dois aparelhos na sala está marcado como **não verificado**. A
> parte que dá para medir automaticamente foi medida em todas as telas.

## Como foi feito

1. `npm run dev` com o cofre de exemplo e um script do Playwright que descobre as rotas pelos links da própria
   interface: **49 telas** (Início, Notas e notas abertas, Gráfico, Agenda, Wiki com artigos, categorias, calendário,
   linha do tempo e mapas, as seis telas de uma campanha e uma sessão, Livros, VTT, Importar e exportar, as dez seções
   de Configurações e a Ajuda).
2. Cada tela em **320 px, tablet (768 px) e desktop (1.280 px)**, nos temas **escuro e claro**: 294 páginas.
3. Em cada página: rolagem para os lados, erros no console, título da página (`document.title`), `aria-current`,
   quantidade de `h1`, alvos de toque menores que 44 px no celular e a varredura **axe-core 4.10** com as regras WCAG 2.0,
   2.1 e 2.2 A/AA (em 320 px e desktop).
4. Cofre de 10 mil notas (`?cofre-grande=10000`) para lista, árvore, busca e gráfico (T6, números na ADR 0030).
5. `npm run typecheck`, `npm test` (Node 24: 765 passaram, 5 pulados), `npm run build`, `npm run desktop:build` e o
   smoke do Electron com `xvfb-run` (resultado na seção “Desktop”).

## Matriz

| Área | Situação | Observação |
| --- | --- | --- |
| Reflow em 320 px, tablet e desktop (49 telas, 2 temas) | passou | Nenhuma página com rolagem lateral. |
| Erros no console ao abrir cada tela | passou | Nenhum erro em 294 páginas. |
| Título por rota | passou | Todas as rotas têm título próprio; nenhum repetido. |
| `aria-current` na navegação | passou | Presente em todas as telas. |
| Papéis ARIA (abas e seletores segmentados) | defeito reproduzido → **corrigido (T7)** | D1, D2. |
| Controle dentro de controle | defeito reproduzido → **corrigido (T7)** | D3, D4. |
| Contraste nos dois temas | defeito reproduzido → **corrigido (T7)** | D5. O teste `tokens.test.ts` cobre os tokens; o defeito vinha de cor escrita no dado. |
| Alvos de toque (24 px WCAG; 44 px no celular) | defeito reproduzido → **corrigido em parte (T7)** | D6–D9; sobra D13. |
| Painel do gráfico das Notas | defeito reproduzido → **corrigido (T7)** | D10. |
| Cofre de 10 mil notas | defeito reproduzido → **corrigido (T6)** | Lista, busca e gráfico; ver ADR 0030. |
| Estrutura de títulos (`h1`) nas telas de documento | defeito reproduzido, **aberto** | D11. |
| Teste de regex da busca no Node 22 | defeito do ambiente | D12. No Node 24, o do projeto, passa. |
| Campanhas (painel, sessões, missões, elenco, ferramentas, quadro) | revisado à parte | [`../propostas/campanhas-revisao.html`](../propostas/campanhas-revisao.html): 7 bugs, 5 de acessibilidade, 20 de UX. Ainda abertos. |
| Foco, Tab, Esc e retorno de foco nos diálogos | não verificado | Precisa de passeio manual por teclado; o axe não cobre. |
| Leitores de tela reais (Orca, NVDA, TalkBack) | não verificado por falta de ambiente | |
| Texto a 85/100/140 % e redução de movimento | não verificado | Só a configuração padrão foi varrida. |
| Android: SAF, permissões, teclado, voltar, rotação, entalhes, tela dividida, anexos, lembretes, widget | não verificado por falta de aparelho | |
| Sala real (dois jogadores, espectador, LAN, Carta X, diários, enquete) | não verificado por falta de aparelhos | |
| Livros: exportações abertas em leitores independentes e impressão física | não verificado | O smoke do Electron exporta; abrir as saídas fica para o dono. |
| Multitoque físico no quadro e no VTT | não verificado por falta de aparelho | |
| Bandeja Linux/Windows, janelas de notas, instaladores | não verificado | Coberto pelo CI (workflow Release) e pela conferência do dono. |

## Defeitos

Severidade: **alta** impede o uso ou falha um critério A; **média** falha AA ou atrapalha bastante; **baixa** incomoda.
Todos são de **tela** (Claude Code, T7); nenhum é de núcleo, então a R2 não recebe nada desta rodada.

### D1 — Faixa de abas das notas com papel `tablist` inválido (média, corrigido)

- **Passos:** abrir uma nota em Notas; varrer com axe.
- **Esperado:** cada aba é um controle sem outros controles dentro.
- **Obtido:** `role="tab"` com os botões “Ações da aba” e “Fechar” dentro (aria-required-children e nested-interactive,
  críticos).
- **Arquivo:** `app/src/components/vault/TabPanes.tsx`.
- **Correção:** a faixa vira um grupo de botões; o nome da aba é um botão com `aria-current="page"` na aba aberta.

### D2 — Seletores segmentados com `role="tablist"` sem abas (média, corrigido)

- **Passos:** Notas › “Espaço Notas / Cofre inteiro”; painel da nota › Gráfico local › profundidade; diálogo de busca
  › “Este espaço / Todos”.
- **Obtido:** `tablist` com botões comuns dentro (aria-required-children, crítico).
- **Arquivos:** `app/src/screens/NotesScreen.tsx`, `app/src/components/vault/VaultPanels.tsx`,
  `app/src/components/vault/dialogs.tsx`.
- **Correção:** `role="group"` e `aria-pressed` em cada botão.

### D3 — Botões dentro do `<summary>` das pastas (média, corrigido)

- **Passos:** Notas, árvore com pastas; Tab até uma pasta.
- **Obtido:** Exportar, Aparência, Favoritar, Nova nota e Renomear dentro do `summary` (nested-interactive, sério).
- **Arquivo:** `app/src/screens/NotesScreen.tsx`, `app/src/screens/notes.css`.
- **Correção:** os botões ficam ao lado do `summary`, por cima da linha, e aparecem no hover ou com o foco na pasta.

### D4 — Mesma falha nas abas (média, corrigido)

Parte de D1 (os botões estavam dentro do elemento com papel de aba).

### D5 — Fases da lua sem contraste no tema claro (média, corrigido)

- **Passos:** Wiki › Calendário no tema claro; escolher um dia.
- **Obtido:** o texto das luas usa a cor definida no calendário (`#bec6ff`, `#ffa48e`): contraste 1,5:1 e 1,7:1.
- **Arquivo:** `app/src/screens/wiki/WikiCalendar.tsx`.
- **Correção:** a cor pinta só um ponto ao lado; o texto fica na cor do tema.

### D6 — Fechar aba com 20 px (média, corrigido)

`.tab-close` e `.tab-more` passam a ter no mínimo 24 px (`app/src/components/vault/tabs.css`).

### D7 — Caixa da tarefa com 16 px no computador (baixa, corrigido)

A área clicável (`label.task-box-hit`) ganha 4 px em volta acima de 700 px (`app/src/components/tasks/tasks.css`). O axe
continua medindo só a caixa (16 px); o clique vale nos 24 px do rótulo.

### D8 — Caixas e botões de opção de 13–16 px no celular (média, corrigido)

- **Onde:** Importar e exportar (93 caixas), Linha do tempo da Wiki, segredos do painel da campanha.
- **Correção:** no celular, caixas e botões de opção com no mínimo 24 px (`app/src/styles/accessibility.css`). As
  linhas em volta continuam com 44 px onde o componente já previa.

### D9 — Trilha “Você está em” com 21 px de altura no celular (média, corrigido)

Os links da trilha ganham 44 px de altura no celular (`app/src/styles/accessibility.css`).

### D10 — Painel de filtros do gráfico cobre a barra (média, corrigido)

- **Passos:** Notas › Gráfico › Configurar o gráfico, depois de ter aberto a Wiki.
- **Obtido:** o painel sobe para 12 px do topo e cobre o próprio botão que o fecha (target-size, sério). Uma regra de
  `wiki.css` sem escopo (`.graph-panel`) valia também nas Notas.
- **Correção:** a regra ficou só no gráfico antigo da Wiki (`.graph-screen .graph-panel`).

### D11 — Telas de documento sem `h1` (baixa, corrigido em 30/10)

Nota aberta, artigo da Wiki, livro, sessão de campanha e quadro não tinham `h1`; o título ficava num campo editável ou
na barra do documento. **Correção:** o nome na barra do documento virou o `h1` (`NoteView.tsx`, que serve nota,
artigo e sessão, e `BookEditor.tsx`), sem mudar o desenho; no celular o nome do livro some da barra mas continua como
`h1` para o leitor de tela. O quadro, as Notas e o Gráfico sem nota aberta e o Gráfico da Wiki ganharam um `h1` oculto.
A varredura repetida em 320 px e no computador mostra uma `h1` em todas as 50 telas.

### D12 — Teste de regex com `(?i:…)` falha no Node 22 (baixa, ambiente)

`app/src/core/search.test.ts` usa modificador de regex que só existe no Node 24 (o do projeto). No Node 24 passa. Não
muda nada para o app, que roda no Electron/Chromium atual.

### D13 — Links curtos dentro de texto com menos de 24 px de altura (baixa, corrigido em 30/10)

Links de nota (`.wikilink`) e o link de origem da tarefa (`.task-backlink`) tinham 18 px. **Correção:** o link de
origem da tarefa, que fica numa linha própria, tem 24 px (44 px no celular; `tasks.css`). Os links de nota dentro do
texto seguem a exceção da WCAG 2.5.8 para links numa frase e são desenhados pelo leitor compartilhado (regra 7); o axe
ainda acusa um deles quando o parágrafo da nota tem só o link.

### D14 — Gráfico da Wiki sem `h1` (baixa, corrigido em 30/10)

Achado pela varredura no WebView do Android, que descobre mais rotas. `WikiGraph.tsx` ganhou o `h1` oculto.

### D15 — Legenda das relações da Wiki sem contraste no tema claro (média, corrigido em 30/10)

- **Passos:** Wiki › Relações › Diplomacia no tema claro.
- **Obtido:** a legenda pintava o texto com a cor do mapa (`#9dcbb4` sobre `#e9edf8`): contraste 1,54:1.
- **Arquivo:** `app/src/screens/wiki/WikiRelations.tsx`.
- **Correção:** a cor fica num ponto ao lado e o texto usa a cor do tema, como na tabela e no calendário (D5).

## Desktop

Os dois smokes do Electron (`--smoke` e `--smoke --write`, cofre de exemplo, `xvfb-run`) passam. Numa primeira rodada o
`--smoke` falhou na contagem da árvore (`listed` 2 contra `markdown` 38) e isso foi tomado por um problema do ambiente;
era da T6: as pastas fechadas deixaram de desenhar as notas. A correção deixa esse modo só para cofres com mais de 2
mil notas, e o smoke de gravação passou a clicar em “Confirmar” ao desvincular um personagem (o Elenco pede
confirmação agora).

## Ordem sugerida

1. O que ainda está aberto na revisão das Campanhas (mover missões pelo teclado, data da sessão levando o evento da
   Agenda, validação da nota da sessão, campos que não atualizam).
2. D11 e D13 (corrigidos em 30/10).
3. As conferências manuais desta revisão: teclado e diálogos, leitores de tela, texto a 140 %, Android físico, sala
   com dois aparelhos e impressão.
