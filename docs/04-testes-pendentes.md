# 04 — Testes pendentes (para fazer à mão)

O que os testes automáticos (`npm test`, `--smoke` do desktop e o CI) **não** conseguem conferir e precisa de você.
Marque `[x]` conforme for testando; se algo falhar, anote embaixo do item o que aconteceu.

**Onde pegar o app para testar**
- **Desktop (Linux/Windows):** `npm run desktop` nesta pasta, ou os instaladores do PR (GitHub › PR › *Checks* ›
  workflow **Release** › *Artifacts*: `.deb`/AppImage para Linux, `.exe` para Windows).
- **Android:** o APK de debug nos mesmos *Artifacts* (`Runas-Codex-<versão>-android-debug.apk`). Precisa permitir
  "instalar apps de fontes desconhecidas".
- **Navegador:** https://player07x.github.io/Runas-Codex/ (dados de exemplo; atualiza depois do merge na `main`).

> **Antes de testar com o cofre real "Ordem x Caos":** faça uma cópia da pasta ou deixe a gravação desligada
> (o cofre abre em somente leitura). O app faz backup antes de liberar a gravação, mas uma cópia não custa nada.

---

## Etapa 1 — Protótipo visual
Critério: *você navega por todas as telas no PC e no celular e aprova o visual.*

- [ ] Abrir todas as telas no PC (Início, Notas, Agenda, Wiki, Campanhas, Livros, VTT, Importar/Exportar,
      Configurações) nos temas escuro e claro.
- [ ] Abrir as mesmas telas no celular (navegador ou APK): barra inferior, nada cortado, sem rolagem para os lados.
- [ ] Aprovar o visual Órbita (ou anotar o que mudar).

## Etapa 2 — Instaladores
Critério: *instaladores abrem nos três sistemas.* (Os spikes de Android e desempenho ficaram para depois, por
decisão sua — não são testes.)

- [ ] **Linux:** instalar o `.deb` (ou rodar o AppImage) e abrir; o ícone aparece no menu.
- [ ] **Windows:** instalar o `.exe` e abrir. O SmartScreen vai avisar (o instalador não é assinado): "Mais
      informações › Executar assim mesmo".
- [ ] **Android:** instalar o APK e abrir; o app ocupa a tela toda e respeita a barra de status e a de navegação.
- [ ] Desinstalar e instalar de novo no Windows: as configurações (`%APPDATA%\runas-codex`) continuam.

## Etapa 3a — Núcleo de notas
Critério: *um cofre do Obsidian abre sem alterar um byte.* O teste de ida e volta já passou no "Ordem x Caos"
(776 notas, só leitura). Falta o uso de verdade:

- [ ] Abrir o cofre real pelo desktop (Configurações › Abrir pasta…): abre em **somente leitura**, notas e links
      aparecem certos.
- [ ] Liberar a gravação (Configurações › Permitir gravação): um backup é criado (Configurações › Backups › Abrir
      pasta).
