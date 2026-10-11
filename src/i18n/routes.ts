/**
 * Route paths, and the two whose English segment is not the French one — w6-contexte (#119).
 *
 * Every route but two mounts its English tree by prefixing the canonical French path with
 * `/en`. Two do not, and both are product nouns worth translating: `/contexte/:slug` becomes
 * `/en/context/:slug` (decided in half 1 of this ticket) and `/carte` becomes `/en/map`.
 *
 * **Why a table rather than a special case at each call site.** Half 1 handled the first
 * exception by passing an explicit `enPath` to `Seo` on the one page that needed it — which
 * left `stripLocale` still believing `/en/context/x` canonicalises to `/context/x`, a path no
 * route serves. One exception written in one place stayed true; the second exception is what
 * makes a hand-written special case rot. So the pair is declared once, and `localizePath`,
 * `stripLocale`, `Seo` and the sitemap all derive from it.
 *
 * **Plain TypeScript, no React, on purpose**: `scripts/generate-sitemap.ts` imports this to
 * build the English half of the sitemap, and it runs under `tsx` in `predev`/`prebuild`.
 * `locale.tsx` is a component module and cannot be imported there.
 *
 * **What this does not catch**: it says how a canonical path is spelled in English, never that
 * a `<Route>` for it exists. `scripts/porte/sitemap.ts` is what reads the route table itself.
 */

/** Canonical (French) path prefix → the English path it is served at. */
export const EN_PATH_EXCEPTIONS: Readonly<Record<string, string>> = {
  '/contexte': '/en/context',
  '/carte': '/en/map',
};

/** Prefixes a canonical (French) path with the locale segment, honouring the exceptions. */
export const localizePath = (path: string, locale: 'fr' | 'en'): string => {
  if (locale === 'fr') return path;
  if (path === '/') return '/en';
  for (const [fr, en] of Object.entries(EN_PATH_EXCEPTIONS)) {
    // The exception is on the first segment, so the rest of the path rides along untouched:
    // `/contexte/12-rue-x` and `/contexte` both resolve, `/contextes` does not.
    if (path === fr || path.startsWith(`${fr}/`)) return en + path.slice(fr.length);
  }
  return `/en${path}`;
};

/** Strips the locale segment, returning the canonical (French) path. The exact inverse of
 *  `localizePath`: a round trip through both has to land where it started, in both locales. */
export const stripLocale = (pathname: string): string => {
  if (pathname === '/en') return '/';
  for (const [fr, en] of Object.entries(EN_PATH_EXCEPTIONS)) {
    if (pathname === en || pathname.startsWith(`${en}/`)) return fr + pathname.slice(en.length);
  }
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
};

export const localeFromPath = (pathname: string): 'fr' | 'en' =>
  pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr';
