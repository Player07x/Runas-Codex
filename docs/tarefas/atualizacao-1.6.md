# Atualização 1.6.0 — O que ficou da 1.5

> Plano do Claude (líder desta atualização), feito em 18/11/2026 com o código da `main` em `33228ee` (v1.5.1).
> O João pediu para levantar as pendências das últimas atualizações e começar a trabalhá-las nesta versão.

Junta os seis PRs que a 1.5 deixou para depois (D, K, J2, R, L e A2), os problemas conhecidos das notas da 1.5.0 e o
que os registros da 1.5 apontaram sem conserto. Nenhum item novo de função entra sem pedido do João. As decisões 5 a
14 da 1.5 continuam valendo (ver [`atualizacao-1.5.md`](atualizacao-1.5.md#decisões-do-joão)), assim como as regras
D1–D17 de design e a regra de aceite do Android: PR que mexe em tela do celular ou em transferência só se mescla com
o `android-vault` verde.

Funções novas depois da 1.5 = **1.6.0** (ADR 0025, adendo de SemVer).

## De onde vieram as pendências

| Fonte | O que ficou |
|---|---|
| Plano da 1.5, “Fases e PRs” | D (U89), K (U47), J2 (U104), R (U99), L (U46) e A2 (U86 + U76) não foram feitos |
| Notas da 1.5.0, “Problemas conhecidos” | arquivo grande montado inteiro na memória da tela no Android; contagem de pastas vazias criadas fora do app; CI do Windows instável |
| Notas da 1.5.1 e `docs/04` | o job “Orçamento de desempenho” variou de 8,5 a 15,2 s com o mesmo código (teto 12,7 s) |
| Registro do PR N (#168) | o “Testar gravação” nativo no Android ficou de fora |
| Conferência visual da fase 1 da 1.5 | `.list-item { flex-wrap: wrap }` até 560 px deixa o nome descer; outros 6 seletores com o mesmo padrão do seletor da campanha |
| PR #172 | exceção da auditoria para o GHSA-fc5q-39xc-vjpf (picomatch) vence em 17/12 |

## Os itens

Os itens que já tinham número na 1.5 mantêm o número. Os novos seguem de U108.

| Item | O que é | Detalhe |
|---|---|---|
| **U89** | Sala: assentos com a sala aberta, aviso de queda e “Reconectar” | como no plano da 1.5, com as decisões 6 e 8 |
| **U47** | Mestre remoto completo, entrando pelo link dentro do app | como no plano da 1.5 |
| **U104** | Importar mais direto | escolher o arquivo e a prévia primeiro; explicações recolhidas; “Abrir o que entrou” no fim |
| **U99** | Título da nota editável e “Criar o primeiro modelo” | decisão 13 |
| **U46** | Início “Mesa de hoje” | implementar a [maquete aprovada](atualizacao-1.5-inicio-maquete.md) (#161) sem mudar o que ela mostra |
| **U86** | Miniaturas das capas e retratos | como no plano da 1.5 (processo principal com `nativeImage`, fora do cofre, `ETag`/304) |
| **U76** | Otimização, segunda parte | mexer só no que a medida da A1 (#158) e a nova medida apontarem |
| **U108** | Orçamento de desempenho instável no CI | medir mais vezes e usar a mediana, ou subir o teto com a variação medida; nunca desligar |
| **U109** | Android: arquivo grande montado inteiro na memória da tela | ler e gravar em pedaços também do lado da tela, sem juntar o arquivo inteiro antes da ponte |
| **U110** | “Testar gravação” nativo no Android | o teste do PR M também no Android, sem deixar arquivo oculto no cofre |
| **U111** | Smoke do Windows instável no CI | `editorClick` e a tela de transferência com a janela escondida: achar a causa ou tornar a espera determinística |
| **U112** | Itens de lista que quebram linha no celular | `.list-item` até 560 px e os 6 seletores parecidos: o nome não desce para baixo do ícone |
| **U113** | Exceção do picomatch | conferir se saiu correção até 17/12; se saiu, atualizar e tirar a exceção |

Fica de fora: a contagem de pastas vazias criadas fora do app antes de abri-lo (o app só vê o que o índice lista;
o custo de varrer as pastas vazias não compensa). Continua nos problemas conhecidos.

## Fases e PRs

Todo PR que muda a interface leva capturas de antes e depois (320, 390 e 1366 px; tema claro e escuro; teclado), como
na fase 2 da 1.5.

| PR | Branch | Itens | Depende de | Observação | Custo (janela de 5 h) |
|---|---|---|---|---|---|
| D | `vtt/1.6-sala-assentos-e-quedas` | U89 | — | botões de assento, faixa de queda, “Reconectar” | ~10 % |
| K | `vtt/1.6-mestre-remoto` | U47 | D | campo para colar o link; Biblioteca e “Salvar Sessão” pela sala | ~18 % |
| J2 | `transferir/1.6-importar-direto` | U104 | — | a tela Importar muda de ordem | ~6 % |
| T | `transferir/1.6-android-pedacos-na-tela` | U109, U110 | — | — | ~8 % |
| R | `notas/1.6-nome-e-modelos` | U99 | — | título editável no topo da nota | ~6 % |
| L | `inicio/1.6-mesa-de-hoje` | U46 | — | o Início troca blocos, sem somar | ~10 % |
| V | `visual/1.6-listas-no-celular` | U112 | — | listas em 320 px | ~3 % |
| W | `testes/1.6-windows-e-auditoria` | U111, U113 | — | — | ~4 % |
| A2 | `desempenho/1.6-imagens-e-consertos` | U86, U76, U108 | todos | nitidez das capas em miniatura | ~12–18 % |

Ordem: D → K → J2 → T → R → L → V → W → A2 (fecha a versão, porque mede o código já com os outros PRs) →
conferência final em 320, 390 e 1366 px.

Os custos são estimativas (opinião), comparadas com os PRs da 1.5 (C ~6 %, G ~8 %, M ~10 %). A versão inteira fica perto
de uma janela de 5 h e meia, dividida em duas ou três janelas. Paro e pergunto se a estimativa chegar perto de 95 %
da janela.

## Registro

- **18/11:** plano feito. O João vai mandar mais ajustes antes das implementações: nada foi codado ainda.
