# ADR 0006 — Mesa (VTT) com o código do RunasVTT, dentro do cofre

- **Status:** aceita (2026-10-14)

## Contexto
Etapa 4: o VTT no desktop. O RunasVTT já resolve cena, tokens, paredes, visão, luz, névoa, regiões, áudio e a sala
dos jogadores, mas é amarrado à Runas Suite (navegador integrado, ponte com os sites, fichas do Runas Tools nos
assentos) e guarda os mundos em SQLite fora de qualquer cofre. Pela [ADR 0004](0004-independente-da-runas-suite.md),
o Codex só reaproveita o código.

## Decisão
**Código reaproveitado, não compartilhado.** A mesa do RunasVTT foi copiada para `app/src/vtt/` (interface: Pixi,
painéis, página dos jogadores) e `desktop/src/main/vtt/` (serviços: documentos, visão, áudio, regiões, servidor da
sala, túnel), junto com os testes. Saíram: navegador integrado, ponte `window.runasVTT`, cópia dos sites, fichas
(`actor` do token e `seat-character`) e o Runas Tools servido aos jogadores.

**Mesas no cofre:** `<cofre>/.runas/mesas/<nome>-<id>/` com `mesa.json`, uma cena por JSON em `cenas/` (a cena e
tudo o que ela contém), `outros.json` (playlists, faixas, registro) e `assets/<tipo>/<sha256>.<ext>`. O Obsidian
ignora a pasta (começa com ponto). Os documentos ficam em memória com a mesma interface síncrona do banco do RunasVTT,
e a gravação é adiada (1 s) e atômica, só das partes que mudaram. Abrir ou criar uma mesa exige a gravação do cofre
liberada.

**Assentos sem fichas:** o mestre escolhe no token "Controlado por: Jogador N"; quem entra na sala com o código daquele
assento move aquele token. Quem entra sem código assiste.

**Sala:** servidor HTTP + WebSocket no computador do mestre (rede local), link público opcional pelo túnel rápido da
Cloudflare (`cloudflared`, baixado só quando o mestre pede — a única ida à internet do app). A página dos jogadores
(`player.html`) é parte do mesmo build e tem uma CSP própria que permite `ws:`/`wss:`; o app principal continua sem
nenhuma conexão. Arquivos do build são públicos; mapas, tokens e áudio só saem com a chave e se a cena projetada usa.

**Entrar Sala:** cola o link do mestre e abre a página da sala numa janela própria (desktop) ou nova aba (navegador),
sem a ponte do app. Salas recentes ficam neste aparelho.

**Cores:** o CSS da mesa fica contido em `.vtt-root` e usa os tokens Órbita.

## Consequências
- `--smoke --write` cria uma mesa e uma cena pela interface, abre a sala e confere, como um jogador, a página, o
  WebSocket e o ingresso no assento; roda no CI (Linux empacotado e Windows).
- No Android a mesa abre como prévia em memória; hospedar sala no celular é a etapa 9.
- Fica para depois: importar/exportar mesas, pinos ligados às notas do cofre, interface por toque.
