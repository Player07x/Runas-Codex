# ADR 0020 — Pacotes e documentos entre desktop e Android

- **Status:** aceita (2026-10-18)

## Decisão

A tela **Importar / Exportar** passa a executar transferências pela interface `Platform` nos dois sistemas.
O pacote `.runas` é um ZIP com `.runas-pacote.json` (`format: runas-codex`, `version: 1`, título e lista de
caminhos, tamanhos e SHA-256) e arquivos originais em `cofre/`. O ZIP Markdown usa diretamente os caminhos do
cofre. Arquivos avulsos têm uma pasta de destino editável. A importação mostra prévia, seleção e conflitos:
mesclar mantém os existentes, substituir exige salvar antes um pacote de segurança dos arquivos afetados,
e duplicar cria caminhos novos e ajusta links e IDs de mesas. Cancelar o destino de segurança cancela a substituição.

O núcleo puro confere CRC, SHA-256, versão do manifesto e limites durante a descompactação. Recusa escapes,
nomes conflitantes entre Windows/Linux/Android, ZIP criptografado, ZIP64 e pacotes incompletos. Limites desktop:
128 MiB compactados, 256 MiB expandidos, 50 MiB por arquivo e 10 mil arquivos; Android: 64/96/32 MiB e 10 mil.
As notas conservam UTF-8, BOM e quebras de linha; anexos conservam bytes. Configurações `.obsidian`, `.git`, lixeira,
backups e preferências deste aparelho não viajam. Um ZIP de outro cofre pode ter uma pasta externa única.

Toda gravação confirmada passa por `useVault.importTransfer`, com a versão fixada na prévia e conferência nativa
por arquivo. A operação não é uma transação de cofre inteiro: em falha parcial, informa quantos arquivos chegaram
a ser gravados, relê o disco e mantém o pacote de segurança. Mudanças externas não são substituídas silenciosamente.
Não mudamos os arquivos protegidos da gravação segura.

A única área oculta transportável é `.runas/mesas/<mesa>/`: manifesto, documentos/cenas e assets conhecidos. Desktop
e Android abrem essa área como subcofre confinado, com a mesma escrita segura e versão esperada; não há escrita
oculta genérica. Mesas abertas são sincronizadas antes da exportação no desktop. O manifesto importado é publicado
por último; substituir dados fecha a mesa aberta. O Android transporta os dados sem passar a hospedar salas.

Notas ou seleções também geram um documento temporário, sem escrever notas intermediárias: PDF, DOCX, HTML,
EPUB e RTF usam o leitor e os exportadores de Livros. HTML reúne as seções com sumário e links internos offline.
A versão dos jogadores aplica a projeção pública da Wiki e oculta blocos secretos. Pacotes e ZIP Markdown sempre
contêm os originais, com segredos: isso fica explícito na tela. O leitor e o dialeto Markdown não mudam.
No Android, PDF abre o diálogo nativo de impressão A4; cabe ao usuário escolher **Salvar como PDF**. A interface
só confirma a abertura do diálogo, sem anunciar um arquivo salvo. DOCX/EPUB seguem as limitações já documentadas
em Livros (paginação do leitor externo, fórmulas em LaTeX no DOCX).

A tela oferece os fluxos existentes de Livros, Agenda, Campanhas, migração de plugins e backups de texto.
Pacotes de Campanhas e Wikis usam as pastas e notas ligadas; o cofre inteiro inclui os eventos e mesas internos.
Uma seleção parcial de mesa exige o manifesto. Exportações de partes específicas do VTT continuam no módulo Mesa.
Importações antigas da Runas Suite seguem fora do plano (ADR 0004), e importadores de serviços adicionais
continuam pós-1.0. Agendamento de backups e tratamento de conflitos de sincronizadores não fazem parte deste pedido.

## Verificação

Testes do núcleo cobrem ida e volta, binários, quebras de linha, corrupção, limites, escapes, conflitos e duplicação.
Testes nativos cobrem subcofre, versões, links simbólicos e separação de preferências. O smoke do Electron passa
pela interface de prévia/importação/duplicação e confere os arquivos `.runas`, ZIP, HTML e PDF realmente salvos.
O smoke Android cobre importação na interface, dados internos e cancelamento do seletor nos três modos de cofre.
As conferências físicas de provedores, destinos externos e aparência de documentos estão em `04-testes-pendentes.md`.