- [ ] Editar uma nota no app e abrir no Obsidian: o texto está igual, nada mais mudou (frontmatter, quebras de linha).
- [ ] **Conflito:** com a mesma nota aberta no app em edição, mudar e salvar no Obsidian. O app avisa ("Usar a do
      disco / Manter a minha") em vez de sobrescrever.
- [ ] Mudar uma nota no Obsidian sem editar no app: a nota no app atualiza sozinha.
- [ ] Renomear uma nota com backlinks pelo app: os links nas outras notas (inclusive em propriedades e `.canvas`)
      são atualizados, e o Obsidian continua achando todos.
- [ ] Mover uma pasta pelo app e conferir os links no Obsidian.
- [ ] Mandar uma nota para a lixeira: ela aparece em `.trash` (e na lixeira do Obsidian).
- [ ] Criar nota, nota do dia e pasta pelo app; abrir no Obsidian.
- [ ] Sincronização (Syncthing/Obsidian Sync, se você usa): editar no app e ver a mudança chegar no outro aparelho
      sem "tempestade" de arquivos alterados.

## Etapa 4 — Mesa (VTT)
Critério: *uma sessão real roda no Runas-Codex.*

- [ ] Criar uma mesa (VTT › Criar Sala › Criar Nova) com o cofre gravável; ela fica em `.runas/mesas/`.
- [ ] Montar uma cena com mapa, tokens, paredes, luz e névoa; fechar e reabrir o app: tudo continua lá.
- [ ] Abrir a **sala na rede local** e entrar com um celular no mesmo Wi-Fi, pelo link e pelo código do assento.
- [ ] Abrir o **link público** (túnel da Cloudflare) e entrar de um celular no 4G.
- [ ] No token, "Controlado por" → Jogador 1: o jogador move só o próprio token; a visão e a névoa dele estão certas.
- [ ] Áudio: tocar uma faixa e uma ambiência; os jogadores ouvem.
- [ ] **VTT › Entrar Sala** no app (como jogador), colando o link do mestre.
- [ ] Uma sessão inteira com o grupo (umas 3 horas): sem queda, sem travar, sem perder o que foi feito.

## Etapa 3b — Editor completo
Critério: *a nota de teste com todos os formatadores aparece igual no app e no Obsidian.*

- [ ] Copiar a nota `desktop/tests/cofre-exemplo/Notas/Formatadores.md` (e `Caderno.md`, `runa.png`) para um cofre
      de teste, ou abrir o próprio `desktop/tests/cofre-exemplo` no Obsidian (melhor numa cópia).
- [ ] No app: Configurações › Compatibilidade com o Obsidian › Snippet runas-codex.css › **Instalar**.
- [ ] No Obsidian: Configurações › Aparência › Trechos de CSS › ligar **runas-codex**.
- [ ] Comparar a nota lado a lado (app no modo **Leitura** × Obsidian no modo leitura), seção por seção:
  - [ ] CommonMark e GFM (títulos, listas, tabelas, rodapés, tarefas, código com cores).
  - [ ] Obsidian (destaque, comentário oculto, callouts dobráveis e aninhados, fórmulas, Mermaid, transclusão
        `![[Caderno#Ideias]]`).
  - [ ] Dialeto (cor e fonte, versalete, capitular, descritivo, barra lateral, statblock, colunas com quebra,
        bloco largo, quebra de página, tabela mesclada, figura com legenda, imagem à direita, separador).
  - [ ] O sumário (```` ```table-of-contents ````) só aparece no Obsidian com o plugin *Automatic Table of
        Contents*; a rolagem `dice:` precisa do *Dice Roller*. Sem eles, anotar como fica.
  - [ ] "Só no Runas-Codex" aparece como texto comum no Obsidian (esperado).
- [ ] **Live preview** (modo Editar): escrever uma nota do zero; marcas somem fora da linha do cursor; clicar numa
      tabela/callout mostra o código; marcar tarefas pela caixinha; clicar em link abre a nota.
- [ ] Teclado do celular no live preview (Android): digitar, apagar, selecionar e colar sem o cursor pular.
- [ ] Anexos no desktop: imagem (`![[mapa.png|400]]`), áudio e vídeo tocam dentro da nota; PDF abre no leitor do
      sistema.
- [ ] Modelos: criar a pasta de modelos no Obsidian (Templates core plugin) e usar o mesmo modelo no app e no
      Obsidian; o resultado é igual (`{{title}}`, `{{date}}`, `{{time}}`).
- [ ] Nota do dia com o modelo do `daily-notes.json` (Obsidian › Notas diárias).
- [ ] **Gráfico** no cofre real (Notas › ícone do gráfico, em "Cofre inteiro"): fluido ao arrastar, dar zoom e
      passar o mouse; filtros, grupos de cor e forças funcionam; clicar abre a nota. Também no celular (pinça).
- [ ] Gráfico local (painel da nota › aba do gráfico) com profundidade 1, 2 e 3.

## Etapa 5 — Agenda
Critério: *lembrete dispara no Android e no desktop.*

- [ ] **Desktop:** criar um evento que comece daqui a uns 5 minutos, com lembrete "Na hora", minimizar o app e
      esperar: a notificação do sistema aparece na hora do evento; clicar nela abre a nota do evento.
- [ ] **Desktop, Windows:** o mesmo teste (as notificações do Windows precisam estar ligadas para o app).
- [ ] **Android:** criar um evento com lembrete, **fechar o app** e esperar a notificação (com o ícone da runa).
      Na primeira vez, aceitar a permissão de notificações; se a hora vier atrasada, usar "Permitir alarmes na hora
      exata" na Agenda. Tocar na notificação abre o app.
- [ ] **Android:** reiniciar o celular com um lembrete agendado: ele ainda dispara.
- [ ] **Full Calendar:** instalar o plugin no Obsidian, criar um calendário local apontando para a pasta
      `Agenda`; os eventos criados no app aparecem lá, e eventos criados lá aparecem no app.
- [ ] Recorrências: semanal com dois dias, a cada 2 semanas, mensal, anual e uma RRULE personalizada; "Pular esta
      data" some só com aquela ocorrência (no app e no Full Calendar).
- [ ] **Exportar .ics** e importar no Google Agenda (ou outro app): horários, repetições e lembretes certos.
- [ ] **Importar .ics** exportado do Google Agenda: eventos vão para `Agenda/Importados/` com fuso certo.
- [ ] Checklist de preparação no texto do evento: marcar pela Agenda e conferir na nota.
- [ ] Tarefas com prazo (`- [ ] texto 📅 2026-10-20`, formato do plugin Tasks) aparecem em "Tarefas com prazo".
- [ ] Criar um evento de sessão com "criar a nota da sessão em Campanhas/…": a nota é criada e "Abrir sessão" leva
      até ela; com "Contagem regressiva", a tela inicial mostra quanto falta.
- [ ] Visões no celular: mês (pontinhos), semana e dia com rolagem, lista.

## Etapa 6 — Wiki
Critério: *calendário com luas e intercalares calcula idade e dia da semana certos* (já coberto por testes
automáticos). Falta o uso de verdade:

- [ ] Criar uma wiki pelo app (Wiki › Criar wiki) e abrir a pasta `Wikis/<nome>/` no Obsidian: notas comuns.
- [ ] Escrever o calendário do seu mundo (Wiki › Novo artigo › Calendário) com os meses, a semana, as luas e as eras
      de verdade; conferir à mão alguns dias da semana e fases da lua que você já conhece.
- [ ] Um personagem com `nascimento_mundo` (e outro com `morte_mundo`): a ficha mostra a idade certa; "+1 mês" no
      calendário muda a idade quando passa o aniversário.
- [ ] Novo artigo de cada tipo que você usa: a ficha e as perguntas-guia fazem sentido? (anotar o que trocar).
- [ ] Relações: pôr `pais`/`filhos`/`conjuges` numa família e conferir a árvore; `membro_de` numa organização e o
      organograma; `aliados`/`em_guerra_com` entre facções e a teia diplomática.
- [ ] Linha do tempo com acontecimentos em duas trilhas (`trilha: "[[País A]]"`) e uma era longa: rolagem e zoom
      confortáveis.
- [ ] Mapa: pôr a imagem do seu mapa na pasta da wiki, criar o artigo Mapa, pôr pinos (um criando nota nova), mover
      um pino, medir uma distância com a régua (ajuste a `escala` do bloco) e entrar num mapa aninhado.
- [ ] Renomear no app uma nota que tem pino no mapa: o pino continua ligado (no Obsidian, renomear não atualiza o
      pino — avisar se for um problema).
- [ ] "Versão dos jogadores": callouts `[!segredo]`, a camada "Segredos" e os pinos secretos somem.
- [ ] No Obsidian, os blocos `runas-calendario` e `runas-mapa` aparecem como código (esperado) e as propriedades
      `_mundo` como texto, não como data.

## Etapa 8 — Livros

### Fase 8a — estrutura em notas e editor

- [ ] Abrir `Livros/Guia de Valdris` do cofre de teste no Obsidian: capítulos como notas comuns e `estrutura` como lista de links.
- [ ] Renomear um capítulo em Notas, voltar ao livro e conferir ordem, texto e links; repetir com edição externa pelo Obsidian.
- [ ] Conferir conflitos com o Obsidian aberto durante edição de capítulo e reordenação; nenhuma gravação deve sobrescrever uma versão externa.
- [ ] Criar partes, capítulos e seções após a seleção; incluir notas de “Fora do livro”; corrigir um link quebrado pelo frontmatter.
- [ ] Em Android real, arrastar pela alça na cortiça, inclusive com rolagem entre cartões distantes, e editar com teclado virtual.
- [ ] Conferir os formatadores nos três modos, nos temas claro e escuro; prévia paginada permanece para a 8b.
- [ ] Windows e Obsidian não foram executados localmente nesta fase. Linux/Electron e navegador em 320 px foram verificados.

### Fase 8b — prévia paginada

- [ ] Conferir Ctrl+P no diálogo nativo do Electron, sobretudo no Windows: papel correto, escala 100%, sem cabeçalhos extras do driver e impressão das cores de fundo. O motor de impressão A4 foi conferido no Linux, sem impressora física.
- [ ] Abrir o Caderno de formatadores nos quatro temas e quatro tamanhos; avaliar em especial caixas, colunas, imagens, fórmulas e tabelas perto das quebras. Capturas de referência em `docs/imagens/livros-8b/`.
- [ ] No Obsidian, conferir `tema`, `pagina`, `capitulos_nova_pagina`, `capa`, `creditos` e `contracapa` como propriedades comuns; editar externamente com o formulário de capa aberto e conferir a recusa de conflito.
- [ ] Renomear o título na prévia e conferir os links atualizados; o título continua sendo o nome da nota do livro.
- [ ] Testar livros reais longos e imagens grandes; a medição atual cobre o exemplo de 9 páginas e o corpus de formatadores.
- [ ] Android real: alternar Escrever/Prévia com teclado aberto; a largura de 320 px foi validada no navegador.

### Fase 8c — exportações

- [ ] Exportar um livro em PDF pelo diálogo de salvar do desktop (Linux e Windows) e comparar com a prévia nos quatro temas e tamanhos; o PDF A4 do Caderno de formatadores foi conferido no Linux, pelo smoke.
- [ ] Abrir o EPUB num leitor (Calibre, Thorium, Livros do celular) e, se der, passar no EPUBCheck: capa, sumário, imagens, fontes e capítulos na ordem.
- [ ] Abrir o DOCX no Word e no LibreOffice: títulos, caixas, colunas, tabelas, imagens e quebras de página; fórmulas aparecem em LaTeX e diagramas Mermaid como aviso.
- [ ] Exportar um livro real longo, com muitas imagens grandes, e medir o tempo.
- [ ] Navegador e Android: o PDF sai pelo diálogo de impressão ("Salvar como PDF"); EPUB e DOCX são baixados.

## Etapa 7 — Campanhas e quadros

- [ ] Abrir `Campanhas/Cinzas de Valdris/Quadro.canvas` do cofre de teste no Obsidian depois de editar no app: cartões, cores, grupo e ligações iguais; campos desconhecidos mantidos.
- [ ] Criar uma sessão pela campanha e conferir a nota e o evento na Agenda (lembrete de 1 dia, contagem na tela inicial); abrir os dois no Obsidian.
- [ ] Revelar uma pista, avançar um relógio, mover uma missão no quadro de missões e mudar a atitude de um NPC; conferir o Markdown no Obsidian.
- [ ] Exportar o diário da campanha (.md) no desktop pelo diálogo de salvar.
- [ ] Android real: quadro com toque (arrastar, ligar, zoom pelos botões; pinça ainda não existe) e seletor de coluna das missões.
- [ ] Windows e Obsidian não foram executados nesta fase; Linux/Electron (smoke com e sem `--write`) e navegador em 390 px foram verificados.

---

## Imagens nas notas (C1)

- [ ] Copiar uma imagem de verdade (captura de tela com Print Screen, "Copiar imagem" no navegador) e colar com Ctrl+V numa nota no modo Editar e no Código: o arquivo `Imagem colada AAAAMMDDHHmmss.png` aparece na pasta de anexos do Obsidian e a imagem aparece na nota.
- [ ] Arrastar uma foto do gerenciador de arquivos para o meio de uma nota: entra numa linha própria, no lugar onde soltou.
- [ ] Botão "Inserir imagem" da barra do editor: escolher várias imagens de uma vez.
- [ ] Colar texto copiado de uma planilha ou de um documento (que também leva uma "foto" do trecho): tem que colar o texto, não uma imagem.
- [ ] No Obsidian, mudar "Local padrão para novos anexos" (Arquivos e links) para "Mesma pasta do arquivo atual" e para uma pasta fixa, reabrir o cofre no app e colar de novo: o arquivo vai para o lugar certo e o Obsidian mostra a imagem.
- [ ] Cofre em somente leitura: o botão some e colar ou arrastar não grava nada.
- [ ] Windows: colar e arrastar (Linux/Electron e navegador foram verificados; Android só com o cofre real, na etapa A).

## Tamanho e posição das imagens (C2)

- [ ] No modo Editar, passar o mouse numa imagem: o menu (esquerda, centro, direita, largura total, tamanho original) e a alça do canto mudam o link (`![[mapa.png|direita|300]]`); conferir no modo Código.
- [ ] Celular: o menu e a alça aparecem ao tocar, com alvos de 44 px; arrastar a alça com o dedo.
- [ ] Reinstalar o snippet (Configurações › Snippet runas-codex.css) e abrir a mesma nota no Obsidian: posições iguais às do app no modo leitura. Conferido numa cópia isolada do Obsidian 1.14.4 (imagem em `docs/imagens/anexos/`); falta o seu cofre e o seu tema.
- [ ] Prévia e exportação dos Livros com imagens posicionadas (as classes `pos-*` valem também nas páginas).
- [ ] Configurações › Anexos sem uso: conferir a lista num cofre real antes de mandar algo para a lixeira.

---

## Etapa 9 — Mestre pelo celular (C3)

- [ ] Ligar a sala no computador, abrir "Controlar pelo celular" no painel Sala e ler o QR com o celular (mesma Wi-Fi): a mesa abre no navegador do celular, com a marca "Mestre remoto".
- [ ] Mover um token, desenhar, criar parede e trocar a cena transmitida pelo celular; conferir que aparece no computador e na tela dos jogadores.
- [ ] Mexer ao mesmo tempo no computador e no celular; as mudanças dos dois lados aparecem nos dois.
- [ ] "Trocar chave" e "Desconectar" no computador: o celular mostra que a conexão caiu; o link antigo não abre mais.
- [ ] Gerar o link público e abrir a mesa do mestre pelo celular em dados móveis (HTTPS pela Cloudflare).
- [ ] Importar uma imagem de token pelo celular (galeria ou câmera).
- [ ] Tablet e celular deitado: até a X3 (layout por toque), a mesa usa o layout do desktop. Captura do celular em pé em `docs/imagens/vtt-9/`.
- [ ] Windows: firewall pedindo permissão para a porta da sala na primeira vez.
## Atualizações (botão "Verificar atualizações")

- [ ] Instalar a pré-release `v0.1.0-beta.1` (Windows `.exe`, Linux AppImage e `.deb`), abrir Configurações › Verificar atualizações: aparece a `v0.1.0-beta.2`, com "O que mudou".
- [ ] "Baixar e instalar": no Windows o instalador abre e o app fecha; no AppImage o app reinicia já na beta.2; no `.deb` o pacote abre no instalador do sistema (pede a senha). Conferir a versão nova em Configurações.
- [ ] Sem internet, ou com o GitHub fora: a mensagem de erro aparece e nada muda.
- [ ] Android: a linha explica que o APK novo se baixa pela página de versões.

## Etapa 10 — Migração dos plugins de RPG do Obsidian (C4)

- [ ] Numa **cópia** de um cofre que use Calendarium, Leaflet, Fantasy Statblocks ou Initiative Tracker: abrir no app,
  liberar a gravação e ir em Importar / Exportar › "Plugins de RPG do Obsidian". Conferir as contagens, abrir a prévia
  de algumas notas e migrar.
- [ ] Depois de migrar, abrir a mesma cópia no Obsidian (com o snippet `runas-codex.css`): statblocks como callout, o
  bloco original some quando guardado em `%% … %%`, e os blocos `runas-*` aparecem como código. Conferido numa cópia
  isolada do Obsidian 1.14.4 com os exemplos; falta o seu cofre e o seu tema.
- [ ] Calendário convertido: o dia da semana e a fase da lua de hoje batem com o que o Calendarium mostrava.
- [ ] Mapa convertido: os pinos ficam no mesmo lugar que os marcadores do Leaflet (os testes conferem a conta; falta
  um mapa de verdade com imagem grande).
- [ ] Calendário do site Fantasy-Calendar: exportar o JSON de um calendário seu e escolher na tela.
- [ ] Backup: Configurações › Backups mostra o backup feito antes da migração.
- [ ] No Obsidian, `data_mundo` aparece com o campo de data (o Obsidian deduz pelo formato; o arquivo continua com o
  texto entre aspas). É assim desde a Wiki (ADR 0010); vale decidir se fica.

## Limitações conhecidas (não precisam de teste agora)

- **Android sem cofre real:** o acesso ao cofre no Android é um spike da etapa 2 que ficou para depois; no APK, Notas
  e Agenda usam o cofre de exemplo em memória (nada é salvo ao fechar o app).
- **Lembretes no desktop só com o app aberto** (pode estar minimizado). Bandeja e iniciar com o sistema ficam para
  depois.
- Ainda sem: timelapse do gráfico, prévia de link ao passar o mouse, comandos `/`, abas e painéis divididos,
  enquete de data pela sala, importar/exportar mesas.
- Campanhas: pacote de campanha (exportar/importar), tesouro, diário dos jogadores e avaliação pela sala ficam para depois (ADR 0011).

## Etapa 8 — Livros: fase 8d (X2), importações

- [ ] Na lista de Livros, importar um documento real do Homebrewery e outro do GM Binder, conferir os avisos e comparar a prévia com o original: caixas, colunas, blocos largos e quebras. CSS próprio não é reproduzido; imagens por URL ficam como links.
- [ ] Importar um DOCX real do Word e outro do LibreOffice, escolhendo H1 e H2 na prévia: capítulos, negrito, itálico, listas, tabelas (inclusive células mescladas) e imagens raster.
- [ ] Abrir `Livros/<Livro>/` no Obsidian, com o snippet atualizado: nota do livro, capítulos na ordem e imagens em `Anexos/` como arquivos comuns. Conferir também uma imagem dentro de tabela.
- [ ] Windows e Android real: seletor de arquivo, cancelamento, prévia e confirmação; no Android, persistência no cofre real depende da C8.
- [ ] Importar duas vezes o mesmo título: a segunda pasta recebe outro número. Em falha de gravação, conferir a pasta informada e as notas preservadas antes de tentar novamente.
- [ ] Importar um livro longo com muitas imagens e conferir os limites informados (20 MB de entrada, 30 s por conversão, DOCX até 100 MB descompactados).

## Corretor ortográfico sem rede (ADR 0018)

- [ ] Abrir o app instalado (Linux e Windows) e escrever numa nota uma palavra errada ("palavrra"): ela fica
  sublinhada. (As sugestões no clique direito ainda não existem; entram na C5a.)
- [ ] Windows: depois de usar o editor, a pasta `%APPDATA%\runas-codex\Dictionaries` tem o `pt-BR-3-0.bdic` copiado
  pelo app; com o Windows em outro idioma, o app continua corrigindo em pt-BR e não aparece outro dicionário lá.

## Etapa 9 — VTT no toque (X3)

- [ ] Celular Android real: criar uma mesa em memória no APK, mover tokens, desenhar à mão livre, usar régua,
  criar paredes/portas, regiões e luzes só por toque. Tocar no vazio desmarca; arrastar no vazio seleciona em retângulo.
- [ ] Começar um traço ou arrasto e acrescentar o segundo dedo: o mapa move/aproxima, sem deixar desenho ou edição.
  Soltar um dedo antes do outro não cria objeto. Interromper com troca de aplicativo também cancela a prévia.
- [ ] Toque longo num objeto abre editar/ocultar/apagar; testar alças de tamanho e giro de token/imagem e os dois
  raios da luz. Conferir encaixe e botão “Ignorar grade”.
- [ ] Conferir desfazer/refazer, mover uma casa, espelhar, ocultar e apagar pelos botões. Editar no desktop enquanto
  o mestre remoto está conectado: desfazer no celular deve recusar sobrescrever uma alteração posterior do desktop.
- [ ] Celular de 320 px, tablet em pé/deitado, temas claro/escuro: gavetas, folha de propriedades, teclado virtual,
  seleção de arquivos e rolagem interna, sem rolagem lateral da página.
- [ ] Tela de toque no desktop: gestos e alças; depois repetir com mouse, roda, botão direito e atalhos.
- [ ] Com sala no desktop, abrir o link do mestre no celular e operar só por toque enquanto um jogador acompanha.
  Hospedar a sala no Android permanece na X7; a mesa em memória não persiste após fechar o APK.
- [ ] Repetir o mapa de 4096 px com névoa e luzes num aparelho físico e comparar fluidez com o artefato do CI.

A X3 foi conferida no emulador Android 15 (CI): 31,8 FPS na cena simples e 24 FPS no mapa de 4096 px com névoa e
luzes, com resolução adaptada para 1 e GPU por software. Os números e capturas estão na ADR 0006; a conferência em
aparelho físico acima continua necessária.
## Notas: links, gráfico e notas pessoais (C5a)

- [ ] Prévia de link: na leitura, passar o mouse num link; no modo Editar, com Ctrl apertado; no celular, tocar e
  segurar (a prévia sobe do pé da tela e o link não abre). Link para `#título` e `#^bloco` mostra só o trecho.
- [ ] Digitar `@` e parte do nome de uma nota; escolher; conferir o `[[…]]` no modo Código. Um e-mail não abre a lista.
- [ ] Painel Links › "Menções sem link" de uma nota citada pelo nome em outras: "Linkar" e conferir no Obsidian que o
  texto lido não mudou.
- [ ] Copiar link da nota, de um título (sumário) e do bloco do cursor; colar no Obsidian e conferir que abre o lugar
  certo (o `^id` criado aparece no fim do parágrafo).
- [ ] `runas://`: no app **instalado**, "Copiar link" › "Endereço runas://", colar num navegador ou no terminal
  (`xdg-open 'runas://…'` no Linux) com o app aberto e com o app fechado; a nota abre. Abrir o app duas vezes traz a
  mesma janela.
- [ ] Timelapse no gráfico global (botão ▶) num cofre grande.
- [ ] Fixar, colorir e arquivar pelo menu de etiqueta da barra da nota; conferir as propriedades `fixada`/`cor` e a
  pasta `Notas/Arquivo/` no Obsidian.
- [ ] Captura rápida `Ctrl+Alt+N` com o app em segundo plano, no Windows e num Linux com X11. No Wayland (GNOME 50.1)
  o portal já está ligado, mas o Electron 44 ainda não abre a sessão de atalhos (ADR 0019); conferir de novo quando
  o Electron for atualizado.
- [ ] PIN: Configurações › Privacidade › "Bloquear o espaço Notas com PIN"; fechar e abrir o app, errar e acertar o
  PIN; "Bloquear" no topo da lista de Notas.
- [ ] Clique direito numa palavra errada no editor (app desktop): sugestões, "Adicionar ao dicionário" e
  recortar/copiar/colar.


## Notas: organização e busca (C5b)

- [ ] Busca da lista de Notas num cofre real: `tag:npc`, `path:Lugares`, `"frase exata"`, `-termo`, `a OR b`,
  `line:(rei morto)`, `section:(aparência olhos)`, `[local:Valdris]` e `/reg(ex)?/`; comparar com a mesma busca no
  Obsidian.
- [ ] Buscar e substituir (botão ao lado do gráfico): prévia, desmarcar uma nota, "Fazer backup e substituir"; conferir
  o zip novo em Configurações › Backups e o texto no Obsidian. Com uma nota aberta e editando, o que foi digitado entra
  antes da troca.
- [ ] Painel "Prop.": criar uma propriedade de cada tipo; conferir no Obsidian que data e data-hora aparecem com o
  seletor de data dele e o link como link. Uma chave `data_mundo` continua como texto.
- [ ] Favoritos: estrela na barra da nota, no sumário (título), na pasta (passar o mouse) e no resultado da busca;
  abrir cada um pela seção Favoritos. Num cofre com marcadores do Obsidian, eles aparecem com a marca "Obsidian".
  Renomear uma nota favorita e conferir que o favorito acompanha.
- [ ] Voltar/avançar: botões da barra da nota, `Alt+←`/`Alt+→` fora do editor e os botões laterais do mouse (Windows e
  Linux). Depois de "Nova nota", voltar não cria outra nota.
- [ ] Arrastar uma nota e uma pasta para outra pasta (e para a raiz) no app desktop; conferir no Obsidian que os links
  continuam funcionando. Arrastar uma nota da árvore para dentro do editor insere `[[link]]`.
- [ ] Ordem da lista (botão de setas): cada opção, e a escolha lembrada depois de fechar o app.
## C5c — painéis e ferramentas de notas

- [ ] Desktop: abrir notas em abas, fixar, arrastar entre painéis, empilhar, dividir para baixo/ao lado e restaurar
  um workspace após fechar o app. Abrir em outro monitor; editar a mesma nota nas duas janelas e conferir o conflito.
- [ ] Com edição pendente na janela extra, fechá-la e trocar de cofre pela principal: conferir que a edição foi salva;
  provocar conflito pelo Obsidian e conferir a opção de continuar editando antes de fechar sem salvar.
- [ ] Celular/tablet físico, claro e escuro: ações da aba, seletor de painel, workspace, teclado virtual e rolagem de
  tabelas, sem rolagem lateral da página. Cofre real no Android depende da C8.
- [ ] Abrir os `.base` do próprio cofre e embeds com `#Visão`; conferir filtros e `this`, fórmulas, agrupamento,
  resumos e ordenação. Fórmula ou função não suportada deve avisar sem regravar o arquivo.
- [ ] Blocos `dataview`: testar listas e tabelas com FROM/WHERE/SORT/LIMIT. JavaScript, TASK/CALENDAR e comandos
  fora desse conjunto não são executados. Conferir também no live preview e com o espaço Notas bloqueado.
- [ ] Extrair seleção com links e mesclar notas de pastas distintas: conferir a prévia, propriedades preservadas no
  bloco YAML, imagens, backlinks e cartões de arquivo dos quadros. A origem deve continuar recuperável na lixeira.
- [ ] Histórico: editar, guardar uma versão, comparar, restaurar, desfazer a restauração pelo histórico e renomear a
  nota. Fechar e abrir o app: as versões ficam neste aparelho, separadas por cofre.
- [ ] Recuperar da lixeira uma nota apagada no Obsidian e um anexo; destino existente deve recusar sem substituir.
- [ ] `/tabela`, `/callout`, `/link`, `/imagem`, `/data`; não devem abrir dentro do YAML ou de código. Contagem com
  acentos e emoji. Atalhos personalizados, conflitos e restauração dos padrões, incluindo Ctrl+P na prévia de Livros.
- [ ] Importar um snippet CSS do Obsidian, ativar/desativar e reiniciar. Ícones/cores de notas e pastas, inclusive
  depois de mover/renomear. Classes exclusivas do Obsidian podem precisar de ajuste no snippet.

## Atualização Ubuntu pelo aplicativo

- [ ] Instalar uma vez a versão corrigida e, quando houver uma posterior, usar Configurações › Verificar › Baixar e
  instalar: conferir o diálogo de autorização do Ubuntu, atualização pelo APT sem abrir o Centro de Aplicativos e
  reinício com a versão nova. Confirmar que notas em edição, inclusive janelas extras, foram salvas.
- [ ] Cancelar a autorização: o app mostra o cancelamento e permanece aberto, sem anunciar sucesso.
- [ ] Com outro gerenciador de pacotes aberto, conferir espera/erro legível sem fechar o app. Se houver conflito ao
  salvar uma nota, o app permanece aberto para resolver antes de reiniciar.

## C6a — fechamento da Wiki

- [ ] Geradores: criar resultado, editar e guardar como nota; conferir sem rede e no Obsidian.
- [ ] Tabelas: pesos, encadeamento de outra nota, erro de ciclo e destino inexistente; leitura e live preview.
- [ ] Idioma: traduções, pronúncia, regras e filtro nos dois sentidos; novo artigo traz exemplo editável.
- [ ] Galeria e áudio com anexos reais; spoiler abre por clique/teclado também no Obsidian.
- [ ] Repetições de eventos por dias/meses/anos no calendário fictício, com data final e dias inexistentes. Na visão
  dos jogadores, eventos secretos não aparecem.
- [ ] Crônicas: trocar era na linha do tempo e abrir o mapa; conferir imagens, zonas, rotas, rótulos e camadas
  secretas. Criar/remover desenhos por pontos e camadas de imagem, inclusive depois de fechar e abrir o cofre.
- [ ] Windows, Obsidian e áudio real ficam na conferência manual; Android ficou para a tarefa complementar.

## C6 — Wiki, Campanhas e Agenda (Codex, 17/10/2026)

- Em Linux e Windows, ligar a bandeja, fechar a janela, reabrir pelo ícone e sair pelo menu; conferir lembrete
  agendado com a janela escondida. Autorun permanece C9.
- Com dois jogadores reais e um espectador, apresentar artigo público e privado, enviar diário, avaliar uma sessão,
  responder enquete de data e sinalizar Carta X. Só o mestre deve ver resultados privados; só o destinatário deve
  ver o artigo privado. Gravar diários/resultados antes de abrir outra atividade ou fechar o mundo.
- Navegar Wiki → Campanhas → Mesa mantendo sala; encerrar no banner e trocar de cofre. Conferir importação de
  encontros para iniciativa presencial, tesouro e gerador de aventuras.
- Conferir camadas/eras do mapa, recorrência fictícia, dicionários e tabelas encadeadas com um cofre real.
- Em tela touch física, testar pinça, seleção de cartões, arrasto conjunto e recorte/restauração. Capturas e testes
  automatizados não substituem multitouch físico nem revisão por leitor de tela. Android vai para a tarefa posterior.

## X5 — fechamento dos Livros

- [ ] Em um livro real: citar personagens/locais pelo painel da Wiki, transcluir um artigo e conferir no Obsidian.
- [ ] Ligar índice/glossário no acabamento, preencher termos e os resumos dos artigos. Conferir ordem e referências
  de capítulo/página na prévia/PDF e os links do EPUB em um leitor.
- [ ] A4/Carta/A5/6x9: margens, sangria e marcas de corte em impressora física; fundos, texturas e marca d’água.
- [ ] CSS de tipografia/cores modifica só o papel. CSS inválido mostra o erro e não é aplicado.
- [ ] Exportar HTML e abri-lo sem internet; abrir RTF no Word/LibreOffice. Conferir acentos e imagens. RTF usa
  tabulações para tabelas e avisos para diagramas; para fidelidade de página, usar PDF.
- [ ] Markdown único mantém a ordem e caminhos do cofre. Extrair o ZIP e abrir como cofre no Obsidian, incluindo
  transclusões e anexos.
- [ ] Modo foco, máquina de escrever, comentários no cursor e histórico de versões do capítulo: guardar, comparar e
  restaurar, inclusive com alterações externas para conferir a recusa de conflito.
- [ ] Android: conferir na tarefa complementar da revisão completa, após C8/X7 (fora desta rodada).

## X8 e pedido adicional de imagens/contadores

- Conferir preferências 85–140%, três paletas, claro/escuro, modo tablet e movimento reduzido em Linux/Windows e com
  Orca/NVDA. Testar Tab/Escape/retorno de foco nos diálogos e na paleta, inclusive diálogos sobrepostos.
- Criar cofre vazio: tour, oito exemplos, pasta `Anexos/Imagens`; remover exemplos para `.trash`, preservar notas sem
  marca e recuperar pela lixeira. Conferir zero artigos sem página escrita e zero mesas sem manifesto.
- Colar/arrastar/importar imagens em vários espaços, renomear pelo link, pelo botão da nota e pelo botão direito;
  repetir o mesmo arquivo em duas notas e num quadro/mapa. Reunir arquivos com nomes iguais e conferir no Obsidian.
- Conferir fonte/zoom e menus no teclado virtual e multitouch físicos. Android não foi implementado/testado nesta
  rodada. O roteiro completo está em `docs/tarefas/revisao-completa-complementar.md`.


## W1 — categorias da Wiki

- [ ] Categoria real com 100+ artigos: início limita cinco recentes, abrir categoria mostra 24, “Mostrar mais” amplia
  por 24; rolar com retratos pesados e conferir carregamento lazy, busca por apelidos/campos, ordem e persistência da lista.
- [ ] Retrato em propriedade e primeira imagem no corpo, sem tipo e sem imagem: conferir no Windows/Linux e no
  Obsidian, inclusive imagens em `Anexos/Imagens`, nomes duplicados e caminhos com acento/porcentagem.
- [ ] Alternar visão dos jogadores: notas secretas não entram na contagem, busca, filtros ou cards; artigo recém
  alterado fora do app deve atualizar os resultados após releitura.
- [ ] Criar a partir de subcategoria e conferir tipo/pasta sugeridos; tema claro/escuro, 320 px e fontes ampliadas.
- [ ] Personalizar Nova nota e conferir ajuda de Configurações, dica do botão e paleta com a combinação efetiva.


## Atualizador Ubuntu — beta.6

- [ ] Instalar manualmente a beta.6 sobre beta.4/5 (elas ainda executam o comando APT antigo).
- [ ] Da beta.6 para uma versão posterior, testar o botão Baixar e instalar, autorização gráfica, senha cancelada,
  bloqueio do APT, dependência ausente e reabertura. Os testes não instalam pacotes no sistema do desenvolvedor.
- [ ] Conferir que o perfil de fontes é removido após sucesso/falha e que não houve download de dependências.

## Beta.7 — sem metas de palavras e Configurações compactas

- [ ] Livros: estante e editor mostram só palavras e capítulos; criar livro novo não grava `meta_palavras`. Um livro
  antigo com `meta_palavras` abre normalmente.
- [ ] Wiki: a página inicial não mostra mais o cartão de progresso/meta.
- [ ] Configurações no desktop (janela larga e estreita) e no celular: duas colunas sem buracos; tudo cabe a partir de
  320 px. Conferir Aparência (tema, paleta, tamanho, animações, tablet, restaurar), Primeiros passos (tour, adicionar
  e remover exemplos), Imagens (criar pasta, reunir), bandeja do desktop dentro de Agenda e lembretes, atalhos
  editáveis e restaurar, trechos CSS (adicionar, importar, cancelar, ligar/desligar, remover).
- [ ] A aparência da sala do VTT (botão de paleta na mesa) continua abrindo e mudando tema e tamanho.

## Beta.8 — dois cliques no quadro

- [ ] No quadro (Canvas e Campanhas › Quadro), com mouse: dois cliques num cartão de texto abrem a edição dele, sem
  criar outro; dois cliques num cartão de nota abrem a nota; dois cliques no vazio criam um cartão de texto.
- [ ] O mesmo no celular/tablet com toque (dois toques).

## Beta.9 — datas com a sigla do calendário

- [ ] Ficha de um personagem (Editar): escrever `ANO-MM-DD SIGLA` grava `nascimento_mundo` assim; sem sigla ou com
  sigla inexistente, a ficha recusa. Idade, dia da semana e era conferem com o calendário da sigla.
- [ ] Wiki com dois calendários: nascimento num e morte no outro; cada um aparece na linha do tempo do seu calendário.
- [ ] Cofre com datas antigas (sem sigla): Wiki › Calendário mostra o aviso; "Acrescentar a sigla" regrava as datas e
  o aviso some. No Obsidian, as datas aparecem como texto com a sigla.
- [ ] Nova sessão de campanha: a data do mundo vem com a sigla.

## Beta.11 — linha do tempo com vários calendários e sincronização

- [ ] Wiki com dois calendários (ex.: Valknut, Rúnico e Arthuriano): a linha do tempo abre com o que tem
  acontecimentos; marcar os dois mostra gráficos separados até sincronizar, e no mesmo eixo depois.
- [ ] Calendário › Sincronizar: gravar "este dia = aquele dia"; o bloco ganha `correspondencias`; o Dia escolhido
  mostra a data no outro calendário; "Alinhar o hoje" e "Definir hoje" (digitado) atualizam os dois.
- [ ] Digitar uma data inexistente em "Definir hoje" mostra o erro e não grava.


## beta.12 — Personagens da campanha na wiki

- No Elenco, criar um personagem em uma wiki e selecionar um já existente; abrir o artigo pelo cartão.
- Trocar/limpar o jogador e desvincular; conferir que o artigo permanece na Wiki e pode ser vinculado novamente.
- Usar o mesmo artigo em duas campanhas com jogadores diferentes; conferir que alterar um não afeta o outro.
- Em campanha antiga, adicionar um artigo e desvincular perfis antigos até esvaziar o elenco; reabrir a campanha e
  conferir os vínculos e as presenças históricas. Não há migração automática de arquivos antigos.
- Conferir o formulário e os botões em 320 px, tablet e desktop, nos temas claro/escuro e em dispositivos físicos.

## C8 — Android com o cofre real (ADR 0015)

No celular (Android 11 ou mais novo, de preferência um aparelho médio), com o APK do PR da C8:

- [ ] Configurações › Cofre › Abrir pasta: o Android pede "acesso a todos os arquivos"; depois, escolher a pasta do
  cofre do Obsidian (ex.: `Documents/Obsidian/…`). As notas aparecem; o cofre abre em somente leitura.
- [ ] Liberar a gravação, editar uma nota e abrir no Obsidian do celular: o texto é o mesmo; nada mais mudou no cofre
  (conferir com o Syncthing/Git, se usar).
- [ ] Com o Obsidian do celular, mudar uma nota aberta no Runas-Codex: a nota recarrega (ou avisa o conflito, se havia
  edição pendente).
- [ ] Digitar com o Gboard no editor (acentos, sugestões, apagar palavras inteiras): o texto sai certo.
- [ ] Tempo para abrir um cofre grande (anotar quantas notas e quantos segundos).
- [ ] Imagens das notas aparecem; tocar num PDF ou áudio abre no app do Android.
- [ ] Exportar o .ics da Agenda: o Android pergunta onde salvar.
- [ ] Compartilhar um link do navegador e uma foto da galeria com o Runas-Codex: vira nota em
  `Notas/Caixa de entrada/`, com a imagem embutida.
- [ ] Widget da Agenda na tela inicial: mostra os próximos eventos; tocar abre a Agenda.
- [ ] Lembrete de um evento do cofre real dispara com o app fechado.
- [ ] Configurações › Criar cofre numa pasta vazia: nasce com as pastas dos espaços e `.obsidian`, já gravável.
- [ ] Depois de cadastrar os segredos da chave (ADR 0015, seção 6): a Release traz o APK assinado.

### Fechamento do CI da C8 — 18/10/2026

O emulador Android 35 aprovou os 22 checks do smoke e o spike de 5 mil notas: `indexMs: 8415`, `heapMb: 18`,
`keyboardMs: 6509` (execução `39170127880`, ADR 0015, seção 5). Continuam pendentes os testes físicos acima.

- [ ] No Windows, editar a mesma nota em duas janelas, inclusive com o antivírus ativo: uma gravação deve vencer e a
  outra deve avisar o conflito. O runner apresentou `EPERM` transitório na troca do temporário em algumas execuções;
  as regras da gravação segura permaneceram intactas.

### Reserva SAF do cofre — Android A2

- [ ] Recusar “acesso a todos os arquivos”, aceitar a reserva e escolher um cofre da memória interna ou do cartão:
  abre em somente leitura. Liberar a gravação faz backup; editar e conferir no Obsidian.
- [ ] Reiniciar o celular: a árvore e o modo de gravação continuam lembrados. Cancelar o seletor mantém o cofre atual.
- [ ] Alterar uma nota pelo Obsidian enquanto o Runas-Codex está em segundo plano e voltar: relê a nota ou avisa o
  conflito se havia edição pendente. No SAF a atualização acontece ao voltar para o app.
- [ ] Imagens, áudio e PDF no SAF: aparecem na nota e abrem no aplicativo padrão; mover/renomear anexos mantém a
  interface atualizada. Conferir os dois temas a partir de 320 px.
- [ ] Revogar a permissão da árvore ou remover o cartão: o app oferece escolher novamente; nenhuma gravação parcial.
- [ ] Interromper uma gravação ou movimento SAF encerrando o processo: ao reabrir, o original volta ou fica preservado
  na `.trash` se o destino já estiver ocupado. Os testes JVM cobrem as etapas da recuperação; falta celular físico.
- [ ] Digitação rápida e composição com Gboard no cofre SAF; o teste do emulador envia teclas com cadência definida.

## Beta.13 — retorno da conferência manual pelo dono

O dono informou que concluiu os testes manuais desta rodada e que tudo está funcionando. A limitação relatada
após essa validação é selecionar como cofre uma pasta do notebook acessada por SMB em outro aplicativo de arquivos
no Android. A beta.13 restringe o seletor e o backend SAF à memória interna e ao cartão; falta verificar se o
aplicativo escolhido disponibiliza a pasta pelo SAF e se o uso pretendido é acesso remoto ou uma cópia local
sincronizada. A assinatura do APK continua dependendo da configuração da chave descrita na ADR 0015.

### Pastas de outros aplicativos — nova conferência após a beta.13

- [ ] Com acesso a todos os arquivos já liberado, usar Abrir pasta e selecionar a pasta disponibilizada pelo outro
  gerenciador. Conferir leitura, backup ao liberar gravação, alteração no arquivo sincronizado e persistência após
  reiniciar o Runas. Repetir Criar cofre em uma pasta vazia desse gerenciador.
- [ ] Cancelar o seletor mantém o cofre anterior. Revogar a permissão ou deixar o provedor indisponível deve mostrar
  o erro sem alterar arquivos; voltar ao app relê as mudanças recebidas do notebook pelo gerenciador.
- [ ] Conferir anexos por URI do outro aplicativo e a recusa de escrita quando ele não fornece as operações ou os
  metadados necessários. O CI usa outro aplicativo de teste; sincronização real continua sendo conferência física.

### Transferências e documentos — pedido após a beta.13 (2026-10-18)

Os testes manuais da beta.13 foram informados como aprovados pelo dono. Conferir somente os fluxos novos:

- Android e desktop: exportar `.runas` e ZIP de um espaço e do cofre inteiro, incluindo imagens e mesas. Levar
  ao outro aparelho, conferir a prévia e importar; abrir o ZIP no Obsidian. Notas e anexos devem permanecer iguais.
- Escolher notas específicas, com/sem notas ligadas; anexos devem acompanhar. Mesclar mantém conflitos; duplicar
  cria caminhos novos; substituir pede salvar o pacote de segurança. Cancelar esse destino não deve substituir nada.
- Alterar um arquivo no outro editor depois da prévia e confirmar: deve recusar a versão antiga. Em falha parcial
  de um provedor, conferir a quantidade informada e os arquivos presentes, sem perda da cópia de segurança.
- Android: cancelar os seletores de entrada/saída e escolher um destino oferecido por outro aplicativo. Testar
  documentos grandes dentro dos limites exibidos e a recusa acima deles, inclusive no aparelho com pouca memória.
- PDF/HTML/DOCX: selecionar notas de Wiki e Notas com tabelas, imagens, fórmulas e transclusões. Conferir a prévia,
  o sumário HTML offline e a versão dos jogadores sem segredos. No Android, salvar PDF pelo diálogo de impressão;
  cancelar a impressão deve manter o app utilizável. Conferir o DOCX no editor que será utilizado.

### Atualização do APK e indicações de teclado — próxima beta (2026-10-18)

- No Android, conferir Configurações, busca/paleta, impressão e ferramentas da mesa: sem Mod/Ctrl/Alt na interface,
  com as ações por toque presentes. Desktop deve continuar mostrando os atalhos. Notas com `<kbd>` conservam seu texto.
- Na beta assinada com chave permanente, usar Verificar quando houver uma versão posterior com a mesma assinatura:
  conferir versão e notas, baixar, negar e depois autorizar a instalação desta fonte. Cancelar o instalador deve
  manter o app utilizável; confirmar a atualização deve preservar cofre, escrita liberada e permissão SAF.
- Conferir rede indisponível e pouco espaço em cache: o erro deve ser explícito, sem marcar a versão como instalada.
  Não existe atualização silenciosa. A troca real entre dois APKs é coberta no emulador; conferir o comportamento
  do instalador e da autorização específica do aparelho do dono.
- APK debug antigo (até beta.13) tem outra assinatura. A nova beta não consegue substituí-lo automaticamente;
  planejar a migração manual preservando o cofre e exportando backups antes de remover uma instalação antiga.
  A implementação não desinstala nem apaga a versão antiga.
## Tarefas do plugin Tasks e tempo livre (ADR 0020)

Use uma **cópia** de um cofre de teste, com o plugin Tasks 8.6.0 no Obsidian.

- [ ] Configurações › Tarefas › Importar: as opções do `data.json` do Tasks aparecem iguais (filtro global, formato,
  estados personalizados, predefinições); o arquivo do Obsidian não muda.
- [ ] Numa nota: `- [ ] Beber 2L de água 🔁 every day 📅 <hoje>`. Concluir no Runas-Codex (live preview, modo leitura,
  numa consulta ```tasks, na Agenda) cria uma só ocorrência para amanhã, acima; abrir no Obsidian e conferir que a linha
  é a mesma que o Tasks gravaria concluindo lá. Repetir concluindo no Obsidian e abrindo no Runas-Codex.
- [ ] Mesma conferência com: formato Dataview, `🏁 delete`, `when done`, `every month` no dia 31, estados `[/]`, `[-]`
  e um estado personalizado, tarefa com `🆔`/`⛔` (bloqueada some de `is not blocked`).
- [ ] Blocos ```tasks copiados do Obsidian (filtros, `group by`, `sort by`, `limit`, `preset`, `view columns by
  priority`) mostram as mesmas tarefas nos dois apps; arrastar entre colunas muda a prioridade/data na nota.
- [ ] Editor: Ctrl+L alterna a tarefa da linha; Ctrl+Shift+T abre a janela "criar ou editar tarefa"; ao digitar
  `📅 ama` numa tarefa aparece a data de amanhã.
- [ ] Com o PIN do espaço Notas bloqueado, as tarefas de `Notas/` somem das consultas e da Agenda.
- [ ] Agenda › Tempo livre › Definir horários (ex.: 08:00–12:00 e 14:00–18:00): o dia mostra o total e as faixas; hoje
  mostra também o "livre daqui em diante"; o mês e a semana mostram o resumo em cada dia.
- [ ] Caso de aceitação: disponível 08:00–18:00 e eventos 09–11, 10–12 e 15–16 → **6 h** em 08–09, 12–15 e 16–18; uma
  tarefa com prazo nesse dia e um evento às 19h não mudam o total.
- [ ] Evento marcado "não ocupa o tempo", evento de dia inteiro (as duas escolhas), evento que passa da meia-noite e
  uma tarefa `- [ ] 09:00 - 10:30 …` com data agendada.
- [ ] Importar um `.ics` do Google Agenda com uma ocorrência movida e outra cancelada: a movida aparece no novo horário
  e a original some; a cancelada não aparece.
- [ ] Celular (Android) e 320 px: caixas com 44 px de toque, janela de edição e de tempo livre sem rolagem lateral.

## X4 e interface de escrita — conferência antes do merge (19/10/2026)

- [ ] No navegador, conferir os seis controles de Livros, galeria por categoria e Modo foco; sair pelo botão e Escape.
- [ ] Arrastar as bordas da navegação, lista/detalhes de Notas, referência/prévia de Livros, Wiki, Agenda, sessões,
      gráfico e propriedades da mesa; recolher e reabrir também no celular; conferir a persistência ao reabrir.
- [ ] Verificar nomes horizontais no seletor de Wiki e datas em uma linha em Agenda › Tarefas com prazo.
- [ ] Inserir `::: runas-colunas-1` até `::: runas-colunas-4`; conferir o fluxo na prévia e no PDF, sem retirar as
      quebras de colunas manuais. Abrir o DOCX/RTF no Word e no LibreOffice para conferir suas seções contínuas.
- [ ] Abrir Exportar… na nota, pasta, artigo, categoria e Wiki, e Exportar diário… nas sessões da campanha.
- [ ] Gerar versão dos jogadores; verificar PDF, DOCX e HTML sem o segredo e sem artigos secretos.
- [ ] Extrair o ZIP do Site offline e abrir index.html sem internet no computador e no celular; conferir links,
      imagens e fontes. Mapas são imagem e lista; controles interativos não acompanham o arquivo.
- [ ] Autorizar explicitamente o merge e uma eventual release depois da conferência do navegador, como solicitado.

### Conferência adicional de Livros — layout de escrita e celular (19/10/2026)

- Conferir a folha central e a faixa visual de formatação; selecionar uma palavra e aplicar Negrito/Itálico.
- No celular, conferir os ícones, dicas, abertura/recolhimento de Capítulos e Referências e os modos da nota.
- No foco, conferir a barra única (Voltar, Ações, Leitura/Editar/Código e Sair do Foco), a faixa fixa e o aproveitamento da altura.
- Conferir a precisão de cliques em notas longas, títulos e linhas quebradas após mudar fonte/tamanho e largura.
- Mandar capítulo/seção/parte para a lixeira e conferir a propriedade `estrutura` dos livros que o referenciam.
- Abrir o site extraído por `index.html` fora do navegador integrado, que bloqueia `file://`; testar os links offline.
- Validação local: 515 testes app + 178 desktop; typecheck, builds e smokes Electron de leitura/gravação passaram.

### Revisão das barras de Livros — 19/10/2026

- Conferir a ordem Voltar → Capítulos → Escrever no início da barra superior.
- Na direita, conferir Referências → Leitura → Editar → Código → Ações da nota, com o menu de ações flutuante.
- Conferir os cartões de 40 px e o tamanho anterior das categorias. A seta e dois cliques nas categorias recolhem/expandem os cartões; recarregar mantém a escolha.
- Confirmar conforto dos comandos compactos no aparelho físico, conforme tamanho pedido na revisão.

## Restauração da X4 e da X7 na main (21/10/2026)

- [ ] Livros: a faixa de formatadores, o Modo foco e os painéis redimensionáveis voltaram, iguais aos da beta.15.
- [ ] Exportar… aparece de novo na nota, na pasta, no artigo, na categoria, na Wiki e no diário das sessões.
- [ ] Agenda › Tarefas com prazo continua com as linhas do Tasks (#40), sem voltar à lista antiga.
- [ ] Android: hospedar a sala pelo celular (X7) funciona como na beta.15; o CI roda o `room-smoke`.

## Situação das conferências (21/10/2026)

As caixas acima nunca foram marcadas, mas a maior parte já foi conferida pelo dono. Este resumo diz o que vale; as
seções antigas ficam como histórico (o arquivo só recebe acréscimos).

**Aprovado pelo dono**
- Da etapa 1 até a beta.13: aprovado na conferência registrada em “Beta.13 — retorno da conferência manual pelo dono”.
- Android depois da beta.13 (pastas de outros aplicativos, transferências, atualização do APK, C8): o dono usa o app
  no celular todo dia e informou em 21/10 que está funcionando muito bem.

**Ainda falta conferir**
- **Tarefas do plugin Tasks e tempo livre (#40):** ainda não saíram em nenhuma versão; entram na próxima (beta.16).
  Inclui a conferência com o plugin aberto no Obsidian.
- **X4, só o que não muda no rework:** colunas automáticas (`::: runas-colunas-1` a `4`) na prévia, no PDF e no DOCX/RTF
  aberto no Word e no LibreOffice; “Exportar…” em cada módulo; versão dos jogadores sem segredos; site offline em ZIP
  aberto sem internet. A parte visual da escrita de Livros será refeita pelo rework e conferida de novo.
- **X7, sala hospedada no celular:** funciona na rede local; pela internet (Cloudflare) não abre, porque o túnel não
  existe no Android. Passado ao Codex ([codex-durante-rework.md](tarefas/codex-durante-rework.md), item 1).
- **Restauração da X4 e da X7 (#52):** os quatro itens da seção acima, na beta.16.

## Rework visual — F1 fundações (21/10/2026)

- [ ] Desktop: abrir Início, Notas, Agenda, Wiki, Campanhas, Livros, VTT, Importar e exportar e Configurações; conferir
  que o título da aba acompanha a rota, a migalha usa nomes legíveis e o item atual tem `aria-current`.
- [ ] Navegar apenas pelo teclado: abrir e fechar a paleta (`Ctrl+K`), o menu `Novo`, menus ⋯ e o seletor de abas; conferir
  foco visível de 3 px, setas/Home/End, Escape e retorno do foco ao acionador.
- [ ] Navegar entre duas rotas: conferir que o foco vai para o título da tela nova; ao trocar apenas o conteúdo no mesmo
  espaço, conferir o anúncio da mudança sem retirar o foco do conteúdo.
- [ ] Recolher e reabrir a navegação pelo botão e por `Ctrl+\`; conferir trilho de ícones, rótulos acessíveis e a
  preferência preservada ao recarregar. Repetir nos painéis laterais com botão de recolhimento.
- [ ] Repetir em tema escuro, claro, Floresta e Brasa, em 320 px, tablet e desktop; conferir sem rolagem horizontal,
  controles com alvo de toque de 44 px e texto legível.
- [ ] Em cofre somente leitura, conferir que `Novo` mantém as ações disponíveis e desabilita as que gravam; em cofre
  gravável, conferir que Evento, Artigo, Campanha e Livro abrem os mesmos diálogos dos botões de cada tela.

## Rework visual — F2 acessibilidade (21/10/2026)

- [ ] Configurações › Acessibilidade (ou `Ctrl+K` › “Acessibilidade”): a página rola até a seção e o foco vai para o
  título dela. Mudar cada opção e conferir a prévia ao lado mudando na hora.
- [ ] Espaçamento “Amplo” e “Muito amplo”, largura “Estreita” e “Larga” e fonte Garamond: abrir uma nota e um artigo da
  Wiki (leitura e edição ao vivo). Abrir a prévia de um Livro e conferir que as páginas **não** mudam.
- [ ] Fonte “Legível”: o app inteiro passa para a Atkinson Hyperlegible, inclusive sem internet; a prévia dos Livros
  continua com as fontes do tema do livro.
- [ ] Contraste alto nos temas claro e escuro e nas paletas Órbita, Floresta e Brasa. Com o contraste alto do sistema
  ligado, conferir se o app acompanha com a opção desligada (só funciona onde o sistema informa
  `prefers-contrast: more` ao app; no Linux isso não foi conferido).
- [ ] Sublinhar links, Sem transparências e Foco reforçado (navegar com Tab); Mostrar rótulos junto aos ícones no
  desktop e no celular (a barra do topo cresce e nada passa da tela em 320 px).
- [ ] “Restaurar padrão” da Acessibilidade volta só as opções dela; paleta, tema e barra inferior ficam.
- [ ] Android: Configurações › Aparência › Barra inferior do celular — trocar os atalhos e conferir a barra e o “Mais”.
- [ ] Sala do VTT (jogador e mestre pelo celular): o botão Aparência da sala mostra Aparência e Acessibilidade, sem a
  barra inferior.

## Rework visual — F3a editor compartilhado (22/10/2026)

- [ ] Abrir uma nota, um artigo da Wiki e uma sessão de campanha: uma barra só (voltar, título, modo, Salvo, Painel, ⋯).
  Conferir no menu ⋯ cada ação que antes era ícone: inserir link, imagem e modelo, renomear, favoritar, fixar/cor/ícone,
  arquivar, copiar links, histórico, extrair, mesclar, renomear imagens, exportar e mandar para a lixeira.
- [ ] Selecionar texto no Editar e no Código: a barra aparece sobre a seleção; Negrito, Itálico, Tachado, Destaque, Link e
  Mais funcionam; Alt+F10 entra na barra, setas andam, Esc volta ao texto. Ctrl+B e Ctrl+I também.
- [ ] Digitar `/` no começo de uma linha: o menu mostra Ações, Comandos e os grupos; digitar “tabe” filtra; Enter insere.
  Na Wiki, aparece também a seção Wiki (segredo de jogador, spoiler, tabela rolável…).
- [ ] Ctrl+/ abre a galeria Formatar com o foco na busca; “italico” acha Itálico; com uma palavra selecionada, Negrito a
  envolve e Quebra de página entra depois da linha, **sem apagar a palavra**.
- [ ] Código: frontmatter numa faixa e sem negrito, `%% revisão: … %%` em dourado, barra de status com linha e coluna;
  “Números de linha” liga e desliga e fica lembrado.
- [ ] Ctrl+E e Ctrl+Shift+E trocam o modo; o modo fica lembrado por espaço (Notas em Código, Wiki em Leitura…).
- [ ] Celular/Android: ao tocar no texto, a barra sobre o teclado aparece no lugar da barra inferior; Aa abre a galeria,
  `/` abre o menu de blocos, B/I/link/tarefa funcionam; a barra fica colada no teclado.
- [ ] Livros: o editor não mostra mais a faixa de formatadores; os modos e o menu ⋯ ficam no trilho (a F3b refaz a tela).

## Rework visual — F3b Livros (22/10/2026)

- [ ] Abrir um livro: a navegação do app recolhe para o trilho e volta ao sair. Barra: Livros, Sumário, título, Escrever ·
  Organizar · Prévia, estado e ⋯ do capítulo, Foco, Apoio e ⋯ do livro. Conferir cada item do ⋯ do livro.
- [ ] Sumário: pontos de status, palavras, capítulo atual marcado; “Novo capítulo” cria o capítulo no lugar certo da
  estrutura; “Fora do livro” recolhido, com “Incluir”.
- [ ] Linha do capítulo acima da página; clicar abre Apoio › Capítulo; mudar status e resumo e salvar atualiza o sumário
  sem conflito com o texto em edição.
- [ ] Selecionar um trecho: Comentar insere `%% revisão: … %%` depois dele; Apoio › Revisão lista, “Ir” seleciona e
  “Remover” tira. Citar da Wiki abre as Referências com o trecho; Citar e Transcluir inserem o link.
- [ ] Barra de status: palavras iguais às do sumário, “Modo: Visual/Código” troca o modo, máquina de escrever liga e
  desliga e fica lembrada.
- [ ] Organizar: cartões e lista; arrastar; menu de cada capítulo; Alt+↑/↓ com o capítulo focado (posição anunciada).
- [ ] Prévia: pagina, exporta e imprime como antes; “Fechar prévia” volta a Escrever.
- [ ] Foco: só a página e uma barra discreta; Esc sai.
- [ ] ⋯ do livro › Excluir livro: o diálogo diz quantos capítulos vão para a lixeira e quais ficam (fora da pasta ou usados
  por outro livro); confirmar manda o livro e os capítulos para `.trash` e volta à estante; dá para recuperar pela lixeira.
- [ ] Celular/Android: barra de uma linha; sumário e Apoio abrem por cima, um por vez; escolher capítulo fecha o
  sumário; Organizar e Prévia no fim do sumário; barra de formatação sobre o teclado.

## Rework visual — F4a Notas (22/10/2026)

- [ ] Lista de Notas: “+ Nova nota” e o menu ⋯ (nova pasta, nota do dia, nota aleatória, gráfico, buscar e substituir,
  exportar, lixeira, bloquear com PIN). A ordem fica ao lado da busca e diz a ordem atual.
- [ ] Painel da nota: abas Links, Propriedades, Sumário e Gráfico pelo teclado (setas), com os contadores.
- [ ] Gráfico: botão Lista mostra a tabela (nota, ligações, liga com); abrir pela tabela; a escolha fica lembrada. No
  gráfico local, as notas ligadas aparecem como botões embaixo do desenho.

## Rework visual — F4b Wiki (22/10/2026)

- [ ] Barra da Wiki: trocar de wiki pelo menu; estreitar a janela e conferir que as telas que não cabem vão para “Mais”
  (sem cortar nem rolar); Exportar e Nova wiki no ⋯.
- [ ] Artigo: abas Ficha, Relações, Citado em e Links, com contadores; Mostrar pela sala e mídia na Ficha.
- [ ] Categoria: “Novo …” como ação principal e Exportar no ⋯.
- [ ] Calendário: “+1 dia” ao lado de Hoje; abas Dia, Hoje no mundo, Sincronizar (com dois calendários) e Ajuda.
- [ ] Linha do tempo: Calendários e Filtros abrem e fecham; zoom, Ajustar à tela e Lista (tabela com data, acontecimento,
  trilha e fim); rótulos perto da borda direita aparecem do lado esquerdo do ponto.
- [ ] Relações: a teia enquadra ao abrir; tabela “quem · relação · com quem” com links.
- [ ] Ferramentas: escolher um gerador na lista gera na hora; “Gerar de novo”; guardar como nota.

## Rework visual — F4c Campanhas (22/10/2026)

- [ ] Barra da campanha: trocar de campanha pelo menu; estreitar a janela e conferir “Mais”; Tela do Mestre no fim.
- [ ] Cores das sessões: planejada dourada, jogada verde, cancelada apagada no painel, na lista e na linha do tempo.
- [ ] Sessões: “+ Nova sessão” e o ⋯ com as duas exportações do diário (Markdown e PDF/HTML).
- [ ] Missões no computador: com a janela estreita, a quinta coluna fica cortada com sombra e barra de rolagem à vista;
  arrastar entre colunas grava o status. No celular: seletor de coluna com as contagens e uma coluna por vez.
- [ ] Elenco: o ⋯ de cada NPC e facção abre na Wiki e tira da campanha.
- [ ] Ferramentas: escolher na lista; a escolhida volta ao reabrir.
- [ ] Quadro (campanha e Notas): “continua…” nos cartões cortados; Ajustar altura; escrever num cartão pequeno faz ele
  crescer; Tab passa pelos cartões, setas movem, Shift+setas move mais, Enter edita; o arquivo abre igual no Obsidian.
- [ ] Tela do Mestre: tela inteira com Agora, Elenco e Notas fixadas; iniciativa funciona dali; fixar e desafixar nota;
  Esc fecha e o foco volta. No celular: abas Agora, Elenco e Notas fixadas.
- [ ] Painel no celular: próxima sessão primeiro, estatísticas no fim e recolhidas.

## Rework visual — F4d Agenda (22/10/2026)

- [ ] Cabeçalho: “+ Evento” cria no dia escolhido; o ⋯ abre Enquete de data, Tempo livre, Importar .ics e Exportar .ics.
  Na busca `Ctrl K`, “Tempo livre” e “Exportar .ics” levam à Agenda e abrem o mesmo diálogo.
- [ ] Mês só pelo teclado: Tab entra na grade uma vez; setas, Home/End, PageUp/PageDown (com e sem Shift) movem o dia;
  ao passar do fim do mês, a grade troca de mês e o foco continua no dia. Com o leitor de tela (Orca ou NVDA), cada
  dia é lido com o nome completo, “hoje” e a quantidade de eventos; trocar de mês com ‹ › é anunciado.
- [ ] Mês com o mouse: o título do evento aparece antes da hora; “+N no dia” abre o dia no painel.
- [ ] Painel: Dia, Evento e Tarefas; escolher um evento abre a aba Evento; a aba Dia ou Tarefas volta ao reabrir a Agenda.
- [ ] Evento de sessão: “Abrir sessão” leva à nota; o estado da sessão aparece; Pular esta data (evento repetido) e
  Mandar para a lixeira estão no ⋯.
- [ ] Semana e Dia: Tab numa coluna, setas escolhem a hora, Enter abre o diálogo com a hora preenchida; com quatro
  eventos ao mesmo tempo aparece “+N”, que leva ao dia.
- [ ] Lista: “Mostrar mais 60 dias” estende a lista.
- [ ] Diálogo: salvar sem título mostra o aviso e põe o foco no título; editar um evento com local e sessão abre
  Detalhes e Sessão; a nota gravada abre igual no Obsidian (Full Calendar).
- [ ] Lembretes: no Android sem a permissão de alarmes exatos, o aviso aparece no painel e o botão leva à permissão.
- [ ] Celular: o calendário vem primeiro; tocar num dia sobe o painel; Esc ou o botão do painel fecha; o botão
  flutuante cria um evento. Sem rolagem para os lados em 320 px.

## Rework visual — F4e personalização (ADR 0027, 22/10/2026)

- [ ] Campanha › menu do nome › Personalizar: escolher Brasa e a coroa; a barra, as abas, os botões e o “Nova
  sessão” mudam de cor; o cartão em Campanhas mostra a capa e o brasão. Abrir a nota no Obsidian com o snippet ligado:
  `cor: brasa`, `icone: coroa` e `cssclasses: [runas-cor-brasa]`; título e links no tom.
- [ ] Cor livre muito clara (ex.: `#ffff00`): o diálogo avisa que ajustou; no tema claro o texto continua legível.
- [ ] Agenda: os eventos de sessão da campanha ficam na cor dela (mesmo os antigos, com `cor: red`).
- [ ] Wiki › categoria › ⋯ › Personalizar categoria: cria `Personagens/Personagens.md` com `tipo: categoria`; a nota
  não aparece entre os artigos; cartões sem imagem mostram o ícone na cor; a descrição aparece no topo e no cartão da
  página inicial; o artigo mostra a etiqueta da categoria na Ficha.
- [ ] Elenco: personagens, NPCs e facções com retrato ou símbolo do artigo; sem imagem, o ícone da categoria.
- [ ] Sessão com `capa`: a imagem aparece na lista de sessões.
- [ ] Configurações › Aparência › desligar “Usar a cor de cada campanha e categoria”: tudo volta à paleta. Ligar o
  contraste alto: idem.

## Rework visual — F5 Início, Configurações, Transferir e VTT (22/10/2026)

- [ ] Início, Painel da campanha e Tela do Mestre mostram a mesma próxima sessão (com evento na Agenda e sem nota de
  sessão; com nota de sessão e sem evento; com os dois ligados).
- [ ] Campanha com uma sessão `status: planejada` de data passada: aviso no painel e na Tela do Mestre; “Marcar como
  realizada” grava `status: realizada` na nota (conferir no Obsidian); “Remarcar” abre a sessão.
- [ ] Início em 1366 px: destaque, espaços, Retome o fio, No horizonte e Centelhas na primeira tela. Em 375 px, sem
  rolagem para os lados.
- [ ] Centelhas: capturar duas ideias cria `Notas/Entrada.md`; riscar uma, “Limpar as usadas” e “Desfazer”; abrir a
  nota no Obsidian (riscadas aparecem riscadas e não entram nas consultas do Tasks).
- [ ] Configurações no computador: o índice leva a cada seção; Ctrl K › “Acessibilidade” cai na seção. No celular:
  `/config` lista as seções; cada uma abre sozinha, com “Configurações” para voltar.
- [ ] Importar e exportar: os três cartões; o resumo muda com a seleção; Gerar documento mostra a prévia; Pasta para o
  Obsidian gera ZIP Markdown; o botão principal fica no canto (no celular, na largura toda).
- [ ] VTT: cartões maiores, Mesas recentes com uma mesa aberta antes; ⋯ › Importar mesa abre a importação.

## Correções do Codex durante o rework (21/10/2026)

- [ ] Android: abrir uma mesa hospedada no celular e conferir o aviso de que o link público pela internet ainda não está
  disponível; na mesma rede Wi-Fi ou no ponto de acesso, o link local e o QR continuam funcionando. Hospedar no desktop
  e conferir o link público pela Cloudflare.
- [ ] Livros: importar um Homebrewery com bloco cercado de várias linhas dentro de `{{note …}}` e de
  `<div class="note">`; conferir que todas as linhas, inclusive a cerca de fechamento, permanecem dentro da caixa.
- [ ] PIN: executar o teste do app repetidamente; conferir que o hash é validado pelo formato e pelo PIN, sem depender
  de uma sequência específica aparecer no hash aleatório.

## Wayland e fechamento da mesa X6 (22/10/2026)

- [ ] Linux Wayland: executar `runas-codex --captura` com o app fechado e aberto; conferir que a nota nova aparece. Em
  GNOME, criar e remover o atalho do sistema em Configurações quando o botão do rework estiver disponível; no KDE,
  conferir a ação “Captura rápida” do arquivo `.desktop`.
- [ ] VTT: importar um `.uvtt`/`.dd2vtt` com mapa embutido e paredes, uma cena JSON do Foundry com porta, token e luz,
  e uma lista de tokens em lote. Conferir que imagens externas geram aviso e não são baixadas.
- [ ] VTT: criar um pino com caminho `Wikis/...md`, abrir pelo duplo clique e conferir que o caminho não aparece na
  projeção dos jogadores. Com a sala aberta, mover um token e conferir que o mapa permanece e só o objeto alterado é
  atualizado na Vista dos Jogadores.

## C9 sem interface (22/10/2026)

- [ ] Rodar os dois `--smoke` do Electron e conferir no JSON `network.violations: []`; simular uma URL externa fora da
  sala/atualização e conferir que o smoke falha.
- [ ] Conferir os artefatos do workflow Release: `.deb`, AppImage, NSIS e APK assinado; abrir, criar atalho e desinstalar
  cada um conforme o sistema, preservando o perfil do app.
- [ ] Repetir o benchmark de 10 mil notas no aparelho Android e registrar índice, busca, gráfico, heap e tempo de abertura.
  A referência local do desktop está na [ADR 0030](adr/0030-c9-desempenho-rede-instaladores.md).

## C7 — backups agendados e conflitos de sincronização (22/10/2026)

- [ ] Em Configurações, definir um horário e retenção, fechar/reabrir o app e conferir que a agenda permanece; esperar o
  disparo ou avançar o relógio do sistema e conferir um ZIP novo fora do cofre.
- [ ] Criar uma cópia `Nota.sync-conflict-YYYYMMDD-HHMMSS-dispositivo.md` pelo Syncthing e uma `Nota (conflicted copy).md`
  pelo Obsidian Sync; conferir o aviso, a indicação do original e que nenhuma versão é sobrescrita.
- [ ] Arquivar uma cópia pelo aviso, conferir que ela foi para `.trash` e que o original continua abrindo; testar também
  a restauração da lixeira. A implementação está descrita na [ADR 0031](adr/0031-c7-backups-conflitos-sync.md).

## Tasks — pendências da matriz (22/10/2026)

- [ ] Na paleta, usar cada comando “Definir tarefa: …” sobre uma linha com tarefa e conferir que o estado, as datas e a
  recorrência seguem as regras do Tasks.
- [ ] Em uma consulta, usar `path includes {{query.file.outlinks}}`, `{{query.file.outlinksInBody}}` e
  `{{query.file.outlinksInProperties}}`; conferir os mesmos resultados no Obsidian com Tasks 8.6.0.
- [ ] Abrir “Busca rápida de tarefas”, digitar parte da descrição e conferir que a nota de origem abre no ponto certo.

## Versão 0.1.0-beta.16 (23/10/2026)

Entram o rework inteiro (F1–F5, PRs #54–#65), os itens do Codex (#58 e #62) e as correções da revisão. As listas de
cada fase e do Codex estão acima; nesta versão, conferir também:

- [ ] Atualizar da beta.15 para a beta.16 pelo botão “Verificar atualizações” (desktop e Android) e conferir que o cofre,
  o PIN e as preferências continuam.
- [ ] Com o PIN das Notas bloqueado: o Início não mostra as Centelhas nem notas de Notas/ em “Retome o fio”; a captura
  continua gravando; a Busca rápida de tarefas não mostra tarefas das Notas.
- [ ] Agenda: editar um evento com local, apagar o local e conferir que a seção Detalhes continua aberta.
- [ ] Instalar de novo o snippet `runas-codex.css` e conferir no Obsidian a cor de uma campanha personalizada.


## R5 — mestre pelo navegador com a sala no Android (25/10/2026)

- [ ] Celular hospedando e tablet/notebook na mesma rede: revelar o link/QR do mestre no painel Sala; confirmar o aviso
  de controle da mesa. QR/link permanecem escondidos até pedir. Conferir também teclado, temas e largura de 320 px
  quando o Claude Code concluir os textos/estados do painel.
- [ ] Pelo navegador, criar token, trocar a cena transmitida e tocar/parar áudio; com um jogador conectado, conferir
  projeção, visão, segredos e persistência ao reabrir a mesa no celular.
- [ ] Um segundo mestre é recusado. “Desconectar” encerra o primeiro; “Trocar chave” também invalida o link anterior.
- [ ] Repetir com cofre em pasta direta e no SAF: importar imagem e ler mapa/áudio com Range sem revelar assets privados
  ao jogador.
- [ ] Apagar a tela do celular e continuar comandando pelo tablet; confirmar o serviço ativo e repetir por alguns minutos
  com a política de bateria do aparelho. A notificação nunca mostra a chave do mestre.
- [ ] Desligar/religar sala, trocar mesa/cofre ou retirar permissão de gravação: navegador anterior perde acesso; a sala
  nova tem outra chave. Conferir fechar o navegador e entrar novamente sem precisar “Desconectar”.

O núcleo e o transporte reutilizam o contrato do mestre remoto do desktop. A interface existente reconhece
`VttApi.master`; ajustes de texto e revisão visual do painel pertencem ao Claude Code (PR #67). Não há mudança na
`RemoteVttApi`, na CSP, no túnel público nem nos testes do mestre remoto desktop.

- [ ] Mestre remoto no desktop: confirmar que cenas existentes carregam tokens, paredes e demais objetos da cena. A R5
  também corrige o argumento opcional da consulta remota, mantendo a diferença entre “todos” e “sem pai”.

## R5 — painel de controle por outro aparelho (25/10/2026)

A interface foi concluída pelo Codex por solicitação explícita do dono, substituindo o encaminhamento ao Claude Code
registrado acima. O mesmo bloco atende Android e desktop com instruções específicas para cada hospedeiro.

- [ ] Em celular/tablet físicos, nos temas claro e escuro: abrir Sala, conferir “Controlar por outro aparelho”, revelar
  e esconder link/QR. A mesa continua no celular que hospeda; somente um aparelho controla pelo navegador.
- [ ] Com TalkBack e leitor de tela desktop: conferir título do bloco, rótulo do link, estado expandido, avisos de
  conexão, erro e sucesso. Com teclado, conferir Tab, Shift+Tab, Enter e Espaço e o retorno de foco após as ações.
- [ ] Copiar o link; se o sistema negar a cópia, conferir a mensagem e a seleção do campo para copiar manualmente.
- [ ] Com mestre conectado, usar “Trocar chave” e “Desconectar” no painel: o navegador perde acesso, o estado se
  atualiza e o foco retorna ao controle de revelar. Trocar chave deixa o novo link/QR ocultos até pedir novamente.
- [ ] Repetir no desktop, com link local e público, conferindo a indicação de gravação no computador.

Verificação local automatizada do componente: teclado/foco, estados de falha/recuperação, cópia, troca de chave e
desconexão; reflow e alvos de 44 px em 320, 768 e 1280 px nos dois temas. A árvore de acessibilidade foi inspecionada;
leitura falada em TalkBack/leitor desktop e uso físico permanecem não verificados. O teste da sala no emulador também
exercita os controles reais do painel e registra `android-controle-mestre.png`.

- [ ] Na própria mesa, o aviso global de sala aberta não cobre o painel. Ao navegar para outra tela, o aviso volta a
  oferecer “Voltar à mesa” e “Encerrar sala”. A Carta X permanece visível também dentro da mesa até confirmar a pausa.

## Livros L1 — prévia ao lado do texto (25/10/2026)

Decisões na [ADR 0033](adr/0033-livro-impresso.md). Capturas em `docs/imagens/livros-l1/`.

- [ ] Abrir um livro em Escrever e clicar em **Prévia ao lado** na barra: as páginas aparecem à direita, com a página do
  capítulo aberto contornada e o título mais próximo do cursor marcado.
- [ ] Digitar no capítulo (inclusive um título novo `## …`): cerca de meio segundo depois a página se refaz com o texto
  ainda não gravado, sem piscar, e a marca acompanha o cursor.
- [ ] Trocar de capítulo pelo sumário: a prévia vai até a página onde ele começa. Com **Seguir o texto** desligado, ela
  fica parada onde você deixou.
- [ ] Clicar num título dentro da página (inclusive o título de outro capítulo): o editor abre aquele capítulo com o
  cursor no título.
- [ ] Testar **Largura**, **Página** e **Duas** (livro aberto: a capa sozinha à direita) e arrastar a borda do painel.
- [ ] No ⋯ da prévia: “Ir para a página do cursor”, “Mostrar só este capítulo” (a numeração recomeça em 1) e “Diagramar e
  exportar…”.
- [ ] Abaixo de 1400 px de largura, abrir o Apoio fecha a prévia e vice-versa; abaixo de 1200 px, abrir a prévia recolhe
  o sumário.
- [ ] O modo que era “Prévia” agora se chama **Diagramar**; exportar PDF, EPUB e DOCX e imprimir com Ctrl+P continuam
  iguais.
- [ ] No celular: o ícone de livro na barra (“Ver a página”) abre a página do cursor em tela cheia; as setas trocam de
  página; **Texto** (ou Esc, com teclado) volta ao mesmo ponto. Conferir também o que o botão Voltar do Android faz com a página aberta. **Foco** agora fica no menu ⋯ do livro.
- [ ] Em 320 px, a barra do livro cabe inteira (antes o último ⋯ ficava fora da tela).

## Livros L2 — limpeza do PDF (25/10/2026)

Decisões na [ADR 0033](adr/0033-livro-impresso.md).

- [ ] Exportar o PDF do Valknut: sem as caixas tracejadas em volta dos blocos `::: runas-colunas-2`; o arquivo bem menor
  que os 17 MB de antes (Imagens: Tela); `pdffonts` (ou as propriedades do PDF) mostra a EB Garamond como TrueType.
- [ ] Cada capítulo com um título só: “Magias” e “Equipamentos” não se repetem; a Introdução mostra “Introdução” e
  depois “Início”; as seções (Magias de Fogo…) com o próprio título, sem sobretítulo nem régua.
- [ ] Nas colunas: “Manter Magia” não se parte em 4 linhas + 1; o nome de uma magia (**NOME**\ + custo) não fica sozinho
  no pé da coluna; a imagem que vem logo depois do texto fica junto dele.
- [ ] Diagramar › Imagens: Tela, Gráfica e Original; a prévia avisa quando uma imagem fica abaixo de 200 ppi impressa.
- [ ] Abrir o PDF num leitor com painel de marcadores (Okular, Acrobat): os títulos aparecem como marcadores, o título do
  documento é o do livro e o PDF é marcado para leitor de tela.
- [ ] Imprimir (Ctrl+P): sai sem o fundo creme; com “Fundo do papel na impressão” ligado, sai com ele. O PDF exportado
  continua com o fundo.

## Livros L3 — Estilo do livro e modelos (26/10/2026)

Decisões na [ADR 0033](adr/0033-livro-impresso.md).

- [ ] Diagramar: o painel **Estilo do livro** à esquerda. Trocar entre Manual de RPG, Grimório (com moldura), Romance,
  Moderno e Leitura fácil: a prévia muda na hora e, um segundo depois, o livro ganha `modelo:` (o `tema:` antigo some).
- [ ] Livros antigos com `tema: pergaminho`, `moderno` ou `minimalista` abrem com o modelo equivalente marcado.
- [ ] Tipografia: trocar as fontes de títulos e de texto, o tamanho (− e +), a entrelinha e o alinhamento; voltar ao
  valor do modelo apaga a propriedade do livro. **Desfazer** volta o último ajuste.
- [ ] Cores: papel, texto e destaque; “Fundo também na impressão”; textura e marca d’água.
- [ ] Página: tamanho, colunas do livro (1, 2, 3), capítulos em página nova, margem, sangria e marcas de corte. Um
  capítulo com `colunas: 1` nas propriedades sai em uma coluna; o que usa `::: runas-colunas-2` continua como está.
- [ ] **Salvar como modelo…**: cria `Livros/Modelos/<nome>.md` (abra no Obsidian: propriedades comuns) e o livro passa a
  usá-lo; outro livro pode escolher o mesmo modelo no painel; mudar uma propriedade da nota de modelo muda os dois.
- [ ] Fonte do cofre: pôr um `.ttf` ou `.otf` em `Anexos/Fontes`; ele aparece em “Do cofre” nas listas de fontes e o PDF
  sai com ela.
- [ ] Exportar EPUB e HTML com o Grimório e com o Moderno: cores e fontes iguais às da prévia; DOCX com a cor de destaque.
- [ ] Celular: Diagramar aparece (antes ficava em branco); o botão **Estilo do livro** abre o painel acima das páginas;
  sem rolagem para os lados em 320 px.

## Livros L4 — capa, sumário, aberturas e cabeçalhos (26/10/2026)

Decisões na [ADR 0033](adr/0033-livro-impresso.md).

- [ ] Estilo do livro › Partes do livro › Capa: Clássica (moldura), Ilustrada (imagem grande) e Faixa (faixa colorida de
  borda a borda). Em “Editar capa e créditos…”: título na capa e edição separados do nome da nota; a imagem escolhida
  nas miniaturas do cofre ou “Do computador…” (vira anexo perto do livro).
- [ ] “Sumário com o número das páginas”: o sumário sai depois da capa e dos créditos, com “Cap. 1”, as seções recuadas e
  o número certo de cada página; no PDF exportado, clicar numa linha leva à página.
- [ ] Capítulos: abertura Simples (“Capítulo 1” sobre o título), Faixa e Página inteira (com a imagem de `imagem:` do
  capítulo, se houver); numeração em algarismos, romanos ou sem número; letra capitular (não aparece num primeiro
  parágrafo de uma linha).
- [ ] Cabeçalho e rodapé: o cabeçalho não aparece na capa, no sumário nem na página que abre o capítulo; trocar para “Só
  o capítulo” e “Nenhum”; número da página no centro, na margem externa ou sem número.
- [ ] Páginas espelhadas: margem de dentro maior, número do lado de fora, capítulo sempre começando numa página da
  direita (com uma página em branco antes, quando precisa). Imprimir em frente e verso numa impressora de verdade.

## Livros L5 — fichas de RPG e hifenização (26/10/2026)

Decisões na [ADR 0033](adr/0033-livro-impresso.md).

- [ ] Escrever uma magia como ficha (`> [!magia] Nome`, `> **Custo:** 1 PV · **Tipo:** Feitiço · **Alcance:** Área`, o
  texto, `> **Ampliação:** …`, a imagem): no livro sai o nome em versalete, “1 PV · Feitiço · Área” em itálico, Ampliação
  e Truque marcados e a imagem dentro da ficha, sem nenhuma régua. Um `**Material:**` vazio não aparece.
- [ ] As outras fichas: `[!runa]`, `[!habilidade]`, `[!item]`, `[!criatura]` (atributos em linha), `[!raca]`,
  `[!classe]`, `[!efeito]`. No Obsidian (com o snippet ligado), cada uma é um callout com cor e ícone próprios.
- [ ] Estilo do livro › Fichas: Tipográfica, Fundo suave e Faixa no nome.
- [ ] Caixas sem réguas no livro: descritivo (itálico, fundo suave), barra lateral, nota/dica/aviso/perigo (só o título
  pequeno colorido), segredo.
- [ ] Em Escrever, selecionar uma magia no formato antigo (nome em negrito, custo embaixo, o texto) › “Converter em ficha”
  na barra da seleção.
- [ ] Diagramar › “Versão dos jogadores (sem segredos)”: os segredos somem da prévia e do PDF; o arquivo sai com
  “(jogadores)” no nome.
- [ ] Hifenização: com o texto justificado, as palavras longas se partem no fim da linha com hífen (sem buracos grandes
  nas colunas); “Hifenizar em português” desligado volta ao de antes. Conferir se copiar texto do PDF não traz hífens
  estranhos.

## Versão 0.1.0-beta.17 (26/10/2026)

Entram os Livros L1–L5 (PRs #69, #71, #72, #73 e #74) e a R5 (PRs #67, #68 e #70). As listas de cada fase estão acima;
nesta versão, conferir também:

- [ ] Atualizar da beta.16 para a beta.17 pelo botão “Verificar atualizações” (desktop e Android) e conferir que o cofre,
  o PIN e as preferências continuam.
- [ ] Abrir no Diagramar um livro antigo (com `tema:`): ele abre com o modelo equivalente; trocar de modelo apaga o
  `tema:` do livro.
- [ ] Exportar o PDF do Valknut com o modelo e as fichas: comparar com o PDF de 25/10 (tamanho, fontes, títulos).
- [ ] Instalar de novo o snippet `runas-codex.css` (Configurações › Obsidian e anexos) e conferir uma ficha `[!magia]`
  no Obsidian.

## Livros — imagens dentro das fichas (26/10/2026)

- [ ] No Valknut, as magias de Fogo e de Água mostram a arte dentro da ficha no Diagramar e no PDF (a imagem continua
  fora do `>` na nota, como no Obsidian).
- [ ] Converter em ficha uma magia de Vida (nome em negrito, “Custo: 1 PV · Feitiço”, “Requisito: …”, texto e imagem):
  a imagem vai junto para dentro do `>` e não aparece “Custo: Custo:”.

## Agenda — tarefas no painel (26/10/2026)

- [ ] Agenda › painel › Tarefas: o texto da tarefa usa a largura toda; o prazo (📅) e a nota de origem ficam numa linha
  embaixo, com reticências quando o nome da nota é longo. Clicar no nome da nota ainda abre a nota.
- [ ] Numa consulta ```tasks numa nota larga, as tarefas continuam numa linha só (texto, prazo e nota).

## Versão 0.1.0-beta.18 (26/10/2026)

Entram as imagens dentro das fichas e as tarefas no painel da Agenda (listas acima); conferir também:

- [ ] Atualizar da beta.17 para a beta.18 pelo botão “Verificar atualizações” (desktop e Android).
- [ ] Exportar o PDF do Valknut e conferir as artes das magias de Fogo e de Água dentro das fichas.

## Versão 0.1.0-beta.19 (26/10/2026)

- [ ] Atualizar da beta.18 para a beta.19 pelo botão “Verificar atualizações” (desktop e Android).
- [ ] Numa ficha com “Requisito …” e uma linha `>` vazia antes do texto, conferir o espaço entre os campos e o texto, no
  Diagramar e no PDF.
- [ ] Livros: o Valknut aparece com a imagem de capa na lista; um livro sem `capa:` continua com a capa desenhada.
- [ ] Configurações no computador: cada item do índice mostra só a sua seção; Ctrl K › “Acessibilidade” abre a seção
  certa.

## Versão 0.1.0-beta.20 (28/10/2026)

- [ ] Atualizar da beta.19 para a beta.20 pelo botão “Verificar atualizações” no desktop e no Android.
- [ ] Abrir um artigo da Wiki e confirmar que o botão Painel alterna a lateral no desktop e no celular.
- [ ] Na lateral de um personagem ou organização, abrir Relações e adicionar um vínculo; conferir o contador e a visualização.
- [ ] Criar ou abrir uma categoria com título muito longo e conferir que o contador permanece dentro do cartão.
