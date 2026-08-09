/**
 * The adapter's only real risk is losing information on the way out of the core.
 *
 * It unwraps `Measured<number>` into the plain numbers the current UI expects, and for a
 * long time it did so with `?? 0` — turning "we could not compute this" into a measured
 * zero, the one substitution `src/core/provenance.ts` forbids by name. The core never
 * returns a null score today, so only a stubbed core can exercise the path; that is the
 * point of the mock below.
 */

import { describe, expect, it, vi } from 'vitest';

import { OSM_ORIGIN, unavailable, withValue, type AreaScores as CoreScores } from '@/core';

const scoreLocation = vi.hoisted(() => vi.fn());

vi.mock('@/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core')>()),
  scoreLocation,
}));

const { computeScores, estimateNoise } = await import('./scoring');

const ORIGIN = OSM_ORIGIN('2026-08-09');
const POINT = { lat: 48.8566, lng: 2.3522 };
const INDEX = {} as never;

/** A full core result where every field carries `value`, overridable field by field. */
function coreResult(overrides: Partial<CoreScores> = {}): CoreScores {
  const present = (n: number) => withValue(n, ORIGIN, 'derived');
  return {
    walkability: present(70),
    schools: present(60),
    healthcare: present(50),
    groceries: present(40),
    parks: present(30),
    transit: present(20),
    footfall: present(10),
    noise: present(5),
    ...overrides,
  };
}

describe('computeScores', () => {
  it('passes the core values through unchanged', () => {
    scoreLocation.mockReturnValue(coreResult());

    expect(computeScores(POINT, INDEX)).toEqual({
      walkability: 70,
      schools: 60,
      healthcare: 50,
      groceries: 40,
      parks: 30,
      transit: 20,
      footfall: 10,
    });
  });

  it('keeps an absent score absent rather than turning it into zero', () => {
    scoreLocation.mockReturnValue(
      coreResult({
        walkability: unavailable(ORIGIN, 'no amenity data covers this point'),
        footfall: unavailable(ORIGIN, 'no premises loaded'),
      }),
    );

    const scores = computeScores(POINT, INDEX);
    expect(scores.walkability).toBeNull();
    expect(scores.footfall).toBeNull();
    // A genuine zero still reads as zero — that is the distinction being defended.
    scoreLocation.mockReturnValue(coreResult({ walkability: withValue(0, ORIGIN, 'derived') }));
    expect(computeScores(POINT, INDEX).walkability).toBe(0);
  });
});

describe('estimateNoise', () => {
  it('labels a score it has', () => {
    scoreLocation.mockReturnValue(coreResult({ noise: withValue(75, ORIGIN, 'estimated') }));
    expect(estimateNoise(POINT, INDEX)).toEqual({ score: 75, label: 'High' });
  });

  it('returns no label at all when there is no score', () => {
    scoreLocation.mockReturnValue(coreResult({ noise: unavailable(ORIGIN, 'no road data') }));

    // The trap this guards: 0 would have been labelled "Very low" — silence, asserted.
    expect(estimateNoise(POINT, INDEX)).toEqual({ score: null, label: null });
  });
});
