import { describe, expect, it } from "vitest"
import { MAX_ERRORS, MAX_ISSUE_URL, buildReport, issueUrl, pushError, reportTitle, sanitizeReportText } from "./error-report"

const context = { version: "1.9.0", system: "Linux (.deb)", screen: "1920×1080", route: "/vtt/mesa", errors: [] }

describe("Enviar relatório", () => {
  it("troca a pasta do cofre e as pastas pessoais por rótulos", () => {
    expect(sanitizeReportText("falhou em /home/joao/Cofre/Notas/a.md", "/home/joao/Cofre")).toBe("falhou em <cofre>/Notas/a.md")
    expect(sanitizeReportText("C:\\Users\\Maria\\Documentos e /Users/ana/x")).toBe("~\\Documentos e ~/x")
    expect(sanitizeReportText("/storage/emulated/0/Cofre")).toBe("<armazenamento>/Cofre")
    expect(sanitizeReportText("http://192.168.0.2:30000/?k=0123456789abcdef0123")).toBe("http://192.168.0.2:30000/?k=…")
  })

  it("monta o relatório com a descrição, o ambiente e os erros, sem caminhos pessoais", () => {
    const report = buildReport({ ...context, errors: [{ at: 0, message: "TypeError: x is undefined", stack: "at a (/home/joao/app.js:1)" }] }, "A régua sumiu", "/home/joao/Cofre")
    expect(report).toContain("A régua sumiu")
    expect(report).toContain("Runas-Codex 1.9.0")
    expect(report).toContain("TypeError: x is undefined")
    expect(report).not.toContain("/home/joao")
    expect(buildReport(context, "")).toContain("Nenhum erro registrado")
  })

  it("cria o título pela descrição ou pelo último erro", () => {
    expect(reportTitle("A régua sumiu\nmais detalhes", [])).toBe("A régua sumiu")
    expect(reportTitle("", [{ at: 1, message: "Falha ao gravar" }])).toBe("Falha ao gravar")
    expect(reportTitle("x".repeat(100), [])).toHaveLength(80)
    expect(reportTitle("", [{ at: 1, message: "Erro em /home/joao/Cofre/a.md" }], "/home/joao/Cofre")).toBe("Erro em <cofre>/a.md")
  })

  it("monta o link de novo problema do GitHub e corta o que passar do limite", () => {
    const short = issueUrl("Título", "Corpo")
    expect(short.url).toBe("https://github.com/Player07x/Runas-Codex/issues/new?title=T%C3%ADtulo&body=Corpo")
    expect(short.truncated).toBe(false)
    const long = issueUrl("Título", "ã".repeat(20000))
    expect(long.truncated).toBe(true)
    expect(long.url.length).toBeLessThanOrEqual(MAX_ISSUE_URL + 200)
  })

  it("guarda só os últimos erros e não repete o mesmo em seguida", () => {
    let list = pushError([], { at: 0, message: "a" })
    list = pushError(list, { at: 500, message: "a" })
    expect(list).toHaveLength(1)
    for (let index = 0; index < 30; index++) list = pushError(list, { at: 10_000 + index * 3000, message: `e${index}` })
    expect(list).toHaveLength(MAX_ERRORS)
    expect(list.at(-1)?.message).toBe("e29")
  })
})
