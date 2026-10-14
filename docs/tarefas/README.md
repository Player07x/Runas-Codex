# Tarefas em andamento

Quem está trabalhando em quê, para dois agentes não mexerem nos mesmos arquivos. As regras gerais estão no
[`AGENTS.md`](../../AGENTS.md). Ao terminar uma tarefa, o dono do repositório mescla o PR e atualiza esta tabela.

| Etapa | Quem | Branches | Pedido | Situação |
|---|---|---|---|---|
| **8a** Livros: estrutura em notas e editor | Codex (GPT-6 Astra) | `livros/8a-*` | [livros-8a-8b.md](livros-8a-8b.md) | mesclada (PR #8) |
| **8b** Livros: prévia paginada e temas | Codex (GPT-6 Astra), terminada pelo Claude Code | `livros/8b` | [livros-8a-8b.md](livros-8a-8b.md) | PR aberto |
| **6** Wiki | Claude Code | `wiki/*` | docs/02, seção 8; [ADR 0010](../adr/0010-wiki.md) | PR aberto |

## Quem mexe em quê

| Área | Livros (Codex) | Wiki (Claude Code) |
|---|---|---|
| Telas | `app/src/screens/books/**` | `app/src/screens/wiki/**` |
| Núcleo (TS puro) | `app/src/core/books*.ts` | `app/src/core/calendar*.ts`, `app/src/core/wiki*.ts` |
| Leitor de Markdown | só pelos pontos de extensão (`markdown/extensions.ts`) e CSS com escopo do livro | idem |
| Dados de exemplo | `app/src/data/books.ts` | `app/src/data/wiki.ts` |
| Cofre de teste do desktop | `desktop/tests/cofre-exemplo/Livros/**` | `desktop/tests/cofre-exemplo/Wikis/**` |
| Documentação | `docs/adr/0009-livros.md` | `docs/adr/0010-wiki.md` |

Os arquivos compartilhados (lista no `AGENTS.md`) podem ser mexidos pelos dois, só acrescentando.

Ninguém mexe no que é do outro. Se precisar, o pedido vai no PR ("precisa de X em `screens/wiki`") e o dono decide.
