/**
 * U3 dentro da janela real: renomear e excluir uma mesa pelo ⋯ do cartão, e a pasta dela parar na lixeira do cofre.
 * U13: um item da biblioteca gravado na área das mesas não aparece como mesa.
 */
export const VTT_WORLDS_SMOKE = `
  {
    const extra = await bridge.vtt.createWorld({ title: "Mesa para renomear" })
    const coverEntry = (await bridge.vault.list()).find((entry) => /\.(png|jpe?g|webp)$/i.test(entry.path))
    if (coverEntry && bridge.vtt.setWorldCover) {
      const covered = await bridge.vtt.setWorldCover(extra.id, coverEntry.path)
      const reopened = (await bridge.vtt.listWorlds()).find((world) => world.id === extra.id)
      result.vttWorldCover = covered.cover === coverEntry.path && reopened?.cover === coverEntry.path
    } else result.vttWorldCover = false
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
    // U13: a biblioteca grava na área das mesas sem virar mesa e vai junto nos arquivos transportáveis.
    const libraryItem = ".runas/mesas/biblioteca/cenas/smoke.json"
    await bridge.vault.writeManagedTransfer(libraryItem, new TextEncoder().encode('{"formatVersion":1,"id":"smoke","kind":"token","name":"Lobo","data":{"name":"Lobo"}}'), null)
    const afterLibrary = await bridge.vtt.listWorlds()
    result.vttWorlds = {
      renamed: Boolean(renamedCard),
      gone: !worlds.some((world) => world.id === extra.id),
      trashed: trash.some((entry) => entry.path.endsWith("/mesa.json") && entry.path.includes("mesa-para-renomear")),
      library: afterLibrary.length === worlds.length && (await bridge.vault.listTransferFiles(true)).some((entry) => entry.path === libraryItem),
    }
  }
`
