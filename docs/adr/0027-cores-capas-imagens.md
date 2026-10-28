# ADR 0027 — Cores, capas e ícones por campanha e por categoria da Wiki

- **Status:** aceita (2026-10-22)

## Contexto
Em 21/10 o dono pediu três coisas junto com o rework visual (ADR 0026): cada nota da Wiki e das Campanhas com a sua
imagem; cada campanha com capa e cores próprias; cada categoria da Wiki com estilo próprio. O risco é a cor escolhida
deixar o texto ilegível num dos temas, virar a única pista de alguma coisa, ou ficar presa ao app (sem aparecer no
Obsidian).

## Decisão
1. **Onde mora.** São propriedades da nota, então vão para o cofre e valem em todos os aparelhos (regra 5):
   - campanha: `cor`, `icone` e `capa` na nota `Campanhas/<nome>/<nome>.md` (`cor` já existia);
   - categoria da Wiki: a nota `Wikis/<mundo>/<Pasta>/<Pasta>.md` com `tipo: categoria`, mais `cor`, `icone`, `capa`
     e `descricao`. Só com `tipo: categoria` ela vale como nota da categoria e sai da lista de artigos (uma nota comum
     com o nome da pasta continua sendo artigo). Com o plugin Folder Notes, ela vira a página da pasta no Obsidian.
   - O diálogo **Personalizar** (⋯ da categoria; menu de troca de campanha) grava tudo de uma vez e cria a nota da
     categoria quando ela não existe.
2. **Cores seguras.** Doze tons prontos (Brasa, Âmbar, Ouro, Musgo, Jade, Maré, Céu, Lavanda, Ametista, Rosa,
   Sangue, Pedra). A nota guarda só o tom (`cor: brasa`) ou um hexadecimal (`cor: "#c2553a"`); `core/tones.ts` calcula a
   versão escura e a clara, mudando a luminosidade até passar de 4,5:1 sobre todas as superfícies das três paletas.
   Assim o tom serve de texto, link, borda e fundo do botão principal. Uma cor livre que precisou mudar é avisada no
   diálogo. Os nomes antigos (`red`, `gold`, `cyan`, `violet`, `green`) continuam valendo.
3. **Herança.** O elemento com a classe `toned` recebe `--tone-dark` e `--tone-light` e passa a usar o tom como cor
   de destaque (`styles/tones.css`). Dentro da campanha: barra, abas, botões, sessões, missões, quadro e elenco. Na
   categoria: página, cartões e o artigo (página e etiqueta da categoria na Ficha). Na Agenda: os eventos de sessão
   ficam na cor da campanha, achada pela sessão ligada (`sessao`/`evento`) ou, sem ligação, pelo título que a
   campanha dá ao evento (“Sessão 13 — As Cinzas de Valdris”). A cor da campanha vale mais que a cor gravada no evento.
4. **Cor nunca é a única pista.** O nome e o ícone aparecem sempre junto. Em Configurações › Aparência, “Usar a cor de
   cada campanha e categoria” desliga tudo (`data-tones="off"`), e o contraste alto também ignora os tons.
5. **Imagens.** Artigo da Wiki: o campo de imagem do tipo (`retrato`, `imagem`, `simbolo`, `bandeira`) ou a primeira
   imagem do texto, como a W1 já fazia. Sem imagem, um brasão com o ícone e a cor da categoria (nunca um quadrado
   vazio). Campanhas: personagens dos jogadores, NPCs e facções usam a imagem do artigo ligado na Wiki; a sessão usa
   `capa`; a campanha usa `capa` no cartão e no painel.
6. **Ícones.** Uma lista fechada (`EMBLEMS`, 36 ícones do Lucide com nome em português: `coroa`, `castelo`, `lua`…);
   os nomes do Lucide que os tipos da Wiki já usam (`map-pin`, `paw-print`) também valem. Nada de SVG vindo da nota.
7. **Obsidian.** As 12 cores viram classes do snippet `runas-codex.css` (`runas-cor-brasa`…), gravadas em
   `cssclasses` junto com `cor` (as outras classes da nota ficam). Títulos, links e uma faixa no topo da nota ficam no
   tom. Uma cor livre aparece só no Runas-Codex.

## Consequências
- Ficaram de fora, por enquanto: a cor nos links do leitor compartilhado e na busca `Ctrl K` (mexer no leitor quebra
  a regra 7), textura de fundo, fonte de título por campanha, ícone a partir de imagem e cor por tag.
- O Início mostra a próxima sessão com a capa da campanha a partir da F5 (INI-1).
- Novas sessões criadas pela campanha não gravam mais `cor: red` no evento da Agenda: a cor vem da campanha.

## Adendo (28/10/2026): filtros escolhidos e categorias criadas pelo usuário

A nota da categoria passou a guardar também como a categoria se organiza, pelo mesmo motivo das cores: vale em
todos os aparelhos e o Obsidian mostra como propriedades comuns.

- **`filtros`**: a lista dos campos que viram filtro na página da categoria (`filtros: [especie, status]`). Só servem
  campos de um valor de texto por artigo; imagem, número, data e campo com mais de um valor na mesma nota ficam de
  fora, e o diálogo “Escolher filtros” diz por quê. Sem `filtros`, valem os campos com 2 a 8 valores diferentes
  (o comportamento anterior); `filtros: []` desliga todos. Campos com mais de 8 valores viram uma lista de escolha.
- **Categoria criada pelo usuário** (“Monstros”, “Plantas”): a pasta da wiki com a nota da categoria dizendo
  `artigo` (o nome de cada artigo, que vira o `tipo`: `Monstro` → `tipo: monstro`), `campos` (a ficha, um por item:
  `Habitat (link)`; tipos `texto`, `link`, `links`, `número`, `data`, `imagem`; datas ganham o sufixo `_mundo`),
  `secoes` e `perguntas`. A Wiki registra esses tipos a cada mudança do índice (`setCustomKinds`), então a ficha, os
  cartões, os filtros e o Novo artigo tratam o tipo novo como os prontos. Um nome de tipo pronto (“Personagem”) não
  é redefinido: vale o pronto. Tirar um campo da ficha não apaga o valor dos artigos que já o têm. Limite conhecido:
  duas wikis com o mesmo nome de artigo (“Monstro”) dividem a ficha da primeira.
