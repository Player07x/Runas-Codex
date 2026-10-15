import mammoth from "mammoth/mammoth.browser"
import { unzipSync } from "fflate"
import { imageExtension } from "../attachments"
import { htmlToMarkdown } from "./html"
import { splitChapters, type ImportedBook, type ImportedImage, type ImportOptions } from "./types"

/** A versão browser também nos testes impede qualquer leitura de arquivos externos pelo conversor. */
export async function importDocx(bytes: Uint8Array, options: ImportOptions): Promise<ImportedBook> {
  let expanded = 0, files = 0
  unzipSync(bytes, { filter: (file) => {
    expanded += file.originalSize; files++
    if (expanded > 100 * 1024 * 1024 || files > 2000) throw new Error("DOCX grande demais ao descompactar (máximo 100 MB ou 2.000 arquivos).")
    return false
  } })
  const warnings = new Set<string>()
  const images: ImportedImage[] = []
  const result = await mammoth.convertToHtml({ arrayBuffer: Uint8Array.from(bytes).buffer }, {
    externalFileAccess: false,
    includeEmbeddedStyleMap: false,
    styleMap: ["u => u"],
    convertImage: mammoth.images.imgElement(async (image) => {
      const extension = imageExtension(image.contentType)
      // SVG pode conter recursos externos. Só imagens raster entram no cofre.
      if (!extension || extension === ".svg") {
        warnings.add(`Imagem ${image.contentType} não importada; converta-a para PNG ou JPEG.`)
        return { src: "" }
      }
      const id = `import-image:${images.length + 1}`
      images.push({ id, name: `Imagem ${images.length + 1}${extension}`, bytes: new Uint8Array(await image.readAsArrayBuffer()) })
      return { src: id }
    }),
  })
  for (const message of result.messages) warnings.add(`Conversão DOCX: ${message.message}`)
  const markdown = htmlToMarkdown(result.value, warnings)
  const chapters = splitChapters(markdown, options)
  if (!chapters.length) throw new Error("O DOCX não contém texto para importar.")
  return { title: options.title, chapters, images, warnings: [...warnings] }
}
