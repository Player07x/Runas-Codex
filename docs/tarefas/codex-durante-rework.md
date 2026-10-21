# Tarefa: o que o Codex faz enquanto o Claude Code refaz o visual (21/10/2026)

**Para:** Codex. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a [regra de lançamentos](../adr/0025-lancamentos.md)
e a seção “Rework visual e redistribuição” do [README das tarefas](README.md).

O dono pediu que o Claude Code dedique todo o tempo ao rework visual (fases F1 a F5). Tudo o que não depende da
interface nova passa para o Codex. Um PR por item, na ordem abaixo, salvo o que estiver marcado como “depois de”.

## Regra de convivência com o rework

Durante o rework, **telas, componentes e estilos são do Claude Code**: `app/src/screens/**`, `app/src/components/**`,
`app/src/styles/**` e o CSS dos módulos. O Codex trabalha no núcleo (`app/src/core/**`), na `Platform`, no processo
principal do desktop, no Android nativo e no VTT por dentro (`app/src/vtt/**`, que o rework não muda). Se um item
precisar de uma tela, faça a parte de núcleo e peça a tela no PR; o Claude Code encaixa na fase certa.

## 1. Sala do VTT pela internet no Android (relato do dono)

**Sintoma:** “ainda não é possível abrir mesas no VTT pelo Cloudflare”. O dono usa o app no celular todo dia.

**Causa encontrada:** na sala hospedada pelo celular (X7, ADR 0024), o túnel está marcado como não suportado:
`downloadCloudflared: unsupported` em `app/src/platform/android-room.ts`. A sala do Android só funciona na rede local;
o link `https://….trycloudflare.com` só existe quando o desktop hospeda.

**Pedido:**
- Confirmar primeiro se o dono fala do celular (o mais provável) ou também do desktop, e reproduzir os dois casos.
- Estudar e propor no PR, antes de implementar: (a) rodar o `cloudflared` para Linux arm64 dentro do APK (binário
  como biblioteca nativa, executado pelo `RoomService`), com a mesma verificação SHA-256 do desktop; (b) outra forma
  de túnel compatível com a regra 6 (só a sala usa a internet). Dizer o tamanho que soma ao APK e o consumo de
  bateria com a sala aberta.
- Enquanto não houver túnel no Android, a tela da sala precisa dizer isso claramente (hoje o usuário tenta e não
  entende por que não funciona).

## 2. Código cercado do Homebrewery escapando do callout

Achado na revisão do #20 (X2) e nunca corrigido: dentro de uma caixa `{{…}}` ou `<div class=note>` do Homebrewery,
um bloco de código cercado sai da caixa na importação; só a primeira linha ganha o `>`. Corrigir em
`app/src/core/books-import/**`, com teste que importe uma caixa com código cercado e confira o callout inteiro. **O dono
pediu que seja corrigido.**

## 3. Teste instável do PIN

`app/src/core/pin.test.ts` falha às vezes, quando o hash aleatório contém “2468”. Tornar o teste determinístico (sal
fixo no teste ou verificação que não dependa do conteúdo do hash). **O dono pediu que seja corrigido.**

## 4. Captura rápida pelo atalho global no Wayland

**Para que serve:** é o item “Captura rápida — atalho global no desktop” da checklist (seção G). O atalho
`Ctrl+Alt+N` abre uma nota nova de qualquer lugar do computador, sem procurar a janela do Runas-Codex: a ideia vai
para o cofre na hora, como no Google Keep. Hoje funciona no Windows e no Linux com X11; no GNOME com Wayland (o
computador do dono), não.

**Por que falha:** no Wayland, um app não pode escutar o teclado do sistema. O caminho oficial é o portal
`GlobalShortcuts`; o app já liga a opção do Electron, mas com o Electron 44.4.2 e o GNOME 50.1 a sessão do portal não
abre (registrado na ADR 0019).

**Pedido (dá para corrigir):**
- Entrada por linha de comando `runas-codex --captura`, que manda o app aberto (instância única, evento
  `second-instance`) criar a nota rápida, ou abre o app já nela.
- Em Configurações › Atalhos, no Linux com Wayland, um botão “Criar atalho no sistema” que registra no GNOME um atalho
  personalizado (`org.gnome.settings-daemon.plugins.media-keys`) rodando `runas-codex --captura`. Só com o clique do
  usuário, mostrando antes o que vai ser criado; e um botão para remover. No KDE, o mesmo pelo `.desktop` com ação.
- Continuar tentando o portal primeiro; o atalho do sistema é a alternativa quando o portal não abre.
- A tela de Atalhos é do rework: entregue a parte do processo principal e a API, e peça o botão no PR.

## 5. Fechamento da mesa (X6)

O que está em [fechamento-modulos.md](fechamento-modulos.md#x6--mesa-codex). No código de 21/10 não há pacote da mesa,
importação de Universal VTT, Foundry ou tokens em lote, pinos do mapa ligados a notas, tabelas roláveis na mesa nem
túnel alternativo. Os handouts e o “mostrar artigo pela sala” já existem.

## 6. C9 sem interface

- **Teste de rede no Electron:** o smoke passa a falhar se aparecer qualquer chamada de rede fora da sala do VTT e do
  botão “Verificar atualizações”.
- **Instaladores:** revisar nomes, ícones, atalhos e desinstalação (NSIS, `.deb`, AppImage, APK assinado).
- **Desempenho com 10 mil notas** (índice, busca, gráfico): gerador de cofre grande e números antes e depois. A
  virtualização das listas mexe nos componentes: **depois da F4** do rework, combinando no PR.
- **Ajuda offline:** o rework cria o painel de ajuda (F5); o Codex escreve o conteúdo de cada tela **depois da F5**.

## 7. C7: backups agendados e conflitos de sincronização

Backups com horário (núcleo e processo principal) e tratamento dos arquivos de conflito do Syncthing e do Obsidian
Sync. A seção Backups das Configurações e o aviso de conflito são do rework (F5): entregue o núcleo e peça a tela.

## 8. Tasks: o que falta na matriz

Os três itens ❌ de [tasks-matriz.md](tasks-matriz.md): comando “definir estado” por estado, `{{query.file.outlinks}}`
e a busca rápida de tarefas. Depois, conferir os casos com o plugin Tasks 8.6.0 aberto no Obsidian. O item “filtro
global escondido no modo leitura” fica de fora (a regra 7 não deixa mudar o leitor).

## 9. Depois do rework

- **Revisão completa com Android** ([revisao-completa-complementar.md](revisao-completa-complementar.md)): sobre o visual
  novo, para não ser refeita.
- **Mestre pelo navegador, sem o app** (a etapa 9 deixou para depois): opcional; perguntar ao dono antes.
