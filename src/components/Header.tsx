import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/locale';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  const { t, lp } = useLocale();

  return (
    <header className="bg-white shadow-sm py-3 px-6 flex items-center justify-between h-16 shrink-0">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={t('nav.toggleSidebar')}
          className="mr-2 md:hidden"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <Link to={lp('/')} className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-primary">Compass</span>
          <span className="hidden sm:block text-xs text-muted-foreground">{t('site.tagline')}</span>
        </Link>
      </div>
      <div className="flex items-center space-x-1">
        <span className="hidden xl:inline text-xs text-muted-foreground mr-2">
          {t('site.credit')}
        </span>
        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
          <Link to={lp('/presentation')}>{t('nav.presentation')}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
          <Link to={lp('/guides')}>{t('nav.guides')}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
          <Link to={lp('/methodologie')}>{t('nav.methodology')}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
          <Link to={lp('/sources')}>{t('nav.sources')}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
          <Link to={lp('/faq')}>{t('nav.faq')}</Link>
        </Button>
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
