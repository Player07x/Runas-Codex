# ADR 0017 — "Verificar atualizações" (atualização manual)

- **Status:** aceita (2026-10-14).

## Contexto

O plano dizia "sem verificação automática de atualização" e a regra 6 proibia rede fora da sala do VTT; a lista de
recursos pedia **atualização manual** (o app não busca sozinho), e Configurações já tinha o botão "Verificar
atualizações" como protótipo. O dono pediu o botão de verdade, para testar a troca de versão com duas pré-releases.

## Decisão

- **Só quando o usuário clica.** O processo principal (não a interface; a CSP não muda) consulta
  `api.github.com/repos/Player07x/Runas-Codex/releases`. Quem está numa versão beta recebe betas; quem está numa estável,
  só estáveis. A comparação segue o SemVer (`0.1.0-beta.1` < `0.1.0-beta.2` < `0.1.0`).
- **O instalador deste sistema**, pelos nomes que o workflow Release gera: `Runas-Codex-Setup-<v>.exe` (Windows),
  `…-linux-x86_64.AppImage` (quando o app roda como AppImage) ou `…-linux-amd64.deb`.
- **Conferido antes de instalar:** só se baixa de `github.com/Player07x/Runas-Codex/releases/download/`, e o arquivo
  precisa bater com a soma do `SHA256SUMS.txt` da mesma release; se não bate, é apagado e nada é instalado. Instala só o
  que a última consulta encontrou (a interface não passa endereços). O arquivo fica em `Downloads/Runas-Codex/`.
- **Instalar:** Windows abre o instalador (NSIS) e o app fecha; AppImage troca o próprio arquivo (cópia ao lado e troca
  de uma vez) e reinicia; `.deb` abre no instalador do sistema (instalar pede a senha do administrador). No Android e
  no navegador, a linha explica onde baixar.
- Sem dependência nova (nada de `electron-updater`): `fetch`, `crypto` e `fs` do Node.

## Consequências

- Regra 6 do `AGENTS.md` e docs/02 (seção 6) ganham a exceção; a lista de recursos continua "atualização manual".
- Os instaladores não são assinados: o Windows mostra o SmartScreen na instalação, como antes (ADR 0003).
- Testes: `app/src/core/updates.test.ts` (SemVer, escolha da release e do arquivo, somas) e
  `desktop/tests/updates.test.ts` (servidor local no papel do GitHub: consulta, download com soma certa e errada,
  endereço recusado, troca do AppImage e `.deb`). O smoke confere a versão e o botão, sem ir à internet.
- Para testar de verdade: publicar `v0.1.0-beta.1` (com este botão), depois `v0.1.0-beta.2`, e atualizar de uma para a
  outra pelo app.
