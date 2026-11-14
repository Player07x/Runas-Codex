# ADR 0037 — Transferências em pedaços (atualização 1.4, U50)

- **Status:** aceita (2026-11-13)
- **Atualiza:** os limites da [ADR 0020](0020-transferencias.md). O formato do pacote não muda.

## Contexto

O pacote `.runas` era montado inteiro na memória (`zipSync`) e salvo de uma vez (`saveBytes`; no Android, em base64
pela ponte do Capacitor), com teto de 128 MB compactados e 256 MB de conteúdo no desktop (64 e 96 MB no Android). O
cofre real do dono tem 562 MB, e uma wiki com as imagens que usa, cerca de 253 MB: nenhum dos dois saía. Imagens PNG
quase não comprimem, então o tamanho compactado fica perto do real.

## Decisão

1. **Escritor ZIP próprio** (`core/transfer/zip-stream.ts`): um arquivo por vez, com tamanho e CRC no cabeçalho local
   e sem descritor de dados, para o leitor da 1.3 abrir os pacotes que cabem nos limites dele. Texto vai comprimido
   (deflate do fflate); imagens, áudio, vídeo, PDF e outros já comprimidos vão guardados. O manifesto do `.runas`
   (`format: runas-codex`, `version: 1`, SHA-256 por arquivo) vai no fim. Sem ZIP64: até 4 GB e 65.534 arquivos.
2. **Leitor por partes**: lê o diretório central e depois cada arquivo pelo deslocamento (`File.slice` na tela),
   conferindo tamanho e CRC; pacotes antigos continuam abrindo. O conteúdo descompactado ainda fica na memória até a
   gravação, com teto de 1 GB no desktop; a leitura sob demanda entra com a importação por itens (PR C).
3. **Plataforma**: `openSave(nome, mime)` devolve um destino com `write`, `close` e `abort`. No desktop, o diálogo
   abre antes, os pedaços (juntados em blocos de 8 MB) vão por IPC para um arquivo `<destino>.parcial`, que só ganha
   o nome final no `close`; `abort` e o fechamento do app apagam o parcial. No navegador, os pedaços viram um
   download no fim. Sem `openSave` (Android até o PR A2), a tela usa o caminho antigo.
4. **Limites**: desktop com 4 GB por pacote, 1 GB de conteúdo ao importar e 512 MB por arquivo; Android com os de
   antes (64/96/32 MB) até o PR A2. Quando o pacote passa de 128 MB, a tela avisa que ele só abre na 1.4 ou mais nova.
5. A versão dos arquivos lida no começo é conferida no fim; se algo mudou, a exportação é desfeita.

## Consequências

- Exportar o cofre inteiro ou uma wiki grande no desktop passa a funcionar; a memória usada é a de um arquivo por vez.
- O pacote de segurança da importação (antes de substituir) continua montado na memória; ele só tem os arquivos que
  serão substituídos.
- Verificação: testes do núcleo (o leitor da 1.3 abre o pacote novo, guardado × comprimido, leitura por partes,
  corrupção, limites) e o smoke do Electron, que exporta pela tela um pacote de 140 MB e o lê por partes.
