# Linha de base da 1.5 — A1/U76

Medição em 17/11/2026 sobre `main` `80eb718` (1.4.0), com instrumentação A1 e sem otimizações.
Relatório em [`desktop/benchmarks/baseline-report.json`](../desktop/benchmarks/baseline-report.json),
orçamento em [`baseline.json`](../desktop/benchmarks/baseline.json). Os relatórios completos de cada execução
ficam no artefato do job **Orçamento de desempenho** do CI.

## Roteiro e limites da comparação

Cofre **gerado**, com exatamente 1.300.000.000 bytes: 10 mil notas de teste, os exemplos públicos do projeto,
uma wiki adicional com 420 personagens e 420 PNGs de ruído determinístico de 1024 × 768 (2.360.852 bytes cada),
uma mesa com 40 peças e um arquivo de volume preenchido (sem sparse file). Não é uma cópia da distribuição dos
arquivos reais: mede esse cenário reproduzível, sem dados pessoais. O índice lista todos os arquivos e lê as notas;
a navegação decodifica as capas visíveis, não o arquivo de volume nem todas as páginas da categoria.

Ubuntu, Intel i5-10300H, 8 processadores lógicos, 16 GB de RAM, Electron 44.4.2/Node 24.21.0, janela 1366 × 900.
Build de produção com `react-dom/profiling`; três perfis novos. O cache do sistema operacional não foi esvaziado.
Abertura vai do lançamento do Electron ao índice pronto e dois quadros da interface; índice inclui listagem,
leitura em lotes e construção. Troca de tela termina após conteúdo, imagens visíveis, fontes e dois quadros.
O Profiler mede a subárvore da tela, sem o Shell. Tempos incluem trabalho que aguarda E/S; a coluna React soma
`actualDuration` dos commits observados até esse ponto. Não foi forçada coleta de lixo.

## Números locais

| Métrica | Mediana de 3 |
|---|---:|
| Abrir o app e o cofre | 3.890 ms |
| Ler e construir o índice | 2.156 ms |
| Categoria com 420 artigos e 15 imagens visíveis | 393 ms |
| Troca mais lenta (Configurações) | 10.877 ms |
| Memória residente do renderer após o roteiro | 366,9 MiB |
| Pico residente do renderer | 482,3 MiB |
| JS total do renderer Electron, todos os chunks | 18.423.493 bytes |

| Tela | Troca (mediana) | React (mediana) |
|---|---:|---:|
| Notas | 182 ms | 99,0 ms |
| Wiki | 197 ms | 46,1 ms |
| Categoria (420 artigos) | 393 ms | 31,1 ms |
| Livro | 196 ms | 57,8 ms |
| Mesa (40 peças) | 289 ms | 18,2 ms |
| Agenda | 106 ms | 42,1 ms |
| Campanhas | 33 ms | 4,0 ms |
| Importar e exportar | 117 ms | 11,5 ms |
| Configurações | 10.877 ms | 10.825,3 ms |
| Início | 49 ms | 14,2 ms |

O primeiro Livro demorou **5.697 ms**, contra 196 e 149 ms nas outras execuções; o orçamento por tela conserva
o maior valor, para não apagar esse custo inicial da comparação. Configurações custou 10,76–10,94 s, quase todo
em React: é evidência para o U83 (tarefa B), sem conserto neste PR. O A2 deve medir novamente depois dos demais PRs.

Os maiores chunks do Electron foram entrada (5.212.635 bytes), Aparência (2.483.653), Cynefin (1.304.478), Mermaid
(1.212.663) e worker de importação (1.187.387). Este total inclui módulos carregados sob demanda; não é o tráfego
inicial. O relatório lista bytes e gzip por chunk. O Electron-Vite gera esses chunks sem a minificação do build web.

## Orçamento e reprodução

O CI executa o cenário completo três vezes, com Xvfb. Como o workflow Release já faz, somente o runner Linux
usa `--no-sandbox` para contornar a restrição de namespaces; o executor recusa `--ci-no-sandbox` fora do GitHub
Actions. Essa opção não entra no app instalado nem no build distribuído. Abertura, índice, maior troca e categoria têm teto = mediana local × 3
+ folga fixa (1.000, 500, 300 e 500 ms). Cada tela também tem teto próprio = maior medição local × 3 + 300 ms;
assim Configurações não esconde uma regressão da Agenda. JS tem teto = base × 1,15 + 100.000 bytes.
Cada execução é conferida; número inválido, resultado ausente, menos de 10 mil notas, categoria diferente de 420
ou Profiler vazio falha. A margem inicial acomoda o runner do CI; mudar os números exige registrar nova medição.

```bash
RUNAS_PROFILE=1 npm run desktop:build
node desktop/benchmarks/run.mjs /caminho/fora-do-repositorio
# No Linux sem tela: xvfb-run -a node desktop/benchmarks/run.mjs /caminho/de/saida
# Recolher uma nova base candidata (não reescreve a base versionada):
node desktop/benchmarks/run.mjs /caminho/de/saida --record
```

O executor cria e apaga seus dados de teste, perfis e temporários, inclusive em falha. Os logs e JSONs ficam na
pasta de saída. O modo `--performance` exige o marcador do gerador antes de liberar a gravação da mesa sintética.
O build comum não ativa o Profiler nem publica os dados de medição. Não há dependência nova nem chamada de rede
nova no app.

**Sem verificar:** A21 físico (aparelho de referência), cofre com a distribuição exata de anexos reais, cache frio
do sistema operacional e efeito de CPU/memória ocupadas por outros programas. A medição do CI é outra máquina e
deve ser lida separadamente da local. Somente A2 implementará otimizações de desempenho.
