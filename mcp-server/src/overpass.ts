// Minimal Overpass client for the MCP server.
//
// A sibling of src/services/opendata/overpass.ts, not an import of it: that module
// caches in sessionStorage, which does not exist here, and reaches into the front's own
// types. The query and the tag-to-category mapping are the same domain knowledge — which
// OSM tags mean "schools", "groceries", and so on — reimplemented rather than shared, so
// this package stays a genuinely separate consumer of `src/core`, the one the plan commits
// to, instead of a hidden dependency on front-owned code.
//
// Amenities and roads only. Premises come from compass_scoring_context_within instead
// (context.ts) — BDCom vacancy is the authoritative source the front does not use yet,
// not OSM's `shop=vacant` tag.

import type { Amenity, AmenityCategory, Road } from "../../src/core"

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

interface OverpassElement {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
  remark?: string
}

const ROAD_WEIGHT: Record<string, number> = {
  motorway: 4,
  trunk: 3.5,
  primary: 3,
  secondary: 2,
}

function buildQuery(lat: number, lng: number, radiusM: number): string {
  const around = `(around:${radiusM},${lat},${lng})`
  return `[out:json][timeout:60];
(
  nwr["amenity"~"^(school|college|kindergarten|university)$"]${around};
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]${around};
  nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|butcher)$"]${around};
  nwr["leisure"~"^(park|garden|playground)$"]${around};
  nwr["railway"="station"]${around};
  nwr["railway"="subway_entrance"]${around};
  nwr["highway"="bus_stop"]${around};
  way["highway"~"^(motorway|trunk|primary|secondary)$"]${around};
);
out center tags;`
}

function elementPosition(el: OverpassElement): { lat: number; lng: number } | null {
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (typeof lat !== "number" || typeof lng !== "number") return null
  return { lat, lng }
}

function categorise(tags: Record<string, string>): AmenityCategory | "road" | null {
  if (tags.highway && ["motorway", "trunk", "primary", "secondary"].includes(tags.highway)) {
    return "road"
  }
  const amenity = tags.amenity
  if (amenity && ["school", "college", "kindergarten", "university"].includes(amenity)) {
    return "schools"
  }
  if (amenity && ["hospital", "clinic", "doctors", "pharmacy"].includes(amenity)) {
    return "healthcare"
  }
  if (tags.shop && ["supermarket", "convenience", "greengrocer", "bakery", "butcher"].includes(tags.shop)) {
    return "groceries"
  }
  if (tags.leisure && ["park", "garden", "playground"].includes(tags.leisure)) {
    return "parks"
  }
  if (tags.railway === "station" || tags.railway === "subway_entrance" || tags.highway === "bus_stop") {
    return "transit"
  }
  return null
}

export interface OverpassAmenitySnapshot {
  amenities: Amenity[]
  roads: Road[]
}

/** Short-lived in-memory cache: the server is a long-running process, unlike the browser. */
const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; value: OverpassAmenitySnapshot }>()

function cacheKey(lat: number, lng: number, radiusM: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)},${radiusM}`
}

/** Amenities and major roads within a radius. Throws if every mirror fails. */
export async function fetchOverpassAmenities(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<OverpassAmenitySnapshot> {
  const key = cacheKey(lat, lng, radiusM)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const query = buildQuery(lat, lng, radiusM)
  let data: OverpassResponse | null = null
  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 70000)
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }).toString(),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Overpass responded ${response.status}`)
        const payload = (await response.json()) as OverpassResponse
        // Overpass reports its own failures in-band: a query that times out or exhausts
        // memory answers HTTP 200 with elements: [] and a `remark`. Treating that as an
        // empty neighbourhood would turn an outage into a measured zero.
        if (typeof payload.remark === "string" && payload.remark.trim()) {
          throw new Error(`Overpass remark: ${payload.remark}`)
        }
        if (!Array.isArray(payload.elements)) throw new Error("Overpass response had no elements")
        data = payload
      } finally {
        clearTimeout(timer)
      }
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!data) throw lastError instanceof Error ? lastError : new Error("Overpass unavailable")

  const amenities: Amenity[] = []
  const roads: Road[] = []
  for (const el of data.elements) {
    const tags = el.tags ?? {}
    const position = elementPosition(el)
    if (!position) continue
    const category = categorise(tags)
    if (!category) continue
    if (category === "road") {
      roads.push({ ...position, weight: ROAD_WEIGHT[tags.highway ?? ""] ?? 1 })
    } else {
      amenities.push({ ...position, category })
    }
  }

  const value: OverpassAmenitySnapshot = { amenities, roads }
  cache.set(key, { at: Date.now(), value })
  return value
}
