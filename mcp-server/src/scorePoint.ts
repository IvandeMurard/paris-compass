// Shared by score_location and compare_locations — one point in, one AreaScores out, with
// the context-build failures surfaced alongside rather than swallowed into a false zero.

import { scoreLocation, type AreaScores, type Layer } from "../../src/core"
import { buildNeighbourhoodContext } from "./context"

export interface ScorePointResult {
  scores: AreaScores
  failures: { layer: Layer; reason: string }[]
}

export async function scorePoint(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear: number,
): Promise<ScorePointResult> {
  // Origins travel with the context, not with this call: the layers come from two different
  // datasets, and only the builder that chose them can say which is which. Stamping one
  // origin here is what made every figure claim OpenStreetMap, BDCom's included.
  const { index, failures, origins } = await buildNeighbourhoodContext(lat, lng, radiusM, vintageYear)
  const scores = scoreLocation({ lat, lng }, index, origins)
  return { scores, failures }
}
