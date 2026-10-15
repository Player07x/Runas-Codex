# Livros 8d — importação

Capturas do app compilado no Electron/Linux, usando os exemplos de `app/src/core/books-import/fixtures/`:

- `importacao-escuro.png`, `importacao-claro.png` e `importacao-320.png`: seleção, prévia, capítulos e avisos; 320 px sem rolagem horizontal.
- `homebrewery-previa.png`: capítulos na ordem e prévia paginada do exemplo Homebrewery.
- `homebrewery-fonte-e-previa.png`: fonte original ao lado do resultado paginado (painel de comparação acrescentado apenas no roteiro de conferência).
- `docx-importacao.png` e `docx-previa.png`: dois capítulos, tabela, lista e imagem embutida do DOCX.

A prévia inclui a capa padrão do livro; os exemplos resultam em três páginas. As imagens externas do Homebrewery
ficam como links. A conferência local interceptou as requisições HTTP/HTTPS e não encontrou nenhuma durante as
importações. A comparação com a diagramação de um documento real no site Homebrewery/GM Binder e a abertura das
notas no Obsidian ficam na lista de testes manuais.
