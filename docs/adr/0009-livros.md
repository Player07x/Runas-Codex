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
