import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { DATA_SOURCES } from '@/services/opendata/sources';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

interface Upcoming {
  name: string;
  nameEn: string;
  provider: string;
  usage: string;
  usageEn: string;
  licence: string;
  licenceEn: string;
  url: string;
}

const UPCOMING: Upcoming[] = [
  {
    name: 'Sirene — répertoire des entreprises',
    nameEn: 'Sirene — business register',
    provider: 'INSEE / DINUM',
    usage:
      'Établissements actifs autour du local. Le répertoire est déjà chargé côté base ; aucun écran ne l’interroge encore, donc il n’est pas annoncé comme source active.',
    usageEn:
      'Active businesses around the space. The register is already loaded in the database; no screen queries it yet, so it is not announced as an active source.',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://recherche-entreprises.api.gouv.fr/docs/',
  },
  {
    name: 'DVF — Demandes de valeurs foncières',
    nameEn: 'DVF — Demandes de valeurs foncières (property transaction records)',
    provider: 'Cerema / DGFiP',
    usage: 'Prix de vente réels des locaux et des logements à proximité',
    usageEn: 'Actual sale prices of nearby spaces and housing',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://app.dvf.etalab.gouv.fr/',
  },
  {
    name: 'GTFS Île-de-France Mobilités',
    nameEn: 'GTFS Île-de-France Mobilités',
    provider: 'IDFM / transport.data.gouv.fr',
    usage: 'Fréquence réelle de desserte et temps de parcours, au lieu de la seule distance',
    usageEn: 'Actual service frequency and travel times, instead of distance alone',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://transport.data.gouv.fr/',
  },
  {
    name: 'Cartes de bruit stratégiques',
    nameEn: 'Strategic noise maps (cartes de bruit stratégiques)',
    provider: 'Bruitparif',
    usage: 'Niveaux de bruit mesurés et modélisés en dB(A), en remplacement de l’estimation routière',
    usageEn: 'Measured and modelled noise levels in dB(A), replacing the road-based estimate',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://www.bruitparif.fr/',
  },
  {
    name: 'INSEE — population et revenus à l’IRIS',
    nameEn: 'INSEE — population and income by IRIS zone',
    provider: 'INSEE',
    usage: 'Profil socio-démographique de la zone de chalandise',
    usageEn: 'Socio-demographic profile of the catchment area',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://www.insee.fr/fr/information/2017499',
  },
  {
    name: 'BPE — Base permanente des équipements',
    nameEn: 'BPE — Base permanente des équipements (permanent amenities database)',
    provider: 'INSEE',
    usage: 'Recensement exhaustif des équipements, en complément d’OpenStreetMap',
    usageEn: 'Exhaustive amenities census, complementing OpenStreetMap',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://www.insee.fr/fr/metadonnees/source/serie/s1161',
  },
  {
    name: 'Stations Vélib’ et comptages vélo',
    nameEn: 'Vélib’ stations and bike counts',
    provider: 'Ville de Paris / Smovengo',
    usage: 'Accessibilité cyclable et flux de passage complémentaires',
    usageEn: 'Cycling accessibility and complementary traffic flow',
    licence: 'ODbL',
    licenceEn: 'ODbL',
    url: 'https://opendata.paris.fr/',
  },
];

