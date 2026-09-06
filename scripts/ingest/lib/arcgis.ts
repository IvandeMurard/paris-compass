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

export interface ArcGisFeature<T> {
  attributes: T
  /**
   * `unknown`, not `number`, and the difference is the whole of #68.
   *
   * The wire does not send a number when the feature has no point: the APUR 2020
   * layer answers `{"x":"NaN","y":"NaN"}` — the STRING "NaN", which is how Esri
   * JSON spells an absent point geometry (`f=geojson` spells the same absence
   * `"coordinates":[]`). Declaring the field `number` did not make it one; it
   * only made every reader downstream believe the check had already happened,
   * and fifteen premises reached `premise_location` as POINT(NaN NaN).
   *
   * Read it with `featurePoint` below rather than reaching in.
   */
  geometry?: { x: unknown; y: unknown }
}

/**
 * A finite ordinate, or null — the one place this pipeline decides what counts
 * as a coordinate.
 *
 * `Number()` is not a validation: it turns "NaN" into NaN, "" into 0 and null
 * into 0, and every one of those is a premise placed somewhere it is not. So
 * the empty and absent cases are refused before the conversion, and the result
 * is refused unless it is finite.
 */
function ordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * The point of a feature, or null when the service declares it has none.
 *
 * HALF A POINT IS NOT A POINT. If either ordinate is unusable the whole point
 * is absent: a premise at (652830, NaN) is not somewhere with one coordinate
 * missing, it is nowhere, and keeping the half that parsed would be the same
 * fabrication in a quieter form.
 */
export function featurePoint<T>(feature: ArcGisFeature<T>): { x: number; y: number } | null {
  const x = ordinate(feature.geometry?.x)
  const y = ordinate(feature.geometry?.y)
  return x === null || y === null ? null : { x, y }
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
