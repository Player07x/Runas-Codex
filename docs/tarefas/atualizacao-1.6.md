# Atualização 1.6.0 — Ajustes de 18/11 e o que ficou da 1.5

> Plano do Claude (líder desta atualização), feito em 18/11/2026 com o código da `main` em `33228ee` (v1.5.1).
> O João pediu para levantar as pendências das últimas atualizações e, na mesma manhã, mandou nove ajustes com dez
> capturas. **O João deu o ok em 18/11** no plano e nas [maquetes](atualizacao-1.6-maquetes.html); as fases seguem a
> ordem abaixo.

Junta os ajustes de 18/11 (U114–U122), os seis PRs que a 1.5 deixou para depois (D, K, J2, R, L e A2), os problemas
conhecidos das notas da 1.5.0 e o que os registros da 1.5 apontaram sem conserto (U108–U113). As decisões 5 a 14 da
1.5 continuam valendo (ver [`atualizacao-1.5.md`](atualizacao-1.5.md#decisões-do-joão)), assim como as regras D1–D17
de design e a regra de aceite do Android: PR que mexe em tela do celular ou em transferência só se mescla com o
`android-vault` verde.

Funções novas depois da 1.5 = **1.6.0** (ADR 0025, adendo de SemVer).

## Os ajustes de 18/11

| Item | Captura | O que é | Causa achada | Proposta |
|---|---|---|---|---|
| **U114** | 1 | Nome da categoria da Wiki cortado no meio (“Acontecim/entos”) e um “›” que não precisa | no modo “Só categorias”, o título divide a linha com o ícone, o número e o “›” (`WikiHome.tsx:223`); `overflow-wrap: break-word` corta a palavra (`wiki.css:357`) | o “›” sai (o cartão já é o link); o número desce para a linha de baixo (“4 artigos · 1 a escrever”); palavra longa quebra com hífen |
| **U115** | 2 | Elenco com recursos repetidos e muita coisa na tela | cada seção tem os seus botões de acrescentar e o seu Lista/Grade; todo cartão traz atitude, “apareceu” e ⋯. No exemplo do app, com 3 NPCs, são 71 controles na tela | uma barra (busca, “Filtros e exibição”, “Adicionar”, ⋯), abas por tipo com o número, cartões só com nome e atitude, painel de detalhes. **Maquete** |
| **U116** | 3 | A busca mostra só notas | o Ctrl K abre tudo no editor das Notas (`Shell.tsx`, `CommandPalette`, `vaultRoute`) | grupo **Páginas** antes das Notas: campanha (com atalhos para as abas), sessão, missão, artigo, personagem no Elenco, organização no organograma, livro, evento, mesa e as telas fixas. Enter abre a página; Ctrl Enter, a nota. Regra pura em `core/` com testes. **Maquete** |
| **U117** | 4 | Organograma preso no canto de cima | ele se move pela rolagem da caixa (`WikiRelations.tsx`, `useZoom`); desenho menor que a caixa não tem o que rolar. A árvore genealógica nem arrasta nem tem zoom | arrastar move o desenho para qualquer lado, ele abre centrado, “Enquadrar” volta ao centro; a árvore ganha os mesmos controles. A teia já usa o `GraphView`, que é livre. O filtro “Organizações” ganha texto de exemplo |
| **U118** | 5 | Ferramentas precisam de revisão e de proposta nova | a 1366 × 860, a lista dos 15 geradores tem 880 px de altura, e o resultado ao lado, 203 px; Recentes ficam fechados embaixo; “Conferir relações” fica no meio dos geradores | abas Geradores · Tabelas da wiki · Conferir a wiki; geradores em quatro faixas de pílulas; opções e “Gerar” na linha do título; Recentes abertos ao lado; Conferir com a lista inteira na tela. As Ferramentas da campanha no mesmo padrão (abas no topo). **Maquete** |
| **U119** | 6 | Na Ajuda é difícil chegar ao que fica embaixo | a Ajuda é a 12ª seção das Configurações; o índice começa a 297 px e tem 2.036 px de conteúdo numa caixa de 828 px (rolagem dentro de rolagem); as notas de exemplo ficam a 2.096 px do topo; “Nesta página” lista os títulos sem levar a eles | Ajuda com rota própria (`/ajuda`) e item na barra lateral; três painéis com rolagem própria (tópicos, artigo, “Nesta página” com links); no celular, lista → artigo. `/config/ajuda/…` continua funcionando. **Maquete** |
| **U120** | 6–8 | Mudar de seção nas Configurações mexe no layout | (1) a página é centralizada e a barra de rolagem (10 px no app) aparece só nas seções longas: tudo anda para o lado; (2) o negrito do item escolhido não cabe nos 220 px do índice e “Conflitos de sincronização” vai para duas linhas (40 → 54 px); (3) “Leitura” e “Prévia” colados no texto de cima | `scrollbar-gutter: stable` na área de conteúdo (vale para o app todo); índice de 240 px e o mesmo peso de letra nos dois estados; um só cabeçalho de seção para as 11 seções, conferidas em 320, 390 e 1366 px |
| **U121** | 9–10 | Recolher e abrir a barra lateral muda os botões de lugar | recolhida, o botão fica no topo e a runa desce; aberta, a runa sobe e o botão vai para a direita; os itens mudam ~40 px de altura (270 → 228 px na captura) | (revisto a pedido do João) o botão de recolher fica no alto, à direita, preso à borda da barra e sempre na mesma altura (ao recolher, acompanha a borda); só a runa muda de lugar: recolhida, pequena (32 px) abaixo do botão; aberta, sobe para a linha do botão, à esquerda, e cresce (56 px), com o nome ao lado. Cabeçalho de altura fixa, então os itens não se mexem. Transição de 0,2 s, sem animação com “Reduzir movimento” |
| **U122** | — | Paleta temática a partir do ícone novo | — | **última tarefa:** maquete de uma paleta “Runa” (escuro e claro), que entra como opção em Aparência e passa no `styles/tokens.test.ts`. Só implemento depois do ok |

## O que ficou da 1.5 e o que os registros apontaram

| Item | De onde veio | O que é |
|---|---|---|
| **U89** | PR D da 1.5 | Sala: “+ Assento” e “Remover” com a sala aberta, aviso de queda, “Reconectar” (decisões 6 e 8) |
| **U47** | PR K da 1.5 | Mestre remoto completo, entrando pelo link dentro do app |
| **U104** | PR J2 da 1.5 | Importar mais direto: arquivo e prévia primeiro; explicações recolhidas; “Abrir o que entrou” |
| **U99** | PR R da 1.5 | Título da nota editável (decisão 13) e “Criar o primeiro modelo” |
| **U46** | PR L da 1.5 | Início “Mesa de hoje”: implementar a [maquete aprovada](atualizacao-1.5-inicio-maquete.md) (#161) |
| **U86** | PR A2 da 1.5 | Miniaturas das capas e retratos (processo principal com `nativeImage`, fora do cofre, `ETag`/304) |
| **U76** | PR A2 da 1.5 | Otimização, segunda parte: só o que a medida da A1 (#158) e a nova medida apontarem |
| **U108** | notas da 1.5.1 | O job “Orçamento de desempenho” variou de 8,5 a 15,2 s com o mesmo código (teto 12,7 s): medir mais vezes e usar a mediana, ou subir o teto com a variação medida; nunca desligar |
| **U109** | notas da 1.5.0 | Android: arquivo grande ainda é juntado inteiro na memória da tela antes da ponte |
| **U110** | registro do PR N (#168) | “Testar gravação” também no Android, sem deixar arquivo oculto no cofre |
| **U111** | notas da 1.5.0 | Smoke do Windows instável (`editorClick`, transferência) com a janela escondida |
| **U112** | conferência da fase 1 da 1.5 | Até 560 px, `.list-item { flex-wrap: wrap }` deixa o nome descer; outros 6 seletores com o mesmo padrão |
| **U113** | PR #172 | A exceção da auditoria para o GHSA-fc5q-39xc-vjpf (picomatch) vence em 17/12 |

Fica de fora: a contagem de pastas vazias criadas fora do app antes de abri-lo (o app só vê o que o índice lista;
varrer o disco atrás delas custa mais do que resolve). Continua nos problemas conhecidos.

## Fases e PRs

Todo PR que muda a interface leva capturas de antes e depois (320, 390 e 1366 px; tema claro e escuro; teclado).

| Fase | PR | Branch | Itens | Depende de | Custo (janela de 5 h) |
|---|---|---|---|---|---|
| 1 · consertos visuais | V | `visual/1.6-consistencia` | U121, U120, U112 | — | ~6 % |
| | W1 | `wiki/1.6-cartoes-e-organograma` | U114, U117 | — | ~6 % |
| 2 · telas refeitas | E | `campanhas/1.6-elenco` | U115 | maquete aprovada | ~12 % |
| | F | `wiki/1.6-ferramentas` | U118 | maquete aprovada | ~12 % |
| | H | `ajuda/1.6-tela-propria` | U119 | V, maquete aprovada | ~7 % |
| | B | `busca/1.6-paginas` | U116 | — | ~6 % |
| 3 · o que ficou da 1.5 | D | `vtt/1.6-sala-assentos-e-quedas` | U89 | — | ~10 % |
| | K | `vtt/1.6-mestre-remoto` | U47 | D | ~18 % |
| | J2 | `transferir/1.6-importar-direto` | U104 | — | ~6 % |
| | T | `transferir/1.6-android-pedacos-na-tela` | U109, U110 | — | ~8 % |
| | R | `notas/1.6-nome-e-modelos` | U99 | — | ~6 % |
| | L | `inicio/1.6-mesa-de-hoje` | U46 | V | ~10 % |
| 4 · fechar a versão | W | `testes/1.6-windows-e-auditoria` | U111, U113 | — | ~4 % |
| | A2 | `desempenho/1.6-imagens-e-consertos` | U86, U76, U108 | todos | ~15 % |
| | P | `visual/1.6-paleta-runa` | U122 (só a maquete) | todos | ~5 % |

Ordem: V → W1 → E → F → H → B → D → K → J2 → T → R → L → W → A2 → P → conferência final em 320, 390 e 1366 px.

Os custos são estimativas (opinião), comparadas com os PRs da 1.5 (C ~6 %, G ~8 %, M ~10 %). Somam ~131 % de uma
janela de 5 h: perto de uma janela e meia, em duas ou três janelas. Paro e pergunto se uma janela chegar perto de 95 %.

## Escolhas que o João pode trocar

- As Ferramentas da campanha entram no mesmo padrão das da Wiki (abas no topo).
- No Elenco, clicar no cartão abre o painel de detalhes; o artigo da wiki fica no “Abrir artigo” do painel (1 clique a
  mais para abrir o artigo; o resto fica igual ou melhora, ver a tabela de cliques na maquete).

## Registro

- **18/11, manhã:** primeiro plano, só com as pendências da 1.5. O João avisou que mandaria ajustes antes das
  implementações.
- **18/11:** chegaram os nove ajustes (U114–U122). Causas conferidas no código e medidas no app de exemplo a
  1366 × 860. Plano e maquetes refeitos; esperando o ok. Nada codado.
- **18/11:** o João pediu para refazer a barra lateral (U121): o botão de recolher não pode mudar de lugar; só a runa
  muda de posição e de tamanho. Maquete refeita, com uma versão para clicar.
- **18/11:** o João pediu o botão à direita, não à esquerda: fica no alto, preso à borda direita da barra.
- **18/11:** o João deu o ok (“Inicio o plano de atualização 1.6.0”). Começo pelo PR V; as escolhas que ele pode
  trocar ficam como estão.
