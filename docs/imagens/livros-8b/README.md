# Evidências da fase 8b

Capturas do navegador em 1440 × 1000, com `Formatadores.md` como capítulo. Tempos somente da paginação,
sem o debounce de 500 ms nem o carregamento inicial. Capturas claro/celular/capa mostram também as verificações
complementares. `impressao-electron-A4.png` é uma página rasterizada da impressão temporária do Electron.

| Tema | A4 | Carta | A5 | 6×9 |
|---|---|---|---|---|
| Manual | [5 p. / 0,15 s](manual-A4.jpg) | [6 p. / 0,18 s](manual-Carta.jpg) | [8 p. / 0,19 s](manual-A5.jpg) | [6 p. / 0,17 s](manual-6x9.jpg) |
| Pergaminho | [5 p. / 0,16 s](pergaminho-A4.jpg) | [6 p. / 0,18 s](pergaminho-Carta.jpg) | [8 p. / 0,17 s](pergaminho-A5.jpg) | [6 p. / 0,17 s](pergaminho-6x9.jpg) |
| Moderno | [5 p. / 0,16 s](moderno-A4.jpg) | [6 p. / 0,19 s](moderno-Carta.jpg) | [9 p. / 0,19 s](moderno-A5.jpg) | [6 p. / 0,18 s](moderno-6x9.jpg) |
| Minimalista | [5 p. / 0,16 s](minimalista-A4.jpg) | [6 p. / 0,18 s](minimalista-Carta.jpg) | [9 p. / 0,20 s](minimalista-A5.jpg) | [6 p. / 0,17 s](minimalista-6x9.jpg) |

O Guia do Condado de Valdris original gerou 9 páginas em 0,15 s. O corpus gerou 5 páginas em 0,20 s no Electron
com janela visível. O smoke usa janela oculta e leva cerca de 5 s devido à limitação de temporizadores do Chromium.
A rolagem permaneceu em 1000 px após alteração de texto; o novo texto apareceu na saída paginada.

Comandos principais: `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build` e os dois modos
`electron . --smoke --vault=…` / `electron . --smoke --write --vault=…`. Nesta instalação, foi necessário apontar
`ELECTRON_OVERRIDE_DIST_PATH` para o binário Electron já instalado na cópia principal. O teste de impressão inseriu
uma chamada temporária a `webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })` somente no
build descartável, restaurado depois; `pdfinfo` confirmou 5 páginas A4 e `pdftoppm` permitiu a inspeção visual.
