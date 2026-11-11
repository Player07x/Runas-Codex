Um livro é uma nota com `tipo: livro` e a lista dos capítulos na propriedade `estrutura`; cada capítulo é uma nota
comum (que o Obsidian abre). Livros › **Novo livro** cria a pasta, a nota do livro e o primeiro capítulo.

### A lista de livros

Cada livro aparece com a capa (a imagem da propriedade `capa`, ou uma capa desenhada), o número de capítulos e de
palavras. **Importar livro** traz do Homebrewery, do GM Binder ou de um DOCX.

### Os dois modos do livro

| Modo | Para que serve |
| :-- | :-- |
| **Escrever** | O capítulo no editor, com o sumário à esquerda e, se quiser, a **prévia das páginas ao lado**, que acompanha o cursor |
| **Diagramar** | As páginas como vão sair impressas, com o painel **Estilo do livro** |

O **sumário** à esquerda é onde se organiza o livro: as seções aparecem recuadas embaixo do capítulo (que fecha e abre
pela setinha), e a Parte é um título dourado. Arraste pelo ⠿ para mudar a ordem (para a direita vira seção, para a
esquerda vira capítulo); o ⋯ de cada linha cria seção ou capítulo, renomeia, duplica (com as seções), sobe, desce,
muda o nível, muda a situação e remove (tirar do livro ou mandar para a lixeira). Pelo teclado: ↑ ↓ andam, → ← abrem e
fecham, Alt+↑ ↓ movem, Alt+→ ← mudam o nível, F2 renomeia, Ctrl+D duplica e Del remove. “Mostrar resumos” põe o resumo
de cada capítulo embaixo do nome. O nível vem do `tipo` de cada nota; a lista `estrutura` do livro continua igual no
Obsidian.

No sumário, o ponto colorido de cada capítulo mostra a situação. **Foco** esconde tudo menos o texto; a **máquina de
escrever** mantém a linha do cursor no meio da tela a cada tecla. No celular, “Ver a página” abre a prévia em tela
cheia.

### Apoio ao escrever

O painel **Apoio** tem **Referências** (artigos da Wiki para consultar e citar sem sair do capítulo), **Revisão**
(comentários e o que falta revisar) e **Capítulo** (situação, palavras, notas do capítulo). Selecione um trecho para
comentar ou citar da Wiki pela barra da seleção. `![[Artigo da Wiki]]` traz o texto de um artigo para o livro sem
copiar.

### Estilo do livro

Em Diagramar, o painel **Estilo do livro** começa por um **modelo** — Manual de RPG, Grimório, Romance, Moderno ou
Leitura fácil — e deixa ajustar:

- Fontes do título e do texto (cerca de dez fontes livres embutidas, mais as fontes `.ttf`/`.otf`/`.woff2` do cofre),
  tamanho e entrelinha, texto justificado e **hifenização** em português.
- **Parágrafos**: **recuo na primeira linha** em nenhum parágrafo (padrão), em **todos** ou em todos **menos o
  primeiro depois de um título**, com o tamanho do recuo; e o **espaço entre parágrafos** (de nenhum a 1½ linha).
  Sem escolha, quem recua fica sem espaço e quem não recua ganha meia linha. Vale no capítulo inteiro — também dentro
  de colunas, caixas e fichas —, no papel, no PDF, no EPUB e no DOCX, e não muda o capítulo no Obsidian. Imagem
  sozinha, item de lista e célula de tabela não recuam. Um `&emsp;` no começo do parágrafo continua somando.
- Colunas (1 a 4), papel (A4, Carta, A5, 6×9), margens, cor do papel, do texto e do destaque.
- **Tabelas**: as colunas seguem o conteúdo (uma coluna vazia fica estreita); a tabela ocupa a **largura toda** da
  coluna ou **se ajusta ao conteúdo**.
- **Página nova**: “Capítulos em página nova” e “Seções em página nova” valem para o livro todo; um capítulo ou
  seção pede o contrário no menu “⋯” da estrutura (**Começar em página nova**, grava `nova_pagina:` na nota). Sem
  isso, a seção continua na mesma página do capítulo.
- O desenho das **fichas** (tipográfico, fundo suave ou faixa no nome; veja Fichas e caixas).
- **Capa**, **sumário**, aberturas de capítulo, cabeçalhos e numeração das páginas.
- Imagens: **tela** (leve), **gráfica** (300 ppi) ou **original**; e se o fundo do papel sai na impressão.

**Linhas vazias contam** (em Parágrafos, `linhas_vazias: respeitar`): cada linha vazia a mais entre dois blocos vira uma
linha de espaço, só no livro — o Obsidian continua juntando as linhas. Para um ajuste num lugar só, escreva um
comentário do Obsidian (ele não aparece na leitura) numa linha própria:

- `%% livro: espaco 2 %%` — duas linhas de espaço (de 1 a 6);
- `%% livro: nova-pagina %%` — o que vem depois começa numa página nova;
- `%% livro: largura-toda %%` — o bloco logo abaixo (até a próxima linha vazia), como uma tabela com o título, ocupa
  a largura toda da página, mesmo num livro de duas colunas.

**Revisar o livro** (menu ⋯ do livro) lista o que o livro não precisa mais: linhas só com `\` para separar
parágrafos (e o `\` que saía impresso antes de uma caixa), blocos `::: runas-colunas` vazios e `::: runas-colunas-1`
só em volta de uma tabela (vira `%% livro: largura-toda %%`). Cada troca mostra o antes e o depois; nada muda sem você
marcar e confirmar, e a versão de antes de cada capítulo fica em **Snapshots do capítulo**.

**Salvar como modelo** grava o estilo numa nota (`Livros/Modelos/<nome>.md`, `tipo: modelo-livro`) para usar em
outros livros. Num capítulo, a propriedade `colunas:` muda só ele.

### Formatadores de livro

Na galeria Formatar, a aba **Livro** tem colunas automáticas (`::: runas-colunas-2`), duas colunas manuais, quebra de
coluna, quebra de página, bloco largo e sumário. As fichas de RPG (`[!magia]`, `[!criatura]`…) saem diagramadas; um
trecho no formato antigo vira ficha com **Converter em ficha**.

### Exportar

No ⋯ do livro: **PDF** igual à prévia (com título, marcadores e texto pesquisável), **EPUB**, **DOCX**, **HTML**,
**RTF** e **Markdown** (um arquivo ou uma pasta). A **versão dos jogadores** tira os segredos antes de exportar.
**Excluir livro** manda a nota do livro e os capítulos para a lixeira (capítulos fora da pasta ou usados por outro
livro ficam).
