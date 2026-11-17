import { Profiler, useEffect, type ReactNode } from "react"
import { useVault } from "../platform/VaultProvider"

export const performanceProfiling = import.meta.env.VITE_RUNAS_PROFILE === "1"
import type { RenderSample } from "../core/performance-budget"
export interface PerformanceProfile { ready: boolean; notes: number; indexMs: number; renders: RenderSample[] }
declare global { interface Window { runasPerformance?: PerformanceProfile } }

function profile(): PerformanceProfile {
  return window.runasPerformance ??= { ready: false, notes: 0, indexMs: 0, renders: [] }
}

/** Só o build de medição publica números; não publica o índice nem conteúdo de notas. */
export function recordIndexDuration(start: number): void {
  if (performanceProfiling) profile().indexMs = performance.now() - start
}

export function profileScreen(children: ReactNode): ReactNode {
  if (!performanceProfiling) return children
  return <Profiler id="tela" onRender={(_id, phase, actualMs, baseMs) => {
    const data = profile()
    if (data.renders.length < 10_000) data.renders.push({ route: location.hash || "#/", phase, actualMs, baseMs })
  }}>{children}</Profiler>
}

export function PerformanceRuntime() {
  const vault = useVault()
  useEffect(() => {
    if (performanceProfiling) Object.assign(profile(), { ready: !vault.loading && Boolean(vault.index), notes: vault.index?.size ?? 0 })
  }, [vault.loading, vault.index])
  return null
}
