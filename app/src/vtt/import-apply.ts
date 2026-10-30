import type { ImportedVtt, ImportedVttDocument } from "./shared/importers"
import type { DocumentInput } from "./shared/ipc"
import type { SceneData, WallData } from "./shared/scene"

/**
 * Leva o resultado dos importadores (ADR 0028) para a mesa aberta (T4). Os importadores numeram os documentos
 * (`wall-1`, `token-1`…) e a cena (`cena-importada`); como os ids valem para a mesa inteira, a segunda importação
 * gravaria por cima da primeira. Aqui cada documento ganha um id novo e fica preso à cena nova.
 */

export interface ImportSummary {
  name: string
  width: number
  height: number
  /** Tamanho da célula em pixels (0 sem grade). */
  cell: number
  walls: number
  doors: number
  tokens: number
  lights: number
  /** O mapa veio dentro do arquivo. */
  map: boolean
  warnings: string[]
}

const isDoor = (document: ImportedVttDocument) => document.type === "wall" && (document.data as WallData).kind !== "wall"

export function summarizeImport(imported: ImportedVtt): ImportSummary {
  const { data } = imported.scene
  const count = (type: ImportedVttDocument["type"]) => imported.documents.filter((document) => document.type === type).length
  const doors = imported.documents.filter(isDoor).length
  return {
    name: data.name,
    width: data.width,
    height: data.height,
    cell: data.grid.type === "none" ? 0 : data.grid.size,
    walls: count("wall") - doors,
    doors,
    tokens: count("token"),
    lights: count("light"),
    map: imported.assets.some((asset) => asset.kind === "maps"),
    warnings: imported.warnings,
  }
}

/**
 * A cena e os documentos prontos para `store.put`: ids de `newId`, a cena com `sceneId` e o mapa trocado pelo caminho
 * que a mesa devolveu ao gravar o asset (`assetPaths`: caminho do importador → caminho gravado).
 */
export function sceneInputs(imported: ImportedVtt, sceneId: string, newId: () => string, assetPaths: ReadonlyMap<string, string> = new Map()): DocumentInput[] {
  const data: SceneData = { ...imported.scene.data }
  if (data.background) data.background = assetPaths.get(data.background) ?? (imported.assets.some((asset) => asset.path === data.background) ? null : data.background)
  return [
    { id: sceneId, type: "scene", parentId: null, data },
    ...childInputs(imported.documents, sceneId, newId),
  ]
}

/** Documentos de uma cena (paredes, tokens, luzes) com ids novos, presos a `sceneId`, depois dos `after` que já existem. */
export function childInputs(documents: ImportedVttDocument[], sceneId: string, newId: () => string, after = 0): DocumentInput[] {
  return documents.map((document, index) => ({ id: newId(), type: document.type, parentId: sceneId, sort: after + index, data: document.data }))
}

/** O `.dd2vtt` não guarda o nome da cena: sem nome no arquivo, a cena leva o nome do arquivo (`cripta.dd2vtt` → “cripta”). */
export function namedAfterFile(imported: ImportedVtt, fileName: string, fallback = "Cena importada"): ImportedVtt {
  const stem = fileName.replace(/\.[^./\\]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 80)
  if (imported.scene.data.name !== fallback || !stem) return imported
  return { ...imported, scene: { ...imported.scene, data: { ...imported.scene.data, name: stem } } }
}
