import { expect, it } from "vitest"
import { formatterInsertion } from "./formatter-insertion"
it("aplica estilo ao texto selecionado sem apagar sua escrita",()=>{
 expect(formatterInsertion("**texto**","Valdris")).toBe("**Valdris**")
 expect(formatterInsertion("<u>texto</u>","Mundo")).toBe("<u>Mundo</u>")
 expect(formatterInsertion("## Título","Encontro")).toBe("## Encontro")
 expect(formatterInsertion("**texto**","")).toBe("**texto**")
})
it("envolve a seleção nas colunas automáticas",()=>{
 expect(formatterInsertion("\n::: runas-colunas-2\n\nEscreva aqui. O conteúdo flui automaticamente pelas colunas.\n\n:::\n","Um\n\nDois")).toContain("\n\nUm\n\nDois\n\n:::")
})
