# ADR 0021 — Atualização manual do APK e interface sem indicações de teclado

- **Status:** aceita (2026-10-18)

## Decisão

O Android usa a mesma linha **Verificar atualizações** do desktop. A interface só pede a consulta e confirma a tag;
o plugin nativo `RunasUpdates` busca as releases do repositório oficial, sem abrir um navegador. O núcleo TypeScript
compara SemVer e prefere o APK assinado (`…-android.apk`); o debug é compatibilidade para releases antigas.
A consulta não ocorre ao iniciar o app. A CSP e o leitor Markdown permanecem iguais (exceção já aprovada na ADR 0017).

O download só usa os assets guardados na última consulta, válida por 30 minutos. Não aceita endereços do renderer:
APK e SHA256SUMS precisam ser da mesma tag no repositório oficial, por HTTPS. Redirecionamentos só podem ir aos
hosts de assets do GitHub. Há timeouts, limites de resposta e APK até 256 MiB; tamanho e SHA-256 precisam conferir.
O arquivo fica no cache privado. Antes de abrir o instalador, o Android precisa reconhecer o APK, o identificador
de aplicativo precisa ser o mesmo, `versionName` precisa corresponder à tag, `versionCode` deve aumentar e o conjunto
de certificados deve coincidir com o app instalado. Rotação de chave exige migração planejada; não é aceita automaticamente.

O botão salva as notas pendentes antes da instalação. No Android 8+, se necessário, abre a autorização de instalar
aplicativos desta fonte. Negar mantém o app e o cofre utilizáveis. Ao voltar da autorização, confere novamente o
arquivo e a identidade. O instalador recebe somente a URI do APK com permissão de leitura. O usuário confirma a
instalação; abrir o instalador nunca é anunciado como instalação concluída. Cancelar mantém a versão atual.
Só uma consulta ou download é permitido por vez. Falhas apagam o arquivo parcial; depois de abrir o instalador,
o arquivo permanece no cache até a próxima tentativa ou limpeza pelo Android, para não interromper sua leitura.

## Assinatura e versão

As betas até a 13 distribuíram APK debug com chave criada no runner. Um APK assinado com outra chave não pode
substituir essa instalação: o atualizador recusa e explica a necessidade de migração manual, sem remover dados.
A próxima beta passa a publicar o APK com uma chave permanente guardada fora do Git, nos secrets de assinatura já
previstos na ADR 0015. Essa chave precisa de cópia de segurança privada para as atualizações futuras.
A chave só entra no job de assinatura em tags de release, não nos PRs.

O `versionCode` anterior ignorava as betas (todas usavam 100). Agora ordena major/minor/patch, alpha, beta, RC e
estável; `0.1.0-beta.14` usa 1001014. Os limites de cada campo e a ordenação são conferidos antes de todo build.
O Android só instala a nova versão depois de todas as verificações e de sua confirmação nativa.

## Indicações de teclado

No APK, Configurações não exibe o editor de atalhos. Paleta, busca, navegação, impressão e ferramentas da mesa
não exibem combinações Mod/Ctrl/Alt. As ações continuam disponíveis por botões e gestos. Desktop conserva seus
atalhos. Não ocultamos trechos `<kbd>` escritos pelo dono em notas: são conteúdo, não indicações da interface.

## Verificação

Testes TypeScript cobrem seleção do APK, ausência de consulta, erros e limpeza de observadores. Testes JVM cobrem
origens, redirecionamentos, somas, tamanho, versão, pacote e assinatura. Um APK separado do CI habilita uma origem
HTTP em loopback, via `-PrunasUpdateTest`; o APK distribuído, inclusive o debug, recusa esse método. O Gradle proíbe
release com essa opção. O teste do emulador serve releases fictícias, recusa cinco tipos de arquivos inválidos,
recusa a permissão, cancela o instalador e confirma a atualização real de beta.13 para beta.14, com a mesma chave
de teste, preservando a árvore SAF e suas notas. Essa fixture fixa versões de teste e não altera versões publicadas.

Referências: [autorização para instalar](https://developer.android.com/reference/android/content/pm/PackageManager#canRequestPackageInstalls()),
[certificados do APK](https://developer.android.com/reference/android/content/pm/SigningInfo) e
[instalador por intenção](https://developer.android.com/reference/android/content/Intent#ACTION_INSTALL_PACKAGE).

## Publicação da beta.14

Tags com Android habilitado passam a exigir a chave permanente: falta de secrets de assinatura falha o job.
A publicação confere a presença do APK assinado e retira o debug da lista de arquivos da release. O APK debug
continua como artefato dos PRs, para testes, sem ser oferecido como atualização de produção.
