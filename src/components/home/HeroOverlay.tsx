import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Map as MapIcon, Compass, ShieldCheck, Database, ArrowRight, X } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

interface HeroOverlayProps {
  hidden: boolean;
  onExplore: () => void;
  onSearch: (query: string) => void;
}

const HeroOverlay = ({ hidden, onExplore, onSearch }: HeroOverlayProps) => {
  const { t, lp } = useLocale();
  const [query, setQuery] = React.useState('');

  const suggestions = [
    t('search.suggestion1'),
    t('search.suggestion2'),
    t('search.suggestion3'),
    t('search.suggestion4'),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  if (hidden) return null;

  return (
    <div
      className="absolute inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-foreground/35 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('home.welcome')}
    >
      <div className="w-full max-w-3xl px-6 py-10 md:py-14">
        <div className="relative rounded-2xl bg-background/95 p-6 md:p-10 shadow-2xl border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExplore}
            aria-label={t('home.skipHero')}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </Button>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Compass size={22} />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">Compass</span>
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-5xl">
            {t('home.headline')}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            {t('home.subheadline')}
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="h-14 pl-12 pr-28 text-base shadow-sm"
              />
              <Button
                type="submit"
                className="absolute right-1.5 top-1.5 h-11 gap-1"
              >
                {t('home.searchCta')}
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSearch(s)}
                className="inline-flex items-center rounded-full border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 text-card-foreground">
              <Database className="mb-2 h-5 w-5 text-primary" />
              <p className="font-display text-sm font-semibold">{t('home.pillar1Title')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('home.pillar1Body')}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-card-foreground">
              <MapIcon className="mb-2 h-5 w-5 text-primary" />
              <p className="font-display text-sm font-semibold">{t('home.pillar2Title')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('home.pillar2Body')}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-card-foreground">
              <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
              <p className="font-display text-sm font-semibold">{t('home.pillar3Title')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('home.pillar3Body')}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onExplore} className="gap-2">
              <MapIcon size={18} />
              {t('home.exploreMap')}
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to={lp('/presentation')}>{t('home.howItWorks')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroOverlay;
