import { linkMention, mentionNames, unlinkedMentions } from "./mentions"
import { VaultIndex } from "./vault-index"

const texts: Record<string, string> = {
  "Wiki/Aldren Vael.md": "---\naliases: [o Cinzento, Aldren]\n---\n# Aldren Vael\n",
  "Notas/Sessão.md": "---\nresumo: Aldren apareceu\n---\nAldren apareceu na ponte. O Cinzento sorriu.\n\nJá [[Aldren Vael]] e [o Cinzento](Wiki/Aldren%20Vael.md) estão linkados.\n\n`Aldren` em código, %%Aldren em comentário%%.\n\nAldrena não conta, nem Aldren2.\n",
  "Notas/Outra.md": "Falei com ALDREN VAEL ontem.\r\nE com aldren.\r\n",
}
const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)

describe("menções não linkadas", () => {
  it("usa o nome e os apelidos, os mais longos primeiro", () => {
    expect(mentionNames(index, "Wiki/Aldren Vael.md")).toEqual(["Aldren Vael", "o Cinzento", "Aldren"])
  })

  it("acha o nome inteiro fora de links, código, comentários e frontmatter", () => {
    const found = unlinkedMentions(index, "Wiki/Aldren Vael.md").map((m) => `${m.path}: ${m.text}`)
    expect(found).toEqual(["Notas/Outra.md: ALDREN VAEL", "Notas/Outra.md: aldren", "Notas/Sessão.md: Aldren", "Notas/Sessão.md: O Cinzento"])
  })

  it("mostra a linha da menção", () => {
    const [first] = unlinkedMentions(index, "Wiki/Aldren Vael.md").filter((m) => m.path === "Notas/Sessão.md")
    expect(first!.context).toBe("Aldren apareceu na ponte. O Cinzento sorriu.")
  })

  it("linka trocando só o trecho, sem mudar o que se lê", () => {
    const text = texts["Notas/Sessão.md"]!
    const [aldren, cinzento] = unlinkedMentions(index, "Wiki/Aldren Vael.md").filter((m) => m.path === "Notas/Sessão.md")
    const once = linkMention(text, aldren!, "Aldren Vael")!
    expect(once).toContain("[[Aldren Vael|Aldren]] apareceu na ponte.")
    expect(once.replace("[[Aldren Vael|Aldren]]", "Aldren")).toBe(text)
    expect(linkMention(text, cinzento!, "Wiki/Aldren Vael")).toContain("[[Wiki/Aldren Vael|O Cinzento]] sorriu.")
    expect(linkMention("Aldren Vael chegou.", { start: 0, end: 11, text: "Aldren Vael" }, "Aldren Vael")).toBe("[[Aldren Vael]] chegou.")
    // Nota de outro espaço: o link leva o caminho, e o texto lido continua "Valdris".
    expect(linkMention("Chegaram a Valdris.", { start: 11, end: 18, text: "Valdris" }, "Wikis/Mundo/Valdris")).toBe("Chegaram a [[Wikis/Mundo/Valdris|Valdris]].")
  })

  it("recusa se a nota mudou naquele ponto", () => {
    expect(linkMention("Outro texto", { start: 0, end: 6, text: "Aldren" }, "Aldren Vael")).toBeNull()
  })
})
