O cofre é uma pasta comum. O app não tem banco de dados escondido: cada nota é um `.md`, cada quadro um
`.canvas`, cada imagem o próprio arquivo. Dá para copiar, sincronizar e abrir no Obsidian.

### Somente leitura e liberar a gravação

Um cofre que o app não criou abre em **somente leitura**, para nada ser alterado sem você querer. Para escrever,
vá em Configurações › Cofre e libere a gravação. Enquanto estiver bloqueado, botões que gravam ficam desativados e
dizem por quê.

### Gravação segura

- O app grava sozinho depois de uma pausa na digitação (o ponto “Salvo” na barra da nota mostra o estado).
  <kbd>Ctrl</kbd> <kbd>S</kbd> grava na hora.
- Toda gravação confere a versão que foi lida. Se o arquivo mudou fora do app (no Obsidian, no Syncthing), o app
  **avisa e não sobrescreve**: você escolhe entre recarregar e manter o seu texto.
- O que não mudou não é regravado (a data do arquivo não muda à toa).
- Edições feitas fora do app aparecem na hora, sem reabrir.

### Lixeira e histórico

- **Mandar para a lixeira** (no ⋯ da nota) move o arquivo para `.trash/`, a mesma lixeira do Obsidian. Para ver e
  restaurar: Notas › ⋯ da lista › **Lixeira do cofre…** (ou procure “Lixeira do cofre” no <kbd>Ctrl</kbd> <kbd>K</kbd>).
- **Histórico de versões** (⋯ da nota ou <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>H</kbd>) guarda versões da nota
  neste aparelho; compare duas versões e restaure a que quiser.

### Backups

- Antes da **primeira gravação de cada dia**, o app guarda sozinho um backup do texto das notas, fora do cofre.
- No computador, Configurações › Backups agenda mais um por dia, no horário escolhido, e define quantos guardar (15
  no começo). Lá você também vê os últimos, faz um com **Fazer agora** e abre a pasta.
- Para guardar o **cofre inteiro**, com anexos e mesas, gere um pacote em Importar e exportar.

### Sincronização

O cofre pode ser sincronizado com Syncthing, Obsidian Sync ou qualquer outro serviço de pastas. Se a sincronização
criar uma cópia de conflito (`nota.sync-conflict-….md`, `nota (Conflicted copy).md`), ela aparece como uma nota
comum: abra as duas, junte o texto e mande a cópia para a lixeira.

### Anexos

Imagens coladas (<kbd>Ctrl</kbd> <kbd>V</kbd>) ou arrastadas para uma nota vão para a pasta de anexos (a mesma
configurada no Obsidian, ou a que você escolher em Configurações › Obsidian e anexos). Lá também dá para achar
**anexos sem uso** e mandá-los para a lixeira.

### Bloqueio por PIN

Em Configurações › Privacidade você pode pôr um **PIN** no app ou só no espaço Notas. O PIN impede abrir pelo app;
os arquivos continuam comuns na pasta (não são criptografados).
