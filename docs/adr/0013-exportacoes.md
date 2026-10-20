# ADR 0013 — Documentos por módulo e site offline (X4)

- Estado: implementada em branch local para conferência do dono; sem merge ou release.
- Data: 19/10/2026.

## Documento e seleção

O diálogo compartilhado `components/export/DocumentExport` reutiliza a preparação temporária da ADR 0020, o leitor
Markdown, a prévia paginada e os geradores de Livros. Notas abertas, pastas de Notas, Wiki inteira, categorias e o
diário de campanha têm entradas próprias. A coleção permite escolher notas e seguir links opcionalmente, com
limite de 200 notas. Anexos efetivamente desenhados são incorporados pela captura existente. Nenhuma nota é
reescrita ao preparar ou exportar.

O diário contém apenas as sessões realizadas, suas datas e o resumo de acontecimentos, como o diário Markdown
existente. A projeção pública ocorre antes de expandir links, preparar o diário ou capturar o documento; artigos
com `segredo: true` e callouts secretos não seguem para as exportações dos jogadores.

## Site ZIP

A opção Site offline gera `index.html`, uma página por nota em `notas/`, imagens e CSS. Os nomes das páginas são
gerados, evitando colisões de nomes e caminhos inseguros no ZIP. Links para notas incluídas apontam para essas
páginas; referências a notas fora da seleção ficam como rótulos. Índice e navegação anterior/próxima funcionam
sem JavaScript. Fontes são locais e também incorporadas ao CSS para abertura por arquivo. A CSP proíbe recursos
de rede e scripts. Não há hospedagem nem publicação automática.

Mapas viram imagem e lista de locais; a versão dos jogadores exclui pinos secretos e a camada Segredos. O site
conserva os diagramas SVG capturados quando disponíveis. Controles de mapa, filtros, animações e operações do
gráfico/timeline da aplicação não são exportados como interações; o documento leva o conteúdo estático da nota.
No DOCX, fórmulas ficam legíveis em LaTeX, diagramas são PNG quando conversíveis (ou aviso), e as fontes e a
paginação variam conforme Word/LibreOffice. EPUB reflui em uma coluna. Essas limitações continuam explícitas.

## Colunas automáticas em Livros

Usamos os contêineres nomeados do dialeto existente, sem alterar o leitor compartilhado:

```markdown
::: runas-colunas-2

O autor escreve o texto seguido aqui.

:::
```

O sufixo aceita 1, 2, 3 ou 4. O CSS de Livros aplica fluxo e balanceamento de colunas à prévia e ao PDF; o DOCX usa
seções contínuas com `w:cols`, retomando uma coluna depois do trecho, e o RTF usa seções equivalentes. Imagens no
DOCX respeitam a largura da coluna. EPUB usa texto corrido para permitir redimensionamento no leitor.
Os callouts `[!colunas]` e as quebras manuais continuam disponíveis. O marcador aplica diagramação no contexto
de Livros; fora dele permanece um contêiner Markdown legível. A galeria permite inserir a sintaxe sem digitá-la.

Referências: [CSS Multi-column](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_multicol_layout),
[colunas do DOCX](https://docx.js.org/api/types/IColumnsAttributes.html),
[paginação do Paged.js](https://pagedjs.org/en/documentation/4-how-paged.js-works/).

## Painéis e foco

`ResizablePanel` conserva largura e recolhimento nas preferências deste aparelho. Desktop oferece bordas
arrastáveis e ajuste por teclado; no celular o controle de recolher/expandir permanece acessível. Os painéis da
mesa conservam o redimensionamento existente e agora recolhem também no desktop. Painéis flutuantes recolhidos
no celular deixam de cobrir o conteúdo. O foco de Livros oculta navegação, busca, estrutura, referência e os dados
do capítulo; conserva formatadores, ferramentas de edição e Sair do Foco (Escape também sai).

A tela de escrita passa a ter uma folha central, faixa visual por categorias e comandos separados da escrita.
Capítulos e referências começam recolhidos e seus controles permanecem acessíveis. A prévia ocupa a área de
trabalho própria. No celular, ações comuns usam ícones com nomes acessíveis e dicas. Na revisão, o dono pediu controles
mais compactos: os comandos ficam entre 28 e 32 px e os cartões de formatação em 40 px; as categorias conservam
os 44 px anteriores no celular (34 px no desktop). No foco, Voltar, Ações da nota e Leitura/Editar/Código ficam na mesma barra de Sair do Foco. A faixa de
formatadores permanece visível durante a rolagem do documento. O cabeçalho, a Cortiça, a biblioteca e a prévia
foram conferidos em tema claro e escuro, com larguras de 320, 390 e 1280 px.

Aplicar os estilos de texto e o marcador de colunas envolve a seleção atual; sem seleção, insere o modelo no
cursor. As métricas de fonte e entrelinha ficam no scroller do CodeMirror, com nova medição após carregar fontes
ou redimensionar o editor. Cliques em linhas quebradas foram conferidos antes e depois da rolagem e do resize.

## Remoção de partes do livro

Antes de mover uma nota ou pasta para a lixeira, os vínculos da propriedade `estrutura` são resolvidos no índice
atual. Os livros que apontam para os arquivos removidos recebem a nova lista pelo `save` do cofre, conservando
versões e validação contra alterações externas. Links já quebrados e notas homônimas não são apagados. Em caso
de falha ao mover para a lixeira, as listas anteriores são restauradas quando ainda é seguro fazê-lo; um conflito
na restauração é informado. Apagar pelo editor de Livros mantém o usuário no livro e seleciona outro capítulo.

## Validação local

Typecheck, 515 testes do app, 178 testes do desktop e os dois builds passaram (5 testes do app continuam
marcados como skipped no projeto). Os smokes Electron de leitura e gravação passaram em cópias temporárias do
cofre. O PDF do caderno teve 5 páginas na prévia e 5 no arquivo; PDF, HTML e site da versão dos jogadores passaram
nas verificações de exportação, e os arquivos DOCX/EPUB foram abertos pelo verificador do smoke.

A conferência visual do Word/LibreOffice e de dispositivos físicos permanece manual. O navegador integrado
bloqueou a abertura direta do site por `file://`; a estrutura e os recursos do ZIP foram conferidos por testes,
mas a abertura local direta precisa ser feita pelo dono. Capturas: [`docs/imagens/export-x4/`](../imagens/export-x4/).


### Ajuste da conferência — barras compactas

Fora do foco, a navegação do livro começa por Voltar → Capítulos → Escrever. Referências, Leitura, Editar,
Código e Ações da nota ocupam uma faixa vertical à direita, nessa ordem, sem uma linha extra acima do texto.
As ações abrem ao lado do texto. As categorias de formatação mantêm o tamanho anterior; os cartões internos
ficam menores. A seta e o clique duplo na linha das categorias ocultam/mostram os cartões, e o estado fica
nas preferências deste aparelho. A faixa continua fixa durante a rolagem. Conferidos 320 e 1280 px, foco,
recolhimento persistido, ordem visual/DOM dos comandos e abertura dos painéis.
