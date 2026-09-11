/**
 * The slug of a context page, and the address it came from — w6-contexte (#119).
 *
 * A context page is addressed by a slug derived from the BAN label, with the coordinates
 * carried in the query string so a visit does not pay for a second geocoding. Both halves
 * must survive a round trip: a URL typed by hand, with no coordinates, has to geocode again,
 * and it can only do that from the slug.
 *
 * Kept out of `src/core/` on purpose: this is a routing concern, not a measurement one, and
 * `src/core` is the module the MCP server compiles against. It is kept out of the page for the
 * opposite reason — a pure function is testable without a router.
 */

import { localizePath } from '@/i18n/routes';

/**
 * Slug of an address label.
 *
 * Accents are folded rather than percent-encoded: « Boulevard de Sébastopol » must not become
 * `s%C3%A9bastopol` in a URL a human is expected to read, and BAN answers the unaccented
 * spelling just as well.
 */
export function toSlug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The search text a slug came from.
 *
 * Not the original label: capitalisation and accents are gone for good, and inventing them
 * back would produce a string that looks measured and is not. What comes out is a query for
 * the Base Adresse Nationale, which is the only thing that can return the real label.
 */
export function fromSlug(slug: string): string {
  return slug.replace(/-+/g, ' ').trim();
}

/** True when the slug can be resolved at all — an empty or punctuation-only path segment
 *  would otherwise be sent to BAN as an empty query and come back with anything. */
export const isResolvableSlug = (slug: string | undefined): slug is string =>
  typeof slug === 'string' && fromSlug(slug).length > 2;

/**
 * Path of a context page, coordinates included.
 *
 * The English tree mounts this route under `/en/context/` rather than `/en/contexte/`. That
 * exception used to be spelled out here; it now lives in `src/i18n/routes.ts` alongside the
 * one `/carte` needs, so this builder only has to add the slug and the coordinates.
 */
export function contextPath(
  label: string,
  point: { lat: number; lng: number } | null,
  locale: 'fr' | 'en' = 'fr',
): string {
  const path = localizePath(`/contexte/${toSlug(label)}`, locale);
  if (!point) return path;
  // Six decimals is ~0.1 m: enough to name a doorway, short enough to stay readable.
  return `${path}?lat=${point.lat.toFixed(6)}&lng=${point.lng.toFixed(6)}`;
}

/** Coordinates carried by a query string, or null when either one is absent or unreadable.
 *  Half a point is not a point: a lone latitude would silently score the Greenwich meridian. */
export function pointFromParams(
  params: URLSearchParams,
  latKey = 'lat',
  lngKey = 'lng',
): { lat: number; lng: number } | null {
  const lat = Number(params.get(latKey));
  const lng = Number(params.get(lngKey));
  if (!params.get(latKey) || !params.get(lngKey)) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Query keys of the second address. Named once so the reader and the writer cannot drift. */
export const COMPARE_KEYS = { slug: 'compare', lat: 'clat', lng: 'clng' } as const;

/**
 * The second address a URL asks to compare against — w6-contexte (#119), step 6.
 *
 * **Three outcomes, and the third is the point.** A query string is a multimap: `?compare=a&
 * compare=b&compare=c` is perfectly legal, and `URLSearchParams.get` would quietly answer « a ».
 * That silent truncation is how a bound of two becomes a bound of two *by accident* — it holds
 * until someone notices the first value wins and starts relying on it, or until a framework
 * changes which value `get` returns.
 *
 * So the plural is READ and REFUSED, in the open. Compass takes one second address or none, and
 * an URL that names several gets neither: choosing one at random would be a ranking nobody
 * asked for, and the refusal of the broker has to be visible at the boundary the broker would
 * actually reach for.
 */
export type SecondAddress =
  | { kind: 'none' }
  | { kind: 'refus'; count: number }
  | { kind: 'one'; slug: string; point: { lat: number; lng: number } | null };

export function secondAddressFromParams(params: URLSearchParams): SecondAddress {
  const all = params.getAll(COMPARE_KEYS.slug).filter((s) => s.trim().length > 0);
  if (all.length === 0) return { kind: 'none' };
  if (all.length > 1) return { kind: 'refus', count: all.length };
  const slug = all[0];
  if (!isResolvableSlug(slug)) return { kind: 'none' };
  return { kind: 'one', slug, point: pointFromParams(params, COMPARE_KEYS.lat, COMPARE_KEYS.lng) };
}

/**
 * The same sheet, with a second address attached — or with it removed when `label` is null.
 *
 * Built by rewriting the existing query rather than by appending: appending is exactly how a
 * third `compare=` ends up in the URL, and the refusal above would then be the only thing
 * standing between a user and a list. The bound is enforced twice, on purpose.
 */
export function withComparison(
  search: string,
  label: string | null,
  point: { lat: number; lng: number } | null,
): string {
  const params = new URLSearchParams(search);
  params.delete(COMPARE_KEYS.slug);
  params.delete(COMPARE_KEYS.lat);
  params.delete(COMPARE_KEYS.lng);
  if (label !== null) {
    params.set(COMPARE_KEYS.slug, toSlug(label));
    if (point) {
      params.set(COMPARE_KEYS.lat, point.lat.toFixed(6));
      params.set(COMPARE_KEYS.lng, point.lng.toFixed(6));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
