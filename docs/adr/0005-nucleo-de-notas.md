# ADR 0005 — Núcleo de notas: leitura, índice e gravação segura

- **Status:** aceita (2026-10-14)

## Contexto
Etapa 3a: o app passa a criar, editar, renomear e apagar notas num cofre compatível com o Obsidian. O risco principal
(docs/02, seção 7) é estragar arquivos: gravar frontmatter errado, perder edições feitas no Obsidian ou regravar o cofre
inteiro e disparar uma "tempestade" de sincronização.

## Decisão
**Um só leitor** (`app/src/core/parse.ts`) para índice, painel de links e renomear: frontmatter, wikilinks em todas as
formas, links markdown, tags (regras do Obsidian), apelidos, títulos e blocos, ignorando código, comentários e
matemática. As posições valem no arquivo como ele está no disco.

**Índice** (`VaultIndex`) no próprio app, reconstruído ao abrir o cofre (776 notas em ~0,2 s). Resolve links como o
Obsidian (caminho, nome sem diferenciar maiúsculas, caminho parcial), preferindo o mesmo espaço quando há nomes
repetidos e marcando o que o Obsidian pode resolver diferente (ambíguo, só por apelido). O Worker fica para quando o
teste de 5 mil notas (etapa 2) mostrar necessidade.

**Gravação** (`desktop/src/main/vault.ts`), sempre com a versão que o app leu:
- arquivo mudou fora do app → recusa, e a tela oferece "usar a do disco" ou "manter a minha";
- conteúdo igual ao do disco → não grava (nem a data muda);
- grava num temporário e troca de uma vez; nunca dentro de pastas com ponto nem através de link simbólico;
- BOM e quebras de linha de cada arquivo preservados; propriedades editadas linha a linha, só a chave alterada, e
  YAML inválido nunca é regravado;
- nomes com `[ ] # ^ |`, reservados do Windows ou que só diferem por maiúsculas são recusados;
- lixeira em `.trash`, a mesma do Obsidian.

**Renomear/mover** atualiza links no texto, nas propriedades e nos `.canvas` (só os trechos dos links mudam) e mantém
o estilo de cada link (nome curto, caminho, `<…>`, `%20`). Pastas são simuladas arquivo por arquivo.

**Cofre existente abre em somente leitura** até o usuário liberar em Configurações (um backup é feito antes). Um cofre
criado pelo app já nasce gravável. A configuração fica fora do cofre (`userData/config.json`).

**Backups** em zip fora do cofre (`userData/backups/<cofre>/`), só com o texto (`.md`, `.canvas`, `.base` e as
configurações do `.obsidian`), automático antes da primeira gravação de cada dia, guardando os 15 últimos.

**Edições externas** chegam pelo observador de arquivos (`fs.watch` recursivo) em lotes; o que o próprio app gravou
não volta como mudança.

**Editor:** CodeMirror 6 no modo de código-fonte, com sugestão de links ao digitar `[[`; o live preview fica para a
etapa 3b. No navegador, o mesmo fluxo roda sobre o cofre de exemplo em memória.

## Consequências
- `RUNAS_CORPUS=<cofre> npm test -w @runas-codex/app` confere ida e volta byte a byte num cofre real, só lendo.
- O `--smoke --write` do desktop testa as gravações e o renomear pela interface numa cópia temporária do cofre.
- Anexos (imagens, PDFs) não entram nos backups e ainda não aparecem dentro das notas (etapa 3b).
