# Tarefa: pastas de outros aplicativos, transferências e atualização do APK

Pedido do dono após a beta.13. Os testes manuais anteriores foram informados como aprovados. Entregar para mobile e
desktop, atualizar esta lista, mesclar por PR e publicar a próxima beta. Não usar push direto na main nem `--force`.

## 1. Pastas de outros aplicativos no Android

- [x] Remover o filtro que escondia provedores de outros aplicativos.
- [x] Usar a árvore pelo SAF quando a URI não pertence ao armazenamento direto, inclusive com acesso amplo liberado.
- [x] Manter permissões persistentes, versão esperada, temporário sincronizado e recuperação sem substituir conflitos.
- [x] Acrescentar um segundo aplicativo de teste, instalado apenas no CI, para cobrir outra autoridade e outro UID.
- [ ] Confirmar os três smokes no emulador e os checks de Windows/Linux.

## 2. Importação e exportação no mobile e desktop

- [ ] Tornar a tela central de transferências funcional, com os fluxos já existentes acessíveis.
- [ ] Pacotes do Runas com manifesto e versão; prévia, seleção e conflitos antes de importar.
- [ ] Importar/exportar notas e anexos em ZIP Markdown compatível com o Obsidian.
- [ ] Conectar os fluxos de Livros, Agenda, Wiki/Campanhas e Mesa disponíveis no programa.
- [ ] Usar os seletores e destinos de arquivos do sistema em ambos os ambientes; cancelamento não anuncia sucesso.
- [ ] Validar leitura, escrita com versão esperada, conflitos, limites e integridade dos pacotes.

## 3. Atualização do APK no aplicativo

- [ ] Verificar e implementar consulta manual à release, escolha do APK e conferência SHA-256.
- [ ] Abrir o instalador do Android, com autorização e confirmação do usuário, sem abrir o site do GitHub.
- [ ] Recusar arquivo incorreto, aplicação diferente, assinatura incompatível e instalação incompleta.
- [ ] Manter o app utilizável em cancelamentos e salvar notas antes de iniciar a instalação.

## Fechamento

- [ ] Typecheck, testes, build web e desktop; compilação e testes Android no GitHub Actions (ADR 0003).
- [ ] Atualizar ADRs, lista de tarefas e conferências manuais específicas das mudanças.
- [ ] PRs em português, mesclagem após checks aprovados e próxima beta para Android, Windows e Linux.

Importações de produtos antigos da Runas Suite continuam fora do plano conforme ADR 0004; migrações adicionais de
outros serviços seguem o escopo de pós-1.0 já registrado. Sincronização SMB permanece responsabilidade do gerenciador
escolhido pelo usuário.
