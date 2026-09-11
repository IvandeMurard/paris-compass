/**
 * The locale path table — w6-contexte (#119).
 *
 * The property that matters is the ROUND TRIP: `stripLocale(localizePath(p, 'en'))` has to land
 * back on `p`, for every canonical path the site serves. Half 1 of this ticket added the first
 * exception (`/contexte` → `/en/context`) as a prop on one page, and `stripLocale` was never
 * taught about it — so `/en/context/12-rue-x` canonicalised to `/context/12-rue-x`, a path no
 * route answers, and the language switcher on a context sheet pointed into the void. The bug
 * was invisible because nothing exercised both directions at once. This does.
 */

import { describe, expect, it } from 'vitest';

import { canonicalEntries } from '../../scripts/generate-sitemap';
import { EN_PATH_EXCEPTIONS, localeFromPath, localizePath, stripLocale } from './routes';

describe('localizePath', () => {
  it('prefixes an ordinary path', () => {
    expect(localizePath('/faq', 'en')).toBe('/en/faq');
    expect(localizePath('/', 'en')).toBe('/en');
  });

  it('leaves French alone', () => {
    expect(localizePath('/faq', 'fr')).toBe('/faq');
    expect(localizePath('/contexte/12-rue-x', 'fr')).toBe('/contexte/12-rue-x');
  });

  it('translates the two exceptional segments, and carries the rest of the path along', () => {
    expect(localizePath('/carte', 'en')).toBe('/en/map');
    expect(localizePath('/contexte', 'en')).toBe('/en/context');
    expect(localizePath('/contexte/12-rue-de-bretagne', 'en')).toBe('/en/context/12-rue-de-bretagne');
  });

  it('matches on a whole segment, never on a prefix of a word', () => {
    // `/cartes` is not `/carte`, and a startsWith without the separator would say it is.
    expect(localizePath('/cartes', 'en')).toBe('/en/cartes');
  });
});

describe('stripLocale', () => {
  it('inverts the prefix and the exceptions alike', () => {
    expect(stripLocale('/en/faq')).toBe('/faq');
    expect(stripLocale('/en')).toBe('/');
    expect(stripLocale('/en/map')).toBe('/carte');
    expect(stripLocale('/en/context/12-rue-x')).toBe('/contexte/12-rue-x');
  });

  it('leaves a French path untouched', () => {
    expect(stripLocale('/carte')).toBe('/carte');
  });
});

describe('the round trip', () => {
  it('holds for every canonical path the sitemap serves', () => {
    for (const { path } of canonicalEntries) {
      expect(stripLocale(localizePath(path, 'en'))).toBe(path);
    }
  });

  it('holds for both exceptional trees, parameters included', () => {
    for (const fr of Object.keys(EN_PATH_EXCEPTIONS)) {
      expect(stripLocale(localizePath(`${fr}/quelque-chose`, 'en'))).toBe(`${fr}/quelque-chose`);
    }
  });

  it('an English path is recognised as English, exceptions included', () => {
    expect(localeFromPath('/en/map')).toBe('en');
    expect(localeFromPath('/en/context/x')).toBe('en');
    expect(localeFromPath('/carte')).toBe('fr');
  });
});
