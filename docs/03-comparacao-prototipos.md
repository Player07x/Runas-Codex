# Inspeção e comparação dos protótipos

## Código atual

O aplicativo usa React, TypeScript e Vite. O roteador por hash mantém navegação compatível com
ambientes embarcados. Os dados de demonstração são compartilhados por notas, agenda, wiki,
campanhas, livros e VTT. A separação entre Shell, telas, componentes e tokens de CSS permite
experimentar interfaces sem duplicar a lógica dos módulos.

Os módulos continuam sendo protótipos: várias ações apresentam avisos sobre o que fariam, em vez
de executar a operação. A plataforma em memória não significa que todos os controles já estejam
conectados a ela. Por exemplo, o editor mantém o texto em estado React; a captura original exibe
uma mensagem de nota salva sem guardar o conteúdo. A contagem regressiva da página inicial
original também usa números fixos. Esses pontos precisam ser resolvidos antes de usar dados reais.

O protótipo original já tem navegação inferior e adaptações para painéis no celular. Mapas,
gráficos e mesas possuem interações específicas e ainda exigem validação em dispositivos reais.

## Duas propostas

| Aspecto | Atlas | Órbita |
| --- | --- | --- |
| Direção | Ateliê editorial | Painel imersivo do mestre |
| Tema inicial | Papel claro, verde profundo | Grafite, lavanda |
| Tipografia | Títulos serifados, texto sem serifa | Títulos sem serifa, destaques serifados |
| Navegação desktop | Barra lateral | Barra lateral à esquerda, recolhível |
| Página inicial | Captura, sessão, notas recentes, agenda e preparação | Campanha em destaque, espaços, notas recentes, agenda e ideias |
| Preparação | Checklist interativo com progresso | Acesso direto à sessão |
| Celular | Coluna única, espaços em duas colunas, navegação inferior | Destaque compacto, espaços em duas colunas, navegação inferior |
| Melhor ajuste | Escrita, organização e leitura | Campanhas e preparação de mesas |

O seletor está disponível em todas as telas e preserva a rota atual. As duas propostas compartilham
os módulos existentes, com novos tokens e estilos para superfícies, botões e navegação. As páginas
iniciais têm composições distintas. Links de sessão, mesa, espaços e notas recentes usam as rotas
existentes. A captura mantém rascunhos visíveis apenas enquanto a página inicial estiver montada.
O checklist é uma demonstração local e não sincroniza com a preparação em Campanhas.

## Validação

- Build de produção com verificação TypeScript.
- Inspeção visual desktop em 1440 × 1000 e mobile em 390 × 844.
- Inspeção de largura mínima em 320 px, incluindo menu Mais.
- Navegação mobile para os seis módulos nas duas propostas.
- Captura de texto temporário e atualização do checklist de 3/7 para 4/7.
- Menu Mais, abertura da wiki e paleta de busca global.

As verificações de largura das páginas iniciais e das telas principais não indicaram rolagem
horizontal externa. A validação usa viewport de navegador, sem instalação em Android ou teste
em aparelho físico. Recursos de backend, persistência, rede VTT e todas as ferramentas internas
dos módulos não fazem parte desta validação visual.

O build avisa sobre um arquivo JavaScript maior que 500 kB. A divisão por módulos com carregamento
sob demanda é uma melhoria possível para a fase de implementação funcional.

## Abrir

Execute `npm run dev` na raiz do projeto e acesse:

- Original: `http://localhost:5180/?design=original`
- Atlas: `http://localhost:5180/?design=atlas`
- Órbita: `http://localhost:5180/?design=orbita`

Para o celular na mesma rede, execute `npm run dev:rede` e use o endereço Network fornecido pelo
Vite, mantendo o parâmetro `design`. As imagens de referência estão em `app/previews/`.
