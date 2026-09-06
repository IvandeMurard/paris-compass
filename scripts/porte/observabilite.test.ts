// The control that fails if a file reaches PostgREST without declaring the escapement —
// w1-observabilite-echappement (#81), point 2, and the fourth application of « énumérer, pas
// lister » after #71 on the npm scripts, #70 on the ingestion sources and #73 on the catalogue.
//
// Two halves, and both are needed, exactly as scripts/porte/arms.test.ts and
// scripts/porte/catalogue.test.ts have them. The first plays the rule against substituted
// inputs, which is where the sabotage lives: a caller added and the check must go red, the
// caller removed and it must go green again. The second plays it against the repository as it
// stands, which is what will catch the twelfth arm somebody writes in three months — the case
// no fixture can anticipate, and the only one that actually matters.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import {
  appelantsDePostgrest,
  buildsClient,
  classifyCallers,
  code,
  declaresEscapement,
  estClasse,
  namesRestPath,
  readCallers,
  readReasons,
  repositoryFiles,
  testsImportingClient,
  type Appelant,
} from "./observabilite"

const ROOT = resolve(__dirname, "..", "..")

/** A twelfth arm, written the way `eval:anon` looked on the day it was added. */
const SONDE: Appelant = { path: "scripts/eval/sonde-http.ts", acces: ["rest"], declare: false }
const ECHAPPE: Appelant = { path: "scripts/eval/anon-http.ts", acces: ["rest"], declare: true }

describe("la règle, jouée sur des entrées substituées", () => {
  it("tient un appelant qui pose l'échappement pour échappé", () => {
    expect(classifyCallers([ECHAPPE], {})[0].state).toBe("echappe")
  })

  it("tient un appelant avec une raison écrite pour excusé", () => {
    const verdicts = classifyCallers([SONDE], { [SONDE.path]: "C'est le produit, il doit être compté." })
    expect(verdicts[0].state).toBe("excuse")
  })

  it("rougit sur un bras qui atteint PostgREST sans échappement — le sabotage", () => {
    const verdicts = classifyCallers([ECHAPPE, SONDE], {})
    const sonde = verdicts.find((v) => v.path === SONDE.path)
    expect(sonde?.state).toBe("muet")
    expect(sonde?.detail).toContain("observabilite.json")
  })

  it("revient au vert une fois la sonde retirée", () => {
    // The counter-test, and the half a sabotage usually forgets: a check that went red for
    // every input would pass the case above and be worth nothing.
    expect(classifyCallers([ECHAPPE], {}).every((v) => estClasse(v.state))).toBe(true)
  })

  it("rougit sur un appelant à la fois échappé et excusé", () => {
    expect(classifyCallers([ECHAPPE], { [ECHAPPE.path]: "raison" })[0].state).toBe("contradictoire")
  })

  it("rougit sur une raison orpheline — une excuse pour un fichier qui n'appelle plus rien", () => {
    const verdicts = classifyCallers([ECHAPPE], { "scripts/eval/disparu.ts": "raison" })
    expect(verdicts.find((v) => v.path === "scripts/eval/disparu.ts")?.state).toBe("orphelin")
  })

  it("ne tient pas une raison vide pour une raison", () => {
    // An empty string is « pas besoin » with less honesty, and it would classify as excused.
    expect(classifyCallers([SONDE], { [SONDE.path]: "   " })[0].state).toBe("muet")
  })
})

describe("la détection, jouée sur des textes substitués", () => {
  it("voit un client Supabase, générique compris", () => {
    // `createClient<Database>(…)` is how src/integrations/supabase/client.ts writes it, and a
    // pattern anchored on `createClient(` missed it — measured 6 September 2026.
    const avec = 'import { createClient } from "@supabase/supabase-js"\nexport const c = createClient(u, k)'
    const generique = 'import { createClient } from "@supabase/supabase-js"\nconst c = createClient<Database>(u, k)'
    expect(buildsClient(avec)).toBe(true)
    expect(buildsClient(generique)).toBe(true)
  })

  it("voit un appel direct au chemin de PostgREST", () => {
    expect(namesRestPath("await fetch(`${BASE}/rest/v1/${path}`)")).toBe(true)
  })

  it("ne lit pas un commentaire comme un appel", () => {
    // Two files in this repository EXPLAIN `createClient` without calling it —
    // scripts/build/envGuard.ts and src/main.tsx — and both were false positives before the
    // stripping. This is arms.ts's rule about workflow comments, one population over.
    const commente =
      '// `createClient(undefined, …)` from "@supabase/supabase-js" threw here\n' +
      "/* et /rest/v1/ non plus */\nexport const rien = 1"
    expect(buildsClient(code(commente))).toBe(false)
    expect(namesRestPath(code(commente))).toBe(false)
  })

  it("ne coupe pas une URL en croyant lire un commentaire", () => {
    // A full-line `//` only. `https://…` lives in a string in half the files here.
    expect(code('const u = "https://exemple.supabase.co/rest/v1/x"')).toContain("/rest/v1/")
  })

  it("voit les deux orthographes de l'échappement", () => {
    expect(declaresEscapement('headers: { "x-compass-observabilite": "off" }')).toBe(true)
    expect(declaresEscapement('env: { COMPASS_OBSERVABILITE: "off" }')).toBe(true)
    expect(declaresEscapement("const rien = 1")).toBe(false)
  })
})

