# Tarefa: exportações para documento (X4)

**Para:** Codex (GPT-6 Astra), depois da etapa 9. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a
[divisão das tarefas](README.md) e os itens da [checklist](../01-checklist-recursos.md) G.2 (exportar nota ou coleção
em PDF, DOCX e HTML; site HTML estático; versão dos jogadores) e G.4 (diário da campanha em PDF/HTML).

Um PR (`export/documentos`). A ideia é generalizar o que a 8c fez para os livros: **qualquer nota ou conjunto de
notas sai em PDF, DOCX ou HTML**, com o mesmo leitor do app.

## O que já existe

- Os exportadores da 8c (PDF pela prévia/`printToPDF`, DOCX, EPUB) e o `saveBytes` da C0.
- **Versão dos jogadores:** o `Markdown` tem a opção de esconder segredos (`showSecrets` em
  `components/Markdown.tsx`): some o callout `[!segredo]`, a camada "Segredos" e os pinos `segredo: true` dos mapas
  e, na linha do tempo, os artigos com `segredo: true` ([ADR 0010](../adr/0010-wiki.md)).
- **Diário da campanha:** já sai em `.md` ([ADR 0011](../adr/0011-campanhas.md), seção "Exportar"); falta PDF e HTML.

## Entregar

1. **Motor** em `app/src/core/export/` (TS puro, com testes): recebe uma lista de notas e as opções (formato, versão
   do mestre ou dos jogadores, levar ou não as notas ligadas) e monta o documento. Reaproveite os geradores da 8c, sem
   duplicar código.
2. **Diálogo "Exportar…"** em `app/src/components/export/`: escolher o formato (PDF, DOCX, HTML), "versão dos
   jogadores" e, numa coleção, as notas (com a opção de incluir as notas ligadas; os anexos usados entram sozinhos).
3. **Entradas nas telas** (as telas são do Claude Code; você só **acrescenta** a entrada no menu que já existe,
   avisando no PR): nota aberta (Notas), artigo e pasta da Wiki, diário da campanha (Campanhas).
4. **Site HTML estático** de uma pasta ou de um espaço: uma página por nota, links entre as páginas, imagens e CSS
   juntos, navegável offline num ZIP (versão do mestre ou dos jogadores). Os blocos desenhados que precisam de
   JavaScript (mapas, linha do tempo, gráfico) saem como imagem estática ou como lista; diga no PR o que ficou de
   fora.
5. **Teste do Electron:** no `--smoke --write`, exporte uma nota do cofre de teste em PDF e HTML (versão dos
   jogadores) e confira que o segredo não está no HTML.

## Pronto quando

- uma nota com todos os formatadores (`Notas/Formatadores.md`) sai em PDF, DOCX e HTML iguais à leitura do app (no
  DOCX, diga o que vira outra coisa);
- a versão dos jogadores de um artigo com `[!segredo]` não leva o segredo em nenhum formato (teste automático);
- o site estático de `Wikis/` abre no navegador sem internet, com links e imagens funcionando;
- `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build` e os dois `--smoke` passam.

## Ao terminar

- PR em português com imagens; registre as decisões na ADR nova `docs/adr/0013-exportacoes.md` (número reservado no
  [`README.md`](README.md)).
- Acrescente em `docs/04-testes-pendentes.md` o que o dono precisa conferir à mão (abrir no Word e no LibreOffice,
  site no celular).
- Atualize a tabela de situação do [`README.md`](README.md).

## Implementação para conferência — 19/10/2026

O complemento da X4 está em `export/x4-interface-livros`; ver ADR 0013. Reaproveita os exportadores publicados
na beta.14 e acrescenta as entradas por módulo, seleção de notas/links e o site ZIP com uma página por nota.
O teste de transferências do Electron agora exporta a versão dos jogadores em PDF, HTML e site ZIP e verifica
que a sentinela secreta não aparece na captura, no HTML nem no site. A publicação aguarda a conferência do dono.
