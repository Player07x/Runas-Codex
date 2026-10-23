# Tarefas abertas e responsáveis — 22/10/2026

Este inventário cruza a fila e a tabela de situação de [`README.md`](README.md), o handoff do rework
([`codex-durante-rework.md`](codex-durante-rework.md)) e as conferências manuais de
[`docs/04-testes-pendentes.md`](../04-testes-pendentes.md). “Aberta” inclui implementação local sem publicação,
PR em revisão, dependência de outra frente ou conferência manual ainda não feita.

## Codex

| Tarefa | Situação aberta | Próximo responsável |
|---|---|---|
| X3 — VTT no toque | PR #23 em revisão | Dono/revisores; Codex corrige o que for apontado |
| W1 — página de categoria da Wiki | Implementada na branch `wiki/pagina-categoria`, publicação integrada pendente | Codex prepara a publicação; dono mescla |
| X5 — fechamento dos Livros | Implementada e validada localmente; publicação/mesclagem ainda separadas | Codex prepara a entrega; dono mescla |
| C6a/C6b — Wiki, Campanhas e Agenda | Implementadas e validadas localmente; publicação pendente | Codex prepara a entrega; dono mescla |
| X8 — visual, acessibilidade e primeiros passos | Implementada e validada localmente no snapshot integrado | Codex mantém a revisão; dono mescla/publica |
| Item 1 — túnel público Android | Aviso e decisão técnica prontos; o túnel Cloudflare ainda foi adiado até medir APK e bateria | Codex, em etapa posterior aprovada pelo dono |
| Item 8 — matriz Tasks | Comandos por estado, outlinks e Busca rápida implementados; falta conferência com Tasks 8.6.0 no Obsidian | Dono faz a conferência manual; Codex corrige diferenças |
| Revisão complementar com Android | Especificada, ainda não executada sobre o visual final | Codex, depois do rework |
| X7 — sala hospedada pelo celular | Funciona na rede local; acesso público pela internet continua bloqueado pela ausência do túnel Android | Codex (item 1); dono confere rede local |

## Claude Code

| Tarefa | Situação aberta | Próximo responsável |
|---|---|---|
| C5c — fechamento das Notas | PR #27 em revisão e depende do leitor #26 | Claude Code e revisores |
| F1–F5 — rework visual | Frente visual aprovada, com fases de fundações, acessibilidade, editor/Livros, módulos e telas finais | Claude Code |
| C7 — telas de pacotes, Backups e conflitos | Núcleo de backups/conflitos feito pelo Codex; telas pertencem à F5 | Claude Code |
| C9 — ajuda e virtualização visual | Núcleo de rede, instaladores e benchmark feito pelo Codex; ajuda e virtualização dependem de F4/F5 | Claude Code, com integração do Codex |
| Tasks e tempo livre — conferência/publicação | O código foi integrado no PR #40, mas `docs/04-testes-pendentes.md` ainda exige conferência com o plugin Tasks aberto e publicação da próxima beta | Claude Code mantém a frente histórica; dono aprova a beta |

## Dono/revisão manual

- Mesclar PRs aprovados e publicar releases; nenhuma dessas ações está autorizada automaticamente por este inventário.
- Conferir X4 restaurada e X7 restaurada na beta.16, incluindo exportações por módulo, site ZIP e sala Android.
- Repetir os testes físicos de Android, Wayland, VTT por toque, Tasks no Obsidian e conflitos de sincronização listados
  em `docs/04-testes-pendentes.md`.

As fases já registradas como mescladas — 8a, 8b, X1, X2, C0–C4 e C8/SAF — não aparecem aqui como abertas.
