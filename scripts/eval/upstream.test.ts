import { describe, expect, it } from "vitest"

import {
  classify,
  classifyDriverError,
  isUnreachable,
  QUERY_CANCELED,
  unreachableCode,
  UpstreamTimeout,
} from "./upstream"

// #61 — the classification that decides what stops being a failure, and therefore the one
// place where being generous would quietly disarm the licence gate. The bodies below are
// what PostgREST actually returned on 26 August 2026, kept verbatim.

const CANCELED = JSON.stringify({
  code: QUERY_CANCELED,
  details: null,
  hint: null,
  message: "canceling statement due to statement timeout",
})

describe("classify", () => {
  it("reconnaît une annulation serveur comme une panne amont", () => {
    const error = classify(500, CANCELED, "premises_within 2023")
    expect(error).toBeInstanceOf(UpstreamTimeout)
    expect(error.message).toContain(QUERY_CANCELED)
  })

  it("ne prend pas un 500 quelconque pour une annulation", () => {
    const error = classify(500, JSON.stringify({ code: "42501", message: "permission denied" }), "x")
    expect(error).not.toBeInstanceOf(UpstreamTimeout)
    expect(error.message).toContain("42501")
  })

  // The half that matters: a leak reaching the gate as a 4xx, or as a body that merely
  // mentions the number, must stay a failure. A substring match would have swallowed both.
  it("ne se laisse pas prendre par un corps qui cite seulement le code", () => {
    const error = classify(500, JSON.stringify({ code: "42501", message: `voisin de ${QUERY_CANCELED}` }), "x")
    expect(error).not.toBeInstanceOf(UpstreamTimeout)
  })

  it("ne classe pas un code d'erreur hors 500 en panne amont", () => {
    expect(classify(400, CANCELED, "x")).not.toBeInstanceOf(UpstreamTimeout)
    expect(classify(403, CANCELED, "x")).not.toBeInstanceOf(UpstreamTimeout)
  })

  it("laisse un corps illisible remonter comme un échec", () => {
    const error = classify(500, "<html>502 Bad Gateway</html>", "premises_within 2023")
    expect(error).not.toBeInstanceOf(UpstreamTimeout)
    expect(error.message).toContain("premises_within 2023")
  })
})

// #69 — the same decision on the driver side, for the gates holding a database connection.
// Arm A of `npm.cmd run eval` reaches it with what `pg` throws rather than an HTTP body.
describe("classifyDriverError", () => {
  /** What `pg` throws on a server-side cancellation, reduced to the field that decides. */
  const canceled = Object.assign(new Error("canceling statement due to statement timeout"), {
    code: QUERY_CANCELED,
  })

  it("reconnaît une annulation serveur comme une panne amont", () => {
    const error = classifyDriverError(canceled, "I1", 60_000)
    expect(error).toBeInstanceOf(UpstreamTimeout)
    expect(error.message).toContain("I1")
    expect(error.message).toContain("60000")
  })

  it("ne prend pas une erreur de droits pour une annulation", () => {
    const denied = Object.assign(new Error("permission denied"), { code: "42501" })
    expect(classifyDriverError(denied, "I1", 60_000)).not.toBeInstanceOf(UpstreamTimeout)
  })

  // The half that matters: an invariant whose own OUTPUT quotes the code must stay the
  // failure it is. Testing the message text instead of `code` would have swallowed it.
  it("ne se laisse pas prendre par un message qui cite seulement le code", () => {
    const quoting = Object.assign(new Error(`la ligne fautive contient ${QUERY_CANCELED}`), {
      code: "42501",
    })
    expect(classifyDriverError(quoting, "I1", 60_000)).not.toBeInstanceOf(UpstreamTimeout)
  })

  it("laisse remonter une erreur sans code comme l'échec qu'elle est", () => {
    const error = classifyDriverError(new Error("connexion perdue"), "I1", 60_000)
    expect(error).not.toBeInstanceOf(UpstreamTimeout)
    expect(error.message).toBe("connexion perdue")
  })
})

// #71 — the same decision one level out: an endpoint that never answered. The scheduled gate
// wakes a human on a red every morning, so a network blip that reached the report as an ERROR
// would open an issue, then another, and the alert would be muted inside a fortnight.
describe("isUnreachable", () => {
  it("reconnaît une erreur de socket comme une panne amont", () => {
    for (const code of ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]) {
      const error = Object.assign(new Error(`connect ${code}`), { code })
      expect(isUnreachable(error), code).toBe(true)
      expect(unreachableCode(error)).toBe(code)
    }
  })

  it("reconnaît la classe 08 de Postgres", () => {
    expect(isUnreachable(Object.assign(new Error("connection failure"), { code: "08006" }))).toBe(true)
  })

  it("déballe la cause que fetch enveloppe", () => {
    // `fetch` raises `TypeError: fetch failed` and hides the real code underneath. Reading only
    // the top level would have made every DNS failure of eval:anon an ERROR.
    const wrapped = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }),
    })
    expect(isUnreachable(wrapped)).toBe(true)
    expect(unreachableCode(wrapped)).toBe("ENOTFOUND")
  })

  it("ne prend pas un défaut du dépôt pour une panne amont", () => {
    expect(isUnreachable(Object.assign(new Error("permission denied"), { code: "42501" }))).toBe(false)
    expect(isUnreachable(new Error("I9 a rendu 12 lignes"))).toBe(false)
    expect(isUnreachable(null)).toBe(false)
  })

  it("ne se laisse pas prendre par un message qui cite seulement le code", () => {
    // Same narrowness as classify and classifyDriverError, and for the same reason: this is a
    // decision that makes things stop being failures.
    expect(isUnreachable(new Error("la sortie fautive contient ECONNREFUSED"))).toBe(false)
  })

  it("survit à une chaîne de causes cyclique", () => {
    const a = Object.assign(new Error("a"), { cause: undefined as unknown })
    const b = Object.assign(new Error("b"), { cause: a })
    a.cause = b
    expect(isUnreachable(a)).toBe(false)
  })
})
