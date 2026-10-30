/**
 * Modelos de estrutura para o assistente “Nova aventura” (Campanhas › Ferramentas). Uma aventura vira um arco (missão-mãe)
 * e uma missão por cena, já ligadas por `parte_de` e `requer`, para aparecerem no mapa de missões. Só dados e cálculo.
 */

export interface AdventureScene { title: string; hint: string }

export interface AdventureTemplate {
  id: string
  label: string
  description: string
  /** Como as cenas se ligam: em fila, todas abertas, ou várias pistas levando ao final. */
  flow: "fila" | "livre" | "pistas"
  scenes: AdventureScene[]
}

export const ADVENTURE_TEMPLATES: AdventureTemplate[] = [
  {
    id: "cinco-salas", label: "Masmorra em cinco salas", flow: "fila",
    description: "Cinco cenas em sequência: a entrada, um desafio, um revés, o clímax e a recompensa.",
    scenes: [
      { title: "A entrada e o guardião", hint: "Algo impede a passagem: um guarda, uma armadilha, um enigma." },
      { title: "O desafio que não se resolve na espada", hint: "Um quebra-cabeça, uma negociação ou um teste de habilidade." },
      { title: "O revés", hint: "Uma armadilha, uma traição ou uma notícia que muda o plano." },
      { title: "O grande confronto", hint: "O vilão ou o perigo maior, num lugar que favorece alguém." },
      { title: "A recompensa e a reviravolta", hint: "O que se ganha e o que se descobre depois." },
    ],
  },
  {
    id: "tres-atos", label: "Três atos", flow: "fila",
    description: "Começo, meio e fim: o chamado, as complicações e o confronto final.",
    scenes: [
      { title: "O chamado", hint: "O que tira o grupo da rotina e por que agora." },
      { title: "A primeira complicação", hint: "O plano encontra resistência." },
      { title: "O ponto sem volta", hint: "Algo se perde ou se revela; recuar não é mais opção." },
      { title: "O confronto final", hint: "Tudo se decide aqui." },
    ],
  },
  {
    id: "investigacao", label: "Investigação (três pistas)", flow: "pistas",
    description: "Várias pistas abertas ao mesmo tempo; cada uma leva à conclusão (regra das três pistas).",
    scenes: [
      { title: "A cena do crime", hint: "O que se vê, o que falta, quem chegou primeiro." },
      { title: "A testemunha relutante", hint: "Sabe algo, mas tem medo ou interesse em calar." },
      { title: "O rastro do dinheiro", hint: "Quem ganha com isso? Um registro, uma dívida, um recibo." },
      { title: "O esconderijo", hint: "Onde as três pistas se encontram." },
      { title: "O confronto com o culpado", hint: "Prender, negociar ou deixar ir." },
    ],
  },
  {
    id: "roubo", label: "Roubo", flow: "fila",
    description: "Planejar, preparar, executar e lidar com a complicação que sempre aparece.",
    scenes: [
      { title: "O alvo e o contratante", hint: "O que roubar, de quem e por quê." },
      { title: "Reconhecimento e preparação", hint: "Plantas, horários, cúmplices e equipamento." },
      { title: "A execução", hint: "O plano em ação; cada personagem no seu papel." },
      { title: "A complicação", hint: "Algo que ninguém previu: um guarda novo, um traidor, outro ladrão." },
      { title: "A fuga", hint: "Sair com o prêmio e sem ser seguido." },
    ],
  },
  {
    id: "exploracao", label: "Exploração (lugares abertos)", flow: "livre",
    description: "Lugares que o grupo visita na ordem que quiser, com um destino final.",
    scenes: [
      { title: "A trilha", hint: "Perigos e encontros pelo caminho." },
      { title: "O povoado isolado", hint: "Gente com problemas próprios e informações." },
      { title: "As ruínas", hint: "O passado deixou algo para trás." },
      { title: "O destino", hint: "O lugar que todos procuram." },
    ],
  },
]

export interface AdventureInput {
  title: string
  hook: string
  goal: string
  scenes: AdventureScene[]
  flow: AdventureTemplate["flow"]
  /** Ordem do arco (a próxima livre da campanha, como `4`); as cenas ficam `4.1`, `4.2`… */
  order: string
}

export interface PlannedQuest {
  title: string
  order: string
  /** Título da missão-mãe (o arco), para `parte_de`. */
  parent?: string
  /** Títulos das cenas que precisam vir antes, para `requer`. */
  requires: string[]
  body: string
}

/** As notas que a aventura vai criar: o arco primeiro e depois uma missão por cena, com as ligações do fluxo. */
export function planAdventure(input: AdventureInput): PlannedQuest[] {
  const scenes = input.scenes.filter((s) => s.title.trim())
  const arcBody = [`## Gancho`, input.hook.trim() || "…", "", `## Objetivo`, input.goal.trim() || "…", "", `## Cenas`, ...scenes.map((s, i) => `${i + 1}. [[${s.title.trim()}]]`), ""].join("\n")
  const out: PlannedQuest[] = [{ title: input.title.trim(), order: input.order, requires: [], body: arcBody }]
  scenes.forEach((scene, i) => {
    const last = i === scenes.length - 1
    const requires = input.flow === "fila" ? (i > 0 ? [scenes[i - 1]!.title.trim()] : [])
      // Investigação: as pistas ficam abertas; a penúltima (o esconderijo) depende delas e o final, dela.
      : input.flow === "pistas" ? (last && i > 0 ? [scenes[i - 1]!.title.trim()] : i === scenes.length - 2 && i > 0 ? scenes.slice(0, i).map((s) => s.title.trim()) : [])
        : last && i > 0 ? scenes.slice(0, i).map((s) => s.title.trim()) : []
    out.push({ title: scene.title.trim(), order: `${input.order}.${i + 1}`, parent: input.title.trim(), requires, body: `## O que acontece\n${scene.hint.trim() || "…"}\n\n## Objetivos\n\n- [ ] \n` })
  })
  return out
}

/** Próximo número inteiro livre para a ordem do arco (`1`, `2`, `10`…), olhando as ordens que já existem. */
export function nextArcOrder(orders: string[]): string {
  const tops = orders.map((o) => Number(o.split(".")[0])).filter((n) => Number.isFinite(n))
  return String(Math.max(0, ...tops) + 1)
}