describe("la règle, jouée sur le dépôt tel qu'il est", () => {
  it("dérive la population du dépôt, et elle n'est pas vide", () => {
    const files = repositoryFiles(ROOT)
    // No expected count is asserted on the repository's files: it is meant to grow. What is
    // asserted is that git answered and that the enumeration reaches the two ends of the tree.
    expect(files.length).toBeGreaterThan(100)
    expect(files).toContain("scripts/eval/anon-http.ts")
    expect(files).toContain("src/integrations/supabase/client.ts")
  })

  it("balaie aussi les brouillons ignorés, et jamais un dossier produit", () => {
    // `.gitignore` line 94 ignores `scripts/tmp-*.ts`, and measured 6 September 2026 the
    // probe written for this ticket's counter-test was invisible under that name and visible
    // the moment it was renamed. A session draft is the likeliest twelfth caller there is.
    // Ignored means « do not commit this », never « do not look at this ».
    const files = repositoryFiles(ROOT)
    expect(files.filter((p) => /(?:^|\/)(?:node_modules|dist|\.build|\.temp)\//.test(p))).toEqual([])
    // And the sweep is scoped, so the enumeration stays in the hundreds rather than the
    // hundred thousands `node_modules` would add.
    expect(files.length).toBeLessThan(2000)
  })

  it("ne compte pas les fichiers de test parmi les appelants", () => {
    // This very file writes `@supabase/supabase-js` and `/rest/v1/` as fixtures, and a
    // population that read them would count the check among the things it checks — measured
    // 6 September 2026, where it classified as « échappé » on the strength of the fixture that
    // proves the header is recognised.
    expect(readCallers(ROOT).map((c) => c.path)).not.toContain("scripts/porte/observabilite.test.ts")
  })

  it("ferme le trou que cette exclusion ouvre : aucun test n'importe de client PostgREST", () => {
    // The compensating net. A test that DID reach the base would not be seen by the rule
    // above, and an import is how it would reach it. A fixture is never an import.
    expect(
      testsImportingClient(ROOT),
      "un fichier de test importe un client PostgREST : il sort de la population sans être vu",
    ).toEqual([])
  })

  it("trouve les appelants connus, et aucun fichier de construction", () => {
    const callers = readCallers(ROOT)
    const paths = callers.map((c) => c.path)
    expect(paths).toContain("scripts/eval/anon-http.ts")
    expect(paths).toContain("mcp-server/src/supabase.ts")
    expect(paths).toContain("src/integrations/supabase/client.ts")
    // The two files that talk ABOUT createClient without calling it.
    expect(paths).not.toContain("scripts/build/envGuard.ts")
    expect(paths).not.toContain("src/main.tsx")
    // And nothing from a build output: `.gitignore` keeps them out, and it must stay that way.
    expect(paths.filter((p) => /(^|\/)(dist|\.build|node_modules)\//.test(p))).toEqual([])
  })

  it("classe chaque appelant exactement une fois — jamais un silence", () => {
    const verdicts = appelantsDePostgrest()
    const muets = verdicts.filter((v) => !estClasse(v.state))
    expect(
      muets.map((v) => `${v.state} — ${v.path} : ${v.detail}`),
      "un fichier atteint PostgREST sans échappement ni raison écrite",
    ).toEqual([])
  })

  it("garde l'échappement sur les deux bras qui passent par PostgREST", () => {
    // The regression this exists against, and it is the whole ticket: `eval:anon` and
    // `verify:mcp` commit with the real publishable key. Named here rather than left to the
    // rule above, because their escapement is not a classification — it is the fix of #72.
    const verdicts = appelantsDePostgrest()
    for (const path of ["scripts/eval/anon-http.ts", "mcp-server/src/supabase.ts"]) {
      expect(verdicts.find((v) => v.path === path)?.state, `${path} ne pose plus l'échappement`).toBe(
        "echappe",
      )
    }
    // The MCP server does not pose it on its own: `verify.ts` puts COMPASS_OBSERVABILITE in the
    // child's environment, and a client that ignored the variable would leave the header off.
    const verify = code(readFileSync(resolve(ROOT, "mcp-server/src/verify.ts"), "utf8"))
    expect(declaresEscapement(verify)).toBe(true)
  })

  it("n'accepte aucune raison vague dans observabilite.json", () => {
    for (const [path, reason] of Object.entries(readReasons())) {
      expect(reason.trim().length, `raison trop courte pour ${path}`).toBeGreaterThan(80)
    }
  })
})
