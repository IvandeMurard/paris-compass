// Paginated reader for the APUR ArcGIS services.
//
// The layers cap a single response at 1000 or 2000 features and advertise it as
// `maxRecordCount`. Asking for more silently truncates and sets
// `exceededTransferLimit`, so a naive one-shot fetch of BDCom returns the first
// thousand premises and looks like it worked. Everything here pages explicitly
// and refuses to stop early.

export interface QueryOptions {
  where?: string
  outFields?: string
  /** Ask the server for WGS 84 so we never reproject Lambert 93 by hand. */
  outSR?: number
  returnGeometry?: boolean
  pageSize?: number
  /** Called after each page; lets a long load report progress. */
  onPage?: (fetched: number, total: number) => void
}

interface ArcGisFeature<T> {
  attributes: T
  geometry?: { x: number; y: number }
}

interface ArcGisResponse<T> {
  features?: ArcGisFeature<T>[]
  exceededTransferLimit?: boolean
  error?: { message?: string; details?: string[] }
}

const USER_AGENT = "paris-compass ingestion (github.com/IvandeMurard/paris-compass)"

async function get<T>(url: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ f: "json", ...params })
  const response = await fetch(`${url}?${query}`, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  const payload = (await response.json()) as T & { error?: { message?: string } }
  // ArcGIS reports failures inside a 200 body, so status alone proves nothing.
  if (payload.error) throw new Error(`${url}: ${payload.error.message ?? "unknown error"}`)
  return payload
}

/** Total number of features matching `where`, asked of the server rather than counted. */
export async function count(layerUrl: string, where = "1=1"): Promise<number> {
  const payload = await get<{ count: number }>(`${layerUrl}/query`, {
    where,
    returnCountOnly: "true",
  })
  return payload.count
}

/**
 * Every feature matching the query, yielded one page at a time.
 *
 * A generator rather than an array because BDCom is ~230 000 features across the
 * three vintages: the caller flushes each page to Postgres and never holds the
 * whole census in memory.
 *
 * Throws if a page comes back empty before the announced total is reached,
 * rather than returning a short result a caller would mistake for a full layer.
 */
export async function* queryPages<T extends Record<string, unknown>>(
  layerUrl: string,
  options: QueryOptions = {},
): AsyncGenerator<ArcGisFeature<T>[], void, void> {
  const {
    where = "1=1",
    outFields = "*",
    outSR,
    returnGeometry = false,
    pageSize = 1000,
    onPage,
  } = options

  const total = await count(layerUrl, where)
  let fetched = 0

  while (fetched < total) {
    const params: Record<string, string> = {
      where,
      outFields,
      returnGeometry: String(returnGeometry),
      resultOffset: String(fetched),
      resultRecordCount: String(pageSize),
      orderByFields: "OBJECTID",
    }
    if (outSR) params.outSR = String(outSR)

    const page = await get<ArcGisResponse<T>>(`${layerUrl}/query`, params)
    const features = page.features ?? []
    if (features.length === 0) {
      throw new Error(
        `${layerUrl}: empty page at offset ${fetched} of ${total}. ` +
          `Refusing to report a partial layer as complete.`,
      )
    }

    fetched += features.length
    onPage?.(fetched, total)
    yield features
  }

  if (fetched !== total) {
    throw new Error(`${layerUrl}: expected ${total} features, collected ${fetched}.`)
  }
}

/** Convenience wrapper for small layers where holding everything is fine. */
export async function queryAll<T extends Record<string, unknown>>(
  layerUrl: string,
  options: QueryOptions = {},
): Promise<ArcGisFeature<T>[]> {
  const collected: ArcGisFeature<T>[] = []
  for await (const page of queryPages<T>(layerUrl, options)) collected.push(...page)
  return collected
}

/** Coded domains (code -> label) declared on a layer's fields. */
export async function codedDomains(
  layerUrl: string,
): Promise<Record<string, Map<string, string>>> {
  const layer = await get<{
    fields?: { name: string; domain?: { codedValues?: { code: string | number; name: string }[] } }[]
  }>(layerUrl, {})

  const domains: Record<string, Map<string, string>> = {}
  for (const field of layer.fields ?? []) {
    const values = field.domain?.codedValues
    if (!values?.length) continue
    domains[field.name] = new Map(values.map((v) => [String(v.code), v.name]))
  }
  return domains
}
