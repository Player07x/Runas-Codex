# ADR 0039 — Sem telemetria; “Enviar relatório” no lugar

- **Status:** aceita (2026-11-27)
- **Confirma:** a regra 6 do `AGENTS.md` e o item “Zero telemetria” de `docs/01-checklist-recursos.md`.
- **Guarda:** a análise completa, para virar tarefa se o assunto voltar, em
  [`docs/tarefas/telemetria-se-reaberta.md`](../tarefas/telemetria-se-reaberta.md).

## Contexto

Em 26/11/2026 o João reabriu a discussão sobre telemetria (coletar uso e erros automaticamente). O app nunca teve
telemetria: o que existia era texto dizendo isso (Configurações, Ajuda) e um selo “Offline · cofre local” no menu. Os
prós e contras foram apresentados no [plano da 1.9](https://claude.ai/artifact/AbZxk8dLP6aiFLrKzCC2mo); a decisão dele
foi **remover**, guardar os dados para uma tarefa futura e ter um botão para enviar relatório.

## Decisão

- **Sem telemetria.** Nenhum dado de uso, erro ou aparelho sai sozinho do app. A regra 6 do `AGENTS.md` continua: rede
  só na sala do VTT e na consulta de versões (ADR 0017 e 0038).
- **Sem menções na interface.** Saem a linha “Telemetria · desligada sempre” de Configurações, as frases “sem
  telemetria” da Ajuda e o selo “Offline · cofre local” (o app é sempre local; o selo não informava nada). Os avisos de
  rede da sala do VTT ficam, porque ali a rede existe.
- **Enviar relatório** (Ajuda, Configurações › Privacidade e atualizações e o aviso que aparece quando um erro
  acontece): monta no aparelho um texto com a versão, o sistema, o tamanho da tela, a tela aberta e os últimos 20 erros
  da sessão (só na memória). Caminhos viram `<cofre>`, `~` e `<armazenamento>`; conteúdo de notas nunca entra. A pessoa
  edita tudo e escolhe:
  - **Enviar pelo GitHub:** um link comum (`<a target="_blank">`) para
    `github.com/Player07x/Runas-Codex/issues/new?title=…&body=…`, que abre no navegador do sistema (o Electron manda
    `https://` para o `shell.openExternal`). Quem envia é a pessoa, no GitHub; o app não faz requisição nenhuma, e a
    CSP não muda. Corpo cortado em ~7,5 mil caracteres, com aviso.
  - **Copiar** e **Salvar como arquivo**, para quem não tem conta no GitHub.
- O bloqueio de rede (`network-guard`) e o teste dele continuam; o exemplo `/telemetry` do teste virou um endereço neutro.

## Consequências

- Não sabemos quantas pessoas usam nem quais telas: a contagem de downloads dos Releases do GitHub responde ao “quantos
  baixam e qual versão”, sem código no app.
- Erros só chegam se a pessoa mandar. O aviso de erro com o atalho para o relatório tenta compensar.
- Reabrir exige uma ADR nova que substitua esta e a tarefa guardada.
