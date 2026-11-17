# Revisão de segurança — atualização 1.5 (O/U91)

Conferência do código em 17/11/2026 sobre `main` `80eb718`, com as alterações deste PR. Esta é uma revisão
orientada aos itens 6–7 do U91; as falhas de gravação e permissões de armazenamento ficam nos PRs M e N.

## Proteções existentes e o que esta revisão acrescenta

| Área | Evidência e comportamento |
|---|---|
| Interface isolada | Janela principal e notas extras usam `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` (`desktop/src/main/index.ts`, `windows.ts`). O preload expõe operações delimitadas, e o handler IPC confere a janela que enviou. |
| HTML das notas | `rehype-sanitize` no leitor, CSP sem `unsafe-eval`, objetos e frames bloqueados (`app/src/components/Markdown.tsx`, `app/csp.ts`). Imagens, áudio e fontes vêm do app/cofre. |
| Cofre e gravação | Caminhos e links simbólicos são validados; versão lida é conferida antes da troca atômica, conflitos são recusados e backups precedem alterações importantes (`vault.ts`, `VaultProvider.tsx`). Esta revisão não altera esses arquivos de gravação. |
| Sala | Acesso de jogadores por código e sessão; cookie `runas_seat` com `HttpOnly`, `SameSite=Strict` e validade (`vtt/player-server.ts`). A projeção dos dados separa os segredos do mestre. O mestre remoto tem chave própria (ADR 0016). |
| Rede | Sala e verificação manual de atualização, conforme ADR 0017. Hash do instalador/túnel é conferido. Esta revisão não acrescenta pedidos de rede ao app. |
| Android | `allowBackup="false"` evita backup automático dos dados do app. As permissões amplas atuais ainda dependem da tarefa N. |
| Permissões das páginas | Este PR instala os handlers de consulta **e** de pedido da sessão Electron: câmera/microfone (`media`), localização, notificações e permissões desconhecidas são recusadas. Só escrita de texto na área de transferência é aceita em janelas conhecidas do app. |
| Notificações do app | `Platform.notify` usa uma operação nativa validada no processo principal, sem dar permissão à página. Lembretes nativos da Agenda continuam como antes. Consultar permissões no smoke não abre câmera, emite avisos nem altera a área de transferência. |

