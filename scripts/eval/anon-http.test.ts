import { spawn } from "child_process"
import { createServer, type Server } from "http"
import { AddressInfo } from "net"
import { resolve } from "path"

import { afterEach, describe, expect, it } from "vitest"

// #61 — the wiring, not the decision. upstream.test.ts pins what `classify` decides;
// this pins what the gate DOES with it: a cancelled statement must leave the run
// "INDÉTERMINÉ" at exit 3, and must never be counted as a licence failure.
//
// It runs against a stub rather than the remote on purpose. A cancellation cannot be
// provoked on demand against a live project without either lowering `anon`'s
// statement_timeout for every real visitor or hammering the database until it gives up —
// and the first is a production change, the second is not a measurement. The stub returns
// the body PostgREST actually returned on 26 August 2026, byte for byte.

const CANCELED = JSON.stringify({
  code: "57014",
  details: null,
  hint: null,
  message: "canceling statement due to statement timeout",
})

let server: Server | undefined

afterEach(() => {
  server?.close()
  server = undefined
})

/** Answers every request with the same cancellation, so the FIRST control already suspends. */
async function stub(): Promise<string> {
  server = createServer((_request, response) => {
    response.writeHead(500, { "Content-Type": "application/json" })
    response.end(CANCELED)
  })
  await new Promise<void>((ready) => server!.listen(0, "127.0.0.1", ready))
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
}

function runGate(url: string): Promise<{ code: number | null; output: string }> {
  return new Promise((done) => {
    const child = spawn(
      process.execPath,
      [resolve(__dirname, "../../node_modules/tsx/dist/cli.mjs"), resolve(__dirname, "anon-http.ts")],
      {
        // Shell variables win over .env.local — docs/REPRISE.md, "Ne pas lancer supabase start".
        env: { ...process.env, VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: "stub" },
      },
    )
    let output = ""
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()))
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()))
    child.on("close", (code) => done({ code, output }))
  })
}

describe("la porte anonyme face à une annulation serveur", () => {
  it("rend INDÉTERMINÉ et le code 3, jamais un échec de licence", async () => {
    const { code, output } = await runGate(await stub())

    expect(output).toContain("suspendu")
    expect(output).toContain("57014")
    expect(output).toContain("INDÉTERMINÉ")
    // The whole point: a cold database must not be reported as a broken licence rule.
    expect(output).not.toContain("FAIL")
    expect(code).toBe(3)
  }, 60_000)
})
