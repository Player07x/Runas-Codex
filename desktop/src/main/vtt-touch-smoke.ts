/** Toques passam pelo mesmo reconhecedor do canvas, sem chamar métodos internos do Pixi. */
export const VTT_TOUCH_SMOKE = String.raw`
    document.querySelector(".palette-backdrop")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    const touchScene = (await bridge.vtt.documents.list("scene"))[0]
    const touchCanvas = document.querySelector(".scene-host canvas")
    if (touchScene && touchCanvas) {
      const touch = async (type, id, point) => {
        touchCanvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "touch", pointerId: id, button: 0, buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1, clientX: point.x, clientY: point.y }))
        await wait(25)
      }
      const tapButton = async (label) => { document.querySelector('[aria-label="' + label + '"]')?.click(); await wait(100) }
      const at = (x, y) => {
        const r = touchCanvas.getBoundingClientRect(), data = touchScene.data
        const z = Math.min(r.width / data.width, r.height / data.height) * .92
        return { x: r.left + (r.width - data.width * z) / 2 + x * z, y: r.top + (r.height - data.height * z) / 2 + y * z }
      }
      await bridge.vtt.documents.put({ id: "token-toque-smoke", type: "token", parentId: touchScene.id, data: { name: "Token do toque", x: 1250, y: 950, size: 1, disposition: "friendly" } })
      await wait(300)
      await tapButton("Enquadrar cena"); await tapButton("Selecionar e mover")
      await touch("pointerdown", 11, at(1250, 950)); await touch("pointermove", 11, at(1350, 1000)); await touch("pointermove", 11, at(1450, 1050)); await touch("pointerup", 11, at(1450, 1050))
      await wait(200)
      const moved = (await bridge.vtt.documents.list("token", touchScene.id)).find(t => t.id === "token-toque-smoke")
      result.touch = { moved: moved?.data.x === 1450 && moved?.data.y === 1050 }
      await tapButton("Novo token")
      const countBefore = (await bridge.vtt.documents.list("token", touchScene.id)).length
      await touch("pointerdown", 21, at(700, 700)); await touch("pointerdown", 22, at(1800, 700))
      await touch("pointermove", 21, at(600, 800)); await touch("pointermove", 22, at(2000, 800))
      await touch("pointerup", 21, at(600, 800)); await touch("pointerup", 22, at(2000, 800))
      await wait(200)
      result.touch.pinchSafe = (await bridge.vtt.documents.list("token", touchScene.id)).length === countBefore
      await tapButton("Enquadrar cena"); await tapButton("Desenhar"); await tapButton("Mão livre")
      await touch("pointerdown", 31, at(700, 1300))
      for (let i = 1; i <= 5; i++) await touch("pointermove", 31, at(700 + i * 100, 1300 + i * 35))
      await touch("pointerup", 31, at(1200, 1475)); await wait(200)
      result.touch.drawing = (await bridge.vtt.documents.list("drawing", touchScene.id)).some(d => d.data.shape === "freehand" && d.data.points.length >= 6)
      await tapButton("Desfazer"); await wait(200)
      result.touch.undo = (await bridge.vtt.documents.list("drawing", touchScene.id)).length === 0
      await tapButton("Refazer"); await wait(200)
      result.touch.redo = (await bridge.vtt.documents.list("drawing", touchScene.id)).length === 1
      await touch("pointerdown", 41, at(1450, 1050)); await wait(650)
      result.touch.menu = Boolean(document.querySelector('[role="menu"][aria-label="Ações do objeto"]'))
      await touch("pointerup", 41, at(1450, 1050))
      ;[...document.querySelectorAll('[role="menuitem"]')].find(b => b.textContent === "Fechar menu")?.click()
    }
`
