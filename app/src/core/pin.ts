/**
 * Bloqueio por PIN do espaço Notas (checklist F.1): impede abrir as notas pessoais no app; não criptografa os arquivos
 * (o Obsidian e o gerenciador de arquivos continuam abrindo). O PIN fica só neste aparelho, como hash com sal.
 */

export interface StoredPin {
  salt: string
  hash: string
}

/** De 4 a 8 algarismos. */
export function pinProblem(pin: string): string | null {
  return /^\d{4,8}$/.test(pin) ? null : "O PIN tem de 4 a 8 algarismos."
}

const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")

export async function hashPin(pin: string, salt: string): Promise<string> {
  // PBKDF2 em vez de um hash só: tentar todos os PINs fica caro mesmo para quem copiar a preferência.
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120_000, hash: "SHA-256" }, key, 256)
  return hex(bits)
}

export async function createPin(pin: string): Promise<StoredPin> {
  const problem = pinProblem(pin)
  if (problem) throw new Error(problem)
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await hashPin(pin, salt) }
}

export async function checkPin(pin: string, stored: StoredPin): Promise<boolean> {
  return (await hashPin(pin, stored.salt)) === stored.hash
}

/** Espera depois de errar: nada nas 4 primeiras, depois 30 s a cada tentativa. */
export function lockoutSeconds(failures: number): number {
  return failures < 5 ? 0 : 30
}
