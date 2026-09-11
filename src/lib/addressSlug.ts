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
export function pointFromParams(params: URLSearchParams): { lat: number; lng: number } | null {
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (!params.get('lat') || !params.get('lng')) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
