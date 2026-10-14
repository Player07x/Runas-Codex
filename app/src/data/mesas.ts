import type { Mesa } from "./types"

/** Mesas do VTT (dados pesados ficam em `.runas/mesas/<id>/`). */
export const MESAS: Mesa[] = [
  {
    id: "cinzas",
    title: "As Cinzas de Valdris",
    campaignId: "cinzas-de-valdris",
    lastSession: "2026-10-10T23:30:00",
    players: 4,
    sizeMb: 312,
    palette: ["#5a1f1d", "#1b1415"],
    scenes: [
      {
        id: "esgotos",
        name: "Esgotos de Brasa",
        folder: "Valdris",
        grid: "quadrada",
        cols: 24,
        rows: 16,
        tokens: [
          { id: "t-ilsa", name: "Ilsa Brasa", x: 5, y: 9, size: 1, color: "#c76561", kind: "jogador", hp: [18, 24], owner: "ana" },
          { id: "t-torvak", name: "Torvak", x: 6, y: 10, size: 1, color: "#82aaa6", kind: "jogador", hp: [31, 34], owner: "bruno" },
          { id: "t-mirela", name: "Mirela", x: 4, y: 11, size: 1, color: "#b99b65", kind: "jogador", hp: [20, 20], conditions: ["abençoada"], owner: "carla" },
          { id: "t-sef", name: "Sef", x: 3, y: 9, size: 1, color: "#927f9c", kind: "jogador", hp: [9, 16], conditions: ["envenenado"], owner: "diego" },
          { id: "t-aldren", name: "Aldren Vael", x: 8, y: 8, size: 1, color: "#86a47f", kind: "aliado", hp: [40, 44] },
          { id: "t-lobo1", name: "Lobo de Cinzas", x: 13, y: 6, size: 1, color: "#8b2a22", kind: "hostil", hp: [22, 22] },
          { id: "t-lobo2", name: "Lobo de Cinzas", x: 14, y: 8, size: 1, color: "#8b2a22", kind: "hostil", hp: [9, 22], conditions: ["caído"] },
          { id: "t-alfa", name: "Alfa de Brasa", x: 18, y: 6, size: 2, color: "#a3361f", kind: "hostil", hp: [48, 48], hidden: true },
        ],
      },
      { id: "corvo", name: "O Corvo Manco", folder: "Valdris", grid: "quadrada", cols: 18, rows: 12, tokens: [] },
      { id: "cidade-alta", name: "Cidade Alta", folder: "Valdris", grid: "quadrada", cols: 30, rows: 20, tokens: [] },
      { id: "lago", name: "Margem do Lago Espelhado", folder: "Norte", grid: "hex", cols: 20, rows: 14, tokens: [] },
      { id: "viagem", name: "Estrada das Cinzas (cinemático)", folder: "Norte", grid: "nenhuma", cols: 1, rows: 1, tokens: [] },
    ],
  },
  {
    id: "coroa",
    title: "Coroa Partida",
    campaignId: "coroa-partida",
    lastSession: "2026-08-22T23:00:00",
    players: 3,
    sizeMb: 128,
    palette: ["#5b4a24", "#17130d"],
    scenes: [
      { id: "salao", name: "Salão do Trono", folder: "Palácio", grid: "quadrada", cols: 20, rows: 14, tokens: [] },
      { id: "jardins", name: "Jardins", folder: "Palácio", grid: "quadrada", cols: 22, rows: 16, tokens: [] },
      { id: "masmorra", name: "Masmorra Real", folder: "Palácio", grid: "quadrada", cols: 16, rows: 16, tokens: [] },
    ],
  },
  {
    id: "cripta",
    title: "One-shot: A Cripta",
    campaignId: "cripta",
    lastSession: "2026-07-04T23:00:00",
    players: 3,
    sizeMb: 41,
    palette: ["#3d3346", "#111014"],
    scenes: [{ id: "cripta", name: "A Cripta", folder: "", grid: "quadrada", cols: 20, rows: 20, tokens: [] }],
  },
]

export const CHAT = [
  { who: "Mestre", text: "Os lobos rosnam e as brasas no pelo deles brilham mais forte.", kind: "narracao" as const },
  { who: "Ilsa Brasa", text: "Ataque furtivo no lobo da esquerda!", kind: "fala" as const },
  { who: "Ilsa Brasa", roll: "1d20+6", result: 21, detail: "[15] + 6", kind: "rolagem" as const },
  { who: "Ilsa Brasa", roll: "2d6+3", result: 11, detail: "[4, 4] + 3", kind: "rolagem" as const },
  { who: "Mestre", text: "(sussurro para Sef) Você sente o veneno subir pelo braço.", kind: "sussurro" as const },
  { who: "Sef", roll: "1d20+2", result: 7, detail: "[5] + 2", kind: "rolagem" as const },
]

export const INITIATIVE = [
  { tokenId: "t-ilsa", value: 21 },
  { tokenId: "t-lobo1", value: 17 },
  { tokenId: "t-aldren", value: 15 },
  { tokenId: "t-torvak", value: 12 },
  { tokenId: "t-lobo2", value: 11 },
  { tokenId: "t-mirela", value: 9 },
  { tokenId: "t-sef", value: 6 },
]

export const PLAYLISTS = [
  { name: "Esgotos", channel: "Ambiente", tracks: ["Gotejar e ecos", "Brasas crepitando"], playing: true },
  { name: "Combate", channel: "Música", tracks: ["Matilha", "Fogo no escuro", "Último uivo"], playing: true },
  { name: "Taverna", channel: "Música", tracks: ["Corvo Manco", "Canção do ferreiro"], playing: false },
  { name: "Efeitos", channel: "Efeitos", tracks: ["Uivo", "Porta de ferro", "Explosão"], playing: false },
]
