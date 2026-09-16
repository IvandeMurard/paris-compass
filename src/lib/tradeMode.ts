/**
 * The trade mode in the URL — w6-modes (#36).
 *
 * **Why the URL and not component state.** A mode is part of what the visitor is looking at:
 * a sheet read as a restaurateur and the same sheet read as a shopkeeper show the axes in two
 * orders and two different checklists, and a link that loses that shows the wrong one. The
 * comparison key already lives here for the same reason (`addressSlug.ts`), and the sheet is
 * `noindex`, so nothing is being multiplied in a search index by this.
 *
 * **The plural is read and refused**, exactly as `secondAddressFromParams` refuses several
 * `compare=` keys and for the same reason: `URLSearchParams.get` would silently answer the
 * first of `?mode=boutique&mode=artisanat`, and a bound that holds by accident holds until it
 * does not. Two modes at once is a dashboard, which is what the ticket's *Pourquoi* refuses.
 *
 * An unknown value falls back to no mode rather than to a default trade. Defaulting would put
 * a restaurateur's reading order in front of someone who asked for nothing, and the sheet's own
 * order — the core's — is the one that belongs to no trade.
 */

import { isTradeMode, type TradeMode } from '@/core';

/** The query key. Named once so the reader and the writer cannot drift. */
export const MODE_KEY = 'mode';

export function tradeModeFromParams(params: URLSearchParams): TradeMode | null {
  const all = params.getAll(MODE_KEY).filter((value) => value.trim().length > 0);
  if (all.length !== 1) return null;
  return isTradeMode(all[0]) ? all[0] : null;
}

/**
 * The same sheet, read in another mode — or in none when `mode` is null.
 *
 * Rewrites the key rather than appending it, so a second `mode=` cannot accumulate across
 * three clicks. The rest of the query — the coordinates, the compared address — is carried
 * through untouched: switching mode must not cost the reader the address they attached.
 */
export function withTradeMode(search: string, mode: TradeMode | null): string {
  const params = new URLSearchParams(search);
  params.delete(MODE_KEY);
  if (mode !== null) params.set(MODE_KEY, mode);
  const query = params.toString();
  return query ? `?${query}` : '';
}
