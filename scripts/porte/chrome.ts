// Un navigateur sans tête, piloté par le protocole DevTools, sans une dépendance — w1-porte-page
// (#158). Ce module ne juge rien : il ouvre une page, l'interroge, et rend ce qu'il a vu. La
// règle est dans ./page.ts, jouée hors ligne par ./page.test.ts.
//
// **Pourquoi pas Playwright ni Puppeteer.** Les deux apportent un navigateur à télécharger à
// chaque passage de la porte, et une dépendance de plus à surveiller par `avis` — pour un besoin
// qui tient en quatre commandes CDP. Le protocole, lui, est déjà parlé par ce dépôt sous une
// autre forme : `mcp-server` parle JSON-RPC sur un tuyau, c'est la même mécanique. Node 22 porte
// `WebSocket` en global sans drapeau, et c'est la version que `porte.yml` installe. La session de
// `w6-fiche-robuste` (#156) a démontré le plantage par ce chemin-là, hors du dépôt ; ce fichier
// rend la technique durable au lieu de la laisser mourir avec la session.
//
// **Le navigateur n'est pas installé par ce dépôt, il est trouvé.** `ubuntu-latest` livre
// `google-chrome` d'office. Un poste Windows porte Chrome ou Edge. Rien trouvé n'est pas un
// rouge du produit : c'est la mesure qui manque, et l'appelant la classe en 2.

import { spawn, type ChildProcess } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** Le navigateur n'a pas été trouvé, ou n'a pas démarré : la mesure manque, rien n'est jugé. */
export class NavigateurAbsent extends Error {}

/** La page n'a pas été servie du tout — panne amont, à distinguer d'une page qui ne rend rien. */
export class PageInjoignable extends Error {}

/**
 * Les chemins essayés, dans l'ordre, quand `PORTE_PAGE_CHROME` ne dit rien.
 *
 * Linux d'abord parce que c'est là que la porte tourne ; le reste sert le poste d'où une
 * session rejoue le bras à la main. Edge est un Chromium et parle le même protocole : il est
 * là pour le poste Windows qui n'a pas Chrome, jamais comme cible de la porte.
 */
const CANDIDATS = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
]

export function trouverNavigateur(candidats: readonly string[] = CANDIDATS): string {
  const impose = process.env.PORTE_PAGE_CHROME
  if (impose) {
    if (!existsSync(impose)) {
      throw new NavigateurAbsent(`PORTE_PAGE_CHROME désigne « ${impose} », qui n'existe pas.`)
    }
    return impose
  }
  const trouve = candidats.find((c) => existsSync(c))
  if (!trouve) {
    throw new NavigateurAbsent(
      "aucun navigateur Chromium trouvé. Essayés : " +
        candidats.join(", ") +
        ". Poser PORTE_PAGE_CHROME sur un binaire Chrome ou Edge.",
    )
  }
  return trouve
}

/** Le délai laissé à Chrome pour annoncer son port DevTools. Un démarrage, pas un chargement. */
const DEMARRAGE_MS = 20000

