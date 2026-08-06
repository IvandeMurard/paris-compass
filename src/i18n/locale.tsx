import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { UI, type UiKey } from './ui';

export type Locale = 'fr' | 'en';

export const LOCALES: Locale[] = ['fr', 'en'];

/** Strips the /en prefix from a pathname and returns the canonical (French) path. */
export const stripLocale = (pathname: string): string => {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
};

export const localeFromPath = (pathname: string): Locale =>
  pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr';

/** Prefixes a canonical (French) path with the locale segment. */
export const localizePath = (path: string, locale: Locale): string => {
  if (locale === 'fr') return path;
  return path === '/' ? '/en' : `/en${path}`;
};

interface LocaleValue {
  locale: Locale;
  /** Translate a UI key. */
  t: (key: UiKey) => string;
  /** Localize a canonical route path for the current locale. */
  lp: (path: string) => string;
  /** Canonical (unprefixed) path of the current route. */
  canonicalPath: string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();

  const value = useMemo<LocaleValue>(() => {
    const locale = localeFromPath(pathname);
    return {
      locale,
      t: (key: UiKey) => UI[key]?.[locale] ?? key,
      lp: (path: string) => localizePath(path, locale),
      canonicalPath: stripLocale(pathname),
    };
  }, [pathname]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = (): LocaleValue => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Safe fallback so components can render outside a router-driven provider.
    return {
      locale: 'fr',
      t: (key: UiKey) => UI[key]?.fr ?? key,
      lp: (path: string) => path,
      canonicalPath: '/',
    };
  }
  return ctx;
};
