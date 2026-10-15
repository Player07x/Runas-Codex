# Dicionário do corretor ortográfico (pt-BR)

O corretor do app desktop é o do Chromium (Hunspell). Sem este arquivo, o Chromium baixaria o dicionário do servidor
do Google na primeira vez que um campo de texto ganha foco — uma chamada de rede que o app não faz (regra 6 do
`AGENTS.md`). O processo principal copia o arquivo para a pasta `Dictionaries` do perfil antes de abrir a janela
(`desktop/src/main/spellcheck.ts`), e o instalador o leva em `resources/dicionarios/`.

| Arquivo | O que é |
|---|---|
| `pt-BR-3-0.bdic` | Dicionário compilado pelo Chromium, o mesmo que ele baixaria de `https://redirector.gvt1.com/edgedl/chrome/dict/pt-br-3-0.bdic` (baixado em 15/10/2026) |
| `LICENCA-LGPL-2.1.txt` | Texto da licença |

- **SHA-256:** `6b2850f5a54994a5204a9a88d4b586e9d4e028a0360b67352b04cffdb2a3e0ea` (um teste confere).
- **Dicionário:** VERO — Copyright (C) 2006–2010 Raimundo Santos Moura e colaboradores do projeto OpenOffice.org
  Brasil. Distribuído sob a **GNU Lesser General Public License (LGPL) versão 2.1**, como diz o cabeçalho do
  `pt_BR.aff`.
- **Fontes** (`pt_BR.dic` e `pt_BR.aff`): repositório `chromium/deps/hunspell_dictionaries`,
  <https://chromium.googlesource.com/chromium/deps/hunspell_dictionaries/>, commit
  `eb106bd524eea61487644fffeec0d229fa41791a`. O `.bdic` é gerado delas pela ferramenta `convert_dict` do Chromium.

Se uma versão nova do Electron passar a procurar outro arquivo (por exemplo `pt-BR-4-0.bdic`), o `--smoke` falha
(ele exige zero downloads de dicionário): baixe o arquivo novo do mesmo endereço, troque aqui, no `spellcheck.ts` e no
SHA-256 acima.
