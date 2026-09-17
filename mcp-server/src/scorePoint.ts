// Shared by score_location and compare_locations — one point in, one AreaScores out, with
// the context-build failures surfaced alongside rather than swallowed into a false zero.

import { scoreLocation, type AreaScores, type Layer } from "../../src/core"
import { buildNeighbourhoodContext } from "./context"
import { recordQuestion, type QuestionOutcome } from "./record"

export interface ScorePointResult {
  scores: AreaScores
  failures: { layer: Layer; reason: string; motif: QuestionOutcome }[]
}

export async function scorePoint(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear: number,
  /**
   * L'outil qui pose la question — w1-observabilite (#72). La base voit
   * `compass_scoring_context_within` et ne saura jamais si l'appel venait de `score_location`,
   * de `compare_locations` ou d'`explain_score` : ce nom n'existe que dans ce processus.
   * Facultatif pour que ce module reste appelable sans journaliser (les tests, `verify.ts`).
   */
  appelee?: string,
): Promise<ScorePointResult> {
  const debut = Date.now()
  // Origins travel with the context, not with this call: the layers come from two different
  // datasets, and only the builder that chose them can say which is which. Stamping one
  // origin here is what made every figure claim OpenStreetMap, BDCom's included.
  const { index, failures, origins } = await buildNeighbourhoodContext(lat, lng, radiusM, vintageYear)
  const scores = scoreLocation({ lat, lng }, index, origins)

  if (appelee) {
    const latencyMs = Date.now() - debut
    // L'appel, avec son coût. `repondu` même quand une couche manque : la question a reçu une
    // réponse, et c'est la ligne d'axe ci-dessous qui dit ce qui manquait dedans. Confondre les
    // deux ferait passer un score partiel pour une absence de réponse.
    recordQuestion({ appelee, issue: "repondu", lat, lng, radiusM, vintageYear, latencyMs })
    // Un axe par couche tombée, avec SA raison. `layer` est le nom de la couche du noyau —
    // `amenities`, `roads`, `premises` — donc l'axe est nommé par ce qui manque et non par la
    // métrique, qui en dérive : `noise` et `roads` sont la même absence comptée deux fois.
    for (const f of failures) {
      recordQuestion({ appelee, issue: f.motif, lat, lng, radiusM, vintageYear, axe: f.layer })
    }
  }

  return { scores, failures }
}
