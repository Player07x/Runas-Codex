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
4. [Comparação dos protótipos](docs/03-comparacao-prototipos.md) — Original, Atlas e Órbita (histórico).
5. [Decisões de arquitetura](docs/adr/) — ADRs numeradas.

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
