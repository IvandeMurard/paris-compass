import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const WEIGHTS = [
  { familyFr: 'Commerces alimentaires', familyEn: 'Food shops', weight: '30 %', saturation: '18', source: 'OpenStreetMap' },
  { familyFr: 'Santé', familyEn: 'Healthcare', weight: '20 %', saturation: '14', source: 'OpenStreetMap' },
  { familyFr: 'Transports', familyEn: 'Transport', weight: '20 %', saturation: '25', source: 'OpenStreetMap' },
  { familyFr: 'Écoles', familyEn: 'Schools', weight: '15 %', saturation: '8', source: 'OpenStreetMap' },
  { familyFr: 'Parcs et espaces verts', familyEn: 'Parks and green spaces', weight: '15 %', saturation: '7', source: 'OpenStreetMap' },
];

const COPY = {
  fr: {
    seoTitle: 'Méthodologie de calcul des scores',
    seoDescription:
      'Formules, rayons, pondérations et limites des scores Compass : marchabilité, flux piéton estimé, bruit routier, qualité de l’air et loyers de référence.',
    jsonLdHeadline: 'Méthodologie de calcul des scores Compass',
    jsonLdAbout: 'Scoring environnemental de locaux commerciaux à partir de données ouvertes',
    crumb: 'Méthodologie',
    title: 'Méthodologie',
    intro:
      'Chaque score affiché par Compass est calculé dans le navigateur, à partir de données publiques et de formules publiées ici. Aucune pondération n’est cachée.',
    walkTitle: 'Score de marchabilité',
    walkBody1a: 'Le score de marchabilité note de 0 à 100 la densité de services accessibles à pied dans un rayon de ',
    walkBody1b: ' (environ 10 minutes de marche) autour du local.',
    walkBody2a: 'Chaque famille d’équipements reçoit un sous-score saturant :',
    walkBody2b: 'où n est le nombre d’équipements dans le rayon et s la constante de saturation. Les premiers équipements font fortement monter le score, les suivants de moins en moins — un onzième supermarché n’améliore pas réellement un quartier.',
    thFamily: 'Famille',
    thWeight: 'Poids',
    thSaturation: 'Constante de saturation',
    thSource: 'Source',
    saturationUnit: (n: string) => `${n} équipements`,
    footTitle: 'Flux piéton estimé',
    footBody:
      'Aucun comptage piéton ouvert ne couvre l’ensemble de l’Île-de-France. Compass publie donc un proxy : 65 % de densité de commerces actifs dans un rayon de 400 mètres (même courbe saturante, constante 90) et 35 % de score de transports. Il permet de comparer deux emplacements entre eux, pas de prévoir une fréquentation ou un chiffre d’affaires.',
    noiseTitle: 'Exposition au bruit',
    noiseBody:
      'Le niveau de bruit est estimé, pas mesuré. Chaque axe routier situé à moins de 500 mètres contribue proportionnellement à sa classe (autoroute, voie primaire, secondaire, tertiaire) et de façon décroissante avec la distance. Le résultat est ramené sur une échelle 0-100, découpée en quatre niveaux (très faible, faible, modéré, élevé). Le remplacement par les cartes de bruit stratégiques de Bruitparif est prévu.',
    airTitle: 'Qualité de l’air',
    airBody:
      'L’indice ATMO européen (EAQI), les PM2.5 et le NO₂ proviennent du modèle CAMS Europe de Copernicus, interrogé pour le centre de la carte et rafraîchi toutes les heures. Ce sont des valeurs modélisées à l’échelle du quartier, pas des mesures à l’adresse.',
    riskTitle: 'Risques',
    riskBody:
      'Les risques naturels et technologiques sont ceux recensés par Géorisques dans un rayon de 1 km. Cette information n’a pas valeur d’état des risques et pollutions (ERP) réglementaire.',
    rentTitle: 'Loyer résidentiel du quartier',
    rentBody:
      'Le chiffre affiché est le loyer de référence en €/m²/mois publié par la Ville de Paris dans le cadre de l’encadrement des loyers. Il ne concerne que le logement et exclut explicitement les locaux commerciaux et professionnels : aucune base publique ne publie les loyers commerciaux. Compass ne l’utilise donc que pour une chose — situer le niveau de vie résidentiel du quartier, c’est-à-dire un signal de zone de chalandise. Il n’est jamais multiplié par une surface, ne produit aucune estimation de loyer commercial et ne filtre aucun résultat. La grille préfectorale découpe chaque quartier en 32 cases (4 époques de construction × 4 tailles de logement × meublé ou non) : Compass en fait la moyenne plutôt que d’en épingler une seule, et affiche le millésime de l’arrêté à côté du chiffre. Le millésime publié en open data accuse un décalage sur celui en vigueur.',
    detectTitle: 'Détection des locaux',
    detectBody:
      'Les locaux proviennent d’OpenStreetMap : un local est considéré comme vacant lorsqu’il porte un attribut de local vide ou de commerce désaffecté, et comme occupé lorsqu’une activité y est renseignée. La couverture dépend donc des contributions de la communauté : un local fermé récemment et non signalé n’apparaîtra pas.',
    provenanceTitle: 'D’où vient chaque chiffre',
    provenanceBody:
      'Chaque score porte la source de la couche de données qu’il lit réellement, et non une source unique valable pour toute la fiche. Les cinq familles d’équipements, la marchabilité et le bruit viennent d’OpenStreetMap. Le flux piéton estimé, lui, mélange deux couches : la densité de commerces actifs et l’accès aux transports. Il nomme donc les deux sources, cumule leurs licences — un chiffre composé oblige à respecter les deux — et porte la plus ancienne de leurs deux dates, parce qu’un chiffre composé n’est jamais plus frais que son ingrédient le plus ancien. Dans le navigateur, les trois couches proviennent aujourd’hui du même instantané OpenStreetMap, donc la mention est unique. Ce n’est pas le cas de l’interface destinée aux agents, qui lit les locaux dans la BDCom de l’APUR et les équipements dans OpenStreetMap : le flux piéton y cite les deux.',
    missingTitle: 'Quand une source manque',
    missingBody:
      'Un score n’est calculé que si la couche de données dont il dépend a réellement été chargée. Si elle manque, Compass n’affiche pas 0 : il affiche « n/d » et indique pourquoi. La distinction compte surtout pour le bruit, où un 0 se lirait « très faible » — soit une rue calme affirmée à partir d’une donnée absente. Un quartier réellement dépourvu d’équipements, lui, reçoit bien un 0 : c’est un comptage, pas une lacune.',
    limitsTitle: 'Limites assumées',
    limits: [
      'Les scores dépendent de la complétude d’OpenStreetMap, inégale d’un quartier à l’autre.',
      'Le flux piéton et le bruit sont des estimations, pas des mesures.',
      'Compass n’affiche aucun loyer commercial : cette donnée n’existe pas en open data en France.',
      'Aucun score ne remplace une visite ni une étude de marché.',
    ],
  },
  en: {
    seoTitle: 'Score calculation methodology',
    seoDescription:
      'Formulas, radii, weightings and limitations of Compass scores: walkability, estimated foot traffic, road noise, air quality and reference rents.',
    jsonLdHeadline: 'Compass score calculation methodology',
    jsonLdAbout: 'Environmental scoring of commercial spaces based on open data',
    crumb: 'Methodology',
    title: 'Methodology',
    intro:
      'Every score shown by Compass is computed in the browser, from public data and formulas published here. No weighting is hidden.',
    walkTitle: 'Walkability score',
    walkBody1a: 'The walkability score rates from 0 to 100 the density of services reachable on foot within a ',
    walkBody1b: ' radius (roughly a 10-minute walk) around the space.',
    walkBody2a: 'Each amenity family gets a saturating sub-score:',
    walkBody2b: 'where n is the number of amenities within the radius and s the saturation constant. The first amenities push the score up sharply, later ones less and less — an eleventh supermarket doesn’t really improve a neighbourhood.',
    thFamily: 'Family',
    thWeight: 'Weight',
    thSaturation: 'Saturation constant',
    thSource: 'Source',
    saturationUnit: (n: string) => `${n} amenities`,
    footTitle: 'Estimated foot traffic',
    footBody:
      'No open pedestrian count covers all of Île-de-France. Compass therefore publishes a proxy: 65% density of active shops within a 400-metre radius (same saturating curve, constant 90) and 35% transport score. It lets you compare two locations against each other, not predict footfall or revenue.',
    noiseTitle: 'Noise exposure',
    noiseBody:
      'Noise level is estimated, not measured. Every road within 500 metres contributes proportionally to its class (motorway, primary, secondary, tertiary road) and decreasingly with distance. The result is mapped onto a 0-100 scale, split into four levels (very low, low, moderate, high). Replacement with Bruitparif’s strategic noise maps is planned.',
    airTitle: 'Air quality',
    airBody:
      'The European AQI (EAQI), PM2.5 and NO₂ come from Copernicus’ CAMS Europe model, queried for the map centre and refreshed every hour. These are neighbourhood-scale modelled values, not address-level measurements.',
    riskTitle: 'Risks',
    riskBody:
      'Natural and technological risks are those recorded by Géorisques within a 1 km radius. This information does not have the regulatory value of an official risk and pollution disclosure (ERP).',
    rentTitle: 'Neighbourhood residential rent',
    rentBody:
      'The figure shown is the reference rent in €/m²/month published by the City of Paris as part of rent control. It covers housing only and explicitly excludes commercial and professional premises: no public database publishes commercial rents. Compass therefore uses it for one thing — placing the residential standard of living of the neighbourhood, i.e. a catchment-area signal. It is never multiplied by a floor area, produces no commercial rent estimate, and filters no results. The prefectural grid splits each quartier into 32 cells (4 construction periods × 4 dwelling sizes × furnished or not): Compass averages all of them rather than pinning one, and displays the vintage of the decree next to the figure. The vintage published as open data lags the one in force.',
    detectTitle: 'Detecting spaces',
    detectBody:
      'Spaces come from OpenStreetMap: a space is considered vacant when it carries a vacant-shop or disused-shop attribute, and occupied when an activity is recorded. Coverage therefore depends on community contributions: a recently closed space that hasn’t been reported won’t appear.',
    provenanceTitle: 'Where each figure comes from',
    provenanceBody:
      'Every score carries the source of the data layer it actually reads, not one source stamped on the whole card. The five amenity families, walkability and noise come from OpenStreetMap. Estimated foot traffic mixes two layers instead — active-shop density and transport access — so it names both sources, carries both licences (a composite figure binds you to both), and takes the older of the two dates, because a composite is never fresher than its oldest ingredient. In the browser all three layers currently come from the same OpenStreetMap snapshot, so a single mention is accurate. That is not true of the agent-facing interface, which reads premises from APUR’s BDCom survey and amenities from OpenStreetMap: there, foot traffic cites both.',
    missingTitle: 'When a source is missing',
    missingBody:
      'A score is only computed if the data layer it depends on actually loaded. When that layer is missing, Compass does not show 0: it shows "n/a" and says why. The distinction matters most for noise, where a 0 would read as "very low" — a quiet street asserted from absent data. A neighbourhood genuinely without amenities does get a 0: that is a count, not a gap.',
    limitsTitle: 'Acknowledged limitations',
    limits: [
      'Scores depend on OpenStreetMap completeness, which varies from one neighbourhood to another.',
      'Foot traffic and noise are estimates, not measurements.',
      'Compass shows no commercial rent: that data does not exist as open data in France.',
      'No score replaces a site visit or a market study.',
    ],
  },
} as const;

