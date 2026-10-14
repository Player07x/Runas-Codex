# ADR 0004 — Runas-Codex independente da Runas Suite

- **Status:** aceita (2026-10-14)

## Contexto
O estudo inicial tratava o Runas-Codex como o app que juntaria os projetos da Runas Suite (Runas DM, Runas Tools,
Runas Book, RunasVTT), migrando cofres e mundos e mantendo a ponte com os sites.

## Decisão
O Runas-Codex é um **projeto independente**. Da Runas Suite ele só **reaproveita código** (por exemplo, a mesa do
RunasVTT e a lógica de links do Runas DM), sem nenhuma outra relação:
- Nada do cofre do Runas DM é portado agora; o Codex cria e usa o próprio cofre (compatível com o Obsidian).
- A etapa 4 não importa mundos do RunasVTT e não tem navegador integrado nem ponte com os sites da suíte: é **só a mesa**.
- A etapa 10 (migrações) fica com o Obsidian e, depois da 1.0, Notion, Kanka e World Anvil.

Na mesma data, a tabela do **dialeto Markdown** (docs/02, seção 5) foi aprovada como está, o que fecha a etapa 0.

## Consequências
- O critério da etapa 3a passa a ser "um cofre do Obsidian abre sem alterar um byte", não o cofre do Runas DM.
- O critério da etapa 4 passa a ser "uma sessão real roda no Runas-Codex".
- Código copiado de outros repositórios vira código do Codex: é adaptado, testado aqui e não acompanha as versões
  de origem.
