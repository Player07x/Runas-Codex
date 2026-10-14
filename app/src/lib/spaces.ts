import type { SpaceId } from "../data/types"

export interface SpaceInfo {
  id: SpaceId
  label: string
  route: string
  folder: string
  description: string
}

/** Cada espaço é uma pasta de topo do cofre; busca, gráfico e backlinks ficam dentro dele. */
export const SPACES: Record<SpaceId, SpaceInfo> = {
  notas: { id: "notas", label: "Notas", route: "/notas", folder: "Notas/", description: "Bloco de notas livre" },
  agenda: { id: "agenda", label: "Agenda", route: "/agenda", folder: "Agenda/", description: "Compromissos e lembretes" },
  wiki: { id: "wiki", label: "Wiki", route: "/wiki", folder: "Wikis/", description: "Mundo, personagens, calendários" },
  campanhas: { id: "campanhas", label: "Campanhas", route: "/campanhas", folder: "Campanhas/", description: "Sessões, missões, NPCs" },
  livros: { id: "livros", label: "Livros", route: "/livros", folder: "Livros/", description: "Livros e suplementos" },
  mesas: { id: "mesas", label: "VTT", route: "/vtt", folder: "Mesas/", description: "Criar ou entrar numa sala" },
}

export function spaceOfPath(path: string): SpaceId | undefined {
  return (Object.values(SPACES) as SpaceInfo[]).find((space) => path.startsWith(space.folder))?.id
}
