import { DEFAULT_IMAGE_FOLDER, folderForAttachment, imageLinkAt, imageRenameTarget, linkedImages, planImageMoves } from "./images"
import { planRename } from "./rename"
import { VaultIndex } from "./vault-index"
import { vaultCounts } from "./vault-counts"
const vault = (files: Record<string,string>) => new VaultIndex(Object.entries(files).map(([path,text]) => ({ path, mtime:1, size:text.length })), files)
describe("Imagens comuns e contadores reais", () => {
  it("centraliza imagens de qualquer espaço e preserva o destino dos demais anexos", () => {
    expect(folderForAttachment("Foto.PNG", "Livros/Teste/Anexos")).toBe(DEFAULT_IMAGE_FOLDER)
    expect(folderForAttachment("som.ogg", "Anexos")).toBe("Anexos")
    expect(imageRenameTarget("Notas/foto.png", "Nova foto.png", "Anexos/Imagens")).toBe("Anexos/Imagens/Nova foto.png")
  })
  it("resolve o link sob o cursor e deduplica imagens repetidas sem aceitar links externos", () => {
    const text = '![[foto.png|direita|300]]\n![legenda](../Anexos/Imagens/foto.png)\n![remota](https://exemplo.com/foto.png)'
    const index = vault({ "Notas/A.md":text, "Anexos/Imagens/foto.png":"" })
    expect(linkedImages(index,"Notas/A.md",text)).toEqual(["Anexos/Imagens/foto.png"])
    expect(imageLinkAt(index,"Notas/A.md",text,8)).toBe("Anexos/Imagens/foto.png")
    expect(imageLinkAt(index,"Notas/A.md",text,text.length - 2)).toBeNull()
  })
  it("renomeia a mesma imagem nos links de duas notas, no mapa e no quadro preservando legenda e tamanho", () => {
    const index = vault({"Anexos/Imagens/foto.png":"", "Notas/A.md":"![[foto.png|direita|300]]", "Notas/B.md":"![Retrato](../Anexos/Imagens/foto.png)", "Wikis/M/Mapa.md":'```runas-mapa\nimagem: "[[foto.png]]"\n```'})
    const canvas = '{"nodes":[{"id":"x","type":"file","file":"Anexos/Imagens/foto.png","x":0,"y":0,"width":10,"height":10}]}'
    const plan = planRename(index,"Anexos/Imagens/foto.png","Anexos/Imagens/Retrato.png",{"Quadro.canvas":canvas})
    expect(plan.edits).toHaveLength(4)
    expect(plan.edits.find(e=>e.path==="Notas/A.md")!.after).toBe("![[Retrato.png|direita|300]]")
    expect(plan.edits.find(e=>e.path==="Notas/B.md")!.after).toContain("![Retrato](../Anexos/Imagens/Retrato.png)")
    expect(plan.edits.find(e=>e.path==="Quadro.canvas")!.after).toContain('"file":"Anexos/Imagens/Retrato.png"')
    expect(plan.edits.find(e=>e.path==="Wikis/M/Mapa.md")!.after).toContain('[[Retrato.png]]')
  })
  it("mostra zero num cofre vazio, sem cofre e em espaços que ainda não têm conteúdo", () => {
    expect(vaultCounts(null)).toEqual({ notas:0, agenda:0, wiki:0, campanhas:0, livros:0, mesas:0 })
    expect(vaultCounts(vault({}))).toEqual(vaultCounts(null))
    const onlyHome = vault({"Wikis/Vazio/Vazio.md":"---\ntipo: wiki\n---\n# Mundo", "Agenda/Rascunho.md":"# Ainda não é evento"})
    expect(vaultCounts(onlyHome)).toEqual(vaultCounts(null))
  })
  it("conta livros e campanhas como entidades, sem somar capítulos e sessões como se fossem outras entidades", () => {
    const index = vault({"Notas/A.md":"# Ideia", "Wikis/M/Local.md":"---\ntipo: local\n---\n# Local", "Livros/L/L.md":"---\ntipo: livro\n---\n# Livro", "Livros/L/Capítulo.md":"---\ntipo: capitulo\n---\n# Texto", "Campanhas/C/C.md":"---\ntipo: campanha\n---\n# C", "Campanhas/C/Sessões/1.md":"---\ntipo: sessao\n---\n# Sessão"})
    expect(vaultCounts(index,2)).toEqual({notas:1,agenda:0,wiki:1,livros:1,campanhas:1,mesas:2})
  })
})

it("preserva a referência ao original de um recorte ao renomear a imagem", () => {
  const index = vault({"A.png":""}), plan = planRename(index,"A.png","B.png",{"Quadro.canvas":'{"nodes":[{"file":"Recorte.png","runas_original":"A.png"}]}'})
  expect(plan.edits[0]!.after).toContain('"runas_original":"B.png"')
})

it("planeja mover imagens homônimas sem sobrescrever outra imagem", () => {
  const index = vault({"Notas/a.png":"", "Wikis/M/a.png":"", "Anexos/Imagens/a.png":"", "Notas/a.ogg":""})
  const moves = planImageMoves(index)
  expect(moves.map(move=>move.to)).toEqual(["Anexos/Imagens/a 1.png","Anexos/Imagens/a 2.png"])
})
