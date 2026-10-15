# Tarefa: anexos e imagens nas notas (C0, C1, C2)

**Para:** Claude Code. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a [divisão](README.md), a seção 5 de
[docs/02](../02-viabilidade-e-etapas.md) e o item "Gestão de anexos" (A.3) da
[checklist](../01-checklist-recursos.md).

Pedido do dono (14/10/2026): importar imagens dentro do app, colar com Ctrl+V e arrastar para as notas, e editar o
tamanho e a posição da imagem na nota. **Autorizado pelo dono na mesma data:** mexer na gravação segura
(`desktop/src/main/vault.ts`, regra 4) para gravar binários e mudar como o leitor desenha imagens
(`markdown/Embed.tsx`, regra 7), num PR pequeno só com isso (C2).

Três PRs, nesta ordem. ADR nova: `0012-anexos.md`.

## C0 — arquivos binários no cofre (`anexos/binarios`) — sai primeiro, destrava a 8c e a 8d do Codex

```ts
// Platform (app/src/platform/platform.ts), só acrescentando
readBinary(path: string): Promise<Uint8Array>
writeBinary(path: string, bytes: Uint8Array, expected?: VaultEntry | null): Promise<VaultEntry>
/** Salva bytes onde o usuário escolher (exportações); devolve o nome, ou `null` se cancelou. */
saveBytes(name: string, bytes: Uint8Array, mime: string): Promise<string | null>

// useVault() (app/src/platform/VaultProvider.tsx)
/** Grava um anexo novo na pasta de anexos do Obsidian (relativa a `nearNote`, se a configuração for `./`). Devolve o caminho. */
addAttachment(fileName: string, bytes: Uint8Array, nearNote?: string): Promise<string>
```

- `writeBinary` segue as mesmas regras do `writeText`: caminho dentro do cofre e fora das pastas ocultas, `null`
  cria e recusa se já existir, `expected` recusa se o arquivo mudou, gravação atômica, cofre em somente leitura
  recusa.
- `addAttachment` lê a pasta de anexos de `.obsidian/app.json` (`attachmentFolderPath`: raiz, pasta fixa, `./` ou
  `./subpasta`), cria a pasta se faltar, evita nome repetido como o Obsidian (`nome 1.png`) e atualiza o índice.
- Electron, memória (navegador e testes) e IPC; testes em `desktop/tests/vault.test.ts` e no `VaultProvider`; um passo no
  `--smoke --write` grava um anexo e lê de volta.

## C1 — importar, colar e arrastar (`anexos/imagens`)

- **Importar:** botão "Inserir imagem" na barra do editor (e no menu do celular) que abre o seletor de arquivos.
- **Ctrl+V:** imagem copiada de outro programa ou do navegador vira um arquivo `Imagem colada AAAAMMDDHHmmss.png` na
  pasta de anexos, e o link entra no cursor. Copiar e colar um embed que já está no cofre só copia o texto do link.
- **Arrastar** um ou mais arquivos de imagem para a nota (no lugar onde soltou).
- O link segue o "formato de link novo" e "links em Markdown" do `app.json` (`![[nome.png]]` ou
  `![](caminho.png)`).
- Cofre em somente leitura: explica e não grava. No Android, só a partir da C8 (cofre real).
- **Renomear um anexo atualiza os links** (conferir que já acontece e cobrir com teste).

## C2 — tamanho e posição (`anexos/tamanho-posicao`)

- **Tamanho:** alças na imagem no live preview e no modo leitura; ao soltar, o app regrava só o `|largura` do link
  (`![[mapa.png|400]]`, formato que o Obsidian já entende).
- **Posição:** menu da imagem com esquerda, centro, direita e largura total. **Formato (testado no Obsidian 1.14.4
  em 14/10/2026):** `![[mapa.png|direita|300]]`, com a marca **antes** do tamanho. O Obsidian põe a marca em `alt` e
  o tamanho em `width` (`.image-embed[alt="direita"][width="300"]`), no modo leitura e no live preview; no Markdown
  padrão vale o mesmo (`![direita|300](mapa.png)`). Com a ordem trocada (`|300|direita`) o tamanho se perde. O
  snippet `runas-codex.css` ganha as regras (`.image-embed[alt~="direita"] { float: right }` e as outras), que já
  foram conferidas no Obsidian ([imagem](../imagens/anexos/obsidian-posicao-imagem.png)), e a tabela do dialeto
  (docs/02, seção 5) ganha a linha nova.
- **Anexos órfãos:** lista de anexos que nenhuma nota usa, com a opção de mandar para a lixeira.
- Avisar o Codex no PR: os temas dos livros (`screens/books/`) precisam respeitar as classes novas de posição na
  prévia e na exportação.

## Pronto quando

- colar uma captura de tela, arrastar uma foto e importar pelo botão gravam o arquivo na pasta de anexos certa e o
  Obsidian mostra a imagem na nota;
- redimensionar e posicionar pela imagem mudam só o link, e o Obsidian (com o snippet) mostra igual;
- os comandos de sempre e os dois `--smoke` passam; o que precisa de conferência manual vai para
  `docs/04-testes-pendentes.md`.
