# ADR 0035 — Campanhas: sobras da revisão

- **Status:** aceita (2026-11-01)

## Contexto
A [revisão das Campanhas](../propostas/campanhas-revisao.html) (30/10) deixou itens sem fazer, listados em
[`rumo-a-1.0.md`](../tarefas/concluidas/rumo-a-1.0.md): avançar a data do mundo pelo Painel, retorno “Gravado”, desfazer em vez de
confirmar, Ferramentas em linhas únicas, Quadro sem renomear e sem modelos, ligar missões só pelo diálogo e as ideias
da revisão. O dono pediu todos antes da 1.0 (01/11).

## Decisão
1. **Hoje no mundo.** O Painel e a sessão gravam a mesma linha `hoje:` do bloco `runas-calendario` que a Wiki grava
   (`useSetWorldToday`, com os calendários sincronizados). Marcar a sessão como realizada só *pergunta* se o mundo
   avança para a `data_mundo` dela, e só quando essa data fica depois de hoje no mundo.
2. **Gravar ao sair.** Os campos da sessão guardam a gravação pendente enquanto se digita (`useDrafts`); fechar o
   painel, trocar de tela ou esconder o app grava o que ficou pendente. Depois de gravar, “Gravado” aparece ao lado do
   campo numa região `role="status"`.
3. **Desfazer.** Apagar relógio, item do tesouro, participante da iniciativa, NPC ou facção do Elenco e desvincular
   personagem agem na hora; o aviso traz “Desfazer” por 10 s (parado enquanto o ponteiro ou o foco estão nele). O
   desfazer devolve o texto anterior da nota **só se ninguém mexeu nela depois**; senão avisa. Se o item apagado tinha
   o foco, o foco vai para o “Desfazer”.
4. **Pistas que destravam missões** ficam no próprio texto da pista: `- [ ] O selo é falso → [[O Selo do Conde]]`.
   Continua uma tarefa comum que o Obsidian mostra com o link; não há propriedade nova.
5. **Relógios por missão** são o mesmo bloco `runas-relogios`, dentro da nota da missão.
6. **Mapa de relações** lê as relações que os artigos da wiki já declaram (`aliados`, `inimigos`, `membro_de`…) e liga
   “o grupo” a cada NPC pela atitude e a cada facção pela reputação. Gerar de novo mantém os cartões onde o mestre os
   arrastou e o que ele acrescentou (ids `runas-relacao-…`, como os `runas-missao-…` do mapa de missões).
7. **Ligar missões arrastando** grava `requer` na missão de destino; o modo “Ligar aqui” (tocar na bolinha e depois na
   outra missão) é a alternativa para toque, teclado e leitor de tela. Ciclos e ligações repetidas são recusados.
8. **Quadro de missões na sala** usa o canal de “Mostrar artigo pela sala” (`handout`): texto puro, só com as missões
   conhecidas (sem ideias e sem bloqueadas), que o mestre confere antes.
9. **“O que mudou desde a última sessão”** conta como “mexidas” as missões cuja nota mudou do dia da sessão em diante
   (data do arquivo). O app não guarda histórico de situação.

## Consequências
- Nada novo vai para o frontmatter; versões anteriores do app mostram a pista com o link como texto e ignoram o bloco
  de relógios na missão (que o Obsidian mostra como bloco de código).
- Um programa que regrava todas as notas (sem preservar a data) faz todas as missões aparecerem como “mexidas”.
