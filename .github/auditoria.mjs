// Confere o relatório do `npm audit --json`: recusa alerta alto ou crítico, a não ser que esteja em
// auditoria-excecoes.json com motivo e prazo de revisão. Vencido o prazo, o alerta volta a recusar o CI.
import { readFileSync } from "node:fs"

const report = JSON.parse(readFileSync(process.argv[2], "utf8"))
if (!report.vulnerabilities) {
  console.error("O relatório do npm audit veio sem a lista de alertas:", JSON.stringify(report.error ?? report).slice(0, 500))
  process.exit(1)
}
const exceptions = JSON.parse(readFileSync(new URL("./auditoria-excecoes.json", import.meta.url), "utf8"))
const today = new Date().toISOString().slice(0, 10)
const accepted = new Set(exceptions.filter((item) => item.revisarAte >= today).map((item) => item.aviso))
// U113: 14 dias antes de vencer, o CI avisa (anotação amarela no GitHub) para dar tempo de a correção completar as duas
// semanas que a regra 8 do AGENTS.md pede antes de entrar.
const soon = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
for (const item of exceptions) {
  console.log(item.revisarAte >= today ? `Exceção até ${item.revisarAte}: ${item.aviso} (${item.pacote})` : `Exceção vencida em ${item.revisarAte}: ${item.aviso}; revise.`)
  if (item.revisarAte >= today && item.revisarAte <= soon) console.log(`::warning title=Exceção da auditoria vence em ${item.revisarAte}::${item.aviso} (${item.pacote}): confira se já há versão corrigida e atualize, ou renove a exceção com o motivo.`)
}

const blocking = new Map()
for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
  for (const via of vulnerability.via) {
    // Texto é o nome de outro pacote vulnerável; o aviso de verdade aparece no próprio pacote.
    if (typeof via === "string" || !["high", "critical"].includes(via.severity)) continue
    const id = via.url?.split("/").pop() ?? String(via.source)
    if (!accepted.has(id)) blocking.set(id, `${via.severity}: ${name} — ${via.title} (${via.url})`)
    // Com exceção, mas o npm já aponta correção: avisa para atualizar (a exceção não deve durar mais que o necessário).
    else if (vulnerability.fixAvailable) console.log(`::warning title=Correção disponível para ${id}::${name}: o npm audit aponta correção; atualize respeitando as duas semanas e tire a exceção.`)
  }
}
if (blocking.size > 0) {
  console.error("Alertas altos ou críticos sem exceção:\n" + [...blocking.values()].join("\n"))
  process.exit(1)
}
console.log("Nenhum alerta alto ou crítico sem exceção.")
