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

---

## Limitações conhecidas (não precisam de teste agora)

- **Android sem cofre real:** o acesso ao cofre no Android é um spike da etapa 2 que ficou para depois; no APK, Notas
  e Agenda usam o cofre de exemplo em memória (nada é salvo ao fechar o app).
- **Lembretes no desktop só com o app aberto** (pode estar minimizado). Bandeja e iniciar com o sistema ficam para
  depois.
- Ainda sem: timelapse do gráfico, prévia de link ao passar o mouse, comandos `/`, abas e painéis divididos,
  enquete de data pela sala, importar/exportar mesas.
- Wiki, Campanhas e Livros continuam com dados de exemplo até as etapas 6, 7 e 8.
