# ADR 0003 — Instaladores, Android com Capacitor e CSP

- **Status:** aceita (2026-10-14)

## Contexto
O marco da etapa 2 é "instaladores abrem nos três sistemas". O desktop já existe (ADR 0002); faltavam o
empacotamento, o app Android e a política de conteúdo prevista no plano (HTML de notas importadas não pode rodar
script).

## Decisão
**Desktop (electron-builder 26, mesma configuração base do RunasVTT)**
- Linux: `.deb` e AppImage (x64). Windows: instalador NSIS (x64), com escolha de pasta e atalhos.
- Ícone: a runa do Runas DM em 512 px (`desktop/build/icon.png`), a mesma arte da `runa.png` da interface.
- Sem dependências de produção: o `out/` empacotado só usa módulos do Node e do Electron.

**Android (Capacitor 8.5.2, workspace `mobile/`)**
- `webDir: ../app/dist`: o APK leva o mesmo build do navegador e do desktop. `appId` `dev.runas.codex`.
- Versão lida do `package.json` da raiz (`1.2.3` → `versionCode` 10203).
- `allowBackup="false"`: nada do app vai para o backup em nuvem do Android (o app é 100% offline).
- Tela de ponta a ponta (`SystemBars.insetsHandling: "css"`); a casca do app respeita `env(safe-area-inset-*)`.
- Ícones adaptativos e tela de abertura com a runa sobre o fundo Órbita.
- **O APK é gerado só no GitHub Actions** (a máquina de desenvolvimento não tem JDK nem SDK do Android). Por ora é
  o APK de depuração; o de release assinado exige uma chave guardada nos segredos do repositório. Trocar de um para o
  outro pede desinstalar o app uma vez (assinaturas diferentes).
- No Android o app ainda usa os dados de exemplo; acesso ao cofre é o primeiro teste técnico da etapa 2.

**CSP** (`app/csp.ts`), gravada no `index.html` só nos builds (o servidor de desenvolvimento precisa de script
inline): `default-src 'self'`, `script-src 'self'`, sem `object`, `frame`, `base-uri` nem `form-action`; imagens só
do app, `data:` e `blob:`; `style-src` aceita inline por causa do dialeto (`<span style>`). Vale no Pages, no Electron
(`file://`) e no Capacitor (`https://localhost`). A conexão com a sala do VTT entra na etapa 4.

**Workflow `release.yml`**
- Em PRs e execução manual: gera `.deb`, AppImage, `.exe` e APK como artefatos, com smoke do app empacotado (Linux)
  e do Electron (Windows) contra `desktop/tests/cofre-exemplo`.
- Numa tag `v<versão>`: confere a tag com as versões de `package.json`, `desktop/` e `mobile/` e publica uma Release
  com os quatro arquivos e `SHA256SUMS.txt`. Tags com `-` (ex.: `v0.1.0-beta.1`) saem como pré-lançamento.

## Consequências
- Para lançar: `npm version <x.y.z> --workspaces --include-workspace-root`, commit, tag `v<x.y.z>` e push da tag.
- Instaladores sem assinatura de código: o Windows mostra o aviso do SmartScreen e o Android pede "fontes
  desconhecidas".
- O `npm audit` aponta dois avisos moderados só em ferramentas de build que não entram nos instaladores
  (`sprintf-js` via `electron-builder`, `uuid` via ferramentas de iOS do `@capacitor/cli`); a "correção" sugerida
  rebaixaria as versões.
