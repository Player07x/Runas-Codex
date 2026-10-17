# ADR 0009 — Livros como conjuntos ordenados de notas

- **Status:** aceita para as fases 8a, 8b, 8c e 8d (2026-10-15).

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

`subtitulo` e `autor` pertencem à nota do livro. (A meta de palavras foi retirada na beta.7: não ajudava a
escrever; um `meta_palavras` antigo fica como propriedade comum.) `tema`, `pagina`, `capa`, `contracapa` e `creditos`
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

## Fase 8c — exportações (2026-10-14)

Feita pelo Codex e terminada pelo Claude Code (o Codex parou sem créditos; o primeiro commit do PR é o trabalho dele
como ele deixou).

- **PDF fiel à prévia:** o botão "Exportar arquivo" da prévia chama `Platform.exportPdf` (opcional, só no desktop),
  que imprime as páginas prontas do Paged.js com `webContents.printToPDF` (`preferCSSPageSize`, fundos ligados, sem
  margens nem cabeçalhos do Chromium). O processo principal não recebe HTML nem caminhos da interface: confere que a
  prévia está pronta, pergunta onde salvar e confere de novo antes de imprimir (`desktop/src/main/books-pdf.ts`). No
  navegador e no Android, o PDF sai pelo diálogo de impressão ("Salvar como PDF"), como estava no plano.
- **EPUB e DOCX a partir da prévia desenhada:** `screens/books/export-snapshot.ts` lê a árvore que o leitor
  compartilhado já desenhou (o mesmo HTML sanitizado da prévia), guarda só atributos seguros e os estilos que importam
  e junta as imagens do cofre pelo `readBinary` (C0). WebP e SVG viram PNG para o DOCX. `core/export/` monta o livro
  (capa, créditos, partes e capítulos na ordem da `estrutura`, contracapa; o rascunho aberto entra no lugar do arquivo)
  e gera os arquivos sem React nem plataforma.
- **EPUB 3** (`fflate`): `mimetype` primeiro e sem compressão, um XHTML por parte ou capítulo, sumário `nav`,
  metadados (título, autor, `pt-BR`), imagens e as três fontes do app embutidas (são OFL). O CSS é o do leitor e do
  livro; colunas viram texto corrido, porque o leitor de EPUB pagina do jeito dele.
- **DOCX** (`docx`, portado do `toDocx.ts` do Runas Book, que a ADR 0004 permite reaproveitar): títulos viram os estilos
  de título do Word, callouts e citações viram caixas com fundo, `[!colunas]` vira seção com colunas, quebras de página
  e de coluna, tabelas, listas, cores, versalete e imagens embutidas. Fórmulas ficam em LaTeX (texto editável).
  Diagramas: o SVG vira PNG quando dá; diagramas com rótulos em HTML (`foreignObject`, o padrão do Mermaid) não podem
  ser convertidos no navegador sem "sujar" o canvas, então entram como aviso no texto (no PDF e no EPUB saem iguais à
  prévia). O CSS interno dos diagramas nunca vira texto, e fundo transparente (`rgba(0, 0, 0, 0)`) não vira preto.
- **Dependências:** `docx` 9.7.1 (publicada em 2026-05-27, sem script de instalação; traz `jszip`, `xml` e `xml-js`) e
  `fflate` 0.8.3, a mesma versão que o desktop já usava (o rascunho do Codex tinha a 0.8.2, que duplicaria o pacote).
- **Smoke:** no `--smoke --write`, o PDF e o `saveBytes` gravam numa pasta temporária, sem diálogo. O roteiro exporta os
  três formatos pela tela da prévia; o processo principal confere que o PDF tem as mesmas páginas da prévia e abre o
  EPUB e o DOCX (`mimetype` primeiro, capítulos e sumário, imagens, fontes, texto do capítulo).

Validação: Caderno de formatadores em A4 (tema manual): PDF com as 5 páginas da prévia, conferido página a página;
XHTML e XML do EPUB e do DOCX bem formados; DOCX aberto no LibreOffice (5 páginas). Capturas em
`docs/imagens/livros-8c/`. EPUBCheck, Word, leitores de EPUB e o diálogo nativo de salvar ficam na conferência manual.

## Fase 8d — importações (2026-10-15)

“Importar livro” na lista abre a escolha de Markdown do Homebrewery/GM Binder (`.md`, `.markdown`, `.txt`) ou DOCX.
O dono escolhe o título e o nível H1–H6 que inicia capítulos e confere quantidade, ordem, conteúdo convertido e
avisos antes de confirmar. Texto anterior ao primeiro título vira uma introdução; sem títulos, há um capítulo.
Uma `\page` sem título continua sendo quebra de página dentro do capítulo, evitando criar capítulos vazios.

