# 01 — Checklist de recursos

> **Como usar:** todos os itens começam marcados (`[x]`). **Desmarque** (`[ ]`) o que não vamos fazer. Itens com
> **(obrigatório)** vêm de pedidos seus; desmarque só se mudar de ideia. A origem de cada item está entre parênteses.
> Detalhes de cada produto no [estudo](00-estudo.md); custo e ordem no [plano de viabilidade](02-viabilidade-e-etapas.md).
> 
> Só entram recursos que o Runas-Core e o RunasVTT **ainda não têm**. Quando algo existe só em parte, o item descreve
> **o que falta** e o estado atual aparece como "hoje: …".

**Siglas de origem:** FVTT Foundry VTT · R20 Roll20 · OBR Owlbear Rodeo · ALC Alchemy RPG · SHD Shard Tabletop ·
QP Quest Portal · FG Fantasy Grounds · OBS Obsidian · OBS+ plugins da comunidade do Obsidian · WA World Anvil ·
KK Kanka · LK LegendKeeper · CF Campfire · RN RPG Notes · NK Nuckturp (QG do Mestre) · HB Homebrewery ·
GMB GM Binder · SCR Scrivener · DD Dungeondraft/Dungeon Alchemist · NOT Notion · KEEP Google Keep ·
PROJ decorre do desenho do Runas-Codex (ainda não visto nos concorrentes).

## Requisitos fixos (definidos por você, sem checkbox)

- Roda em **Windows, Linux e Android**.
- **100% offline**; a única função online é conectar a uma mesa do VTT. Sem contas, nuvem ou telemetria.
- Núcleo = organizador de `.md` **compatível com o Obsidian**, com todos os recursos de links.
- **Espaços isolados** (Notas, Agenda, Wiki, Campanhas, Livros, Mesas): uma nota de campanha não aparece na wiki,
  mas notas podem se ligar entre espaços por links.
- Tela do VTT só com **Criar Sala** (lista das mesas do usuário + "Criar Nova") e **Entrar Sala**.
- Importar/exportar **mesa** (inteira e partes), **wiki/notas**, **livros** e **campanhas**.
- Editor com **todos os formatadores Markdown**.
- **Agenda real** + **calendários fictícios** dentro da Wiki com datas calculadas automaticamente.
- Primeira etapa depois desta validação: **protótipo visual**.

## Fora de escopo agora

Fichas e galeria de personagens (Runas Tools), bestiário com regras, automação de regras/dano, compêndios de
sistemas, assistente de IA (precisa de internet; IA local fica para o futuro), contas, nuvem e marketplace.

---

## A. Núcleo de notas (paridade com o Obsidian)

### A.1 Links

- [x] **Wikilinks completos** — `[[nota]]`, `[[nota|apelido]]`, `[[nota#título]]`, `[[nota#título#subtítulo]]`, `[[nota#^bloco]]` e `[[#título]]` na própria nota (hoje: a parte `#título` é ignorada). _(OBS)_ **(obrigatório)**
- [x] **Links Markdown padrão** — `[texto](pasta/nota.md)`, caminhos relativos, `<caminho com espaços.md>` e URL codificada. _(OBS)_ **(obrigatório)**
- [x] **Referências de bloco** — `^id` no fim de um parágrafo; ao linkar um parágrafo o app cria o ID sozinho. _(OBS)_ **(obrigatório)**
- [x] **Transclusão** — `![[nota]]`, `![[nota#seção]]` e `![[nota#^bloco]]` mostram o conteúdo dentro de outra nota. _(OBS)_ **(obrigatório)**
- [x] **Embeds de mídia** — imagem com tamanho (`![[mapa.png|400]]`), PDF (com página), áudio e vídeo tocáveis na nota (hoje: só imagem). _(OBS)_
- [x] **Aliases** — propriedade `aliases` usada na resolução de links, na busca e no autocomplete. _(OBS)_ **(obrigatório)**
- [x] **Backlinks clicáveis com contexto** — painel "Ligam para esta nota" com o trecho em volta de cada link (hoje: lista só de leitura). _(OBS)_ **(obrigatório)**
- [x] **Menções não linkadas** — notas que citam o nome ou apelido sem link, com botão "transformar em link". _(OBS)_
- [x] **Painel de links de saída** — tudo que a nota aponta, inclusive links quebrados. _(OBS)_
- [x] **Links quebrados destacados** — link para nota inexistente aparece diferente; clicar cria a nota no espaço certo. _(OBS, WA)_
- [x] **Atualizar links ao renomear/mover** — corrige todos os links do cofre, inclusive em propriedades e em `.canvas`. _(OBS)_ **(obrigatório)**
- [x] **Prévia de link por hover e toque longo** — ver a nota sem abrir, no desktop e no celular (hoje: Alt + hover, só desktop). _(OBS)_
- [x] **Lista "a escrever"** — todos os links que apontam para notas que ainda não existem, por espaço. _(WA)_
- [x] **Linkar com `@`** — digitar `@` busca nota por nome/apelido e insere o link, além do `[[`. _(WA)_
- [x] **Seletor de link entre espaços** — ação explícita para ligar uma nota de outro espaço (ex.: sessão → artigo da wiki), gravando o caminho completo. _(PROJ)_ **(obrigatório)**
- [x] **Copiar link** — de nota, título ou bloco, pronto para colar. _(OBS)_
- [x] **Endereço para abrir nota de fora** — link `runas://` que abre uma nota a partir de outro app. _(OBS)_

