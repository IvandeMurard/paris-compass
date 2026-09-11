import { describe, expect, it } from 'vitest';
import { contextPath, fromSlug, isResolvableSlug, pointFromParams, toSlug } from './addressSlug';

describe('toSlug', () => {
  it('plie les accents plutôt que de les encoder', () => {
    expect(toSlug('12 Boulevard de Sébastopol 75003 Paris')).toBe(
      '12-boulevard-de-sebastopol-75003-paris',
    );
  });

  it('avale les apostrophes des deux formes', () => {
    expect(toSlug("5 Rue de l'Échiquier")).toBe('5-rue-de-l-echiquier');
    expect(toSlug('5 Rue de l’Échiquier')).toBe('5-rue-de-l-echiquier');
  });

  it('ne laisse ni tiret de tête ni tiret de queue', () => {
    expect(toSlug('  Rue Montorgueil, ')).toBe('rue-montorgueil');
  });
});

describe('fromSlug', () => {
  it('rend un texte de recherche, pas le libellé d’origine', () => {
    // Ce qui sort part à la BAN ; seule la BAN peut rendre la vraie capitalisation.
    expect(fromSlug('12-rue-de-bretagne-75003-paris')).toBe('12 rue de bretagne 75003 paris');
  });

  it('fait l’aller-retour sur un libellé déjà plié', () => {
    expect(toSlug(fromSlug('rue-montorgueil-75002-paris'))).toBe('rue-montorgueil-75002-paris');
  });
});

describe('isResolvableSlug', () => {
  it('refuse ce qui partirait à la BAN comme une requête vide', () => {
    expect(isResolvableSlug(undefined)).toBe(false);
    expect(isResolvableSlug('')).toBe(false);
    expect(isResolvableSlug('--')).toBe(false);
    expect(isResolvableSlug('rue-montorgueil')).toBe(true);
  });
});

describe('contextPath', () => {
  it('monte l’anglais sur /en/context, pas sur un préfixe du chemin français', () => {
    expect(contextPath('Rue Montorgueil', null, 'fr')).toBe('/contexte/rue-montorgueil');
    expect(contextPath('Rue Montorgueil', null, 'en')).toBe('/en/context/rue-montorgueil');
  });

  it('porte les coordonnées pour éviter un second géocodage', () => {
    expect(contextPath('Rue Montorgueil', { lat: 48.8655, lng: 2.3475 })).toBe(
      '/contexte/rue-montorgueil?lat=48.865500&lng=2.347500',
    );
  });
});

describe('pointFromParams', () => {
  it('rend le point quand les deux coordonnées sont là', () => {
    expect(pointFromParams(new URLSearchParams('lat=48.86&lng=2.34'))).toEqual({
      lat: 48.86,
      lng: 2.34,
    });
  });

  it('refuse une moitié de point', () => {
    // Une latitude seule ferait scorer le méridien de Greenwich sans que rien ne le dise.
    expect(pointFromParams(new URLSearchParams('lat=48.86'))).toBeNull();
    expect(pointFromParams(new URLSearchParams('lng=2.34'))).toBeNull();
    expect(pointFromParams(new URLSearchParams(''))).toBeNull();
  });

  it('refuse une coordonnée illisible plutôt que de rendre NaN', () => {
    expect(pointFromParams(new URLSearchParams('lat=nord&lng=2.34'))).toBeNull();
  });
});
