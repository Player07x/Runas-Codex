# ADR 0038 — Aviso de atualização (atualização 1.5, U90)

- **Status:** aceita (2026-11-17)
- **Atualiza:** a [ADR 0017](0017-atualizacoes.md) (“só quando o usuário clica”) e a regra 6 do `AGENTS.md`.

## Contexto

Até a 1.4, o app só consultava as versões publicadas quando o usuário abria Configurações › Privacidade e atualizações
e clicava em “Verificar atualizações”. Quase ninguém abre essa tela, e quem testa as versões ficava semanas numa
versão velha. O João pediu (decisão 5 de 17/11): consultar sozinho **uma vez por dia, ao abrir**, **ligado por
padrão**, com a opção de desligar em Privacidade; com versão nova, um item “Atualizar para 1.x” no fim da barra
lateral (e no “Mais” do celular) que, ao ser clicado, já atualiza.

## Decisão

- **O que vai à rede:** a mesma consulta do botão, `GET api.github.com/repos/Player07x/Runas-Codex/releases`, feita
  pelo processo principal do Electron ou pelo plugin `RunasUpdates` do Android (a CSP da interface não muda). Nenhum
  dado do cofre, identificador ou estatística é enviado; o GitHub vê o IP e o `user-agent` `Runas-Codex/<versão>`,
  como no botão.
- **Quando:** ao abrir o app, 4 s depois de a tela desenhar, se a opção está ligada, se ainda não houve consulta que
  deu certo **neste dia (data local)** e se o sistema diz que há rede. Uma consulta que falha não mostra erro e não
  conta: a próxima abertura tenta de novo. O app aberto por vários dias não consulta de novo sozinho.
- **O que fica guardado:** só neste aparelho, no `localStorage` (regra 5): `runas-codex:atualizacao-automatica` (`"0"`
  desliga) e `runas-codex:atualizacao-consulta` (`{ checkedOn, latest }`: o dia da consulta e a versão nova que ela
  achou). Nada vai para o cofre.
- **O aviso:** um item dourado “Atualizar para 1.x” no fim da barra lateral (no modo recolhido, só o ícone, com o
  nome no `aria-label` e no `title`) e no “Mais” do celular, com um ponto no botão “Mais” (“Mais, atualização
  disponível” para o leitor de tela). Só aparece se a versão nova tem instalador deste sistema e `SHA256SUMS.txt`. Some
  sozinho depois de atualizar (a versão lembrada deixa de ser mais nova que a instalada).
- **Ao clicar:** o mesmo caminho do botão de Configurações, sem caminho novo: consulta de novo se esta sessão ainda não
  consultou (o processo principal só instala o que a última consulta achou), grava as notas abertas, baixa, confere o
  SHA-256 e instala (Windows abre o instalador; AppImage e `.deb` reiniciam; Android abre o instalador do sistema). O
  progresso aparece no próprio item (“Baixando 42 %”, barra fina embaixo). **Instalar sempre depende de um clique.**
- **Um estado só** (`app/src/lib/updates.ts`): Configurações e a barra lateral usam a mesma consulta e o mesmo
  download; um não começa outro por cima. A regra de quando consultar é pura, em `app/src/core/update-schedule.ts`.
- **Testes sem internet:** no `--smoke`, o processo principal conta e recusa a consulta (`updateChecks` no
  resultado); o exemplo do navegador simula uma versão nova só com `?atualizacao-exemplo` na URL.

## Consequências

- A regra 6 do `AGENTS.md`, a seção 6 do docs/02, a lista de recursos e as páginas de ajuda de Privacidade e de
  Configurações passam a dizer que há uma consulta diária desligável; o selo “Offline · cofre local” continua
  (o cofre não vai à rede), e o `title` dele cita a consulta.
- O GitHub limita a API sem autenticação a 60 consultas por hora por IP; uma por dia por aparelho fica longe disso.
  Se a resposta for 403, a consulta automática só falha em silêncio.
- No Android, a permissão “Instalar apps” continua necessária, porque o aviso instala o APK pelo app (U91, item 5).
- Para desligar: Configurações › Privacidade e atualizações › “Procurar atualizações sozinho”. Com ela desligada, o
  app volta ao comportamento da ADR 0017 (só o botão).
