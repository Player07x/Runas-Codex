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

## Limitações conhecidas (não precisam de teste agora)

- **Android sem cofre real:** o acesso ao cofre no Android é um spike da etapa 2 que ficou para depois; no APK, Notas
  e Agenda usam o cofre de exemplo em memória (nada é salvo ao fechar o app).
- **Lembretes no desktop só com o app aberto** (pode estar minimizado). Bandeja e iniciar com o sistema ficam para
  depois.
- Ainda sem: timelapse do gráfico, prévia de link ao passar o mouse, comandos `/`, abas e painéis divididos,
  enquete de data pela sala, importar/exportar mesas.
- Campanhas: pacote de campanha (exportar/importar), tesouro, diário dos jogadores e avaliação pela sala ficam para depois (ADR 0011).
