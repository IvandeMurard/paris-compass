/**
 * The adapter's only real risk is losing information on the way out of the core.
 *
 * It used to unwrap `Measured<number>` into plain numbers, and for a while it did so
 * with `?? 0` — turning "we could not compute this" into a measured zero, the one
 * substitution `src/core/provenance.ts` forbids by name. The unwrapping is gone
 * entirely: provenance now travels to the component, and the rendering rules are tested
 * in `src/components/figureText.test.ts`.
 *
 * What is left to guard here is that nothing is dropped or flattened in transit — which
 * is exactly the regression that would reintroduce the bug.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  motifText,
  OSM_ORIGIN,
  unavailable,
  withValue,
  type AreaScores as CoreScores,
} from '@/core';

const scoreLocation = vi.hoisted(() => vi.fn());

vi.mock('@/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core')>()),
  scoreLocation,
}));

const { computeScores } = await import('./scoring');

const ORIGIN = OSM_ORIGIN('2026-08-10');
const POINT = { lat: 48.8566, lng: 2.3522 };
const INDEX = {} as never;

/** A full core result where every field carries `value`, overridable field by field. */
function coreResult(overrides: Partial<CoreScores> = {}): CoreScores {
  const present = (n: number) => withValue(n, ORIGIN, 'derived');
  return {
    density: present(65),
    services: present(65),
    rail: present(65),
    alimentaire: present(65),
    walkability: present(70),
    schools: present(60),
    healthcare: present(50),
    groceries: present(40),
    parks: present(30),
    transit: present(20),
    footfall: withValue(10, ORIGIN, 'estimated', [{ kind: 'mandataire_passage' }]),
    noise: withValue(5, ORIGIN, 'estimated', [{ kind: 'bruit_modelise' }]),
    ...overrides,
  };
}

describe('computeScores', () => {
  it('hands the core result over without flattening it', () => {
    const result = coreResult();
    scoreLocation.mockReturnValue(result);
    expect(computeScores(POINT, INDEX)).toEqual(result);
  });

  // The regression that would matter: a figure arriving at the card as a bare number,
  // with nothing left to say where it came from or how much to trust it.
  it('keeps source, licence, vintage and method on every score', () => {
    scoreLocation.mockReturnValue(coreResult());
    for (const measured of Object.values(computeScores(POINT, INDEX))) {
      expect(measured.source).toBe(ORIGIN.source);
      expect(measured.licence).toBe(ORIGIN.licence);
      expect(measured.asOf).toBe(ORIGIN.asOf);
      expect(measured.method).toBeTruthy();
    }
  });

  it('keeps the caveat that makes a proxy readable as one', () => {
    scoreLocation.mockReturnValue(coreResult());
    const scores = computeScores(POINT, INDEX);
    expect(scores.footfall.method).toBe('estimated');
    expect(scores.footfall.note).toBe(motifText({ kind: 'mandataire_passage' }, 'en'));
  });

  // Noise used to be unwrapped into its own `{ score, label }` shape, which stripped the
  // caveat from the single figure that most needs it: 0 was labelled "very low", so a
  // missing road layer read as a quiet street.
  it('carries noise as a score with its caveat, not as a bare label', () => {
    scoreLocation.mockReturnValue(coreResult());
    const noise = computeScores(POINT, INDEX).noise;
    expect(noise.value).toBe(5);
    expect(noise.method).toBe('estimated');
    expect(noise.note).toBe(motifText({ kind: 'bruit_modelise' }, 'en'));
  });

  it('lets an absent score through as absent', () => {
    scoreLocation.mockReturnValue(
      coreResult({ noise: unavailable(ORIGIN, { kind: 'couche_absente', layer: 'roads' }) }),
    );
    const noise = computeScores(POINT, INDEX).noise;
    expect(noise.value).toBeNull();
    expect(noise.missingReason).toBe(motifText({ kind: 'couche_absente', layer: 'roads' }, 'en'));
    // Et le motif voyage à côté de la phrase : c'est lui que l'agent lit — #181.
    expect(noise.missing).toEqual({ kind: 'couche_absente', layer: 'roads' });
  });
});
