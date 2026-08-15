// Shared by score_location and compare_locations — one point in, one AreaScores out, with
// the context-build failures surfaced alongside rather than swallowed into a false zero.

import { OSM_ORIGIN, scoreLocation, type AreaScores, type Layer } from "../../src/core"
import { buildNeighbourhoodContext } from "./context"

export interface ScorePointResult {
  scores: AreaScores
  failures: { layer: Layer; reason: string }[]
}

const originForNow = () => OSM_ORIGIN(new Date().toISOString().slice(0, 10))

export async function scorePoint(
  lat: number,
  lng: number,
  radiusM: number,
  vintageYear: number,
): Promise<ScorePointResult> {
  const { index, failures } = await buildNeighbourhoodContext(lat, lng, radiusM, vintageYear)
  const scores = scoreLocation({ lat, lng }, index, originForNow())
  return { scores, failures }
}
