// Ce que le dixième bras DÉCIDE, joué contre un bouchon local plutôt que contre la production.
//
// Même raison que `scripts/eval/anon-http.test.ts` : une panne ne se provoque pas sur demande
// contre un site en ligne, et un test qui dépend de la production ne mesure plus le code — il
// mesure la journée qu'a eue Lovable. Les corps servis ici ont la forme de ceux du 2 septembre
// 2026 : une page qui charge un module sous `/assets/`, un script maison de Lovable à côté, et
// un bundle d'entrée qui délègue à un chunk `App-<hash>.js`.

import { spawn } from "node:child_process"
import { createServer, type Server } from "node:http"
import { readFileSync } from "node:fs"
import { type AddressInfo } from "node:net"
import { resolve } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { parseEnv } from "../build/envPublic"

const ROOT = resolve(__dirname, "../..")

/** La même valeur que le bras cherche, lue à la même source — jamais recopiée ici. */
const REFERENCE = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/.exec(
  parseEnv(readFileSync(resolve(ROOT, ".env"), "utf8")).get("VITE_SUPABASE_URL") ?? "",
)![1]

const ENTRY = "/assets/index-Testhash.js"
const CHUNK = "App-abcd1234.js"

const PAGE = `<!DOCTYPE html><html lang="fr"><head><title>Compass</title></head><body>
  <div id="root"></div>
  <script type="module" crossorigin src="${ENTRY}"></script>
  <script src="/~flock.js"></script>
</body></html>`

const PAGE_SANS_MODULE = `<!DOCTYPE html><html><body><div id="root"></div>
  <script src="/~flock.js"></script></body></html>`

let server: Server | undefined

afterEach(() => {
  server?.close()
  server = undefined
})

interface Bodies {
  page?: string
  entry?: string
  chunk?: string
  status?: number
}

async function stub({ page = PAGE, entry = "", chunk = "", status }: Bodies): Promise<string> {
  server = createServer((request, response) => {
    if (status !== undefined) {
      response.writeHead(status)
      response.end("indisponible")
      return
    }
    const body = request.url === "/" ? page : request.url === ENTRY ? entry : chunk
    response.writeHead(200, { "Content-Type": request.url === "/" ? "text/html" : "text/javascript" })
    response.end(body)
  })
  await new Promise<void>((ready) => server!.listen(0, "127.0.0.1", ready))
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
}

function runArm(url: string): Promise<{ code: number | null; output: string }> {
  return new Promise((done) => {
    const child = spawn(
      process.execPath,
      [resolve(ROOT, "node_modules/tsx/dist/cli.mjs"), resolve(__dirname, "publie.ts")],
      { env: { ...process.env, PORTE_PUBLIE_URL: url } },
    )
    let output = ""
    child.stdout.on("data", (c: Buffer) => (output += c.toString()))
    child.stderr.on("data", (c: Buffer) => (output += c.toString()))
    child.on("close", (code) => done({ code, output }))
  })
}

describe("le bras du site publié", () => {
  it("passe quand la configuration est figée dans le bundle d'entrée", async () => {
    const entry = `const a="https://${REFERENCE}.supabase.co",b="sb_publishable_x";export{a,b}`
    const { code, output } = await runArm(await stub({ entry }))

    expect(output).toContain("PASS")
    expect(code).toBe(0)
  }, 60_000)

  it("échoue quand aucun bundle servi ne porte la configuration, et nomme le §32", async () => {
    // Le corps du 2 septembre, dans sa forme : les deux constantes remplacées par `void 0`.
    const entry = "const zL=void 0,ob=void 0;function LL(t){if(!t)throw new Error('supabaseUrl is required.')}"
    const { code, output } = await runArm(await stub({ entry }))

    expect(output).toContain("ÉCHEC")
    expect(output).toContain("§32")
    expect(code).toBe(1)
  }, 60_000)

  it("suit les chunks : la configuration trouvée hors de l'entrée reste un vert", async () => {
    // Le découpage du §32 a sorti `App` de l'entrée. Un bras qui ne lirait que l'entrée
    // crierait le jour où le client Supabase part avec lui — ce serait un rouge sur un
    // changement de découpage, pas sur un défaut.
    const entry = `import("./${CHUNK}").then(m=>m.default)`
    const chunk = `const u="https://${REFERENCE}.supabase.co"`
    const { code, output } = await runArm(await stub({ entry, chunk }))

    expect(output).toContain(CHUNK)
    expect(output).toContain("PASS")
    expect(code).toBe(0)
  }, 60_000)

  it("rend INDÉTERMINÉ, pas un échec, quand le site ne répond pas", async () => {
    const { code, output } = await runArm(await stub({ status: 503 }))

    expect(output).toContain("INDÉTERMINÉ")
    expect(output).toContain("panne amont")
    // Ce qui compte : l'indisponibilité de Lovable ne réveille personne ici.
    expect(output).not.toContain("ÉCHEC")
    expect(code).toBe(3)
  }, 60_000)

  it("échoue quand la page ne charge aucun module sous `/assets/`", async () => {
    const { code, output } = await runArm(await stub({ page: PAGE_SANS_MODULE }))

    expect(output).toContain("ÉCHEC")
    expect(output).toContain("aucun bundle")
    expect(code).toBe(1)
  }, 60_000)

  it("n'imprime jamais la référence du projet", async () => {
    // Le rapport de la porte est publié dans une issue d'un dépôt public — scripts/porte/redaction.ts.
    // Ce bras ne doit pas compter sur ce masquage : il ne l'écrit pas.
    const entry = `const a="https://${REFERENCE}.supabase.co"`
    const { output } = await runArm(await stub({ entry }))

    expect(output).not.toContain(REFERENCE)
  }, 60_000)
})
