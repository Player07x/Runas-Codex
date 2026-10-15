# ADR 0018 — Corretor ortográfico sem rede

- **Status:** aceita (2026-10-15)

## Contexto
O editor de notas tem `spellcheck` ligado, e o Electron usa o corretor do Chromium (Hunspell). Sem configuração, na
primeira vez que um campo de texto ganha foco o Chromium **baixa o dicionário do servidor do Google**
(`redirector.gvt1.com/edgedl/chrome/dict/pt-br-3-0.bdic`, 3,9 MB), mandando junto o IP do usuário. Isso quebra a
regra 6 (nenhuma chamada de rede fora da sala do VTT) e já estava nas betas 0.1.0. Foi achado na varredura da C5:
o arquivo aparecia na pasta `Dictionaries` do perfil, e o log de rede do Chromium (`--log-net-log`) mostrou os
pedidos ao Google durante o `--smoke`. Num sistema em outro idioma, o Chromium baixaria também o dicionário desse
idioma.

## Decisão
**O app traz o dicionário pt-BR** em `desktop/resources/dicionarios/` (o mesmo `.bdic` que o Chromium baixaria,
conferido pelo SHA-256), e o instalador o leva em `resources/dicionarios/` (`extraResources`). O dicionário é o VERO
(Raimundo Santos Moura e colaboradores do OpenOffice.org Brasil), sob **LGPL 2.1**; o texto da licença e a origem das
fontes vão junto (`LEIA-ME.md`, `LICENCA-LGPL-2.1.txt`).

`desktop/src/main/spellcheck.ts`:
- antes do `ready`, copia o dicionário para `<perfil>/Dictionaries`, onde o Chromium procura antes de baixar (só se
  falta ou se é outro);
- depois do `ready`, fixa o idioma em pt-BR (`setSpellCheckerLanguages`) e aponta o endereço de download para a pasta
  local (`setSpellCheckerDictionaryDownloadURL` com `file://`), para nenhum download sair do computador;
- registra os downloads tentados e os dicionários carregados, para o `--smoke`.

O `--smoke` (leitura e gravação) falha se o Chromium tentar baixar qualquer dicionário, se o idioma não for só pt-BR
ou se o perfil não tiver o dicionário igual ao do app. Assim, uma versão nova do Electron que procure outro arquivo
(`pt-BR-4-0.bdic`) quebra o CI em vez de voltar a usar a rede.

## Consequências
- O repositório e o instalador ganham 3,9 MB.
- No macOS o Electron usa o corretor do sistema (nada muda). No Windows ele pode usar o corretor do sistema quando o
  idioma está instalado; senão, usa o dicionário do app.
- O navegador (`npm run dev`) e o Android usam o corretor do próprio navegador ou teclado; o app não baixa nada.
- Hoje o corretor só sublinha: o Electron não tem menu de contexto próprio, então as sugestões no clique direito e
  "adicionar ao dicionário" (palavras de RPG) entram na C5a. Outros idiomas do corretor ficam para depois (cada um
  seria mais um arquivo embutido).
