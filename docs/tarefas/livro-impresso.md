# Livro impresso (rework do PDF dos Livros) — Claude Code

Pedido do dono em 25/10/2026, com a proposta visual aprovada (https://claude.ai/artifact/4EzzHLiUXutEE4GkZ2kw22) e as
decisões na [ADR 0033](../adr/0033-livro-impresso.md). Um PR por fase, a partir da `main` atualizada. Arquivos:
`app/src/screens/books/**`, `app/src/core/books*.ts`, `app/src/core/export/**` e o CSS do livro; o leitor compartilhado
(regra 7) não muda: o que é só do livro entra pelo CSS com escopo `.book-print` e pelos pontos de extensão.

| Fase | O que entra | Situação |
|---|---|---|
| **L1** | Prévia ao lado do texto em Escrever: segue o cursor, marca página e título, zoom (largura, página, duas), clique no título leva ao texto, “só este capítulo”; “Ver a página” em tela cheia no celular; Prévia vira Diagramar | PR #69 |
| **L2** | Limpeza do PDF: sem o contorno dos blocos `:::` no papel; um título por capítulo (nome da nota); fluxo das colunas (título nunca no pé, 3 linhas de cada lado, fichas e figuras inteiras); EB Garamond estática (sem Type 3); imagens reduzidas na exportação (Tela 150 ppi, Gráfica 300 ppi, Original); título do PDF; marcadores e PDF marcado; fundo do papel desligado na impressão por padrão | PR aberto (sobre o #69) |
| **L3** | Painel Estilo do livro no Diagramar; modelos Manual de RPG, Grimório, Romance, Moderno e Leitura fácil; modelos próprios como notas `tipo: modelo-livro`; colunas do livro (`colunas:` no livro e no capítulo); cerca de dez fontes livres estáticas e fontes do cofre; migração de `tema:` | PR #72 (sobre o #71) |
| **L4** | Capa (clássica, ilustrada, faixa) com título, edição, subtítulo, autor e imagem pelo seletor de anexos; sumário com páginas; numeração e aberturas de capítulo; páginas espelhadas; cabeçalho e rodapé configuráveis | PR aberto (sobre o da L3) |
| **L5** | Fichas `[!magia]`, `[!runa]`, `[!habilidade]`, `[!item]`, `[!criatura]`, `[!raca]`, `[!classe]`, `[!efeito]` sem réguas (tipográfica por padrão; fundo suave e faixa como opção); “Converter em ficha”; versão dos jogadores sem os segredos; hifenização em português (dependência nova) | a fazer |
