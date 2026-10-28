A **Wiki** guarda o seu mundo. Cada wiki é uma pasta `Wikis/<nome>/` e cada artigo é uma nota comum, com a ficha
montada a partir das propriedades. Você pode ter várias wikis (uma por mundo) e trocar pelo seletor no começo da
barra da Wiki; o ⋯ da barra tem **Nova wiki…** e **Exportar wiki…**.

### A página inicial

Mostra a apresentação (a nota `Wikis/<nome>/<nome>.md`, editável em **Página inicial**), quantos artigos existem,
os links **a escrever** (citados, mas ainda sem nota), a data de hoje no mundo e os **cartões das categorias** (cada
pasta da wiki), com os últimos artigos de cada uma. Embaixo, os editados por último. A busca aceita os operadores do
tópico Notas.

### Tipos de artigo

**Novo artigo** pergunta o tipo, o nome e a pasta. Cada tipo já vem com a ficha (as propriedades), as seções e as
**perguntas-guia** (comentários `%% %%` que aparecem só ao editar): Personagem, Local, Cidade, Construção,
Organização, País, Item, Material, Espécie, Cultura, Religião, Idioma, Magia, Tecnologia, Veículo, Mito,
Acontecimento, Guerra, Documento, Condição, Era, Calendário e Mapa.

### Categorias criadas por você

Quando nenhum tipo serve (“Monstros”, “Plantas”), use **Nova categoria** na página inicial (ou **Criar uma
categoria** dentro do Novo artigo):

1. **Nome da categoria**, no plural: vira a pasta (`Wikis/<mundo>/Monstros`).
2. **Nome de cada artigo**, no singular: aparece em “Novo monstro” e vira `tipo: monstro`.
3. **Ficha de cada artigo**: um campo por linha, com o tipo — texto, link para um artigo, lista de links, número,
   data do mundo ou imagem. Dá para começar copiando a ficha de um tipo pronto.
4. **Seções do texto** e **perguntas-guia**, se quiser.

Isso grava a nota da categoria (`Monstros/Monstros.md`) com `artigo`, `campos`, `secoes` e `perguntas`. Depois, em
**⋯ › Ficha da categoria…** você muda a ficha; tirar um campo não apaga o que os artigos já têm.

### A página de uma categoria

- Busca por nome, apelido ou valor, ordem (nome ou editados por último), grade ou lista.
- **Filtros**: pílulas com os valores de cada campo e quantos artigos têm cada um (com muitos valores, vira uma lista
  de escolha). Em **Escolher filtros** você decide quais campos viram filtro. Só servem campos com um valor de texto
  por artigo: imagem, número, data e campos com mais de um valor numa nota ficam de fora, e a janela diz por quê.
  A escolha fica na nota da categoria (`filtros`) e vale em todos os aparelhos; **Voltar ao automático** desfaz.
- **⋯ › Personalizar categoria…**: cor, ícone, imagem de capa e descrição, que aparecem no cartão, na página e nos
  artigos.
- **⋯ › Exportar categoria…**: PDF, DOCX ou HTML com os artigos.

### O artigo

O artigo abre como qualquer nota (Leitura, Editar, Código). O botão **Painel** mostra ao lado:

- **Ficha**: imagem, campos do tipo e datas calculadas (idade, “há 120 anos”, era, estação). **Editar** abre os campos
  para preencher, com sugestões de artigos nos links.
- **Relações**: aliados, inimigos, pais, membro de… vistos dos dois lados. **Adicionar** escolhe o tipo, a nota e uma
  atitude (“hostil”, “amigo de infância”), gravada como `aliados: ["[[Nota]] (amigo de infância)"]`.
- **Citado em**: as notas que citam o artigo, com o trecho.
- **Links**: de saída, quebrados e menções sem link.
- **Mostrar artigo pela sala** / **Encerrar apresentação na sala**: mostra a página (sem segredos) para quem está na
  sala do VTT.
- **Mídia e recorrência**: música ou som do artigo e, para acontecimentos, a repetição no calendário do mundo.

Na aba Wiki da galeria Formatar ficam o segredo de jogador, o spoiler, a galeria, o áudio, a tabela rolável e o
dicionário.

### Segredos e a visão dos jogadores

O botão **Visão do mestre** na barra da Wiki troca para a visão dos jogadores: somem as caixas `[!segredo]`, os
artigos com `segredo: true` e os pinos secretos. Bom para conferir antes de mostrar algo pela sala ou exportar.
