// Bulk-export reader for the Île-de-France Mobilités Explore API (v2.1) — the same
// Opendatasoft product as opendata.paris.fr (lib/parisOpendata.ts), on a different portal.
//
// WHY A SEPARATE FILE RATHER THAN A `portal` PARAMETER ON THE EXISTING ONE. The two portals
// share a wire format but not a naming discipline. Every Paris dataset this project reads
// keeps one stable `dataset_id` for its whole life; IDFM's hourly-validation family does not
// — `resolveDataset` below exists only because of that difference, and folding it into
// `parisOpendata.ts` would make every Paris caller carry a resolution step it never needs.
//
// THE TRAP THIS FILE IS BUILT AROUND, measured 7 September 2026 (docs/REPRISE-PIEGES.md).
// IDFM republishes "Validations sur le réseau ferré : Profils horaires par jour type" each
// quarter, and the published `dataset_id` does not settle into one name — three of the four
// results for the same family carry `validations-reseau-ferre-profils-horaires-par-jour-type-
// Neme-trimestre` and the fourth (2e trimestre 2025) is spelled
// `validations-sur-le-reseau-ferre-profils-horaires-par-jour-type-2eme-trimestre-2025`, an
// extra `-sur-le` and a trailing year nothing else in the family carries. Pinning today's id
// the way `chantiers.ts` pins `chantiers-perturbants` would repeat #56 — SIRENE stock's
// resource replaced under a URL this project had written down — the day IDFM names next
// quarter's edition differently again. So the id is never pinned: every run searches the
// catalogue by TITLE instead of id (`resolveDataset` below), because the human title has
// stayed put across every spelling measured so far, and takes the edition the portal itself
// says it touched last.
interface CatalogResult {
  dataset_id?: string
  metas?: { default?: { title?: string; modified?: string } }
}

/**
 * Resolves a dataset by matching its TITLE, not its id — measured 7 September 2026: the
 * `dataset_id` of this family does not settle into one spelling (see the migration header,
 * 20260907000002), while the human title stays put across editions. `q` is a loose full-text
 * search (Opendatasoft tokenises and stems it, so it over-matches — the portal returned 95
 * results for six words), and `titleMatches` narrows the noise down with a predicate the
 * caller writes deliberately rather than a regex hidden in here. Among what matches, the
 * result the portal itself last touched wins; `startswith` on the id was tried first and
 * missed a quarter whose id carried an extra `-sur-le-`.
 */
export async function resolveDataset(
  query: string,
  titleMatches: (title: string) => boolean,
): Promise<string> {
  const url = `${PORTAL}?q=${encodeURIComponent(query)}&limit=100`
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  const body = (await response.json()) as { results?: CatalogResult[] }
  const candidates = (body.results ?? [])
    .filter((r): r is CatalogResult & { dataset_id: string; metas: { default: { title: string; modified?: string } } } =>
      Boolean(r.dataset_id && r.metas?.default?.title && titleMatches(r.metas.default.title)))
    .sort((a, b) => (b.metas.default.modified ?? "").localeCompare(a.metas.default.modified ?? ""))
  const chosen = candidates[0]
  if (!chosen) {
    throw new Error(`aucun titre ne correspond au prédicat, parmi les résultats de la recherche "${query}"`)
  }
  return chosen.dataset_id
}

/** Strips accents and lowercases, so a title predicate does not have to spell out every accent
 * the portal might use across editions (measured: both do, but not identically encoded). */
export function normalizeTitle(title: string): string {
  return title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

const PORTAL = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets"
const USER_AGENT = "paris-compass ingestion (github.com/IvandeMurard/paris-compass)"

/**
 * A dataset's full record set, filtered server-side by an Opendatasoft `where` clause.
 *
 * The record endpoint refuses an offset past 10 000 like the Paris portal's — bulk export is
 * the only way to read a whole layer regardless of size (lib/parisOpendata.ts's own header).
 * The `where` clause exists here and not there because IDFM's reference layers are region-wide
 * — 18 009 zones d'arrêt for all of Île-de-France against 1 440 in Paris — and downloading the
 * region to keep 8 % of it would cost bandwidth this project has no use for.
 */
export async function exportJson<T>(dataset: string, where?: string): Promise<T[]> {
  const query = where ? `?where=${encodeURIComponent(where)}` : ""
  const url = `${PORTAL}/${dataset}/exports/json${query}`
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  return (await response.json()) as T[]
}

/** The date the portal last processed this dataset — same reading as `datasetModified` in
 * lib/parisOpendata.ts, against the IDFM portal's own catalogue entry rather than Paris's. */
export async function datasetModified(dataset: string): Promise<string> {
  const url = `${PORTAL}/${dataset}`
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  const body = (await response.json()) as { metas?: { default?: { modified?: string } } }
  const modified = body.metas?.default?.modified
  if (!modified) {
    throw new Error(`${dataset}: aucune date metas.default.modified dans la réponse du catalogue`)
  }
  return modified.slice(0, 10)
}
