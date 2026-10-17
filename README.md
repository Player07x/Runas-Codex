# Runas-Codex

[![CI](https://github.com/Player07x/Runas-Codex/actions/workflows/ci.yml/badge.svg)](https://github.com/Player07x/Runas-Codex/actions/workflows/ci.yml)
[![Pages](https://github.com/Player07x/Runas-Codex/actions/workflows/pages.yml/badge.svg)](https://player07x.github.io/Runas-Codex/)
[![Release](https://github.com/Player07x/Runas-Codex/actions/workflows/release.yml/badge.svg)](https://github.com/Player07x/Runas-Codex/actions/workflows/release.yml)

App único, **offline**, para **Windows, Linux e Android** (independente da Runas Suite, da qual só reaproveita código —
[ADR 0004](docs/adr/0004-independente-da-runas-suite.md)): um organizador de
notas Markdown **compatível com o Obsidian** (links, backlinks, gráfico), **Notas**, **Agenda**, **Wiki** (com
calendários fictícios), **Campanhas**, **Livros** e um **VTT** (Criar Sala / Entrar Sala). O único recurso online é a
conexão com uma mesa do VTT.

Fase atual: **etapas 3a, 4, 3b, 5 e 6 concluídas** (a 8, Livros, está em andamento). O módulo **Notas** cria, edita,
renomeia (atualizando os links do cofre) e manda para a lixeira notas de um cofre compatível com o Obsidian, com
backups e sem regravar o que não mudou ([ADR 0005](docs/adr/0005-nucleo-de-notas.md)). O editor tem os três modos do
Obsidian (leitura, live preview e código), todos os formatadores do dialeto, transclusão, anexos, modelos e o gráfico
em WebGL ([ADR 0007](docs/adr/0007-editor-completo.md)). A **Agenda** guarda os eventos como notas no formato do plugin
Full Calendar, com recorrência, lembretes no desktop e no Android, `.ics` e ligação com as sessões
([ADR 0008](docs/adr/0008-agenda.md)). A **Wiki** tem artigos por tipo com ficha, calendários fictícios com datas
calculadas (idade, dia da semana, luas, eras), linha do tempo, mapas com pinos e relações com árvore genealógica,
organograma e teia diplomática ([ADR 0010](docs/adr/0010-wiki.md)). O **VTT** tem mesas no cofre, a mesa do mestre e a
sala para os jogadores ([ADR 0006](docs/adr/0006-mesa-vtt.md)). Campanhas ainda usa dados de exemplo.

O que ainda falta conferir à mão está em [Testes pendentes](docs/04-testes-pendentes.md).

**Ver a versão web (dados de exemplo) sem instalar nada:** https://player07x.github.io/Runas-Codex/ (abre no PC e no celular).

## Documentos

1. [Estudo](docs/00-estudo.md) — o que já existe no Runas-Core e no RunasVTT e o que os outros gerenciadores e VTTs fazem.
2. [Checklist de recursos](docs/01-checklist-recursos.md) — validada com os 283 itens.
3. [Viabilidade e etapas](docs/02-viabilidade-e-etapas.md) — stack, arquitetura, riscos e plano de etapas.
4. [Comparação dos protótipos](docs/03-comparacao-prototipos.md) — Original, Atlas e Órbita (histórico).
5. [Testes pendentes](docs/04-testes-pendentes.md) — o que conferir à mão em cada etapa.
6. [Decisões de arquitetura](docs/adr/) — ADRs numeradas.
7. [Tarefas em andamento](docs/tarefas/README.md) — quem faz o quê; as regras para agentes estão no [AGENTS.md](AGENTS.md).

## Abrir o protótipo

Precisa do Node 24 (instalado em `~/.local/opt/node`; entra no PATH a partir do próximo login, ou rode
`source ~/.profile` no terminal).

```bash
npm install
npm run dev
```

Abre em http://localhost:5180.

No celular, no mesmo Wi-Fi: rode `npm run dev:rede` e abra no celular o endereço “Network” que o Vite mostrar
(ex.: `http://192.168.1.9:5180`).

## Design: Órbita

O visual oficial é o **Órbita**: grafite e lavanda no tema escuro (padrão), com variação clara no botão de tema,
barra lateral recolhível no computador e barra inferior no celular. A página inicial destaca a próxima sessão da
campanha. A escolha está registrada na [ADR 0001](docs/adr/0001-design-orbita.md); a comparação com as outras
propostas (Original e Atlas) fica em [Comparação dos protótipos](docs/03-comparacao-prototipos.md) e no primeiro
commit do repositório.

`npm run build` gera a versão estática em `app/dist/` (abre de qualquer pasta).

## App desktop (Windows e Linux)

```bash
npm run desktop
```

Abre o Runas-Codex numa janela própria (Electron). Em **Configurações › Cofre**, **Criar cofre** prepara uma pasta vazia
com os espaços (`Notas/`, `Wikis/`, `Campanhas/`…); **Abrir pasta…** abre um cofre do Obsidian que já existe, em
**somente leitura** até você ligar **Permitir gravação** (um backup é feito antes). No navegador, o módulo Notas usa um
cofre de exemplo em memória: dá para editar, mas nada é salvo.

A nota **Notas/Formatadores.md** do cofre de teste (`desktop/tests/cofre-exemplo`) mostra todos os formatadores. Para
o Obsidian mostrar callouts, colunas e capitulares como o app, use **Configurações › Compatibilidade com o Obsidian ›
Snippet runas-codex.css › Instalar** e ligue o snippet no Obsidian (Aparência › Trechos de CSS).

Outros comandos: `npm run typecheck`, `npm test` e `npm run desktop:build`.
Teste rápido sem abrir janela: `npm run smoke -w @runas-codex/desktop -- --vault=/caminho/do/cofre` (com `--write`, testa
as gravações numa cópia temporária). Ida e volta num cofre real, só lendo: `RUNAS_CORPUS=/caminho npm test -w @runas-codex/app`.

## Mesa (VTT)

Em **VTT › Criar Sala › Criar Nova**, a mesa é criada dentro do cofre (`.runas/mesas/`, precisa da gravação liberada).
Na mesa, o painel **Sala** abre o servidor para os jogadores: um link para a rede local e, se você pedir, um link
público (túnel da Cloudflare). Cada assento tem um código; no token, **Controlado por** diz qual jogador o move.
Quem vai jogar usa **VTT › Entrar Sala** (ou abre o link no navegador do celular).

## Instaladores (Linux, Windows e Android)

Cada PR gera os instaladores no GitHub Actions (workflow **Release**, aba *Artifacts*): `.deb` e AppImage para
Linux, `.exe` para Windows e o APK para Android. Uma tag `v<versão>` publica tudo numa Release
([ADR 0003](docs/adr/0003-instaladores-e-android.md)).

- **Linux:** `npm run dist:linux -w @runas-codex/desktop` gera os dois em `desktop/release/`.
- **Windows:** `npm run dist:win -w @runas-codex/desktop` (num Windows).
- **Android:** o APK é montado no CI. No celular, baixe o `.apk`, permita instalar de "fontes desconhecidas" e
  abra. Por enquanto o Android mostra os dados de exemplo; o acesso ao cofre vem no próximo bloco.
  `npm run android` só atualiza o projeto Android (`mobile/android/`) com o build do app.

## Estrutura

```
app/                      interface (React 19 + TypeScript + Vite), a mesma no navegador, no desktop e no Android
  src/platform/           interface Platform: Electron, versão em memória e o provedor do cofre
  src/data/               dados fictícios (wiki, notas, campanhas, agenda, livros, mesas)
  src/core/               núcleo de notas: leitura, índice, links, renomear, propriedades (sem React, com testes)
  src/lib/                calendário fictício, dados de exemplo, gráfico, rotas
  src/components/         casca (barra lateral, barra inferior, paleta), Markdown, editor, painéis
  src/screens/            uma pasta por módulo: wiki, campaigns, books, vtt…
  src/vtt/                mesa (código do RunasVTT): cena Pixi, painéis, página dos jogadores (player.html)
desktop/                  casca Electron (Windows/Linux): processo principal, preload, testes e instaladores
  src/main/vtt/           serviços da mesa: documentos em JSON, visão, áudio, regiões, servidor da sala, túnel
mobile/                   casca Android (Capacitor): projeto Gradle em mobile/android/
docs/                     estudo, checklist, plano e ADRs
```


### Nova versão desktop — beta.5

X5, C6, X8 e W1 integradas, com pasta comum e renomeação de imagens, contadores reais e categorias da Wiki com arte,
busca, filtros e grade/lista. [Novidades e limites da beta.5](docs/releases/v0.1.0-beta.5.md).
O escopo desta entrega é Windows/Linux; Android permanece na tarefa complementar de revisão e nas frentes C8/X7.
