import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { UI, type UiKey } from './ui';

// The path helpers live in `./routes`, a plain TypeScript module: `scripts/generate-sitemap.ts`
// has to import them and cannot import a component module. They are re-exported here so the
// dozens of existing `@/i18n/locale` imports keep resolving.
export { localeFromPath, localizePath, stripLocale, EN_PATH_EXCEPTIONS } from './routes';

import { localeFromPath, localizePath, stripLocale } from './routes';

export type Locale = 'fr' | 'en';

export const LOCALES: Locale[] = ['fr', 'en'];

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
