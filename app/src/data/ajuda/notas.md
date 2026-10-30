O espaço **Notas** é um bloco de notas livre, na pasta `Notas/` do cofre, com as ferramentas do Obsidian. Tudo o que
este tópico explica (busca, propriedades, gráfico, quadros) vale também para as notas da Wiki, das Campanhas e dos
Livros.

### A lista e as pastas

- À esquerda fica a árvore: pastas e notas. Arraste para mover; use o ⋯ da lista para **Nova pasta…**,
  **Buscar e substituir…**, **Exportar…**, **Gráfico**, **Nota do dia**, **Nota aleatória**, **Lixeira do cofre…**
  e **Bloquear as Notas** (quando há PIN).
- **Favoritos** (a estrela da nota) e **Tags** ficam no topo da lista. Os favoritos do Obsidian (`bookmarks.json`)
  também aparecem.
- **Fixar, cor e ícone…** (⋯ da nota) põe a nota no topo da lista, com cor e ícone. **Arquivar** move para
  `Notas/Arquivo`.

### Abas, painéis e janelas

- Clique numa nota para abrir; <kbd>Ctrl</kbd>+clique abre numa aba nova. As abas ficam numa fileira acima da nota.
- Divida o espaço em painéis lado a lado ou empilhados (procure “Dividir painel” no <kbd>Ctrl</kbd> <kbd>K</kbd>).
- **Workspaces** guardam um arranjo de abas e painéis com um nome (“Sessão”, “Escrita”) para voltar a ele depois.
- No computador, dá para abrir uma nota numa janela separada (bom para um segundo monitor).
- Voltar e avançar (as setas da barra da nota) andam pelo histórico de navegação.

### Criar notas

- **+ Novo** › Nota, ou <kbd>Ctrl</kbd> <kbd>N</kbd>.
- **Alternador rápido** (<kbd>Ctrl</kbd> <kbd>O</kbd>): digite o nome; se a nota não existe, ele cria.
- **Nota do dia** (<kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>D</kbd>): cria ou abre a nota de hoje, com o modelo e a pasta
  das notas diárias do Obsidian (`.obsidian/daily-notes.json`).
- **Captura rápida**: no computador, <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>N</kbd> abre uma nota nova mesmo com o app
  em segundo plano. No Linux com Wayland o atalho global não funciona: em Configurações › Editor e atalhos,
  **Criar atalho** faz um atalho do sistema que chama o app com `--captura`, até com ele fechado (no GNOME, já com
  <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>N</kbd>; no KDE, escolha a tecla em Configurações do sistema › Atalhos).
  **Remover** desfaz.

### Buscar

A busca da lista e o <kbd>Ctrl</kbd> <kbd>K</kbd> aceitam operadores, como no Obsidian:

| Operador | Exemplo | Acha |
| :-- | :-- | :-- |
| `path:` | `path:Locais` | notas cuja pasta contém “Locais” |
| `file:` | `file:taverna` | pelo nome do arquivo |
| `tag:` | `tag:#npc` | notas com a tag (inclusive aninhadas) |
| `line:` | `line:(dragão ouro)` | as palavras na mesma linha |
| `section:` | `section:(segredo)` | as palavras na mesma seção |
| `[prop:valor]` | `[status:Vivo]` | pela propriedade |
| `"frase"` | `"ponte quebrada"` | a frase exata |
| `/regex/` | `/d[0-9]+/` | expressão regular |
| `-palavra` | `goblin -morto` | exclui a palavra |

**Buscar e substituir…** troca um texto em várias notas de uma vez, mostra antes o que vai mudar e guarda uma cópia.

### Links, menções e painel

O botão **Painel** da nota abre as abas **Links** (quem liga para esta nota, com o trecho; para onde ela liga; links
quebrados), **Propriedades**, **Sumário** (os títulos) e **Gráfico** (o gráfico local). Em Links aparecem também as
**menções sem link**: notas que citam o nome sem `[[ ]]`, com o botão para transformar em link.

### Gráfico

Notas › ⋯ › **Gráfico** mostra todas as notas e ligações (em WebGL, fluido com milhares de notas). Dá para buscar,
filtrar por tag, pasta, órfãs, anexos e links inexistentes, colorir grupos por consulta (`tag:#npc` em vermelho),
ajustar as forças, ver setas de direção e o **timelapse** (o gráfico crescendo pela data de criação). O gráfico
local, no painel da nota, mostra a vizinhança com a profundidade que você escolher.

### Quadros (canvas)

Arquivos `.canvas` (o formato JSON Canvas do Obsidian) são quadros infinitos com cartões de nota, texto, imagem e
link, grupos e setas. Duplo clique cria um cartão; arraste das bordas para ligar. Com o teclado, <kbd>Tab</kbd>
anda pelos cartões e as setas os movem. As Campanhas têm um quadro próprio.

### Bases e consultas

Notas › ⋯ › **Nova base** cria um arquivo `.base` (tabela, cartões ou lista das notas, com filtros, fórmulas e
resumo). Dentro de qualquer nota, os blocos `base`, `dataview` e `runas-consulta` fazem o mesmo (veja Blocos
especiais).

### Tags e propriedades

Tags vêm do texto (`#npc`, `#local/cidade`) e da propriedade `tags`. Propriedades são o frontmatter no topo da nota;
os tipos (texto, lista, número, caixa, data, data e hora, link) são os do Obsidian (`.obsidian/types.json`).
