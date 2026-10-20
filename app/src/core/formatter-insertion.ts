/** Conserva a seleção ao aplicar os formatadores mais comuns da faixa de escrita. */
export function formatterInsertion(template: string, selection: string): string {
  if (!selection) return template
  if (template.includes("texto")) return template.replace("texto", selection)
  if (/^#{1,6} Título$/.test(template)) return template.replace("Título", selection)
  if (/^::: runas-colunas-[1-4]/.test(template.trim())) return template.replace("Escreva aqui. O conteúdo flui automaticamente pelas colunas.", selection)
  return template
}
