/**
 * Fontes livres (OFL) do livro impresso (L3, ADR 0033), estáticas para não virarem Type 3 no PDF e só no subconjunto
 * latino (português). Carregadas só com o livro aberto; as do app (Geist e Atkinson variáveis) têm outro nome.
 */
import "@fontsource/uncial-antiqua/latin-400.css"
import "@fontsource/cinzel-decorative/latin-400.css"
import "@fontsource/cinzel-decorative/latin-700.css"
import "@fontsource/im-fell-english-sc/latin-400.css"
import "@fontsource/marcellus-sc/latin-400.css"
import "@fontsource/playfair-display/latin-400.css"
import "@fontsource/playfair-display/latin-400-italic.css"
import "@fontsource/playfair-display/latin-700.css"
import "@fontsource/playfair-display/latin-700-italic.css"
import "@fontsource/libre-baskerville/latin-400.css"
import "@fontsource/libre-baskerville/latin-400-italic.css"
import "@fontsource/libre-baskerville/latin-700.css"
import "@fontsource/libre-baskerville/latin-700-italic.css"
import "@fontsource/source-serif-4/latin-400.css"
import "@fontsource/source-serif-4/latin-400-italic.css"
import "@fontsource/source-serif-4/latin-700.css"
import "@fontsource/source-serif-4/latin-700-italic.css"
import "@fontsource/crimson-pro/latin-400.css"
import "@fontsource/crimson-pro/latin-400-italic.css"
import "@fontsource/crimson-pro/latin-700.css"
import "@fontsource/crimson-pro/latin-700-italic.css"
import "@fontsource/alegreya/latin-400.css"
import "@fontsource/alegreya/latin-400-italic.css"
import "@fontsource/alegreya/latin-700.css"
import "@fontsource/alegreya/latin-700-italic.css"
import "@fontsource/geist/latin-400.css"
import "@fontsource/geist/latin-400-italic.css"
import "@fontsource/geist/latin-700.css"
import "@fontsource/geist/latin-700-italic.css"
import "@fontsource/atkinson-hyperlegible-next/latin-400.css"
import "@fontsource/atkinson-hyperlegible-next/latin-400-italic.css"
import "@fontsource/atkinson-hyperlegible-next/latin-700.css"
import "@fontsource/atkinson-hyperlegible-next/latin-700-italic.css"

import cinzel400 from "@fontsource/cinzel/files/cinzel-latin-400-normal.woff2?url"
import cinzel700 from "@fontsource/cinzel/files/cinzel-latin-700-normal.woff2?url"
import cinzelDecorative400 from "@fontsource/cinzel-decorative/files/cinzel-decorative-latin-400-normal.woff2?url"
import cinzelDecorative700 from "@fontsource/cinzel-decorative/files/cinzel-decorative-latin-700-normal.woff2?url"
import uncialAntiqua400 from "@fontsource/uncial-antiqua/files/uncial-antiqua-latin-400-normal.woff2?url"
import imFellEnglishSc400 from "@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2?url"
import marcellusSc400 from "@fontsource/marcellus-sc/files/marcellus-sc-latin-400-normal.woff2?url"
import playfairDisplay400 from "@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2?url"
import playfairDisplay700 from "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2?url"
import libreBaskerville400 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff2?url"
import libreBaskerville700 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff2?url"
import sourceSerif4400 from "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?url"
import sourceSerif4700 from "@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2?url"
import crimsonPro400 from "@fontsource/crimson-pro/files/crimson-pro-latin-400-normal.woff2?url"
import crimsonPro700 from "@fontsource/crimson-pro/files/crimson-pro-latin-700-normal.woff2?url"
import alegreya400 from "@fontsource/alegreya/files/alegreya-latin-400-normal.woff2?url"
import alegreya700 from "@fontsource/alegreya/files/alegreya-latin-700-normal.woff2?url"
import geist400 from "@fontsource/geist/files/geist-latin-400-normal.woff2?url"
import geist700 from "@fontsource/geist/files/geist-latin-700-normal.woff2?url"
import atkinsonHyperlegibleNext400 from "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2?url"
import atkinsonHyperlegibleNext700 from "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff2?url"
import ebGaramond400 from "@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff2?url"
import ebGaramond700 from "@fontsource/eb-garamond/files/eb-garamond-latin-700-normal.woff2?url"

/** Fontes de título e de texto que o Estilo do livro oferece (as do cofre entram junto, pelo nome do arquivo). */
export const TITLE_FONTS = ["Cinzel", "Cinzel Decorative", "Uncial Antiqua", "IM Fell English SC", "Marcellus SC", "Playfair Display", "Libre Baskerville", "Geist", "EB Garamond"] as const
export const TEXT_FONTS = ["EB Garamond", "Crimson Pro", "Libre Baskerville", "Source Serif 4", "Alegreya", "Atkinson Hyperlegible Next", "Geist"] as const

/** Os arquivos (400 e 700, latinos) de cada fonte do app, para levar as fontes escolhidas no EPUB e no HTML. */
export const FONT_FILES: Record<string, [number, string][]> = {
  "Cinzel": [[400, cinzel400], [700, cinzel700]],
  "Cinzel Decorative": [[400, cinzelDecorative400], [700, cinzelDecorative700]],
  "Uncial Antiqua": [[400, uncialAntiqua400]],
  "IM Fell English SC": [[400, imFellEnglishSc400]],
  "Marcellus SC": [[400, marcellusSc400]],
  "Playfair Display": [[400, playfairDisplay400], [700, playfairDisplay700]],
  "Libre Baskerville": [[400, libreBaskerville400], [700, libreBaskerville700]],
  "Source Serif 4": [[400, sourceSerif4400], [700, sourceSerif4700]],
  "Crimson Pro": [[400, crimsonPro400], [700, crimsonPro700]],
  "Alegreya": [[400, alegreya400], [700, alegreya700]],
  "Geist": [[400, geist400], [700, geist700]],
  "Atkinson Hyperlegible Next": [[400, atkinsonHyperlegibleNext400], [700, atkinsonHyperlegibleNext700]],
  "EB Garamond": [[400, ebGaramond400], [700, ebGaramond700]],
}
