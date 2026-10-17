# Tarefa: Livros — fases 8a e 8b

**Para:** Codex (GPT-6 Astra). **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a seção E da
[checklist](../01-checklist-recursos.md#e-livros) (E.1 formatadores, E.2 recursos de livro), o
[dialeto Markdown](../02-viabilidade-e-etapas.md#dialeto-markdown) e a [ADR 0007](../adr/0007-editor-completo.md)
(o leitor e o live preview que você vai usar).

A etapa 8 do plano tem quatro fases. **Esta tarefa é só a 8a e a 8b**, nesta ordem, **um PR para cada uma**:

| Fase | Entrega | Nesta tarefa? |
|---|---|---|
| **8a** | Livro como conjunto de notas, lista de livros, editor com barra de formatadores, cortiça | **sim** |
| **8b** | Prévia paginada ao vivo, temas, tamanhos de página, capa/contracapa/créditos | **sim** |
| 8c | Exportar PDF fiel à prévia, EPUB, DOCX | não (depois) |
| 8d | Importar Homebrewery / GM Binder / DOCX | não (depois) |

Outra frente (Claude Code) está fazendo a **Wiki** ao mesmo tempo: não mexa em `app/src/screens/wiki/**` nem no que
a tabela de [`docs/tarefas/README.md`](README.md) atribui à Wiki.

## O que já existe

- `app/src/screens/books/` — **protótipo** (dados de exemplo de `app/src/data/books.ts`): lista de livros
  (`BooksScreen.tsx`), editor com binder, cortiça e prévia falsa (`BookEditor.tsx`), catálogo de formatadores
  (`formatters.ts`) e estilos (`books.css`). Pode reaproveitar o visual e reescrever o resto.
- **Cofre e notas:** `useVault()` (`app/src/platform/VaultProvider.tsx`) dá o índice (`index`, um `VaultIndex`) e as
  gravações (`createNote`, `createFolder`, `save`, `rename`, `trash`, `setProperty`). O índice resolve links como o
  Obsidian (`index.resolve`, `index.linkTarget`), e o renomear atualiza links no texto **e nas propriedades**.
- **Editor de nota pronto:** `app/src/components/vault/NoteView.tsx` (leitura, live preview e código; grava sozinho
  com segurança, avisa conflito com o Obsidian). **Use-o para editar capítulos** — não escreva outro autosave. Se
  precisar, acrescente props **opcionais** (ex.: uma barra de ferramentas que insere no cursor), sem mudar o
  comportamento de quem já usa.
- **Leitor:** `app/src/components/Markdown.tsx` desenha todo o dialeto (callouts, `[!colunas]`, `[!largo]`,
  `quebra-pagina`, `quebra-coluna`, capitular, statblock…). A nota `Notas/Formatadores.md` do cofre de teste mostra
  tudo. Classe extra no contêiner: prop `className`.
- **Modelos e propriedades:** `app/src/core/templates.ts` (variáveis `{{título}}`, `{{data}}`) e
  `app/src/core/properties.ts` (`setProperty`, edita só a chave).

## Formato do livro no cofre (decidido — siga isto)

```
Livros/<Título do livro>/
├── <Título do livro>.md          ← a nota do livro (capa e metadados)
├── Parte I — O Condado.md         ← partes, capítulos e seções: notas .md comuns
├── Capítulo 1 — O Condado.md
├── Capítulo 2 — A Cidade Alta.md
└── Anexos/capa.png                (opcional)
```

A **nota do livro** tem `tipo: livro` e a ordem do livro numa lista de links (o Obsidian mostra igual, e renomear um
capítulo atualiza a lista sozinho, porque o renomear do app corrige links nas propriedades):

```yaml
---
tipo: livro
subtitulo: "Guia do condado"
autor: "João Antonio"
tema: manual          # manual | pergaminho | moderno | minimalista   (8b)
pagina: A4            # A4 | Carta | A5 | 6x9                         (8b)
capa: "[[Anexos/capa.png]]"   # (8b, opcional)
contracapa: "Texto da contracapa"   # (8b, opcional)
creditos: "Texto: João Antonio. Mapas: …"   # (8b, opcional)
estrutura:
  - "[[Parte I — O Condado]]"
  - "[[Capítulo 1 — O Condado]]"
  - "[[Capítulo 2 — A Cidade Alta]]"
---
Anotações do livro (não entram no texto impresso).
```

Cada nota da `estrutura` pode ter `tipo: parte | capitulo | secao` (sem `tipo` = capítulo), `status: rascunho |
revisao | pronto` e `resumo: "…"` (o texto do cartão na cortiça). Notas da pasta que não estão na `estrutura` aparecem
como **"Fora do livro"** (rascunhos), e dá para pôr no livro. Grave os links com `index.linkTarget(destino, livro)` —
nome curto quando é único no cofre, caminho completo quando não é.

Escreva o ADR [`docs/adr/0009-livros.md`](../adr/) no fim da 8a registrando este formato e as decisões que você tomar.

## Fase 8a — estrutura em notas e editor

**Entregar:**
1. **Núcleo** `app/src/core/books.ts` (TS puro, com `books.test.ts`): achar os livros do cofre (`tipo: livro` dentro
   de `Livros/`), ler a estrutura (resolvendo os links pelo índice, marcando links quebrados), contar palavras por
   capítulo e do livro (sem frontmatter, comentários `%%` e código), mover um item na ordem e gerar o texto da nota
   de um livro novo.
2. **Lista de livros** (`/livros`): cartões com título, subtítulo, nº de capítulos, palavras e meta; **Novo livro**
   cria a pasta, a nota do livro e o primeiro capítulo. Sem cofre ou em somente leitura, explique e não quebre.
3. **Editor do livro** (`/livros/<caminho da nota do livro, codificado como nas notas>`):
   - **binder** à esquerda com partes, capítulos e seções na ordem, status e palavras; "Fora do livro" embaixo;
     criar capítulo, parte ou seção (entra na `estrutura` logo depois do selecionado);
   - **capítulo no centro** com o `NoteView` (três modos) e uma **barra de formatadores** (`formatters.ts`) que insere
     a sintaxe do dialeto no cursor — tudo da seção E.1 da checklist;
   - contagem de palavras do livro e do capítulo (a meta de palavras foi retirada na beta.7).
4. **Cortiça:** cartões dos capítulos (título, resumo, status, palavras) para reordenar **arrastando** (mouse e
   toque) e também pelo teclado (botões subir/descer, para acessibilidade). Reordenar grava só a `estrutura` da nota
   do livro (`setProperty`).
5. **Exemplo:** o livro de `app/src/data/books.ts` vira notas no cofre de exemplo do navegador
   (`app/src/data/demo-vault.ts`, acrescentando) e um livro pequeno (2 capítulos) entra em
   `desktop/tests/cofre-exemplo/Livros/`.
6. **Teste do Electron:** acrescente um passo no fim do `--write` de `desktop/src/main/smoke.ts` (antes da mesa) que
   abre o livro de teste, cria um capítulo pela tela e confere que ele entrou na `estrutura`; acrescente a condição
   em `smokePassed`.

**Pronto quando:**
- `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build` e o `--smoke` (com e sem `--write`)
  passam;
- abrir a pasta `Livros/<livro>` no Obsidian mostra notas comuns, e a `estrutura` aparece como lista de links;
- renomear um capítulo pelo app (Notas › renomear) mantém o livro com a ordem certa;
- funciona no celular (binder e cortiça viram telas, sem rolagem lateral) e nos temas escuro e claro.

## Fase 8b — prévia paginada e temas

**Entregar:**
1. **Prévia paginada ao vivo** ao lado do editor (no celular, alternando escrever/prévia): o livro inteiro (ou o
   capítulo aberto, se ficar lento) dividido em páginas como vai sair impresso, atualizando ~0,5 s depois de parar de
   digitar, sem perder a rolagem. O conteúdo é desenhado pelo **mesmo** `Markdown` do app; a paginação usa CSS de
   impressão (`@page`, `break-before`, colunas), para a fase 8c imprimir o PDF a partir do mesmo HTML e CSS.
   - Biblioteca de paginação: **Paged.js** ou **Vivliostyle** (docs/02, seção 2), ou CSS próprio se der conta.
     Precisa funcionar **offline**, com a CSP atual (sem `unsafe-eval`, sem buscar nada fora do app) e carregada só
     quando a prévia abre (`import()` dinâmico). Justifique a escolha na ADR 0009.
2. **Tamanhos de página** A4, Carta, A5 e 6×9 pol., com margens, número da página e cabeçalho corrente (título do
   livro / do capítulo). A escolha grava `pagina` na nota do livro.
3. **Temas** (gravam `tema`): **manual de RPG** (títulos em Cinzel, corpo em EB Garamond, papel creme, caixas como as
   do D&D), **pergaminho**, **moderno** e **minimalista**. O dialeto inteiro precisa ficar bonito nas páginas:
   `[!colunas]` com `quebra-coluna`, `[!largo]` atravessando colunas, `quebra-pagina`, capitular, statblock,
   descritivo, barra lateral, tabelas (listrada, mesclada), figuras com legenda, imagem flutuando. **CSS só com
   escopo do livro** (ex.: `.livro-pagina.tema-manual …` em `app/src/screens/books/`), sem mexer em
   `styles/markdown.css`. As fontes já estão no app (`@fontsource`), nada de fonte da internet.
4. **Capa, contracapa e página de créditos** geradas das propriedades da nota do livro (`capa`, título, subtítulo,
   autor, `contracapa`, `creditos`) e **editáveis na prévia** (campos que gravam a propriedade).
5. **Partes** abrem página nova; capítulos começam em página nova (opção no tema).

**Pronto quando:**
- a nota `Formatadores.md` colada como capítulo de um livro sai paginada sem quebrar nenhum formatador, nos quatro
  temas e nos quatro tamanhos (imagens no PR);
- o livro de exemplo (`data/books.ts`) com ~10 páginas pagina em menos de 2 s no desktop;
- `Ctrl+P` (imprimir) na prévia, no Electron, sai igual à tela;
- os mesmos comandos da 8a passam; acrescente no `--smoke` a abertura da prévia conferindo que há mais de uma página.

## Fora do escopo (não faça agora)

Exportar PDF/EPUB/DOCX/HTML (8c), importar Homebrewery/DOCX (8d), índice remissivo, glossário, fundos e marca d'água,
perfis de impressão com sangria e marcas de corte, comentários de revisão, snapshots, modo foco, CSS próprio do
usuário. Se algo disso sair de graça, deixe para um PR separado.

## Ao terminar cada fase

- PR em português, base `main`: o que mudou, imagens da tela (escuro, claro, celular), comandos rodados e o que
  ficou sem verificar.
- Acrescente em `docs/04-testes-pendentes.md` (seção "Etapa 8 — Livros") o que o dono precisa conferir à mão,
  principalmente como fica no Obsidian.
