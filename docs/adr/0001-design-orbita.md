# ADR 0001 — Órbita como design oficial

- **Status:** aceita (2026-10-14)

## Contexto
A etapa 1 produziu três visuais navegáveis para o mesmo app: o **Original** (paleta "Livro Vermelho" do Runas DM,
fundo ilustrado), o **Atlas** (editorial, papel claro e verde) e o **Órbita** (painel imersivo do mestre, grafite e
lavanda). A comparação está em [03 — Comparação dos protótipos](../03-comparacao-prototipos.md).

## Decisão
Adotar o **Órbita** em todo o app:
- Tema escuro grafite/lavanda como padrão e variação clara pelo botão de tema.
- Títulos em Geist (sem serifa), destaques em EB Garamond itálico; a prévia impressa de Livros mantém a Cinzel.
- Barra lateral recolhível no computador, barra inferior no celular, alvos de toque de 44 px.
- Página inicial com a próxima sessão em destaque, os seis espaços, notas recentes, agenda e captura rápida.

O Lab de design, o Atlas e o visual original saem do código.

## Consequências
- Os tokens ficam só em `app/src/styles/tokens.css`; não existe mais o atributo `data-design`.
- Cor de destaque única (`--cyan`, a lavanda) para item ativo, abas e barra inferior; `--red` volta a significar
  só dano/perigo.
- O código das outras propostas fica recuperável no primeiro commit (`git show 02db20c`).

## X8 — acessibilidade e variações temáticas

Órbita continua sendo o padrão. Floresta e Brasa variam somente os tokens e preservam cores semânticas. Preferências
locais guardam escala de fonte, redução de movimento e modo tablet; o sistema também pode reduzir movimento. A
escala afeta leitura e edição, sem alterar páginas físicas de Livros. Diálogos contêm o foco e o devolvem à origem.
As telas menores usam seleção compacta de seção e ações recolhíveis, mantendo alvos de toque de 44 px.
