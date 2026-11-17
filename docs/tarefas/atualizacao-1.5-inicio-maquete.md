# Início 1.5 — maquete U46 para aprovação

Base: `visual/1.5-pequenos`, PR #146, commit `bcf5bc4`. Mesclar #146 antes.

[Abra a maquete HTML](atualizacao-1.5-inicio-maquete.html) por um servidor local ou diretamente no navegador.
É autônoma: tokens, estilos do V1, fonte Geist e runa estão incorporados, sem rede ou dependências adicionais.
O antes usa o DOM/estilos do Início desse commit, com um cenário fictício fixado igualmente nas duas versões.
Não é comparação com a maquete da 1.3 nem com dados do cofre do João.

## Proposta

Cinco blocos antes: Próxima sessão, Espaços, Retome o fio, No horizonte e Centelhas.
Cinco depois: destaque da sessão, Hoje, Campanhas ativas, Retome o fio e Centelhas.

- No dia marcado, o destaque chama-se Mesa de hoje. Fora desse dia continua Próxima sessão.
- Hoje reúne evento, tarefas com prazo/atrasadas e hábito; a visão completa segue na Agenda.
- Campanhas ativas ocupa o lugar dos contadores e mostra a data/hora no mundo. A navegação mantém os seis espaços.
- Retome o fio mostra dois recentes. Centelhas conserva captura, uso e acesso à nota de entrada; Nova nota segue no menu Novo.
- Abertura da campanha fica no cartão da campanha, evitando repetir o botão no destaque da sessão.
- Após comentário do João na prévia, o destaque mobile foi reduzido para 185 px (antes cerca de 356 px), com indicadores compactos e os dois botões lado a lado.

## Conferência

Medições no Electron fora da tela, escala 1, mesmas larguras e dados em cada par.
Altura = conteúdo completo do Início; não é só a área visível nem uma comparação entre tamanhos diferentes.
Os limites da primeira tela são os mesmos nos dois lados: 1280 × 900 e 360 × 800.

| Largura | Cenário | Antes | Depois | Blocos |
|---|---|---:|---:|---|
| 1280 | Mesa hoje | 700 px | 688 px | 5 → 5 |
| 1280 | Sessão futura | 700 px | 688 px | 5 → 5 |
| 1280 | Sem sessão | 672 px | 659 px | 5 → 5 |
| 360 | Mesa hoje | 1699 px | 1360 px | 5 → 5 |
| 360 | Sessão futura | 1699 px | 1338 px | 5 → 5 |
| 360 | Sem sessão | 1543 px | 1327 px | 5 → 5 |

Os números coincidiram nos temas claro e escuro. Os 12 pares passaram sem rolagem lateral nem crescimento de altura/blocos.
[JSON das medidas e teclado](../imagens/inicio-1.5/medidas.json).
Tarefa marcada com Space após foco; caixas e captura também disponíveis para interação na maquete.

Capturas da primeira tela, antes/depois lado a lado:

- [360 escuro](../imagens/inicio-1.5/comparacao-360-dark.png) e [360 claro](../imagens/inicio-1.5/comparacao-360-light.png).
- [1280 escuro](../imagens/inicio-1.5/comparacao-1280-dark.png) e [1280 claro](../imagens/inicio-1.5/comparacao-1280-light.png).

## Limites e próximo passo

Somente maquete em documentação. Os controles locais demonstram interações; links anunciam qual fluxo existente abrirão.
Nada lê/grava o cofre. Não houve implementação do Home.tsx, merge, tag ou lançamento.
A integração com tarefas, hábitos e relógios existentes, persistência, estados de erro/leitura/PIN e Android físico será validada na implementação, após aprovação.
A aprovação de aparência não substitui os testes do fluxo real.

**Estado: maquete aprovada pelo João nesta conversa em 17/11/2026**, incluindo o destaque mobile compacto. A implementação segue a ordem do arquivo de continuação; a aprovação não autoriza merge ou lançamento.
