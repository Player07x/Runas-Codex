O Runas-Codex trabalha offline e pode levar o cofre inteiro ou apenas um espaço para outro aparelho. Abra **Importar e exportar** na barra lateral. A tela começa perguntando o objetivo; escolha o cartão que melhor descreve o que você quer fazer.

### Levar o cofre para outro aparelho

Em **Exportar**, escolha **Levar para outro aparelho**, o que incluir e se os arquivos ligados devem acompanhar a seleção. O pacote `.runas` contém os Markdown, anexos, quadros e dados das mesas escolhidos, com um manifesto para conferir a versão antes da importação. A opção **Cofre inteiro** inclui todas as pastas padrão; as opções Notas, Wiki, Campanhas, Livros e Agenda limitam o pacote ao espaço escolhido. Mesas do VTT entram quando **Incluir mundos e mesas** está ligado.

Na outra instalação, selecione **Importar**, escolha o pacote e confira a prévia. Os arquivos novos serão criados; conflitos aparecem antes da operação e podem ser substituídos ou preservados. Quando houver substituições, o app primeiro guarda um pacote de segurança. A importação só grava depois que você confirma a prévia.

### Gerar documentos e sites

Escolha **Gerar documento ou site** para abrir a exportação de Livros e documentos. É possível gerar PDF, DOCX, EPUB, RTF, HTML offline, site offline, Markdown único ou uma pasta ZIP de Markdown. Selecione as notas e, quando existir, a versão dos jogadores para retirar segredos. O arquivo é salvo pelo seletor do sistema; nada é enviado para a internet.

### Pasta para o Obsidian

**Pasta para o Obsidian** cria um ZIP com os `.md` e anexos originais. Descompacte-o numa pasta e abra essa pasta no Obsidian como um cofre. Wikilinks, propriedades e o snippet do Runas-Codex permanecem no formato que os dois programas entendem.

### Importar arquivos avulsos

Na direção **Importar**, você também pode escolher Markdown, imagens, PDFs ou outros anexos sem montar um pacote. Informe a pasta de destino, confira a lista e resolva os conflitos. Limites de tamanho e quantidade protegem o cofre; se um arquivo exceder o limite, a tela explica qual precisa ser reduzido.

### Importar do Notion

No Notion, use **Exportar** (no menu ⋯ de uma página ou nas configurações do espaço de trabalho), escolha **Markdown & CSV** com as subpáginas e, aqui, importe o `.zip` como qualquer outro pacote. O app reconhece a exportação e, antes da prévia:

- põe tudo na pasta `Notion/` e tira dos nomes o código de 32 letras que o Notion acrescenta;
- troca os links do Notion por links do Obsidian (`[[Notion/Página]]`) e as imagens por `![[…]]`;
- transforma cada banco de dados numa nota com a lista das páginas; as colunas viram **propriedades** de cada página (datas como `"2026-10-17"`, relações como links), e as linhas sem página viram notas novas.

Exportações grandes, que o Notion divide em vários ZIPs dentro de um ZIP, também servem. Fórmulas, visões dos bancos (quadro, calendário) e comentários não vêm na exportação do Notion.
