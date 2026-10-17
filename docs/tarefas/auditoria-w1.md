# Auditoria W1 — categorias com arte

Implementação em `wiki/pagina-categoria`, sobre o conjunto X5/C6/X8, conforme a exceção da especificação.
Nenhuma mudança no leitor, na ficha lateral ou no formato do cofre.

- `articleImage`: primeiro campo de imagem do tipo, depois primeiro embed de imagem no corpo; sem arte retorna null.
- Início: no máximo cinco artigos recentes por categoria, miniaturas de 28 px e rota “Ver todos os N”.
- Categoria: grade de 150 px com duas colunas no celular; lista com miniatura de 40 px; busca em nome, apelidos e
  campos; ordem por nome/data; filtros por texto com até oito valores e por subpasta; 24 itens por lote.
- Resolução dos anexos igual à do Embed (`resolve`/`fileUrl`), imagens lazy e inicial em caso de falha. Navegador usa
  iniciais por definição da W1. Os exemplos Lia/Mara conferem propriedade/corpo; Zuri não tem arte.
- Todas as listagens, contagens e filtros usam o índice recebido do modo dos jogadores. Nenhuma gravação para
  navegar; criar artigo é ação explícita existente, com tipo e pasta predefinidos.
- Rota decodificada uma vez; categoria fora da Wiki é recusada. Caminhos com `%` são cobertos por teste.

## Verificação

- Núcleo: 20 testes focados de Wiki/categoria. Caso de 500 notas usa um getter de texto que lança erro: a página
  continua montada por metadados do índice; não abre o corpo nem acessa disco para listar artigos.
- Navegador: grade/lista, apelido, criação predefinida, tema claro/escuro e visão pública. Em 320 px, duas colunas
  de 133,8 px e documento/área principal com largura 320; sem rolagem lateral. Capturas em `docs/imagens/wiki-w1`.
- Electron: dois smokes (leitura e cópia gravável), com as sete verificações W1 verdadeiras: resumo de cinco,
  retrato da propriedade, imagem do corpo, inicial, lista persistida, busca por apelido e índice público.
- Conjunto beta.5: tipos, builds web/desktop e suíte completa. 439 testes app e 168 desktop passaram; cinco testes
  de corpus real continuam ignorados por ausência de `RUNAS_CORPUS`.

A revisão complementar do snapshot anterior d6ea6bd apontou D1 (ajuda fixa de atalhos), D2 (fixture ZIP onerosa) e
D3 (árvore sintática imutável ainda parcial no teste). D1 agora lê a mesma preferência do comando, inclusive no
botão e na paleta; conferido com Mod+Alt+N. D2 preserva 101 MiB reais, com compressão nível 1 e prazo específico de
15 s. D3 publica a árvore completa numa transação do estado de teste. O leitor não foi alterado. Concorrência da
suíte app limitada a dois workers; `npm test` canônico passou após essas correções.

Ainda conferir em máquina real: categoria com 100+ retratos, desempenho do scroll/carregamento lazy e vários
monitores/escalas; modo público após alterações externas; Windows instalado, leitores de tela e toque físico.
Android é fora desta release e depende das frentes C8/X7, como registrado na revisão complementar.
