/** W1: resolução real de retratos, navegação e índice público no Electron empacotado. */
export const WIKI_CATEGORY_SMOKE = `
  location.hash = "/wiki"
  const categoryLink = await until(() => [...document.querySelectorAll(".wiki-category-heading")].find(el => el.textContent.includes("Personagens")))
  const categoryPreview = categoryLink?.closest(".category-card")
  result.wikiCategory = { previewFive: categoryPreview?.querySelectorAll(".wiki-category-preview a").length === 5 }
  categoryLink?.click()
  await until(() => document.querySelector(".wiki-category-page"))
  const cards = () => [...document.querySelectorAll(".wiki-category-article")]
  const allCount = cards().length
  const imageOf = name => cards().find(el => el.textContent.includes(name))?.querySelector("img")
  const propertyArt = imageOf("Lia Cartógrafa"), bodyArt = imageOf("Mara Guardiã")
  for (const img of [propertyArt, bodyArt]) if (img) { img.loading = "eager"; img.scrollIntoView() }
  await until(() => propertyArt?.complete && bodyArt?.complete)
  result.wikiCategory.propertyImage = Boolean(propertyArt?.naturalWidth > 0 && propertyArt.src.startsWith("vault-file:"))
  result.wikiCategory.bodyImage = Boolean(bodyArt?.naturalWidth > 0 && bodyArt.src.startsWith("vault-file:"))
  result.wikiCategory.initial = Boolean(cards().find(el => el.textContent.includes("Zuri Curandeira"))?.querySelector(".wiki-art-initial"))
  document.querySelector(".wiki-category-controls button[aria-pressed=false]")?.click()
  await until(() => document.querySelector(".wiki-category-results.list"))
  result.wikiCategory.list = Boolean(document.querySelector(".wiki-category-results.list")) && localStorage.getItem("runas-codex:wiki-categoria-modo") === "list"
  const categorySearch = document.querySelector("[aria-label='Buscar nesta categoria']")
  setter.call(categorySearch, "A Cartógrafa")
  categorySearch.dispatchEvent(new Event("input", {bubbles:true}))
  await until(() => cards().length === 1)
  result.wikiCategory.alias = cards().length === 1 && cards()[0].textContent.includes("Lia Cartógrafa")
  setter.call(categorySearch, "")
  categorySearch.dispatchEvent(new Event("input", {bubbles:true}))
  await until(() => cards().length === allCount)
  document.querySelector(".wiki-players")?.click()
  await until(() => document.querySelector(".wiki-players[aria-pressed=true]"))
  await until(() => !cards().some(el => el.textContent.includes("Visitante Oculto")))
  result.wikiCategory.public = cards().length === allCount - 1 && !document.querySelector(".wiki-category-page .page-head button.primary") && [...document.querySelectorAll(".wiki-category-page .page-head button")].some(button => button.textContent.includes("Exportar categoria")) && !document.querySelector(".wiki-category-page").textContent.includes("Incógnito")
  document.querySelector(".wiki-players")?.click()
  await until(() => document.querySelector(".wiki-players[aria-pressed=false]"))
  await until(() => cards().length === allCount)
  document.querySelector(".wiki-category-controls button[aria-pressed=false]")?.click()
`
