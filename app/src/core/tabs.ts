/**
 * Abas e painéis divididos das Notas (checklist A.3), como no Obsidian: cada painel tem as suas abas; abrir uma nota
 * troca a aba ativa do painel em foco, a menos que ela esteja fixada (aí abre outra). Os painéis ficam lado a lado ou
 * um embaixo do outro, e um painel pode empilhar as abas. O arranjo é estado de tela: fica no aparelho, não no cofre.
 */

export interface Tab {
  path: string
  pinned?: boolean
}

export interface Pane {
  tabs: Tab[]
  /** Índice da aba ativa (-1 sem abas). */
  active: number
  /** Abas empilhadas (todas lado a lado, com a lombada do título), em vez de uma por vez. */
  stacked?: boolean
}

export type SplitDirection = "lado" | "baixo"

export interface TabLayout {
  panes: Pane[]
  focus: number
  split: SplitDirection
}

export const MAX_PANES = 3

export function emptyLayout(): TabLayout {
  return { panes: [{ tabs: [], active: -1 }], focus: 0, split: "lado" }
}

const clone = (layout: TabLayout): TabLayout => ({ ...layout, panes: layout.panes.map((p) => ({ ...p, tabs: p.tabs.map((t) => ({ ...t })) })) })

/** O caminho da aba ativa do painel em foco. */
export function currentPath(layout: TabLayout): string | undefined {
  const pane = layout.panes[layout.focus]
  return pane?.tabs[pane.active]?.path
}

/** Abre no painel em foco: ativa a aba se a nota já está nele; senão troca a aba ativa (ou abre outra, se fixada). */
export function openHere(layout: TabLayout, path: string): TabLayout {
  const next = clone(layout)
  const pane = next.panes[next.focus]!
  const existing = pane.tabs.findIndex((t) => t.path === path)
  if (existing >= 0) pane.active = existing
  else if (pane.active < 0 || pane.tabs[pane.active]!.pinned) {
    pane.tabs.splice(pane.active + 1, 0, { path })
    pane.active += 1
  } else pane.tabs[pane.active] = { path }
  return next
}

/** Abre numa aba nova do painel em foco (ou ativa a que já tem a nota). */
export function openInNewTab(layout: TabLayout, path: string): TabLayout {
  const next = clone(layout)
  const pane = next.panes[next.focus]!
  const existing = pane.tabs.findIndex((t) => t.path === path)
  if (existing >= 0) pane.active = existing
  else {
    pane.tabs.splice(pane.active + 1, 0, { path })
    pane.active += 1
  }
  return next
}

/** Abre a nota num painel novo ao lado (ou embaixo) do painel em foco; no máximo `MAX_PANES` (aí usa o último). */
export function split(layout: TabLayout, path: string, direction: SplitDirection): TabLayout {
  const next = clone(layout)
  next.split = direction
  if (next.panes.length >= MAX_PANES) {
    // Sem lugar para outro painel: abre no vizinho.
    next.focus = next.focus + 1 < next.panes.length ? next.focus + 1 : Math.max(0, next.focus - 1)
    return openHere(next, path)
  }
  next.panes.splice(next.focus + 1, 0, { tabs: [{ path }], active: 0 })
  next.focus += 1
  return next
}

export function activate(layout: TabLayout, pane: number, index: number): TabLayout {
  const next = clone(layout)
  if (!next.panes[pane]?.tabs[index]) return layout
  next.focus = pane
  next.panes[pane]!.active = index
  return next
}

export function focusPane(layout: TabLayout, pane: number): TabLayout {
  return pane === layout.focus || !layout.panes[pane] ? layout : { ...clone(layout), focus: pane }
}

/** Fecha a aba; o painel que fica vazio some (se houver outro). */
export function closeTab(layout: TabLayout, pane: number, index: number): TabLayout {
  const next = clone(layout)
  const p = next.panes[pane]
  if (!p?.tabs[index]) return layout
  p.tabs.splice(index, 1)
  if (index < p.active || p.active >= p.tabs.length) p.active -= 1
  if (p.active < 0 && p.tabs.length) p.active = 0
  if (!p.tabs.length && next.panes.length > 1) return closePane(next, pane)
  return next
}

export function closeOthers(layout: TabLayout, pane: number, index: number): TabLayout {
  const next = clone(layout)
  const p = next.panes[pane]
  if (!p?.tabs[index]) return layout
  // As fixadas ficam, como no Obsidian.
  const keep = p.tabs.filter((t, i) => i === index || t.pinned)
  p.active = keep.indexOf(p.tabs[index]!)
  p.tabs = keep
  return next
}

export function closePane(layout: TabLayout, pane: number): TabLayout {
  if (layout.panes.length <= 1 || !layout.panes[pane]) return layout
  const next = clone(layout)
  next.panes.splice(pane, 1)
  if (next.focus > pane || next.focus >= next.panes.length) next.focus = Math.max(0, next.focus - 1)
  return next
}

export function togglePin(layout: TabLayout, pane: number, index: number): TabLayout {
  const next = clone(layout)
  const tab = next.panes[pane]?.tabs[index]
  if (!tab) return layout
  if (tab.pinned) delete tab.pinned
  else tab.pinned = true
  return next
}

