#!/usr/bin/env bash
# Reencaminha o DevTools depois de reiniciar o app (o PID e o socket do WebView mudam).
set -euo pipefail
port="${1:-9224}"
for i in $(seq 1 90); do
  # pidof retorna 1 enquanto o processo ainda não nasceu; isso faz parte da espera, não é falha do teste.
  runas_pid=$(adb shell pidof -s dev.runas.codex | tr -d '\r') || runas_pid=''
  if [ -n "$runas_pid" ]; then
    adb forward "tcp:$port" "localabstract:webview_devtools_remote_$runas_pid"
    if curl --silent --fail "http://127.0.0.1:$port/json" > /dev/null; then exit 0; fi
  fi
  sleep 1
done
echo "O WebView depurável não abriu após reiniciar o app." >&2
exit 1
