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
