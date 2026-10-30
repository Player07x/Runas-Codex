/** Personagens: criação/seleção na wiki e alterações só no vínculo da campanha. */
export const CAMPAIGN_PLAYERS_SMOKE = `
{
  location.hash = campaignRoute + "/elenco"
  const cast = () => document.querySelector(".campaign-cast-grid")
  await until(cast)
  const originalCount = cast()?.children.length ?? 0
  const selectValue = (label, value) => {
    const input = document.querySelector("[aria-label='" + label + "']")
    if (!input) throw new Error("Campo ausente: " + label)
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(input, value)
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }
  const fillPlayer = (label, value) => {
    const input = document.querySelector("[aria-label='" + label + "']")
    if (!input) throw new Error("Campo ausente: " + label)
    setter.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const confirmPlayer = async () => {
    await wait(100)
    const button = document.querySelector(".modal-foot .primary")
    if (!button || button.disabled) throw new Error("Não foi possível confirmar o personagem")
    button.click()
    if (!await until(() => !document.querySelector(".modal"))) throw new Error("Diálogo de personagem não fechou")
  }
  const openPlayer = async () => {
    ;[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Personagem")?.click()
    if (!await until(() => document.querySelector("[aria-label='Origem do personagem']"))) throw new Error("Diálogo de personagem ausente")
  }
  await openPlayer()
  selectValue("Origem do personagem", "novo")
  await until(() => document.querySelector("[aria-label='Nome do personagem']"))
  fillPlayer("Nome do personagem", "Herói da wiki do smoke")
  fillPlayer("Conceito do personagem", "Explorador")
  fillPlayer("Nome de quem joga", "Ana do smoke")
  await confirmPlayer()
  await until(() => cast()?.children.length === originalCount + 1)
  const heroPath = (await bridge.vault.list()).find(e => e.path.startsWith("Wikis/") && e.path.endsWith("/Herói da wiki do smoke.md"))?.path
  const homePath = "Campanhas/Cinzas de Valdris/Cinzas de Valdris.md"
  const created = heroPath ? await bridge.vault.read([heroPath, homePath]) : {}
  result.campaignPlayers = {
    createdInWiki: Boolean(heroPath && created[heroPath]?.includes("tipo: personagem") && created[heroPath]?.includes("conceito: Explorador")),
    linked: Boolean(heroPath && created[homePath]?.includes(heroPath.replace(/\\.md$/, "")) && created[homePath]?.includes("Ana do smoke")),
    legacyPreserved: cast()?.children.length === originalCount + 1,
  }
  document.querySelector("[aria-label='Trocar jogador de Herói da wiki do smoke']")?.click()
  await until(() => document.querySelector("[aria-label='Nome de quem joga']"))
  fillPlayer("Nome de quem joga", "Bia do smoke")
  await confirmPlayer()
  await until(() => cast()?.textContent.includes("Bia do smoke"))
  const edited = await bridge.vault.read([homePath, heroPath])
  result.campaignPlayers.changedPlayer = edited[homePath]?.includes("Bia do smoke") && edited[heroPath] === created[heroPath]
  document.querySelector("[aria-label='Desvincular Herói da wiki do smoke da campanha']")?.click()
  // Desvincular pede confirmação no próprio cartão.
  ;(await until(() => [...(cast()?.querySelectorAll("button") ?? [])].find(b => b.textContent.trim() === "Confirmar")))?.click()
  await until(() => cast()?.children.length === originalCount)
  const unlinked = await bridge.vault.read([homePath, heroPath])
  result.campaignPlayers.unlinked = cast()?.children.length === originalCount && !unlinked[homePath]?.includes(heroPath.replace(/\\.md$/, "")) && unlinked[heroPath] === created[heroPath]
  await openPlayer()
  const heroOption = [...document.querySelectorAll("[aria-label='Personagem da wiki'] option")].find(o => o.value === heroPath)
  selectValue("Personagem da wiki", heroOption?.value ?? "")
  fillPlayer("Nome de quem joga", "Carla do smoke")
  await confirmPlayer()
  await until(() => cast()?.children.length === originalCount + 1)
  result.campaignPlayers.selectedExisting = cast()?.textContent.includes("Carla do smoke") && (await bridge.vault.list()).filter(e => e.path.endsWith("/Herói da wiki do smoke.md")).length === 1
  location.hash = campaignRoute
  await until(() => !cast())
  location.hash = campaignRoute + "/elenco"
  await until(() => cast()?.textContent.includes("Carla do smoke"))
  result.campaignPlayers.reopened = cast()?.textContent.includes("Carla do smoke") === true
}
`
