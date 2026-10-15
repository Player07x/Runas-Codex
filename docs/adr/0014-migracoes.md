# ADR 0014 — Migrações: os plugins de RPG do Obsidian

- **Status:** aceita (2026-10-15)

## Contexto
Etapa 10 (docs/02, seção 8), tarefa C4: **dados reais migrados sem perda**. Pela ADR 0004 a etapa começa pelo Obsidian;
Notion, Kanka, World Anvil e LegendKeeper ficam para depois da 1.0. O app já abre um cofre do Obsidian como ele está
(etapa 3a); o que ele não entende são os dados dos plugins de RPG que têm equivalente no app: calendários (Calendarium,
o antigo Fantasy Calendar e o site Fantasy-Calendar), mapas (Leaflet), fichas (Fantasy Statblocks) e encontros
(Initiative Tracker). Full Calendar (Agenda) e Dice Roller (`dice:`) já usam o mesmo formato; blocos `dataview` e
arquivos `.base` ficam intactos.

## Decisão
**Conversores em TypeScript puro** em `app/src/core/import/`, um por plugin, com testes a partir de exemplos no formato
que cada plugin grava (`fixtures/`). Os formatos foram lidos no código-fonte dos plugins (Calendarium 2.1, Obsidian
Leaflet 6.0, Fantasy Statblocks 4.10, Initiative Tracker 13.0); só o formato dos dados foi seguido, sem copiar código.

| Plugin | De onde vem | Vira |
|---|---|---|
| Calendarium e Fantasy Calendar (plugin) | `.obsidian/plugins/{calendarium,fantasy-calendar}/data.json` | uma nota nova por calendário, com o bloco `runas-calendario` (ADR 0010) |
| Fantasy-Calendar (site) | o JSON exportado, escolhido na tela | idem |
| Datas nas notas do Calendarium | `fc-date`/`fc-start`, `fc-end`, `fc-calendar` no frontmatter | `calendario`, `data_mundo`, `data_fim_mundo` (as chaves `fc-*` ficam) |
| Leaflet | blocos `leaflet`, os marcadores do `data.json` (pelo `id` do mapa) e as notas com `location` | bloco `runas-mapa` no lugar do `leaflet` |
| Fantasy Statblocks | blocos `statblock`; `monster:`/`extends:` puxam o bestiário do `data.json` e das notas com `statblock: true` | callout `> [!statblock]` |
| Initiative Tracker | blocos `encounter` e `encounter-table` | bloco `runas-encontro` (novo, abaixo) |

**Contas que precisam bater.** O calendário convertido calcula o mesmo dia da semana que o Calendarium (o
`firstWeekDay` é o dia do 1/1 do ano 1; meses intercalares não andam a semana; o bissexto vira `a_cada`/`exceto_a_cada`/
`salvo_a_cada`); o gregoriano do Calendarium confere com o `Date` do JavaScript. As luas do Calendarium contam só os
dias da semana; a conversão marca uma cheia perto da data atual da campanha, e as fases batem com as dele nessa época.
No Leaflet, um mapa de imagem sem `bounds` usa `lat = −py/2^(maxZoom−1)` e `long = px/2^(maxZoom−1)`: a conversão lê o
tamanho da imagem pelo cabeçalho (PNG, JPEG, GIF, WebP) para chegar à posição de 0 a 1 do pino; marcadores salvos já
trazem essa posição (`percent`). A escala do Leaflet (`scale` por unidade de coordenada) vira `escala` em pixels. O tipo
do marcador vira a `camada` do pino (é por ela que o app filtra).

**Nada some em silêncio.** O que o app não tem vira aviso na tela e, quando é texto, entra na nota: eventos sem data
fixa e descrições de eventos vão para uma seção "Eventos do Calendarium" da nota do calendário; campos do statblock
que o conversor não conhece entram como `**Campo** valor`. Ficam como estão, com aviso: mapas do mundo real (camadas da
internet), imagens da internet, criaturas do SRD que só existem dentro do plugin, blocos dentro de citações ou callouts
e encontros em linha (`` `encounter: …` ``).

