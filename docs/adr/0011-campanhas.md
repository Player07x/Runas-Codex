# ADR 0011 — Campanhas como notas e quadros em JSON Canvas

- **Status:** aceita (2026-10-14)

## Contexto
Etapa 7 (docs/02, seção 8): `.canvas` no formato JSON Canvas 1.0, preservando campos desconhecidos, e Campanhas com
painel, sessões, missões e NPCs vindos do cofre. Como a migração do Runas-DM saiu do plano (ADR 0004), o critério
passa a ser: **o quadro da campanha salvo em `.canvas` abre igual no Obsidian**. Tudo continua sendo nota comum
(seção 4) e as gravações passam pelo `useVault()` (conferência de mtime/tamanho, somente leitura respeitado).

## Decisão
**Campanha = pasta `Campanhas/<nome>/`** com a nota inicial `Campanhas/<nome>/<nome>.md` (`tipo: campanha`): `status`
(ativa, pausada, concluída), `resumo`, `wiki` (nome da wiki da campanha, de onde vem o calendário
fictício), `mesa` (id da mesa do VTT), `npcs` e `faccoes`, `linhas` e `veus` (ferramentas de segurança) e `fixadas`
(notas da Tela do Mestre). Qualquer subpasta de `Campanhas/` com um arquivo já conta como campanha.

**Sessão = nota com `tipo: sessao`** (ou dentro de `Sessões/`): `numero`, `status` (planejada, realizada, cancelada),
`data`, `hora`, `hora_fim`, `data_mundo` (no calendário da wiki, entre aspas, como na ADR 0010), `presentes` (links
para os personagens) e `avaliacao` (0 a 10). O corpo tem três seções: **Preparação** (roteiro de 7 passos em tarefas:
recapitulação, início forte, cenas, segredos e pistas, locais, NPCs, recompensas), **Anotações** e **O que
aconteceu**. Criar a sessão pela campanha cria também o evento da Agenda (formato do Full Calendar, ADR 0008), com
lembrete de 1 dia e contagem regressiva; a sessão guarda `evento` e o evento guarda `sessao`. A tela inicial mostra a
próxima sessão de campanha, mesmo sem evento.

**Missão = nota com `tipo: missao`** (ou em `Missões/`): `status` (ideia, ativa, pausada, concluída, falhou) vira a
coluna do quadro de missões; `ordem` ("1", "1.1", "2") é a ordem narrativa; `contratante` e `recompensa`. Arrastar
entre colunas (ou o seletor, no celular) troca só o `status`.

**Personagem do jogador = nota com `tipo: personagem-jogador`** (ou em `Personagens/`): `jogador`, `conceito`, `cor`.
Sem ficha (ADR 0004).

**NPCs e facções = listas na nota da campanha**, no mesmo formato das relações da wiki: `"[[Conde Ormund]] (hostil)"`
e `"[[Ordem da Chama Cinzenta]] (+1)"`. O texto entre parênteses é a atitude (aliado, amigável, neutro, desconfiado,
hostil) ou a reputação (−3 a +3). "Visto em" sai dos links das notas de sessão para o NPC.

**Segredos e pistas = tarefas da seção `## Segredos e pistas`** da nota da campanha. Marcar como revelada acrescenta
`— revelado em [[…/Sessão N]]` (a última sessão já jogada ou, se não houver, a próxima); desmarcar tira. **Relógios = bloco ` ```runas-relogios `**
em YAML (`nome`, `segmentos`, `preenchidos`, `tipo: ameaca | progresso`), desenhado pelo ponto de extensão
`registerCodeBlock` (ADR 0007); no Obsidian aparece como código.

**Quadro = arquivo `.canvas` (JSON Canvas 1.0)** em `core/canvas.ts`: ler, gravar e editar sem React. Cartões de
texto, nota (com `subpath`), link e grupo; ligações com lados, pontas, cor e rótulo; cores `"1"`–`"6"` ou `#hex`; ids
de 16 dígitos hexadecimais. **Campos desconhecidos** (no arquivo, em cada cartão e em cada ligação) e tipos de cartão
desconhecidos ficam como estão; a gravação mantém o recuo (tabulação, como o Obsidian) e o fim de linha do arquivo, e
um quadro que não mudou não é regravado. Mover um grupo leva os cartões de dentro, como no Obsidian. O cartão de link
só mostra o endereço (abre no navegador): o app não busca nada na internet e a CSP não muda. Renomear uma nota já
atualizava o `file` dos quadros (etapa 3a). O editor (`components/canvas/`) é o mesmo para os quadros da campanha
(aba Quadro) e para qualquer `.canvas` do cofre (rota `/quadro/<caminho>`, aberta pela busca e pelos links).

**Exportar:** o diário da campanha sai num `.md` (sessões realizadas, datas real e no mundo, "O que aconteceu", links
virando texto), pelo `saveFile` da Platform que a Agenda já usa. A campanha inteira já é uma pasta comum do cofre.

**Tela do Mestre** (painel em tela cheia): notas fixadas, NPCs com atitude, relógios, pistas ainda guardadas,
ferramentas de segurança e rolagem rápida. **Estatísticas**: sessões realizadas, horas (pelos horários), presença e
nota média.

## Consequências
- Testes: núcleo de campanhas (campanhas, sessões e preparação, missões, personagens, NPCs e facções, pistas,
  relógios, notas novas, próxima sessão, diário) e do quadro (arquivo sem mudança não é regravado, campos
  desconhecidos, recuo com tabulação, ids sem repetir, grupos, ligações). O `--smoke` abre o painel e o quadro do cofre de teste e, com `--write`,
  cria a Sessão 13 pela tela (nota + evento) e um cartão no quadro (JSON válido, campos desconhecidos mantidos, link
  renomeado).
- O cofre de exemplo do navegador ganha a campanha "As Cinzas de Valdris" (4 sessões, 7 missões, 4 personagens e um
  quadro); "A Cripta (one-shot)" e "Coroa Partida" têm a nota da campanha e uma sessão cada.
- Ficam para depois: pinça para zoom e seleção de vários cartões no quadro, cartões de imagem com recorte, tesouro do
  grupo, diário dos jogadores, avaliação anônima pela sala, gerador de aventuras, iniciativa presencial, diário em
  PDF/HTML e o pacote de campanha (exportar e importar com mesas e eventos; as migrações de outros apps são da etapa 10).
