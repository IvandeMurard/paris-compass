import { describe, expect, it } from 'vitest';
import {
  contextPath,
  fromSlug,
  isResolvableSlug,
  pointFromParams,
  secondAddressFromParams,
  toSlug,
  withComparison,
} from './addressSlug';

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

describe('secondAddressFromParams — la borne de deux, au bord de l’URL', () => {
  it('lit une seconde adresse et ses coordonnées', () => {
    const second = secondAddressFromParams(
      new URLSearchParams('lat=48.86&lng=2.34&compare=10-rue-oberkampf&clat=48.865&clng=2.371'),
    );
    expect(second).toEqual({
      kind: 'one',
      slug: '10-rue-oberkampf',
      point: { lat: 48.865, lng: 2.371 },
    });
  });

  it('accepte une seconde adresse sans coordonnées : la fiche les géocodera', () => {
    const second = secondAddressFromParams(new URLSearchParams('compare=10-rue-oberkampf'));
    expect(second.kind === 'one' && second.point).toBeNull();
  });

  it('REFUSE trois adresses au lieu d’en garder la première', () => {
    // `URLSearchParams.get` aurait répondu « a » en silence, et la borne de deux aurait tenu
    // par accident. Choisir une adresse au hasard serait un classement que personne n’a demandé.
    const second = secondAddressFromParams(new URLSearchParams('compare=a-a-a&compare=b-b-b&compare=c-c-c'));
    expect(second).toEqual({ kind: 'refus', count: 3 });
  });

  it('refuse aussi deux secondes adresses — deux au total, pas deux en plus', () => {
    expect(secondAddressFromParams(new URLSearchParams('compare=a-a-a&compare=b-b-b')).kind).toBe('refus');
  });

  it('ignore une valeur vide plutôt que de la compter', () => {
    expect(secondAddressFromParams(new URLSearchParams('compare=')).kind).toBe('none');
    expect(secondAddressFromParams(new URLSearchParams('')).kind).toBe('none');
  });
});

describe('withComparison', () => {
  it('garde les coordonnées de la première adresse en attachant la seconde', () => {
    const search = withComparison('?lat=48.86&lng=2.34', 'Rue Oberkampf, Paris', {
      lat: 48.865,
      lng: 2.371,
    });
    const params = new URLSearchParams(search);
    expect(params.get('lat')).toBe('48.86');
    expect(params.get('compare')).toBe('rue-oberkampf-paris');
    expect(params.get('clat')).toBe('48.865000');
  });

  it('RÉÉCRIT au lieu d’ajouter : une seconde adresse remplace la seconde adresse', () => {
    const once = withComparison('?lat=48.86&lng=2.34', 'A Paris', { lat: 1, lng: 2 });
    const twice = withComparison(once, 'B Paris', { lat: 3, lng: 4 });
    expect(new URLSearchParams(twice).getAll('compare')).toEqual(['b-paris']);
  });

  it('retire la comparaison sans toucher au reste', () => {
    const cleared = withComparison('?lat=48.86&lng=2.34&compare=a-paris&clat=1&clng=2', null, null);
    expect(new URLSearchParams(cleared).getAll('compare')).toEqual([]);
    expect(new URLSearchParams(cleared).get('lat')).toBe('48.86');
  });
});
