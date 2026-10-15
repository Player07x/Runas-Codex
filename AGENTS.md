# Regras do Runas-Codex para agentes de código

Este arquivo vale para qualquer agente (Codex, Claude Code…) que trabalhe neste repositório. A tarefa de cada um está
em [`docs/tarefas/`](docs/tarefas/README.md); **leia a sua tarefa inteira antes de começar.**

## O projeto

Runas-Codex: app **offline** para Windows, Linux e Android (React 19 + TypeScript + Vite; Electron no desktop,
Capacitor no Android). Núcleo: notas Markdown **compatíveis com o Obsidian**, mais Agenda, Wiki, Campanhas, Livros e
um VTT. Leia antes de mexer:

- [`docs/02-viabilidade-e-etapas.md`](docs/02-viabilidade-e-etapas.md) — arquitetura (seção 3), formato do cofre
  (seção 4), compatibilidade com o Obsidian e o **dialeto Markdown aprovado** (seção 5), etapas (seção 8).
- [`docs/01-checklist-recursos.md`](docs/01-checklist-recursos.md) — os recursos, com a origem de cada um.
- [`docs/adr/`](docs/adr/) — as decisões já tomadas (não as contrarie sem dizer por quê no PR).

## Ambiente e comandos

- Node 24 (`~/.local/opt/node/bin` no PC do dono; no seu ambiente, qualquer Node 24). `npm ci` na raiz instala os
  três workspaces: `app` (a interface), `desktop` (Electron) e `mobile` (Capacitor).
- Antes de abrir o PR, tudo isto precisa passar:

  ```bash
  npm run typecheck
  npm test
  npm run build
  npm run desktop:build
  ```

- Teste do app inteiro no Electron (precisa de tela; no Linux sem tela, use `xvfb-run -a`):

  ```bash
  cd desktop && npx electron . --smoke --vault="$PWD/tests/cofre-exemplo"
  cd desktop && npx electron . --smoke --write --vault="$PWD/tests/cofre-exemplo"
  ```

  Se não der para rodar no seu ambiente, diga no PR — o CI (workflow **Release**) roda os dois no Linux e no Windows.
- O app no navegador: `npm run dev` (http://localhost:5180), com um cofre de exemplo em memória.

## Regras de arquitetura (não quebre)

1. **Lógica em TypeScript puro** em `app/src/core/` (sem React, sem Electron), com testes `*.test.ts` ao lado. As
   telas ficam em `app/src/screens/`; os componentes compartilhados em `app/src/components/`.
2. **O app fala com o sistema só pela interface `Platform`** (`app/src/platform/platform.ts`), implementada para o
   Electron (`electron-platform.ts` + `desktop/`) e em memória (`memory-platform.ts`, navegador e testes). Nada de
   `fs`, `ipcRenderer` ou `window.runasCodex` nas telas.
3. **Toda gravação de nota passa pelo `useVault()`** (`app/src/platform/VaultProvider.tsx`): `createNote`, `save`,
   `rename`, `trash`, `setProperty`. Elas gravam com a versão lida (se o arquivo mudou fora do app, recusam), não
   regravam o que não mudou e atualizam o índice.
4. **Não altere a gravação segura** sem pedir na tarefa: `desktop/src/main/vault.ts`, `app/src/core/properties.ts`,
   `app/src/core/rename.ts`, `app/src/core/text.ts`, `app/src/core/parse.ts`, `app/src/core/vault-index.ts`.
5. **Compatível com o Obsidian:** tudo o que for nota é um `.md` que o Obsidian abre e mostra igual (com o snippet
   `runas-codex.css`). Propriedades no frontmatter; datas e horas **entre aspas** (`data: "2026-10-17"`). Dados que
   não são texto (estado de tela, preferências) não vão para o cofre; preferências por aparelho vão para o
   `localStorage` com chave `runas-codex:<nome>`.
6. **Nenhuma chamada de rede** fora da sala do VTT. A CSP (`app/csp.ts`) não ganha `unsafe-eval` nem domínios
   externos. Imagens e fontes vêm do próprio app ou do cofre.
7. **O dialeto Markdown é um só.** O leitor (`app/src/components/Markdown.tsx`, `app/src/markdown/blocks.ts`,
   `remark-obsidian.ts`, `styles/markdown.css`) e o live preview (`components/vault/live-preview.tsx`,
   `markdown/lezer-obsidian.ts`) são compartilhados por todos os módulos: **não mude como eles desenham**. Para
   acrescentar, use os pontos de extensão de `app/src/markdown/extensions.ts` (blocos ```` ```nome ```` desenhados)
   e CSS com escopo do seu módulo. Se precisar mesmo mudar o leitor, abra um PR pequeno só com isso e explique.
8. **Dependências:** versão exata (`--save-exact`), publicada há **mais de duas semanas**, sem script de instalação
   novo. Prefira o que o projeto já usa. Explique cada dependência nova no PR.
9. **Interface em português (pt-BR)**, no visual Órbita: cores pelas variáveis de `app/src/styles/tokens.css`
   (`--cyan`, `--gold`, `--panel`…), temas escuro e claro, funcionar a partir de 320 px de largura (celular) sem
   rolagem para os lados, alvos de toque de 44 px no celular.

## Arquivos compartilhados

Vários agentes trabalham ao mesmo tempo em módulos diferentes. Nestes arquivos, **só acrescente** (no fim de listas e
blocos), sem reescrever nem reordenar o que existe: `package.json`, `package-lock.json`, `app/src/App.tsx`,
`app/src/components/Shell.tsx`, `app/src/platform/platform.ts`, `bridge.ts`, `electron-platform.ts`,
`memory-platform.ts`, `desktop/src/main/index.ts`, `desktop/src/preload/index.ts`, `desktop/src/shared/ipc.ts`,
`desktop/src/main/smoke.ts`, `app/src/data/demo-vault.ts`, `README.md`, `docs/04-testes-pendentes.md`,
`app/src/screens/TransferScreen.tsx`, `.github/workflows/release.yml`, `mobile/capacitor.config.ts`,
`mobile/android/app/src/main/AndroidManifest.xml`, `MainActivity.java`.

## Fluxo de trabalho

- **Trabalhe numa cópia própria** do repositório (`git worktree add` ou outro clone), **nunca na pasta principal do
  dono** (`~/Documentos/GitHub/Runas-Codex`): outro agente pode estar trabalhando nela, e arquivos seus deixados lá
  acabam entrando no commit dele. Prefira uma pasta que não seja apagada ao reiniciar (evite `/tmp`).
- Um branch e um PR por fase da tarefa, a partir da `main` atualizada (nomes como `livros/8a-estrutura`).
- **Nunca** faça push na `main`, nunca mescle PR e nunca use `--force` em branch dos outros. Quem mescla é o dono.
- PR em português: o que mudou, como verificou (comandos e resultados) e **o que ficou sem verificar**. Imagens da
  tela ajudam muito em mudanças visuais.
- Se a `main` andar e der conflito, traga a `main` para o seu branch e resolva só o que é seu; nos arquivos
  compartilhados, mantenha as duas versões.
- Ao terminar uma fase, acrescente em `docs/04-testes-pendentes.md` o que o dono precisa conferir à mão.

## Estilo

- Comentários, mensagens, commits e textos da interface em português, no tom do código ao redor (comentários curtos
  que explicam o porquê).
- TypeScript estrito; sem `any`; nomes de componentes em inglês ou português como no arquivo vizinho.
- Testes descrevem o comportamento em português (`it("grava a ordem dos capítulos no livro", …)`).
