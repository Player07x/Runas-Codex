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

/** Fontes de título e de texto que o Estilo do livro oferece (as do cofre entram junto, pelo nome do arquivo). */
export const TITLE_FONTS = ["Cinzel", "Cinzel Decorative", "Uncial Antiqua", "IM Fell English SC", "Marcellus SC", "Playfair Display", "Libre Baskerville", "Geist", "EB Garamond"] as const
export const TEXT_FONTS = ["EB Garamond", "Crimson Pro", "Libre Baskerville", "Source Serif 4", "Alegreya", "Atkinson Hyperlegible Next", "Geist"] as const