const Methodology = () => {
  const { locale } = useLocale();
  const c = COPY[locale];

  return (
    <>
      <Seo
        title={c.seoTitle}
        description={c.seoDescription}
        path="/methodologie"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: c.jsonLdHeadline,
            url: `${SITE_URL}/methodologie`,
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            about: c.jsonLdAbout,
          },
        ]}
      />
      <PageLayout title={c.title} intro={c.intro} crumbs={[{ label: c.crumb }]}>
        <section>
          <h2 className="text-xl font-semibold">{c.walkTitle}</h2>
          <p className="mt-3 text-muted-foreground">
            {c.walkBody1a}<strong>{locale === 'en' ? '800 metres' : '800 mètres'}</strong>{c.walkBody1b}
          </p>
          <p className="mt-3 text-muted-foreground">
            {c.walkBody2a}
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
              score = 100 × (1 − e^(−n / s))
            </code>
            {c.walkBody2b}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-white">
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thFamily}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thWeight}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thSaturation}</th>
                  <th scope="col" className="py-2 font-semibold">{c.thSource}</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHTS.map((w) => (
                  <tr key={w.familyFr} className="border-b">
                    <td className="py-3 pr-4">{locale === 'fr' ? w.familyFr : w.familyEn}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{w.weight}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.saturationUnit(w.saturation)}</td>
                    <td className="py-3 text-muted-foreground">{w.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.footTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.footBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.noiseTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.noiseBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.airTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.airBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.riskTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.riskBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.rentTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.rentBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.detectTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.detectBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.provenanceTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.provenanceBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.missingTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.missingBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.limitsTitle}</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
            {c.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      </PageLayout>
    </>
  );
};

export default Methodology;
