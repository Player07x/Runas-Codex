/** Exercita seleção, prévia e confirmação no cofre temporário do smoke. */
export const BOOK_IMPORT_SMOKE = String.raw`
  location.hash = "/livros"
  ;(await until(() => [...document.querySelectorAll("button")].find((button) => button.textContent === "Importar livro")))?.click()
  const importInput = await until(() => document.querySelector("[aria-label='Arquivo do livro']"))
  if (importInput) {
    const transfer = new DataTransfer()
    transfer.items.add(new File(["# A Chegada\n\n{{note\nConfira a torre.\n}}\n\n\\column\n\nOutro lado.\n\n\\page\n\n# O Retorno\n\nFim.\n"], "Importação do smoke.md", { type: "text/markdown" }))
    importInput.files = transfer.files
    importInput.dispatchEvent(new Event("change", { bubbles: true }))
    await wait(100)
    ;[...document.querySelectorAll("button")].find((button) => button.textContent === "Ver prévia da importação")?.click()
    result.bookImportPreview = Boolean(await until(() => document.querySelector("[data-book-import-preview]")?.textContent.includes("2 capítulos")))
    ;[...document.querySelectorAll("button")].find((button) => button.textContent === "Confirmar importação")?.click()
    await until(() => document.querySelector(".books-editor"))
    const importedPaths = ["Livros/Importação do smoke/Importação do smoke.md", "Livros/Importação do smoke/01 — A Chegada.md", "Livros/Importação do smoke/02 — O Retorno.md"]
    const imported = await bridge.vault.read(importedPaths)
    const manifest = imported[importedPaths[0]] ?? ""
    result.bookImport = Boolean(manifest.includes("tipo: livro") && manifest.indexOf("01 — A Chegada") >= 0 && manifest.indexOf("01 — A Chegada") < manifest.indexOf("02 — O Retorno") && imported[importedPaths[1]]?.includes("[!nota]") && imported[importedPaths[2]]?.includes("Fim."))
  }
`
