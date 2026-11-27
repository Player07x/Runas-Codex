# Tarefa guardada: telemetria, se for reaberta

> **Não é uma tarefa ativa.** Em 27/11/2026 o João decidiu **não ter telemetria** ([ADR 0039](../adr/0039-sem-telemetria.md)).
> Este documento guarda o que foi levantado, para virar tarefa sem refazer a pesquisa se o assunto voltar.
> Antes de começar, o dono precisa aprovar a reabertura e uma ADR nova precisa substituir a 0039.

## Gatilhos para reabrir

- Os downloads de uma versão passam de algumas centenas, **ou**
- chegam relatos de erro que o dono não consegue reproduzir, mesmo com o “Enviar relatório”.

## Dados levantados em 26/11/2026

Downloads de arquivos dos Releases (API do GitHub, inclui os downloads do botão “Verificar atualizações” e os testes do
dono). Repositório público, 1 estrela.

| Versão | Publicada | Downloads | .deb | .exe | APK |
|---|---|---:|---:|---:|---:|
| 1.8.1 | 26/11 | 10 | 3 | 1 | 2 |
| 1.8.0 | 24/11 | 17 | 6 | 3 | 2 |
| 1.7.4 | 20/11 | 22 | 13 | 2 | 3 |
| 1.4.0 | 14/11 | 69 | 58 | 4 | 2 |
| 1.0.0 a 1.8.1 (14 versões) | 01–26/11 | 291 | | | |

Para medir de novo:

```bash
gh api repos/Player07x/Runas-Codex/releases --paginate -q '.[] | [.tag_name, .published_at[0:10], ([.assets[].download_count]|add // 0)] | @tsv'
```

## Prós e contras apresentados

**A favor:** saber quantas pessoas usam e em qual versão; ver erros que ninguém relata; saber quais telas são usadas;
saber sistema e tamanho de tela.

**Contra:** um servidor para receber os dados (hospedagem, manutenção, segurança, para sempre); obrigações da LGPD
(base legal, aviso, consentimento, direito de apagar); quebra a promessa “100% offline, sem conta e sem nuvem”; abre a
CSP e o bloqueio de rede para um domínio externo (regra 6); com poucas pessoas usando, os números dizem pouco.

**Fontes:** LGPD, Lei nº 13.709/2018 — consentimento como base legal (art. 7º, I), consentimento livre, informado e
para finalidade determinada (art. 8º), direitos do titular, inclusive acesso e eliminação (art. 18).

## O que teria de mudar no projeto

- `AGENTS.md`, regra 6 (rede só na sala e nas atualizações).
- `app/csp.ts` (sem domínios externos hoje) e `desktop/src/main/network-guard.ts` com `desktop/tests/network-guard.test.ts`.
- `docs/01-checklist-recursos.md`: “100% offline” (linha 19) e “Zero telemetria” (item obrigatório).
- ADR 0017 e 0038 (a única ida automática à internet é a consulta de versões).
- `app/src/data/ajuda/privacidade.md` e Configurações › Privacidade e atualizações.

## Desenho mínimo aceitável (se for feita)

- **Desligada por padrão**, ligada só com consentimento explícito numa tela que diz exatamente o que vai.
- **Coleta:** versão, sistema, tamanho de tela, contagem de uso por tela (sem horários finos) e erros com a pilha
  já sem caminhos (reusar `sanitizeReportText` de `app/src/core/error-report.ts`).
- **Nunca coleta:** conteúdo, nomes ou caminhos de notas e arquivos, nome do cofre, IP guardado, identificador fixo do
  aparelho (usar um identificador aleatório que a pessoa pode trocar).
- **Retenção:** prazo curto e escrito (ex.: 90 dias), e um botão para apagar o que já foi enviado.
- **Envio:** pelo processo principal (Electron) e por um plugin no Android, como a consulta de versões; a CSP da
  interface continua sem domínio externo.
- **Servidor:** pesquisar na hora, com preço e fonte de cada opção (ex.: um endpoint próprio simples, ou serviços de
  analytics com opção de hospedagem própria). Não escolher sem a comparação com dados.

## Critérios de aceite

- ADR nova aprovada pelo dono, substituindo a 0039.
- Nada é enviado sem o consentimento; desligar apaga o que está pendente.
- Teste que garante que, desligada, nenhuma requisição sai (estender o `network-guard`).
- Página de privacidade e Ajuda atualizadas; `docs/04-testes-pendentes.md` com o que conferir.
