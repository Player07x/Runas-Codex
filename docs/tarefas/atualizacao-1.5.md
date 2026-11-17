# Atualização 1.5.0 — O que ficou de fora da 1.3 e da 1.4

> Plano do Claude (líder desta atualização), feito em 16/11/2026 com o código da `main` em `80eb718` (v1.4.0).
> Junta o que foi adiado nas duas últimas versões, o pedido de 15/11 (“Sair da mesa”) e os pedidos de 16/11 (oito
> capturas), mais a correção de segurança pedida no mesmo dia (U91). Em 17/11 entrou a auditoria de usabilidade do
> Codex, conferida por mim (U92–U107). Em 17/11 o João respondeu as decisões 5 a 14 e pediu a **fase 1 só com os
> consertos visuais**. **Nada implementado.** Em 16/11 o João
> liberou U47, U76, U78, U80, U81 e U82; as decisões que faltam estão no fim.

Funções novas depois da 1.4 = **1.5.0** (ADR 0025, adendo de SemVer). Itens **U46, U47, U76, U78 a U107**. As regras
D1–D17 de [`atualizacao-1.2.md`](concluidas/atualizacao-1.2.md#regras-de-design-valem-para-todo-pr-de-tela) valem
para todo PR de tela, e cada PR segue o `AGENTS.md`.

## O que ficou de fora

| Item | De onde veio | O que é | Situação |
|---|---|---|---|
| **U76** | 1.4, decidido em 14/11 | Otimização: medir e aliviar as telas mais pesadas | prometido nas notas da 1.4.0 como primeira tarefa da 1.5 |
| **U78** | Pedido de 15/11 | “Sair da mesa” na Vista do jogador do VTT | o João pediu para a próxima versão |
| **U46** | 1.3, PR H | Início “Mesa de hoje” | aprovado em 11/11; em 16/11 o João não entendeu o pedido: **decisão 7** |
| **U47** | 1.2 → 1.3, PR I | Mestre remoto completo no celular | liberado em 16/11, com o link aberto pelo app |
| **U79** | 1.4, problema conhecido | O Tab não chega à barra “Propriedades · n” no modo Editar | falha de acessibilidade (regra 10, WCAG 2.1.1) |
| **U80** | 1.4, problema conhecido | No Android, arquivo do cofre com mais de 64 MB fica fora do pacote | liberado em 16/11 |
| **U81** | 1.4, sobra do PR F | No celular, a faixa de abas das notas abertas (`TabPanes`) ainda ocupa uma linha antes do texto | liberado em 16/11 |
| **U82** | 1.3 e 1.4, testes | O `--smoke --write` local falha em `wikiCategory.previewFive`, `bookSidePreview`, `paste.link`, `bookSideTyping` e `notesC5c.history` (já falhava na v1.3.0 nesta máquina); o `android-vault` não era exigido antes do merge | arrumação, sem tela nova |

Fora do código (o João confere à mão, já listado em `docs/04-testes-pendentes.md`): pacotes grandes, Agenda e telas do
celular num **Android físico**; organograma, “Encontrar no organograma” e barra de propriedades com **NVDA, Orca ou
TalkBack**.

Continuam fora, por decisão de 14/10: voz e vídeo na sala; sincronizar aparelhos pela rede local.

## Pedidos de 16/11

Oito capturas do app instalado (1.4.0, cofre real). As capturas mostram dados pessoais da Agenda e **não vão para o
repositório**; a causa de cada pedido foi conferida no código da `main`.

| Item | Pedido | Causa achada | Proposta |
|---|---|---|---|
| **U83** | Trocar de seção nas Configurações leva ~4 s | As 12 seções ficam montadas o tempo todo e só a atual aparece (`SettingsScreen.tsx`, `display: none` em `transfer.css:34`); cada troca redesenha todas, inclusive a Ajuda (Markdown) e a lista de pastas do cofre inteiro (`NoteImages.tsx:37`). Medido no navegador com o cofre de exemplo: 150–240 ms de bloqueio por troca, contra 80–90 ms nas outras telas; no cofre real, com 1,3 GB, chega aos 4 s | montar só a seção aberta; a lista de pastas só ao focar o campo; medir de novo no app instalado com o cofre real |
| **U84** | O título da janela continua mudando (“Obsidian e anexos · Configurações · Runas-Codex”) | O U40 (1.3) cancela `page-title-updated` no `webContents` (`desktop/src/main/index.ts:247`, `windows.ts:58`), mas quem troca o título da janela é o evento da `BrowserWindow` | cancelar o evento na janela (`window.on("page-title-updated", …)`); o `document.title` por rota continua para o leitor de tela; o smoke confere `getTitle()` depois de trocar de tela |
| **U85** | Gráfico: depois de abrir, ele desfaz o zoom de quem já começou a mexer | `GraphView.tsx:274`: o enquadramento automático roda no passo 60 e de novo quando o gráfico assenta (`fitPending`); arrastar, a roda e a pinça não o cancelam | o primeiro gesto do usuário cancela o enquadramento pendente; o botão de enquadrar continua |
| **U86** | Imagens demoram a carregar (capas das categorias da wiki) | A grade pede a imagem inteira para um quadro de ~270×90 px: as capas da wiki Valknut têm mediana de 913 KB e a maior tem 6,9 MB. O protocolo do cofre responde `cache-control: no-cache` sem `ETag` (`desktop/src/main/vault-files.ts`), então cada visita lê e decodifica o arquivo de novo | miniaturas (ex.: 480 px de largura) geradas pelo processo principal com `nativeImage` (sem dependência nova) e guardadas na pasta de dados do app, **não no cofre**, renovadas pela data e pelo tamanho do arquivo; `ETag`/`Last-Modified` com resposta 304; no Android, o mesmo pelo plugin. Entra no PR da otimização |
| **U87** | Botão de abrir o painel da direita parece solto da tela (Agenda, Calendário da wiki) | Recolhido, o `ResizablePanel` vira um trilho com um botão numa caixa própria ao lado da grade (`components/ResizablePanel.tsx`, modo `rail`) | o botão vai para a barra da tela, ao lado das vistas (como os Livros já fazem com `controlsTarget`), com o nome do painel; vale para todas as telas que usam o painel. Maquete antes |
| **U88** | VTT: ícone do mapa por cima do texto do cartão “Jornada para Vatu” | O ícone de reserva tem `hidden`, mas `.mesa-thumb-fallback { display: grid }` (`screens/vtt/vtt.css:29`) passa por cima; ele aparece embaixo da capa e invade o texto | `.mesa-thumb-fallback[hidden] { display: none }` e conferir os outros `hidden` com `display` próprio |
| **U89** | Sala: aumentar ou reduzir os jogadores com a sala aberta; avisar o mestre se a conexão caiu; reconectar com o mesmo link, sem desconectar os jogadores | O número de assentos só é escolhido antes de ligar (`PlayerPanel.tsx:73`, campo desligado com a sala aberta). A queda do link público já é detectada (`tunnelLost`), mas aparece só dentro do painel Jogadores. O link público é um túnel rápido da Cloudflare, cujo endereço é sorteado a cada vez; o link da rede local muda se o IP do computador mudar | “+ Assento” e “Remover” na tabela de assentos (remover um assento ocupado pede confirmação e desconecta só aquele jogador); faixa de aviso no topo da mesa e notificação do sistema quando o servidor, o túnel ou o IP caem; botão “Reconectar”, que reabre na mesma porta (o link da rede local volta igual se o IP não mudou). Mesmo link público: **decisão 6** |
| **U90** | Aviso de atualização na barra lateral; ao clicar, já atualiza | Hoje o app só consulta quando o usuário clica em Configurações › Privacidade e atualizações (ADR 0017, regra 6) | consultar sozinho **uma vez por dia**, ao abrir, só em `api.github.com` (o mesmo endereço do botão); com versão nova, um item “Atualizar para 1.x” no fim da barra lateral (e no ⋯ do celular), que baixa, confere o SHA-256 e instala direto, com a barra de progresso no próprio item. Opção para desligar em Privacidade. Muda a ADR 0017 e a regra 6 (ADR nova). **Decisão 5** |

## Segurança: gravação bloqueada por antivírus (U91)

Pedido de 16/11: em alguns celulares e em alguns computadores com Windows (principalmente de outros países), programas
de segurança impedem o app de gravar. O app tem que ser seguro e funcionar nos dois.

**Primeiro relato (17/11, decisão 11):** no computador de um amigo do João, na Itália, com o Windows em italiano e o
antivírus do próprio Windows (Microsoft Defender), o app não gravava; pôr o Runas-Codex na lista de apps liberados
do Defender resolveu. Isso confirma o Windows e aponta para o Defender (o mais provável é o Acesso controlado a pastas,
que barra apps desconhecidos em Documentos; a exclusão da verificação em tempo real tem o mesmo efeito). O celular
continua sem relato; as causas de lá abaixo vêm do código e de como esses programas costumam agir (opinião).

| Onde | O que o app faz hoje | Por que um programa de segurança pode barrar |
|---|---|---|
| Windows | O cofre costuma ficar em Documentos. Cada gravação cria `.nome.xxxx.runas-tmp` (oculto) na pasta da nota e troca pelo original (`desktop/src/main/vault.ts:144`); no Windows, se a troca falha com `EPERM`/`EACCES`/`EBUSY`, tenta de novo por ~2 s e mostra o erro do sistema (`replace-file.ts`) | O **Acesso controlado a pastas** do Windows Defender protege Documentos, Área de trabalho e Imagens e barra para sempre programas desconhecidos; tentar de novo não resolve. Antivírus com proteção contra ransomware desconfiam de muitas trocas de arquivo em sequência (importar, mover imagens, renomear links) |
| Windows | O instalador e o `.exe` **não são assinados** (ADR 0003); a sala baixa e executa o `cloudflared.exe` (só quando o mestre pede, com SHA-256 conferido) e abre um servidor na porta 30000 | Programa sem assinatura e com pouca reputação recebe a regra mais dura do antivírus |
| Android | O manifesto pede **acesso a todos os arquivos** (`MANAGE_EXTERNAL_STORAGE`), **instalar apps** (`REQUEST_INSTALL_PACKAGES`), serviço em primeiro plano e servidor de rede (`AndroidManifest.xml:72-80`) | É a combinação que o Play Protect e os apps de segurança de fábrica (comuns em celulares vendidos fora do Brasil) mais marcam; eles podem tirar a permissão ou barrar o app. Apps de “limpeza” também podem revogar a permissão da pasta escolhida no seletor |

**Proposta.** Gravar nada a menos do que hoje, nunca perder texto e explicar o bloqueio em português:

1. **Nunca perder texto.** Se uma gravação falha, o texto fica num rascunho local (fora do cofre, na pasta de dados do
   app) e a nota mostra **“Não gravado”** até conseguir; o app tenta de novo sozinho e grava assim que o bloqueio sai.
   Fechar o app com algo não gravado avisa antes.
2. **Saber o motivo.** O erro de gravação ganha um tipo (bloqueado pela segurança do sistema, arquivo em uso, sem
   espaço, sem permissão, pasta somente leitura) e uma mensagem com o passo a passo: no Windows, como permitir o
   Runas-Codex no Acesso controlado a pastas ou no antivírus; no Android, como devolver a permissão da pasta.
3. **Testar antes de precisar.** Ao abrir o cofre e em Configurações › Cofre, **“Testar gravação”**: grava, troca e
   apaga um arquivo de teste e diz o que falhou. Se a pasta está protegida, oferece mover o cofre para uma pasta fora
   de Documentos.
4. **Gravar com menos cara de ameaça**, sem perder a gravação segura: espera maior quando o arquivo está em uso (o
   antivírus lendo o arquivo novo), operações em lote em ritmo menor, arquivo temporário com nome claro e apagado
   sempre. Mexe em `vault.ts`, que a regra 4 protege: **esta tarefa pede essa mudança**, com testes da gravação.
5. **Android com menos permissões.** O cofre pelo seletor de pastas do sistema (que já funciona) passa a ser o
   padrão; “acesso a todos os arquivos” vira opção avançada, explicada na hora. “Instalar apps” só fica se o aviso de
   atualização (U90) instalar o APK pelo app; senão sai. Se a permissão da pasta sumir, o app pede de novo em vez de
   falhar ao gravar.
6. **Windows com reputação, só por caminhos gratuitos (decisão 9).** A cada versão, enviar o instalador à Microsoft
   para análise de falso positivo (formulário gratuito; o João envia). Assinatura só se houver um programa gratuito
   para projetos abertos (por exemplo, o da SignPath Foundation; condições a conferir antes). Pelo que sei (opinião, a
   confirmar), esses programas exigem uma licença de código aberto, e o repositório é público mas não tem licença:
   em 17/11 o João liberou uma licença de código aberto, se o programa gratuito exigir (a escolha da licença vai no PR O).
   Enquanto não houver assinatura, o aviso de gravação bloqueada (item 2) tem um botão que abre a página certa do
   Windows (`windowsdefender://ransomwareprotection`, endereço local do sistema, sem rede), que funciona em qualquer
   idioma do Windows, como o italiano do relato.
7. **Revisão de segurança, escrita** (`docs/seguranca.md`): o que o app já faz bem (isolamento da interface,
   `sandbox`, CSP, caminhos presos ao cofre, assentos com código e cookie `HttpOnly`, backup do Android desligado) e o
   que falta. Já achado: o Electron não recusa pedidos de câmera, microfone, localização e notificações de páginas
   (`setPermissionRequestHandler` ausente); o CI não roda `npm audit`. Os dois entram no PR.

Testes: gravação com falha simulada de cada tipo (o texto continua no rascunho e é gravado depois), “Testar gravação”
com pasta somente leitura, smoke com a pasta bloqueada no Linux (`chmod`) e no Windows do CI, e o APK do CI
conferido sem `MANAGE_EXTERNAL_STORAGE` no fluxo padrão. **Fica sem verificar** até haver um aparelho real: um
Windows com Acesso controlado a pastas ligado e um antivírus de terceiros, e um celular com app de segurança de
fábrica. Para isso, o primeiro relato precisa trazer o país, o sistema, o antivírus e a mensagem de erro.

## Usabilidade: auditoria do Codex (17/11) e a minha revisão (U92–U107)

Em 17/11 o Codex fez uma auditoria de usabilidade para iniciantes no celular (390 e 320 px, com comparação em
1366 px): 32 percursos, 294 objetivos, 19 achados. Ele usou a prévia do navegador (cofre em memória), não o Electron
nem um Android real. Os achados dele se chamavam U01–U19, números que já existem no projeto; aqui viram **A01–A19**.
Nada da cópia do cofre usada na auditoria nem das capturas entra no repositório.

**Como conferi:** abri cada achado no código da `main` (`80eb718`) e passei a prévia em 320 × 740 pelas dez telas
principais. Nas telas de entrada não achei rolagem para os lados nem campo sem nome; os problemas estão dentro dos
fluxos (diálogos, painéis, avisos). **Confirmado** = vi a causa no código ou repeti na prévia; **provável** = a
captura mostra, mas depende do cofre real (muitos artigos e eventos) e é reconferido no PR com dados gerados.

| Achado | Codex | Conferido | Causa | Vira |
|---|---|---|---|---|
| A01 Rótulos da barra do Quadro se sobrepõem no celular | P1 | confirmado (captura) | botões de 44 px com ícone e texto juntos, em `components/canvas/CanvasBoard.tsx` | U96 |
| A02 “Exportar o livro…” fica atrás do Sumário | P1 | confirmado | `BookEditor.tsx:164` só troca para Diagramar; o painel do Sumário continua aberto por cima | U97 |
| A03 Vincular o token a uma nota troca nome e disposição | P1 | **confirmado e maior** | `reimportWikiToken` (`vtt/library-actions.ts:76`) troca também retrato, tamanho e barras: se o artigo não tem retrato, o token perde a imagem; se não tem barras, a barra de PV some | U94 |
| A04 Campos da barra de PV sem nome | P1 | confirmado | `TokenBars` (`SceneCanvas.tsx:511-517`): nome, atual e máximo sem `aria-label` | U95 |
| A05 Recompensa num aviso que some e sai da tela | P1 | confirmado, e a causa é geral | só existe no aviso (`quest-actions.tsx:43`), que some em 10 s (pausa com o mouse em cima ou com o foco, mas no celular não há mouse); com `left: 50%` o aviso só tem meia tela de largura e, sem quebra de linha, o botão estoura em 320 px (também no “Desfazer”) | U92, U93 |
| A06 Rotina diária exige RRULE | P2 | confirmado | o seletor não tem “Todo dia”; dá para marcar os 7 dias em “Toda semana”, mas ninguém descobre isso | U98 |
| A07 Nomear a nota exige “Renomear ou mover” | P2 | confirmado | o título da nota é um `<h1>` fixo (`NoteView.tsx:657`) e a nota nasce “Sem título” | U99 |
| A08 “NPC da wiki” lista lugares e mitos | P2 | confirmado | usa o seletor genérico de notas, sem filtro de tipo | U100 |
| A09 “Já apareceu” muda entre criar e vincular | P2 | confirmado | criar começa marcado (`campaign-dialogs.tsx:445`), vincular começa desmarcado | U100 |
| A10 Categoria Personagens muito abaixo na Wiki | P2 | provável | a abertura mostra a prévia de cada categoria antes da lista | U101 |
| A11 “Criar artigo” abaixo da ficha inteira | P2 | provável | o botão está no fim do corpo, não no rodapé do diálogo | U101 |
| A12 Com o painel da Agenda recolhido, tocar num dia não mostra nada | P2 | confirmado | o painel guarda “recolhido” e nenhuma ação o abre de novo no celular | U97 |
| A13 Tabela do Tesouro ilegível no celular | P2 | provável | tabela de quatro colunas; a origem aparece como `[[link]]` cru | U106 |
| A14 “Próxima sessão” mostra um evento pessoal | P2 | confirmado | `nextSession` (`core/agenda.ts:231`) aceita qualquer evento com contagem regressiva | U102 |
| A15 Números do menu Mais não batem | P2 | **confirmado, é defeito** | o “Mais” do celular mostra a contagem dos dados fixos da prévia antiga (`data/notes.ts` e outros, `Shell.tsx:197`), não a do cofre; a barra lateral já usa a contagem certa | U102 |
| A16 Markdown exportado repete o título do capítulo | P2 | confirmado | `generateMarkdown` (`core/export/book-extra.ts:64`) sempre põe `# título`, mesmo quando o texto já começa com ele | U103 |
| A17 Modelos vazios sem “criar o primeiro” | P3 | confirmado | o estado vazio só explica a pasta | U99 |
| A18 Importar pede muita leitura e não abre o resultado | P2 | provável | explicações de cada origem antes do botão; no fim, nenhum “Abrir” | U104 |
| A19 Evento que cruza a meia-noite parece duplicado | P2 | provável | as duas partes aparecem com o mesmo “23:00–07:30”, sem dizer qual começou ontem | U105 |

Concordo com as prioridades do Codex, com três mudanças: o A03 é pior do que ele viu (apaga retrato e barras); o A15
não é critério de contagem, é número errado; e a causa do A05 vale para todos os avisos do app.

**O que achei além da auditoria:**

- **R1 — Painéis no celular (causa do A02 e do A12).** Os 13 painéis laterais (`components/ResizablePanel.tsx`)
  guardam “recolhido” por aparelho, e no celular nenhuma ação os abre ou fecha: o Sumário fica sobre a exportação, o
  painel da Agenda fica fechado quando se toca num dia. Junta-se ao U87 (botão do painel na barra).
- **R2 — A nota no celular começa a 188 px do topo** (em 320 × 740): barra do app, faixa de abas e barra da nota,
  e o nome aparece até quatro vezes (barra do app, aba, barra da nota cortada em “Coroaçã…”, título). Com o teclado
  do Android aberto, sobra pouco texto à vista. Junta-se ao U81 (abas no celular). Ao editar, a barra de baixo já vira
  barra de formatação, e isso está bom.
- **R4 — Aviso de erro com o ✓ verde de sucesso.** O aviso tem um só desenho, com o ícone de “feito”, e 59 lugares o
  usam para erros (“Não foi possível…”, mensagens de exceção). Vira o **U107**: o aviso ganha o tom de erro (ícone e
  cor próprios, `role="alert"`) e esses lugares passam a usá-lo.
- **R3 — Observação, sem mudança agora:** no celular, as seções da campanha (Painel, Sessões, Missões, Elenco,
  Ferramentas, Quadro) ficam num seletor nativo “Tela da campanha”. Foi decisão da 1.4; fica anotado para a próxima
  rodada com pessoas reais.

**Os itens novos**

- **U92 — Avisos que cabem na tela.** O aviso fica centrado pelas duas bordas (não mais com meia tela de largura) e,
  em 320 px, a mensagem quebra e o botão desce para baixo dela. A pausa com o mouse em cima ou com o foco já existia.
- **U93 — Recompensa também na missão.** Missão concluída com recompensa ainda não enviada mostra “Mandar para o
  Tesouro” no painel da missão. Depois de enviada, a missão grava `recompensa_enviada: "AAAA-MM-DD"` e o botão vira
  “Já está no Tesouro”, sem duplicar. No Tesouro, a origem aparece como link.
- **U94 — Ligar o token a uma nota sem apagar o que o mestre escolheu** (**decisão 14**).
- **U95 — Nomes nos campos das barras:** “Nome da barra”, “PV atual”, “PV máximo” (com o nome da barra), e o mesmo
  em toda `NumberInput`/`TextInput` do VTT que não esteja dentro de um `Field`.
- **U96 — Barra do Quadro no celular:** até 860 px, as ações principais (Texto, Nota, Ligar) ficam com o nome
  inteiro, e o resto vai para “Mais”. Nada se sobrepõe em 320 px; teclado e toque continuam alcançando tudo.
- **U97 — Painéis do celular seguem a ação (R1):** uma ação que troca o conteúdo (Exportar, Diagramar, abrir um
  capítulo) fecha o painel que a cobre e põe o foco no destino; tocar num dia da Agenda abre o painel do dia. A
  preferência “recolhido” continua valendo no computador. Entra no PR do U87.
- **U98 — Agenda:** “Todo dia” e “Dias úteis” no seletor de repetição, mais “Termina depois de N vezes”; a regra
  RRULE vira “Avançado”.
- **U99 — Nome da nota no título** (**decisão 13**) e “Criar o primeiro modelo” no seletor de modelos vazio (cria
  uma nota em `Templates/`, a pasta do Obsidian).
- **U100 — Campanha:** “NPC da wiki” começa nos personagens, com “Todos os tipos” ao lado; “Já apareceu” começa
  igual ao criar e ao vincular (**decisão 12**).
- **U101 — Wiki no celular:** índice de categorias no topo da abertura; no “Novo artigo”, “Criar” fica no rodapé
  fixo do diálogo, inclusive no passo da ficha.
- **U102 — Números e nomes certos:** o “Mais” do celular usa a contagem do cofre (a mesma da barra lateral); o cartão
  do Início diz “Próximo evento” quando o evento não é uma sessão e mostra a categoria.
- **U103 — Markdown exportado sem título repetido:** se o capítulo já começa com o próprio título, a exportação não
  o repete. Teste com o caso da auditoria.
- **U104 — Importar mais direto:** escolher o arquivo e a prévia vêm primeiro; as explicações de cada origem ficam
  recolhidas; no fim, “Abrir o que entrou”. `TransferScreen.tsx` é compartilhado: só acréscimos.
- **U105 — Evento que cruza a meia-noite** mostra “continua de ontem” na parte da manhã e “até 07:30 de amanhã” na
  da noite, na lista e no painel do dia.
- **U106 — Tesouro no celular:** até 860 px, cada item vira um cartão (item, quantidade, portador, ações com nome);
  a origem da recompensa aparece como link, não como `[[…]]`.

**O que a auditoria e eu não cobrimos:** Android real (teclado, TalkBack, botão Voltar, rotação), Electron instalado,
o VTT com um segundo aparelho e 77 dos 294 objetivos do Codex. Cada PR acima reconfere o seu achado em 320 e 390 px,
nos temas claro e escuro e pelo teclado, e manda as capturas no PR.

## Os itens

### U76 — Otimização (medir, depois mexer)

Medido em 14/11: a lentidão do notebook vinha de memória esgotada por outros programas e de 90 °C no processador; o
Runas-Codex ocupava ~0,5 GB e 0 % de CPU parado. Por isso a otimização começa **medindo**:

- **Linha de base (PR A1):** tempo para abrir com um cofre do tamanho do real (1,3 GB em 16/11, gerado nos testes, sem os
  dados do João), memória do renderer depois de um roteiro de uso (Notas, Wiki com capas, Livro, Mesa), tempo do
  índice, tamanho dos pacotes JS e custo de cada tela no Profiler do React. O A21 é o aparelho de referência.
- **Orçamento no CI:** um teste de desempenho com limites (abrir, trocar de tela, categoria com 420 artigos), como o
  `styles/tokens.test.ts` faz com o contraste. Limite = linha de base + folga; nada piora sem o teste avisar.
- **Suspeitos** (opinião, sem medida ainda): capas e retratos decodificados em tamanho cheio nas grades;
  `relationsOf` percorre todas as notas a cada chamada (o organograma e as Ferramentas chamam muitas vezes); telas que
  não saem da memória ao trocar de módulo; listeners e timers que sobram.
- **Consertos (PR A2):** só o que a medida apontar, no fim da atualização (mede o código já com os outros PRs).

### U78 — Sair da mesa

Hoje o `/seat/join` grava o cookie `runas_seat` (HttpOnly, 24 h; `desktop/src/main/vtt/player-server.ts`). Depois o
`PlayerView.tsx` pergunta ao `/seat`, recebe o assento e fecha o lobby, e a tela não tem como sair. Quem entra com o
código errado fica preso (contorno: “Limpar” no painel Jogadores do mestre, aba anônima ou apagar os cookies).

- Rota `POST /seat/leave` que revoga o assento (`PlayerSession.revoke`) e responde `Set-Cookie: runas_seat=; Max-Age=0`.
- Botão **“Sair da mesa”** na barra `player-tools` (com confirmação) que reabre o lobby com o campo do código.
- Igual na sala do Android (`RoomHttpServer.java`, com teste JUnit) e com o mestre remoto.
- Junto: se duas peças têm o mesmo “Controlado por”, o `attachAssignedTokens` (`app/src/vtt/shared/room-authority.ts`)
  liga o assento à primeira que encontrar. Passa a ligar a todas, e o painel do mestre avisa da duplicidade.
- Smoke: entrar, sair, entrar com outro código (desktop e `room-smoke.cdp.mjs`).

### U46 — Início “Mesa de hoje”

Como aprovado na 1.3: coluna **Hoje** (agenda do dia, tarefas que vencem e atrasadas, hábitos com caixa de marcar),
**Próxima sessão** com contagem, preparação e “Abrir a mesa”, **Campanhas ativas** com a data e a hora no mundo de
cada uma (U39), e **Centelhas** e **Retome o fio** menores. A fileira de seis contadores sai (os números já estão na
barra lateral). Reaproveita a vista Tarefas (U37), o sino (U45) e o relógio da campanha (U39), sem duplicar nenhum
deles. Maquete antes de codar, a 1280 e a 360 px.

**Condição do João (17/11, decisão 7):** pode começar, mas **sem poluir o Início mais do que ele já está**. Por isso
o U46 troca blocos em vez de somar: o número de blocos e a altura da primeira tela não podem crescer (a fileira de
contadores sai, “Mesa de hoje” ocupa o lugar da “Próxima sessão” no dia da mesa). A maquete mostra o antes e o depois
lado a lado, com a contagem de blocos, e o João aprova antes do código.

### U47 — Mestre remoto completo (liberado em 16/11)

O celular que comanda a sala do desktop não tem Biblioteca, “Salvar Sessão” nem o ⋯ da nota no token, porque não tem
o cofre. Pela sala: o desktop serve a Biblioteca e grava a sessão a pedido do mestre remoto (chave do mestre, ADR
0016). É o maior item da lista.

**Pedido do João (16/11):** o link do mestre tem que abrir **pelo aplicativo**, não só pelo QR code (nem todo mundo
consegue ler o QR). Hoje o painel Mestre remoto copia o link, que abre no navegador. Proposta: no app do celular,
VTT › **“Entrar como mestre remoto”** com um campo para colar o link (aceita também o link inteiro vindo de uma
mensagem) e o botão de ler o QR ao lado; o app abre a mesa dentro dele, conferindo que o endereço é da rede local ou
do túnel da sala (regra 6). No computador, o mesmo campo serve para comandar a sala de outro computador.

### U79 — Teclado nas propriedades

No modo Editar, o Tab dentro do editor faz recuo e nunca chega à barra “Propriedades · n”. Proposta: a barra entra na
ordem do Tab **antes** do editor (fora do CodeMirror), e Alt+P (ou o atalho livre que sobrar) abre e fecha. É um PR
pequeno só do live preview (regra 7).

### U80 — Arquivos acima de 64 MB no Android (liberado em 16/11)

Cada arquivo ainda passa inteiro pela ponte do Capacitor. Ler e gravar cada arquivo em pedaços pelo plugin, como o
pacote já faz (PR A2 da 1.4). Medido em 16/11: o cofre do João tem hoje 1,3 GB e dois arquivos acima do teto — um
áudio de 92 MB na biblioteca de uma mesa e um `.zip` de 270 MB solto numa pasta. No Android, a mesa sai sem o áudio.

### U81 — Faixa de abas no celular (liberado em 16/11)

No celular, a faixa das notas abertas fica entre a barra do topo e o texto. Proposta: até 640 px ela vira um botão
“n abas” na barra da nota, que abre a lista em folha inteira.

### U82 — Testes que falham na máquina

- Descobrir por que os cinco passos do `--smoke --write` falham aqui e não no CI (suspeita: o app instalado aberto
  segura o IndexedDB em `~/.config/runas-codex`; usar um perfil próprio no smoke).
- **Confirmado em 17/11 (PR V2):** o smoke usa o perfil do app instalado (`~/.config/runas-codex`), com as
  preferências do aparelho (painéis, modo da wiki, filtros do gráfico…). Com uma cópia desse perfil, o V1 e o V2
  falham nos mesmos pontos (`wikiCategory.previewFive`, `wiki.weekdays`, nós do gráfico); com
  `--user-data-dir` numa pasta vazia, a leitura e a gravação passam. Conserto: o `--smoke` cria um perfil temporário
  próprio quando não recebe `--user-data-dir` (e não mexe mais nas preferências do app instalado).
- **Achado em 17/11 (PR S, #154):** cada smoke deixa pastas `runas-*` no `/tmp` (`runas-book-pdf-*`, `runas-export-*`
  com um pacote de 141 MB…). No computador do João havia 289 delas (~4,3 GB, de 13 a 17/11); o `/tmp` em memória
  encheu e o smoke de gravação falhou com “Unknown system error -122”. Conserto: o smoke apaga o que criou ao terminar
  (e o app apaga a pasta temporária da exportação depois de copiar o pacote).
- PRs que mexem em tela do celular ou em transferência só se mesclam com o `android-vault` verde (a 1.4.0 precisou do
  #144 por isso). Fica escrito no `AGENTS.md` e no `docs/tarefas/README.md`.

## Fases e PRs

Pedido do João em 17/11: **a fase 1 é 100 % consertos visuais** (o que hoje aparece errado na tela). Nada de função
nova nela. Tudo o mais fica para a fase 2.

**Observação** (coluna da fase 2) = o item muda a interface. Ao terminar a implementação, antes de o PR sair de
rascunho, confere-se na tela o impacto dele (320, 390 e 1366 px; tema claro e escuro; teclado), com capturas de antes
e depois no PR, e o item entra na conferência visual do fim da fase. Se poluir a tela ou desfizer algo que a fase 1
consertou, o PR volta. Os PRs da fase 1 são todos visuais e sempre levam as capturas.

### Fase 1 — consertos visuais

| PR | Branch | Itens | Depende de | Custo estimado (janela de 5 h) |
|---|---|---|---|---|
| V1 | `visual/1.5-pequenos` | U88 ícone sobre o texto no cartão da mesa, U84 título da janela, U85 gráfico que desfaz o zoom, U92 avisos fora da tela, U102 números do “Mais” e “Próximo evento” | — | ~7 % |
| V2 | `visual/1.5-paineis` | U87 botão do painel na barra, U97 painéis do celular que cobrem o destino (A02, A12) | — | ~9 % |
| V3 | `visual/1.5-celular-nota` | U81 abas no celular + R2 (menos barras antes do texto) | V2 | ~6 % |
| V4 | `visual/1.5-campanhas` | U96 barra do Quadro, U106 Tesouro no celular | — | ~7 % |
| V5 | `visual/1.5-wiki-agenda` | U101 Wiki no celular, U105 evento que cruza a meia-noite | — | ~6 % |
| V6 | `visual/1.5-avisos-de-erro` | U107 aviso de erro com ícone e cor de erro | V1 | ~5 % |

Ordem: V1 → V2 → V3 → V4 → V5 → V6. Ao fim, uma conferência visual de todas as telas em 320, 390 e 1366 px.

**Conferência visual do fim da fase 1 (17/11):** os seis PRs mesclados num branch local (sem push). Nenhuma das 50
rotas conferidas rola para os lados em 320, 390 ou 1366 px. As capturas foram feitas com o Electron fora da tela,
porque o painel de prévia recortava as de celular. As telas do computador ficaram iguais. Um conserto: “Selecionar
vários” sem ícone no “Mais” do Quadro (commit no V4, #149). Para a conferência da fase 2: até 560 px, a regra
`.list-item { flex-wrap: wrap }` (`base.css`) deixa o nome descer para baixo do ícone quando a pasta é longa. O
seletor da campanha foi consertado no Q; outros 6 seletores usam o mesmo padrão.

### Fase 2 — funções, usabilidade e técnica

| PR | Branch | Itens | Depende de | Observação | Custo |
|---|---|---|---|---|---|
| P | `vtt/1.5-token-e-barras` | U94 ligar o token sem apagar, U95 nomes nos campos das barras | — | sim: aviso com “Desfazer” ao ligar | ~6 % |
| Q | `campanhas/1.5-usabilidade` | U93 recompensa no painel da missão, U100 NPC entre personagens e “Já apareceu” | V1 | sim: botão novo no painel; filtro no seletor | ~7 % |
| R | `notas/1.5-nome-e-modelos` | U99 título editável e “Criar o primeiro modelo” | V3 | sim: título editável no topo da nota | ~6 % |
| S | `agenda/1.5-repeticao` | U98 “Todo dia”, “Dias úteis” e “Termina depois de N vezes” | V5 | sim: opções novas no diálogo do evento | ~6 % |
| B | `correcoes/1.5-pequenas` | U83 Configurações lentas, U103 Markdown sem título repetido | — | sim (U83): a tela tem de ficar igual | ~5 % |
| J | `transferir/1.5-android-arquivos-grandes` | U80, U104 importar mais direto | — | sim (U104): a tela Importar muda de ordem | ~8 % |
| C | `vtt/1.5-sair-da-mesa` | U78 | — | sim: botão novo na Vista do jogador | ~6 % |
| D | `vtt/1.5-sala-assentos-e-quedas` | U89 | C | sim: botões de assento, aviso de queda, “Reconectar” | ~10 % |
| K | `vtt/1.5-mestre-remoto` | U47 (+ entrar pelo link no app) | D | sim: campo para colar o link | ~18 % |
| G | `shell/1.5-aviso-de-atualizacao` | U90 (+ ADR nova) | — | sim: item novo na barra lateral | ~8 % |
| L | `inicio/1.5-mesa-de-hoje` | U46, sem poluir o Início (decisão 7) | V1 | sim: maquete com antes e depois aprovada pelo João | ~10 % |
| M | `seguranca/1.5-gravacao-bloqueada` | U91 itens 1–4 (rascunho, motivo, Testar gravação, ritmo) | — | sim: estado “Não gravado”, aviso de erro, botão | ~10 % |
| N | `seguranca/1.5-android-permissoes` | U91 item 5 | M, G | sim: escolha da pasta no Android | ~6 % |
| O | `seguranca/1.5-revisao` | U91 itens 6–7 (envio à Microsoft, assinatura gratuita se houver, permissões do Electron, `npm audit`, `docs/seguranca.md`) | — | — | ~6 % |
| E | `editor/1.5-propriedades-teclado` | U79 | — | — | ~4 % |
| F | `testes/1.5-smoke-local` | U82 | — | — | ~4 % |
| A1 | `desempenho/1.5-linha-de-base` | U76 (medir + orçamento no CI) | — | — | ~8 % |
| A2 | `desempenho/1.5-imagens-e-consertos` | U86 miniaturas + U76 (o que a medida apontar) | A1, todos | sim: nitidez das capas em miniatura | ~12–18 % |

Ordem: P → Q → R → S → B → J → C → D → K → G → L → M → N → O → E → F; A1 em qualquer ponto antes do A2, que
fecha a versão.

Os custos são estimativas (opinião), comparadas com os PRs da 1.4 (A ~11 %, A2 ~4 %, C ~10 %). A fase 1 soma ~35 %
de uma janela de 5 h (~40 % com o V6); a versão inteira, perto de uma janela e meia, dividida em três ou quatro janelas.

## Decisões do João

Em 16/11: U47 (com o link aberto pelo app), U76, U78, U80, U81 e U82 entram. Em 17/11:

5. **Aviso de atualização (U90):** consulta sozinha uma vez por dia, ao abrir, **ligada por padrão**, com a opção de
   desligar em Privacidade; a ADR nova registra a troca na ADR 0017.
6. **Link público depois de uma queda (U89): opção A.** O app reabre o túnel sozinho, avisa o mestre e mostra o link
   novo com “Copiar aviso para os jogadores”; os jogadores entram de novo com o mesmo código, sem perder o assento.
7. **Início “Mesa de hoje” (U46):** pode começar, **sem poluir o Início mais do que ele já está** (ver o U46).
8. **Remover assento ocupado (U89):** pedir confirmação e desconectar só aquele jogador; os assentos saem do fim.
9. **Assinatura no Windows (U91):** **sempre buscar opções gratuitas** (ver o item 6 do U91). Se o programa gratuito
   exigir, o código pode ter licença de código aberto (liberado pelo João em 17/11).
10. **Android sem “acesso a todos os arquivos” por padrão (U91):** sim; quem já usa continua com ele até trocar de pasta.
11. **Relato real (U91):** Itália, Windows em italiano, Microsoft Defender; liberar o app no Defender resolveu (ver o
    U91). Vira caso de teste do PR M.
12. **“Já apareceu” ao criar um NPC (U100):** começa desmarcado, como ao vincular.
13. **Nome da nota (U99):** título no topo da nota editável, como o do Obsidian, e a nota nova abre com o título
    selecionado; “Renomear ou mover” continua para mudar de pasta.
14. **Ligar o token a uma nota (U94):** na primeira ligação, a nota só preenche o que o token ainda tem no padrão; o
    que o mestre já mudou fica, e um aviso diz o que mudou, com “Desfazer”. “Importar de novo da nota” troca tudo,
    avisando antes.

## Registro de execução do Codex — A1/U76 (17/11)

PR **#158**, `desempenho/1.5-linha-de-base`, sobre `origin/main` `80eb718`. Só medição, sem otimizações.
Cofre sintético de exatamente 1.300.000.000 bytes, 10 mil notas adicionais, 420 artigos com PNGs de 1024 × 768 e
mesa com 40 peças. Nenhum dado pessoal. O gerador e o executor apagam seus próprios dados de teste.

Ubuntu/i5-10300H/16 GB, Electron 44.4.2, janela 1366 × 900, build com Profiler, três perfis novos: medianas de
**3.890 ms** para abrir, **2.156 ms** para ler/construir o índice, **393 ms** para a categoria com 420 artigos;
renderer com **366,9 MiB** residentes após o roteiro e pico de **482,3 MiB**. Todos os chunks JS do Electron:
**18.423.493 bytes**, incluindo os módulos sob demanda. Configurações: **10.877 ms**, com **10.825 ms** em React;
é evidência para o U83/B e não foi consertado em A1. Livro inicial: 5.697 ms, contra 196 e 149 ms nas outras
execuções; o orçamento por tela conserva o maior valor. Método, números por tela e limitações estão em
`docs/desempenho-1.5.md` e `desktop/benchmarks/baseline-report.json` no branch do PR.

Novo job do CI cobra abertura, índice, troca, categoria, JS e cada tela separadamente, com folga explícita;
medição ausente/inválida também falha. A conferência local do orçamento passou em outras três execuções.
No CI ([execução](https://github.com/Player07x/Runas-Codex/actions/runs/44100513281)), AMD EPYC/4 vCPU/16 GB,
as três execuções passaram: medianas de **4.675 ms** para abrir, **3.446 ms** no índice, **466 ms** na categoria
e **8.868 ms** na maior troca. Os números do CI não substituem os locais nem o A21 físico.

Typecheck, 1.047 testes do app + 197 do desktop, builds normais e smokes de leitura (28,9 s) e gravação (101,2 s)
passaram. Temporários dos smokes removidos. O build normal não publica a instrumentação. **A21 físico**, cache
frio e distribuição exata dos anexos reais continuam sem verificar. O A2 mede novamente depois dos outros PRs.

## Registro de execução do Codex — O/U91 (17/11)

PR **#159**, `seguranca/1.5-revisao`, sobre `origin/main`. Revisão em `docs/seguranca.md`, handlers de consulta e
pedido recusando câmera/microfone/localização/notificações de páginas, cópia de texto preservada e notificação do
app pela ponte nativa validada. Auditoria completa no CI, incluindo ferramentas de build, com bloqueio de
gravidade alta/crítica e artefato dos moderados. Electron 44.10.1 (31/10), undici 7.30.1/6.29.1 (15/10), versões
com mais de duas semanas e sem script de instalação novo. Auditoria: **0 altos/críticos, 12 moderados**.

João **aprovou MIT** para o código próprio em 17/11 nesta conversa. O PR inclui `LICENSE`, metadados MIT nos
quatro pacotes e cópia do texto nos builds. Licenças de terceiros preservadas; direitos/avisos dos trechos
reaproveitados e elegibilidade ainda devem ser conferidos antes da inscrição na SignPath Foundation. Nada foi
enviado à Foundation ou à Microsoft. O passo a passo gratuito para falso positivo está na revisão.

Typecheck, 1.053 testes do app + 199 do desktop, builds, auditoria e smokes reais passaram: leitura **28,7 s**,
gravação **99,4 s**, permissões confirmadas, zero violações de rede, temporários removidos. CI código/auditoria e
Windows/Linux também passaram no commit de implementação; CI do último envio (MIT/documentação) em andamento.
Defender real, antivírus de terceiros, Android físico e aprovação da assinatura continuam sem verificar.

## Registro de execução do Codex — B/U83 e U103 (17/11)

PR **#160**, `correcoes/1.5-pequenas`, pronto para revisão, sobre `origin/main`. Configurações monta só a seção
aberta (antes, 11 montadas). No build de produção em memória com 10.084 notas, medianas antes/depois: Cofre
132,6/32,7 ms; Aparência 148,1/33,0; Editor 132,8/32,7; Ajuda 181,5/66,2; Obsidian 149,5/116,3; Agenda 166,1/32,9.
As seis comparações de 320/390/1366 px nos dois temas ficaram idênticas pixel a pixel, sem rolagem horizontal;
Tab preservado. No diálogo real de imagem: 0 sugestões antes do foco, 31 depois, com Tab até o campo.

Markdown conserva o título inicial do capítulo, inclusive formatado, com a comparação já usada pelos Livros,
sem alterar o leitor ou os arquivos originais. Dez testes novos de exportação passaram. Typecheck, 1.054 testes
do app + 197 do desktop e builds passaram. Smokes finais: leitura **28,2 s**, gravação **99,4 s**, ambos exit 0,
temporários removidos. Evidência em `docs/testes-1.5-b.md`, JSON e 12 PNGs no branch do PR.

No encerramento, João pediu finalizar a tarefa atual e gerar passagem para o GPT Codex Astra revisar o código,
corrigir falhas e continuar a implementação. Tarefas **5–17 permanecem abertas**. A nova maquete L/1.5 ainda não
foi criada nem aprovada; o João pediu que ela seja aberta para conferir quando estiver pronta. Nenhum PR foi
mesclado pelo Codex, e nenhuma versão foi lançada.


## Revisão Astra/Sol e maquete L/U46 (17/11)

João pediu revisar o trabalho do Astra, abrir a maquete e aguardar confirmação antes de continuar as demais tarefas.

- #160: a2c5b93 corrige o roteiro Android para visitar Editor e Privacidade após a montagem de uma seção por vez. CI código e android-vault passaram.
- #154: 410d6cf preserva datas puladas ao editar séries semanais e mantém em Avançado regras com hora/fuso no UNTIL ou contagem maior que 999. Quatro regressões confirmadas; typecheck, 1.058 app + 197 desktop, builds e smokes de leitura/gravação passaram. CI código/Windows/Linux/android-room/android-touch/APK passaram; android-vault falhou por timeout de Runtime.evaluate no smoke, sem diagnóstico de regressão confirmado, e a reexecução só desse job aguarda o fim do workflow: o GitHub recusou a tentativa enquanto android-revisao ainda está rodando. Revisão geral da 1.5 e integração continuam incompletas.
- **#161**, inicio/1.5-mesa-de-hoje, sobre V1/#146: somente maquete autônoma com antes/depois em 1280/360 px, dois temas e três cenários. Mantém cinco blocos; nenhum dos 12 pares cresce em altura nem tem overflow. Mesa hoje: 700→688 px (1280), 1699→1360 px (360). Capturas e medidas no branch do PR.
- João viu a prévia e pediu reduzir o destaque mobile. Ajustado para 185 px, aproximadamente metade, com indicadores compactos e ações lado a lado. **Não é aprovação da maquete inteira.**
- Estado: **esperando aprovação da maquete**. Nenhum código do Início implementado. Tarefas 5–15 e 17 permanecem abertas; a 16 só entregou a maquete. Nenhum merge/tag/release.

## Continuação autorizada e J1/U80 (17/11)

João aprovou a maquete #161 após conferir o cartão mobile compacto de 185 px: “Sim, pode continuar”. A aprovação está registrada no branch da maquete; Home.tsx ainda será implementado na ordem prevista. A reexecução do android-vault de #154 passou e a execução 44115814849 está toda verde.

PR **#162**, transferir/1.5-android-arquivos-grandes, sobre origin/main: ponte em mensagens de até 2 MB e arquivo de até 512 MB; estágio privado, publicação segura e reconferência de versão, nos modos direto/SAF. Restauração SAF também usa fluxo. Tipos, 1.049 testes app + 197 desktop, builds, smokes Electron leitura/gravação e 42 testes Java passaram (heap 256 MB, SHA-256 92/270 MB). CI código/Windows/Linux/APK/room passou no bc94ace; android-vault/revisão em andamento. android-touch falhou aguardando a mesa; captura mostra tour cobrindo a tela, sem erros JS, diagnóstico pendente. PR segue em rascunho até concluir a validação. Android físico e reprodução de áudio não verificados. Revisão geral e integração ainda incompletas. Nenhum merge/tag/release.

## J1/U80 validado no Android (17/11)

#162/bc94ace está pronto para revisão: android-vault verde no 44121882625, com SHA-256 de 92/270 MB iguais nos modos direto e SAF, restauração SAF de 270 MB, cancelamento sem parcial, provedor externo e instalação do APK preservando o cofre. Ida e volta de 92 MB: 41,8/41,3 s; 270 MB: 119,6/120,2 s (direto/SAF). 46/135 pedaços, máximo 2 MB por mensagem. android-revisao também passou. Reexecutado só android-touch após o workflow terminar; a falha original e a captura com tour cobrindo a mesa continuam descritas no PR.

## Passagem ao Claude a pedido do João (17/11)

João pediu corrigir o contador das pastas e encerrar a sessão Codex para o Claude revisar e continuar. **Nenhum merge/tag/release.** A revisão geral dos PRs e a integração visual continuam incompletas; tarefas 7–15 e 17 não foram implementadas nesta continuação. L/#161 tem maquete aprovada, implementação da Home pendente.

- J1/#162, bc94ace: pronto, execução 44121882625 inteira verde após reexecução isolada do toque; a falha original continua registrada no PR.
- E/U79/#163, 4dde95b: **rascunho, não pronto**. Barra antes do CodeMirror, Tab/Shift+Tab/Enter/Space/Alt+P, 12 pares visuais sem alteração de geometria/overflow e 17 verificações de teclado/estados passaram. Tipos, 1.044 testes app + 197 desktop, builds e leitura passaram. **Gravação falhou** com bookSideTyping=false no local e no Linux/Windows do CI. Diagnóstico: janela do smoke sem foco e seleção DOM antes do bloco invisível; execCommand tenta inserir antes do YAML e a proteção recusa. Fluxo isolado offscreen passou, mas não substitui o smoke completo. O registro de aprovação antecipada foi corrigido. CI 44129216893: android-vault/APK/touch verdes, room falhou aguardando o badge Jogador 1, causa não isolada. O Claude deve resolver/conferir isso antes de seguir M.
- Pedido novo/#164, notas/1.5-contagem-pastas, b269a23, sobre main: conta subpastas imediatas + arquivos diretos (inclusive anexos), sem somar descendentes. No exemplo Campanhas 0→3, Livros 0→3, Wikis 0→1, Notas 8→12. Quatro regressões e seis pares de capturas/teclado passaram. Validação local completa: tipos, 1.048 testes app + 197 desktop, builds web/Electron e smokes leitura/gravação exit 0; bookSideTyping=true, zero violações de rede, temporários próprios removidos. CI código 44130246261 verde; Release 44130246229, incluindo android-vault, ainda em andamento nesta consulta. Limite da listagem de diretórios vazios anteriores à sessão preservado e documentado.

A passagem detalhada fica em arquivo local ignorado, com hashes, roteiros e pendências. Não contém dados do cofre pessoal. O plano/índice devem ser consultados junto com as descrições atuais dos PRs.

## Registro do Claude — revisão e continuação (17/11, noite)

Revisão do trabalho do Codex concluída. Cinco achados consertados nos branches de origem; cada PR traz a seção “Revisão do Claude”:

- **#164** (contador das pastas), c5f15e2: a bolinha somava anexos que a árvore não mostra (Notas 12 com 11 linhas). Agora conta o que aparece ao abrir a pasta (subpastas + notas). Capturas refeitas.
- **#162** (J1), 910ccbe: o nativo recusa a terceira transferência aberta. Mesa com 3+ cenas e DOCX/EPUB com 3+ imagens falhariam no Android. A ponte ganhou uma fila de duas vagas.
- **#152** (P), 886d455: o Desfazer do token voltava o token inteiro (posição, PV) e recriava token removido. Agora volta só o que a nota mudou.
- **#153** (Q), f6ed56e: a recompensa podia entrar duas vezes no Tesouro (aviso + botão, clique duplo, falha entre as gravações). Agora há marca atual, trava e id fixo por missão.
- **#163** (E), 17ac331: o texto digitado com o cursor antes do cartão de propriedades era recusado. Acontecia no smoke e também com Tab vindo da barra. Agora vai para o começo do corpo. Smokes locais passaram; fica em rascunho até o CI.

Jobs reexecutados por instabilidade de rede: android-revisao em #149, #150, #155 e #157, e android-room em #150.

**M/U91 1–4 → PR #165** (`seguranca/1.5-gravacao-bloqueada`):
- rascunho local e “Não gravado”;
- motivo com passo a passo e botão da proteção do Windows;
- “Testar gravação” em Configurações › Cofre e ao abrir o cofre;
- espera de ~6 s, ritmo nos lotes e renomear sem resto.

Tipos, suíte, builds e os dois smokes passaram. O Android do “Testar gravação” fica para o N.

Próximas, na ordem: C → G → N (sobre M+G) → D → K → J2 → A2 → R → L → conferência final.

**C/U78 → PR #166** (`vtt/1.5-sair-da-mesa`):
- `POST /seat/leave` no computador e no Android;
- botão “Sair da mesa” com confirmação;
- aviso de “Controlado por” repetido no painel do mestre;
- smokes e teste JUnit novos.

Tipos, suíte, builds, os dois smokes e o JUnit da sala (`javac`) passaram.

**Pendente no #163:** o smoke de gravação no Windows do CI falhou duas vezes em `position`/`editorClick`; o Linux passa. Investigar antes de tirar do rascunho.
