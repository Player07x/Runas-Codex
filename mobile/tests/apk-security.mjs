// Auditoria do APK gerado no CI (job android): o que precisa ser verdade para ele ser seguro de instalar. Falha o job
// se algo sair do esperado; na tag, isso segura a publicação.
// Uso: node mobile/tests/apk-security.mjs <apk> <release|debug> <apkanalyzer>
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const [apk, mode = 'debug', apkanalyzer = 'apkanalyzer'] = process.argv.slice(2)
const release = mode === 'release'
const failures = []
const check = (label, ok, detail = '') => { console.log(`${ok ? 'OK' : 'FALHOU'}: ${label}${ok || !detail ? '' : ' — ' + detail}`); if (!ok) failures.push(label) }
const run = (command, args) => execFileSync(command, args, { maxBuffer: 256 * 1024 * 1024 })
const entry = path => run('unzip', ['-p', apk, path])
const entries = run('unzip', ['-Z1', apk]).toString().split('\n').filter(Boolean)

// Manifesto: só a tela principal recebe intents de fora; nada de backup nem depuração no release.
const manifest = run(apkanalyzer, ['manifest', 'print', apk]).toString()
// Um componente de biblioteca exportado só passa se exigir uma permissão do sistema (o ProfileInstallReceiver, com DUMP).
const exported = [...manifest.matchAll(/<(activity|activity-alias|service|receiver|provider)\b([^>]*)>/g)]
  .filter(([, , attributes]) => /android:exported="true"/.test(attributes))
  .map(([, kind, attributes]) => ({ name: `${kind} ${/android:name="([^"]+)"/.exec(attributes)?.[1]}`, permission: /android:permission="([^"]+)"/.exec(attributes)?.[1] }))
const open = exported.filter(component => !component.permission).map(component => component.name)
check('só a MainActivity é exportada sem permissão', open.length === 1 && /MainActivity$/.test(open[0]), open.join(', '))
console.log('   exportados com permissão: ' + (exported.filter(c => c.permission).map(c => `${c.name} (${c.permission})`).join(', ') || 'nenhum'))
check('sem backup do Android (allowBackup="false")', /<application\b[^>]*android:allowBackup="false"/.test(manifest))
check('sem tráfego HTTP liberado para o WebView', !/android:usesCleartextTraffic="true"/.test(manifest))
if (release) check('APK de release não é depurável', !/android:debuggable="true"/.test(manifest))
const allowed = new Set([
  'INTERNET', 'USE_EXACT_ALARM', 'MANAGE_EXTERNAL_STORAGE', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE',
  'REQUEST_INSTALL_PACKAGES', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_CONNECTED_DEVICE', 'WAKE_LOCK', 'ACCESS_WIFI_STATE',
  'CHANGE_WIFI_STATE', 'POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE',
  'ACCESS_NETWORK_STATE', 'DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
])
const permissions = [...manifest.matchAll(/<uses-permission(?:-sdk-23)?\b[^>]*android:name="([^"]+)"/g)].map(m => m[1])
const unexpected = permissions.filter(name => !allowed.has(name.replace(/^android\.permission\./, '').replace(/^dev\.runas\.codex\./, '')))
check('nenhuma permissão fora da lista conhecida', unexpected.length === 0, unexpected.join(', '))

// WebView: sem depuração remota no APK que o usuário instala.
const capacitor = JSON.parse(entry('assets/capacitor.config.json').toString())
check('WebView sem depuração remota', capacitor.android?.webContentsDebuggingEnabled !== true)
check('WebView sem conteúdo misto', capacitor.android?.allowMixedContent !== true)
check('WebView não navega para outros sites dentro do app', !capacitor.server?.allowNavigation?.length)

// Bibliotecas nativas: só o cloudflared fixado (R4), conferido pelo SHA-256 do cloudflared.gradle.
const gradle = readFileSync(new URL('../android/app/cloudflared.gradle', import.meta.url), 'utf8')
const pinned = /'arm64-v8a'\s*:\s*\['cloudflared-linux-arm64',\s*'([a-f0-9]{64})'\]/.exec(gradle)?.[1]
const native = entries.filter(path => path.startsWith('lib/'))
check('nenhuma biblioteca nativa além do cloudflared', native.every(path => /^lib\/[^/]+\/libcloudflared\.so$/.test(path)), native.join(', '))
if (release) {
  const binary = entry('lib/arm64-v8a/libcloudflared.so')
  const digest = createHash('sha256').update(binary).digest('hex')
  check('cloudflared do APK é o binário oficial fixado', digest === pinned, `${digest} ≠ ${pinned}`)
  for (const abi of ['armeabi-v7a', 'x86', 'x86_64']) {
    const size = entry(`lib/${abi}/libcloudflared.so`).length
    check(`${abi} leva só o marcador, nunca um binário`, size < 1024, `${size} bytes`)
  }
}

if (failures.length) {
  console.error(`\n${failures.length} conferência(s) de segurança falharam.`)
  process.exit(1)
}
console.log(`\nAPK conferido (${mode}).`)
