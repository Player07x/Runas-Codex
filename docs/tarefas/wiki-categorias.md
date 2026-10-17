# Tarefa: página de categoria da Wiki, com a arte dos artigos (W1)

**Para:** Codex. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a [divisão](README.md), a
[ADR 0010](../adr/0010-wiki.md) e o item "Infobox" (B) da [checklist](../01-checklist-recursos.md).

Pedido do dono (17/10/2026). **Exceção à divisão, autorizada pelo dono na mesma data:** `app/src/screens/wiki/**` e
`app/src/core/wiki.ts` são da frente do Claude Code, mas esta tarefa vai para o Codex, que já está mexendo no visual
dessas telas. **Comece da `main` depois que o branch `integracao/x5-c6-x8` entrar**, ou por cima dele, porque ele
mexe em `WikiScreen.tsx` e `wiki.css`.

Um PR: `wiki/pagina-categoria`.

## O problema

Na página inicial da wiki, cada pasta vira um card de categoria que, aberto, lista **todas** as notas dela. Com umas
100 notas por categoria, a página fica enorme e achar uma nota vira garimpo. E a wiki é só texto: o `retrato` do
personagem (e a `imagem`, o `simbolo`, a `bandeira` dos outros tipos) só aparece na ficha lateral do artigo.

## O que fazer

### 1. Arte do artigo (núcleo, `app/src/core/wiki.ts`)

`articleImage(note: IndexedNote): string | null` devolve o alvo da imagem que representa o artigo:

1. o primeiro campo `imagem` do tipo da nota (`retrato`, `imagem`, `simbolo`, `bandeira`…) que estiver preenchido,
   sem os `[[ ]]`;
2. senão, a primeira imagem embutida no **corpo** da nota (`meta.links` com `embed: true` e extensão de imagem;
   ignore os links que estão no frontmatter);
3. senão, `null`.

Assim quem só cola `![[foto.png]]` no texto, como faz no Obsidian, também ganha a arte, sem propriedade nova. Testes
em `wiki.test.ts` para os três casos e para nota sem tipo.

### 2. Página inicial: categorias resumidas (`WikiHome.tsx`)

- Cada card de categoria mostra **no máximo 5 notas**, as editadas por último, cada uma com uma **miniatura** da arte
  (28 px, cantos arredondados) ao lado do nome. Sem arte: a inicial do nome em dourado sobre `--bg-deep`, como o
  `.infobox-portrait` já faz.
- No fim do card, o link **"Ver todos os N"**, que abre a página da categoria. Sai o abrir e fechar do card atual.
- Categoria com até 5 notas mostra todas e não precisa do link (ou mostra o link mesmo assim, como ficar melhor).

### 3. Página da categoria (rota nova `/wiki/categoria/<caminho da pasta>`)

- **Cabeçalho:** voltar para a wiki, ícone e nome da categoria, contagem, e o botão "Novo <tipo>" (por exemplo "Novo
  personagem") que abre o `NewArticleDialog` já com a pasta e o tipo escolhidos. Se o diálogo não aceitar isso hoje,
  acrescente props opcionais nele.
- **Cards em grade** (`repeat(auto-fill, minmax(150px, 1fr))`; duas colunas no celular): a arte em cima, recortada
  (`object-fit: cover`), o nome, uma linha com os dois primeiros campos de texto ou link do tipo (por exemplo
  "Sacerdotisa · Humana") e até duas fichinhas com outros campos (por exemplo a situação e a afiliação). Os campos
  vêm de `ARTICLE_KINDS`, então Local mostra tipo e "fica em", Organização mostra líder e sede, e assim por diante.
  Clicar abre o artigo.
- **Modo lista**, alternado por um botão: linhas compactas com a miniatura de 40 px, nome, campos e situação. O modo
  escolhido fica no `localStorage` em `runas-codex:wiki-categoria-modo`.
- **Busca dentro da categoria** (nome, apelidos e valores dos campos) e **ordem**: nome (A–Z) ou editados por último.
- **Filtros por campo:** para cada campo de texto do tipo que tenha no máximo 8 valores diferentes na pasta (situação,
  raridade, tipo de local…), uma fileira de fichinhas "Todas / valor 1 / valor 2…". Subpastas da categoria também
  viram um filtro.
- **Muitas notas:** mostra 24 cards e um botão "Mostrar mais"; imagens com `loading="lazy"`; nada de ler o texto das
  notas para montar a página (só o índice). Tem que continuar leve com 500 notas numa pasta.
- **Visão dos jogadores:** respeite o mesmo modo da wiki (`players` em `wiki-state.tsx`) que as outras telas
  respeitam.
- Estado vazio e "nenhuma nota com esse filtro" em pt-BR.

## Regras desta tarefa

- **Nada é gravado no cofre.** A página só lê o índice; o artigo continua um `.md` que o Obsidian abre igual.
- **A imagem é desenhada pelo `Embed`** (`markdown/Embed.tsx`) ou pela mesma resolução que ele usa (`set.resolve` e
  `set.fileUrl`), sem mudar como o leitor desenha (regra 7). No navegador, os anexos não carregam: a inicial aparece no
  lugar.
- A ficha lateral do artigo continua mostrando o retrato como hoje.
- Visual Órbita pelas variáveis de `styles/tokens.css`, temas escuro e claro, a partir de 320 px sem rolagem para os
  lados, alvos de 44 px no toque. CSS com escopo da wiki em `wiki.css`.

## Como verificar

- `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build`.
- No navegador (`npm run dev`), com o cofre de exemplo; no Electron, com um cofre que tenha imagens (o
  `desktop/tests/cofre-exemplo` serve; acrescente lá dois ou três personagens com retrato, se faltar).
- Imagens da tela no PR: página inicial, categoria em grade e em lista, celular (320 px) e tema claro.
- Acrescente em `docs/04-testes-pendentes.md` o que o dono precisa conferir à mão (categoria com 100+ notas, retrato
  vindo da propriedade e do corpo, visão dos jogadores).
