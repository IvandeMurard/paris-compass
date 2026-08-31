// The repository is public and so is every issue the scheduled gate opens — #71.
//
// The fixtures below are real lines, copied from the 31 August 2026 run of the three arms.
// A redaction tested on invented strings tests the imagination of whoever wrote it.

import { describe, expect, it } from "vitest"

import { carriesDatabaseIdentifier, MASKED_HOST, MASKED_REF, redact } from "./redaction"

const CIBLE = "[20:04:27] CIBLE — dbefhvmyfmmhjeetdddu via aws-1-eu-west-1.pooler.supabase.com"
const VERDICT =
  "[20:09:31] AVERTISSEMENT — 11 écart(s) sous le seuil bloquant — dbefhvmyfmmhjeetdddu via aws-1-eu-west-1.pooler.supabase.com"
const ANON = "PASS — la règle de licence tient pour un visiteur sans clé, 15 contrôles — dbefhvmyfmmhjeetdddu.supabase.co"

describe("masquage avant publication", () => {
  it("masque la référence de projet nue", () => {
    expect(redact(CIBLE)).toContain(MASKED_REF)
    expect(redact(CIBLE)).not.toContain("dbefhvmyfmmhjeetdddu")
  })

  it("masque l'hôte du pooler", () => {
    expect(redact(CIBLE)).toContain(MASKED_HOST)
    expect(redact(CIBLE)).not.toContain("pooler.supabase.com")
  })

  it("masque l'hôte PostgREST, référence comprise", () => {
    const masked = redact(ANON)
    expect(masked).not.toContain("dbefhvmyfmmhjeetdddu")
    expect(masked).not.toContain("supabase.co")
    expect(carriesDatabaseIdentifier(masked)).toBe(false)
  })

  it("masque une chaîne de connexion entière, mot de passe compris", () => {
    const line = "postgresql://postgres.dbefhvmyfmmhjeetdddu:s3cr3t@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    const masked = redact(line)
    expect(masked).not.toContain("s3cr3t")
    expect(masked).not.toContain("dbefhvmyfmmhjeetdddu")
    expect(carriesDatabaseIdentifier(masked)).toBe(false)
  })

  it("laisse intact ce qui n'est pas un identifiant de base", () => {
    // The gates print figures and identifiers of their own, and a redaction that ate them
    // would make the reports useless — which is its own way of ending up unread.
    const line = "  ok    I1 — une chronologie affirme un fait là où observed = false (95.2s en 22 tranches)"
    expect(redact(line)).toBe(line)
    expect(redact("index-DKJzmj15.js")).toBe("index-DKJzmj15.js")
    expect(redact("60845 relevés visibles = les 60845 du millésime ODbL")).toContain("60845")
  })

  it("répond « oui » tant qu'une forme connue survit, et la question se pose après masquage", () => {
    expect(carriesDatabaseIdentifier(VERDICT)).toBe(true)
    expect(carriesDatabaseIdentifier(redact(VERDICT))).toBe(false)
  })

  it("ne garde pas d'état entre deux questions", () => {
    // `test` on a /g regexp advances lastIndex, and a second call would then answer « non »
    // about the same string. A masking that says yes once and no afterwards is worse than
    // none: it publishes on the second try.
    expect(carriesDatabaseIdentifier(CIBLE)).toBe(true)
    expect(carriesDatabaseIdentifier(CIBLE)).toBe(true)
    expect(carriesDatabaseIdentifier(CIBLE)).toBe(true)
  })
})
