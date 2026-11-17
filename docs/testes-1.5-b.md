# Conferência B — U83 e U103 (17/11/2026)

Build web de produção servido localmente, Electron 44.4.2 fora da tela, escala 1, GPU desabilitada, 1366 × 900
para os tempos. Cofre em memória com **10.084 notas**: 10 mil geradas mais os exemplos públicos do projeto;
nenhum dado pessoal. Antes e depois usam a mesma máquina e configuração. Compilação encerrada antes da medição
final. Mediana de três rodadas; cada troca termina com a seção ativa e dois quadros. Esses tempos medem navegação
neste cenário, não são o cofre de 1,3 GB nem o Profiler da tarefa A1.

| Seção | Antes | Depois | Redução |
|---|---:|---:|---:|
| Cofre | 132.6 ms | 32.7 ms | 75.3% |
| Aparência | 148.1 ms | 33.0 ms | 77.7% |
| Editor | 132.8 ms | 32.7 ms | 75.4% |
| Ajuda | 181.5 ms | 66.2 ms | 63.5% |
| Obsidian e anexos | 149.5 ms | 116.3 ms | 22.2% |
| Agenda | 166.1 ms | 32.9 ms | 80.2% |

Antes, as **11 seções** ficavam montadas. Depois, apenas a ativa. A tela Obsidian continua sendo a mais cara deste
roteiro (116 ms); o planejamento de mover imagens não foi alterado nesta tarefa.

## Tela e teclado

Os seis pares da seção Cofre foram comparados em RGB: **idênticos pixel a pixel**. Todas as 12 capturas têm
`scrollWidth === clientWidth`. A sequência de 12 passos de Tab a partir da seção foi idêntica antes/depois.
Os controles, rótulos, ordem e CSS existentes foram conservados.

| Largura | Escuro | Claro |
|---|---|---|
| 320 px | [antes](imagens/1.5-b/antes-320-dark.png) · [depois](imagens/1.5-b/depois-320-dark.png) | [antes](imagens/1.5-b/antes-320-light.png) · [depois](imagens/1.5-b/depois-320-light.png) |
| 390 px | [antes](imagens/1.5-b/antes-390-dark.png) · [depois](imagens/1.5-b/depois-390-dark.png) | [antes](imagens/1.5-b/antes-390-light.png) · [depois](imagens/1.5-b/depois-390-light.png) |
| 1366 px | [antes](imagens/1.5-b/antes-1366-dark.png) · [depois](imagens/1.5-b/depois-1366-dark.png) | [antes](imagens/1.5-b/antes-1366-light.png) · [depois](imagens/1.5-b/depois-1366-light.png) |

No fluxo real de Renomear imagens da nota (Formatadores do exemplo), cliques do Electron abriram os diálogos;
um Tab a partir do nome chegou a **Pasta da imagem**. Havia **0 opções** antes do foco e **31** depois. O teste
não renomeou o arquivo. O JSON de evidência está em [`testes-1.5-b.json`](testes-1.5-b.json).

## Exportação

Dez casos novos verificam o título inicial, linhas vazias, CRLF, caixa, formatação e fechamento de H1, título diferente,
preâmbulo, cabeçalho dentro de código, rascunho e resolução absoluta de links. Nenhum texto do cofre é reescrito.
O leitor/live preview não foi alterado; o ZIP Markdown continua preservando os originais.

O smoke agora abre a seção Privacidade antes de procurar o botão de atualizações, porque seções fechadas não
ficam mais no DOM. Esse acréscimo preserva o restante do roteiro e não faz consulta de atualização na rede.

Sem verificar: desempenho com a distribuição exata de anexos do cofre real, Android físico e leitores de tela.
As capturas cobrem o conteúdo da seção Cofre nos dois temas; a conferência de todas as telas da versão fica para
a tarefa 17. As demais ações de Configurações continuam listadas no teste manual.
