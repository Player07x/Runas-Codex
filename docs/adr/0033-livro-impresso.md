# ADR 0033 — O livro impresso: prévia ao lado, Diagramar, modelos e fichas

- **Status:** aceita (2026-10-25)

## Contexto
Em 25/10 o dono pediu um rework do PDF gerado pelos Livros, comparando o PDF do seu livro com as notas do cofre, e,
antes dele, uma forma de ver a prévia ao lado do texto enquanto escreve. A avaliação (proposta publicada em
https://claude.ai/artifact/4EzzHLiUXutEE4GkZ2kw22) achou:

- o contorno tracejado que o leitor desenha em volta dos blocos `:::` (`.md-container`) vai para o papel;
- cada capítulo tem dois títulos (o nome da nota e o `#` da nota), e as seções três sinais (sobretítulo, título e régua);
- colunas equilibradas partem textos curtos, títulos ficam no pé da coluna e as imagens se afastam do texto a que
  pertencem;
- a EB Garamond variável sai como fonte Type 3 no PDF; as imagens entram no tamanho original (17,3 MB em 7 páginas);
- não há sumário, marcadores nem marcação de acessibilidade no PDF, e o título interno é o da janela;
- `hyphens: auto` não funciona no Electron 44 no Linux (testado);
- os quatro temas mudam só cores e fonte; fonte, tamanho, colunas, cabeçalho, numeração e sumário só mudam com CSS;
- a prévia toma o lugar do editor.

## Decisão
O dono aprovou a proposta inteira e as oito decisões abertas nela:

1. **Prévia ao lado primeiro (L1).** Em Escrever, um painel à direita mostra as páginas, refeitas meio segundo depois
   da última tecla, acompanha o cursor, marca a página e o título do trecho em edição e leva ao texto quem clica num
   título da página. No celular, “Ver a página” abre a página do cursor em tela cheia.
2. **O terceiro modo se chama Diagramar** (antes “Prévia”): é onde ficam o estilo do livro e a exportação.
3. **O título do capítulo vem do nome da nota.** O primeiro `#` da nota só aparece se for diferente do nome; seções não
   ganham sobretítulo (L2).
4. **Fontes:** entram cerca de dez fontes livres (OFL), em versões estáticas, e fontes do próprio cofre, lidas como bytes
   pelo `Platform` (sem rede e sem mudar a CSP) (L3).
5. **Hifenização em português** com uma dependência própria, já que o Chromium do Electron não hifeniza (L5).
6. **Fundo do papel desligado por padrão na impressão**; na tela e no PDF para ler ele continua (L2/L3).
7. **Todas as fichas propostas:** `[!magia]`, `[!runa]`, `[!habilidade]`, `[!item]`, `[!criatura]`, `[!raca]`,
   `[!classe]` e `[!efeito]`, como callouts que o Obsidian abre (L5).
8. **Fichas sem réguas, no desenho tipográfico por padrão**; fundo suave e faixa no nome ficam como opção (L5).

Fases, cada uma um PR a partir da `main`: **L1** prévia ao lado; **L2** limpeza do PDF (sem caixas no papel, um título
por capítulo, fluxo das colunas, fonte estática, imagens reduzidas, título, marcadores e marcação do PDF); **L3**
Estilo do livro, cinco modelos (Manual de RPG, Grimório, Romance, Moderno, Leitura fácil), modelos próprios como notas
`tipo: modelo-livro`, colunas do livro e fontes; **L4** capa, sumário, aberturas e cabeçalhos; **L5** fichas e
hifenização. A tarefa está em [`docs/tarefas/livro-impresso.md`](../tarefas/livro-impresso.md).

### Como a L1 funciona
- `screens/books/BookPages.tsx` pagina (Paged.js, o mesmo leitor das notas) e serve ao Diagramar e à prévia ao lado;
  cada um pagina por conta própria. `BookPreview.tsx` ficou com os controles, a exportação e o Ctrl+P.
- Cada seção do livro leva `data-book-chapter` e `data-book-path`. A ponte entre o cursor e a página são os títulos,
  que aparecem na nota e nas páginas na mesma ordem; entre dois títulos, a página é estimada pela proporção de linhas
  (`core/books-follow.ts`, com testes).
- O cursor vai do editor (`NoteView.onCursorLine`) para um repositório próprio (`cursor-store.ts`): só a prévia
  redesenha a cada movimento. Clicar num título usa `NoteView.lineRequest`, que leva o cursor à linha sem trocar de modo.
- O painel é um `ResizablePanel` (ganhou `maxWidth` e `onCollapsedChange`) com o botão na barra do livro. O Paged.js só
  carrega com o painel aberto. Abaixo de 1400 px, Apoio e prévia dividem o lado direito; abaixo de 1200 px, abrir a
  prévia recolhe o sumário.
- As páginas da prévia ao lado ficam fora do leitor de tela (`aria-hidden`): o texto já está no editor. A troca de
  página é anunciada uma vez.

### Como a L3 funciona
- `core/book-style.ts` resolve o estilo: o modelo pronto (`modelo: manual|grimorio|romance|moderno|facil`), a nota de
  modelo (`modelo: "[[…]]"` com `tipo: modelo-livro`) e, por cima, o que o livro muda (`fonte_titulos`, `fonte_texto`,
  `corpo_pt`, `entrelinha`, `alinhamento`, `colunas`, `cor_papel`, `cor_texto`, `cor_destaque`, `fichas`). Só valores
  conferidos (cor `#rrggbb`, nome de fonte com letras e números, números dentro de limites) viram CSS, em variáveis no
  `.book-paper` (`styleCss`). O `tema:` antigo continua valendo pela tradução (pergaminho → Grimório, minimalista →
  Moderno em preto e branco) e sai quando a pessoa escolhe um modelo no painel; `fundo_pagina` vale como `cor_papel`.
- O painel **Estilo do livro** (`BookStylePanel.tsx`) fica à esquerda do Diagramar (no celular, abaixo do botão “Estilo
  do livro”). Cada mudança vale na prévia na hora; o Diagramar junta as mudanças e grava no livro um segundo depois da
  última, numa gravação só, e também ao sair ou antes de exportar. Desfazer volta o último ajuste (digitar ou arrastar
  uma cor conta como um). Escolher de novo o valor do modelo apaga o ajuste em vez de gravá-lo, e trocar de modelo apaga
  os ajustes de antes (Desfazer traz de volta).
- Os ajustes que ficavam em “Índice, glossário e acabamento” (margem, sangria, marcas de corte, textura, marca d’água,
  CSS do livro, índice e glossário) entraram nos grupos do painel; o formulário antigo saiu.
- **Salvar como modelo…** cria `Livros/Modelos/<nome>.md` com o estilo inteiro (o modelo não depende do livro) e passa
  o livro a usá-lo; os modelos do cofre aparecem ao lado dos cinco prontos.
- Fontes: 11 famílias livres em versões estáticas (`@fontsource`, só o subconjunto latino, 400/700 e itálicos onde
  há); fontes do cofre (`.ttf`, `.otf`, `.woff`, `.woff2`, o nome é o do arquivo) são lidas pelo `Platform` e
  registradas com `FontFace` antes de paginar. EPUB e HTML levam o estilo e as fontes escolhidas; o DOCX leva a cor de
  destaque e o nome da fonte do texto.
- Colunas do livro: o capítulo pode pedir outra com `colunas:`; quem já usa `::: runas-colunas-N` ou `[!colunas]` fica
  com uma (sem colunas dentro de colunas).

### Como a L4 funciona
- `core/book-layout.ts` lê do livro `capa_estilo` (clássica, ilustrada, faixa), `sumario`, `abertura` (simples, faixa,
  página inteira), `numeracao` (Capítulo 1, Capítulo I, sem número), `capitular`, `espelhadas`, `cabecalho` (livro e
  capítulo, só o capítulo, nenhum) e `numero_pagina` (margem externa, centro, nenhum) e gera as regras de página do
  Paged.js. As regras do layout vão por último: o Paged.js escolhe a página nomeada (`page:`) pela ordem das regras, não
  pela especificidade.
- **Cabeçalho** só nas páginas que não abrem capítulo: com “capítulos em página nova”, o capítulo usa a página nomeada
  `capitulo` e `@page capitulo:first` tira o cabeçalho; capa, sumário, partes e páginas em branco também ficam sem ele.
  **Páginas espelhadas**: margem interna 4 mm maior, número e cabeçalho do lado de fora (livro à esquerda, capítulo à
  direita) e capítulos e partes abrindo na página da direita.
- **Capa**: `titulo_capa` e `edicao` separados do nome da nota; a imagem (`capa:`) é escolhida num seletor com as
  imagens do cofre ou uma nova do computador, gravada como anexo. A faixa da capa é o fundo da página nomeada
  `capafaixa`, de borda a borda; no EPUB ela vira o fundo do bloco do título.
- **Sumário**: montado na cópia que vai para o Paged.js (`screens/books/book-toc.ts`), depois da capa e dos créditos,
  com partes, capítulos (“Cap. 1”), os `##` de cada capítulo e as seções recuadas; o número da página vem de
  `target-counter` e o link leva ao lugar no PDF. Ele não entra na fonte do livro, então a prévia ao lado e as
  exportações EPUB/DOCX não mudam.
- **Abertura**: “Capítulo 1” em versalete sobre o título (o número é o do livro inteiro, também em “só este capítulo”);
  em página inteira, o título fica sozinho no meio da página, com a imagem de `imagem:` (ou `capa:`) do capítulo.
  **Capitular**: só no primeiro parágrafo com corpo (160 caracteres ou mais), com `float`; `initial-letter` deixava a
  paginação até 80 vezes mais lenta.

### Como a L5 funciona
- **Fichas** são callouts comuns nas notas (`> [!magia] Torreta de Fogo`, e `runa`, `habilidade`, `item`, `criatura`,
  `raca`/`raça`, `classe`, `efeito`; o `statblock` da migração usa o desenho da criatura). O Obsidian e o leitor do app
  mostram um callout normal; o snippet `runas-codex.css` dá cor, ícone e nome em versalete no Obsidian. Só o livro
  reorganiza, na cópia que vai para o Paged.js (`screens/books/book-fichas.ts`): a primeira linha de campos
  (`**Custo:** 1 PV · **Tipo:** Feitiço · **Alcance:** Área`) vira “1 PV · Feitiço · Área” (rótulos que o valor explica
  somem: custo, tipo, alcance, grupo, categoria, raridade, origem), os outros rótulos ficam (Requisito, Dano…), campo
  vazio não sai, a criatura ganha a linha de atributos e “**Ampliação:**” vira “Ampliação.” em versalete. Regras puras em
  `core/fichas.ts`, com testes.
- **Sem réguas:** fichas e caixas perderam bordas, sombras e fundos no livro. Fichas: tipográfica (padrão), fundo suave
  ou faixa no nome (`fichas:`, grupo Fichas do Estilo); Romance e Leitura fácil escondem as imagens das fichas. Caixas:
  descritivo em itálico sobre fundo suave, barra lateral com fundo suave e letra menor, observações só com o título
  pequeno na cor do tipo.
- **Converter em ficha** (barra da seleção, em Escrever): o formato antigo — nome em negrito (ou `###`), custo e tipo na
  linha de baixo, o texto — vira o callout; custo em pontos vira `[!runa]`, o resto `[!magia]`.
- **Versão dos jogadores** (Diagramar): sem os `[!segredo]` na prévia, na impressão e nos arquivos exportados (que ganham
  “(jogadores)” no nome); o Markdown, que leva as notas como estão, sai das opções.
- **Hifenização em português** com o pacote `hyphen` 1.14.1 (ISC, sem dependências nem script de instalação; só os
  padrões do português, 6 KB, carregados quando o livro hifeniza): hífens suaves nas palavras de 6 letras ou mais do
  texto corrido, só na cópia que vai para o Paged.js. Liga por padrão quando o texto é justificado (`hifenizar:` muda).

### Ajustes depois da beta.17 (26/10)
- No Valknut, a imagem de cada magia fica **depois** do callout, fora do `>` (para o Markdown e o Obsidian, o callout acaba
  ali). No livro, a imagem sozinha logo depois de uma ficha passa a ser a arte dela e entra na ficha; “Converter em
  ficha” também leva junto a imagem que vem logo depois da seleção.
- As fichas mostram as imagens em todos os modelos: esconder no Romance e no Leitura fácil (como na proposta) sumia com a
  arte de quem escolheu esses modelos.
- “Converter em ficha” reconhece “Custo: 1 PV” (antes saía `**Custo:** Custo: 1 PV`) e as linhas “Requisito: …” e
  “Material: …” logo depois do custo; campo vazio não entra. No livro, o rótulo repetido no valor também some, e
  “**Truque**:” e “*<u>Ampliação:</u>*” viram rótulos como “**Ampliação:**”. Rótulos não são hifenizados.

## Consequências
- O smoke do desktop procura “Diagramar” no lugar de “Prévia” e confere a prévia ao lado (abrir, paginar, marcar a
  página do capítulo e refazer ao digitar no `--write`).
- No celular, Foco saiu da barra do livro para o menu ⋯ (o lugar ficou para “Ver a página”), e a barra passou a caber em
  320 px, o que já não acontecia antes.
- No celular, o Diagramar voltou a aparecer: desde a F3b uma regra antiga escondia a área principal do livro no modo
  Diagramar em telas estreitas.
- As regras antigas `.books-layout.has-preview` (prévia lateral da X4, sem uso desde a F3b) saíram do CSS.
