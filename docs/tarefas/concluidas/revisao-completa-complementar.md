# Tarefa complementar — revisão completa do Runas-Codex

**Responsável:** Codex. **Origem:** pedido do dono em 17/10/2026, após X5 → C6 → X8.
**Situação:** especificada; executar a revisão numa cópia própria. A rodada original excluiu Android.

## Base e objetivo

Revisar o conjunto integrado de X5, C6a/C6b e X8, incluindo o pedido posterior de pasta comum de imagens,
renomeação com referências e contadores reais. Ler `AGENTS.md`, as auditorias X5/C6/X8 e
`docs/04-testes-pendentes.md`. Usar a branch `polimento/visual` como snapshot local enquanto os PRs não forem
mesclados. A pasta principal do dono deve permanecer intacta.

Entregar uma matriz por recurso com **passou**, **defeito reproduzido**, **não disponível nesta base** ou
**não verificado por falta de aparelho/ambiente**. Cada defeito deve ter passos, resultado esperado/obtido,
severidade e arquivo responsável. Identificar dependências de X6, C7, C8, X7 e C9; a revisão não dá esses módulos
como implementados nem amplia automaticamente seu escopo.

## Conferência completa

1. **Android:** estado real de C8/X7; build quando o ambiente já existir; SAF e permissões persistentes; reabrir
   cofre, teclado/IME, voltar do sistema, rotação, entalhes e barras, tela dividida, abrir anexos, lembretes,
   notificações e widget. Servidor/túnel/reconexão do VTT somente se a implementação estiver disponível.
2. **Visual e acessibilidade:** todos os espaços e suas telas internas em 320 px, tablet e desktop; três paletas
   claras/escuras, texto a 85/100/140%, alvos de toque, zoom do sistema, foco/Tab/Escape/retorno, diálogos aninhados,
   redução de movimento do sistema e do app. Conferir com Orca/NVDA/TalkBack reais, registrando o que não for possível.
3. **Imagens:** criar cofre com `Anexos/Imagens`; colar/arrastar/importar/recortar imagens; renomear pelo link e pelo
   botão direito; repetir o mesmo arquivo em duas notas, frontmatter, mapa, livro e `.canvas`; preservar legendas,
   tamanhos e referência ao original do recorte. Reunir imagens com nomes repetidos sem sobrescrever. Conferir no
   Obsidian com cofre espelhado e alteração externa concorrente.
4. **Contadores:** cofre vazio, Wiki só com página inicial, zero notas pessoais com outras pastas preenchidas,
   nenhuma mesa, criar/renomear/remover/restaurar e trocar de cofre. Contar livros, campanhas e mesas como entidades;
   Agenda só com eventos válidos. Verificar a ausência de dados demonstrativos em cofres reais.
5. **Livros:** glossário/índice, revisão/histórico, foco/máquina de escrever, Wiki lateral, prévia/temas, margens,
   sangria/corte, marca d’água, CSS e exportações PDF/EPUB/DOCX/HTML/RTF/Markdown/ZIP. Abrir saídas em leitores
   independentes e testar impressão física. Registrar os limites do RTF e a página inicial do capítulo no índice.
6. **Wiki e Campanhas:** calendários/recorrências, eras/camadas/desenhos, idiomas/tabelas/geradores/metas; tesouro,
   iniciativa presencial e importação de encontros; sessão/evento e ICS. Multitouch físico no quadro e no VTT,
   arrasto conjunto, cancelamento da pinça, recorte/restauração e preservação de campos desconhecidos do Canvas.
7. **Sala real:** dois jogadores e espectador, LAN e túnel disponíveis; artigo público/privado, assento autorizado,
   retorno após queda, diário, avaliação anônima, enquete e Carta X. Conferir que projeções não contêm segredos,
   resultados privados ou destinatários. Navegar entre módulos mantendo sala e encerrá-la explicitamente.
8. **Desktop e regressões:** bandeja Linux/Windows com janela escondida, lembretes, janelas de notas, concorrência,
   backup e recuperação. Rodar typecheck, testes, builds e os dois smokes com perfis separados. Instaladores e
   desempenho grande permanecem C9; registrar evidência existente e pendências, sem inventar validação física.

## Entrega

Relatório em `docs/tarefas/resultado-revisao-completa.md`, com capturas relevantes, matriz, bloqueios concretos e
ordem sugerida das correções. Não publicar código, abrir PR ou mesclar sem autorização do dono; não alterar a main.