### A.2 Gráfico

- [x] **Gráfico global com filtros** — busca, tags, pastas, notas órfãs, anexos e links inexistentes (hoje: texto, tag e tipo). _(OBS)_ **(obrigatório)**
- [x] **Grupos de cores por consulta** — ex.: `tag:#npc` vermelho, `path:Locais` verde. _(OBS)_
- [x] **Forças ajustáveis** — repulsão, distância, tamanho de nós e arestas. _(OBS)_
- [x] **Gráfico local** — vizinhança da nota aberta com profundidade 1–N. _(OBS)_ **(obrigatório)**
- [x] **Destacar vizinhos e buscar no gráfico** — passar o mouse realça conexões; buscar centraliza o nó. _(OBS)_
- [x] **Setas de direção** nas arestas. _(OBS)_
- [x] **Arestas entre espaços como "portais"** — links para outros espaços aparecem como nós especiais, sem misturar os espaços. _(PROJ)_
- [x] **Timelapse** — anima o crescimento do gráfico pela data de criação das notas. _(OBS)_
- [x] **Gráfico em WebGL** — fluido com milhares de notas (o SVG atual trava por volta de 1–2 mil nós). _(OBS)_

### A.3 Organização e navegação

- [x] **Árvore de pastas** — criar, renomear, mover arrastando, ordenar, dentro de cada espaço. _(OBS)_
- [x] **Abas e painéis divididos** — várias notas lado a lado; abas fixadas e empilhadas. _(OBS)_
- [x] **Workspaces** — salvar e restaurar arranjos de painéis (ex.: "Sessão", "Escrita"). _(OBS)_
- [x] **Várias janelas no desktop** — abrir nota ou cena em outra janela (segundo monitor). _(OBS, FVTT)_
- [x] **Paleta de comandos** — todas as ações do app por busca (Ctrl+P). _(OBS)_
- [x] **Alternador rápido** — abrir nota por nome/apelido (Ctrl+O), criando se não existir. _(OBS)_
- [x] **Favoritos** — notas, buscas, títulos e pastas. _(OBS)_
- [x] **Outline** — sumário clicável dos títulos da nota. _(OBS)_
- [x] **Voltar/avançar** no histórico de navegação. _(OBS)_
- [x] **Nota aleatória**. _(OBS)_
- [x] **Tags inline e aninhadas** — `#npc`, `#local/cidade`, além das do frontmatter (hoje: só frontmatter). _(OBS)_ **(obrigatório)**
- [x] **Painel de tags** — todas as tags com contagem, aninhadas e clicáveis. _(OBS)_
- [x] **Busca global com operadores** — `path:`, `file:`, `tag:`, `line:`, `section:`, `[propriedade:valor]`, regex; no espaço atual ou em todos (hoje: busca por seção). _(OBS)_
- [x] **Buscar e substituir** em várias notas. _(OBS+)_
- [x] **Propriedades tipadas** — editor visual do frontmatter: texto, lista, número, caixa, data, data-hora, link. _(OBS)_
- [x] **Bases** — visões de banco de dados das notas (tabela, cartões, lista) com filtros, fórmulas, agrupamento e resumo; arquivos `.base` compatíveis. _(OBS)_
- [x] **Consultas dinâmicas** — listas/tabelas automáticas dentro da nota (ex.: "NPCs vivos desta cidade"). _(OBS+ Dataview)_
- [x] **Templates com variáveis** — pasta de modelos, `{{título}}`, `{{data}}`, `{{hora}}`, escolhidos ao criar nota (hoje: a pasta `Templates/` é ignorada). _(OBS, OBS+ Templater)_
- [x] **Notas diárias** com modelo. _(OBS)_
- [x] **Canvas** — quadro infinito com cartões de nota, texto, imagem, link e grupos, ligados por setas, salvo como `.canvas` (JSON Canvas); substitui o Organizador atual. _(OBS, LK, NK)_
- [x] **Extrair seleção para nova nota / mesclar notas**. _(OBS)_
- [x] **Histórico de versões por nota** — snapshots locais com comparação e restauração. _(OBS)_
- [x] **Lixeira com restauração** — excluir manda para `.trash`. _(OBS)_
- [x] **Contagem de palavras e caracteres**. _(OBS)_
- [x] **Três modos de edição** — leitura, live preview e código-fonte. _(OBS)_ **(obrigatório)**
- [x] **Comandos `/`** — inserir tabela, callout, link, imagem, data digitando `/`. _(LK, NOT)_
- [x] **Corretor ortográfico pt-BR** offline. _(OBS)_
- [x] **Atalhos configuráveis**. _(OBS)_
- [x] **Temas e trechos CSS** — compatíveis com snippets do Obsidian quando possível. _(OBS)_
- [x] **Detecção de edição externa** — mudou no Obsidian ou no Syncthing, o app atualiza na hora. _(OBS)_
- [x] **Gestão de anexos** — pasta configurável (lida do `.obsidian`), colar/arrastar imagem, renomear anexo atualiza links, achar anexos órfãos. _(OBS)_
- [x] **Ícones e cores em notas e pastas** — biblioteca de ícones offline. _(RN, OBS+ Iconize)_
- [x] **Fixar notas no topo** da lista. _(KEEP, RN)_

