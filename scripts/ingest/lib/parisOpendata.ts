// Bulk-export reader for the opendata.paris.fr Explore API (v2.1).
//
// The record endpoint refuses an offset past 10 000, so a paginated read would
// silently truncate any layer larger than that and look like it worked — bulk
// export is the only way to read a whole dataset regardless of its size.

const PORTAL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets"
const USER_AGENT = "paris-compass ingestion (github.com/IvandeMurard/paris-compass)"

export async function exportJson<T>(dataset: string, format: "json" | "geojson"): Promise<T> {
  const url = `${PORTAL}/${dataset}/exports/${format}`
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  return (await response.json()) as T
}

/**
 * The date the portal last processed this dataset — `metas.default.modified` on the
 * catalogue entry, not a field of any record. For a layer with no per-row vintage
 * (a live inventory like this one, or the street network `geography.ts` reads),
 * this is a real, source-stated recency rather than a stand-in for one: it says
 * when the portal's own copy last changed, not when we happened to read it.
 */
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
