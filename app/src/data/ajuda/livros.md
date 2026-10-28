Um livro é uma nota com `tipo: livro` e a lista dos capítulos na propriedade `estrutura`; cada capítulo é uma nota
comum (que o Obsidian abre). Livros › **Novo livro** cria a pasta, a nota do livro e o primeiro capítulo.

### A lista de livros

Cada livro aparece com a capa (a imagem da propriedade `capa`, ou uma capa desenhada), o número de capítulos e de
palavras. **Importar livro** traz do Homebrewery, do GM Binder ou de um DOCX.

### Os três modos do livro

| Modo | Para que serve |
| :-- | :-- |
| **Escrever** | O capítulo no editor, com o sumário à esquerda e, se quiser, a **prévia das páginas ao lado**, que acompanha o cursor |
| **Organizar** | Os capítulos como cartões: arraste para mudar a ordem, mude a situação (rascunho, revisão, pronto) |
| **Diagramar** | As páginas como vão sair impressas, com o painel **Estilo do livro** |

No sumário, o ponto colorido de cada capítulo mostra a situação. **Foco** esconde tudo menos o texto; a **máquina de
escrever** mantém a linha do cursor no meio da tela a cada tecla. No celular, “Ver a página” abre a prévia em tela
cheia.

### Apoio ao escrever

O painel **Apoio** tem **Referências** (artigos da Wiki para consultar e citar sem sair do capítulo), **Revisão**
(comentários e o que falta revisar) e **Capítulo** (situação, palavras, notas do capítulo). Selecione um trecho para
comentar ou citar da Wiki pela barra da seleção. `![[Artigo da Wiki]]` traz o texto de um artigo para o livro sem
copiar.

### Estilo do livro

Em Diagramar, o painel **Estilo do livro** começa por um **modelo** — Manual de RPG, Grimório, Romance, Moderno ou
Leitura fácil — e deixa ajustar:

- Fontes do título e do texto (cerca de dez fontes livres embutidas, mais as fontes `.ttf`/`.otf`/`.woff2` do cofre),
  tamanho e entrelinha, texto justificado e **hifenização** em português.
- Colunas (1 a 4), papel (A4, Carta, A5, 6×9), margens, cor do papel, do texto e do destaque.
- O desenho das **fichas** (tipográfico, fundo suave ou faixa no nome; veja Fichas e caixas).
- **Capa**, **sumário**, aberturas de capítulo, cabeçalhos e numeração das páginas.
- Imagens: **tela** (leve), **gráfica** (300 ppi) ou **original**; e se o fundo do papel sai na impressão.

**Salvar como modelo** grava o estilo numa nota (`Livros/Modelos/<nome>.md`, `tipo: modelo-livro`) para usar em
outros livros. Num capítulo, a propriedade `colunas:` muda só ele.

### Formatadores de livro

Na galeria Formatar, a aba **Livro** tem colunas automáticas (`::: runas-colunas-2`), duas colunas manuais, quebra de
coluna, quebra de página, bloco largo e sumário. As fichas de RPG (`[!magia]`, `[!criatura]`…) saem diagramadas; um
trecho no formato antigo vira ficha com **Converter em ficha**.

### Exportar

No ⋯ do livro: **PDF** igual à prévia (com título, marcadores e texto pesquisável), **EPUB**, **DOCX**, **HTML**,
**RTF** e **Markdown** (um arquivo ou uma pasta). A **versão dos jogadores** tira os segredos antes de exportar.
**Excluir livro** manda a nota do livro e os capítulos para a lixeira (capítulos fora da pasta ou usados por outro
livro ficam).