**A tela** (`screens/import/ObsidianMigration.tsx`, em Importar / Exportar › "Plugins de RPG do Obsidian", rota
`/transferir/obsidian`) acha os plugins, mostra quantos blocos de cada um, o que muda em cada nota (o trecho de antes e
o de depois) e os avisos; o usuário escolhe o que migrar. Ao confirmar, **faz o backup** (`platform.backup()`, o mesmo
de Configurações) e, só se ele deu certo, grava nota por nota pelo `useVault()` (`createNote`, `save`), conferindo que
a nota não mudou desde a prévia. Opcionalmente guarda o bloco original num comentário `%% … %%` logo depois do novo,
para quem ainda usa o plugin no Obsidian (o comentário não aparece no app nem no Obsidian, e a migração não o conta de
novo). Migrar de novo não muda nada: blocos já convertidos não são achados e calendários com o mesmo `nome` não são
recriados.

**Onde ficam os calendários novos:** na wiki, se o cofre tem uma só e ela ainda não tem calendário; senão, em
`Calendários/`. Uma wiki com calendário que ganha outro deixa de ter "o único calendário da wiki" (ADR 0010), e os
artigos sem `calendario:` perderiam as datas — a tela avisa se a pasta escolhida cai nesse caso.

### Bloco `runas-encontro` (encontros genéricos)
Encontro = participantes de um combate, sem ficha (checklist C, "Encontros genéricos" e "Iniciativa presencial"), num
bloco YAML desenhado como tabela em qualquer nota (`screens/campaigns/EncounterBlock.tsx`, pelo `registerCodeBlock`):

```yaml
nome: Emboscada na estrada
jogadores: true            # true = todos; lista de nomes; false = nenhum
grupo: Os Cinzentos        # opcional
esconder: [criaturas]      # opcional: jogadores e/ou criaturas
xp: 450                    # opcional
combatentes:
  - { nome: Goblin, quantidade: 3, pv: 7, ca: 15, iniciativa: 2, nota: "[[Goblin]]" }
  - { nome: Hobgoblin, apelido: Capitão, oculto: true }
  - { nome: Lobo, quantidade: 1d4, aliado: true, rolar_pv: true }
```

`iniciativa` é o modificador; `quantidade` pode ser rolagem; `nota` liga à nota da criatura. O leitor é
`core/encounters.ts` (`parseEncounter`): é por ele que a mesa (fechamento da mesa, X6, frente do Codex) importa o
encontro para a iniciativa, sem depender da migração.

## Consequências
- Testes: blocos com as cercas e comentários (CRLF, til, `%%`), tamanho de imagem, Calendarium (gregoriano contra o
  JavaScript; um calendário de fantasia contra a conta do Calendarium, com intercalares, duas luas, eras, estações e
  eventos), Fantasy-Calendar, Leaflet (com e sem `bounds`, marcadores do `data.json` e das notas), Fantasy Statblocks
  (bestiário, campos desconhecidos), Initiative Tracker (todas as formas de combatente) e o plano no cofre de exemplo:
  fora dos blocos convertidos e das chaves novas do frontmatter nenhum byte muda, o CRLF fica, e migrar de novo não
  muda nada. O teste de ida e volta com `RUNAS_CORPUS` faz o plano num cofre real e confere o mesmo.
- O `--smoke` acha os quatro plugins no cofre de teste; com `--write` migra pela tela (backup incluído) e confere os
  arquivos e o bloco `runas-encontro` desenhado.
- O dialeto ganha o bloco `runas-encontro`; no Obsidian, como os outros blocos do app, aparece como código.
- Ficam para depois: zonas, círculos e desenhos do Leaflet (o mapa do app ainda não tem), meses que só aparecem em
  alguns anos, mais de um dia bissexto, semana própria de cada mês, nomes de ano personalizados, datas repetidas
  (`*`) do Calendarium, a pasta de configuração do Obsidian com outro nome que não `.obsidian`, e o restante da etapa
  10 depois da 1.0 (Notion, Kanka, World Anvil, LegendKeeper).
