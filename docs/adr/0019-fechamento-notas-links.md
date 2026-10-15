# ADR 0019 — Fechamento do núcleo de notas: links, gráfico, notas pessoais (C5a), organização e busca (C5b)

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
- *Captura rápida:* `Ctrl+Alt+N` (atalho global) traz a janela numa nota nova. Funciona no Windows e no Linux com X11.
  No Wayland, só pelo portal `GlobalShortcuts`: o app liga a opção do Electron, mas em 15/10/2026 (Electron 44.4.2,
  GNOME 50.1) o Electron registra o app no portal e não abre a sessão de atalhos — o `register` falha, inclusive com o
  identificador no formato `dev.runas.codex` que o GNOME 50.0/50.1 exige ([electron#51875], [electron#52218]). O app
  avisa no log e o atalho volta a funcionar quando o Electron resolver (talvez com a troca do identificador).
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
- Ficam para depois: atalho global no Wayland (depende do Electron; ver acima), PDF
  dentro da nota (a CSP proíbe moldura; hoje abre no leitor do sistema, na página certa) e o resto do A.3 (C5b e C5c).

## C5b — organização e busca (A.3, primeira parte)

**Busca com operadores** (`core/search.ts`): a sintaxe do Obsidian — termos (todos precisam aparecer), `"frase"`,
`-termo`, `OR`, `path:`, `file:`, `tag:`, `content:`, `line:(…)`, `section:(…)`, `[propriedade]`,
`[propriedade:valor]` e `/regex/`. Sem diferenciar maiúsculas nem acentos, como a busca que já existia; a regex segue as
regras do JavaScript (`(?i:…)` para ignorar maiúsculas nela). Uma regex inválida mostra o aviso em vez de quebrar a
lista. Vale na lista de Notas, na Wiki e nos filtros e grupos do gráfico. O `index.search` do `vault-index.ts`
(protegido) não muda; ele segue servindo o alternador rápido e o autocompletar.

**Buscar e substituir** (`core/replace.ts`, `components/vault/ReplaceDialog.tsx`): nas notas da busca atual (ou do
espaço inteiro), texto literal ou regex com `$1`…, palavra inteira e maiúsculas. Por padrão o frontmatter fica de fora
(para não quebrar o YAML). A prévia mostra as linhas de antes e depois por nota, e dá para desmarcar notas. Antes de
gravar, o app faz um **backup** do cofre; cada nota passa pelo `useVault().save` com a versão lida, e uma nota que mudou
desde a prévia fica de fora (com aviso). Regex que acha texto vazio é recusada.

**Propriedades tipadas** (`core/property-types.ts`, painel "Prop."): texto, lista, número, caixa, data, data e hora e
link, como o Obsidian. O tipo vem do `.obsidian/types.json` quando ele declara a chave; senão, do valor (`2026-10-17`
é data, `[[Nota]]` é link). Um valor que não cabe no tipo declarado aparece pelo tipo dele, para não ser apagado.
Chaves `*_mundo` (datas do calendário do mundo, ADR 0010) são sempre texto: o seletor de data usaria o calendário
gregoriano. Datas são gravadas entre aspas (o `setProperty` já fazia isso). O app **não grava** o `types.json`: o
Obsidian deduz o tipo pelo valor na primeira vez que vê a chave. O link ganha um botão para abrir a nota (ou criá-la).

**Favoritos** (`core/bookmarks.ts`, `lib/bookmarks.ts`): notas, títulos (pelo sumário), pastas e buscas, no formato
do `.obsidian/bookmarks.json` (plugin Marcadores). O app **não grava no `.obsidian`** — a gravação segura recusa pastas
ocultas e é protegida —, então os favoritos do app são **deste aparelho** (`localStorage`, um conjunto por cofre) e os
marcadores do Obsidian aparecem junto, só para leitura (com a marca "Obsidian"; os grupos viram uma lista). Renomear
ou mover nota ou pasta leva os favoritos junto. Se o dono quiser os favoritos do app sincronizados pelo cofre, o
caminho é liberar a gravação de `.obsidian/bookmarks.json` num PR pequeno da gravação segura.

**Voltar/avançar** (`core/nav-history.ts`, `lib/router.ts`): o histórico é o do navegador (o roteador é por hash);
cada entrada ganha um número no `history.state`, para o app saber se dá para voltar ou avançar. Botões na barra da nota
(somem quando a barra fica estreita), `Alt+←`/`Alt+→` (também com Ctrl, como no Obsidian — no GNOME o Ctrl+Alt+setas
troca de área de trabalho), os botões laterais do mouse e a paleta. No editor, `Alt+←` continua andando pelo texto. As
rotas de ação (`/notas/nova`, `/notas/hoje`, `/notas/aleatoria`) trocam a entrada atual em vez de criar outra: antes,
voltar para `/notas/nova` criava mais uma nota.

**Nota aleatória:** botão na lista de Notas e comando na paleta; sorteia no espaço aberto, fora as arquivadas e a nota
aberta.

**Árvore:** arrastar nota ou pasta para outra pasta (ou para fora delas, para a raiz do espaço) move com os links
atualizados — o mesmo caminho de "Renomear ou mover" —, e a nota aberta acompanha. Antes de mover (e de abrir o
buscar e substituir), o editor grava o que estava pendente (`flushOpenNotes`). Soltar uma nota da árvore dentro do
editor insere `[[link]]`, como no Obsidian. A ordem (nome A–Z e Z–A, editadas e criadas por último ou há mais tempo) é
preferência do aparelho; as fixadas continuam primeiro e as pastas ficam por nome. No celular não há arrastar (o
Android não arrasta a partir do toque nesse tipo de lista): mover é pelo "Renomear ou mover".

**Consequências (C5b):** testes do núcleo para a busca (cada operador, OR, exclusão, regex inválida), substituir
(literal com `$`, palavra inteira, regex com olhar à frente e grupos, frontmatter, amostras), tipos de propriedade,
favoritos (bookmarks.json com grupos, renomear), histórico e nota aleatória, ordem e destino ao arrastar. Ficam para a
C5c: abas e painéis divididos, workspaces, várias janelas, Bases, consultas dinâmicas, extrair/mesclar, histórico de
versões, restaurar da lixeira, contagem de palavras, comandos `/`, atalhos configuráveis, trechos CSS e ícones.

[electron#51875]: https://github.com/electron/electron/issues/51875
[electron#52218]: https://github.com/electron/electron/issues/52218
