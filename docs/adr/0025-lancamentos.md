# ADR 0025 — Lançamento de versões a pedido do dono

- **Status:** aceita (2026-10-21)

## Contexto
O dono pede versões novas antes de todos os recursos de uma fase estarem prontos, para testar no uso real o que já
foi feito (no celular, todo dia). Isso é o comportamento esperado, não exceção: entre 15 e 20/10 saíram 15
pré-releases.

Em 20/10 a beta.15 foi publicada a partir de um commit com a X4 e a X7; horas depois, a mesclagem `85914b2` (do #40)
devolveu a `main` à versão anterior a esses dois commits. A `main` voltou a dizer beta.14 e perdeu 42 arquivos que já
estavam no app instalado. O PR #52 restaurou tudo. Esta regra existe para que uma versão nunca saia sem o que a
anterior tinha e para que lançar cedo não quebre o que já funciona.

## Decisão
1. **Versão a pedido, a qualquer momento.** Quando o dono pede “lançar”, o agente que recebeu o pedido publica a
   próxima pré-release com o que já está na `main`, mesmo com fases incompletas. Não se espera a fase terminar.
2. **Só da `main`.** A tag `v0.1.0-beta.N` sai do commit da `main` depois do merge do PR de versão. Nada de tag em
   branch não mesclado. Se o dono quiser algo que ainda está num PR aberto, esse PR entra primeiro.
3. **O número sempre sobe.** N é a última tag mais 1, nunca reaproveitado. A versão é a mesma nos quatro
   `package.json` (raiz, `app`, `desktop`, `mobile`) e nunca é menor que a da última tag.
4. **Nada some entre versões.** Antes da tag, o PR de versão mostra o resultado de
   `git diff --diff-filter=D --name-only <tag anterior> HEAD`: cada arquivo que existia na versão anterior e não existe
   mais precisa de uma linha explicando (removido de propósito, renomeado para…). Lista vazia ou explicada; senão, não
   há tag.
5. **Incompleto não quebra o que existe.** Uma tela ou recurso pela metade só entra se não remover nem piorar nada que
   já funciona. A interface não finge: ação que ainda não funciona por inteiro não aparece, ou aparece desativada com
   o motivo (regra 10 do `AGENTS.md`).
6. **Notas de versão em três blocos**, em `docs/releases/v0.1.0-beta.N.md`, usadas no
   `gh release edit --notes-file`:
   - **Pronto para testar**, com passos curtos;
   - **Em construção (pode mudar)**, o que entrou incompleto e o que ainda vai mudar;
   - **Problemas conhecidos**.
7. **CI verde.** Os quatro comandos de entrega e o workflow Release inteiro (Linux, Windows e os jobs Android)
   passam antes da tag. Se um job falha por motivo alheio à versão, o PR diz qual job e por quê, e o dono decide.
8. **Conferência do dono.** Cada versão acrescenta no fim de `docs/04-testes-pendentes.md` o que conferir nela. Quando o
   dono responde, o agente registra lá “aprovado pelo dono em DD/MM” (ou o que falhou), também só acrescentando.

## Consequências
- O fluxo continua PR → CI → merge → tag → notas, agora com a lista de arquivos removidos no PR de versão.
- Uma versão pode trazer telas em construção, mas nunca menos do que a anterior.
- O agente que publica é o que recebeu o pedido. Se o outro tiver um PR aberto que deveria entrar, pergunta ao dono
  antes.

## Adendo — workflow “Lançar versão” (30/10/2026)

As sessões do agente na nuvem só enviam commits para o próprio branch; a tag da beta.22 e a da beta.23 tiveram de ser
enviadas pelo dono. O workflow `.github/workflows/lancar-versao.yml` (execução manual, só na `main`) faz o mesmo passo
pelo GitHub e confere as regras desta ADR antes: versão igual nos quatro `package.json`, maior que a última tag e nunca
repetida (regra 3), notas em `docs/releases/v<versão>.md` (regra 6) e CI verde no commit (regra 7). Ele cria a tag
anotada no commit da `main` e chama o Release na tag; o Release publica como se a tag tivesse sido enviada à mão,
inclusive com o APK de release conferido. Enviar a tag à mão continua valendo. Quem pode rodar Actions no repositório
pode lançar, como hoje quem pode enviar tags.
