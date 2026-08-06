import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLocale, localizePath, stripLocale, type Locale } from '@/i18n/locale';

/** FR / EN switcher: keeps the user on the same page in the other language. */
const LanguageSwitcher = ({ className = '' }: { className?: string }) => {
  const { locale } = useLocale();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const go = (next: Locale) => {
    if (next === locale) return;
    navigate(`${localizePath(stripLocale(pathname), next)}${search}`);
  };

  return (
    <div
      className={`flex items-center rounded-md border text-xs ${className}`}
      aria-label={useLocale().t('nav.language')}
    >
      {(['fr', 'en'] as Locale[]).map((l) => (
        <Button
          key={l}
          variant="ghost"
          size="sm"
          onClick={() => go(l)}
          aria-current={l === locale}
          className={`h-7 rounded-none px-2 uppercase ${
            l === locale ? 'text-primary font-semibold' : 'text-muted-foreground'
          }`}
        >
          {l}
        </Button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
