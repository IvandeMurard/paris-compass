import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    seoTitle: 'Ambition — contextualiser les locaux commerciaux',
    seoDescription:
      'Compass replace chaque local commercial d’Île-de-France dans son environnement et permet de chercher par besoin plutôt que par adresse, à partir de données publiques uniquement.',
    jsonLdName: 'Ambition de Compass',
    crumb: 'Ambition',
    title: 'L’ambition : replacer chaque local dans son environnement',
    intro:
      'Une annonce immobilière décrit un local. Compass décrit ce qu’il y a autour, parce que c’est cet environnement qui fait la réussite d’une activité.',
    problemTitle: 'Le problème',
    problemBody:
      'Une annonce de local commercial tient en trois lignes : surface, loyer, adresse. Rien sur les commerces voisins, le passage réel, la desserte, le bruit de l’axe d’en face ou la qualité de l’air. Le porteur de projet doit reconstituer ce contexte à la main, quartier par quartier, alors que la plupart de ces informations existent déjà en accès libre.',
    contextTitle: 'Notre parti pris : la contextualisation',
    contextBody:
      'Chaque local affiché sur Compass est accompagné de son environnement mesuré : densité de commerces actifs, accès aux transports, équipements générateurs de flux, exposition estimée au bruit routier, qualité de l’air en temps réel, risques recensés et loyer de référence du quartier. Le local n’est plus un point sur une carte, c’est une situation.',
    searchTitle: 'Chercher par besoin, pas par adresse',
    searchBody:
      'On ne cherche pas « un local rue de Charonne », on cherche « un local pour une boulangerie, avec du passage matin et soir, près d’écoles, à moins de 300 mètres d’un métro ». Compass traduit ce besoin en seuils sur les scores d’environnement et n’affiche que les locaux qui les satisfont, dans la zone visible à l’écran.',
    dataTitle: 'Données publiques, méthode publiée',
    dataBody:
      'Compass n’utilise aucune donnée de démonstration et aucune donnée propriétaire. Tout est interrogé en direct auprès de services publics ouverts, et la formule de chaque score est publiée. Vous pouvez vérifier, contester et refaire nos calculs.',
    sourcesLink: 'Les sources',
    sourcesLinkSuffix: ' : producteur, usage et licence de chaque jeu de données.',
    methodoLink: 'La méthodologie',
    methodoLinkSuffix: ' : les formules, les rayons, les pondérations et les limites assumées.',
    notTitle: 'Ce que Compass ne fait pas',
    notBody:
      'Compass n’est pas une agence et ne commercialise aucun local. Il ne connaît ni les baux, ni les droits d’entrée, ni les chiffres d’affaires. Il sert à réduire une liste de quartiers à visiter, pas à décider à votre place.',
    editorTitle: 'Qui édite Compass',
    editorBody:
      'Compass est conçu et développé par Ivan de Murard, à partir d’un constat simple : les données environnementales — bruit, air, flux, équipements — manquent aux annonces immobilières alors qu’elles conditionnent l’usage réel d’un lieu.',
  },
  en: {
    seoTitle: 'Our mission — contextualizing commercial spaces',
    seoDescription:
      'Compass places every commercial space in Île-de-France in its environment and lets you search by need rather than by address, using only public data.',
    jsonLdName: 'Compass mission',
    crumb: 'Mission',
    title: 'Our mission: placing every space in its environment',
    intro:
      'A real-estate listing describes a space. Compass describes what surrounds it, because that environment is what makes a business succeed.',
    problemTitle: 'The problem',
    problemBody:
      'A commercial listing fits in three lines: floor area, rent, address. Nothing about neighbouring shops, actual foot traffic, transport links, the noise from the road across the street, or air quality. The project owner has to reconstruct this context by hand, neighbourhood by neighbourhood, even though most of this information is already freely available.',
    contextTitle: 'Our approach: contextualization',
    contextBody:
      'Every space shown on Compass comes with its measured environment: density of active shops, access to transport, footfall-generating amenities, estimated exposure to road noise, real-time air quality, recorded risks, and the neighbourhood’s reference rent. A space is no longer just a point on a map — it’s a situation.',
    searchTitle: 'Search by need, not by address',
    searchBody:
      'You don’t search for “a space on rue de Charonne”, you search for “a space for a bakery, with morning and evening foot traffic, near schools, within 300 metres of a metro station”. Compass translates this need into thresholds on environment scores and only shows the spaces that meet them, within the area visible on screen.',
    dataTitle: 'Public data, published method',
    dataBody:
      'Compass uses no demo data and no proprietary data. Everything is queried live from open public services, and the formula behind each score is published. You can verify, challenge, and reproduce our calculations.',
    sourcesLink: 'Sources',
    sourcesLinkSuffix: ': producer, use, and licence of each dataset.',
    methodoLink: 'Methodology',
    methodoLinkSuffix: ': formulas, radii, weightings, and acknowledged limitations.',
    notTitle: 'What Compass does not do',
    notBody:
      'Compass is not an agency and does not market any space. It knows nothing about leases, key money, or turnover. It is meant to narrow down a list of neighbourhoods to visit, not to decide for you.',
    editorTitle: 'Who publishes Compass',
    editorBody:
      'Compass is designed and developed by Ivan de Murard, starting from a simple observation: environmental data — noise, air, foot traffic, amenities — is missing from real-estate listings even though it determines the actual use of a place.',
  },
} as const;

const About = () => {
  const { locale, lp } = useLocale();
  const c = COPY[locale];

  return (
    <>
      <Seo
        title={c.seoTitle}
        description={c.seoDescription}
        path="/a-propos"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: c.jsonLdName,
            url: `${SITE_URL}/a-propos`,
            publisher: {
              '@type': 'Organization',
              name: 'Compass',
              founder: { '@type': 'Person', name: 'Ivan de Murard' },
            },
          },
        ]}
      />
      <PageLayout title={c.title} intro={c.intro} crumbs={[{ label: c.crumb }]}>
        <section>
          <h2 className="text-xl font-semibold">{c.problemTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.problemBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.contextTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.contextBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.searchTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.searchBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.dataTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.dataBody}</p>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <Link className="text-primary underline" to={lp('/sources')}>{c.sourcesLink}</Link>
              {c.sourcesLinkSuffix}
            </li>
            <li>
              <Link className="text-primary underline" to={lp('/methodologie')}>{c.methodoLink}</Link>
              {c.methodoLinkSuffix}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.notTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.notBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.editorTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.editorBody}</p>
        </section>
      </PageLayout>
    </>
  );
};

export default About;
