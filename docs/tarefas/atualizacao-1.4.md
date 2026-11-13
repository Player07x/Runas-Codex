# Atualização 1.4.0 — Importar e exportar tudo, por itens

> Plano do Claude (líder desta atualização), feito a partir do pedido do João de 13/11/2026, com o código da `main`
> em `98435be` (v1.3.0) e medidas tiradas do cofre real dele no mesmo dia. Página visual com as maquetes:
> [`atualizacao-1.4-maquetes.html`](atualizacao-1.4-maquetes.html). Em 13/11 o João mandou seguir com as
> recomendações (as seis decisões do fim valem como recomendadas) e começar pelo PR A.
>
> **Ajuste do líder ao começar:** o PR A leva o núcleo (escritor e leitor ZIP em pedaços) e a gravação em pedaços no
> desktop; no Android, os limites de hoje ficam até o **PR A2**, que traz a gravação em pedaços pelo plugin nativo
> (e, se o tempo medido pedir, a montagem do ZIP no Java). Assim o PR A fica pequeno o bastante para revisar.

Pedido: (1) exportar e importar **todas** as notas selecionadas; (2) em vez de marcar nota por nota, **escolher quais
wikis, livros e mesas** exportar e importar; (3) revisar telas no celular, a começar pela Agenda (Mês e Tarefas).
Funções novas depois da 1.3 = **1.4.0** (ADR 0025, adendo de SemVer). Itens **U50 a U68**. As regras D1–D17 de [`atualizacao-1.2.md`](concluidas/atualizacao-1.2.md#regras-de-design-valem-para-todo-pr-de-tela)
valem para todo PR de tela, e cada PR segue o `AGENTS.md`.

## Por que hoje nem tudo sai (causa achada)

O pacote é montado **inteiro na memória** e tem teto fixo (ADR 0020):

| Limite | Desktop | Android | Onde |
|---|---|---|---|
| Pacote compactado | 128 MB | 64 MB | `core/transfer/archive.ts:5`, `TransferWorkspace.tsx:62` |
| Conteúdo descompactado | 256 MB | 96 MB | idem |
| Por arquivo | 50 MB | 32 MB | idem; recusado em `TransferWorkspace.tsx:89` |

O ZIP sai de um `zipSync` só (`archive.ts:178`) e vai para o disco num `saveBytes` só; no Android, em **base64**
pela ponte do Capacitor (`capacitor-platform.ts:155`). Imagens PNG quase não comprimem, então o tamanho compactado
fica perto do tamanho real.

Medido no cofre do João (`du` e `stat`, 13/11/2026):

| O que | Tamanho | Resultado hoje |
|---|---|---|
| Cofre inteiro (1.051 arquivos, 531 notas) | 562 MB | recusado nos dois sistemas |
| Wiki Cronos + as imagens que ela usa (230 arquivos na pasta, imagens em `Anexos/Imagens`) | ~253 MB | recusado (passa de 128 MB compactados; no Android, de 96 MB) |
| `Anexos/Galeria/*.kra` (2 arquivos) | 58 MB cada | recusados pelo limite por arquivo, o que derruba “Cofre inteiro” logo no início |
| Wiki Valknut, livros, campanhas | < 1 MB cada | cabem |
| Mesa Jornada para Vatu / Biblioteca da mesa | 13 MB / 11 MB | cabem |

Leitura minha (não executei a exportação no app, só medi o disco e li o código): a wiki Cronos, recém-importada do
Discord, **não sai** por nenhum caminho da tela atual, e o cofre inteiro também não.

A segunda causa é a tela: “Escolher arquivos” é uma lista plana de caminhos, 100 por vez, com filtro por texto
(`TransferWorkspace.tsx:192-195`). Não há como marcar “a wiki Cronos” nem “os filtrados”; e o “O que exportar” só
conhece pastas de primeiro nível (`:14`).

## Itens

| Item | O quê | PR |
|---|---|---|
| U50 | **Pacotes sem o teto de memória**: o ZIP é escrito em pedaços, direto no arquivo de destino; a importação lê o pacote por partes (`Blob.slice`), um arquivo por vez | A |
| U51 | **Seleção que leva tudo**: árvore de pastas com caixas de três estados, “Selecionar os filtrados”, contagem de notas, anexos e MB antes de salvar e **conferência no fim** (todas as notas escolhidas estão no pacote) | B |
| U52 | **Exportar por itens**: lista de wikis, livros e mesas (mais campanhas, biblioteca da mesa, agenda e notas soltas) com tamanho de cada um; vale para pacote `.runas`, ZIP do Obsidian e documento | B |
| U53 | **Importar por itens**: a prévia agrupa o pacote por item (“Wiki Cronos — nova”, “Livro X — já existe”), com caixa e ação por item: adicionar o que falta, substituir (com pacote de segurança) ou importar como cópia com nome editável | C |
| U54 | **Atalhos nos módulos**: “Exportar esta wiki…”, “Exportar livro (pacote)…”, “Exportar mesa…”, “Exportar campanha…” e “Exportar pasta…” abrem Importar / Exportar com o item já marcado | D |
| U55 | *(o João decide)* Seleção múltipla na barra das Notas (Ctrl/Shift + clique; modo “Selecionar” no celular) com “Exportar seleção…” | D |
| U56 | **Agenda no celular, topo**: o calendário só começa a 319 px do topo (37% da tela) | E |
| U57 | **Mês no celular**: todo dia mostra os mesmos 4 pontos das rotinas; sessão e prova podem sumir | E |
| U58 | **Tarefas no celular**: cada tarefa ocupa 126 px, mesmo com título curto; cabem ~2,5 na primeira tela | E |
| U59 | **Botões de criar**: três “+” na Agenda (barra do topo, “Evento”, flutuante) e o flutuante cobre conteúdo | E |
| U60 | **Varredura das outras telas no celular** a 360 px — feita em 13/11; resultado em U61–U68 | — |
| U61 | **Pilha de barras sobre o texto** (nota, artigo da wiki, sessão de campanha) | F |
| U62 | *(o João decide)* **Artigo da wiki abre em Editar no celular** | F |
| U63 | **Livro no celular**: o painel de capítulos cobre o texto pela metade; barra com 6 ícones e dois ⋯ | G |
| U64 | **Botão + flutuante cobre conteúdo** também nas Notas (lista e nota aberta) | F |
| U65 | **Topo**: trilha cortada (“Campanhas › A …”) e caminhos crus nos rótulos (“WIKI · WIKIS/ORDEM X CAOS/”) | F |
| U66 | **Início da wiki e buscas**: três botões empilhados no cartão; dicas de sintaxe cortadas no campo de busca | F |
| U67 | **Alvos de toque abaixo de 44 px** em quatro lugares | F |
| U68 | **Notas**: cabeçalho duplo (“Lista de notas” e “Notas”) e dica fixa | F |

## Telas no celular (U56–U60)

Pedido de 13/11 (depois do plano de transferências), com duas capturas: Agenda › Mês e Agenda › Tarefas numa janela
estreita. Reproduzi as duas no navegador a 420 × 860 px, com o cofre de exemplo, e medi pelo `getBoundingClientRect`.

| Item | O que se vê | Causa no código | Correção |
|---|---|---|---|
| U56 | Antes da grade: cabeçalho “Agenda” (já está na barra do topo), botão Evento, setas + Hoje, o título do período e as cinco visões em **duas linhas** (99 px). A grade começa em y = 319. Na visão Tarefas, as setas somem com `visibility: hidden` e deixam o buraco, e “Tarefas” aparece duas vezes | `AgendaScreen.tsx:366-398`; `.agenda-nav .segmented { order: 3; width: 100% }` em `agenda.css:82` | Até 640 px: período + setas numa linha, “Hoje” como ícone; as cinco visões numa linha de ícones com rótulo curto embaixo (5 × 64 px cabem em 320 px); sem o título duplicado; na visão Tarefas, a linha de navegação não ocupa espaço. Meta: grade a ≤ 190 px do topo |
| U57 | Todo dia com 4 pontos iguais. As 6 rotinas do João (eventos que repetem quase todo dia da semana) ocupam os 4 pontos, que são os 4 primeiros pela hora; uma sessão à noite ou a prova fica de fora, sem “+N”. Dias de dezembro com o mesmo peso dos de novembro | `views.tsx:153-156` (`items.slice(0, 4)`); `.month-cell.outside` só muda o fundo | Até 640 px: eventos únicos (sessões, provas, consultas) primeiro; rotinas viram **uma** marca fina na base da célula; no máximo 3 pontos e “+N”; dias fora do mês com número apagado. Opção “Mostrar rotinas no mês” no ⋯ (por aparelho, `localStorage`) |
| U57 | Espaço vazio de ~84 px sob a grade e o “Painel da agenda” recolhido coberto pelo botão flutuante | `.agenda-main { padding-bottom: 72px }` (`agenda.css:87`) vale para toda visão | A folga vai para o fim da página, não para dentro do cartão; o painel recolhido fica acima do botão |
| U58 | Cada tarefa: linha do título, linha de campos, linha só do link da nota (44 px, `padding-block: 10px`) e linha só dos botões (44 px). Medido: 126 px por tarefa. Campos crus do Tasks: “🏁 mantém”, “▲” sem texto | `tasks.css:27` e `:52-59` (`.task-actions { width: 100% }`); `AgendaTasks.tsx:9` não esconde “on completion” | Linha compacta: caixa (44 px de toque) + título + ⋯ na mesma linha; embaixo, uma linha só com prazo, repetição e nota (truncada). Pular, editar e falhar vão para o ⋯; tocar no título abre “Editar tarefa”. Esconder “Ao concluir”; prioridade com texto (“Alta”). Meta: ≤ 72 px por tarefa |
| U58 | Formulário de nova tarefa com 148 px (texto, data, “Todo dia”, Adicionar em três linhas) | `.agenda-tasks-add` | Uma linha: campo + botão “+”; data e “Repetir todo dia” aparecem ao focar o campo |
| U59 | “+” da barra do topo (criar qualquer coisa), “Evento” no cabeçalho e o botão flutuante, que na visão Tarefas **cria um evento** e cobre a última tarefa | `AgendaScreen.tsx:513` | No celular: sai o “Evento” do cabeçalho; o flutuante segue a visão (Tarefas = nova tarefa, foca o campo; demais = novo evento) e a lista ganha folga para ele não cobrir nada |

Observação do cofre do João (não é defeito do app): a linha da tarefa diária dele usa `🏁 keep`, então cada dia
concluído **fica** na nota; o hábito criado pela Agenda usa `🏁 delete` (`core/tasks/agenda.ts:107`). O PR E pode
oferecer “Transformar em hábito” no ⋯ da tarefa diária; fica para ele decidir (pergunta 6).

## Varredura no celular (U60 → U61–U68)

Feita em 13/11 a pedido do João, com o cofre de exemplo do navegador, tema escuro, 360 × 780 px: 15 telas
capturadas pelo Chrome sem tela (`--window-size=360,780`, escala 2) e medidas no navegador do app (rolagem lateral,
alvos de toque, posição do texto). As capturas estão em [`celular-1.4/`](celular-1.4/).

**Sem problema relevante:** Início, Livros (lista), Mapas da wiki, Campanhas (lista), VTT, Criar sala,
Configurações. **Nenhuma tela rola para os lados a 360 px.** Importar/Exportar vai ser refeita nos PRs B e C e já
nasce pensada para o celular.

| Item | Gravidade | O que se vê (medido na captura, 360 × 780) | Correção proposta |
|---|---|---|---|
| U61 | grave | Até sete faixas antes do texto. **Artigo da wiki**: barra do topo, wiki + “Visão do mestre”, um “⋯” sozinho numa linha, seletor “Artigos”, cabeçalho do artigo, Leitura/Editar/Código e as propriedades: o título fica em y ≈ 578 e a primeira linha do texto em ≈ 633, quase no rodapé. **Sessão de campanha**: título em ≈ 517. **Nota**: a faixa de abas (uma aba só) + cabeçalho + modos; título em ≈ 372 | Até 640 px: uma faixa só para o módulo (nome ▾ + seção ▾ + ⋯, 48 px); o cabeçalho da nota leva título, um botão Ler/Editar e ⋯; sem a faixa de abas no celular (as abas abertas ficam no ⋯); propriedades recolhidas (“Propriedades (5) ▸”). Meta: título até 260 px do topo |
| U62 | grave | O artigo da wiki abre em **Editar**: propriedades cruas (`[[Ordem da Chama Cinzenta]]`, `data_fim_mundo` quebrado em duas linhas) no lugar da ficha | No celular, artigos da wiki abrem em Leitura; quem preferir troca em Configurações › Editor (por aparelho). As notas comuns continuam como estão |
| U63 | grave | **Livro aberto**: o painel de capítulos abre por cima do texto e não cobre a largura toda (sobram pedaços de frase à direita); a barra tem 6 ícones sem rótulo e dois “⋯” | No celular, o painel vira folha inteira (abre por “Capítulos”, fecha ao escolher um); barra com Capítulos, Ler/Escrever e um ⋯ só |
| U64 | médio | O “+” flutuante cobre as últimas linhas da lista de Notas e o texto da nota aberta (e não há folga no fim da lista) | Regra para todo flutuante (com a U59): a lista ganha folga do tamanho do botão; na nota aberta em edição, o botão some |
| U65 | médio | A trilha da barra do topo fica cortada a ponto de não dizer nada (“Campanhas › A …”, “Sessões › Sessã…”, “Livros › Caderno…”); rótulos mostram o caminho da pasta (“WIKI · WIKIS/ORDEM X CAOS/”, “ESPAÇO CAMPANHAS · CAMPANHAS/”) | No celular, a barra mostra só a página atual (a trilha inteira fica no botão voltar); rótulos com o nome (“Wiki Ordem x Caos”) |
| U66 | médio | Início da wiki: cartão com Personalizar, Nova categoria e Novo artigo um embaixo do outro; o primeiro artigo fica fora da primeira tela. Buscas com a sintaxe no texto de exemplo, cortada (“Buscar (tag:, path:, line:, [prop:valor”) | “Novo artigo” fica, os outros dois vão para o ⋯; busca com “Buscar notas” / “Buscar na wiki” e um “?” que explica `tag:`, `path:` etc. |
| U67 | médio | Alvos menores que 44 px: grupos da barra das Notas (Favoritos, Bases, Tags, A escrever: 32 px), selo “Hoje no mundo” (24 px), link “Agenda” no Início (20 px), títulos na lista de Campanhas (27 px) | 44 px de altura no celular (regra 9 do `AGENTS.md`); um teste de interface que mede os alvos dessas telas |
| U68 | leve | Notas: “Lista de notas” e “Notas” em duas faixas; a dica “Segure uma nota…” fica até tocar em Entendi | Uma faixa só; a dica vira um aviso que some sozinho depois do primeiro toque longo |

**O que a varredura não cobriu:** tema claro (o teste de contraste cobre as cores, não o desenho), o Android de
verdade (WebView, teclado virtual por cima do editor, gestos), celular deitado, uma mesa aberta no VTT (o cofre de
exemplo não tem mesa) e telas que só aparecem com dados reais grandes. O João confere essas no celular dele.

Todas as correções são de layout no celular (até 640–700 px): o desktop não muda. Regras D1–D17 e a 10ª regra do
`AGENTS.md` (44 px de toque, 320 px sem rolagem lateral, teclado, leitor de tela, redução de movimento) valem.

## Decisões do Claude (o João pode trocar qualquer uma)

1. **Mesmo formato `.runas` versão 1**, com um campo opcional `itens` no manifesto (`{ tipo, nome, raiz, caminhos }`).
   O leitor da 1.3 ignora campos que não conhece, então pacotes da 1.4 que caibam nos limites antigos abrem na 1.3.
   Pacote maior que 128 MB mostra o aviso “só abre na 1.4 ou mais nova”.
2. **Escritor ZIP próprio no núcleo** (`core/transfer/zip-writer.ts`): cabeçalho local com tamanho e CRC já
   conhecidos (cada arquivo é lido inteiro antes de entrar), sem descritor de dados, para o leitor antigo abrir.
   Texto é comprimido com o `deflateSync` do fflate (já no projeto); imagens, áudio, vídeo e PDF entram **guardados**,
   sem recomprimir. Manifesto e diretório central no fim.
3. **Limites novos**: sem teto total além do formato ZIP sem ZIP64 (4 GB e 65.535 entradas); por arquivo, 512 MB no
   desktop e 64 MB no Android (é o único que fica inteiro na memória). ZIP64 fica fora até alguém precisar.
4. **Plataforma ganha gravação em pedaços** (só acréscimos em `platform.ts`, `bridge.ts`, `ipc.ts`, preload,
   `electron-platform.ts`, `memory-platform.ts` e no plugin Android): `beginSave(nome, mime)` → `appendSave` →
   `finishSave` / `abortSave`. Cancelar ou falhar apaga o arquivo parcial. `saveBytes` continua para o resto do app.
5. **Importação em lotes** pelo `useVault().importTransfer`: um backup de texto no começo (não um por lote), cada
   arquivo gravado com a versão fixada na prévia, progresso “Gravando 120 de 466 · 118 MB de 253 MB”. Falha no meio
   diz quantos entraram, relê o disco e mantém o pacote de segurança, como hoje (ADR 0020). A gravação segura não muda.
6. **O que é cada item** (função pura `core/transfer/items.ts`, com testes):
   - **Wiki**: a pasta `Wikis/<nome>/` inteira + os anexos que as notas dela usam, onde estiverem (`Anexos/…`).
   - **Livro**: a nota do livro, a pasta dele, os capítulos da `estrutura` mesmo fora da pasta, capa e imagens.
   - **Mesa**: `.runas/mesas/<id>/` inteira (manifesto, cenas, assets) + a capa, que mora no cofre. A campanha que
     aponta para a mesa vai junto só se marcada. A **biblioteca da mesa** é um item à parte.
   - **Campanha**: como hoje (pasta, eventos da Agenda que apontam para ela, mesa ligada).
   - Um anexo usado por dois itens entra uma vez. Links para **outra** wiki não puxam a outra wiki inteira; “Incluir
     notas ligadas” continua existindo e começa **desligado** na escolha por itens (ligado na escolha por notas, como hoje).
7. **Na importação**, anexos compartilhados entram se algum item marcado usa. Pacote sem `itens` (da 1.3, do
   Obsidian, do Notion) tem os itens deduzidos pelas pastas (`Wikis/X`, `Livros/X`, `Campanhas/X`, `.runas/mesas/X`);
   o resto vira “Outras notas”, por pasta de primeiro nível.
8. A escolha **por notas** continua (aba “Por notas”), agora em árvore; a aba **“Por itens”** abre primeiro.

## PRs, na ordem

| PR | Branch | Itens | Depende de | Verificação principal |
|---|---|---|---|---|
| A | `transferir/1.4-pacotes-grandes` | U50 | `main` | testes do escritor (o leitor antigo abre o ZIP novo; 10 mil arquivos; guardado × comprimido; cancelamento apaga o parcial); smoke `--write` exporta e reimporta um pacote de **300 MB** no Electron; smoke Android com **120 MB** (acima dos 96 MB de hoje) |
| B | `transferir/1.4-exportar-itens` | U51, U52 | A | testes de `items.ts` (wiki com anexos fora da pasta, livro com capítulo fora, mesa com capa, anexo compartilhado); teste de cobertura (toda nota marcada está no manifesto); 320 px, teclado e leitor de tela na árvore |
| C | `transferir/1.4-importar-itens` | U53 | B | prévia agrupada com pacote da 1.3 e da 1.4; cópia de wiki com links ajustados; substituição só de um item; progresso e falha no meio |
| D | `transferir/1.4-atalhos` | U54 (+ U55 se aprovado) | B | cada atalho abre a tela com o item marcado; seleção múltipla por teclado e toque |
| E | `agenda/1.4-celular` | U56–U59 | `main` (independe de A–D; pode correr em paralelo) | medidas a 320, 375 e 420 px antes/depois (grade ≤ 190 px do topo, tarefa ≤ 72 px); cofre com 6 rotinas diárias e uma sessão às 20 h aparece no ponto; teclado e leitor de tela no ⋯ da tarefa; temas claro e escuro |
| F | `celular/1.4-telas` | U61, U62, U64–U68 | E (reaproveita a regra do flutuante e a faixa compacta) | as mesmas 15 capturas antes/depois a 320 e 360 px; título do artigo ≤ 260 px do topo; teste dos alvos de 44 px; teclado e leitor de tela |
| G | `livros/1.4-celular` | U63 | `main` | livro aberto a 320 e 360 px; painel abre e fecha por toque e teclado; nada do texto coberto |
| Versão | `versao/1.4.0` | — | A–G mesclados | ADR 0025: notas, `docs/04-testes-pendentes.md` |

ADR nova: **0037 — Transferências em fluxo e por itens** (no PR A; o PR B acrescenta a parte dos itens), atualizando os
limites da ADR 0020.

Estimativa de custo, **opinião** baseada nos gastos reais da 1.3 (J ~14%, G1 ~10%, B ~6% da janela de 5 h): A 15–20%
(mexe no Electron, no Android e no núcleo), B 10–14%, C 10–12%, D 5–8% (+3% com U55), E 8–12%, F 12–16%, G 5–8%, versão ~3%.
Total: duas janelas e um pouco.

## Riscos a vigiar

- **Tempo no Android**: 253 MB pela ponte do Capacitor, em pedaços base64, **não foi medido**. Gatilho: se a wiki
  Cronos levar mais de ~2 minutos para exportar no celular do João, um PR A2 move a montagem do ZIP para o Java
  (lendo direto do SAF) e a tela só acompanha o progresso.
- **Memória ao importar no Android**: `Blob.slice` de um arquivo escolhido no seletor depende da WebView; o smoke de
  120 MB cobre o caso, e o João confere com a Cronos.
- **Espaço em disco**: o destino pode encher no meio; o erro apaga o parcial e diz quanto faltou.
- **Arquivos compartilhados**: A mexe em vários (`platform.ts`, `bridge.ts`, `ipc.ts`, preload, `index.ts`); só
  acréscimos no fim, como pede o `AGENTS.md`.
- **Compatibilidade**: o teste “o leitor da 1.3 abre o pacote da 1.4” fica no núcleo para não regredir.

## O que o João decide

1. **Itens além de wikis, livros e mesas**: incluir campanhas, biblioteca da mesa, agenda e notas soltas na lista?
   *Recomendo sim*: custa pouco (campanhas já têm regra própria) e evita voltar à escolha por notas.
2. **U55, seleção múltipla nas Notas** com “Exportar seleção…”: *recomendo sim*, no PR D; dá para deixar para depois.
3. **Arquivos terminados em `~`** (o `.kra~` de 58 MB é cópia automática do Krita) ficam fora do pacote, como
   `Thumbs.db`? *Recomendo sim*, com a contagem dos ignorados na tela.
4. **Pacote grande para a 1.3**: só avisar (*recomendado*, os aparelhos atualizam pelo botão) ou oferecer “dividir em
   partes de até 128 MB”? Dividir é trabalho a mais (estimo +8%) para um caso que some quando tudo estiver na 1.4.
5. **Quais consertos da varredura entram na 1.4** (U61–U68)? *Recomendo todos*; se for preciso cortar, U61, U62 e
   U63 primeiro (são os que atrapalham ler e escrever no celular). U62 muda o modo inicial dos artigos da wiki no
   celular: *recomendo Leitura*, com a opção em Configurações.
6. **Rotinas no mês**: escondidas por padrão no celular, com a opção de mostrar (*recomendado*), ou sempre visíveis
   como hoje, só que com prioridade para os eventos únicos? E oferecer “Transformar em hábito” para tarefas diárias
   com `🏁 keep`? *Recomendo sim nas duas.*