---

## B. Wiki / worldbuilding

### B.1 Estrutura e conteúdo

- [x] **Tipos de artigo com modelos e perguntas-guia** — personagem, local, cidade, construção, organização, país, item, material, espécie, cultura, religião, idioma, magia, tecnologia, veículo, mito, evento, guerra, documento, condição (hoje: 7 seções fixas). _(WA, CF, KK)_
- [x] **Categorias livres e artigos aninhados** — o usuário cria e renomeia seções; artigo dentro de artigo; sumário automático da wiki. _(WA, KK, LK)_
- [x] **Página inicial da wiki** — capa, categorias em destaque, artigos recentes. _(WA)_
- [x] **Infobox** — quadro lateral montado a partir das propriedades da nota (retrato, idade, afiliação…). _(WA, OBS+)_
- [x] **Segredos** — blocos visíveis só para o mestre ou para jogadores específicos; somem na "versão dos jogadores". _(WA, LK, KK)_
- [x] **Marcadores de spoiler** — texto oculto até clicar. _(WA)_
- [x] **Galeria de imagens** por artigo. _(KK)_
- [x] **Música e efeitos sonoros no artigo** — tocáveis durante a leitura. _(WA)_
- [x] **Statblock genérico** — bloco de atributos livre, sem regras de sistema. _(OBS+ Fantasy Statblocks, WA)_

### B.2 Tempo e calendários

- [x] **Calendários fictícios personalizados** — meses e dias da semana com nomes próprios, dias intercalares, regra de bissexto, luas com ciclos e fases, estações, eras, feriados, anos negativos; o calendário C.E./Logi atual vira exemplo (hoje: só ano, calendário fixo no código). _(KK, WA, LK, CF, OBS+ Calendarium)_ **(obrigatório)**
- [x] **Datas calculadas automaticamente** — a nota que escolhe um calendário ganha dia da semana, fases das luas, estação, era, idade ("32 anos"), tempo relativo ("há 120 anos") e ordenação cronológica. _(PROJ)_ **(obrigatório)**
- [x] **Vários calendários e conversão** — a mesma data em dois calendários (ex.: C.E. ↔ Logi, élfico ↔ humano). _(KK, LK)_
- [x] **Data atual da campanha** — o "hoje" do mundo, que o mestre avança (+1 dia, +1 semana) e que atualiza idades e contagens. _(KK)_
- [x] **Visão de calendário fictício** — mês/ano do mundo com eventos, aniversários e luas. _(KK, OBS+ Calendarium)_
- [x] **Eventos fictícios recorrentes** — festivais anuais, eclipses. _(KK)_
- [x] **Linhas do tempo paralelas** — trilhas por país ou personagem, eras, filtros e zoom (hoje: uma linha do tempo do universo). _(WA, CF, LK)_
- [x] **Crônicas** — mapa que muda conforme a era escolhida na linha do tempo. _(WA)_

### B.3 Mapas do mundo

