# ADR 0029 — captura rápida no Wayland

- Estado: implementada no processo principal; botão visual fica para a fase do rework.
- Data: 2026-10-22.

O app continua tentando `GlobalShortcutsPortal` antes de qualquer fallback. Quando o portal não registra o atalho,
`runas-codex --captura` usa a trava de instância única: se o app já estiver aberto, o `second-instance` restaura a janela
e envia o evento de captura; se estiver fechado, a primeira janela entrega o evento depois de carregar.

A API `systemShortcut` expõe estado, criação e remoção. No GNOME ela grava uma entrada em
`org.gnome.settings-daemon.plugins.media-keys` com `runas-codex --captura`. No KDE ela instala uma ação `Captura rápida`
no `.desktop` do usuário. Nenhuma operação é feita automaticamente: a interface deve pedir o clique do usuário.