Os conversores ficam em `core/books-import/`, em TypeScript sem React, DOM ou plataforma. Homebrewery v3 usa um
leitor de contêineres `{{…}}` aninhados; o GM Binder legado aceita os contêineres HTML com classes conhecidas.
Nota, descritivo, statblock, barra lateral, aviso e bloco largo viram callouts do dialeto. Páginas com `\column`
recebem `[!colunas]`; as quebras usam os mesmos `div.quebra-*` do leitor. Blocos e trechos de código ficam literais.
Classes e estilos sem equivalente geram avisos, e imagens por URL/referência ficam como links sem download.

DOCX usa **Mammoth 1.13.0**, publicado em 2026-09-26, versão exata e sem scripts de instalação. O bundle browser
não tem acesso ao sistema de arquivos; `externalFileAccess` fica desligado e mapas de estilo embutidos são ignorados.
O HTML passa por **hast-util-from-html 2.0.3**, **hast-util-sanitize 5.0.2** e **hast-util-to-html 9.0.5** antes da
conversão para Markdown. As duas últimas já estavam no lockfile; agora são dependências diretas. É a mesma família
de sanitização do leitor, com uma lista menor de atributos e CSS: scripts, handlers, URLs executáveis e estilos que
carregariam recursos não entram. Títulos, negrito, itálico e listas viram Markdown; tabelas ficam em HTML sanitizado
para preservar células mescladas. PNG, JPEG e outros formatos raster suportados são extraídos; SVG/formatos não
suportados geram aviso. O estilo exato de páginas do Word não é importado.

Ambos os formatos são convertidos em um worker local, carregado só quando necessário, com limite de 20 MB de entrada,
30 segundos por conversão e, no DOCX, 100 MB descompactados/2.000 entradas. Não foi necessário alterar a CSP.

A confirmação usa somente `useVault`: escolhe uma pasta livre em `Livros/`, grava anexos e capítulos numerados e
publica a nota do livro por último, com `tipo: livro` e `estrutura` de wikilinks. `addAttachment` ganhou um quarto
argumento opcional de pasta explícita, para guardar imagens em `Livros/<Livro>/Anexos/`; chamadas existentes mantêm
a pasta configurada no Obsidian. Continua usando `writeBinary` com `expected: null`, validando o caminho e evitando
sobrescrita. Em falha parcial, preserva os arquivos e informa a pasta, sem publicar um livro incompleto.

Validação: exemplos Markdown e DOCX pequenos no repositório, testes dos conversores, sanitização, gravação e
renderização dos callouts após a quebra de coluna. O smoke gravável importa o exemplo pela tela e confere capítulos
na ordem. Capturas em `docs/imagens/livros-8d/`; temas escuro/claro, 320 px e prévia com tabela/imagem no Electron.
A comparação com documentos reais e a compatibilidade visual no Obsidian, Windows e Android continuam manuais.

## X5 — fechamento dos Livros (17/10/2026)

O acabamento fica no frontmatter da nota do livro: `indice_remissivo`, `indice_termos` (lista), `glossario`,
`margem_mm`, `sangria_mm`, `marcas_corte`, `fundo_pagina` (#RRGGBB), `textura` (papel/linho/nenhuma),
`marca_agua` e `css_livro`. Valores físicos são limitados antes de gerar as regras do Paged.js. O padrão de margem
continua sendo o do perfil escolhido. Texturas são procedurais, sem recursos externos.

Índice e glossário entram na mesma fonte da prévia e das exportações. O índice usa artigos da Wiki citados e termos
selecionados pelo autor; aponta ao capítulo e à página inicial dele no impresso. O glossário lê `resumo` dos artigos
citados, sem copiar os artigos inteiros. Os links do índice do EPUB apontam para o arquivo XHTML do capítulo.

CSS próprio aceita regras simples confinadas ao conteúdo do papel. Recusa @-rules, URLs, escapes, regras aninhadas
e propriedades de posicionamento/conteúdo; falhas são mostradas sem aplicar a regra. Nenhuma alteração no dialeto.

HTML é um único arquivo autônomo com fontes e imagens em data URIs e CSP sem rede. RTF mantém texto Unicode,
formatação básica e imagens PNG/JPEG; tabelas viram linhas separadas por tabulação e diagramas recebem aviso.
Markdown único mantém a ordem e explicita os caminhos do cofre; o ZIP conserva a árvore original e inclui notas
e anexos referenciados, com o rascunho atual no lugar do capítulo. Não reimporta livros do Runas Book (ADR 0004).

O painel da Wiki permite consultar, ligar personagens/locais/artigos e transcluir no cursor. Comentários usam
`%% revisão: … %%`, editáveis e removíveis no modo Código. Snapshots usam o histórico local já existente (C5c), com
comparação e restauração pelo mesmo fluxo seguro. Modo foco recolhe a estrutura; máquina de escrever centraliza o
cursor com uma opção do editor, sem alterar o documento nem o autosave.

Android não foi validado nesta rodada, por orientação do dono. Impressora física, Word e leitores de EPUB ficam
no roteiro manual. Os testes automatizados cobrem referências com rascunho, isolamento do CSS, perfis de impressão,
HTML autônomo, Unicode/imagens no RTF e ZIP Markdown com anexos.
