# Regra de UX/UI e acessibilidade

Esta especificação é obrigatória para qualquer nova tela, componente, fluxo ou alteração visual do Runas-Codex.
Ela complementa o guia visual anexado ao projeto e tem como alvo WCAG 2.2 nível AA, WAI-ARIA Authoring Practices e o
visual Órbita.

## Requisitos obrigatórios

- A interface usa os tokens de `app/src/styles/tokens.css` para cores, tipografia, espaçamento, bordas e elevação.
- Texto comum mantém contraste mínimo de 4,5:1; texto grande, 3:1; bordas e indicadores não textuais necessários,
  3:1. Validar tema escuro, tema claro e paletas temáticas.
- Toda rota tem título de documento descritivo, localização atual identificável com `aria-current` e foco lógico após
  navegação SPA.
- O foco de teclado é sempre visível. Campos, diálogos, menus, abas, grades, seletores e popovers seguem o padrão
  semântico adequado; diálogos prendem foco, fecham com Escape e devolvem foco ao acionador.
- Toda função funciona por teclado. Arrastar, gesto, hover, cor, posição ou som não podem ser a única forma de
  executar uma ação ou compreender informação.
- Gráficos, mapas, Canvas e WebGL têm alternativa acessível equivalente: lista, tabela, texto ou controles focáveis
  que permitam consultar e abrir os itens representados.
- Alvos de ponteiro têm no mínimo 24×24 CSS px. Em toque, controles devem preferir 44×44 px ou maior, com espaço
  suficiente entre alvos.
- A interface refluí a partir de 320 px sem rolagem horizontal da página. Conteúdo bidimensional, como mapas e linhas
  do tempo, usa rolagem interna identificada e mantém controles acessíveis.
- A interface respeita `prefers-reduced-motion` e a opção explícita de reduzir animações. Não há animação contínua
  sem controle de pausa, parada ou ocultação.
- Campos têm rótulo persistente, formato explicado, erro próximo e associado ao controle. Placeholders não substituem
  rótulos.
- Estados padrão, hover quando aplicável, foco, ativo, selecionado, desabilitado, carregando, vazio, erro e sucesso
  são definidos antes da entrega. Mensagens dinâmicas importantes usam regiões de status ou alerta apropriadas.
- A interface permanece em pt-BR, aceita expansão de textos e não depende de truncamento para caber.

## Alinhamento entre interface e funcionalidades

- A UX/UI representa as funcionalidades realmente implementadas no núcleo, na `Platform`, no `useVault()` e nos
  módulos do projeto. Protótipos, estados vazios e dados de demonstração não podem se passar por operações reais.
- Toda ação visível deve chamar o fluxo existente de front-end e back-end, incluindo leitura, gravação, renomeação,
  lixeira, importação, exportação, sincronização e atualização de estado. Não duplicar regras de negócio na tela.
- Os dados mostrados em contadores, listas, calendários, gráficos, status de salvamento, erros e permissões devem vir da
  fonte real do módulo. Se a informação ainda não estiver disponível, a interface deve declarar o estado como não
  disponível ou não implementado, sem inventar resultado.
- Alterações de layout não podem remover, esconder ou degradar funcionalidades já implementadas. Em telas estreitas,
  ações existentes devem ser reorganizadas em menus, painéis ou fluxos equivalentes, mantendo a mesma capacidade.
- Cada novo componente deve documentar sua entrada, saída, estado de carregamento, erro, somente leitura e dependência
  de dados. O contrato visual deve acompanhar o contrato TypeScript/API correspondente.
- Mudanças no front-end e no back-end que participem do mesmo fluxo devem ser revisadas e testadas juntas. Uma tela só
  pode ser considerada pronta quando a tarefa real completa funciona do início ao fim.

## Fluxo obrigatório de revisão

Antes de considerar uma alteração visual pronta, verificar:

1. Desktop, tablet e largura de 320 px.
2. Tema escuro, tema claro e qualquer paleta adicionada.
3. Navegação somente por teclado, incluindo Tab, Shift+Tab, Enter, Space, Escape e setas quando o componente exigir.
4. Leitura da árvore de acessibilidade e foco visível nos fluxos críticos.
5. Estados vazio, carregando, erro, sucesso e somente leitura.
6. Contraste dos tokens e alvos de toque.
7. `npm run typecheck`, `npm test`, `npm run build` e `npm run desktop:build`.
8. Fluxo real de cada ação alterada, conferindo que a tela usa a API/módulo existente e que o estado persistido volta
   corretamente para a interface.

Uma exceção deve registrar o motivo, o impacto e a alternativa acessível no PR e em `docs/04-testes-pendentes.md`.
Preferências estéticas não podem substituir requisitos normativos. Quando uma verificação não for possível, ela deve ser
marcada como **Não verificada**, nunca presumida como aprovada.
