import { Link } from 'react-router-dom';
import { getFaq, getGuides, getArrondissements } from '@/content/localized';
import { DATA_SOURCES } from '@/services/opendata/sources';
import { useLocale } from '@/i18n/locale';

/** Indexable editorial content of the overview page. */
const HomeContent = () => {
  const { t, lp, locale } = useLocale();
  const faq = getFaq(locale);
  const guides = getGuides(locale);
  const arrondissements = getArrondissements(locale);

  return (
    <div className="space-y-14">
      <section>
        <h2 className="text-2xl font-semibold">{t('presentation.needTitle')}</h2>
        <p className="mt-3 text-muted-foreground">{t('presentation.needBody')}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">{t('presentation.walkability')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('presentation.walkabilityBody')}</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">{t('presentation.footfall')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('presentation.footfallBody')}</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">{t('presentation.environment')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('presentation.environmentBody')}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">{t('presentation.dataTitle')}</h2>
        <p className="mt-3 text-muted-foreground">{t('presentation.dataBody')}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
          {DATA_SOURCES.map((s) => (
            <li key={s.name}>
              <span className="font-medium text-foreground">
                {locale === 'en' ? s.nameEn : s.name}
              </span>{' '}
              — {locale === 'en' ? s.usageEn : s.usage}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to={lp('/sources')}>
            {t('presentation.allSources')}
          </Link>
          {' · '}
          <Link className="text-primary underline" to={lp('/methodologie')}>
            {t('presentation.methodLink')}
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">{t('presentation.guidesTitle')}</h2>
        <ul className="mt-4 space-y-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                to={lp(`/guides/${g.slug}`)}
                className="font-medium text-primary hover:underline"
              >
                {g.title}
              </Link>
              <p className="text-sm text-muted-foreground">{g.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">{t('presentation.parisTitle')}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {arrondissements.map((a) => (
            <li key={a.slug}>
              <Link
                to={lp(`/paris/${a.slug}`)}
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-primary"
              >
                {a.label} — {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">{t('presentation.faqTitle')}</h2>
        <div className="mt-4 space-y-5">
          {faq.slice(0, 5).map((f) => (
            <div key={f.question}>
              <h3 className="font-semibold">{f.question}</h3>
              <p className="mt-1 text-muted-foreground">{f.answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to={lp('/faq')}>
            {t('presentation.allFaq')}
          </Link>
        </p>
      </section>
    </div>
  );
};

export default HomeContent;
