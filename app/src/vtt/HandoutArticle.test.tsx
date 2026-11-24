import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { HandoutArticle } from "./HandoutArticle"

describe("artigo apresentado na página do jogador (anexo 6, 24/11)", () => {
  it("desenha o Markdown e a imagem pela sala, sem repetir o título", () => {
    const url = (path: string) => `http://192.168.1.9:30000/assets/${path}?k=chave`
    const asset = `tiles/${"a".repeat(64)}.png`
    const html = renderToStaticMarkup(<HandoutArticle title="Martim Avarik" text={"# Martim Avarik\n\n![[Anexos/Martim.png|esquerda|210]]\n\nUm **jovem** fugitivo.\n\n## Páginas relacionadas\n- Nathan Ragnar"} images={{ "Anexos/Martim.png": asset }} assetUrl={url} />)
    expect(html).toContain("<strong>jovem</strong>")
    expect(html).toContain("<h2")
    expect(html).toContain("<li>Nathan Ragnar</li>")
    expect(html).toContain(`src="http://192.168.1.9:30000/assets/${asset}?k=chave"`)
    expect(html).toContain('width="210"')
    expect(html).not.toContain(">Martim Avarik</h1>")
  })

  it("imagem que não veio da sala aparece só pelo nome", () => {
    const html = renderToStaticMarkup(<HandoutArticle title="X" text={"![[Fora.png]]"} assetUrl={() => ""} />)
    expect(html).toContain("Fora.png")
    expect(html).not.toContain("<img")
  })
})
