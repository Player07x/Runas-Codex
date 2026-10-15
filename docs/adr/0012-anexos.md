# ADR 0012 — Anexos e imagens nas notas

- **Status:** aceita para a C0 (2026-10-14). Importar, colar e arrastar (C1) e tamanho e posição (C2) completam esta
  ADR.

## Contexto

O dono pediu importar imagens no app, colar com Ctrl+V e arrastar para as notas, e mudar o tamanho e a posição da
imagem na nota. Até aqui o app só lia anexos (`vault-file://` no desktop) e só gravava texto: a `Platform` não tinha
como gravar bytes. As exportações e importações dos Livros (8c e 8d, do Codex) precisam da mesma coisa. O dono
autorizou mexer na gravação segura (`desktop/src/main/vault.ts`) para isso.

## Decisão (C0 — arquivos binários)

- **`Platform`** ganha `readBinary`, `writeBinary` e `saveBytes`. `writeBinary` segue as **mesmas regras** do
  `writeText`: caminho dentro do cofre, nada em pasta ou arquivo oculto nem através de link simbólico, `null` só cria,
  versão esperada recusa se o arquivo mudou fora, bytes iguais não são regravados e a gravação é atômica (temporário +
  troca). No desktop as duas gravações passam pela mesma função (`writeSafe`), para não divergirem.
- **Limite de 100 MB** por anexo lido ou gravado pela ponte (a interface recebe o arquivo inteiro de uma vez).
- **`useVault().addAttachment(nome, bytes, notaPerto?)`** grava na **pasta de anexos do Obsidian**, lida de
  `.obsidian/app.json` (`attachmentFolderPath`): `/` = raiz, `./` = pasta da nota, `./sub` = subpasta da nota, ou uma
  pasta do cofre. O nome é limpo (sem `[ ] # ^ | \ / : * ? " < >`, extensão em minúsculas) e numerado como o Obsidian
  quando já existe (`mapa 1.png`), sem diferenciar maiúsculas. Pasta de anexos oculta ou fora do cofre é recusada com
  a explicação.
- O `ObsidianConfig` passa a ler também o `app.json` (`attachmentFolderPath`, `newLinkFormat`, `useMarkdownLinks`),
  para a C1 escrever o link no formato que o Obsidian usaria.
- **Navegador (memória):** os bytes ficam na aba e aparecem por endereços `blob:`; `saveBytes` baixa o arquivo.

## Consequências

- Testes: gravação e leitura de bytes no desktop (`desktop/tests/vault.test.ts`), plataforma em memória, pasta de
  anexos, nome limpo e numeração (`core/attachments.test.ts`); o `--smoke --write` grava uma imagem, lê de volta,
  confere as recusas e mostra a imagem por `vault-file://`; o `--smoke` só de leitura confere a recusa.
- Anexos continuam fora dos backups (só texto, ADR 0005).
- No Android, os binários chegam com o cofre real (etapa A).