const COPY = {
  fr: {
    seoTitle: 'Sources de données ouvertes utilisées',
    seoDescription:
      'Liste complète des jeux de données publics utilisés par Compass : OpenStreetMap, Base Adresse Nationale, Sirene, encadrement des loyers, CAMS, Géorisques — producteur, usage et licence.',
    jsonLdName: 'Sources de données de Compass',
    jsonLdDescription:
      'Jeux de données publics agrégés par Compass pour contextualiser les locaux commerciaux d’Île-de-France.',
    crumb: 'Sources',
    title: 'Sources de données',
    intro:
      'Compass n’utilise que des données publiques, interrogées en direct depuis le navigateur. Voici chaque jeu de données, son producteur, son usage et sa licence.',
    activeTitle: 'Sources actuellement branchées',
    upcomingTitle: 'Sources à venir',
    upcomingIntro: 'Jeux de données identifiés, ouverts et réutilisables, dont l’intégration est prévue.',
    thDataset: 'Jeu de données',
    thProvider: 'Producteur',
    thUsage: 'Usage dans Compass',
    thExpected: 'Apport attendu',
    thLicence: 'Licence',
    attributionTitle: 'Attribution et réutilisation',
    attributionBody:
      'Les données OpenStreetMap sont publiées sous ODbL : leur réutilisation impose l’attribution « © les contributeurs OpenStreetMap » et le partage à l’identique des bases dérivées. Les jeux de données publics français sont sous Licence Ouverte Etalab 2.0, réutilisable y compris commercialement avec mention de la source et de la date de mise à jour. Les données de qualité de l’air sont sous CC BY 4.0.',
  },
  en: {
    seoTitle: 'Open data sources used',
    seoDescription:
      'Full list of public datasets used by Compass: OpenStreetMap, Base Adresse Nationale, Sirene, rent control, CAMS, Géorisques — producer, use and licence.',
    jsonLdName: 'Compass data sources',
    jsonLdDescription:
      'Public datasets aggregated by Compass to contextualize commercial spaces in Île-de-France.',
    crumb: 'Sources',
    title: 'Data sources',
    intro:
      'Compass only uses public data, queried live from the browser. Here is every dataset, its producer, its use, and its licence.',
    activeTitle: 'Sources currently in use',
    upcomingTitle: 'Upcoming sources',
    upcomingIntro: 'Identified, open and reusable datasets whose integration is planned.',
    thDataset: 'Dataset',
    thProvider: 'Producer',
    thUsage: 'Use in Compass',
    thExpected: 'Expected contribution',
    thLicence: 'Licence',
    attributionTitle: 'Attribution and reuse',
    attributionBody:
      'OpenStreetMap data is published under ODbL: reuse requires attribution “© OpenStreetMap contributors” and share-alike of derived databases. French public datasets are under the Etalab 2.0 Open Licence, reusable including commercially with mention of the source and update date. Air quality data is under CC BY 4.0.',
  },
} as const;

const Sources = () => {
  const { locale } = useLocale();
  const c = COPY[locale];

  return (
    <>
      <Seo
        title={c.seoTitle}
        description={c.seoDescription}
        path="/sources"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: c.jsonLdName,
            description: c.jsonLdDescription,
            url: `${SITE_URL}/sources`,
            isBasedOn: DATA_SOURCES.map((s) => s.url),
            license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
          },
        ]}
      />
      <PageLayout title={c.title} intro={c.intro} crumbs={[{ label: c.crumb }]}>
        <section>
          <h2 className="text-xl font-semibold">{c.activeTitle}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-white">
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thDataset}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thProvider}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thUsage}</th>
                  <th scope="col" className="py-2 font-semibold">{c.thLicence}</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map((s) => (
                  <tr key={s.name} className="border-b align-top">
                    <td className="py-3 pr-4">
                      <a className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">
                        {locale === 'fr' ? s.name : s.nameEn}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{locale === 'fr' ? s.provider : s.providerEn}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{locale === 'fr' ? s.usage : s.usageEn}</td>
                    <td className="py-3 text-muted-foreground">{locale === 'fr' ? s.licence : s.licenceEn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.upcomingTitle}</h2>
          <p className="mt-2 text-muted-foreground">{c.upcomingIntro}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-white">
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thDataset}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thProvider}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thExpected}</th>
                  <th scope="col" className="py-2 font-semibold">{c.thLicence}</th>
                </tr>
              </thead>
              <tbody>
                {UPCOMING.map((s) => (
                  <tr key={s.name} className="border-b align-top">
                    <td className="py-3 pr-4">
                      <a className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">
                        {locale === 'fr' ? s.name : s.nameEn}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.provider}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{locale === 'fr' ? s.usage : s.usageEn}</td>
                    <td className="py-3 text-muted-foreground">{locale === 'fr' ? s.licence : s.licenceEn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.attributionTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.attributionBody}</p>
        </section>
      </PageLayout>
    </>
  );
};

export default Sources;
