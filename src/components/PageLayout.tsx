import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/SiteFooter';
import { MAIN_NAV } from '@/content/site';

export interface Crumb {
  label: string;
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

  return (
    <div className="min-h-screen bg-customBg flex flex-col font-sans">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-6 py-4 flex flex-wrap items-center gap-4 justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Compass
          </Link>
          <nav aria-label="Navigation principale" className="flex flex-wrap items-center gap-1">
            {MAIN_NAV.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                size="sm"
                asChild
                className={pathname === item.to ? 'text-primary' : 'text-muted-foreground'}
              >
                <Link to={item.to}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {crumbs.length > 0 && (
            <nav aria-label="Fil d’Ariane" className="mb-4 flex items-center flex-wrap gap-1 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">Accueil</Link>
              {crumbs.map((c) => (
                <span key={c.label} className="flex items-center gap-1">
                  <ChevronRight size={12} />
                  {c.to ? (
                    <Link to={c.to} className="hover:text-primary">{c.label}</Link>
                  ) : (
                    <span className="text-foreground">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}

          <div className="mt-8 space-y-8 text-[15px] leading-relaxed">{children}</div>

          <div className="mt-12 rounded-lg border bg-white p-6">
            <p className="font-semibold">Voir les locaux sur la carte</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scores d’environnement, aménités et loyers de référence, calculés en direct sur la
              zone affichée.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">
                <Map size={16} className="mr-2" /> Ouvrir la carte
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
