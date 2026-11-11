# Conferências para a 1.0 (T8, revisadas em 31/10/2026)

**Para:** o dono. Pela decisão D4, a `v1.0.0` sai quando tudo o que está aqui for conferido com êxito. Esta lista
substitui, para a 1.0, as seções abertas do fim de [`docs/04-testes-pendentes.md`](../../04-testes-pendentes.md) (do PR
#89 em diante): junta o que se repete, tira o que mudou depois e separa o que só um aparelho real confere. As
conferências antigas (V1 a V4) já foram feitas.

Ao conferir, marque o item aqui. Se algo falhar, anote na linha o que aconteceu: vira uma correção antes da tag.

> **Conferidas pelo dono em 01/11/2026: todas com êxito** (seções A e B). No mesmo dia ele pediu as sobras da revisão
> das Campanhas (ADR 0035), a mesclagem dos PRs e o lançamento da 1.0.0.

## A. Só num aparelho real (bloqueiam a 1.0)

Nenhum agente consegue fazer estas conferências: precisam do seu computador, do seu celular ou de outra pessoa.

- [x] **Atualizar para a 1.0 pelo app**, sem perder cofre, PIN e preferências:
  - [x] Ubuntu com o `.deb`. Com o `freedownloadmanager` ainda quebrado, a 1.0 tem que reiniciar sozinha. A correção
    do U1 só vale a partir da 1.0: da beta.24 para a 1.0 o aviso de erro ainda pode aparecer. Nesse caso, feche e abra
    o app e confira em Configurações › Privacidade e atualizações (“Versão instalada”) se a 1.0 entrou.
  - [x] AppImage.
  - [x] Windows.
  - [x] Android, sem reinstalar (o `versionCode` da 1.0 é maior que o de qualquer beta).
- [x] **Windows com o Obsidian aberto no mesmo cofre:** gravar a mesma nota várias vezes seguidas sem “operation not
  permitted” (docs/04, “Lançamento da beta.23”).
- [x] **Sala do celular pela internet (R4):** Gerar link público, abrir num aparelho pelos dados móveis, entrar com o
  código, Testar link, tela apagada por alguns minutos sem cair, Desligar derruba o link.
- [x] **Bateria com o link público:** 30 minutos sem túnel, com o túnel parado e com um jogador mexendo; a meta é até
  5 % por hora com o túnel parado (ADR 0032).
- [x] **Sala com dois aparelhos de jogador** (desktop e celular hospedando):
  - [x] cada jogador move só o próprio token;
  - [x] uma barra “Mestre e dono” (U12) aparece só para o dono do token;
  - [x] uma barra “Só o mestre” não aparece para ninguém.
- [x] **Leitor de tela** (Orca ou NVDA no computador, TalkBack no celular):
  - [x] título de cada tela;
  - [x] menus ⋯ (agora abertos por cima da página);
  - [x] grade do ano no Calendário;
  - [x] diálogos (o foco entra e volta).
- [x] **Texto a 140 %** no celular e **320 px**: Notas, Wiki, Campanhas, Agenda, Livros e a mesa, sem rolagem para os
  lados.
- [x] **Android físico:**
  - [x] “Compartilhar com” um texto e uma foto cria a nota em `Compartilhados`;
  - [x] o widget da Agenda abre a Agenda;
  - [x] o botão voltar fecha o diálogo antes de sair.
- [x] **Impressão:**
  - [x] um livro exportado em PDF, EPUB e DOCX abre num leitor de cada formato;
  - [x] uma página impressa de verdade sai com margens e fontes certas.
- [x] **Desempenho com placa de vídeo e no celular:** o gráfico global com 10 mil notas aparece em poucos segundos e
  responde ao arrastar e ao zoom (T6).

## B. Funções novas desde a beta.21 (no computador, cerca de uma hora)

Os passos detalhados estão na seção indicada de `docs/04`.

- [x] **U1 a U14** (seção “Próxima atualização: U1 a U14”): menus ⋯, renomear e excluir mesas, Entrar Sala, filtros
  lembrados, missões, calendário do ano, propriedades no trilho, barras, biblioteca e Notas da mesa.
- [x] **T1** Backups agendados: horário, quantos guardar, desligar.
- [x] **T2** Cópias de conflito: aviso, Comparar, manter o original, ficar com a cópia, Obsidian Sync.
- [x] **T3** Atalho da captura rápida no GNOME (Wayland) e no KDE.
- [x] **T4** Importar na mesa: `.dd2vtt` do Dungeondraft, cena do Foundry e tokens em lote.
- [x] **T6** Lista e busca das Notas com 10 mil notas (`?cofre-grande=10000` no navegador).
- [x] **Campanhas** (seção “Campanhas: correções da revisão…”):
  - [x] data da sessão leva o evento;
  - [x] Sessões, Painel, Ferramentas e Elenco com muitos NPCs;
  - [x] mapa de missões e “Gerar no Quadro”;
  - [x] Nova aventura;
  - [x] criar a partir do link;
  - [x] diário dos jogadores.
- [x] **E1** Elenco em Grade ou Lista.
- [x] **Geradores da Wiki**: grupos, 43 culturas, 1/5/10 resultados, Usar, Copiar, Guardar na wiki, Recentes e 320 px.
- [x] **R1/T7**:
  - [x] abas das Notas pelo teclado;
  - [x] botões das pastas no hover e no foco;
  - [x] painel do gráfico;
  - [x] luas no tema claro;
  - [x] caixas de 24 px no celular.

## C. O que saiu da lista (e por quê)

| Item em `docs/04` | Por que saiu |
|---|---|
| “Missões no computador: Mover para em cada cartão, pelo teclado” | O U7 levou o “Mover para” para o ⋯ do cartão; a conferência nova está no U7. |
| “Ler `revisao-1.0.md` e decidir a ordem do que ficou aberto (D11, D13…)” | D11 e D13 foram corrigidos (T7, 30/10); a revisão das Campanhas não impede a 1.0 (`rumo-a-1.0.md`). |
| “Atualizar da beta.21 para a beta.22”, “da beta.22 para a beta.23” e “para a beta.24” | Viraram uma conferência só: atualizar para a 1.0 (seção A). |
| “Conferir T1 a T4 e as seções acima” (beta.22) e “Conferir E1, T7, R1…” (beta.23) | Repetiam as seções; os itens estão nas seções A e B. |
| “O resultado da revisão no Android (artefato `android-revisao`)” | Continua valendo, mas só como apoio: a conferência que decide é no aparelho físico (seção A). |

## Depois das conferências

1. O dono mescla o PR dos U1 a U14 e o PR da versão 1.0.0 na `main`.
2. O CI da `main` passa (os quatro comandos e o workflow Release inteiro, inclusive o passo novo que atualiza o `.deb`
   por cima da versão anterior).
3. A tag `v1.0.0` sai pelo workflow “Lançar versão” (ADR 0025), com as notas de `docs/releases/v1.0.0.md`.
4. As betas continuam recebendo a 1.0 pelo botão; quem está na 1.0 só recebe versões estáveis.
