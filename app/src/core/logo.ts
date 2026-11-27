/**
 * A logo do Runas-Codex, a runa em recorte: a pedra cheia, com a runa ᚱ (Raidho) e uma rachadura vazadas. Uma geometria
 * só, num quadro de 512, para a interface (`RuneLogo`), o favicon e os ícones do sistema (desktop e Android, gerados por
 * `desktop/scripts/gerar-icones.mjs`).
 */

export const LOGO_VIEWBOX = 512
/** Cor dos ícones do sistema: o ciano da runa acesa da arte antiga (e da paleta Runa). */
export const LOGO_CYAN = "#7fe3f0"
/** Fundo dos ícones do sistema e da abertura do Android (o mesmo `--bg` escuro do Órbita). */
export const LOGO_BACKGROUND = "#11131a"

type Point = readonly [number, number]

/** Pedra: seixo mais alto que largo, o topo subindo para a direita, a base mais estreita. */
const STONE: readonly Point[] = [[162, 92], [300, 48], [383, 104], [406, 292], [333, 439], [202, 454], [114, 319], [112, 173]]
/** Centro do desenho, para escalar a pedra no meio do quadro. */
const CENTER: Point = [259, 251]
/** Raidho: a haste de `top` a `bottom`; o bojo de `top` a `apex` e de volta a `junction`; a perna de `junction` a `foot`. */
const RUNE = { top: [232, 150], apex: [308, 222], junction: [232, 286], bottom: [232, 362], foot: [308, 362] } as const
/** Rachadura: entra pela borda de cima, à esquerda, e afina descendo. */
const CRACK: readonly { from: Point; to: Point; width: number }[] = [
  { from: [196, 60], to: [180, 150], width: 13 },
  { from: [180, 150], to: [190, 222], width: 8 },
  { from: [190, 222], to: [178, 272], width: 4 },
]
/** Largura da runa. Até 24 px a rachadura vira ruído: a versão pequena fica sem ela e com a runa mais grossa. */
const RUNE_WIDTH = { normal: 32, small: 40 }

