# 00 — Estudo: o que já temos e o que os outros fazem

> Base da [checklist de recursos](01-checklist-recursos.md) e do [plano de viabilidade](02-viabilidade-e-etapas.md).
> Pesquisa feita em 13/10/2026. Recursos de produtos de terceiros mudam com frequência; confira as fontes no fim.

## Sumário

1. [Runas-Core hoje](#1-runas-core-hoje)
2. [RunasVTT hoje](#2-runasvtt-hoje)
3. [O que dá para reaproveitar](#3-o-que-dá-para-reaproveitar)
4. [Produtos estudados](#4-produtos-estudados)
5. [Os quatro sites indicados](#5-os-quatro-sites-indicados)
6. [Lições para o Runas-Codex](#6-lições-para-o-runas-codex)
7. [Fontes](#7-fontes)

---

## 1. Runas-Core hoje

Monorepo `runas-suite` com três apps web (Next/React 19, hospedados no Cloudflare Pages) e quatro pacotes.
Não há Electron, Capacitor nem Tauri.

### Runas DM (`apps/runas-dm`) — wiki, campanhas, bestiário e mesa

| Área | O que existe | Limites atuais |
|---|---|---|
| **Wiki** | 7 seções fixas (Cronologia, História, Geografia, Personagens, Criaturas, Itens, Organizações); tags com emoji e cor; várias wikis; histórias como lista ordenada de acontecimentos | Seções fixas; tags só no frontmatter (não lê `#tag` no texto) |
| **Cronologia** | Gerenciador de eras e linha do tempo do universo; dois calendários (C.E. e Logi, `4027 C.E. = 0 Logi`); era deduzida do ano | Só **ano** (sem mês/dia/lua); calendário **fixo no código** (`app/lib/chronology.ts`) para o cenário Ordem x Caos |
| **Campanhas** | História, Mundo (locais, organizações, itens, personagens), Aventura (missões e eventos com 7 status e ordem narrativa; encontros com o bestiário), Notas (agrupadas por tag), Estilo (cores, capa), Gráfico, Organizador (canvas SVG com nós e setas) | Sessão é só uma tag; Organizador não salva como `.canvas` |
| **Links** | `[[Título]]`, `[[Título|apelido]]`, autocomplete ao digitar `[[`, prévia com **Alt + hover**, links manuais na barra lateral, backlinks calculados | `[[nota#título]]` ignora o título; backlinks **não clicáveis**; sem aliases, blocos `^id`, transclusão |
| **Gráfico** | Layout de força próprio em SVG, filtro por texto/tag/tipo, zoom, arrastar, clicar para abrir | Sem gráfico local, grupos de cor, profundidade; SVG trava com milhares de nós |
| **Busca** | Por seção, por tag, no gráfico | Sem busca global, sem operadores, sem templates |
| **Obsidian** | Sincronização **bidirecional** com uma pasta real (File System Access API), a cada 30 s e ao salvar; lista de pastas permitidas; nome do arquivo = título; frontmatter `runas_*` preservando chaves desconhecidas; cópias de conflito; backup antes de sobrescrever | Só funciona no **Chrome/Edge desktop**; parser Markdown **caseiro**: sem tabelas, listas aninhadas, H4+, rodapés, destaque, tachado, tarefas, callouts (viram citação), transclusão, `.canvas`, Dataview |
| **Editor** | `contentEditable` + `execCommand` | Frágil; não é Markdown nativo |
| **Backup** | Nuvem (Cloudflare D1) versionada, com 10 checkpoints, proteção contra encolher dados; modo local que desliga a nuvem | Depende de internet |
| **Bestiário / Mesa** | Fichas por sistema, encontros, iniciativa, testes e dano com regras do `@runas/core` | **Fora de escopo** por enquanto |

### Runas Book (`apps/runas-book`) — livros de regras

- Livros → capítulos → entradas (regra ou ficha) + páginas livres; conteúdo de exemplo embutido (~1,2 MB).
- Editor `contentEditable` com H1–H3, citação, negrito, itálico, sublinhado, tachado, 6 tamanhos de fonte,
  alinhamento (inclusive justificado), listas, links, `[[wikilinks]]` dentro do mesmo livro, imagens com largura e
  alinhamento, **tabelas** (8×8, adicionar/remover linhas e colunas, cabeçalho, 4 estilos).
- Exporta **PDF** (pdfmake: capa, sumário, cabeçalho corrente, numeração) e **DOCX** (docx: sumário nativo), cartões
  de recurso, e envia para a pasta `Livros/` do cofre.
- Exportação para o Obsidian é **de mão única** (`Runas Book/<livro>/<capítulo>/<slug>.md`).
- Não tem: rodapés, colunas, quebra de página manual, callouts, temas estilo Homebrewery, EPUB/HTML.

### Runas Tools (`apps/runas-tools`) — fichas

Fichas do Livro Azul e de Sagas de Cronos, galeria de fichas, calculadoras, criador de cartas. **Fora de escopo.**

### Pacotes

- `@runas/core`: tipos e cálculos de personagem (regras). `createId` funciona fora de contexto seguro.
- `@runas/vtt-bridge`: contrato `window.runasVTT` com o RunasVTT (importar personagens, tokens, log).
- `@runas/cronos-core`: regras de **Sagas de Cronos** — não é um calendário.
- `@runas/ruleset-contracts`: lista de sistemas (`runas-blue`, `cronos`).

### Planejado e não feito (docs do Runas-Core)

Organizador → `.canvas`; editor de ficha Cronos no bestiário; calculadora de itens; script de limpeza do cofre
(norma escrita em `docs/obsidian-vault-organization.md`, sem implementação); limites conhecidos do importador
(anos das eras não ficam no `.md`, eventos importados em ordem alfabética).

---

## 2. RunasVTT hoje

Electron 44 + React 19 + PixiJS 8, versão 0.3.5. O **mestre** é a fonte da verdade; jogadores entram por uma página web
servida pelo próprio app.

| Área | O que existe |
|---|---|
| **Mundo** | Pasta com `world.json` + `world.db` (SQLite nativo do Node, tabela genérica `documents`) + `assets/` por hash (deduplicados, até 200 MB por arquivo) |
| **Cenas** | Várias cenas, mapa de fundo, cor, transmitir uma cena diferente da que está sendo editada |
| **Grade** | Quadrada, hex (linhas/colunas) ou nenhuma; tamanho e deslocamento; distância por célula; regra de diagonal; cor e opacidade |
| **Tokens** | Imagem com contorno, tamanho, rotação, espelhar, elevação, até 3 barras, nome oculto, oculto, travado, disposição, visão no escuro, luz carregada, texto flutuante de dano |
| **Ferramentas** | Seleção (com caixa e snap), régua, desenho (retângulo, elipse, livre, texto), nota de mapa (só **URL**), paredes/portas/portas secretas, luzes, sons de mapa, regiões, tiles acima/abaixo |
| **Luz e névoa** | Visão por raycast nas paredes, escuridão 0–100 %, luz global, **névoa dinâmica** com área explorada lembrada, "ver como os jogadores" |
| **Regiões** | Retângulo/elipse com gatilhos: teleporte (até para outra cena), mensagem, terreno difícil |
| **Áudio** | Playlists em canais (música, ambiente, efeitos), sequencial/aleatório/soundboard, fade, sons posicionais abafados por paredes, sincronia para quem entra atrasado |
| **Jogadores** | Página web na LAN com QR code ou pela internet via **Cloudflare Quick Tunnel**; chave aleatória por sessão; **assentos** com código (1–12 jogadores); jogador move o próprio token (validado no servidor); câmera própria com pinça; régua do mestre visível; segunda tela/TV |
| **Backup** | Exportar/importar mundo em ZIP (até 4 GB, sem ZIP64), snapshots automáticos e manuais (15 últimos) |
| **Integração** | Navegador embutido com as 3 páginas da Suite e cópia offline delas; ficha do jogador servida pela sala |

**Não tem:** rolador de dados, chat, iniciativa, condições, auras, templates de área, alvo, desfazer/refazer, alças de
redimensionar, pincel de névoa manual, handouts, biblioteca de ativos, cartas, tabelas roláveis, macros, A/V, níveis,
interface do mestre no celular. Pendências registradas: túnel pela porta 443, ZIP64, desempenho de visão em mapas
grandes, testes com clientes iPhone/Windows/estrangeiros.

---

## 3. O que dá para reaproveitar

| De onde | Módulo | Uso no Runas-Codex |
|---|---|---|
| RunasVTT | `src/shared/grid.ts`, `vision.ts`, `region.ts`, `audio.ts`, `scene.ts`, `world.ts` | Lógica pura do VTT, sem dependência de plataforma |
| RunasVTT | `src/shared/player.ts` (`projectScene`, protocolo), `reconnect.ts` | Fronteira de segurança da sala e reconexão |
| RunasVTT | `src/renderer/src/canvas/SceneView.ts` (~1.450 linhas Pixi), `vision-layer.ts`, `audio-engine.ts` | Renderização da mesa (modos mestre e espectador) |
| RunasVTT | `src/main/player-server.ts`, `player-transmission.ts`, `player-session.ts`, `player-moves.ts`, `cloudflared.ts`, `network-address.ts` | Servidor da sala no desktop |
| RunasVTT | `src/main/world-backup.ts`, `zip.ts` | Backup e pacote de mesa (trocar por ZIP64) |
| Runas DM | `app/lib/obsidian-sync.ts` — interface **`VaultAdapter`** | Modelo da interface de cofre por plataforma |
| Runas DM | `wiki-links.ts`, `knowledge-model.ts`, `tag-normalization.ts`, `knowledge-tags.ts` | Resolução de links e normalização de tags |
| Runas DM | `vault-data.ts`, `snapshot-policy.ts`, `conflict-copies.ts` | Gravação segura, snapshots, conflitos |
| Runas DM | `components/knowledge-graph.tsx`, `graph-wheel.ts` | Ponto de partida do gráfico (refazer em WebGL) |
| Runas DM | `chronology.ts` | Vira o **primeiro calendário de exemplo** (C.E./Logi + eras) |
| Runas Book | `app/lib/book-export/*` (pdfmake, docx) | Exportação DOCX; PDF passa a sair da prévia paginada |

**Não portar:** `extraFrontmatterLines` (`obsidian-sync.ts`) perde objetos aninhados, coloca aspas em tudo e troca
CRLF por LF — reescreveria todos os arquivos do cofre. O parser Markdown e os editores `contentEditable` também são
substituídos.

---

## 4. Produtos estudados

### VTTs

| Produto | Destaques que o RunasVTT não tem | Lição |
|---|---|---|
| **Foundry VTT** (v13/v14) | Rolador e chat, combate/iniciativa, condições, templates de área, journal com pinos no mapa, regiões com comportamentos (armadilha, música, abrir nota), tabelas roláveis, cartas, macros, compêndios, níveis de cena (v14), janelas destacáveis, módulos | O padrão de mercado é "mesa + diário + automação"; módulos mostram o que a comunidade sente falta |
| **Roll20** | Iluminação dinâmica (visão noturna, luz colorida, direcional), Jukebox (loop, aleatório, simultâneo), rolagens inline, sussurros, handouts, login Discord | Rolagem integrada ao texto é muito usada |
| **Owlbear Rodeo 2** | Simplicidade, névoa desenhada com "preencher o resto", névoa dinâmica em extensões e depois nativa, detecção automática de névoa (2.4), economia de armazenamento, extensões | Interface mínima vence; extensões dão fôlego |
| **Alchemy RPG** | Cenas cinemáticas: fundo animado, sobreposições de movimento, trilha com intensidade, ambiente — "teatro da mente" | Mesa sem grade também é mesa; não é otimizado para celular |
| **Shard Tabletop** | Watch Mode: câmera segue o turno para transmissão | Modo espectador/stream |
| **Quest Portal** | App iOS/Android com fichas e notas, cenas com música pré-carregada, assistente de IA | Mobile é diferencial, mas depende de nuvem |
| **Fantasy Grounds / TaleSpire** | Automação pesada de regras (FG); mesa 3D (TS) | Fora do nosso foco (fichas/3D) |

### Organizadores e worldbuilding

| Produto | Destaques que o Runas DM não tem | Lição |
|---|---|---|
| **Obsidian** (1.9–1.10) + plugins TTRPG | Links completos (blocos, transclusão, aliases), gráfico global/local, **Bases** (tabela/cartões/lista, fórmulas, agrupamento, mapa), Canvas, templates, notas diárias; plugins: Initiative Tracker, Fantasy Statblocks, Leaflet (mapas), Calendarium (calendários fictícios), Dice Roller, Dataview, Full Calendar | É o formato que queremos manter; a comunidade TTRPG monta "campanhas" com 10+ plugins — dá para entregar isso pronto |
| **World Anvil** | Ver [seção 5](#world-anvil) | Melhor referência de wiki para RPG |
| **Kanka** | Entidades tipadas muito integradas (missões, calendário, personagens), **calendários** com lembretes, calendário-filho com "hoje" próprio, avanço automático do dia | Calendário integrado às entidades |
| **LegendKeeper** | Wiki + mapas com pinos + **Boards** (quadro com cartões de página) + linhas do tempo com vários calendários; segredos; exporta mini-site HTML; não é feito para celular | Canvas com cartões de nota é muito pedido; export HTML é bem-visto |

### Livros e escrita

| Produto | Destaques | Lição |
|---|---|---|
| **Homebrewery / GM Binder** | Markdown com páginas e colunas (`\page`, `\column`/`\columnbreak`), blocos `{{nota}}`, `{{monster,frame,wide}}`, temas de manual de RPG, prévia paginada ao lado | Formatação de livro de RPG em Markdown é viável e popular |
| **Scrivener** | Binder de capítulos, cortiça, snapshots, modo foco, compilação para vários formatos | Fluxo de escrita longa |
| **Campfire** | Ver [seção 5](#campfire) | — |

---

## 5. Os quatro sites indicados

### Nuckturp — "QG do Mestre"

Gerenciador web para mestres (plano básico gratuito), baseado no método "Mestre Metódico".

- **Dashboard:** próxima sessão com **contagem regressiva**, campanhas ativas com progresso, notas recentes, atalhos.
- **Campanhas** com sessões e arcos; **sessões em cartões** com status (planejada, concluída) e campanha vinculada.
- **Agenda de sessões** com visões semana/mês e **checklist de preparação**.
- **Jogadores e personagens:** cadastro, inventário, relações, **presença por sessão**.
- **Diário do mestre:** notas de sessão, NPCs, locais e lore, com categorias e busca.
- **Quadro de ideias:** canvas infinito com notas coloridas, imagens e conectores.
- **Gerador de aventuras** (ganchos, encontros, NPCs) por rolagem; **rolador de dados** com histórico.
- **Preparador de sessão com IA:** perguntas reflexivas → revisão → checklist.
- **Avaliação do mestre:** formulário **NPS anônimo** por sessão para os jogadores.
- Não tem: VTT, mapas, wiki, offline, app mobile, import/export.

**Para nós:** dashboard com contagem regressiva, sessão como entidade com presença, preparação guiada (sem IA, por
roteiro offline) e avaliação anônima — que pode ser enviada pela sala do VTT.

### World Anvil

Plataforma web de worldbuilding e campanha (sem app, sem offline).

- **25+ modelos de artigo** com perguntas-guia (construções, personagens, condições, guerras, países, documentos,
  etnias, locais, itens, idiomas, materiais, mitos, leis naturais, religiões, cidades, magias, tecnologia, veículos…).
- **Segredos** e **marcadores de spoiler**; controle de quem vê o quê (grupos de leitores/jogadores).
- **Mapas interativos** com marcadores, **camadas** e **mapas ligados a mapas** (mundo → cidade → masmorra);
  criar artigo direto do pino.
- **Linhas do tempo** paralelas com eras; **Crônicas** (mapa muda conforme o ponto da linha do tempo); calendários.
- **Árvores genealógicas e linhagens**, **organogramas**, **teias diplomáticas** entre facções.
- **Tabelas roláveis** pesquisáveis e encadeadas.
- **Storyteller Screen**: tela do mestre com notas, lore e statblocks durante o jogo.
- Linkar digitando **`@`**; criar artigo a partir de link novo (vai para a **lista "a fazer"**); categorias aninhadas,
  artigo dentro de artigo, sumário.
- **Metas de contagem de palavras**, música e efeitos sonoros embutidos em artigos, manuscritos (escrita de livro).
- Gerenciador de campanha: preparar → jogar → registrar consequências na linha do tempo.

**Para nós:** é a principal referência da seção Wiki da checklist.

### Campfire

App de escrita e worldbuilding (navegador, desktop Windows/Mac com offline, celular "CF Creators" que **exige
internet**).

- Módulos: Personagens, **Relações** (teia visual), Arcos, **Linha do tempo** (várias, paralelas), **Calendário**,
  **Mapas** (pinos, **zonas**, decorações, **escala**, **bússola**, **régua de distância**), Enciclopédia, Magia,
  Espécies, Culturas, **Idiomas** (dicionário, fonética), Religiões, Filosofias, Sistemas (fluxograma), Itens,
  Pesquisa.
- **Manuscrito**: editor com painel lateral das notas, marcação de elementos da história no texto, visão de
  **cartões/cortiça**, **metas de palavras** e estatísticas.
- Colaboração, link somente leitura, **exporta PDF, DOCX, HTML e RTF**.
- Play Store: 3,1★–3,3★; reclamações de **lentidão/travamento** em projetos (corrigidas em 2024 segundo o
  desenvolvedor) e **falta de português** (há "Language" nas configurações sem opções).

**Para nós:** módulos de escrita (cortiça, metas, painel lateral) e mapas com escala/zonas; desempenho no celular é
requisito, não detalhe.

### RPG Notes

App Android gratuito (com anúncios), 100 mil+ downloads, 4,7★ com ~6 mil avaliações.

- Campanha com **objetos por categoria** (cidades, personagens, missões…), cada um com descrição, notas, tags,
  imagens e **links para outros objetos**.
- **Diário de aventura** por campanha.
- **4.500+ ícones** embutidos; **gerador de nomes**; compartilhar notas; busca.
- Vem com uma **campanha de exemplo**.
- Reviews: **sem português**; o gerador de nomes **não tem nomes brasileiros**; gente usa para organizar o dia a dia e
  projetos artísticos (tags e ícones ajudam).

**Para nós:** ícones para notas/pastas, gerador de nomes com nomes brasileiros, campanha de exemplo, e a confirmação
de que o "bloco de notas geral" tem público.

---

## 6. Lições para o Runas-Codex

1. **Ninguém junta tudo:** VTT + wiki + livro + agenda + **offline** + **formato Obsidian** não existe num app só.
   É o diferencial.
2. **Português é uma lacuna real:** RPG Notes e Campfire têm reclamações explícitas por falta de pt-BR.
3. **Desempenho no celular** é a reclamação nº 1 (Campfire). Cofres grandes precisam ser fluidos desde o início.
4. **Offline de verdade é raro:** World Anvil, Kanka, LegendKeeper, Nuckturp e o Campfire mobile dependem de internet.
5. **IA exige internet** (Nuckturp, Quest Portal). No Runas-Codex, a preparação guiada vira roteiro offline; IA local
   fica como possibilidade futura.
6. **Calendário fictício integrado** (Kanka, World Anvil, Calendarium) é muito valorizado; o nosso precisa calcular
   datas sozinho (pedido explícito).
7. **Canvas com cartões de nota** aparece em LegendKeeper, Nuckturp e Obsidian — o Organizador atual do Runas DM já
   aponta nessa direção; basta salvar como `.canvas`.
8. **A comunidade TTRPG do Obsidian** monta campanhas com Initiative Tracker, Fantasy Statblocks, Leaflet, Calendarium,
   Dice Roller e Dataview. Entregar esses recursos prontos, no mesmo formato de arquivo, é um bom argumento.

---

## 7. Fontes

Sites indicados:
- Nuckturp — https://nuckturp.com.br/
- World Anvil — https://www.worldanvil.com/ · https://www.worldanvil.com/features/dnd-campaign-manager ·
  https://kindlepreneur.com/world-anvil/
- Campfire — https://play.google.com/store/apps/details?id=com.campfiremobile · https://www.campfirewriting.com/apps ·
  https://reedsy.com/blog/guide/book-writing-software/campfire-write-review/
- RPG Notes — https://play.google.com/store/apps/details?id=com.crystalpeak.rpgnotes

Demais produtos:
- Foundry VTT — https://foundryvtt.com/releases/13.346 · https://foundryvtt.com/article/v14-patreon-vote/ ·
  https://foundryvtt.com/packages/enhanced-region-behavior
- Owlbear Rodeo — https://blog.owlbear.rodeo/ · https://extensions.owlbear.rodeo/dynamic-fog ·
  https://docs.owlbear.rodeo/docs/migration/migrate-from-1-to-2/
- Roll20 — https://pages.roll20.net/dynamic-lighting · https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log ·
  https://blog.roll20.net/posts/jukebox-plus/
- Alchemy RPG — https://alchemyrpg.com/ · https://startplaying.games/blog/virtual-table-tops/the-new-players-guide-to-alchemy-rpg
- Shard Tabletop — https://www.shardtabletop.com/about
- Quest Portal — https://www.questportal.com/blog/july2024-newsletter
- Obsidian — https://obsidian.md/changelog/2025-05-21-desktop-v1.9.0 · https://obsidian.md/changelog/2025-10-01-desktop-v1.10.0/ ·
  https://community.obsidian.md/plugins/initiative-tracker · https://plugins.javalent.com/ ·
  https://community.obsidian.md/plugins/obsidian-full-calendar
- Kanka — https://kanka.io/comparison · https://docs.kanka.io/en/latest/entries/calendars.html
- LegendKeeper — https://legendkeeper.com/boards-announcement · https://legendkeeper.com/tackling-time ·
  https://www.legendkeeper.com/best-world-anvil-alternatives/
- Homebrewery / GM Binder — https://www.gmbinder.com/share/-LAr5-xgITkjNx22PQKu · https://www.obsidianstats.com/plugins/brewvault
- Tauri × Capacitor (para a escolha de stack) —
  https://alternativeto.net/news/2024/10/tauri-2-0-enhances-cross-platform-app-development-with-mobile-support-and-improved-plugins ·
  https://capawesome.io/docs/blog/announcing-the-capacitor-tauri-platform/

Fantasy Grounds, TaleSpire e Scrivener: conhecimento geral, sem consulta nesta pesquisa.
