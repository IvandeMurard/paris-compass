import { describe, expect, it } from "vitest"

import { classify, QUERY_CANCELED, UpstreamTimeout } from "./upstream"

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
