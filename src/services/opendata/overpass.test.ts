/**
 * Overpass does not fail with an HTTP status.
 *
 * A query that times out or runs out of memory answers 200 with `elements: []` and a
 * `remark`. Read naively, that is a neighbourhood with no shops, no schools and no roads —
 * and the scoring core, asked to score it, returns a measured zero everywhere and a "very
 * low" noise reading. An outage would present as a quiet, empty street.
 *
 * `fetchJson` is doubled rather than the network: the behaviour under test is the contract
 * between this module's `validate` and the mirror loop, so the double applies `validate`
 * exactly as `http.ts` does, and nothing else.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FetchOptions } from './http';

const fetchJson = vi.hoisted(() => vi.fn());
vi.mock('./http', () => ({ fetchJson }));

const { fetchOverpassSnapshot, MIRROR_TIMEOUT_MS } = await import('./overpass');

const BBOX = { south: 48.86, west: 2.34, north: 48.87, east: 2.35 };

/** `clothes` on purpose: a bakery would categorise as a groceries amenity, not a premise. */
const A_SHOP = {
  type: 'node',
  id: 1,
  lat: 48.865,
  lon: 2.347,
  tags: { shop: 'clothes', name: 'Prêt-à-porter' },
};

/** Queue one payload per mirror, in the order the endpoints are tried. */
function queue(...payloads: unknown[]) {
  fetchJson.mockImplementation(async (_url: string, options: FetchOptions = {}) => {
    const payload = payloads.shift();
    if (options.validate && !options.validate(payload)) {
      throw new Error('Open data response was empty or invalid');
    }
    return payload;
  });
}

beforeEach(() => {
  fetchJson.mockReset();
});

describe('fetchOverpassSnapshot', () => {
  it('accepts a genuinely empty answer', async () => {
    queue({ elements: [] });

    const snapshot = await fetchOverpassSnapshot(BBOX);

    expect(snapshot.premises).toEqual([]);
    expect(snapshot.pois).toEqual([]);
    // Empty, but loaded — which is what lets the core score it as a real zero.
    expect(snapshot.loaded).toEqual(['amenities', 'roads', 'premises']);
  });

  it('refuses an answer carrying a remark, however well-formed', async () => {
    const timedOut = { elements: [], remark: 'runtime error: Query timed out in "query" at line 3' };
    queue(timedOut, timedOut, timedOut);

    await expect(fetchOverpassSnapshot(BBOX)).rejects.toThrow();
    expect(fetchJson).toHaveBeenCalledTimes(3);
  });

  it('falls through to the next mirror rather than scoring the failure', async () => {
    queue({ elements: [], remark: 'runtime error: Query run out of memory' }, { elements: [A_SHOP] });

    const snapshot = await fetchOverpassSnapshot(BBOX);

    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(snapshot.premises).toHaveLength(1);
    expect(snapshot.premises[0].status).toBe('occupied');
  });

  it('donne à chaque miroir le temps qui reste, jamais soixante-dix secondes de plus', async () => {
    // The caller asked for an answer within a delay. If the first mirror eats most of it, the
    // second must not be handed a fresh seventy-second timeout — that is how three mirrors
    // turned a ten-second contract into 2 min 20 (`#156`, `DIAGNOSTIC.md` §50).
    const walk = async (spentPerMirror: number) => {
      const timeouts: (number | undefined)[] = [];
      let clock = 0;
      fetchJson.mockImplementation(async (_url: string, options: FetchOptions = {}) => {
        timeouts.push(options.timeoutMs);
        clock += spentPerMirror;
        throw new Error('mirror refused');
      });
      const now = vi.spyOn(Date, 'now').mockImplementation(() => clock);
      await expect(fetchOverpassSnapshot(BBOX, { budgetMs: 10000 })).rejects.toThrow();
      now.mockRestore();
      return timeouts;
    };

    // Mirrors that fail quickly: each is tried, each with what is actually left.
    expect(await walk(4000)).toEqual([10000, 6000, 2000]);
    // A first mirror that eats the whole budget: there is no second attempt at all. That is
    // the point — the caller asked for an answer within a delay, not for three tries.
    expect(await walk(10000)).toEqual([10000]);
  });

  it('laisse la marche entière quand aucun budget n’est donné', async () => {
    // `/carte` keeps this: the visitor asked for OpenStreetMap data and the map IS the screen.
    const timeouts: (number | undefined)[] = [];
    fetchJson.mockImplementation(async (_url: string, options: FetchOptions = {}) => {
      timeouts.push(options.timeoutMs);
      throw new Error('mirror refused');
    });

    await expect(fetchOverpassSnapshot(BBOX)).rejects.toThrow();

    expect(timeouts).toEqual([MIRROR_TIMEOUT_MS, MIRROR_TIMEOUT_MS, MIRROR_TIMEOUT_MS]);
  });

  it('rend l’instantané d’un miroir qui répond dans le budget', async () => {
    // The budget bounds the wait, it does not refuse an answer that arrives inside it.
    queue({ elements: [A_SHOP] });

    const snapshot = await fetchOverpassSnapshot(BBOX, { budgetMs: 10000 });

    expect(snapshot.premises).toHaveLength(1);
  });

  it('declares every layer it loaded, so the core never has to infer it', async () => {
    queue({ elements: [A_SHOP] });

    const snapshot = await fetchOverpassSnapshot(BBOX);

    // No road and no amenity came back, yet both layers are declared loaded: they were
    // fetched by the same union query and genuinely hold nothing here.
    expect(snapshot.roads).toEqual([]);
    expect(snapshot.loaded).toContain('roads');
    expect(snapshot.loaded).toContain('amenities');
  });
});
