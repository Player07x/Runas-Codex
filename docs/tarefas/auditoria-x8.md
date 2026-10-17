# Auditoria X8 — visual, acessibilidade e primeiros passos

Execução solicitada em 17/10/2026, depois de X5 e C6. Android excluído nesta rodada por pedido do dono.
A revisão posterior está em [revisao-completa-complementar.md](revisao-completa-complementar.md).

| Item | Implementação e evidência |
|---|---|
| Todos os espaços em 320 px, tablet e desktop | Nove destinos principais conferidos em 320 × 844, 1024 × 900 e 1440 × 1000, claro/escuro. Medições e capturas em `docs/imagens/polimento-x8/` |
| Telas internas | Wiki: calendário, linha do tempo, mapa, relações, ferramentas, gráfico e artigo; Campanhas/ferramentas e quadro; editor/prévia de Livros; páginas e painéis da Mesa pelos smokes |
| Navegação em telas estreitas | Seletores de tela na Wiki/Campanhas/Livros; ações do editor recolhíveis; opções de escrita preservadas sem ocupar a leitura |
| Fonte por aparelho | Escala 85–140% na interface, editor e leitura; páginas impressas mantêm dimensões físicas |
| Contraste AA | Teste das seis combinações: textos semânticos ≥ 4,5:1 em fundo, fundo profundo, painéis e hover; botão primário ≥ 4,5:1; borda de campo ≥ 3:1 |
| Teclado e diálogos | Título associado, Tab circular, Escape e devolução de foco; paleta, workspaces e configurações da Mesa usam o mesmo escopo. Abas segmentadas usam setas/Home/End |
| Movimento | `prefers-reduced-motion` e preferência explícita; sem animação contínua quando reduzida |
| Tablet e temas | Modo tablet com navegação compacta e controles maiores; Órbita, Floresta e Brasa em claro/escuro, só por tokens |
| Primeiros passos | Cofre novo gravável recebe tour e oito notas de exemplo em seis espaços; restauração dos exemplos ausentes sem sobrescrever; remoção só das notas marcadas para `.trash` |
| Sala dos jogadores e mestre remoto | Ajustes de aparência disponíveis na própria página; paleta e escala locais ao participante |
| Android e aparelhos/leitores físicos | Tarefa complementar, sem alegar validação física nesta rodada |

## Pedido adicional: imagens e números reais

- `Anexos/Imagens` é o destino comum de imagens coladas, arrastadas, importadas em livros e recortes. Demais anexos
  continuam usando a configuração do Obsidian. Criar um cofre também prepara essa pasta.
- Configurações permite preparar a pasta e ver os destinos antes de reunir imagens existentes. Nomes repetidos
  recebem número; não sobrescreve outra imagem.
- Pelo botão Imagens vinculadas à nota, botão direito na imagem ou menu do link no Código, o usuário renomeia/move
  o arquivo e atualiza referências pelo `useVault().rename`. Preserva tamanhos, legendas, referências em notas/mapas
  e `.canvas`, inclusive `runas_original` do recorte. O ajuste desse campo no planejador foi feito para atender ao
  pedido explícito de renomeação de imagens; a gravação segura não foi alterada.
- Página inicial e barra lateral usam entidades do cofre: notas do espaço, eventos válidos, artigos sem a página
  inicial da Wiki, campanhas, livros e manifestos de mesas. Zero não recebe fallback de dados de exemplo.
  Notas recentes também vêm do cofre aberto.
- Pela interface de teste: renomeação de imagem com dois embeds, atualização em três arquivos e carregamento dos
  dois embeds depois da mudança; reunião do mapa na pasta padrão. Testes incluem cofre vazio, Wiki sem artigos,
  pastas de outros espaços preenchidas, colisões e referências em mapa/quadro.

## Verificação

Typecheck, suíte completa (428 testes do app passaram, 5 ignorados; 168 do desktop passaram) e builds web/Electron.
Os dois smokes conferem o app inteiro com perfis temporários próprios; o smoke de escrita exige a nova pasta de
imagens e aceita o link curto gerado pelo Obsidian. Conferência visual e de teclado no navegador local.

As capturas de 320 px e as medidas verificam a largura da página. Linha do tempo, tabelas extensas e genealogias
mantêm navegação interna própria. Validação real com leitores de tela, multitouch, bandeja Windows/Linux e
impressoras integra a tarefa complementar.
