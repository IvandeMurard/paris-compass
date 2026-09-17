import React from 'react';
import { Button } from '@/components/ui/button';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/locale';
import { MAIN_NAV } from '@/content/site';

interface HeaderProps {
  /** Optional node placed at the left of the utility buttons (e.g. a filters sheet trigger). */
  filtersTrigger?: React.ReactNode;
}

const Header = ({ filtersTrigger }: HeaderProps) => {
  const { t, lp, canonicalPath } = useLocale();

  return (
    <header className="bg-background border-b py-3 px-4 md:px-6 flex items-center justify-between h-16 shrink-0 z-[1100]">
      <div className="flex items-center gap-3 min-w-0">
        <Link to={lp('/')} className="flex flex-col leading-tight shrink-0">
          <span className="font-display text-xl font-bold text-primary">Compass</span>
          <span className="hidden sm:block text-xs text-muted-foreground">{t('site.tagline')}</span>
        </Link>
      </div>

      <nav aria-label={t('nav.main')} className="hidden lg:flex items-center gap-1">
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
      </nav>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {filtersTrigger}
        <span className="hidden xl:inline text-xs text-muted-foreground mr-1">
          {t('site.credit')}
        </span>
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
