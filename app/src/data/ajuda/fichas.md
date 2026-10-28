Caixas (os *callouts* do Obsidian) são citações com um tipo entre colchetes na primeira linha. Elas servem para
avisos, textos para ler em voz alta, segredos do mestre, blocos de atributos e as **fichas de RPG** dos livros. Tudo
continua sendo texto comum: o Obsidian mostra as mesmas caixas.

### Como escrever uma caixa

```markdown
> [!aviso] Cuidado com a ponte
> Ela cai se mais de três pessoas atravessarem juntas.
```

> [!aviso] Cuidado com a ponte
> Ela cai se mais de três pessoas atravessarem juntas.

- A primeira linha tem `> [!tipo]` e, se quiser, um título. Sem título, aparece o nome do tipo.
- Todas as linhas da caixa começam com `>`. Uma linha só com `>` separa parágrafos dentro dela.
- `> [!tipo]-` começa **fechada** (clique no título para abrir); `> [!tipo]+` começa aberta e pode ser fechada.
- Pela galeria Formatar (aba Blocos) ou pelo menu `/` (`/callout`, `/aviso`, `/segredo`…) você insere sem digitar.

### Os tipos de caixa

| Tipo | Para que serve |
| :-- | :-- |
| `[!nota]`, `[!dica]`, `[!aviso]`, `[!perigo]` | Observação, dica, cuidado e perigo, cada um com cor e ícone (os nomes em inglês do Obsidian, como `[!note]` e `[!warning]`, também valem) |
| `[!descritivo]` ou `[!leia-em-voz-alta]` | Texto para o mestre ler aos jogadores |
| `[!barra-lateral]` | Comentário fora do fluxo, como as caixas laterais dos livros |
| `[!segredo]` | Só o mestre vê (some na visão dos jogadores, na sala e nas exportações para jogadores) |
| `[!segredo\|Nome do jogador]` | Segredo para um jogador: pela sala, só ele recebe |
| `[!statblock]` | Atributos de uma criatura ou NPC, sem regras de sistema |
| `[!colunas]` e `[!largo]` | No livro: duas colunas com quebra manual, e um bloco na largura toda da página |
| `[!magia]`, `[!runa]`, `[!habilidade]`, `[!item]`, `[!criatura]`, `[!raca]`, `[!classe]`, `[!efeito]` | As fichas de RPG (abaixo) |

### Segredos

```markdown
> [!segredo] O que o prefeito esconde
> Ele vendeu a ponte aos contrabandistas.
```

> [!segredo] O que o prefeito esconde
> Ele vendeu a ponte aos contrabandistas.

Na Wiki, o botão **Visão do mestre / dos jogadores** esconde os segredos para conferir o que os jogadores vão ver.
Mostrar um artigo pela sala, o livro na versão dos jogadores e os sites para jogadores também tiram os segredos.

### Statblock

```markdown
> [!statblock] Lobo de Cinzas
> **CA** 13 · **PV** 11 (2d8+2) · **Deslocamento** 12 m
>
> | FOR | DES | CON | INT | SAB | CAR |
> | :-: | :-: | :-: | :-: | :-: | :-: |
> | 12 | 15 | 12 | 3 | 12 | 6 |
>
> **Faro aguçado.** Vantagem para perceber pelo cheiro.
```

> [!statblock] Lobo de Cinzas
> **CA** 13 · **PV** 11 (2d8+2) · **Deslocamento** 12 m
>
> | FOR | DES | CON | INT | SAB | CAR |
> | :-: | :-: | :-: | :-: | :-: | :-: |
> | 12 | 15 | 12 | 3 | 12 | 6 |
>
> **Faro aguçado.** Vantagem para perceber pelo cheiro.

O statblock não segue regra de nenhum sistema: escreva os campos que o seu jogo usa. Os statblocks migrados do
plugin Fantasy Statblocks do Obsidian chegam neste formato.

### Fichas de RPG

São oito tipos: **magia**, **runa**, **habilidade**, **item**, **criatura**, **raça** (`[!raca]`), **classe** e
**efeito**. Todas seguem o mesmo formato:

1. A primeira linha: `> [!magia] Nome da magia`.
2. A segunda linha: os campos curtos, cada um com o rótulo em negrito, separados por `·`.
3. Linhas seguintes com outros campos (`> **Requisito:** Curar Feridas`), se houver.
4. Uma linha só com `>` e depois o texto da ficha.
5. Se quiser, a arte no fim: `> ![[Anexos/Imagens/Bafo.png]]`.

```markdown
> [!magia] Bafo de Fogo
> **Custo:** 1 PV · **Tipo:** Feitiço · **Alcance:** Área
>
> A partir de sua boca, crie um cone de chamas de 3 metros.
>
> **Ampliação.** +1 PV: +2 metros.
```

> [!magia] Bafo de Fogo
> **Custo:** 1 PV · **Tipo:** Feitiço · **Alcance:** Área
>
> A partir de sua boca, crie um cone de chamas de 3 metros.
>
> **Ampliação.** +1 PV: +2 metros.

```markdown
> [!criatura] Gárgula da Catedral
> **Tipo:** Construto · **CA:** 15 · **PV:** 52 · **Deslocamento:** 9 m, voo 18 m
>
> Imóvel, parece uma estátua. Ataca quem toca nos vitrais.
```

> [!criatura] Gárgula da Catedral
> **Tipo:** Construto · **CA:** 15 · **PV:** 52 · **Deslocamento:** 9 m, voo 18 m
>
> Imóvel, parece uma estátua. Ataca quem toca nos vitrais.

### Como as fichas aparecem no livro

Na nota e no Obsidian a ficha aparece como as outras caixas. Na **prévia e no PDF dos Livros** ela vira uma ficha
diagramada:

- Rótulos que o valor já explica somem e o valor vira etiqueta: **Custo**, **Tipo**, **Alcance**, **Grupo**,
  **Categoria**, **Raridade** e **Origem** saem como “1 PV · Feitiço · Área”. Os outros campos ficam com o rótulo.
- Campo vazio (`**Material:**` sem nada depois) não sai.
- Se o valor repete o rótulo (`**Custo:** Custo: 1 PV`), sai só “1 PV”.
- Na **criatura** (e no statblock), valores curtos com número (CA, PV, atributos) formam uma linha de atributos.
- Nome todo em maiúsculas (“BAFO DE FOGO”) vira “Bafo de Fogo”.
- Uma imagem sozinha logo depois da ficha entra nela como arte.
- A ficha nunca é cortada entre duas colunas ou páginas.

O desenho das fichas é escolhido no **Estilo do livro** (Livros › Diagramar): **tipográfico** (o padrão, só com
tipografia, sem réguas), **fundo suave** ou **faixa no nome**.

### Converter em ficha

Livros antigos costumam ter a magia no formato de texto: o nome em negrito (ou `###`), a linha do custo embaixo,
outros campos e o texto. Para transformar:

1. Abra o capítulo em Livros, no modo de escrever.
2. Selecione desde o nome até o fim do texto da magia.
3. Na barra da seleção, use **Converter em ficha**.

O app monta a ficha (`[!magia]`, ou `[!runa]` quando o custo é em pontos), leva a imagem que vem logo depois e não
repete “Custo:”. Se o trecho não tiver esse formato, ele explica o que selecionar.
