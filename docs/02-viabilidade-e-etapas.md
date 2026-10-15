# 02 — Viabilidade e etapas

> Baseado no [estudo](00-estudo.md) e na [checklist](01-checklist-recursos.md). As estimativas mudam conforme os itens
> que você desmarcar.
>
> **Atualização (14/10/2026):** o Runas-Codex é independente da Runas Suite e só reaproveita código dela
> ([ADR 0004](adr/0004-independente-da-runas-suite.md)): sem migrar o cofre do Runas DM, sem importar mundos do
> RunasVTT e sem ponte com os sites. O dialeto Markdown da seção 5 foi aprovado.

## Sumário

1. [Veredito](#1-veredito)
2. [Stack](#2-stack)
3. [Arquitetura](#3-arquitetura)
4. [Modelo de dados e isolamento](#4-modelo-de-dados-e-isolamento)
5. [Compatibilidade com o Obsidian](#5-compatibilidade-com-o-obsidian)
6. [Rede do VTT: Criar Sala e Entrar Sala](#6-rede-do-vtt-criar-sala-e-entrar-sala)
7. [Riscos e mitigação](#7-riscos-e-mitigação)
8. [Etapas](#8-etapas)
9. [Etapa 1 em detalhe: protótipo visual](#9-etapa-1-em-detalhe-protótipo-visual)
10. [Hipóteses assumidas](#10-hipóteses-assumidas)

---

## 1. Veredito

**É viável**, e boa parte do que é mais difícil já existe: o RunasVTT resolve mesa, visão, névoa, áudio e conexão
dos jogadores; o Runas DM resolve links e sincronização com o Obsidian (com limites). O que falta de maior peso é
**um editor Markdown de verdade** (no lugar do `contentEditable`), **o app Android** e **o motor de calendários**.

É um produto grande. Escala usada (dedicação integral, um desenvolvedor com IA):

| Tamanho | Duração aproximada |
|---|---|
| P | ~1 semana |
| M | 2–4 semanas |
| G | 1–2 meses |
| GG | 2–3 meses |

- **Checklist inteira:** cerca de **12 a 22 meses** (meio do caminho ≈ 17). Em meio período, por volta do dobro.
- **Primeiro marco útil** (etapas 0 a 4: notas + VTT desktop, aposentando o RunasVTT): **3 a 6 meses**.
- A principal forma de encurtar é a própria checklist: cada seção desmarcada sai inteira do cronograma.

## 2. Stack

**Um único app React 19 + TypeScript + Vite**, empacotado de duas formas:

| Plataforma | Casca | Motor |
|---|---|---|
| Windows, Linux | **Electron** | Chromium embutido |
| Android | **Capacitor** | WebView do sistema (Chromium) |

Por quê:
- É o mesmo par que o **Obsidian** usa (inclusive CodeMirror 6 no celular) — a melhor prova de que funciona para
  esse tipo de produto.
- **Chromium nos três sistemas**: Pixi (mesa) e editor se comportam igual.
- Coerente com a [ADR 0007 do RunasVTT](https://github.com/Player07x/RunasVTT/blob/main/docs/adr/0007-electron.md) (Electron em vez de Tauri) e
  reaproveita o código Node do RunasVTT no desktop.
- **Tauri descartado:** exigiria reescrever o Node em Rust e usaria o WebKitGTK no Linux (risco para WebGL, áudio e
  telas em branco com NVIDIA).

Bibliotecas principais:

| Para quê | Biblioteca |
|---|---|
| Editor | CodeMirror 6 (o mesmo do Obsidian) |
| Renderização Markdown | micromark/remark/rehype + plugins (GFM, rodapés, KaTeX, Mermaid, wikilinks, callouts) |
| Segurança do HTML | `rehype-sanitize` + CSP rígida (notas importadas podem trazer HTML) |
| Frontmatter | `yaml` (API de documento: edita só a chave alterada, preserva o resto) |
| Mesa | PixiJS 8 (código do RunasVTT) |
| Agenda | ical.js (RRULE, fusos, `.ics`) |
| Livros | Paged.js ou Vivliostyle na prévia; `@page` nativo do Chromium + `printToPDF` para PDF; `docx`; EPUB montado com zip |
| ZIP / hash | fflate (com ZIP64) / SubtleCrypto |

## 3. Arquitetura

```
┌───────────────────────────── App (React + TS, igual nas 3 plataformas) ─────────────────────────────┐
│  Notas · Agenda · Wiki · Campanhas · Livros · VTT · Importar/Exportar                                │
│  Núcleo: índice do cofre (Worker) · resolução de links · calendários · protocolo da sala (TS)       │
└──────────────────────────────────────────┬───────────────────────────────────────────────────────────┘
                                           │ interface Platform
              ┌────────────────────────────┴────────────────────────────┐
     Electron (Windows/Linux)                                    Capacitor (Android)
     - arquivos do cofre (fs + watcher)                          - arquivos do cofre (plugin Kotlin em lote)
     - servidor da sala (Node, do RunasVTT)                      - servidor da sala (Ktor, serviço em 1º plano)
     - túnel cloudflared                                         - notificações, "compartilhar com", widget
     - notificações + bandeja                                    - câmera para QR
```

Regras:
- **Toda a lógica fica em TypeScript** (na interface ou num Worker). A camada nativa só faz: ler/gravar arquivos
  **em lote**, sockets e integração com o sistema. Assim o código das duas cascas não diverge.
- A interface `Platform` segue o padrão do `VaultAdapter` do Runas DM
  (`Runas-Core/apps/runas-dm/app/lib/obsidian-sync.ts`), ampliado para operações em lote, observação de mudanças,
  notificações e hospedagem de sala.
- Existe um `Platform` falso, em memória (como o `createBrowserPreviewApi` do RunasVTT), usado no protótipo e nos
  testes.

## 4. Modelo de dados e isolamento

### Cofre

Um único cofre Obsidian com um espaço por domínio:

```
<cofre>/
├── Notas/                      bloco de notas livre
├── Agenda/                     eventos como notas (formato do plugin Full Calendar)
├── Wikis/<wiki>/               artigos; Calendários/ com os calendários fictícios
├── Campanhas/<campanha>/       sessões, missões, NPCs, notas
├── Livros/<livro>/             partes e capítulos em .md
├── Mesas/<mesa>/               só as notas da mesa (o que for texto)
├── .obsidian/snippets/runas-codex.css   para o Obsidian mostrar callouts/colunas como o app
└── .runas/                     dados do app (o Obsidian ignora pastas com ponto)
    ├── config.json
    └── mesas/<id>/{mesa.json, cenas/*.json, nevoa/*.bin, assets/<hash>.<ext>}
```

- **Notas são `.md`** e são a fonte da verdade. Índice de busca e de links é cache (Worker, por data/tamanho do
  arquivo), sempre reconstruível.
- **Mesas** saem do SQLite do RunasVTT para JSON por cena (um só escritor: o mestre), névoa em arquivo binário e ativos
  por hash, com gravação adiada de 1–2 s. Mapas e áudios pesados ficam em `.runas/` para não poluir o Obsidian nem a
  sincronização.
- **Calendário fictício** = uma nota na wiki com um bloco ` ```runas-calendario ` (YAML com meses, semanas, luas,
  eras…). O C.E./Logi do `chronology.ts` vira o primeiro exemplo. Notas escolhem o calendário pelo frontmatter e usam
  **chaves próprias, entre aspas**, para datas fictícias (o `types.json` do Obsidian é global e `1492-03-15` sem
  aspas vira data real):

  ```yaml
  calendario: "[[Calendário de Ordem x Caos]]"
  data_mundo: "4031-03-15"
  nascimento_mundo: "3999-07-02"
  ```

  O app mostra sozinho: dia da semana, fase das luas, estação, era, idade e "há X anos" em relação à data atual da
  campanha.
- **Agenda** = notas no formato do Full Calendar (o Obsidian mostra os mesmos eventos se o plugin estiver instalado),
  com `.ics` para entrada e saída.

### Isolamento entre espaços

- Busca, gráfico, autocomplete, lista de tags e backlinks mostram **só o espaço atual** por padrão (com opção "todos").
- Link para outro espaço é **explícito** (seletor próprio) e gravado **com caminho completo**:
  `[[Wikis/Ordem x Caos/Personagens/Aldren|Aldren]]` — assim o Obsidian resolve igual.
- Link curto (`[[Aldren]]`) só é gravado quando o nome é único no cofre inteiro.
- Backlinks vindos de outros espaços aparecem num grupo separado ("De campanhas", "De livros").
- No gráfico, notas de outros espaços aparecem como "portais", não como nós do espaço.

## 5. Compatibilidade com o Obsidian

Regras que entram nos testes desde a etapa 3a:

**Configurações**
- Ler `.obsidian/app.json` (formato de link novo, links em Markdown, pasta de anexos inclusive `./`, local de nota
  nova, atualizar links, filtros, lixeira), `templates.json` e `daily-notes.json`.
- Nunca gravar `workspace.json`.

**Links**
- O Obsidian resolve links no cofre inteiro, sem distinguir maiúsculas, e não conhece espaços. O app avisa quando ele
  e o Obsidian resolveriam um link para notas diferentes.
- Nunca gravar `[[apelido]]`; sempre `[[Nome real|apelido]]`.
- Aceitar `[[a#h1#h2]]`, `[x](<caminho com espaços.md>)` e links com URL codificada.
- Ao renomear: atualizar links no texto, nas **propriedades** e em nós de arquivo do **`.canvas`**.
- `^id` vai no fim do parágrafo; em tabelas e citações, numa linha própria.

**Tags e propriedades**
- Tags só numéricas (`#1492`) **não são tags** no Obsidian — importante para anos de RPG.
- Tags aninhadas, comparação sem maiúsculas, ignoradas dentro de código e URLs; `tags` no frontmatter pode ser lista
  ou texto; aceitar as chaves antigas `tag` e `alias`.
- O tipo de cada propriedade é **global** (`.obsidian/types.json`): nomes de chave diferentes para datas reais e
  fictícias.

**Arquivos**
- Nomes proibidos: `[ ] # ^ |`, nomes reservados do Windows (CON, AUX, NUL, COM1… — plausíveis em RPG), ponto ou
  espaço no fim; aviso acima de 260 caracteres de caminho.
- Windows e o armazenamento do Android não diferenciam maiúsculas; o Linux diferencia. Bloquear notas que diferem só
  por maiúsculas; renomeação só de maiúsculas em dois passos.
- Comparar nomes em Unicode NFC, sem renomear arquivos no disco.
- **Preservar bytes:** CRLF/LF, BOM, linha final e indentação de cada arquivo. Arquivo que não mudou **não é
  regravado**.
- Conferir data/tamanho/hash antes de gravar (alguém pode ter editado no Obsidian); ignorar `.sync-conflict`.
- Preservar intactos arquivos `.base` e blocos ` ```dataview `.
- Lixeira em `.trash`.
- **A primeira abertura de um cofre existente é somente leitura** até o usuário liberar a escrita.

### Dialeto Markdown

**Aprovado em 14/10/2026** (etapa 0). Tudo renderiza no Obsidian; o snippet `runas-codex.css` faz o Obsidian mostrar igual ao app.

| Recurso | Sintaxe proposta | No Obsidian sem o snippet |
|---|---|---|
| Cor, tamanho, fonte, versalete | `<span style="color:#8b1e1e; font-size:1.2em; font-family:'Cinzel'">texto</span>` | Funciona |
| Sublinhado, sobrescrito, subscrito | `<u>`, `<sup>`, `<sub>` | Funciona |
| Alinhamento | `<p align="center">…</p>` | Funciona |
| Caixas | `> [!nota]`, `> [!descritivo]`, `> [!barra-lateral]`, `> [!statblock]`, `> [!aviso]` | Callout comum |
| Colunas | `> [!colunas]` (Markdown dentro funciona, ao contrário de `<div>`) | Callout comum |
| Bloco largo | `> [!largo]` | Callout comum |
| Quebra de página / coluna | `<div class="quebra-pagina"></div>` / `<div class="quebra-coluna"></div>` | Invisível |
| Capitular | `<span class="capitular">A</span>` | Letra normal |
| Rolagem na nota | `` `dice: 2d6+3` `` (sintaxe do plugin Dice Roller; `[[1d20]]` colidiria com wikilink) | Código inline |
| Posição e tamanho de imagem | `![[mapa.png\|direita\|300]]` ou `![direita\|300](mapa.png)`; posições `esquerda`, `centro`, `direita`, `largo`, **sempre antes do tamanho** (ADR 0012) | O tamanho funciona; a posição vira só o texto alternativo |
| Homebrewery | `\page`, `\column`, `{{nota}}` **aceitos na importação** e convertidos para a sintaxe acima | — |

## 6. Rede do VTT: Criar Sala e Entrar Sala

**Tela do VTT:** só dois botões.
- **Criar Sala** → lista das mesas do usuário (cartões com miniatura e última sessão, ou estado vazio) + **Criar
  Nova**. Escolher uma mesa abre a mesa do mestre e liga o servidor da sala.
- **Entrar Sala** → colar link, digitar código ou ler QR → abre a vista do jogador no próprio app. Jogadores sem o app
  continuam entrando pelo navegador.

**Como funciona:**
- A **autoridade da sala** (`projectScene`, validação de movimentos, assentos — hoje em `RunasVTT/src/main/`) passa
  para TypeScript compartilhado, igual no desktop e no Android. A camada nativa vira um "cano": HTTP estático,
  WebSocket e entrega de arquivos com Range.
- **Desktop:** servidor Node + túnel Cloudflare atuais (`player-server.ts`, `cloudflared.ts`).
- **Android hospedando:** serviço em primeiro plano + trava de Wi-Fi e de tela, servidor Ktor; **só rede local no
  início**. Pela internet depois, com o `cloudflared` embarcado como biblioteca nativa (o Android não deixa executar
  binário baixado).
- **Android como jogador:** o app roda em `https://localhost`; conectar a `ws://` na rede local exige liberar conteúdo
  misto e tráfego sem TLS para a LAN.
- **Nenhuma outra chamada de rede** no app inteiro, a não ser o botão "Verificar atualizações" em Configurações, que
  consulta as releases do GitHub só quando o usuário clica (ADR 0017). Sem verificação automática de atualização.

## 7. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| **Acesso ao cofre no Android** — o Storage Access Framework é lento (uma consulta por arquivo), não avisa mudanças e renomeia duplicados sozinho | Cofre grande demora dezenas de segundos para abrir | APK com permissão de "todos os arquivos" + `FileObserver`; SAF como reserva; interface de arquivos **em lote** desde o início; decisão no spike da etapa 2 |
| **Hospedar sala no Android** — o sistema pausa o app em segundo plano | Sala cai se a tela apagar | Serviço em primeiro plano, travas de Wi-Fi/tela; tamanho G no cronograma; LAN primeiro |
| **Dois leitores de Markdown** (editor e renderização) discordando | Texto aparece diferente no editor e na leitura | Um corpus de testes único para os dois; indexar com um só leitor |
| **Live preview** é o item mais difícil do editor (tabelas, callouts aninhados, teclado do Android) | Atraso | Modos fonte e leitura primeiro; live preview em degraus (marcas → blocos → tabelas "clique para editar") |
| **Prévia paginada lenta** com livro grande, sobretudo no celular | Livros travando | Paginação só na prévia; PDF pelo `@page` nativo; Livros pensados primeiro para desktop; no Android o PDF sai pelo diálogo de impressão |
| **Gravar frontmatter errado** | Perda de dados e reescrita do cofre inteiro (tempestade de sincronização) | Biblioteca `yaml` editando só a chave alterada; nunca regravar YAML inválido nem arquivo sem mudança; testes de ida e volta byte a byte |
| **Lembretes** | No desktop só dispara com o app aberto; Android 13/14 exige permissões | Ícone na bandeja + iniciar com o sistema; pedir notificação e usar `USE_EXACT_ALARM` |
| **HTML em notas importadas** | Script malicioso | Sanitização + CSP + isolamento de contexto |
| **Escopo** | Projeto não termina | Esta checklist; marco útil cedo (etapa 4) |

## 8. Etapas

Regras que valem para todas:
- **Cada módulo sai com seu próprio importar/exportar**; a etapa 10 é só para migrar de outros apps.
- **Backup local existe desde a etapa 3a.**
- Decisões de arquitetura registradas como ADRs em `docs/adr/` (mesmo padrão do RunasVTT).

| # | Etapa | Entregável | Pronto quando | Tam. |
|---|---|---|---|---|
| **0** | Validação de requisitos | Checklist desmarcada; dialeto Markdown fechado | Você aprova a checklist e a tabela do dialeto | P |
| **1** | **Protótipo visual navegável** | App React com dados fictícios, todas as telas, desktop e celular ([detalhes](#9-etapa-1-em-detalhe-protótipo-visual)) | Você navega por todas as telas no PC e no celular e aprova o visual | M |
| **2** | Fundação técnica + spikes | Monorepo, cascas Electron e Capacitor, `Platform`, CI gerando instaladores Windows/Linux e APK; spikes: cofre no Android, autoridade da sala em TS, WebSocket no Android, Pixi no WebView, CodeMirror com teclado Android, indexar 5 mil notas num celular médio | Instaladores abrem nos três sistemas; spikes com decisão registrada em ADR | G |
| **3a** | Núcleo de notas | Abrir/criar cofre, índice, espaços isolados, modos fonte e leitura, links, backlinks, busca, tags, propriedades, renomear atualizando links, backups; **espaço Notas** pronto | Um cofre do Obsidian abre sem alterar um byte; testes de ida e volta passam | G |
| **4** | VTT no desktop | SceneView portado, mesas em `.runas/`, **Criar Sala / Entrar Sala** com túnel | Uma sessão real roda no Runas-Codex | M |
| **3b** | Editor completo | Live preview, transclusão, **todos os formatadores**, gráfico em WebGL, templates | Nota de teste com todos os formatadores renderiza igual no app e no Obsidian | GG |
| **5** | Agenda | Visões, eventos, recorrência, lembretes, `.ics`, ligação com sessões | Lembrete dispara no Android e no desktop | M |
| **6** | Wiki | Modelos de artigo, **calendários fictícios + datas automáticas**, linhas do tempo, mapas com pinos, relações | Calendário com luas e intercalares calcula idade e dia da semana certos (testes) | G |
| **7** | Canvas + Campanhas | `.canvas` (JSON Canvas 1.0, preservando campos desconhecidos); dashboard, sessões, missões, NPCs ([ADR 0011](adr/0011-campanhas.md)) | O quadro da campanha salvo em `.canvas` abre igual no Obsidian (a migração do Runas-DM saiu do plano, ADR 0004) | M + M |
| **8** | Livros | Estrutura em notas, prévia paginada, temas, exportações, importar Homebrewery | Livro de exemplo sai em PDF/EPUB/DOCX fiel à prévia | GG |
| **9** | VTT no toque | Interface do mestre por toque (a sala hospedada pelo celular foi para a etapa A) | Sessão de teste com o mestre no celular, sala aberta no desktop | G |
| **10** | Migrações | Obsidian primeiro; Notion, Kanka e World Anvil depois da 1.0 | Dados reais migrados sem perda | G |
| **A** | Android completo | Cofre real no Android, sala hospedada pelo celular na LAN, testes automáticos no emulador do CI | Cofre do Obsidian aberto e editado no celular; sessão de teste com a sala no celular | G + G |
| **11** | Polimento e lançamento | Desempenho, acessibilidade, instaladores (NSIS, deb/AppImage, APK), beta | Beta com sua mesa | M |

Ordem combinada em 14/10/2026 (depois da 8b): **7 → 8c → 8d → 9 → 10 → A (Android) → 11**. O Android completo fica
para a penúltima etapa, automatizado no emulador do CI.
Depois da 7, o que falta foi dividido em duas frentes que andam ao mesmo tempo (Codex e Claude Code), cada uma
seguindo essa ordem: ver [docs/tarefas/README.md](tarefas/README.md).

Por que essa ordem:
- **Notas antes de tudo:** wiki, campanhas, livros e agenda são notas com regras extras.
- **VTT cedo (etapa 4):** é quase todo reaproveitado e permite aposentar o RunasVTT logo.
- **Editor completo (3b) depois do VTT:** é o item mais caro; com notas básicas + mesa você já usa o app de verdade.
- **Livros e Android anfitrião por último:** os de maior risco técnico, quando a base já está firme.

## 9. Etapa 1 em detalhe: protótipo visual

**O que é:** um app React + Vite navegável, com **dados fictícios** e sem lógica real (nada é salvo em disco). Já
nasce com o `Platform` falso, para virar a interface de verdade depois em vez de ser jogado fora.

**Telas:**
- **Início** — atalhos para os espaços, próxima sessão, notas recentes.
- **Notas** — lista, editor, captura rápida.
- **Agenda** — mês e semana, evento, lembrete.
- **Wiki** — lista de artigos, artigo com infobox, calendário fictício, linha do tempo, mapa com pinos, gráfico.
- **Campanhas** — dashboard, sessão, kanban de missões.
- **Livros** — editor com barra de formatação e prévia paginada.
- **VTT** — **Criar Sala** (lista de mesas, estado vazio, "Criar Nova"), **Entrar Sala** (link, código, QR), mesa do
  mestre, vista do jogador.
- **Importar/Exportar** e **Configurações**.

**Layouts:** desktop (painéis laterais) e celular (barra inferior, gestos).

**Como você vê:** no navegador do PC e no celular pela rede local (`npm run dev -- --host`). Se preferir, também dá
para publicar uma versão estática para abrir pelo link.

## 10. Hipóteses assumidas

Você pediu para eu seguir sem perguntas; estas foram as decisões tomadas por conta própria. Corrija o que não bater:

- **Um único cofre com espaços**, não um cofre por wiki. Uma wiki ainda pode ser aberta sozinha no Obsidian.
- **Android distribuído por APK** (fora da Play Store no início). Isso permite a permissão de "todos os arquivos";
  na Play Store ela é restrita.
- **Interface em pt-BR primeiro.**
- **O protótipo é feito em React** (reaproveitado depois), não em ferramenta de design.
