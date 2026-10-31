/** U3 dentro da janela real: renomear e excluir uma mesa pelo ⋯ do cartão, e a pasta dela parar na lixeira do cofre. */
export const VTT_WORLDS_SMOKE = `
  {
    const extra = await bridge.vtt.createWorld({ title: "Mesa para renomear" })
    location.hash = "/vtt"
    await wait(100)
    location.hash = "/vtt/criar"
    const menuOf = async (title) => {
      ;(await until(() => document.querySelector('[aria-label="Ações da mesa ' + title + '"]')))?.click()
      return (label) => until(() => [...document.querySelectorAll("[role=menuitem]")].find((item) => item.textContent.startsWith(label)))
    }
    ;(await (await menuOf("Mesa para renomear"))("Renomear"))?.click()
    const nameField = await until(() => document.querySelector("[aria-label='Nome da mesa']"))
    setter.call(nameField, "Mesa renomeada")
    nameField.dispatchEvent(new Event("input", { bubbles: true }))
    ;[...document.querySelectorAll(".modal button")].find((b) => b.textContent.trim() === "Renomear")?.click()
    const renamedCard = await until(() => document.querySelector('[data-mesa="Mesa renomeada"]'))
    ;(await (await menuOf("Mesa renomeada"))("Excluir"))?.click()
    ;(await until(() => [...document.querySelectorAll(".modal button")].find((b) => b.textContent.trim() === "Mandar para a lixeira")))?.click()
    await until(() => !document.querySelector('[data-mesa="Mesa renomeada"]'))
    const worlds = await bridge.vtt.listWorlds()
    const trash = await bridge.vault.listTrash()
    result.vttWorlds = {
      renamed: Boolean(renamedCard),
      gone: !worlds.some((world) => world.id === extra.id),
      trashed: trash.some((entry) => entry.path.endsWith("/mesa.json") && entry.path.includes("mesa-para-renomear")),
    }
  }
`
