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
   conferindo tamanho e CRC; pacotes antigos continuam abrindo. **Sob demanda** (PR C2): ao importar um pacote, só
   os textos (`.md`, `.json`, `.canvas`, `.base`, `.csv`…) ficam na memória, porque a prévia lê, reescreve links e
   confere mesas neles. Cada binário é conferido ao abrir (SHA-256 do manifesto no `.runas`; num ZIP sem manifesto,
   só o diretório), solto, e lido de novo do pacote, com o CRC conferido, na hora de gravar, um por vez. Assim o total
   só tem o teto do ZIP (4 GB) também no Android; por arquivo, 512 MB no desktop e 32 MB no Android, que passa cada
   arquivo inteiro pela ponte do Capacitor. Arquivos avulsos e ZIPs dentro do ZIP (Notion) continuam na memória.
3. **Plataforma**: `openSave(nome, mime)` devolve um destino com `write`, `close` e `abort`. No desktop, o diálogo
   abre antes, os pedaços (juntados em blocos de 8 MB) vão por IPC para um arquivo `<destino>.parcial`, que só ganha
   o nome final no `close`; `abort` e o fechamento do app apagam o parcial. No navegador, os pedaços viram um
   download no fim. Sem `openSave` (Android até o PR A2), a tela usa o caminho antigo.
4. **Limites**: desktop com 4 GB por pacote, 1 GB de conteúdo ao importar e 512 MB por arquivo; Android com os de
   antes (64/96/32 MB) até o PR A2. Quando o pacote passa de 128 MB, a tela avisa que ele só abre na 1.4 ou mais nova.
5. A versão dos arquivos lida no começo é conferida no fim; se algo mudou, a exportação é desfeita.
6. **Por itens** (PR B, U51/U52): `core/transfer/items.ts` lista wikis, livros, mesas, a biblioteca da mesa,
   campanhas, a Agenda e as outras pastas; o que nenhum item cobre vira “Outros”, então todo arquivo do cofre está em
   algum item. A wiki leva a pasta e os anexos que usa, onde estiverem; o livro, a pasta, os capítulos da `estrutura`
   de fora dela e a capa; a mesa, a pasta em `.runas/mesas/` e a capa (sem a campanha); a campanha, a pasta, os eventos
   da Agenda que apontam para ela e a mesa ligada. Um anexo compartilhado entra uma vez. “Incluir notas ligadas”
   começa desligado por itens (um link para outra wiki não a puxa inteira) e ligado por notas. A escolha por notas
   virou árvore com caixas de três estados; o filtro mostra os caminhos e tem “Selecionar os filtrados”. A tela conta
   notas, outros arquivos e tamanho antes de salvar e, no fim, confere que toda nota escolhida entrou no pacote; se
   faltar alguma, a exportação é desfeita.
7. **Importar por itens** (PR C, U53): o manifesto do `.runas` ganha o campo opcional `itens`
   (`[{ tipo, nome, raizes, caminhos }]`; `raizes` é lista porque o livro tem capítulos fora da pasta). O formato
   continua na versão 1: a 1.3 ignora o campo, e um `itens` malformado só faz a prévia voltar a deduzir. Sem o campo
   (pacotes da 1.3, ZIP do Obsidian, Notion, arquivos avulsos), `core/transfer/import-items.ts` deduz os itens pelas
   pastas com as mesmas regras da exportação. Cada item mostra se já está no cofre (arquivos novos, iguais e
   diferentes, comparando o conteúdo só dos de mesmo caminho e tamanho) e tem a sua ação: **adicionar só o que
   falta**, **substituir** (só os diferentes, com o pacote de segurança antes) ou **importar como cópia** com nome
   editável (wiki, livro em pasta, mesa, campanha e pasta). Anexos de fora da pasta entram se algum item marcado usa
   e ainda não estão no cofre; nunca são substituídos nem copiados, então a cópia aponta para a mesma imagem. Na cópia,
   a nota com o nome da pasta (página inicial da wiki, nota da campanha) ganha o novo nome; a mesa copiada ganha outro
   id e o título escolhido. A escolha “Por arquivos” continua igual a antes. A gravação mostra o progresso em arquivos
   e MB.

## Consequências

- Exportar o cofre inteiro ou uma wiki grande no desktop passa a funcionar; a memória usada é a de um arquivo por vez.
- O pacote de segurança da importação (antes de substituir) continua montado na memória; ele só tem os arquivos que
  serão substituídos.
- Verificação: testes do núcleo (o leitor da 1.3 abre o pacote novo, guardado × comprimido, leitura por partes,
  corrupção, limites) e o smoke do Electron, que exporta pela tela um pacote de 140 MB e o lê por partes.
