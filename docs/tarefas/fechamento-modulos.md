# Tarefa: fechamento dos módulos (X5, X6, C5, C6, C7)

**Para:** as duas frentes, cada uma nos seus módulos (a [divisão](README.md) diz quem mexe em quê). **Leia antes:**
[`AGENTS.md`](../../AGENTS.md) e a [checklist](../01-checklist-recursos.md).

As etapas do plano entregaram o centro de cada módulo, mas vários itens da checklist ficaram de fora ou foram
marcados como "fica para depois" nas ADRs. Esta tarefa fecha cada módulo **antes do polimento (11)**.

## Como fazer (vale para todas as fases)

1. **Varredura:** compare cada item das suas seções da checklist com o app e monte uma tabela no começo do PR:
   *pronto*, *falta* ou *fora do plano* (com o motivo: ADR 0004 ou depois da 1.0, como está no [README](README.md)).
2. **Implemente o que falta**, um PR por fase. Se a fase passar de uns 15 itens grandes, divida em dois PRs pela
   ordem da checklist e avise na tabela de situação.
3. Cada item novo segue as regras de sempre: lógica em `core/` com testes, compatível com o Obsidian, nada de rede,
   funciona no celular, temas escuro e claro.
4. Registre as decisões na ADR do módulo e acrescente o que precisa de conferência manual em
   `docs/04-testes-pendentes.md`.

## X5 — Livros (Codex)

Seções **E.1, E.2 e G.3**. Já se sabe que falta: HTML, RTF e Markdown do livro inteiro; índice remissivo;
glossário a partir dos artigos da wiki citados; fundos de página, texturas e marca d'água; sangria e marcas de corte;
modo foco / máquina de escrever; comentários de revisão; snapshots de capítulo com comparação; painel lateral com
notas da wiki; marcação de personagens e locais citados; CSS próprio do usuário. Importar livros do Runas Book está
fora do plano.

## X6 — Mesa (Codex)

Seções **D.1 a D.4 e G.1** (menos "Hospedar sala pelo Android", que é a X7). Já se sabe que falta (ADR 0006 e
checklist): pacote da mesa inteira e de partes (cena, tokens, mapas, playlists, paredes e luzes); importar Universal
VTT (`.dd2vtt`/`.uvtt`), cenas do Foundry e tokens em lote; pinos do mapa ligados às notas do cofre; handouts (imagem
ou nota em tela cheia para os jogadores, que a Wiki vai usar para "mostrar artigo pela sala"); túnel alternativo e
sincronização incremental. Na varredura, confira também os itens de combate, dados e cena (D.2 a D.4). Voz e vídeo
estão fora do plano (decisão do dono). "Tabelas roláveis na mesa — as mesmas da wiki" depende dos geradores da Wiki
(C6): combine o formato com o Claude Code pelo PR.

## C5 — Núcleo de notas e editor (Claude Code)

Seções **A.1, A.2, A.3 e F.1**, menos a gestão de anexos (já feita na C1 e na C2). Já se sabe que falta (ADR 0007):
prévia de link por hover e toque longo, comandos `/`, linkar com `@`, abas e painéis divididos, timelapse do gráfico.

## C6 — Wiki, Campanhas e Agenda (Claude Code)

Seções **B, C, F.2 e G.5**. Já se sabe que falta:
- **Wiki** (ADR 0010): galeria e áudio no artigo, spoilers inline, eventos fictícios recorrentes além dos feriados,
  crônicas (mapa por era), zonas e desenhos no mapa, mapa com várias camadas, geradores, idiomas com dicionário,
  metas de palavras, mostrar artigo pela sala (usa os handouts da X6). Importar Fantasy-Calendar e Calendarium é da
  C4 (etapa 10).
- **Campanhas** (ADR 0011): pinça para zoom e seleção de vários cartões no quadro, cartões de imagem com recorte,
  tesouro do grupo, diário dos jogadores, avaliação anônima pela sala, gerador de aventuras, iniciativa presencial.
  O diário em PDF/HTML é da X4.
- **Agenda** (ADR 0008): enquete de data pela sala, criar sessão cria o evento, bandeja do desktop, widget do
  Android (este fica para a C8, com o Android completo).

## C7 — Pacotes (Claude Code)

Seções **G.2** (o que não é documento nem migração), **G.4** (pacote de campanha) e **G.6**: pacote `.runas` com
manifesto e versão (mesclar, substituir ou duplicar ao importar), pacote de campanha (notas, sessões, mesas de
`.runas/mesas/` e eventos ligados), exportar pasta ou ZIP compatível com o Obsidian, exportação seletiva com
dependências, backups agendados e arquivos de conflito do Syncthing e do Obsidian Sync. Sincronizar aparelhos pela
rede local está fora do plano (decisão do dono). A tela **Transferir** deixa de ser protótipo aqui; o Codex
acrescenta as entradas de Mesa e de Livros.
