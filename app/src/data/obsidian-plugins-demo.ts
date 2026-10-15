/**
 * Dados de plugins de RPG do Obsidian no cofre de exemplo (etapa 10), para a tela Importar › Plugins de RPG do
 * Obsidian ter o que migrar: um calendário do Calendarium, um mapa do Leaflet, um statblock, um encontro do
 * Initiative Tracker e uma nota com data do Calendarium. Os mesmos arquivos estão no cofre de teste do desktop
 * (`desktop/tests/cofre-exemplo`; um teste confere), onde o `--smoke --write` faz a migração pela tela.
 */
export const OBSIDIAN_PLUGIN_DEMO: Record<string, string> = {
  ".obsidian/plugins/calendarium/data.json": `${JSON.stringify(
    {
      calendars: [
        {
          id: "ID_tharn",
          name: "Calendário de Tharn",
          description: "O calendário do Império de Tharn, vizinho do condado.",
          static: {
            firstWeekDay: 2,
            overflow: true,
            weekdays: ["Pedra", "Raiz", "Chama", "Vento", "Maré"].map((name, i) => ({ type: "day", name, id: `ID_w${i}` })),
            months: [
              { name: "Geada", type: "month", length: 30, interval: 1, offset: 0, id: "ID_m1" },
              { name: "Semeadura", type: "month", length: 30, interval: 1, offset: 0, id: "ID_m2" },
              { name: "Festival das Cinzas", type: "intercalary", length: 5, interval: 1, offset: 0, id: "ID_m3" },
              { name: "Colheita", type: "month", length: 30, interval: 1, offset: 0, id: "ID_m4" },
              { name: "Noite Longa", type: "month", length: 28, interval: 1, offset: 0, id: "ID_m5" },
            ],
            moons: [{ name: "Selene", cycle: 28, offset: 3, faceColor: "#bec6ff", shadowColor: "#000000", id: "ID_l1" }],
            leapDays: [{ name: "Dia da Vigília", type: "leapday", interval: [{ ignore: false, exclusive: false, interval: 4 }], offset: 0, timespan: 4, intercalary: false, id: "ID_b1" }],
            eras: [{ name: "Era dos Caçadores", format: "{{year}} E.C.", id: "ID_e1", endsYear: false, isEvent: false, type: "era", category: null, isStartingEra: false, date: { year: 4027, month: 0, day: 1 } }],
            offset: 0,
          },
          seasonal: { seasons: [], offset: 0, type: "Dated" },
          current: { year: 4031, month: 3, day: 15 },
          events: [{ name: "Festa das Cinzas", description: "Fogueiras nas praças.", id: "E1", note: null, date: { day: 1, month: 2, year: null }, type: "Date", category: null }],
          categories: [],
        },
      ],
      defaultCalendar: "ID_tharn",
      dateFormat: "YYYY-MM-DD",
      paths: [],
      version: { major: 2, minor: 1, patch: 0 },
    },
    null,
    2,
  )}\n`,
  "Notas/Do Obsidian/Mapa do condado.md": `# Mapa do condado

O mapa do condado como o plugin Leaflet guardava.

\`\`\`leaflet
id: mapa-do-condado
image: [[mapa-condado-de-valdris.svg]]
bounds: [[0, 0], [100, 100]]
marker: castle, 70, 40, [[Valdris]], Capital do condado
marker: default, 25, 80, [[Caderno]], Acampamento
\`\`\`
`,
  "Notas/Do Obsidian/Lobo de Cinzas.md": `# Lobo de Cinzas

\`\`\`statblock
name: Lobo de Cinzas
size: Médio
type: fera
alignment: hostil
ac: 13
hp: 22
hit_dice: 4d8 + 4
speed: 12 m
stats: [14, 15, 12, 3, 12, 6]
senses: faro aguçado
cr: 1
traits:
  - name: Matilha
    desc: Vantagem se um aliado estiver adjacente ao alvo.
actions:
  - name: Mordida em brasa
    desc: 1d8 de dano + 1d4 de fogo.
\`\`\`
`,
  "Notas/Do Obsidian/Emboscada na estrada.md": `# Emboscada na estrada

\`\`\`encounter
name: Emboscada na estrada
players: true
creatures:
  - 3: Lobo de Cinzas
  - Batedor, 11, 13, 2
\`\`\`
`,
  "Notas/Do Obsidian/Coroação de Ormund.md": `---
fc-calendar: Calendário de Tharn
fc-date: 4031-02-12
---
# Coroação de Ormund

O conde de Tharn é coroado no meio da Semeadura.
`,
}
