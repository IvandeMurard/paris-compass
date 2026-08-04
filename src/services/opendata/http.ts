/**
 * Minimal fetch helper for public open-data APIs:
 * timeout, JSON parsing and a short-lived sessionStorage cache.
 */

const CACHE_PREFIX = 'compass-od:';

interface CacheEntry<T> {
  t: number;
  v: T;
}

function readCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.t > maxAgeMs) return null;
    return entry.v;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* quota exceeded — caching is best effort */
  }
}

export interface FetchOptions {
  cacheKey?: string;
  maxAgeMs?: number;
  timeoutMs?: number;
  init?: RequestInit;
  /** Reject (and skip caching) responses that parsed fine but carry no usable payload. */
  validate?: (data: unknown) => boolean;
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { cacheKey, maxAgeMs = 30 * 60 * 1000, timeoutMs = 30000, init, validate } = options;

  if (cacheKey) {
    const cached = readCache<T>(cacheKey, maxAgeMs);
    if (cached !== null) return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Open data request failed [${response.status}] ${url} ${body.slice(0, 200)}`);
    }
    const data = (await response.json()) as T;
    if (validate && !validate(data)) {
      throw new Error(`Open data response was empty or invalid: ${url}`);
    }
    if (cacheKey) writeCache(cacheKey, data);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Great-circle distance in metres. */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
