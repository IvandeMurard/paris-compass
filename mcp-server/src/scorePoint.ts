// Shared by score_location and compare_locations — one point in, one AreaScores out, with
// the context-build failures surfaced alongside rather than swallowed into a false zero.

import {
  asWithholding,
  composeVerdict,
  findingsFromScores,
  scoreLocation,
  type AreaScores,
  type Layer,
  type Verdict,
  type Withholding,
} from "../../src/core"
import { buildNeighbourhoodContext } from "./context"
import { recordQuestion, type QuestionOutcome } from "./record"

export interface ScorePointResult {
  scores: AreaScores
  failures: { layer: Layer; reason: string; motif: QuestionOutcome }[]
  /**
   * The one-sentence verdict — w6-contexte (#119), criterion 2.
   *
   * Composed by `src/core/verdict.ts`, the same function `/contexte/:slug` calls, and NOT by
   * anything in this package. That is the whole of « la même réponse pour un agent »: a
   * sentence assembled here would be a second implementation of a rule published on the
   * methodology page, and the two would agree exactly until the first reword.
   *
   * It is returned ALONGSIDE `scores` and never instead of them. An agent that wants to
   * re-derive the sentence has every figure it was built from, which is what makes the parity
   * checkable rather than merely asserted — `verify.ts` recomposes it from the published
   * figures and compares.
   */
  verdict: Verdict
}

/**
 * The structured withholding of each layer that failed, keyed by layer.
 *
 * `QuestionOutcome` is a wider vocabulary than `Withholding` — it also carries `repondu`,
 * `vide` and `erreur`, which are not absences — so the narrowing goes through the core's own
 * `asWithholding` rather than a mapping written here. A fifth cause added to one vocabulary is
 * then classified by the other on the same day, instead of silently falling through to a
 * default nobody revisits.
 */
export function withheldByLayer(
  failures: readonly { layer: Layer; motif: QuestionOutcome }[],
): Partial<Record<Layer, Withholding>> {
  const withheld: Partial<Record<Layer, Withholding>> = {}
  for (const failure of failures) withheld[failure.layer] = asWithholding(failure.motif)
  return withheld
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

  const verdict = composeVerdict(findingsFromScores(scores, withheldByLayer(failures)))

  return { scores, failures, verdict }
}