export function toggleStacked(layout: TabLayout, pane: number): TabLayout {
  const next = clone(layout)
  const p = next.panes[pane]
  if (!p) return layout
  if (p.stacked) delete p.stacked
  else p.stacked = true
  return next
}

/** Arrasta uma aba para outra posição (no mesmo painel ou em outro); o painel de origem vazio some. */
export function moveTab(layout: TabLayout, from: { pane: number; index: number }, to: { pane: number; index: number }): TabLayout {
  const next = clone(layout)
  const source = next.panes[from.pane]
  const target = next.panes[to.pane]
  const tab = source?.tabs[from.index]
  if (!source || !target || !tab) return layout
  const activePath = source.tabs[source.active]?.path
  source.tabs.splice(from.index, 1)
  // A nota já aberta no destino não se repete.
  const duplicate = from.pane !== to.pane ? target.tabs.findIndex((t) => t.path === tab.path) : -1
  if (duplicate >= 0) target.tabs.splice(duplicate, 1)
  // `to.index` conta as abas de antes de tirar a arrastada.
  const wanted = from.pane === to.pane && from.index < to.index ? to.index - 1 : to.index
  const at = Math.max(0, Math.min(wanted, target.tabs.length))
  target.tabs.splice(at, 0, tab)
  target.active = at
  if (from.pane !== to.pane) {
    const kept = source.tabs.findIndex((t) => t.path === activePath)
    source.active = kept >= 0 ? kept : Math.min(from.index, source.tabs.length - 1)
  }
  next.focus = to.pane
  if (!source.tabs.length && next.panes.length > 1) {
    const result = closePane(next, from.pane)
    return { ...result, focus: to.pane > from.pane ? to.pane - 1 : to.pane }
  }
  return next
}

/** Depois de renomear ou mover nota ou pasta. */
export function renameInLayout(layout: TabLayout, from: string, to: string): TabLayout {
  const move = (path: string) => (path === from ? to : path.startsWith(from + "/") ? to + path.slice(from.length) : path)
  return { ...layout, panes: layout.panes.map((p) => ({ ...p, tabs: p.tabs.map((t) => ({ ...t, path: move(t.path) })) })) }
}

/** Tira as abas de arquivos que não existem mais (apagados fora do app, lixeira). */
export function pruneLayout(layout: TabLayout, exists: (path: string) => boolean): TabLayout {
  if (layout.panes.every((p) => p.tabs.every((t) => exists(t.path)))) return layout
  let next = clone(layout)
  for (let pane = next.panes.length - 1; pane >= 0; pane--) {
    for (let index = next.panes[pane]!.tabs.length - 1; index >= 0; index--) {
      if (!exists(next.panes[pane]!.tabs[index]!.path)) next = closeTab(next, pane, index)
    }
  }
  return next
}

/** Lê um arranjo gravado; o que não serve vira o arranjo vazio. */
export function parseLayout(json: string | null | undefined): TabLayout {
  try {
    const data = JSON.parse(json ?? "null") as Partial<TabLayout> | null
    if (!data || !Array.isArray(data.panes) || !data.panes.length) return emptyLayout()
    const panes: Pane[] = data.panes.slice(0, MAX_PANES).map((p) => {
      const tabs = Array.isArray(p?.tabs) ? p.tabs.filter((t): t is Tab => typeof t?.path === "string" && t.path.length > 0).map((t) => (t.pinned ? { path: t.path, pinned: true } : { path: t.path })) : []
      const active = typeof p?.active === "number" ? Math.min(Math.max(p.active, tabs.length ? 0 : -1), tabs.length - 1) : tabs.length - 1
      return { tabs, active, ...(p?.stacked ? { stacked: true } : {}) }
    })
    const focus = typeof data.focus === "number" && data.focus >= 0 && data.focus < panes.length ? data.focus : 0
    return { panes, focus, split: data.split === "baixo" ? "baixo" : "lado" }
  } catch {
    return emptyLayout()
  }
}

/** Workspaces (como o plugin do Obsidian): arranjos de abas e painéis guardados por nome ("Sessão", "Escrita"). */
export interface Workspace {
  layout: TabLayout
  /** O painel da direita (links, propriedades) estava aberto. */
  rightPanel: boolean
  savedAt: number
}

export function parseWorkspaces(json: string | null | undefined): Record<string, Workspace> {
  try {
    const data = JSON.parse(json ?? "{}") as Record<string, Partial<Workspace>>
    const out: Record<string, Workspace> = {}
    for (const [name, value] of Object.entries(data ?? {})) {
      if (!name.trim() || !value || typeof value !== "object") continue
      out[name] = { layout: parseLayout(JSON.stringify(value.layout ?? null)), rightPanel: value.rightPanel === true, savedAt: typeof value.savedAt === "number" ? value.savedAt : 0 }
    }
    return out
  } catch {
    return {}
  }
}

/** Os nomes em ordem alfabética. */
export function workspaceNames(workspaces: Record<string, Workspace>): string[] {
  return Object.keys(workspaces).sort((a, b) => a.localeCompare(b, "pt-BR"))
}
