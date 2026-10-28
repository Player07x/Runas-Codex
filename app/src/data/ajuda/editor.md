Toda nota do app (em Notas, na Wiki, nas Campanhas e nos capítulos dos Livros) usa o mesmo editor e o mesmo leitor.

### Os três modos

| Modo | O que mostra | Atalho |
| :-- | :-- | :-- |
| **Leitura** | A nota pronta, como no Obsidian; links e caixas de tarefa clicáveis | <kbd>Ctrl</kbd> <kbd>E</kbd> alterna com Editar |
| **Editar** | O texto já formatado enquanto você escreve (*live preview*); a marcação aparece só na linha do cursor | <kbd>Ctrl</kbd> <kbd>E</kbd> |
| **Código** | O Markdown cru, em fonte monoespaçada, com números de linha opcionais | <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>E</kbd> |

O app lembra o último modo de cada espaço neste aparelho.

### A barra da nota

Na barra de cima da nota ficam voltar e avançar, o nome da nota, os três modos, o estado (“Salvo”), o botão
**Painel** e o menu **⋯**. No ⋯: Formatar…, Inserir link…, Inserir imagem…, Inserir modelo…, Copiar link da nota,
Copiar link do bloco no cursor, Copiar endereço runas://, Extrair seleção para nota…, Mesclar em outra nota…,
Renomear ou mover…, Renomear imagens da nota…, Fixar, cor e ícone…, Arquivar, Histórico de versões, Exportar… e
Mandar para a lixeira.

Embaixo, a barra de estado mostra palavras e caracteres e, no modo Código, a linha e a coluna.

### Formatar sem decorar a sintaxe

- **Galeria Formatar** (<kbd>Ctrl</kbd> <kbd>/</kbd> ou ⋯ › Formatar…): todos os formatadores em abas (Texto,
  Fonte e cor, Parágrafo, Blocos, Inserir, Livro e, na Wiki, Wiki), com busca sem acento. Clique para inserir.
- **Menu `/`**: no começo de uma linha (ou depois de um espaço), digite `/` e o nome — `/tabela`, `/aviso`,
  `/colunas`. As primeiras opções abrem a galeria, escolhem imagem, inserem modelo, link ou a data de hoje.
- **Barra da seleção**: selecione um trecho e aparece uma barra com negrito, itálico, link, destaque e mais.
  Pelo teclado: <kbd>Alt</kbd> <kbd>F10</kbd> entra na barra, setas andam, <kbd>Esc</kbd> volta ao texto.
- <kbd>Ctrl</kbd> <kbd>B</kbd> e <kbd>Ctrl</kbd> <kbd>I</kbd>: negrito e itálico.
- No celular, a **barra sobre o teclado** traz os mais usados.

O tópico **Todos os formatadores** mostra cada um com a sintaxe e o resultado.

### Links entre notas

- Digite `[[` ou `@` e o começo do nome (ou de um apelido): o app sugere as notas e insere o link.
- `[[Nota#Seção]]` aponta para um título; `[[Nota#^id]]` para um parágrafo (o app cria o `^id` ao copiar o link do
  bloco).
- Link para uma nota que não existe aparece diferente; clicar cria a nota no espaço certo.
- Passe o mouse num link com <kbd>Alt</kbd> (ou segure o dedo, no celular) para ver a nota sem abrir.
- Renomear ou mover uma nota corrige os links do cofre inteiro, inclusive em propriedades e quadros.
- `![[Nota]]` mostra outra nota dentro desta (transclusão).

### Imagens

Cole (<kbd>Ctrl</kbd> <kbd>V</kbd>), arraste ou use ⋯ › Inserir imagem…. A imagem vai para a pasta de anexos e o
link entra no texto: `![[runa.png|300]]` define a largura; `![[runa.png|direita|300]]` faz a imagem flutuar ao
lado do texto (também `esquerda`, `centro` e `largo`). No modo Editar, a imagem tem uma alça para mudar o
tamanho e um menu com a posição e **Tamanho original**.

### Modelos

Notas da pasta de modelos (a configurada no Obsidian, ou `Templates/` / `Modelos/`) aparecem em ⋯ › Inserir
modelo… e no menu `/`. Variáveis: `{{título}}`, `{{data}}`, `{{hora}}` (ou `{{title}}`, `{{date}}`, `{{time}}`), com
formato opcional: `{{data:DD/MM/YYYY}}`.

### Propriedades

O quadro **Propriedades** no topo da nota (e a aba Propriedades do painel) edita o frontmatter: texto, lista,
número, caixa de marcar, data, data e hora e link. As datas ficam **entre aspas** (`data: "2026-10-17"`) para o
Obsidian não confundir datas do mundo com datas reais.

### Corretor ortográfico

No computador, palavras erradas ganham um sublinhado; clique com o botão direito para ver até seis sugestões ou
**Adicionar “palavra” ao dicionário**. O dicionário de português vem com o app (não baixa nada).

### Extrair e mesclar

Selecione um trecho e use ⋯ › **Extrair seleção para nota…**: o trecho vira uma nota nova e, no lugar, fica o link.
**Mesclar em outra nota…** junta esta nota ao fim de outra e corrige os links.