- [x] **Mapas interativos** — imagem grande com zoom; pinos ligados a notas; categorias e filtros de pinos. _(WA, LK, KK, CF, OBS+ Leaflet)_
- [x] **Camadas** — político, rotas, segredos do mestre etc. _(WA)_
- [x] **Mapas aninhados** — mundo → reino → cidade → masmorra por cliques. _(WA, LK)_
- [x] **Zonas e desenhos** — regiões coloridas, rotas, rótulos. _(CF, KK)_
- [x] **Escala, régua e bússola** — medir distância e tempo de viagem. _(CF, OBS+ Leaflet)_
- [x] **Criar nota a partir do pino**. _(WA)_

### B.4 Relações

- [x] **Relações tipadas** — "aliado de", "pai de", "inimigo de", com atitude; aparecem nas duas notas. _(KK, WA, CF)_
- [x] **Árvores genealógicas e linhagens**. _(WA, KK)_
- [x] **Organogramas** — guildas, ordens, hierarquias. _(WA)_
- [x] **Teias diplomáticas** — relações entre facções e nações (aliança, guerra, paz tensa). _(WA)_

### B.5 Geradores e ferramentas

- [x] **Tabelas aleatórias roláveis** — dentro da nota, encadeáveis (uma tabela chama outra). _(WA, FVTT, OBS+ Dice Roller)_
- [x] **Geradores offline** — nomes (inclusive brasileiros e lusófonos), NPCs, tavernas, tesouro, clima, ganchos. _(RN, NK, KK)_
- [x] **Idiomas fictícios** — dicionário com tradução, pronúncia e regras. _(CF, WA)_
- [x] **Metas de palavras e progresso** da wiki. _(WA)_

### B.6 Compartilhar com os jogadores

- [x] **Mostrar artigo pela sala** — o mestre envia uma página (sem segredos) para quem está na sala do VTT. _(WA, LK, FVTT)_

---

## C. Campanhas

- [x] **Dashboard da campanha** — próxima sessão com contagem regressiva, missões ativas, notas recentes, atalhos. _(NK)_
- [x] **Sessões como entidade** — planejada/realizada/cancelada, data (vai para a Agenda), duração, resumo, links (hoje: sessão é uma tag). _(NK, KK, WA)_
- [x] **Presença dos jogadores** por sessão. _(NK)_
- [x] **Preparação de sessão guiada (offline)** — roteiro: recapitulação, início forte, cenas, segredos e pistas, locais, NPCs, recompensas → vira checklist. _(NK, método "Lazy DM")_
- [x] **Recapitulação pós-sessão** — modelo que puxa o que foi marcado na sessão e monta o "Anteriormente…". _(WA)_
- [x] **Avaliação da sessão pelos jogadores** — formulário anônimo enviado pela sala do VTT ao fim da sessão. _(NK)_
- [x] **Jogadores e personagens (sem ficha)** — pessoa, contato, personagem, retrato, notas, relações. _(NK, RN)_
- [x] **Ganchos, pistas e segredos rastreados** — com "revelado na sessão X" e para quem. _(WA, método "Lazy DM")_
- [x] **Relógios de progresso e ameaças** — contadores em segmentos e ameaças que avançam. _(OBS+, comunidade)_
- [x] **Facções com reputação do grupo**. _(KK, FVTT módulos)_
- [x] **Rastreador de NPCs** — atitude com o grupo, último encontro, o que sabe, onde está. _(KK, RN)_
- [x] **Quadro kanban de missões** — colunas por status, arrastar (hoje: lista com 7 status). _(NOT, NK)_
- [x] **Tesouro e inventário do grupo** — lista de itens, moedas e quem carrega, sem regras. _(NK, KK)_
- [x] **Diário dos jogadores** — notas escritas pelos jogadores e recebidas pelo mestre pela sala. _(WA, QP)_
- [x] **Linha do tempo da campanha** — sessões e datas fictícias juntas. _(WA, KK)_
- [x] **Tela do Mestre** — painel com notas fixadas, tabelas roláveis e referências rápidas durante o jogo. _(WA)_
- [x] **Ferramentas de segurança** — Linhas e Véus, carta X com sinal anônimo pela sala. _(FVTT módulos, R20)_
- [x] **Estatísticas** — sessões, horas jogadas, presença. _(NK)_
- [x] **Gerador de aventuras** por rolagem (ganchos, encontros, NPCs). _(NK)_
- [x] **Encontros genéricos** — lista de participantes (tokens/NPCs, sem ficha) para mandar à mesa. _(FVTT)_
- [x] **Iniciativa para mesa presencial** — ordem de turnos e rodadas fora do VTT. _(OBS+ Initiative Tracker)_
- [x] **Campanha de exemplo** pré-carregada. _(RN)_

---

## D. VTT

### D.1 Sala

