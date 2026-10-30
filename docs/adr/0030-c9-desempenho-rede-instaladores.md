# ADR 0030 — C9 sem interface

- Estado: implementada no núcleo e no processo principal; ajuda visual fica para o rework.
- Data: 2026-10-22.

## Rede

O `--smoke` instala uma guarda no `session.defaultSession.webRequest`. Cada pedido HTTP(S)/WS é contado; hosts locais,
Quick Tunnel e os hosts oficiais de atualização são permitidos. Qualquer outro host entra em `violations` e faz
`smokePassed` falhar. A guarda só existe no processo de smoke e não bloqueia nem altera o app em uso.

## Cofre grande

`generateLargeVault(10_000)` cria notas Markdown determinísticas com tags e três links por nota. Na medição local de
22/10/2026 (Node 24, máquina do desenvolvimento) o resultado foi:

| Operação | 10 mil notas |
| --- | ---: |
| Construção do índice | 1.054 ms |
| Busca `cidade valdris` | 64 ms |
| Gráfico global | 102 ms |

O teste usa limites amplos para CI e imprime os números em JSON. O spike Android de 5 mil notas existente na ADR 0015
continua sendo a referência física; o WebView do aparelho precisa repetir o gerador antes da publicação.

## Telas com 10 mil notas (T6, 30/10/2026)

Medido no navegador (`npm run dev`, endereço `?cofre-grande=10000`, Chromium sem placa de vídeo, Node 22), antes e
depois das mudanças da T6:

| Operação | Antes | Depois |
| --- | ---: | ---: |
| Itens desenhados na lista de notas | 10.015 | 215 |
| Maior travada ao limpar a busca | 3.270 ms | 0 ms |
| Digitar “cidade valdris” (14 teclas) | 4.841 ms | 1.375 ms |
| Gráfico global aparecer | 18.251 ms | 3.192 ms |
| Desenho do gráfico (JavaScript, 6 s de perfil) | 1.060 ms | < 30 ms |

O que mudou: a árvore só desenha as pastas abertas e mostra as notas de 200 em 200 (“Mostrar mais”); o resumo de cada
nota fica guardado; a busca espera 180 ms de pausa na digitação quando o cofre passa de 2 mil notas e não segura a
tela; no gráfico acima de 1.500 nós, a simulação começa na espiral do d3, esfria mais rápido, roda sem colisão e em
até 8 ms por quadro, o desenho acompanha um quadro em quatro enquanto se acomoda e corta o que está fora da tela, e as
ligações deixaram de ser agrupadas por cor com cópia da lista a cada ligação (custo quadrático). Sem placa de vídeo o
quadro do gráfico global ainda leva perto de 1 s, quase todo no desenho por software; a conferência com placa de
vídeo e no Android (R3) fica para o dono.

## Instaladores

O teste estrutural confere identidade `dev.runas.codex`, nomes `Runas-Codex`, ícone, atalhos e preservação de dados do
NSIS, alvos `.deb`/AppImage, e a existência do build assinado do APK com `apksigner`. A geração real continua no
workflow Release, onde Linux, Windows e Android são construídos em seus runners próprios.
