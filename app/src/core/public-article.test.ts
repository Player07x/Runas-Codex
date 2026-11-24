import { describe, expect, it } from "vitest"
import { publicArticle, publicArticleText } from "./public-article"
import { VaultIndex } from "./vault-index"

const make = (files: Record<string, string>) => new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)

describe("artigo apresentado pela sala (anexo 6, 24/11)", () => {
  const files = {
    "Wikis/Mundo/Personagens/Martim.md": "---\ntipo: personagem\n---\n# Martim\n\n![[Anexos/Martim.png|esquerda|210]]\n\nUm **jovem** fugitivo. Amigo de [[Nathan]].\n\n![[Mapa.pdf]]\n",
    "Wikis/Mundo/Personagens/Nathan.md": "# Nathan",
    "Anexos/Martim.png": "",
    "Mapa.pdf": "",
  }

  it("mantém o Markdown e as imagens embutidas como o leitor desenha, e lista o arquivo de cada uma", () => {
    const index = make(files)
    const result = publicArticle(index, index.note("Wikis/Mundo/Personagens/Martim.md")!)
    expect(result.text).toContain("![[Anexos/Martim.png|esquerda|210]]")
    expect(result.text).toContain("Um **jovem** fugitivo. Amigo de Nathan.")
    expect(result.text).toContain("[Anexo: consultar o mestre]")
    expect(result.images).toEqual([{ target: "Anexos/Martim.png", path: "Anexos/Martim.png" }])
  })

  it("sem as imagens, continua trocando por “[Anexo: …]”", () => {
    const index = make(files)
    expect(publicArticleText(index, index.note("Wikis/Mundo/Personagens/Martim.md")!)).toContain("[Anexo: esquerda|210]")
  })

  it("a imagem da ficha que não aparece no texto entra no alto, à direita", () => {
    const index = make({ "Wikis/Mundo/Locais/Albio.md": "---\ntipo: local\nimagem: \"[[Albio.png]]\"\n---\n# Albio\n\nPlano dos espíritos.", "Anexos/Albio.png": "" })
    const result = publicArticle(index, index.note("Wikis/Mundo/Locais/Albio.md")!)
    expect(result.text.startsWith("![[Albio.png|direita|240]]")).toBe(true)
    expect(result.images).toEqual([{ target: "Albio.png", path: "Anexos/Albio.png" }])
  })
})
