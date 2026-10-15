# ADR 0012 — Anexos e imagens nas notas

- **Status:** aceita (C0, C1 e C2, 2026-10-14).

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

## Decisão (C1 — importar, colar e arrastar)

- **Três caminhos, um só fluxo:** o botão "Inserir imagem" da barra do editor (seletor de arquivos, várias de uma
  vez), **Ctrl+V** e **arrastar** para o editor (live preview e código) chamam o mesmo `addAttachment` e inserem o
  link. Funciona em toda tela que usa o `NoteView` (Notas, Wiki, Campanhas, capítulos dos Livros).
- **Imagem colada** se chama `Imagem colada AAAAMMDDHHmmss.<ext>` (o Obsidian usa "Pasted image" com o mesmo carimbo),
  com a extensão pelo tipo (`image/png`, `image/jpeg`, `gif`, `webp`, `avif`, `svg`, `bmp`). Arquivo arrastado ou
  importado mantém o nome, limpo.
- **Colar com texto junto é colar texto:** planilhas e editores de texto põem uma "foto" do trecho na área de
  transferência junto com o texto; nesse caso o app cola o texto. Só a imagem sozinha vira arquivo.
- **Arrastar** aceita imagem, áudio, vídeo e PDF (o que o leitor mostra dentro da nota); outros tipos são recusados com
  aviso, em vez de o CodeMirror colar o conteúdo do arquivo como texto.
- **O link entra numa linha só sua** (quebra antes e depois quando precisa), no cursor ou onde a imagem foi solta. O
  formato segue o `app.json`: `![[nome.png]]` com o nome curto quando é único (o mesmo `linkTarget` do resto do app)
  ou `![](caminho%20com%20espaço.png)` com links em Markdown (relativo ou completo, como configurado).
- Copiar e colar um embed que já está no cofre copia só o texto do link (o arquivo não é duplicado).
- **Configurações** mostra o formato de link e a pasta de anexos lidos do `app.json` (somente leitura: muda-se no
  Obsidian).

## Decisão (C2 — tamanho e posição)

- **Formato** (testado no Obsidian 1.14.4 numa cópia isolada, sem tocar nos cofres do dono): a posição vai no apelido
  do embed, **antes do tamanho**: `![[mapa.png|direita|300]]` ou `![direita|300](mapa.png)`. O Obsidian lê o último
  trecho como tamanho (`width`) e o resto como texto alternativo (`alt="direita"`); com a ordem trocada
  (`|300|direita`) o tamanho se perde, por isso o app sempre grava nessa ordem. Posições: `esquerda` e `direita` (a
  imagem flutua e o texto corre em volta, até 45% da largura), `centro` e `largo` (largura total, ignora o tamanho).
- **Leitor** (`core/embeds.ts`, `markdown/EmbedImage.tsx`): o apelido é lido como no Obsidian — o que mudou é que
  `Legenda|300` agora dá texto alternativo "Legenda" e largura 300, como lá (antes virava legenda inteira, sem
  tamanho). Imagens em link Markdown também ganham tamanho e posição pelo texto alternativo. Classes `pos-*` em
  `styles/markdown.css` (o dono autorizou esta mudança no leitor).
- **Snippet do Obsidian** (`runas-codex.css`): regras por `alt` exato (`.image-embed[alt="direita"]`), conferidas no
  Obsidian nas quatro posições e nos dois formatos de link ([imagem](../imagens/anexos/c2-obsidian-posicoes.png)).
  Quem já instalou o snippet precisa instalar de novo (Configurações › Snippet).
- **Editar no live preview:** passar o mouse (ou tocar, no celular) mostra um menu com as quatro posições (clicar na
  ativa tira a posição) e "tamanho original", e uma alça no canto para arrastar o tamanho (setas do teclado mudam de
  20 em 20 px). Ao soltar, o app regrava **só o apelido** daquele embed, no mesmo formato e com o mesmo separador
  (`\|` em tabelas); se o texto mudou no meio, não grava. No editor a imagem fica alinhada, sem o texto em volta (o
  CodeMirror mede uma linha por vez); o texto em volta aparece na leitura e no Obsidian. No modo leitura não há alças:
  ele é só para ler, como no Obsidian. Imagens de notas transcluídas não se editam dali (são da outra nota).
- **Anexos sem uso** (Configurações): lista imagens, áudios, vídeos e PDFs que nenhuma nota nem quadro usa — sem
  backlink e sem o nome do arquivo em nenhum texto (propriedades, blocos como `runas-mapa`, HTML, `.canvas`) — e manda
  os escolhidos para a lixeira do cofre.

## Consequências

- Testes (C2): leitura e escrita do apelido (`core/embeds.test.ts`), troca do embed certo no texto, recusa quando
  ele sumiu e anexos sem uso; o menu e a alça foram conferidos no navegador (posição e tamanho regravados no link).
- Testes (C1): nome da imagem colada, extensão pelo tipo, texto do embed nos formatos de link, rótulo da pasta de
  anexos e renomear um anexo mantendo tamanho e posição (`core/rename.test.ts`); o `--smoke --write` cola uma imagem
  numa nota pelo evento de colar do editor e confere o arquivo, o link e a imagem na leitura.
- Testes (C0): gravação e leitura de bytes no desktop (`desktop/tests/vault.test.ts`), plataforma em memória, pasta de
  anexos, nome limpo e numeração (`core/attachments.test.ts`); o `--smoke --write` grava uma imagem, lê de volta,
  confere as recusas e mostra a imagem por `vault-file://`; o `--smoke` só de leitura confere a recusa.
- Anexos continuam fora dos backups (só texto, ADR 0005).
- No Android, os binários chegam com o cofre real (etapa A).