- [x] **Criar Sala: lista de mesas** — cartões com miniatura, última sessão e nº de cenas; botão "Criar Nova"; estado vazio quando não há mesas. _(PROJ)_ **(obrigatório)**
- [x] **Entrar Sala pelo app** — colar link, digitar código ou ler QR com a câmera; abre a vista do jogador no app (o navegador continua funcionando). _(PROJ)_ **(obrigatório)**
- [x] **Hospedar sala pelo Android** — rede local primeiro, internet depois. _(PROJ)_
- [x] **Túnel alternativo** — funciona em redes que bloqueiam a porta 7844 (porta 443 ou retransmissor). _(pendência do RunasVTT)_
- [x] **Sincronização incremental** — enviar só o que mudou em vez da cena inteira (melhor no 4G). _(FVTT, OBR)_
- [ ] **Voz e vídeo na sala** — exige retransmissor (TURN) para funcionar pela internet. _(FVTT, R20, ALC)_ — **desmarcado pelo dono em 14/10/2026.**

### D.2 Dados e comunicação

- [x] **Rolador de dados com notação completa** — `XdY±Z`, manter maiores/menores, explosivos, rerrolar, contar sucessos, Fate, porcentagem; histórico. _(FVTT, R20, OBR, NK)_
- [x] **Rolagens privadas, para o mestre e ocultas**. _(FVTT, R20)_
- [x] **Dados 3D animados**. _(FVTT, R20, OBR)_
- [x] **Rolagens dentro das notas** — `` `dice: 2d6+3` `` clicável (mesma sintaxe do plugin Dice Roller). _(OBS+, R20)_
- [x] **Chat de texto** — mensagens, sussurros, dentro/fora do personagem, resultado das rolagens. _(FVTT, R20)_
- [x] **Ping "olhem aqui"** — marca um ponto do mapa para todos. _(FVTT, R20, OBR)_
- [x] **Cursores compartilhados**. _(OBR)_

### D.3 Combate (genérico, sem ficha)

- [x] **Rastreador de iniciativa e turnos** — ordem, rodadas, token ativo destacado, ligado aos tokens da cena. _(FVTT, R20, FG, OBR)_
- [x] **Condições nos tokens** — ícones genéricos (caído, atordoado, invisível…) e personalizados. _(FVTT, R20, OBR)_
- [x] **Auras** — círculo de alcance em volta do token. _(FVTT, R20)_
- [x] **Templates de área** — cone, círculo, linha, quadrado, com destaque das casas atingidas. _(FVTT, R20)_
- [x] **Marcar alvo**. _(FVTT)_
- [x] **Waypoints e rastro** — régua com paradas ao arrastar e trilha do caminho percorrido. _(FVTT, OBR)_
- [x] **Limite de movimento por turno**. _(FVTT)_

### D.4 Cena e mapa

- [x] **Pincel de névoa manual** — revelar/ocultar à mão, além da névoa dinâmica. _(OBR, R20)_
- [x] **Detecção assistida de paredes** a partir da imagem do mapa. _(OBR)_
- [x] **Calibrar grade** desenhando uma célula sobre o mapa. _(FVTT, R20, OBR)_
- [x] **Alças para redimensionar e girar** tokens e imagens (hoje: só pelo painel). _(FVTT, OBR)_
- [x] **Desfazer/refazer**. _(FVTT, OBR)_
- [x] **Andares na mesma cena**. _(FVTT)_
- [x] **Mapas animados** — vídeo WebM/MP4 como fundo. _(FVTT, ALC)_
- [x] **Clima e partículas** — chuva, neve, neblina, brasas. _(FVTT, OBR, ALC)_
- [x] **Modo cinemático / teatro da mente** — cena sem grade com fundo animado, trilha e sobreposições. _(ALC)_
- [x] **Transições entre cenas**. _(FVTT, ALC)_
- [x] **Pastas e miniaturas de cenas**. _(FVTT, R20)_
- [x] **Biblioteca de ativos** — tokens, mapas e áudios com tags e busca, reaproveitáveis entre mesas. _(FVTT, R20, OBR)_
- [x] **Variantes de imagem do token** — trocar imagem (ferido, transformado); token "coringa" com imagem aleatória. _(FVTT, R20)_
- [x] **Gerenciar camadas** — mostrar, ocultar e travar. _(OBR, FVTT)_
- [x] **Pinos do mapa ligados às notas** — a nota de mapa abre um artigo da wiki ou da campanha (hoje: só URL). _(FVTT)_
- [x] **Handouts** — mostrar imagem ou nota aos jogadores em tela cheia. _(FVTT, R20)_
- [x] **Cartas e baralhos**. _(FVTT, R20)_
- [x] **Tabelas roláveis na mesa** — as mesmas da wiki. _(FVTT, R20)_
- [x] **Macros simples** — botões que rolam dados ou tocam sons. _(FVTT, R20)_
- [x] **Visão compartilhada do grupo**. _(FVTT, R20)_
- [x] **Desenho e régua dos jogadores** visíveis para todos, com permissão do mestre. _(OBR, R20)_
- [x] **Permissões por token** — vários donos, só ver, controlar. _(FVTT)_
- [x] **Cronômetro / contagem regressiva** visível para todos. _(OBR extensões)_
- [x] **Modo espectador** — câmera segue o turno, para transmissão. _(SHD)_
- [x] **Trilha por cena** — trocar de cena troca a música. _(ALC, FVTT)_
- [x] **Interface do mestre no celular e tablet** — mover, editar e desenhar por toque (hoje: só mouse e teclado). _(OBR, PROJ)_

