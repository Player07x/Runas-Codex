Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
O Runas-Codex usa o mesmo cofre local que o Obsidian: notas Markdown, anexos, propriedades no frontmatter e wikilinks continuam sendo arquivos comuns. Você pode abrir uma pasta já existente em **Configurações › Cofre**. Um cofre externo começa em somente leitura para evitar sobrescrever mudanças; libere a gravação quando tiver conferido a pasta.

### Formato que os dois programas compartilham

O leitor entende CommonMark, tabelas e tarefas do GFM, `[[wikilinks]]`, links Markdown, callouts, destaque `==`, comentários `%%`, rodapés, LaTeX, Mermaid, transclusões e blocos do Runas-Codex. Datas e horas de propriedades ficam entre aspas no frontmatter. O app mantém a extensão `.md` e não converte as notas para um formato fechado.

### Links e anexos

A preferência de formato de link vem de `.obsidian/app.json`: mais curto possível, relativo ou caminho completo. O app também respeita a escolha do Obsidian entre wikilinks e links Markdown. Imagens ficam em `Anexos/Imagens` conforme a configuração do cofre; os demais anexos seguem a pasta definida pelo Obsidian. Links quebrados ficam marcados no editor e podem ser corrigidos renomeando a nota.

### Aparência igual

Instale **`.obsidian/snippets/runas-codex.css`** em Configurações › Obsidian e anexos e ligue o trecho em **Obsidian › Aparência › Trechos de CSS**. Ele desenha callouts, colunas, capitulares, fichas, cores de categorias e campanhas. Sem o snippet, o conteúdo continua correto, mas os extras visuais aparecem como Markdown e HTML comuns.

### O que não vai para o cofre

Tema, tamanho da interface, atalhos e outras preferências deste aparelho ficam no armazenamento local do app. O histórico de versões e os backups de texto também são locais. Só as notas, anexos, quadros e arquivos dos espaços são compartilhados com o Obsidian.

### Plugins de RPG

Plugins do Obsidian podem continuar lendo as notas. Para preservar a compatibilidade, propriedades novas são gravadas como valores YAML comuns e os recursos especiais usam o dialeto documentado na Ajuda. Se um plugin alterar uma nota enquanto ela está aberta, o editor detecta a versão diferente e pede que você releia antes de gravar.
