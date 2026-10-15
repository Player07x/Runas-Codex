import { fillTemplate, formatDate, insertTemplate, obsidianConfig } from "./templates"

const date = new Date(2026, 9, 14, 9, 5, 7) // quarta-feira, 14/10/2026 09:05:07

describe("formatDate", () => {
  it("usa os códigos do Moment com nomes em português", () => {
    expect(formatDate(date, "YYYY-MM-DD")).toBe("2026-10-14")
    expect(formatDate(date, "DD/MM/YY HH:mm:ss")).toBe("14/10/26 09:05:07")
    expect(formatDate(date, "dddd, D [de] MMMM [de] YYYY")).toBe("quarta-feira, 14 de outubro de 2026")
    expect(formatDate(date, "ddd D MMM, h:mm a")).toBe("qua 14 out, 9:05 am")
    expect(formatDate(date, "[Semana] ww, Q[º trimestre]")).toBe("Semana 42, 4º trimestre")
  })
})

describe("fillTemplate", () => {
  const config = obsidianConfig({}).templates
  it("troca título, data e hora, em inglês e em português, com formato", () => {
    const out = fillTemplate("# {{title}}\n{{date}} {{time}} · {{ data:DD/MM }} · {{Hora:HH[h]mm}} · {{título}} · {{outra}}", { title: "Sessão 13", date, config })
    expect(out).toBe("# Sessão 13\n2026-10-14 09:05 · 14/10 · 09h05 · Sessão 13 · {{outra}}")
  })
})

describe("obsidianConfig", () => {
  it("lê templates.json e daily-notes.json e usa os padrões no que falta", () => {
    const config = obsidianConfig({
      ".obsidian/templates.json": JSON.stringify({ folder: "/Modelos/", dateFormat: "DD/MM/YYYY" }),
      ".obsidian/daily-notes.json": JSON.stringify({ folder: "Notas/Diário", template: "Modelos/Dia.md" }),
    })
    expect(config.templates).toEqual({ folder: "Modelos", dateFormat: "DD/MM/YYYY", timeFormat: "HH:mm" })
    expect(config.daily).toEqual({ folder: "Notas/Diário", format: "YYYY-MM-DD", template: "Modelos/Dia" })
    expect(config.app).toEqual({ attachmentFolder: "/", newLinkFormat: "shortest", useMarkdownLinks: false })
    expect(obsidianConfig({ ".obsidian/app.json": JSON.stringify({ attachmentFolderPath: "./anexos" }) }).app.attachmentFolder).toBe("./anexos")
    expect(obsidianConfig({ ".obsidian/templates.json": "{quebrado" }).templates.folder).toBe("")
  })
})

describe("insertTemplate", () => {
  it("insere no cursor, sem frontmatter", () => {
    expect(insertTemplate("ab", 1, "X")).toEqual({ text: "aXb", cursor: 2 })
  })

  it("propriedades do modelo entram no frontmatter da nota, sem trocar as que ela já tem", () => {
    const note = "---\ntags: [a]\n---\nTexto\n"
    const { text } = insertTemplate(note, note.length, "---\ntags: [b]\ntipo: npc\n---\n## Ficha\n")
    expect(text).toBe("---\ntags: [a]\ntipo: npc\n---\nTexto\n## Ficha\n")
  })

  it("nota sem frontmatter recebe o do modelo no topo; o cursor nunca cai dentro do frontmatter", () => {
    expect(insertTemplate("Texto", 5, "---\ntipo: npc\n---\n!").text).toBe("---\ntipo: npc\n---\nTexto!")
    expect(insertTemplate("---\na: 1\n---\nx", 0, "Y").text).toBe("---\na: 1\n---\nYx")
  })
})
