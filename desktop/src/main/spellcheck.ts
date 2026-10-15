import { createHash } from "node:crypto"
import { copyFileSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { app, Menu, session, type BrowserWindow, type MenuItemConstructorOptions } from "electron"

/**
 * Corretor ortográfico sem rede (regra 6). O Chromium baixaria o dicionário pt-BR do servidor do Google na primeira
 * vez que um campo de texto ganha foco; o app traz o dicionário (`resources/dicionarios/`, VERO, LGPL 2.1) e o põe
 * na pasta onde o Chromium procura antes de baixar. Por garantia, o endereço de download aponta para a cópia local.
 */
export const SPELLCHECK_LANGUAGES = ["pt-BR"]
export const DICTIONARY_FILE = "pt-BR-3-0.bdic"

/** Pasta do dicionário: dentro do instalador (`resources/`) ou no código do desktop, em desenvolvimento. */
export function dictionaryFolder(): string {
  return app.isPackaged ? join(process.resourcesPath, "dicionarios") : join(app.getAppPath(), "resources", "dicionarios")
}

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")

/** O arquivo do perfil precisa ser trocado? (falta, ou é outro) */
export function needsCopy(bundled: Uint8Array, installed: Uint8Array | null): boolean {
  return !installed || installed.byteLength !== bundled.byteLength || sha256(installed) !== sha256(bundled)
}

/** Antes do "ready": copia o dicionário para `<perfil>/Dictionaries`, onde o Chromium procura antes de baixar. */
export function installDictionary(): void {
  try {
    const bundled = readFileSync(join(dictionaryFolder(), DICTIONARY_FILE))
    const folder = join(app.getPath("userData"), "Dictionaries")
    let installed: Uint8Array | null = null
    try {
      installed = readFileSync(join(folder, DICTIONARY_FILE))
    } catch {
      installed = null
    }
    if (!needsCopy(bundled, installed)) return
    mkdirSync(folder, { recursive: true })
    copyFileSync(join(dictionaryFolder(), DICTIONARY_FILE), join(folder, DICTIONARY_FILE))
  } catch (error) {
    // Sem o dicionário o app abre do mesmo jeito; o download fica apontado para a pasta local (configureSpellchecker).
    console.error("Dicionário do corretor:", error)
  }
}

export interface SpellcheckReport {
  languages: string[]
  /** Idiomas cujo dicionário o Chromium tentou baixar (precisa ficar vazio). */
  downloads: string[]
  /** Idiomas cujo dicionário o Chromium carregou (do disco, sem baixar). */
  initialized: string[]
  installed: boolean
}

const downloads: string[] = []
const initialized: string[] = []

/** Depois do "ready": só pt-BR, e qualquer download que o Chromium ainda tente vai para a cópia local. */
export function configureSpellchecker(): void {
  const defaultSession = session.defaultSession
  defaultSession.setSpellCheckerDictionaryDownloadURL(pathToFileURL(dictionaryFolder()).href + "/")
  defaultSession.setSpellCheckerLanguages(SPELLCHECK_LANGUAGES)
  defaultSession.on("spellcheck-dictionary-download-begin", (_event, language) => downloads.push(language))
  defaultSession.on("spellcheck-dictionary-initialized", (_event, language) => initialized.push(language))
}

/** Para o `--smoke`: os idiomas, os downloads tentados e se o perfil tem o dicionário igual ao do app. */
export function spellcheckReport(): SpellcheckReport {
  let installed = false
  try {
    installed = !needsCopy(readFileSync(join(dictionaryFolder(), DICTIONARY_FILE)), readFileSync(join(app.getPath("userData"), "Dictionaries", DICTIONARY_FILE)))
  } catch {
    installed = false
  }
  return { languages: session.defaultSession.getSpellCheckerLanguages(), downloads: [...downloads], initialized: [...initialized], installed }
}

export function spellcheckPassed(report: SpellcheckReport): boolean {
  return report.installed && report.downloads.length === 0 && report.languages.join(",") === SPELLCHECK_LANGUAGES.join(",")
}

export type MenuParams = Pick<Electron.ContextMenuParams, "misspelledWord" | "dictionarySuggestions" | "isEditable" | "editFlags" | "selectionText">

/**
 * Clique direito: as sugestões do corretor, "Adicionar ao dicionário" (fica no perfil, para nomes do mundo) e as ações
 * de texto. Sem campo de texto nem seleção, nenhum menu aparece (como antes).
 */
export function contextMenuTemplate(params: MenuParams, actions: { replace(word: string): void; addWord(word: string): void }): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = []
  if (params.misspelledWord) {
    for (const suggestion of params.dictionarySuggestions.slice(0, 6)) items.push({ label: suggestion, click: () => actions.replace(suggestion) })
    if (!params.dictionarySuggestions.length) items.push({ label: "Sem sugestões", enabled: false })
    items.push({ label: `Adicionar “${params.misspelledWord}” ao dicionário`, click: () => actions.addWord(params.misspelledWord) })
    items.push({ type: "separator" })
  }
  if (params.isEditable) {
    items.push(
      { label: "Recortar", role: "cut", enabled: params.editFlags.canCut },
      { label: "Copiar", role: "copy", enabled: params.editFlags.canCopy },
      { label: "Colar", role: "paste", enabled: params.editFlags.canPaste },
      { label: "Selecionar tudo", role: "selectAll" },
    )
  } else if (params.selectionText.trim()) {
    items.push({ label: "Copiar", role: "copy" })
  }
  return items
}

export function attachContextMenu(window: BrowserWindow): void {
  window.webContents.on("context-menu", (_event, params) => {
    const items = contextMenuTemplate(params, {
      replace: (word) => window.webContents.replaceMisspelling(word),
      addWord: (word) => window.webContents.session.addWordToSpellCheckerDictionary(word),
    })
    if (items.length) Menu.buildFromTemplate(items).popup({ window })
  })
}
