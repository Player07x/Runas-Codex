# ADR 0002 — Casca desktop em Electron, com a interface vinda de `app/`

- **Status:** aceita (2026-10-14)

## Contexto
A etapa 2 começa pelas cascas nativas. O plano ([02 — Viabilidade e etapas](../02-viabilidade-e-etapas.md)) já
escolheu Electron no Windows/Linux e Capacitor no Android, com a regra de que toda a lógica fica em TypeScript e a
casca só faz E/S em lote, sockets e integração com o sistema.

## Decisão
- Workspace `desktop/` com **Electron 44 + electron-vite 5**, o mesmo par do RunasVTT
  ([ADR 0007 do RunasVTT](https://github.com/Player07x/RunasVTT/blob/main/docs/adr/0007-electron.md)).
- O renderer do electron-vite aponta para `app/` (`root: ../app`): não há cópia da interface. O app continua um
  app web puro, que também vai para o GitHub Pages e, depois, para o Capacitor.
- Janela com `contextIsolation`, `sandbox` e sem `nodeIntegration`; sem janelas novas nem navegação para fora.
- O preload expõe só `window.runasCodex` (tipos em `app/src/platform/bridge.ts`). O processo principal aceita
  pedidos apenas da janela do app.
- O cofre é uma pasta escolhida pelo usuário e lembrada em `userData/config.json` (`~/.config/runas-codex` no Linux,
  `%APPDATA%\runas-codex` no Windows). Leitura em lote; caminhos absolutos, `..` e links simbólicos para fora do
  cofre são recusados.
- **Somente leitura até a etapa 3a:** `writeText` recusa sempre. Abrir um cofre não altera nenhum byte.
- `electron . --smoke --vault=<pasta> [--shot=<png>]` abre o app, confere ponte, recusas e o leitor de Notas, e sai.

## Consequências
- No navegador o app usa a plataforma em memória (`createMemoryPlatform`) e os dados de exemplo; no desktop, o
  módulo Notas lê o cofre real. Os outros módulos seguem com dados de exemplo até as etapas deles.
- Instaladores (electron-builder), CSP rígida e o Capacitor ficam para os próximos blocos da etapa 2.
