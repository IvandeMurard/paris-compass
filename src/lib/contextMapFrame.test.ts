import { describe, expect, it } from 'vitest';
import { FOOTFALL_RADIUS_M, boundsCoverRadius } from '@/core';
import { contextMapFrame } from './contextMapFrame';

/** Rue de Bretagne — the address the production failure of `#156` was measured on. */
const BRETAGNE = { lat: 48.8631, lng: 2.3621 };

describe('contextMapFrame', () => {
  it('encadre exactement le rayon que le constat de passage lit', () => {
    const frame = contextMapFrame(BRETAGNE, FOOTFALL_RADIUS_M);
    expect(frame.kind).toBe('cadre');
    if (frame.kind !== 'cadre') return;

    // The circle drawn and the circle counted are the same circle. `boundsCoverRadius` is the
    // core's own test of that, so the day either side of the arithmetic moves, this fails
    // rather than the picture quietly ceasing to match the figure.
    expect(boundsCoverRadius(BRETAGNE, FOOTFALL_RADIUS_M, frame.bounds)).toBe(true);
    expect(frame.center).toEqual(BRETAGNE);
  });

  it('refuse un point qui n’est pas un point', () => {
    for (const point of [
      { lat: Number.NaN, lng: 2.3621 },
      { lat: 48.8631, lng: Number.NaN },
      { lat: Number.POSITIVE_INFINITY, lng: 2.3621 },
      { lat: 91, lng: 2.3621 },
      { lat: 48.8631, lng: 181 },
    ]) {
      const frame = contextMapFrame(point, FOOTFALL_RADIUS_M);
      expect(frame).toEqual({ kind: 'refus', because: 'point' });
    }
  });

  it('refuse un rayon qui n’est pas une longueur', () => {
    for (const radius of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(contextMapFrame(BRETAGNE, radius)).toEqual({ kind: 'refus', because: 'rayon' });
    }
  });

  it('refuse des bornes qui sortent du monde plutôt que de les rendre finies et fausses', () => {
    // At the pole the metres-per-degree of longitude collapse, so the box around a legitimate
    // point is wider than the globe. Finite is not the same as drawable, and a frame that said
    // « usable » here would hand Leaflet a longitude of several thousand degrees.
    const frame = contextMapFrame({ lat: 89.9999999, lng: 0 }, FOOTFALL_RADIUS_M);
    expect(frame).toEqual({ kind: 'refus', because: 'bornes' });
  });

  it('ne dépend d’aucune carte : c’est tout l’intérêt', () => {
    // The defect this module exists to remove was asking a Leaflet layer for bounds it could
    // only know once mounted. Nothing here imports leaflet, and this test would stop compiling
    // the day someone made it.
    const frame = contextMapFrame(BRETAGNE, FOOTFALL_RADIUS_M);
    if (frame.kind !== 'cadre') throw new Error('unreachable');
    expect(Object.values(frame.bounds).every(Number.isFinite)).toBe(true);
  });
});
