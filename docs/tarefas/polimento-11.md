# Tarefa: etapa 11 — polimento e lançamento (X8 e C9)

**Para:** as duas frentes, por último. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a [divisão](README.md) e a
seção H da [checklist](../01-checklist-recursos.md#h-plataforma-e-experiência).

Marco do plano: **beta com a mesa do dono.** As duas fases andam juntas; o beta sai quando as duas entrarem na
`main`.

## X8 — visual e acessibilidade (Codex, `polimento/visual`)

- **Revisão visual de todas as telas** a partir de 320 px, no tablet e no desktop, nos temas escuro e claro: sem
  rolagem para os lados, alvos de 44 px no toque, textos e estados vazios em pt-BR. Imagens de antes e depois no PR.
- **Acessibilidade:** tamanho de fonte, contraste (WCAG AA nas variáveis de `styles/tokens.css`), leitor de tela
  (rótulos, foco visível, ordem do Tab, diálogos com foco preso) e "reduzir animações" (`prefers-reduced-motion` e
  uma opção nas Configurações).
- **Modo tablet** e **temas temáticos** (além do escuro e do claro), só pelas variáveis do Órbita.
- **Primeiros passos e conteúdo de exemplo:** um cofre novo abre com um tour curto e notas de exemplo de cada
  espaço, que dá para apagar de uma vez.

## C9 — desempenho, ajuda e lançamento (Claude Code, `polimento/lancamento`)

- **Desempenho com cofres grandes:** 10 mil notas sem travar no celular (índice, busca, gráfico, árvore). Um gerador
  de cofre grande para os testes e números antes e depois no PR.
- **Ajuda offline embutida** (as telas explicam o que fazem; uma seção de ajuda navegável sem internet).
- **Conferência das regras fixas:** nenhuma chamada de rede fora da sala do VTT (teste automático no Electron que
  falha se aparecer uma), zero telemetria e nenhuma busca de atualização automática.
- **Instaladores** (NSIS, `.deb`, AppImage, APK assinado da C8): revisar nomes, ícones, atalhos e desinstalação.
- **Beta:** versão `0.x.0-beta.1` pela tag (ADR 0003), notas de lançamento em português e a lista final de
  `docs/04-testes-pendentes.md` revisada com o dono antes da tag.