interface Session {
  /** Envoie une commande CDP et attend sa réponse. */
  cmd(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>
  fermer(): void
}

function lancer(binaire: string, profil: string): ChildProcess {
  return spawn(
    binaire,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      // `--no-sandbox` est requis sur un runner GitHub, qui tourne dans un conteneur sans les
      // capacités que le bac à sable de Chrome demande. Il n'ouvre rien ici : la page visitée
      // est notre propre site publié, et le processus meurt avec le bras.
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      `--user-data-dir=${profil}`,
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  )
}

async function attacher(chrome: ChildProcess): Promise<Session> {
  const url = await new Promise<string>((resolve, reject) => {
    let tampon = ""
    const minuteur = setTimeout(
      () => reject(new NavigateurAbsent(`pas de port DevTools annoncé en ${DEMARRAGE_MS} ms`)),
      DEMARRAGE_MS,
    )
    chrome.on("exit", (code) => {
      clearTimeout(minuteur)
      reject(new NavigateurAbsent(`le navigateur s'est arrêté (code ${code}) : ${tampon.trim()}`))
    })
    chrome.stderr?.on("data", (morceau: Buffer) => {
      tampon += morceau.toString()
      const trouve = /DevTools listening on (ws:\/\/\S+)/.exec(tampon)
      if (trouve) {
        clearTimeout(minuteur)
        resolve(trouve[1])
      }
    })
  })

  const socket = new WebSocket(url)
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true })
    socket.addEventListener("error", () => reject(new NavigateurAbsent("WebSocket refusé")), {
      once: true,
    })
  })

  let suivant = 0
  const attentes = new Map<
    number,
    { ok: (v: Record<string, unknown>) => void; ko: (e: Error) => void }
  >()
  socket.addEventListener("message", (evenement) => {
    const message = JSON.parse(String(evenement.data)) as {
      id?: number
      result?: Record<string, unknown>
      error?: { message?: string }
    }
    if (message.id === undefined) return
    const attente = attentes.get(message.id)
    if (!attente) return
    attentes.delete(message.id)
    if (message.error) attente.ko(new Error(message.error.message ?? "erreur CDP"))
    else attente.ok(message.result ?? {})
  })

  let sessionId: string | undefined
  const envoyer = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((ok, ko) => {
      const id = ++suivant
      attentes.set(id, { ok, ko })
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })

  const { targetId } = (await envoyer("Target.createTarget", { url: "about:blank" })) as {
    targetId: string
  }
  const attache = (await envoyer("Target.attachToTarget", { targetId, flatten: true })) as {
    sessionId: string
  }
  sessionId = attache.sessionId

  return { cmd: envoyer, fermer: () => socket.close() }
}

export interface Observation {
  /** Ce que l'expression a rendu, tel quel — ./page.ts décide de ce que ça vaut. */
  brut: string
  /** Millisecondes entre l'ordre de navigation et l'observation retenue. */
  msEcoule: number
  /** Vrai quand l'expression a fini par répondre quelque chose d'accepté avant le délai. */
  avantDelai: boolean
}

/**
 * Ouvre une URL, interroge la page jusqu'à ce que `accepte` dise oui, et rend la dernière
 * observation.
 *
 * **Le chronomètre part à l'ordre de navigation**, pas à l'ouverture du navigateur : un
 * démarrage de Chrome n'appartient pas au produit, et l'y compter ferait rougir le bras sur la
 * lenteur du runner plutôt que sur la page. C'est la même frontière que `porte:publie` trace
 * entre le site et nous.
 */
export async function sonder(
  url: string,
  expression: string,
  accepte: (brut: string) => boolean,
  delaiMs: number,
  pasMs = 250,
): Promise<Observation> {
  const binaire = trouverNavigateur()
  const profil = mkdtempSync(join(tmpdir(), "porte-page-"))
  const chrome = lancer(binaire, profil)
  let session: Session | null = null
  try {
    session = await attacher(chrome)
    await session.cmd("Page.enable")
    await session.cmd("Runtime.enable")

    const depart = Date.now()
    const navigation = (await session.cmd("Page.navigate", { url })) as { errorText?: string }
    if (navigation.errorText) {
      // Le document lui-même n'a pas été servi : c'est l'amont, pas une page qui ne rend rien.
      throw new PageInjoignable(navigation.errorText)
    }

    let brut = ""
    while (Date.now() - depart < delaiMs) {
      const reponse = (await session.cmd("Runtime.evaluate", {
        expression,
        returnByValue: true,
      })) as { result?: { value?: string } }
      brut = reponse.result?.value ?? ""
      if (accepte(brut)) return { brut, msEcoule: Date.now() - depart, avantDelai: true }
      await new Promise((r) => setTimeout(r, pasMs))
    }
    return { brut, msEcoule: Date.now() - depart, avantDelai: false }
  } finally {
    session?.fermer()
    chrome.kill()
    try {
      rmSync(profil, { recursive: true, force: true })
    } catch {
      // Un profil temporaire que Windows garde ouvert n'a rien à voir avec le verdict.
    }
  }
}
