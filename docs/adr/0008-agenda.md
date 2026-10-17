# ADR 0008 — Agenda: eventos como notas do Full Calendar, lembretes por plataforma

- **Status:** aceita (2026-10-14)

## Contexto
Etapa 5 (docs/02, seção 8): visões, eventos, recorrência, lembretes, `.ics` e ligação com sessões. Pronto quando um
lembrete dispara no Android e no desktop. O plano já fixava os eventos como notas no formato do plugin Full Calendar
(seção 4) e o `ical.js` para recorrência e `.ics` (seção 2).

## Decisão
**Cada evento é uma nota em `Agenda/`** no formato do **Full Calendar** (calendário local apontando para essa pasta):
`title`, `allDay`, `startTime`/`endTime` e `type` — `single` (`date`, `endDate`), `recurring` (`daysOfWeek` com
`U M T W R F S`, `startRecur`, `endRecur`) ou `rrule` (`startDate`, `rrule`, `skipDates`). Com o plugin ligado, o
Obsidian mostra os mesmos eventos. O que o Full Calendar não tem vai em chaves próprias, que ele ignora: `local`,
`categoria`, `cor`, `lembrete` (minutos antes; um número ou uma lista), `sessao` (`"[[nota da sessão]]"`) e
`contagem` (contagem regressiva na tela inicial). O texto da nota guarda anotações e a checklist de preparação.

Datas e horas são gravadas entre aspas (`date: "2026-10-17"`, `startTime: "19:30"`): o YAML 1.1 leria `19:30` como
número em base 60. Ao editar, só as chaves da agenda mudam; as outras ficam como estão (`core/properties.ts`).

**Núcleo em TypeScript puro** (`core/agenda.ts`, testado): ocorrências num intervalo (semanal, RRULE pelo `ical.js`,
eventos de vários dias e que passam da meia-noite, datas puladas), lembretes dos próximos dias, checklist, tarefas com
prazo no formato do plugin **Tasks** (`- [ ] texto 📅 2026-10-17`) e `.ics` nos dois sentidos (fusos do arquivo,
`EXDATE`, `VALARM`). Pular uma data de um evento semanal o converte para a regra RRULE equivalente, porque o Full
Calendar só aceita `skipDates` em `rrule`.

**Lembretes por plataforma** (`Platform.scheduleReminders`), sempre a lista dos próximos 14 dias, refeita quando as
notas de `Agenda/` mudam:
- **Desktop:** o processo principal agenda e mostra a notificação do sistema (funciona com a janela minimizada);
  clicar abre a nota do evento. Com o app fechado não há lembrete — bandeja e "iniciar com o sistema" ficam para
  depois.
- **Android:** notificações locais do sistema (`@capacitor/local-notifications`), que disparam com o app fechado,
  com `allowWhileIdle`, ícone monocromático da runa e as permissões de notificação e de alarme exato
  (`USE_EXACT_ALARM`; antes do Android 13, `SCHEDULE_EXACT_ALARM`).
- **Navegador:** só com a aba aberta, pela Notification API.

**Sessões:** o evento aponta para a nota da sessão (`sessao`), e criar o evento pode criar a nota da sessão em
`Campanhas/<campanha>/Sessões/` com `evento: "[[…]]"` de volta. A tela inicial mostra a próxima sessão (evento com
`contagem`, categoria Sessão ou nota de sessão) com contagem regressiva.

## Consequências
- O `--smoke --write` cria um evento pela tela, confere a nota gravada e o agendamento no processo principal.
- **No Android ainda não há cofre real** (o spike de acesso ao cofre da etapa 2 ficou para depois): lá a agenda usa o
  cofre de exemplo em memória. Os lembretes agendados continuam no sistema, mas eventos criados somem ao fechar o app.
- Ficam para depois: enquete de data pela sala, "criar uma sessão cria o evento" pelo lado de Campanhas (etapa 7),
  bandeja do desktop e widget do Android.

## C6b — enquete e bandeja desktop (17/10/2026)

A Agenda abre uma enquete de data pela sala existente do VTT, com uma resposta por assento e resultado gravável em
nota. A sala não é aberta automaticamente. No Electron, a bandeja é opcional por aparelho: fechar a janela a
esconde enquanto ligada; o menu Sair encerra. Lembretes continuam no processo principal. Inicialização automática
é C9; widget e servidor Android permanecem C8/X7, fora desta execução por pedido do dono.
