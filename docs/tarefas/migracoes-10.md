# Tarefa: etapa 10 — migrações (C4)

**Para:** Claude Code, depois do mestre pelo celular (C3). **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a
[divisão](README.md), a [ADR 0004](../adr/0004-independente-da-runas-suite.md) e a seção 5 de
[docs/02](../02-viabilidade-e-etapas.md).

Marco do plano: **dados reais migrados sem perda.** Pela ADR 0004 a etapa 10 começa pelo **Obsidian**; Notion, Kanka,
World Anvil e LegendKeeper ficam para depois da 1.0.

## O que "migrar do Obsidian" quer dizer

O app já abre um cofre do Obsidian como ele está (etapa 3a). O que falta são os **dados dos plugins de RPG**, que o
app não entende e que têm equivalente nativo:

| Plugin | Onde ficam os dados | Vira |
|---|---|---|
| Calendarium | `.obsidian/plugins/calendarium/data.json` | bloco `runas-calendario` (ADR 0010) |
| Fantasy-Calendar | arquivo JSON exportado do site | bloco `runas-calendario` |
| Leaflet | blocos ` ```leaflet ` (imagem, marcadores, escala) | bloco `runas-mapa` com os pinos ligados às notas |
| Fantasy Statblocks | blocos ` ```statblock ` (YAML) | callout `> [!statblock]` do dialeto |
| Initiative Tracker | blocos ` ```encounter ` | lista de combatentes que a mesa importa (combinar com o Codex) |

Full Calendar (Agenda) e Dice Roller (`dice:`) já usam o mesmo formato e não precisam de migração. Blocos
` ```dataview ` e arquivos `.base` continuam intactos.

## Entregar

1. Conversores em `app/src/core/import/` (TS puro), com testes a partir de exemplos reais pequenos em
   `app/src/core/import/fixtures/`.
2. **Tela de migração** (`app/src/screens/import/`): o app detecta os plugins no cofre, mostra o que vai mudar
   (quantas notas, quais blocos) e só grava depois de confirmar, **com backup antes** e pelo `useVault()`. Mantém o
   bloco original num comentário `%% … %%` quando o usuário pedir, para quem ainda usa o plugin no Obsidian.
3. **Teste de ida e volta** com o cofre real do dono (`RUNAS_CORPUS`, só leitura, numa cópia): nenhuma nota fora
   dos blocos convertidos muda um byte.

## Pronto quando

- os exemplos de cada plugin convertem sem perder dado (testes) e o resultado abre no app e no Obsidian;
- a migração numa cópia do cofre real termina sem erro e só mexe nas notas que tinham os blocos;
- os comandos de sempre e os dois `--smoke` passam; ADR nova `0014-migracoes.md`.