A política segue a documentação do Electron sobre [permissões e isolamento](https://www.electronjs.org/docs/latest/tutorial/security)
e [handlers de consulta/pedido](https://www.electronjs.org/docs/latest/api/session). A CSP e os diálogos de escolha
de arquivos não foram flexibilizados. O critério de confiança da área de transferência é a janela do app, não
uma comparação de origem fornecida pela página.

## Dependências e CI

A auditoria inicial completa, incluindo desenvolvimento, encontrou 12 alertas moderados e dois altos (pacotes
Electron e undici). O CI passa a executar `npm audit --audit-level=high --json`, guardar o relatório e recusar
alertas altos/críticos. Os moderados continuam visíveis no artefato e devem ser acompanhados.

Correções pontuais, com datas verificadas no registro npm em 17/11:

| Pacote | Antes | Versão fixada | Publicada |
|---|---|---|---|
| Electron | 44.4.2 | 44.10.1 | 31/10/2026 |
| undici de `@electron/get` | 7.30.0 | 7.30.1 | 15/10/2026 |
| undici de `node-gyp` | 6.29.0 | 6.29.1 | 15/10/2026 |

Todas têm mais de duas semanas. O Electron mantém as dependências da mesma linha e não acrescenta script de
instalação. Os overrides de undici mantêm os majors que os consumidores já usam; devem sair quando os pais
fixarem versões corrigidas. O lockfile é regenerado pelo npm, sem rebaixamentos nem `audit fix --force`.

O [aviso do Electron](https://github.com/electron/electron/security/advisories/GHSA-jr5w-w6x2-84p9) exige versão
corrigida para bloquear certificados intermediários comprometidos; atualizar o app importa para as conexões TLS
permitidas. O [aviso de undici](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) descreve
encerramento do processo ao receber certas respostas HTTP. As cópias npm estão nas ferramentas de build/download,
e não são o motor HTTP embutido no Electron. A [release 44.10.1](https://github.com/electron/electron/releases/tag/v44.10.1)
é a versão estável da linha 44 publicada há mais de duas semanas escolhida nesta revisão.

## O que ainda falta

- M: rascunho fora do cofre quando a gravação falha, indicação “Não gravado”, nova tentativa e teste de gravação.
- N: seletor de pastas Android como padrão e tratamento da perda de permissão. Acesso amplo atual não foi removido aqui.
- Assinatura dos instaladores Windows e análise real de falsos positivos. A assinatura não garante aceitação pelo
  Defender ou elimina, por si só, os avisos do SmartScreen.
- Validação física com Defender/Acesso controlado a pastas, antivírus de terceiros, Android e leitor de tela.
- A revisão não certifica ausência de vulnerabilidades no VTT ou nas dependências; os smokes e testes exercitam os
  controles descritos. Segurança da distribuição exige conferir o CI, os hashes publicados e as dependências a cada versão.

## Enviar um falso positivo à Microsoft (o João envia)

1. Obtenha o instalador oficial e confira seu SHA-256 com `SHA256SUMS.txt` da release.
2. Abra o [formulário de análise de arquivo](https://www.microsoft.com/en-us/wdsi/filesubmission), escolha **Software developer**
   e entre na conta solicitada pelo portal.
3. Selecione o produto Microsoft que detectou o arquivo e informe que ele foi detectado incorretamente. Envie
   apenas o instalador; não envie cofre, notas, capturas pessoais ou exclusões de antivírus.
4. Informe versão, hash, detecção e o endereço da release/repositório. Descreva o bloqueio observado. No caso
   conhecido: Windows em italiano, Itália, Defender; liberar o app resolveu a gravação. Ainda não há evidência
   de qual módulo do Defender bloqueou o arquivo.
5. Guarde o número da submissão e acompanhe a determinação final. Se discordar, use o contato disponibilizado
   no resultado. Repita a análise para um novo arquivo quando houver nova detecção.

O [FAQ da Microsoft](https://learn.microsoft.com/en-us/defender-xdr/developer-faq) distingue Defender, Firewall e
SmartScreen e não oferece inclusão preventiva em uma lista de programas confiáveis. O envio é um caminho de
revisão de falso positivo; não se recomenda desligar o antivírus nem excluir pastas inteiras.

## Assinatura gratuita e licença MIT aprovada pelo João

A [SignPath Foundation](https://signpath.org/) oferece assinatura gratuita para projetos abertos elegíveis.
Os [termos](https://signpath.org/terms), consultados em 17/11/2026, exigem licença aprovada pela OSI, componentes
abertos sem dupla licença comercial, manutenção e versões públicas, origem verificável dos binários, MFA,
responsáveis por revisão/aprovação e política pública de assinatura/privacidade. Cada release requer aprovação
humana. O certificado identifica a Foundation; a inscrição depende da avaliação e reputação do projeto.
Não foi solicitada inscrição nem assinatura nesta revisão.

**Licença aprovada em 17/11/2026 para o código próprio: MIT**, [aprovada pela OSI](https://opensource.org/license/mit). É uma licença
curta, permite redistribuição e uso comercial, preservando aviso de autoria/licença, e não exige abertura de
modificações por terceiros. O PR inclui o arquivo `LICENSE`, a identificação MIT nos quatro pacotes do projeto e `app/public/LICENCA-MIT.txt`,
que acompanha os builds web, Electron e Android.

A MIT cobre o código próprio; não substitui licenças de outros autores. Antes da inscrição no programa gratuito,
conferir a origem e os direitos dos trechos reaproveitados da Runas Suite/RunasVTT e de contribuições externas.
As licenças próprias de Electron, dependências, fontes, dicionário VERO e outros recursos continuam valendo e
precisam acompanhar a distribuição. A escolha foi aprovada pelo João; a Foundation ainda precisa avaliar a
elegibilidade e a inscrição. Não contratar certificado pago como alternativa automática.

## Validação desta revisão (17/11)

`npm ci`, `npm run typecheck`, `npm test`, `npm run build` e `npm run desktop:build` passaram. Foram
1.053 testes do app e 199 do desktop; cinco testes anteriores do app continuam skipped. A auditoria completa
retornou **0 altos, 0 críticos e 12 moderados**. No Electron 44.10.1, os smokes de leitura (28,7 s) e gravação
(99,4 s) passaram com perfis novos e cofre de exemplo, confirmando as quatro permissões negadas e a escrita de
texto na área de transferência permitida. Não houve violações de rede; temporários dos testes foram removidos.
O CI de código/auditoria e os smokes Windows/Linux também passaram no commit de implementação.
