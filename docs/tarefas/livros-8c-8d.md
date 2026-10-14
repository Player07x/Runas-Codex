# Tarefa: Livros — fases 8c e 8d

**Para:** Codex (GPT-6 Astra). **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a [divisão das tarefas](README.md)
(filas, contratos e quem mexe em quê), a [ADR 0009](../adr/0009-livros.md) (formato do livro e paginação da 8b), as
seções E e G.3 da [checklist](../01-checklist-recursos.md#e-livros) e o
[dialeto Markdown](../02-viabilidade-e-etapas.md#dialeto-markdown).

Estas são as duas fases que faltam da etapa 8, **nesta ordem, um PR para cada uma**. O marco da etapa 8 no plano é:
**o livro de exemplo sai em PDF, EPUB e DOCX fiel à prévia.**

O Claude Code trabalha ao mesmo tempo nas notas (anexos e imagens), na Wiki, nas Campanhas, na Agenda e no Android:
não mexa no que a tabela de [`README.md`](README.md) atribui a ele.

## O que já existe

- **Prévia paginada (8b):** `app/src/screens/books/BookPreview.tsx` pagina o livro com **Paged.js 0.4.3**
  (`screens/books/vendor/`, carregado por `import()`), nos temas `manual`, `pergaminho`, `moderno` e `minimalista` e
  nos tamanhos A4, Carta, A5 e 6×9 (`book-pages.css`, `pagination.ts`). O conteúdo é o mesmo `Markdown` do app.
- **Impressão:** `Ctrl+P` e o botão "Imprimir" chamam `platform.printDocument()` (`window.print()` no Electron e no
  navegador); o CSS de impressão mostra só as páginas prontas.
- **Livro no cofre:** `app/src/core/books.ts` acha os livros, resolve a `estrutura` e conta palavras.
- **Salvar arquivo:** hoje a `Platform` só tem `saveFile(name, content: string, mime)`, para texto. A **C0** do
  Claude Code acrescenta os binários (veja "Contratos" abaixo).
- **DOCX do Runas Book:** o exportador antigo está em
  `~/Documentos/GitHub/Runas-Core/apps/runas-book/app/lib/book-export/toDocx.ts` (biblioteca `docx` 9.x). A
  [ADR 0004](../adr/0004-independente-da-runas-suite.md) permite reaproveitar o código; ele lia HTML guardado no
  navegador, então a entrada muda para as notas do livro.

## Contratos com o Claude Code

A **C0** (`anexos/binarios`) acrescenta isto, e é o que você deve usar (não crie outro caminho para gravar bytes):

```ts
// Platform (app/src/platform/platform.ts)
readBinary(path: string): Promise<Uint8Array>
writeBinary(path: string, bytes: Uint8Array, expected?: VaultEntry | null): Promise<VaultEntry>
/** Salva bytes onde o usuário escolher (exportações); devolve o nome, ou `null` se cancelou. */
saveBytes(name: string, bytes: Uint8Array, mime: string): Promise<string | null>

// useVault() (app/src/platform/VaultProvider.tsx)
/** Grava um anexo novo na pasta de anexos do Obsidian (relativa a `nearNote`, se a configuração for `./`). Devolve o caminho. */
addAttachment(fileName: string, bytes: Uint8Array, nearNote?: string): Promise<string>
```

Se a C0 ainda não estiver na `main` quando você chegar no "salvar", gere os bytes, teste a geração e deixe o salvar
para o fim do PR (trazendo a `main` quando ela entrar).

## Fase 8c — exportar PDF, EPUB e DOCX

**Entregar:**
1. **Botão "Exportar"** no editor do livro, com o formato (PDF, EPUB, DOCX) e as opções que fazem sentido em cada um
   (tema e tamanho vêm da nota do livro; capa, contracapa e créditos entram se existirem).
2. **PDF fiel à prévia:** o mesmo HTML e CSS da prévia paginada, sem layout próprio.
   - **Electron:** `webContents.printToPDF` com `preferCSSPageSize` e fundos, a partir das páginas prontas da prévia,
     e o arquivo salvo onde o usuário escolher. Acrescente à `Platform` um método opcional (ex.:
     `exportPdf?(fileName): Promise<string | null>`) e o IPC no desktop **só acrescentando** nos arquivos
     compartilhados; a lógica do lado do Electron fica num arquivo seu (`desktop/src/main/books-pdf.ts` ou
     `export-pdf.ts`).
   - **Navegador e Android:** o diálogo de impressão ("Salvar como PDF"), como já está no plano (docs/02, seção 7).
   - Fontes, imagens do cofre, capitular, colunas e `[!largo]` precisam sair iguais à tela.
3. **EPUB 3:** um XHTML por capítulo (partes como divisórias), sumário (`nav`), capa, metadados (título, autor,
   idioma `pt-BR`), imagens do cofre e as fontes embutidas (são OFL, `@fontsource`). O dialeto vira HTML com as
   classes do tema e um CSS de EPUB derivado do tema (leitores de EPUB não paginam igual; colunas viram texto
   corrido). Para o ZIP, prefira o `fflate`, que já está no `package-lock.json` (hoje como dependência de
   desenvolvimento de outra ferramenta); se ele entrar em `app/package.json`, explique no PR. O arquivo precisa passar
   no **EPUBCheck**, se você conseguir rodá-lo; se não, diga no PR.
4. **DOCX:** porte o `toDocx.ts` do Runas Book para `app/src/core/export/` (ou `core/books-export.ts`), lendo as
   notas do livro. Títulos viram os estilos de título do Word, callouts e caixas viram caixas com fundo, `[!colunas]`
   vira seção com colunas, `quebra-pagina` vira quebra de página, tabelas viram tabelas e as imagens vão embutidas. A
   biblioteca `docx` entra com versão exata (regra 8 do AGENTS.md); explique no PR.
5. **Núcleo testável:** a montagem do livro para exportar (ordem, partes, capítulos, capa, imagens que precisam ir
   junto) é TS puro com testes; os geradores de EPUB e DOCX têm testes que abrem o ZIP gerado e conferem as partes
   principais (sumário, capítulos na ordem, imagens).
6. **Teste do Electron:** no `--smoke --write`, exporte o livro de teste em PDF para uma pasta temporária e confira
   que o arquivo existe e tem o número de páginas da prévia (pelo menos mais de uma); acrescente a condição em
   `smokePassed`.

**Pronto quando:**
- o livro de exemplo sai em PDF, EPUB e DOCX, e o PDF tem as mesmas páginas da prévia nos quatro temas (imagens no
  PR, lado a lado com a prévia);
- `Formatadores.md` colada como capítulo exporta sem perder nenhum formatador nos três formatos (no EPUB e no DOCX,
  diga no PR o que vira outra coisa, como colunas);
- o EPUB abre num leitor comum (ex.: Calibre, Thorium ou Livros do celular) e o DOCX abre no LibreOffice e no Word;
- `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build` e os dois `--smoke` passam.

## Fase 8d — importar Homebrewery, GM Binder e DOCX

**Entregar:**
1. **Importar livro** na lista de livros (`/livros`): escolher o arquivo, ver uma prévia do resultado (quantos
   capítulos, imagens, avisos do que não deu para converter) e confirmar. O resultado é um livro normal no formato da
   ADR 0009 (pasta em `Livros/`, nota do livro com `estrutura`, um `.md` por capítulo).
2. **Homebrewery e GM Binder** (Markdown com extensões):
   - `\page` vira `<div class="quebra-pagina"></div>` e, quando fizer sentido, começo de capítulo novo;
   - `\column` vira `<div class="quebra-coluna"></div>` dentro de `> [!colunas]`;
   - blocos `{{nota …}}`, `{{descriptive}}`, `{{monster,frame}}`, `{{wide}}` e parecidos viram `> [!nota]`,
     `> [!descritivo]`, `> [!statblock]`, `> [!largo]`, como na tabela do dialeto;
   - estilos inline que o dialeto aceita (`<span style>`, `<p align>`) passam; o que não tiver equivalente vira
     texto comum e entra na lista de avisos;
   - imagens por URL **não são baixadas** (o app não faz rede): ficam como link e entram nos avisos.
3. **DOCX:** títulos do Word viram capítulos (escolha o nível na prévia da importação), negrito, itálico, listas,
   tabelas e imagens embutidas (gravadas com `addAttachment`, na pasta `Anexos/` do livro). Use uma biblioteca
   madura (ex.: `mammoth`), com versão exata e explicada no PR. O HTML que sai dela passa pela sanitização antes de
   virar Markdown (docs/02, seção 7: HTML de nota importada não roda script).
4. **Núcleo testável:** os conversores ficam em `app/src/core/books-import/`, TS puro, com testes usando arquivos de
   exemplo pequenos (um `.md` do Homebrewery com todos os blocos acima e um `.docx` com títulos, tabela e imagem) em
   `app/src/core/books-import/fixtures/`.
5. **Teste do Electron:** no `--smoke --write`, importe o exemplo do Homebrewery pela tela e confira que o livro
   apareceu com os capítulos na ordem.

**Pronto quando:**
- um documento do Homebrewery com `\page`, `\column` e os blocos principais vira um livro que pagina na prévia de
  forma parecida com o original (imagens no PR, lado a lado);
- um DOCX com títulos, tabela e imagem vira um livro com os capítulos certos e a imagem no cofre;
- abrir o livro importado no Obsidian mostra notas comuns;
- os mesmos comandos da 8c passam.

## Fora do escopo (fica para a X5, "fechamento dos Livros")

HTML, RTF e Markdown do livro inteiro (G.3), índice remissivo, glossário, fundos e marca d'água, sangria e marcas de
corte, comentários de revisão, snapshots, modo foco e CSS próprio do usuário. Importar livros do Runas Book está fora
do plano (ADR 0004).

## Ao terminar cada fase

- PR em português, base `main`: o que mudou, imagens (escuro, claro, celular), comandos rodados e o que ficou sem
  verificar. Explique cada dependência nova.
- Atualize a [ADR 0009](../adr/0009-livros.md) com as decisões da fase.
- Acrescente em `docs/04-testes-pendentes.md` (seção "Etapa 8 — Livros") o que o dono precisa conferir à mão: abrir os
  arquivos exportados no Word, no LibreOffice e num leitor de EPUB, e importar um documento real do Homebrewery.
- Atualize a linha da sua fase na tabela de situação do [`README.md`](README.md).
