import type { CapacitorConfig } from "@capacitor/cli"

// A interface é o build do app web (`../app/dist`), o mesmo do navegador e do desktop
// (docs/adr/0003-instaladores-e-android.md).
const config: CapacitorConfig = {
  appId: "dev.runas.codex",
  appName: "Runas-Codex",
  webDir: "../app/dist",
  backgroundColor: "#11131a",
  android: {
    // Sem depuração remota no APK de release; o de debug continua depurável pelo Chrome.
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Tela de ponta a ponta: o app já usa `viewport-fit=cover` e `env(safe-area-inset-*)`.
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover" },
  },
}

export default config
