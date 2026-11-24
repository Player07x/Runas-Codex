/**
 * Situação do personagem ou da organização para o cartão do Elenco (24/11): morto (ou extinta) deixa o cartão mais
 * escuro. Vem da ficha da wiki: `morte_mundo` preenchida, ou `status`/`situacao` como “morto”, “falecida”, “extinta”.
 */
const GONE = /^(mort[oa]s?|falecid[oa]s?|faleceu|óbito|obito|extint[oa]s?|dissolvid[oa]s?|destruíd[oa]s?|destruid[oa]s?|aniquilad[oa]s?)\b/i

/** O texto da situação (“Morto”, “Extinta”…) quando o personagem não está mais vivo, ou `null`. */
export function goneStatus(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null
  const raw = data.status ?? data.situacao ?? data["situação"]
  const status = typeof raw === "string" ? raw.trim() : ""
  if (status && GONE.test(status.normalize("NFC"))) return status.charAt(0).toLocaleUpperCase("pt-BR") + status.slice(1)
  const death = data.morte_mundo ?? data.morte
  if ((typeof death === "string" && death.trim()) || typeof death === "number") return "Morto"
  return null
}
