/**
 * Le mode métier dans l'URL — w6-modes (#36).
 *
 * Deux propriétés, et la seconde est celle qui a déjà coûté quelque chose ailleurs : le pluriel
 * d'une clé de requête. `?mode=a&mode=b` est légal, `URLSearchParams.get` répond « a » en
 * silence, et une borne qui tient par accident tient jusqu'au jour où quelqu'un s'appuie
 * dessus — c'est mot pour mot le raisonnement de `secondAddressFromParams` (`#119`, étape 6).
 */

import { describe, expect, it } from 'vitest';

import { TRADE_MODES } from '@/core';
import { MODE_KEY, tradeModeFromParams, withTradeMode } from './tradeMode';

const lire = (search: string) => tradeModeFromParams(new URLSearchParams(search));

describe('tradeModeFromParams', () => {
  it('lit les trois modes, et seulement eux', () => {
    for (const mode of TRADE_MODES) {
      expect(lire(`?${MODE_KEY}=${mode}`), mode).toBe(mode);
    }
  });

  it('refuse ce qui n’est pas un mode plutôt que d’en choisir un par défaut', () => {
    for (const valeur of ['', 'RESTAURATION', 'restaurant', 'tous', 'undefined']) {
      expect(lire(`?${MODE_KEY}=${valeur}`), valeur).toBeNull();
    }
    expect(lire('')).toBeNull();
    expect(lire('?lat=48.86')).toBeNull();
  });

  it('refuse le pluriel au lieu de garder la première valeur', () => {
    expect(lire(`?${MODE_KEY}=boutique&${MODE_KEY}=artisanat`)).toBeNull();
    // Deux fois le MÊME mode reste un pluriel : accepter celui-là voudrait dire lire les
    // valeurs pour les comparer, donc décider, ce que ce module ne fait pas.
    expect(lire(`?${MODE_KEY}=boutique&${MODE_KEY}=boutique`)).toBeNull();
  });
});

describe('withTradeMode', () => {
  it('pose le mode et le relit', () => {
    for (const mode of TRADE_MODES) {
      expect(lire(withTradeMode('', mode)), mode).toBe(mode);
    }
  });

  it('remplace au lieu d’empiler — trois clics ne font pas trois clés', () => {
    let search = '';
    for (const mode of TRADE_MODES) search = withTradeMode(search, mode);
    expect(new URLSearchParams(search).getAll(MODE_KEY)).toEqual([TRADE_MODES.at(-1)]);
  });

  it('garde le reste de la requête — l’adresse comparée survit au changement de mode', () => {
    const avant = '?lat=48.863100&lng=2.362100&compare=rue-de-rivoli&clat=48.85&clng=2.35';
    const apres = new URLSearchParams(withTradeMode(avant, 'boutique'));
    for (const [cle, valeur] of new URLSearchParams(avant)) {
      expect(apres.get(cle), cle).toBe(valeur);
    }
  });

  it('retire le mode, et rend une requête vide quand il ne restait que lui', () => {
    expect(withTradeMode(`?${MODE_KEY}=boutique`, null)).toBe('');
    expect(lire(withTradeMode(`?lat=48.86&${MODE_KEY}=boutique`, null))).toBeNull();
    expect(new URLSearchParams(withTradeMode(`?lat=48.86&${MODE_KEY}=boutique`, null)).get('lat')).toBe(
      '48.86',
    );
  });
});
