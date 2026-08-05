import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { DATA_SOURCES } from '@/services/opendata/sources';
import { SITE_URL } from '@/content/site';

interface Upcoming {
  name: string;
  provider: string;
  usage: string;
  licence: string;
  url: string;
}

const UPCOMING: Upcoming[] = [
  {
    name: 'DVF — Demandes de valeurs foncières',
    provider: 'Cerema / DGFiP',
    usage: 'Prix de vente réels des locaux et des logements à proximité',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://app.dvf.etalab.gouv.fr/',
  },
  {
    name: 'GTFS Île-de-France Mobilités',
    provider: 'IDFM / transport.data.gouv.fr',
    usage: 'Fréquence réelle de desserte et temps de parcours, au lieu de la seule distance',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://transport.data.gouv.fr/',
  },
  {
    name: 'Cartes de bruit stratégiques',
    provider: 'Bruitparif',
    usage: 'Niveaux de bruit mesurés et modélisés en dB(A), en remplacement de l’estimation routière',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://www.bruitparif.fr/',
  },
  {
    name: 'INSEE — population et revenus à l’IRIS',
    provider: 'INSEE',
    usage: 'Profil socio-démographique de la zone de chalandise',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://www.insee.fr/fr/information/2017499',
  },
  {
    name: 'BPE — Base permanente des équipements',
    provider: 'INSEE',
    usage: 'Recensement exhaustif des équipements, en complément d’OpenStreetMap',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://www.insee.fr/fr/metadonnees/source/serie/s1161',
  },
  {
    name: 'Stations Vélib’ et comptages vélo',
    provider: 'Ville de Paris / Smovengo',
    usage: 'Accessibilité cyclable et flux de passage complémentaires',
    licence: 'ODbL',
    url: 'https://opendata.paris.fr/',
  },
];

const Sources = () => (
  <>
    <Seo
      title="Sources de données ouvertes utilisées"
      description="Liste complète des jeux de données publics utilisés par Compass : OpenStreetMap, Base Adresse Nationale, Sirene, encadrement des loyers, CAMS, Géorisques — producteur, usage et licence."
      path="/sources"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Sources de données de Compass',
          description:
            'Jeux de données publics agrégés par Compass pour contextualiser les locaux commerciaux d’Île-de-France.',
          url: `${SITE_URL}/sources`,
          isBasedOn: DATA_SOURCES.map((s) => s.url),
          license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
        },
      ]}
    />
    <PageLayout
      title="Sources de données"
      intro="Compass n’utilise que des données publiques, interrogées en direct depuis le navigateur. Voici chaque jeu de données, son producteur, son usage et sa licence."
      crumbs={[{ label: 'Sources' }]}
    >
      <section>
        <h2 className="text-xl font-semibold">Sources actuellement branchées</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-white">
                <th scope="col" className="py-2 pr-4 font-semibold">Jeu de données</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Producteur</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Usage dans Compass</th>
                <th scope="col" className="py-2 font-semibold">Licence</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((s) => (
                <tr key={s.name} className="border-b align-top">
                  <td className="py-3 pr-4">
                    <a className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.provider}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.usage}</td>
                  <td className="py-3 text-muted-foreground">{s.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Sources à venir</h2>
        <p className="mt-2 text-muted-foreground">
          Jeux de données identifiés, ouverts et réutilisables, dont l’intégration est prévue.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-white">
                <th scope="col" className="py-2 pr-4 font-semibold">Jeu de données</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Producteur</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Apport attendu</th>
                <th scope="col" className="py-2 font-semibold">Licence</th>
              </tr>
            </thead>
            <tbody>
              {UPCOMING.map((s) => (
                <tr key={s.name} className="border-b align-top">
                  <td className="py-3 pr-4">
                    <a className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.provider}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.usage}</td>
                  <td className="py-3 text-muted-foreground">{s.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Attribution et réutilisation</h2>
        <p className="mt-3 text-muted-foreground">
          Les données OpenStreetMap sont publiées sous ODbL : leur réutilisation impose
          l’attribution « © les contributeurs OpenStreetMap » et le partage à l’identique des bases
          dérivées. Les jeux de données publics français sont sous Licence Ouverte Etalab 2.0,
          réutilisable y compris commercialement avec mention de la source et de la date de mise à
          jour. Les données de qualité de l’air sont sous CC BY 4.0.
        </p>
      </section>
    </PageLayout>
  </>
);

export default Sources;
