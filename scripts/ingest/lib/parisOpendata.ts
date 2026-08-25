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
