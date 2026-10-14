# ADR 0009 — Livros como conjuntos ordenados de notas

- **Status:** aceita para a fase 8a (2026-10-14). Paginação: decisão pendente da fase 8b.

## Contexto

Livros precisa editar os mesmos arquivos que o Obsidian abre, sem um segundo autosave ou um formato proprietário de capítulos.

## Decisão

Um livro é uma nota com `tipo: livro` dentro de `Livros/`. A criação organiza os arquivos em
`Livros/<Título>/<Título>.md`, com capítulos, partes e seções na mesma pasta. A propriedade `estrutura` é uma lista
ordenada de wikilinks. Links novos usam `index.linkTarget(destino, livro)`; renomear em Notas usa a atualização de
links existente, inclusive no frontmatter. Os links quebrados permanecem na estrutura e aparecem identificados.

A ordem é linear: `tipo: parte | capitulo | secao` identifica cada item, sem acrescentar uma hierarquia incompatível
com a lista decidida. Sem `tipo`, o item é capítulo. `status` e `resumo` alimentam o binder e os cartões; podem ser
editados nas propriedades em Notas ou no código da nota. Notas da pasta ausentes da lista aparecem em “Fora do livro”.

`subtitulo`, `autor` e `meta_palavras` pertencem à nota do livro. `tema`, `pagina`, `capa`, `contracapa` e `creditos`
ficam reservados para a 8b. O corpo da nota do livro guarda anotações e não entra na contagem dos capítulos.

O núcleo `core/books.ts` descobre livros, resolve a estrutura, conta palavras e move itens sem depender de React.
A contagem usa o texto das notas: exclui frontmatter, comentários, código cercado/inline/indentado, tags HTML e
marcadores de links. Não expande transclusões. As estatísticas acompanham a atualização do índice após a gravação.

A edição reutiliza `NoteView` com uma prop opcional `toolbar`, que recebe a inserção no cursor do `SourceEditor`.
A barra fica disponível nos modos Editar e Código quando o cofre permite escrita. Não há outro autosave.
Reordenar grava somente `estrutura` com `useVault().setProperty`. A criação insere após o item selecionado, ou ao fim
quando não há item selecionado na estrutura. Falhas parciais preservam as notas criadas; a inclusão pode ser refeita
por “Fora do livro”. Uma estrutura com tipo inválido bloqueia as alterações até ser corrigida em Notas.

A cortiça usa Pointer Events e captura de ponteiro na alça, compartilhando o gesto entre mouse e toque; subir/descer
oferece o mesmo resultado pelo teclado. No celular, Estrutura, Escrever e Cortiça alternam o painel visível.
O CSS permanece no módulo. Os estilos globais da prévia do protótipo foram retirados desse arquivo para não alterar
os leitores compartilhados.

## Consequências

- Sem nova dependência, sem nova API da plataforma, sem alterações na gravação segura ou nas áreas da Wiki.
- O exemplo do navegador converte os dados existentes em notas; o Electron tem um livro pequeno com dois capítulos.
- Sete testes cobrem descoberta, contagem, links quebrados, ordem, YAML inválido e renomear com nomes duplicados.
- A prévia falsa do protótipo deixa de ser exibida. Paginação, impressão e exportação não fazem parte da 8a.
- A compatibilidade visual com o Obsidian e o gesto em aparelho Android real continuam sendo verificações manuais.

## Fase 8b — prévia paginada (2026-10-14)

A prévia usa **Paged.js 0.4.3**, carregado pelo `import()` do painel de prévia. O bundle ESM oficial está copiado,
sem modificações, com licença e hash em `screens/books/vendor/`. A distribuição npm acrescentaria o postinstall
transitivo de core-js; o bundle pronto evita novos scripts de instalação. A versão foi publicada em 2023-07-06.
A CSP permanece intacta, sem eval nem recursos externos. Referências: [Previewer](https://pagedjs.org/devdocs/Previewer.html)
e [funcionamento do Paged.js](https://pagedjs.org/en/documentation/4-how-paged.js-works/).

O Markdown compartilhado desenha a fonte; esperamos fontes locais, imagens, KaTeX e Mermaid antes de paginar.
Callouts recolhíveis e detalhes são expandidos para impressão. O contexto de cada nota permanece estável para não
reiniciar os componentes assíncronos a cada atualização do painel. O conteúdo paginado é uma fotografia desse DOM.
As folhas da aplicação são preservadas: o Previewer recebe explicitamente as regras `@page`, quebras e cabeçalhos.
Temas e formatação ficam em CSS com escopo de livro. A mesma árvore paginada é exibida e impressa.

`core/books-preview.ts` resolve a estrutura e o rascunho atual, valida os quatro temas e os quatro tamanhos e gera
as regras físicas. Uma prop opcional de NoteView observa o rascunho sem alterar o autosave. A prévia espera 500 ms
sem alterações; trabalhos obsoletos são descartados, a paginação é serializada e a posição de rolagem é conservada.
Por enquanto pagina o livro inteiro. O tempo mostrado é o da paginação, sem incluir debounce/carregamento inicial.

`tema` e `pagina` são propriedades da nota do livro. A opção booleana `capitulos_nova_pagina` permite sobrescrever
o padrão do tema (ligado nos três primeiros, desligado no minimalista); partes sempre abrem página. Título usa
o nome da nota, como na 8a: editá-lo renomeia a nota e atualiza links pelo fluxo existente. Subtítulo, autor,
link da capa, créditos e contracapa usam `setProperty`. O formulário recusa uma base alterada externamente.
As anotações no corpo da nota do livro não são impressas.

A Platform ganha `printDocument` opcional, implementada por `window.print()` no navegador e Electron. Ctrl+P
com a prévia pronta e o botão Imprimir usam essa operação. A CSS de impressão remove a interface, restaura escala
1:1, mantém dimensões e cores e imprime somente as páginas prontas. Exportação permanece na fase 8c.

Validação: corpus Formatadores nos 16 pares tema/tamanho; exemplo original em 9 páginas (0,15 s no navegador
desktop); corpus em 5 páginas (0,20 s no Electron visível). Smokes ocultos sofrem limitação de temporizadores,
portanto seu tempo não serve como benchmark. Impressão A4 via motor Chromium conferida em PDF temporário,
com as mesmas cinco páginas e inspeção visual. Diálogo nativo, impressora física, Windows e Android real continuam
na lista de conferência manual. As capturas estão em `docs/imagens/livros-8b/`.
