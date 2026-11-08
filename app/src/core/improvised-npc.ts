import * as T from "./generator-tables"
import { cultureName, type NameCulture } from "./name-cultures"

/**
 * NPC improvisado da Tela do Mestre (ideia da revisão das Campanhas): nome pela cultura escolhida, profissão,
 * aparência, jeito, desejo e segredo, das mesmas tabelas dos geradores da Wiki. Se o NPC ficar, vira um artigo.
 */
export interface ImprovisedNpc {
  name: string
  gender: "f" | "m"
  job: string
  look: string
  trait: string
  desire: string
  secret: string
}

export function improvisedNpc(random: () => number = Math.random, culture?: NameCulture): ImprovisedNpc {
  const pick = <V,>(values: readonly V[]) => values[Math.max(0, Math.min(values.length - 1, Math.floor(random() * values.length)))]!
  const gender = pick(["f", "m"] as const)
  const name = culture ? cultureName(culture, gender, random) : `${pick(gender === "f" ? T.FEMALE_NAMES : T.MALE_NAMES)} ${pick(T.SURNAMES)}`
  return { name, gender, job: pick(T.PROFESSIONS)[gender === "f" ? 1 : 0], look: pick(T.LOOKS), trait: pick(T.TRAITS), desire: pick(T.DESIRES), secret: pick(T.SECRETS) }
}

/**
 * As partes do NPC sorteado que vão para um artigo: a ocupação na ficha e a descrição logo depois do título. O segredo
 * vai num callout `[!segredo]`, que a sala não mostra aos jogadores. `origin` é a linha final em itálico, quando há.
 */
export function improvisedNpcFicha(npc: ImprovisedNpc, origin?: string): { values: { ocupacao: string }; body: string } {
  const body = [
    `**Aparência:** ${npc.look}.`,
    `**Jeito:** ${npc.trait}.`,
    `**Quer:** ${npc.desire}.`,
    "",
    "> [!segredo]",
    `> Esconde ${npc.secret}.`,
    ...(origin ? ["", `_${origin}_`] : []),
  ].join("\n")
  return { values: { ocupacao: npc.job }, body }
}

/** O artigo do NPC da Tela do Mestre: o modelo de personagem da wiki (`base`, de `newArticleNote`) com as partes acima. */
export function improvisedNpcNote(base: string, npc: ImprovisedNpc): string {
  const { values, body } = improvisedNpcFicha(npc, "Improvisado na Tela do Mestre.")
  const withJob = base.replace(/^ocupacao:[ \t]*$/m, `ocupacao: ${JSON.stringify(values.ocupacao)}`)
  return withJob.replace(/^(# .*)$/m, `$1\n\n${body}`)
}