---

## E. Livros

### E.1 Formatadores Markdown **(obrigatório)**

Tudo renderiza no modo leitura, na prévia do livro e nas exportações, e fica inserível pela barra de ferramentas.
A sintaxe exata dos itens estendidos é decidida na etapa 0 (proposta no [plano](02-viabilidade-e-etapas.md#dialeto-markdown-proposto)).

**CommonMark**

- [x] **Títulos H1 a H6** (hoje: até H3). _(OBS)_
- [x] **Negrito, itálico e negrito+itálico**. _(OBS)_
- [x] **Código inline**. _(OBS)_
- [x] **Bloco de código com realce de sintaxe**. _(OBS)_
- [x] **Citação, inclusive aninhada**. _(OBS)_
- [x] **Listas não ordenadas, ordenadas e aninhadas** (hoje: um nível). _(OBS)_
- [x] **Linha horizontal**. _(OBS)_
- [x] **Links e imagens com título**. _(OBS)_
- [x] **Quebra de linha forçada**. _(OBS)_
- [x] **Escapes** (`\*`, `\#`). _(OBS)_
- [x] **HTML inline e em bloco** (com sanitização). _(OBS)_

**GitHub Flavored Markdown**

- [x] **Tabelas com alinhamento por coluna** em Markdown (hoje: só no editor do Runas Book). _(OBS)_
- [x] **Tachado** `~~texto~~`. _(OBS)_
- [x] **Listas de tarefas** `- [ ]`. _(OBS)_
- [x] **Autolinks**. _(OBS)_
- [x] **Notas de rodapé** `[^1]` e inline `^[texto]`. _(OBS)_

**Obsidian**

- [x] **Destaque** `==texto==`. _(OBS)_
- [x] **Comentários ocultos** `%%texto%%`. _(OBS)_
- [x] **Callouts** `> [!nota] Título` com tipos, dobra (`+`/`-`) e aninhamento (hoje: viram citação comum). _(OBS)_
- [x] **Matemática LaTeX** `$…$` e `$$…$$`. _(OBS)_
- [x] **Diagramas Mermaid**. _(OBS)_
- [x] **Tags, propriedades e embeds** no texto (ver seção A). _(OBS)_

**Estendidos**

- [x] **Sublinhado**. _(GMB, Runas Book)_
- [x] **Sobrescrito e subscrito**. _(HB, GMB)_
- [x] **Versalete**. _(HB)_
- [x] **Lista de definição** (termo e definição). _(HB)_
- [x] **Abreviações com dica** ao passar o mouse. _(HB)_
- [x] **Emoji por código** `:espada:`. _(GMB)_
- [x] **Atributos e classes** `{.classe}` em blocos. _(HB)_
- [x] **Contêineres nomeados** `::: nome … :::`. _(HB)_
- [x] **Alinhamento** à esquerda, centro, direita e justificado (hoje: só no Runas Book). _(HB, Runas Book)_
- [x] **Família de fonte**. _(HB, GMB)_
- [x] **Tamanho de fonte** (hoje: só no Runas Book). _(HB, Runas Book)_
- [x] **Cor do texto**. _(HB, GMB)_
- [x] **Realce colorido / cor de fundo**. _(HB)_
- [x] **Letra capitular**. _(HB)_
- [x] **Colunas** (2 ou 3) com **quebra de coluna**. _(HB, GMB)_
- [x] **Quebra de página**. _(HB, GMB)_
- [x] **Bloco largo** — ocupa todas as colunas. _(HB)_
- [x] **Caixas** — nota, barra lateral, texto descritivo ("leia em voz alta"), aviso. _(HB, GMB)_
- [x] **Tabelas com células mescladas** e estilos (listrada, destaque, compacta). _(HB, Runas Book)_
- [x] **Legenda de imagem** e figura numerada. _(HB)_
- [x] **Posição de imagem** — flutuar à esquerda/direita, sangrar, imagem de fundo. _(HB)_
- [x] **Sumário automático** dentro da nota. _(HB, OBS+)_
- [x] **Separadores decorativos**. _(HB)_
- [x] **Teclas** `<kbd>`. _(OBS)_
- [x] **Seção recolhível** `<details>`. _(OBS)_

### E.2 Recursos de livro

- [x] **Livro como conjunto de notas** — partes → capítulos → seções, cada uma um `.md` que o Obsidian abre (hoje: conteúdo em HTML guardado no navegador). _(SCR, CF)_
- [x] **Prévia paginada ao vivo** — página a página, como vai sair impresso. _(HB, GMB)_
- [x] **Temas de livro** — manual de RPG, pergaminho, moderno, minimalista + CSS próprio. _(HB, GMB)_
- [x] **Contracapa e página de créditos** editáveis na prévia (hoje: só capa, no PDF). _(HB)_
- [x] **Índice remissivo automático**. _(SCR)_
- [x] **Glossário automático** a partir dos artigos da wiki citados. _(WA)_
- [x] **Fundos de página, texturas e marca d'água**. _(HB)_
- [x] **Fontes embutidas offline** — biblioteca de fontes livres para títulos e corpo. _(HB)_
- [x] **Perfis de impressão** — A4, Carta, A5, 6×9; margens, sangria e marcas de corte. _(HB)_
- [x] **Cortiça** — cartões de capítulo para reorganizar arrastando. _(SCR, CF)_
- [x] **Metas de palavras e estatísticas de escrita**. _(CF, WA, SCR)_
- [x] **Modo foco / máquina de escrever**. _(SCR)_
- [x] **Comentários de revisão** no texto. _(CF, SCR)_
- [x] **Snapshots de capítulo** com comparação. _(SCR)_
- [x] **Painel lateral com notas da wiki** enquanto escreve. _(CF)_
- [x] **Transclusão da wiki no livro** — reaproveitar o texto de um artigo sem copiar. _(OBS)_
- [x] **Marcação de elementos da história** — personagens e locais citados no texto ficam ligados. _(CF)_

---

## F. Notas pessoais e Agenda

### F.1 Notas

- [x] **Espaço Notas isolado** — bloco de notas livre, fora da wiki e das campanhas, com as mesmas ferramentas. _(PROJ)_ **(obrigatório)**
- [x] **Captura rápida** — botão flutuante no celular, atalho global no desktop. _(KEEP, OBS)_
- [x] **"Compartilhar com" no Android** — texto, imagem ou link de outro app vira nota. _(KEEP, OBS)_
- [x] **Fixar, colorir e arquivar** notas. _(KEEP)_
- [x] **Tarefas com prazo** — checklists com data, que aparecem na Agenda. _(OBS+ Tasks)_
- [x] **Widget Android** — nota rápida e próximos compromissos. _(KEEP)_
- [x] **Bloqueio por PIN** do app ou do espaço Notas (impede abrir no app; não criptografa os arquivos). _(apps de notas)_

### F.2 Agenda (real)

- [x] **Visões dia, semana, mês e lista**. _(NK)_ **(obrigatório)**
- [x] **Eventos completos** — título, hora, local, cor, categoria, notas ligadas. _(NK)_ **(obrigatório)**
- [x] **Recorrência** — semanal, quinzenal, mensal, regras completas (RRULE). _(padrão iCalendar)_
- [x] **Lembretes com notificação** no Android e no desktop. _(padrão de agendas)_
- [x] **Sessões de campanha na agenda** — criar uma sessão cria o evento e vice-versa. _(NK)_
- [x] **Contagem regressiva** para a próxima sessão. _(NK)_
- [x] **Checklist de preparação ligada ao evento**. _(NK)_
- [x] **Eventos como notas no cofre** — formato do plugin Full Calendar, que o Obsidian também mostra. _(OBS+)_
- [x] **Enquete de data** — jogadores votam no melhor dia pela sala. _(apps de agendamento)_

---

## G. Importadores e exportadores

### G.1 Mesa **(obrigatório)**

- [x] **Mesa inteira** — pacote único com manifesto e versão (hoje: ZIP do RunasVTT, limitado a 4 GB). _(FVTT, PROJ)_
- [x] **Partes da mesa** — exportar/importar uma cena, um conjunto de tokens, mapas, playlists, paredes e luzes. _(FVTT)_
- [x] **Importar mundos do RunasVTT**. _(PROJ)_
- [x] **Importar mapas Universal VTT** (`.dd2vtt`/`.uvtt`) com paredes, portas e luzes prontas. _(DD, FVTT)_
- [x] **Importar cenas do Foundry** (JSON de cena). _(FVTT)_
- [x] **Importar tokens em lote** — uma pasta de imagens vira tokens. _(FVTT, OBR)_

### G.2 Wiki e notas **(obrigatório)**

- [x] **Abrir um cofre do Obsidian existente** — usa a pasta como está; primeira abertura em somente leitura. _(OBS)_
- [x] **Exportar pasta ou ZIP Markdown** compatível com o Obsidian, de qualquer espaço. _(OBS)_
- [x] **Exportar nota ou coleção em PDF, DOCX e HTML**. _(OBS, WA)_
- [x] **Site HTML estático** navegável offline (versão do mestre e dos jogadores). _(LK, WA)_
- [x] **Versão dos jogadores** — exportar sem segredos. _(WA, LK)_
- [x] **Exportação seletiva com dependências** — escolher notas; anexos entram sozinhos e as notas ligadas, se quiser. _(FVTT, OBS)_
- [x] **Importar do Runas DM** — JSON e o layout atual do cofre (7 seções, campanhas). _(PROJ)_
- [x] **Importar do Notion** (Markdown + CSV). _(NOT)_
- [x] **Importar do Kanka** (exportação JSON). _(KK)_
- [x] **Importar do World Anvil** (exportação). _(WA)_
- [x] **Importar do LegendKeeper** (exportação). _(LK)_
- [x] **Importar calendários** do Fantasy-Calendar e do Calendarium. _(OBS+)_

### G.3 Livros **(obrigatório)**

- [x] **PDF fiel à prévia paginada** (hoje: PDF pelo pdfmake, com layout próprio). _(HB, GMB)_
- [x] **EPUB**. _(CF)_
- [x] **HTML**. _(CF)_
- [x] **RTF**. _(CF)_
- [x] **Markdown** — livro inteiro num arquivo ou numa pasta. _(HB)_
- [x] **Importar Homebrewery e GM Binder** (`\page`, `\column`, blocos `{{…}}`). _(HB, GMB)_
- [x] **Importar DOCX**. _(CF, SCR)_
- [x] **Importar livros do Runas Book**. _(PROJ)_

_O DOCX já existe no Runas Book e será portado, sem item próprio._

### G.4 Campanhas **(obrigatório)**

- [x] **Pacote de campanha** — notas, sessões, mesas e eventos de agenda ligados, num arquivo só. _(PROJ)_
- [x] **Diário da campanha em PDF/HTML** para entregar aos jogadores. _(WA)_

### G.5 Agenda

- [x] **Importar e exportar `.ics`** (iCalendar). _(padrão)_

### G.6 Geral

- [x] **Pacote `.runas`** — formato único com manifesto e versão; ao importar: mesclar, substituir ou duplicar. _(PROJ)_
- [x] **Backup automático local e snapshots** do cofre inteiro, agendados (hoje: backup na nuvem no DM e snapshots só no VTT). _(OBS, FVTT)_
- [ ] **Sincronizar aparelhos pela rede local** — PC ↔ celular sem nuvem. _(PROJ)_ — **desmarcado pelo dono em 14/10/2026.**
- [x] **Convivência com Syncthing e Obsidian Sync** — reconhecer e tratar arquivos de conflito. _(OBS)_

---

## H. Plataforma e experiência

- [x] **Interface em pt-BR** (inglês depois) — RPG Notes e Campfire são criticados por não ter. _(lição do estudo)_
- [x] **Layout responsivo** — barra inferior no celular, painéis no desktop, gestos. _(OBS)_
- [x] **Modo tablet**. _(OBS)_
- [x] **Temas claro, escuro e temáticos**. _(OBS, WA)_
- [x] **Acessibilidade** — tamanho de fonte, contraste, leitor de tela, reduzir animações. _(OBS)_
- [x] **Primeiros passos e conteúdo de exemplo**. _(RN, WA)_
- [x] **Ajuda offline embutida**. _(WA)_
- [x] **Desempenho com cofres grandes** — 10 mil notas sem travar no celular. _(lição do estudo)_
- [x] **Zero telemetria e nenhuma chamada de rede fora do VTT**. _(PROJ)_ **(obrigatório)**
- [x] **Atualização manual** — o app não busca atualizações sozinho; o botão "Verificar atualizações" consulta só quando você clica (ADR 0017). _(PROJ)_
- [x] **API de extensões** (futuro). _(FVTT, OBR, OBS)_
