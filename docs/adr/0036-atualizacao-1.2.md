# ADR 0036 — Atualização 1.2: regras de tela e decisões dos itens U16 a U34

- **Status:** aceita (2026-11-08)

## Contexto
Em 07/11 o dono mandou 16 capturas com problemas e pedidos em Wiki, Campanhas, VTT e editor. O plano
([`atualizacao-1.2.md`](../tarefas/concluidas/atualizacao-1.2.md)) dividiu tudo em U16–U34 e nos PRs A–P. O Codex fez uma
primeira versão das maquetes e do código, e ela quebrava o rework: texto de 9 a 11 px, Cinzel na interface, dois
botões principais, abas misturadas com vistas, "Salvar" em nota e dados de mesa inventados. Na revisão de 08/11, o
plano ganhou as regras **D1–D17** e as maquetes foram refeitas
([versão 2](../tarefas/concluidas/atualizacao-1.2-maquetes.html)). Esta ADR registra o que vale daqui em diante e as escolhas de
cada item que não estão no código.

## Decisão
1. **D1–D17 são regras de aceite de tela**, junto com a regra 10 do `AGENTS.md`. O texto completo está no plano. Em
   resumo:
   - Anatomia de lista, de documento e de diálogo, com no máximo **uma ação principal** por cabeçalho, cartão ou
     diálogo, e o resto num ⋯ com nome.
   - Kit primeiro. Entram no kit `FormGrid`/`FormField`, `NoteCombobox`, `WorldDateField` e `useGridColumns`.
   - Um painel por tela, pelo `ResizablePanel`.
   - `PanelTabs` troca o conteúdo; `ChoiceGroup` troca a vista.
   - Cor com função.
   - Nada abaixo de 12 px, nem dentro de SVG. Cinzel só nas páginas impressas.
   - Alvos de 24 px no ponteiro e 44 px no toque.
   - Todo desenho tem uma alternativa em lista ou texto.
   - Formulários alinhados, com valores gravados por `setProperty`.
   - Estados completos.
   - Nada simulado nem perdido.
   - Brasão quando falta imagem.
   - Nada animado com movimento reduzido.
   - Preferência de tela no aparelho; conteúdo no cofre.
2. **Missões:** a vista "Árvore" sai e dá lugar a **Relógios**. Os relógios de ameaça saem do Painel e ficam nas
   Missões. O Mapa de missões passa a ser a alternativa acessível da antiga árvore.
3. **Relógio do mundo:** cada volta do mostrador é um período, e o dia avança depois do último período. A hora fica
   no bloco `runas-calendario`, como o "hoje no mundo" (ADR 0035).
4. **Nota do mestre** é uma nota solta e secreta em `Notas do mestre/` da campanha.
   - A ligação com uma sessão é a propriedade `sessao: "[[Sessão N]]"`, gravada por `setProperty`.
   - **+ Novo → Nota do mestre** cria a nota na campanha aberta; fora de uma campanha, pergunta qual.
5. **Token ↔ nota** (D e N):
   - As chaves `token_*` da ficha guardam a imagem, o tamanho, a disposição e as barras.
   - **Importar de novo da nota** guarda o valor atual das barras de mesmo nome e troca o resto.
   - **Importar de um token salvo** copia a imagem para os anexos da nota (`<nome> (token).<ext>`) e faz o token da
     Biblioteca apontar para a nota.
   - Notas de mapa sem imagem de token própria não aparecem em "Da wiki".
6. **Elenco no tamanho pequeno** não vira abas: a atitude e o "apareceu" ficam em etiquetas, e o resto vai para o ⋯
   (D2, D5).
7. **Geradores ×4 (U32).** As tabelas foram escritas à mão, sem sufixo nem variante numerada. A maior parte vem de
   partes compostas (pessoas, lugares, enredo, mundo) que concordam em gênero. Elas passaram de 8.599 para cerca de
   **21.000** opções: o dono disse que já bastava, abaixo da meta de 34.396 do plano. Os nomes das culturas lusófonas
   não mudaram. O teste exige pelo menos 21.000 opções e nenhuma repetida (sem contar maiúsculas).
8. **Rumor sem "verdade".** Guardar um resultado das Ferramentas abre o Novo artigo do tipo certo (U27).
   - A lenda e o rumor viram **Mito**.
   - A lenda preenche o campo `verdade` ("O que é verdade").
   - O rumor não preenche: é o que se conta, e se é verdade quem decide é o mestre. O plano mandava os dois para
     `verdade`.
9. **Clique no editor (U16).** O cartão de Propriedades usa padding num invólucro, sem margem, para o CodeMirror medir
   a altura certa. Enquanto o botão do mouse está apertado, o live preview não abre nem fecha o que o cursor revela; ao
   soltar, redesenha. É só uma mudança de *quando* o desenho acontece; o dialeto e o desenho não mudam (regra 7).

## Consequências
- PR de tela diz quais regras D conferiu e marca **Não verificada** o que não conferiu.
- Nenhuma propriedade nova além de `sessao` (nota do mestre) e das `token_*` da ficha. As duas são texto simples que o
  Obsidian mostra como propriedades.
- Versões anteriores do app ignoram as chaves `token_*` e mostram a nota do mestre como uma nota comum.
- Com a espera do botão, a linha clicada só se abre (mostra a marcação) quando o botão sobe, não no mousedown.
