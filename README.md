# Runas-Codex

[![CI](https://github.com/Player07x/Runas-Codex/actions/workflows/ci.yml/badge.svg)](https://github.com/Player07x/Runas-Codex/actions/workflows/ci.yml)
[![Pages](https://github.com/Player07x/Runas-Codex/actions/workflows/pages.yml/badge.svg)](https://player07x.github.io/Runas-Codex/)

App único, **offline**, para **Windows, Linux e Android**, que junta os projetos da Runas Suite: um organizador de
notas Markdown **compatível com o Obsidian** (links, backlinks, gráfico), **Notas**, **Agenda**, **Wiki** (com
calendários fictícios), **Campanhas**, **Livros** e um **VTT** (Criar Sala / Entrar Sala). O único recurso online é a
conexão com uma mesa do VTT.

Fase atual: **etapa 1, protótipo visual**. Os dados são fictícios e nada é gravado em disco.

**Ver o protótipo sem instalar nada:** https://player07x.github.io/Runas-Codex/ (abre no PC e no celular).

## Documentos

1. [Estudo](docs/00-estudo.md) — o que já existe no Runas-Core e no RunasVTT e o que os outros gerenciadores e VTTs fazem.
2. [Checklist de recursos](docs/01-checklist-recursos.md) — validada com os 283 itens.
3. [Viabilidade e etapas](docs/02-viabilidade-e-etapas.md) — stack, arquitetura, riscos e plano de etapas.

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

## Comparar os designs

A faixa **Lab de design** alterna entre o original e duas propostas navegáveis:

- **Atlas**: estilo editorial, papel claro e verde, navegação lateral e checklist de preparação.
  Abra `http://localhost:5180/?design=atlas`.
- **Órbita**: estilo escuro, lavanda, navegação lateral à esquerda e destaque visual da campanha.
  Abra `http://localhost:5180/?design=orbita`.

Ambos mantêm acesso aos seis módulos e oferecem navegação inferior no celular. O seletor mantém
a tela atual ao trocar de design. Os links diretos abrem Atlas em tema claro e Órbita em tema escuro;
o botão de tema também permite comparar as variações clara e escura.

As novas capturas rápidas mantêm apenas rascunhos temporários na tela. O checklist de Atlas é
interativo, mas independente da preparação no módulo Campanhas. Nenhuma dessas ações grava no cofre.

Veja a inspeção e as verificações em [Comparação dos protótipos](docs/03-comparacao-prototipos.md).
As imagens de referência estão em `app/previews/` e o código das propostas em `app/src/prototypes/`.

`npm run build` gera a versão estática em `app/dist/` (abre de qualquer pasta).

## Estrutura

```
app/                      protótipo (React 19 + TypeScript + Vite) — vira a interface real na etapa 2
  src/platform/           interface Platform (Electron/Capacitor) + versão em memória
  src/data/               dados fictícios (wiki, notas, campanhas, agenda, livros, mesas)
  src/lib/                links/backlinks, calendário fictício, dados, gráfico, rotas
  src/components/         casca (barra lateral, barra inferior, paleta), Markdown, editor, painéis
  src/screens/            uma pasta por módulo: wiki, campaigns, books, vtt…
docs/                     estudo, checklist e plano
```
