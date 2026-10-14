import { useEffect, useState } from "react"
import { defaultSettings, normalizeSettings, type AppSettings } from "./shared/settings"

const KEY = "runas-codex:mesa-config"
let cached: AppSettings | null = null
const listeners = new Set<(settings: AppSettings) => void>()

function load(): AppSettings {
  if (cached) return cached
  try {
    cached = normalizeSettings(JSON.parse(localStorage.getItem(KEY) ?? "{}"))
  } catch {
    cached = defaultSettings()
  }
  return cached
}

/** Configurações da mesa neste aparelho (atalhos, câmera, volumes), guardadas no próprio app. */
export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(load)
  useEffect(() => {
    listeners.add(setSettings)
    return () => {
      listeners.delete(setSettings)
    }
  }, [])
  return settings
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const saved = normalizeSettings(settings)
  cached = saved
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  for (const listener of listeners) listener(saved)
  return saved
}