const f = (n: number) => String(Math.round(n * 100) / 100)
const pt = ([x, y]: Point) => `${f(x)} ${f(y)}`
const add = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k]
const unit = (from: Point, to: Point): Point => {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  return [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
}
/** Normal do lado de fora para quem percorre o contorno no sentido horário da tela. */
const outward = (d: Point): Point => [d[1], -d[0]]

/** Ponto onde a reta `p + t·d` cruza a reta `q + s·e`. */
function cross(p: Point, d: Point, q: Point, e: Point): Point {
  const det = d[0] * e[1] - d[1] * e[0]
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / det
  return add(p, d, t)
}

/** Polígono com os cantos arredondados (uma curva em cada vértice): a pedra parece lapidada, não um octógono. */
function roundedPolygon(points: readonly Point[], radius: number): string {
  const at = (i: number) => points[(i + points.length) % points.length]
  const toward = (from: Point, to: Point): Point => {
    const t = Math.min(radius / Math.hypot(to[0] - from[0], to[1] - from[1]), 0.5)
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
  }
  return points.map((cur, i) => `${i === 0 ? "M" : "L"}${pt(toward(cur, at(i - 1)))} Q${pt(cur)} ${pt(toward(cur, at(i + 1)))}`).join(" ") + " Z"
}

/**
 * O furo da runa como contorno fechado (sem máscara), para valer também onde não há máscara (o vetor do Android):
 * o contorno de fora, com pontas e cantos redondos como um traço de `width`, e o miolo do bojo, que volta a ser pedra.
 */
function runeHole(width: number): string {
  const h = width / 2
  const { top, apex, junction, bottom, foot } = RUNE
  const dTA = unit(top, apex)
  const dAJ = unit(apex, junction)
  const dJF = unit(junction, foot)
  const nTA = outward(dTA)
  const nAJ = outward(dAJ)
  const nJF = outward(dJF)
  const arc = (to: Point) => `A${f(h)} ${f(h)} 0 0 1 ${pt(to)}`
  // Encontros côncavos: o lado de fora do bojo com o de cima da perna, e o de baixo da perna com a haste.
  const bowlLeg = cross(add(apex, nAJ, h), dAJ, add(junction, nJF, h), dJF)
  const legStem = cross(add(foot, nJF, -h), dJF, [bottom[0] + h, 0], [0, 1])
  const outline = [
    `M${pt([bottom[0] - h, bottom[1]])}`,
    `L${pt([top[0] - h, top[1]])}`,
    arc(add(top, nTA, h)),
    `L${pt(add(apex, nTA, h))}`,
    arc(add(apex, nAJ, h)),
    `L${pt(bowlLeg)}`,
    `L${pt(add(foot, nJF, h))}`,
    arc(add(foot, nJF, -h)),
    `L${pt(legStem)}`,
    `L${pt([bottom[0] + h, bottom[1]])}`,
    arc([bottom[0] - h, bottom[1]]),
    "Z",
  ].join(" ")
  // Miolo do bojo: o triângulo da haste, do topo e da ponta, encolhido pela metade da largura (cantos vivos).
  const stemInner: [Point, Point] = [[top[0] + h, 0], [0, 1]]
  const a = cross(...stemInner, add(top, nTA, -h), dTA)
  const b = cross(add(top, nTA, -h), dTA, add(apex, nAJ, -h), dAJ)
  const c = cross(add(apex, nAJ, -h), dAJ, ...stemInner)
  const counter = c[1] - a[1] > 1 ? ` M${pt(a)} L${pt(b)} L${pt(c)} Z` : ""
  return outline + counter
}

export interface LogoShape {
  /** A pedra com o furo da runa; desenhar com `fill-rule="evenodd"`. */
  path: string
  /** A rachadura (traços), vazada por máscara; vazia na versão pequena. */
  crack: { d: string; width: number }[]
}

/** A forma da logo no quadro de 512. `small`: para 16–24 px (sem a rachadura, runa mais grossa). */
export function logoShape(small = false): LogoShape {
  return {
    path: `${roundedPolygon(STONE, 24)} ${runeHole(small ? RUNE_WIDTH.small : RUNE_WIDTH.normal)}`,
    crack: small ? [] : CRACK.map(({ from, to, width }) => ({ d: `M${pt(from)} L${pt(to)}`, width })),
  }
}

export interface LogoSvgOptions {
  /** Cor da pedra. Padrão `currentColor`: a cor do texto em volta (ou a do `style`). */
  color?: string
  /** Versão para 16–24 px. */
  small?: boolean
  /** Tamanho da pedra: 1 é o desenho como está (cerca de 80% da altura do quadro). */
  scale?: number
  /** Fundo atrás da pedra (ícones do sistema). */
  background?: { color: string; shape: "full" | "rounded" | "circle"; inset?: number }
  /** CSS dentro do SVG (o favicon troca de cor com o tema do sistema). */
  style?: string
}

/** O SVG da logo como texto, para o favicon e para gerar os ícones do sistema. */
export function logoSvg({ color = "currentColor", small = false, scale = 1, background, style }: LogoSvgOptions = {}): string {
  const { path, crack } = logoShape(small)
  const size = LOGO_VIEWBOX
  const lines: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`]
  if (style) lines.push(`  <style>${style}</style>`)
  if (crack.length > 0) {
    lines.push(
      `  <mask id="rachadura" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">`,
      `    <rect width="${size}" height="${size}" fill="#fff"/>`,
      ...crack.map(({ d, width }) => `    <path d="${d}" fill="none" stroke="#000" stroke-width="${width}" stroke-linecap="round"/>`),
      "  </mask>",
    )
  }
  if (background) {
    const inset = background.inset ?? 0
    const side = size - inset * 2
    if (background.shape === "circle") lines.push(`  <circle cx="${size / 2}" cy="${size / 2}" r="${side / 2}" fill="${background.color}"/>`)
    else lines.push(`  <rect x="${inset}" y="${inset}" width="${side}" height="${side}"${background.shape === "rounded" ? ` rx="${f(side * 0.22)}"` : ""} fill="${background.color}"/>`)
  }
  const transform = scale === 1 ? "" : ` transform="translate(${size / 2} ${size / 2}) scale(${scale}) translate(${-CENTER[0]} ${-CENTER[1]})"`
  const mask = crack.length > 0 ? ` mask="url(#rachadura)"` : ""
  lines.push(`  <g${transform}><path d="${path}" fill="${color}" fill-rule="evenodd"${mask}/></g>`, "</svg>", "")
  return lines.join("\n")
}

/** Favicon: a versão pequena, maior no quadro, no ciano da paleta Runa (escuro) ou no petróleo dela (claro). */
export function faviconSvg(): string {
  return logoSvg({ small: true, scale: 1.2, style: "svg{color:#0b6676}@media (prefers-color-scheme:dark){svg{color:#7fe3f0}}" })
}

/**
 * Ícone das notificações do Android (barra de status): a silhueta branca da versão pequena, como o Android pede. O
 * vetor do Android não tem máscara, por isso o furo da runa vem como contorno (`evenOdd`).
 */
export function androidStatusIcon(): string {
  const { path } = logoShape(true)
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Ícone das notificações (lembretes da Agenda): a logo em recorte, em branco, como o Android pede para a barra de status.
     Gerado por desktop/scripts/gerar-icones.mjs a partir de app/src/core/logo.ts. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="${LOGO_VIEWBOX}"
    android:viewportHeight="${LOGO_VIEWBOX}">
    <group
        android:pivotX="${CENTER[0]}"
        android:pivotY="${CENTER[1]}"
        android:scaleX="1.2"
        android:scaleY="1.2"
        android:translateX="${LOGO_VIEWBOX / 2 - CENTER[0]}"
        android:translateY="${LOGO_VIEWBOX / 2 - CENTER[1]}">
        <path
            android:fillColor="#FFFFFFFF"
            android:fillType="evenOdd"
            android:pathData="${path}" />
    </group>
</vector>
`
}
