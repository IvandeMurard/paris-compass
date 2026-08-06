import { Link } from 'react-router-dom';
import { MAIN_NAV } from '@/content/site';
import { DATA_SOURCES } from '@/services/opendata/sources';
import { useLocale } from '@/i18n/locale';

const SiteFooter = () => {
  const { t, lp, locale } = useLocale();

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <p className="font-semibold text-primary">Compass</p>
          <p className="mt-2 text-muted-foreground">{t('site.footerBlurb')}</p>
          <p className="mt-3 text-muted-foreground">{t('site.creditSentence')}</p>
        </div>
        <nav aria-label={t('nav.sitePages')}>
          <p className="font-semibold">{t('nav.explore')}</p>
          <ul className="mt-2 space-y-1">
            {MAIN_NAV.map((item) => (
              <li key={item.to}>
                <Link className="text-muted-foreground hover:text-primary" to={lp(item.to)}>
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
            <li>
              <Link className="text-muted-foreground hover:text-primary" to={lp('/paris')}>
                {t('nav.paris')}
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="font-semibold">{t('nav.data')}</p>
          <ul className="mt-2 space-y-1">
            {DATA_SOURCES.slice(0, 5).map((s) => (
              <li key={s.name}>
                <a
                  className="text-muted-foreground hover:text-primary"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === 'en' ? s.nameEn : s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
