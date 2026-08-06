import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/SiteFooter';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { MAIN_NAV } from '@/content/site';
import { useLocale } from '@/i18n/locale';

export interface Crumb {
  label: string;
  /** Canonical (French) path; the locale prefix is added automatically. */
  to?: string;
}

interface PageLayoutProps {
  title: string;
  intro?: string;
  crumbs?: Crumb[];
  children: ReactNode;
}

const PageLayout = ({ title, intro, crumbs = [], children }: PageLayoutProps) => {
  const { pathname } = useLocation();
  const { t, lp, canonicalPath } = useLocale();

  return (
    <div className="min-h-screen bg-customBg flex flex-col font-sans">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-6 py-4 flex flex-wrap items-center gap-4 justify-between">
          <Link to={lp('/')} className="text-xl font-bold text-primary">
            Compass
          </Link>
          <nav aria-label={t('nav.main')} className="flex flex-wrap items-center gap-1">
            {MAIN_NAV.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                size="sm"
                asChild
                className={canonicalPath === item.to ? 'text-primary' : 'text-muted-foreground'}
              >
                <Link to={lp(item.to)}>{t(item.labelKey)}</Link>
              </Button>
            ))}
            <LanguageSwitcher className="ml-2" />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {crumbs.length > 0 && (
            <nav
              aria-label={t('nav.breadcrumb')}
              className="mb-4 flex items-center flex-wrap gap-1 text-xs text-muted-foreground"
            >
              <Link to={lp('/')} className="hover:text-primary">
                {t('nav.home')}
              </Link>
              {crumbs.map((c) => (
                <span key={c.label} className="flex items-center gap-1">
                  <ChevronRight size={12} />
                  {c.to ? (
                    <Link to={lp(c.to)} className="hover:text-primary">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}

          <div className="mt-10 space-y-10 leading-relaxed">{children}</div>

          <div className="mt-12">
            <Button asChild>
              <Link to={lp('/')}>
                <Map size={16} className="mr-2" />
                {t('nav.backToMap')}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PageLayout;
