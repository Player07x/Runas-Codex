# ADR 0019 — Fechamento do núcleo de notas: links, gráfico e notas pessoais (C5a)

- **Status:** aceita (2026-10-15)

## Contexto
A tarefa C5 fecha as seções A e F.1 da checklist. A varredura achou umas 30 coisas faltando; ela foi dividida em três
PRs pela ordem da checklist: **C5a** (A.1 links, A.2 gráfico e F.1 notas pessoais), C5b (organização e busca do A.3) e
C5c (o resto do A.3). "Compartilhar com" e o widget do Android ficam para a C8. Os arquivos protegidos
(`vault-index.ts`, `parse.ts`…) e o leitor de Markdown não mudam.

## Decisão
**Prévia de link** (`components/vault/LinkPreview.tsx`, `core/link-preview.ts`): os eventos são ouvidos na borda da
nota (`.editor-body`), a partir das marcas que o leitor e o live preview já põem nos links (`data-href`,
`data-lp-wiki`, `data-lp-href`) — o leitor não muda. Na leitura, basta passar o mouse; no modo de edição, com Ctrl
(ou Cmd), como no Obsidian; no celular, toque longo (a prévia vira folha no pé da tela, e o toque não abre o link nem o
menu do sistema). Link para `#título` ou `#^bloco` mostra só aquele trecho. Vale em todas as telas que usam a
`NoteView` (Notas, Wiki, sessões, Livros).

**`@` para linkar:** mais uma fonte do autocompletar do CodeMirror; só depois de espaço ou no começo da linha (e-mail
não dispara), fora de código e do frontmatter. Nota de outro espaço entra como `[[caminho|Nome]]`.

**Menções sem link** (`core/mentions.ts`): o nome e os apelidos, como palavra inteira, fora de código, comentários,
frontmatter e links. "Linkar" troca só aquele trecho, sem mudar o que se lê: `[[Nota]]` quando o texto é o próprio
alvo, `[[alvo|texto]]` quando é apelido, está escrito de outro jeito ou o link leva o caminho.

**Copiar link** (barra da nota e sumário): da nota (`[[Nome]]`, ou o caminho se o nome se repete no cofre), de um título
e do bloco onde está o cursor — o `^id` é criado como o Obsidian faz (`core/block-ref.ts`: no fim do parágrafo ou do
item; numa linha própria depois de citações e tabelas). Se o sistema negar a área de transferência, o app usa o jeito
antigo (`execCommand`).

**Endereço `runas://abrir?nota=<caminho>`** (`core/deep-link.ts`, `desktop/src/main/deep-links.ts`): o instalador
registra o esquema (`protocols` do electron-builder) e o app instalado também (`setAsDefaultProtocolClient`); em
desenvolvimento não registra. O caminho é relativo ao cofre e nada fora dele é aceito. A nota abre pelo mesmo canal que
um lembrete tocado já usava. Com isso o app passa a ter **uma cópia só por perfil**: abrir de novo (ou abrir um
`runas://`) traz a janela que já existe — o que também evita duas janelas gravando no mesmo cofre. O `--smoke` roda sem
essa trava.

**Timelapse do gráfico** (`core/graph-timelapse.ts`): as notas aparecem pela data da propriedade de criação (`criado`,
`created`, `date`, `data`) ou, sem ela, pela última modificação — o app não lê a data de criação do disco (o
`vault.ts` é protegido). Anexos e links quebrados aparecem junto da primeira nota que os cita. Uns 8 a 10 segundos.

**Notas pessoais (F.1):**
- *Fixar* e *cor* são propriedades (`fixada: true`, `cor: vermelho|dourado|verde|ciano|violeta`): valem nos outros
  aparelhos e aparecem no Obsidian como propriedades comuns. As fixadas vêm primeiro na pasta; a cor marca a borda.
- *Arquivar* move para `Notas/Arquivo/` (mantendo as subpastas), com os links atualizados, como se faz no Obsidian;
  desarquivar devolve. A pasta Arquivo fica por último e fechada.
- *Captura rápida:* `Ctrl+Alt+N` (atalho global) traz a janela numa nota nova. Funciona no Windows e no Linux com X11;
  na sessão Wayland o sistema não aceita atalho global do jeito clássico (o app avisa no log).
- *PIN do espaço Notas* (`core/pin.ts`, `lib/notes-lock.ts`): de 4 a 8 algarismos, guardado só neste aparelho
  (`localStorage`, PBKDF2 com sal); pede o PIN ao abrir as Notas até o app fechar ou alguém tocar em "Bloquear"; depois
  de 5 erros, 30 s de espera. Não criptografa os arquivos, e a prévia de link de outras telas não mostra notas do espaço
  bloqueado.

**Corretor:** o clique direito no app desktop ganha as sugestões do corretor, "Adicionar ao dicionário" (fica no
perfil do Chromium, para nomes do mundo) e recortar/copiar/colar (complementa a ADR 0018).

## Consequências
- Testes do núcleo: prévia (título, bloco, nota grande), menções (palavra inteira, apelidos, código e links de fora,
  linkar sem mudar o texto), `^id` (parágrafo, item, citação, tabela, CRLF, id repetido), endereço `runas://` (ida e
  volta, recusa de caminho fora do cofre), timelapse, fixar/cor/arquivar e PIN. O `--smoke` abre a prévia de um link
  com a CSP real; o menu do corretor é testado pela montagem dos itens.
- Ficam para depois: atalho global no Wayland pelo portal `GlobalShortcuts` (o GNOME pede permissão; decidir), PDF
  dentro da nota (a CSP proíbe moldura; hoje abre no leitor do sistema, na página certa) e o resto do A.3 (C5b e C5c).
