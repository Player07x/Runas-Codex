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

## Instaladores

O teste estrutural confere identidade `dev.runas.codex`, nomes `Runas-Codex`, ícone, atalhos e preservação de dados do
NSIS, alvos `.deb`/AppImage, e a existência do build assinado do APK com `apksigner`. A geração real continua no
workflow Release, onde Linux, Windows e Android são construídos em seus runners próprios.
