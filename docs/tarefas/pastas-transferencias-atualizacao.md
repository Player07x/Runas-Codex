# Tarefa: pastas de outros aplicativos, transferências e atualização do APK

Pedido do dono após a beta.13. Os testes manuais anteriores foram informados como aprovados. Entregar para mobile e
desktop, atualizar esta lista, mesclar por PR e publicar a próxima beta. Não usar push direto na main nem `--force`.

## 1. Pastas de outros aplicativos no Android

- [x] Remover o filtro que escondia provedores de outros aplicativos.
- [x] Usar a árvore pelo SAF quando a URI não pertence ao armazenamento direto, inclusive com acesso amplo liberado.
- [x] Manter permissões persistentes, versão esperada, temporário sincronizado e recuperação sem substituir conflitos.
- [x] Acrescentar um segundo aplicativo de teste, instalado apenas no CI, para cobrir outra autoridade e outro UID.
- [x] Confirmar os três smokes no emulador e os checks de Windows/Linux (PR #45; Release 39189445030).

## 2. Importação e exportação no mobile e desktop

- [x] Tornar a tela central de transferências funcional, com os fluxos já existentes acessíveis.
- [x] Pacotes do Runas com manifesto e versão; prévia, seleção e conflitos antes de importar.
- [x] Importar/exportar notas e anexos em ZIP Markdown compatível com o Obsidian.
- [x] Conectar os fluxos de Livros, Agenda, Wiki/Campanhas e Mesa disponíveis no programa.
- [x] Usar os seletores e destinos de arquivos do sistema em ambos os ambientes; cancelamento não anuncia sucesso.
- [x] Validar leitura, escrita com versão esperada, conflitos, limites e integridade dos pacotes.

## 3. Atualização do APK no aplicativo

- [x] Verificar e implementar consulta manual à release, escolha do APK e conferência SHA-256.
- [x] Abrir o instalador do Android, com autorização e confirmação do usuário, sem abrir o site do GitHub.
- [x] Recusar arquivo incorreto, aplicação diferente, assinatura incompatível e instalação incompleta.
- [x] Manter o app utilizável em cancelamentos e salvar notas antes de iniciar a instalação.

## Fechamento

- [x] Typecheck, testes, build web e desktop; compilação e testes Android no GitHub Actions (ADR 0003).
- [x] Atualizar ADRs, lista de tarefas e conferências manuais específicas das mudanças.
- [x] PRs em português e mesclagem após checks aprovados (#45, #46, #47 e #48).
- [x] Publicar e conferir a próxima beta para Android, Windows e Linux.

Importações de produtos antigos da Runas Suite continuam fora do plano conforme ADR 0004; migrações adicionais de
outros serviços seguem o escopo de pós-1.0 já registrado. Sincronização SMB permanece responsabilidade do gerenciador
escolhido pelo usuário.

Fase 2: PR #46 mesclado em 19/10/2026. CI 39251916379 e Release 39251916487 aprovados: Windows, Linux, APK, toque, cofre direto, SAF local e provedor de outro aplicativo, incluindo persistência e 5 mil notas. Formato e limites na ADR 0020.

Pedido adicional do dono: ocultar indicações e configurações de atalhos de teclado no Android, mantendo as ações por toque.

Fase 3: PR #47 mesclado em 19/10/2026. CI 39253230955 e Release 39253230923 aprovados, com reexecução
somente do Windows após um bloqueio temporário de arquivo pelo sistema. A atualização real pelo instalador passou
nos 23 checks, incluindo recusas, cancelamento e preservação do cofre SAF, suas permissões e notas. Indicações de
teclado ocultas no APK, com ações preservadas; mestre remoto conferido em Windows e Linux. Política na ADR 0021.

Integração beta.14: PR #48 mesclado no commit `31ec8da75d79aa8fd1394f6de71e54ac168fa5a8`, com CI 39253567159
e Release 39253567116 aprovados. Validação local: typecheck, 496 testes do app e 178 do desktop, build web e desktop;
5 testes existentes do app permanecem ignorados. Os smokes do Android cobriram cofre direto, SAF local e provedor
externo após reiniciar, 5 mil notas, toque, importação e atualização real. As conferências físicas específicas das
mudanças estão acrescentadas em `docs/04-testes-pendentes.md`; os testes manuais anteriores foram aprovados pelo dono.


## Publicação conferida — 19/10/2026

[Beta.14 publicada](https://github.com/Player07x/Runas-Codex/releases/tag/v0.1.0-beta.14), com notas em português,
APK Android assinado, instalador Windows, Linux `.deb` e AppImage, além de `SHA256SUMS.txt`. O workflow
[Release 39255299564](https://github.com/Player07x/Runas-Codex/actions/runs/39255299564) passou; as somas do
manifesto correspondem aos digests dos assets publicados. Não há APK debug na release.

O `apksigner verify --print-certs` confirmou a assinatura da chave permanente, com certificado SHA-256
`e8d988d678a3046e66874a438d9fe017f7f169dff3d5be9720f738bac2d20010`. A beta.13 debug tem outra assinatura:
a migração inicial é manual, preservando o cofre e os backups fora da instalação. As próximas versões assinadas
com esta chave podem usar a atualização pelo app. A chave privada não integra o repositório nem a release.
