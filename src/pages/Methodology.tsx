import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';

const WEIGHTS = [
  { family: 'Commerces alimentaires', weight: '30 %', saturation: '18 équipements', source: 'OpenStreetMap' },
  { family: 'Santé', weight: '20 %', saturation: '14 équipements', source: 'OpenStreetMap' },
  { family: 'Transports', weight: '20 %', saturation: '25 arrêts / stations', source: 'OpenStreetMap' },
  { family: 'Écoles', weight: '15 %', saturation: '8 établissements', source: 'OpenStreetMap' },
  { family: 'Parcs et espaces verts', weight: '15 %', saturation: '7 espaces', source: 'OpenStreetMap' },
];

const Methodology = () => (
  <>
    <Seo
      title="Méthodologie de calcul des scores"
      description="Formules, rayons, pondérations et limites des scores Compass : marchabilité, flux piéton estimé, bruit routier, qualité de l’air et loyers de référence."
      path="/methodologie"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: 'Méthodologie de calcul des scores Compass',
          url: `${SITE_URL}/methodologie`,
          author: { '@type': 'Person', name: 'Ivan de Murard' },
          about: 'Scoring environnemental de locaux commerciaux à partir de données ouvertes',
        },
      ]}
    />
    <PageLayout
      title="Méthodologie"
      intro="Chaque score affiché par Compass est calculé dans le navigateur, à partir de données publiques et de formules publiées ici. Aucune pondération n’est cachée."
      crumbs={[{ label: 'Méthodologie' }]}
    >
      <section>
        <h2 className="text-xl font-semibold">Score de marchabilité</h2>
        <p className="mt-3 text-muted-foreground">
          Le score de marchabilité note de 0 à 100 la densité de services accessibles à pied dans un
          rayon de <strong>800 mètres</strong> (environ 10 minutes de marche) autour du local.
        </p>
        <p className="mt-3 text-muted-foreground">
          Chaque famille d’équipements reçoit un sous-score saturant :
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
            score = 100 × (1 − e^(−n / s))
          </code>
          où <em>n</em> est le nombre d’équipements dans le rayon et <em>s</em> la constante de
          saturation. Les premiers équipements font fortement monter le score, les suivants de
          moins en moins — un onzième supermarché n’améliore pas réellement un quartier.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-white">
                <th scope="col" className="py-2 pr-4 font-semibold">Famille</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Poids</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Constante de saturation</th>
                <th scope="col" className="py-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {WEIGHTS.map((w) => (
                <tr key={w.family} className="border-b">
                  <td className="py-3 pr-4">{w.family}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{w.weight}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{w.saturation}</td>
                  <td className="py-3 text-muted-foreground">{w.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Flux piéton estimé</h2>
        <p className="mt-3 text-muted-foreground">
          Aucun comptage piéton ouvert ne couvre l’ensemble de l’Île-de-France. Compass publie donc
          un proxy : 65 % de densité de commerces actifs dans un rayon de 400 mètres (même courbe
          saturante, constante 90) et 35 % de score de transports. Il permet de comparer deux
          emplacements entre eux, pas de prévoir une fréquentation ou un chiffre d’affaires.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Exposition au bruit</h2>
        <p className="mt-3 text-muted-foreground">
          Le niveau de bruit est estimé, pas mesuré. Chaque axe routier situé à moins de 500 mètres
          contribue proportionnellement à sa classe (autoroute, voie primaire, secondaire,
          tertiaire) et de façon décroissante avec la distance. Le résultat est ramené sur une
          échelle 0-100, découpée en quatre niveaux (très faible, faible, modéré, élevé). Le
          remplacement par les cartes de bruit stratégiques de Bruitparif est prévu.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Qualité de l’air</h2>
        <p className="mt-3 text-muted-foreground">
          L’indice ATMO européen (EAQI), les PM2.5 et le NO₂ proviennent du modèle CAMS Europe de
          Copernicus, interrogé pour le centre de la carte et rafraîchi toutes les heures. Ce sont
          des valeurs modélisées à l’échelle du quartier, pas des mesures à l’adresse.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Risques</h2>
        <p className="mt-3 text-muted-foreground">
          Les risques naturels et technologiques sont ceux recensés par Géorisques dans un rayon de
          1 km. Cette information n’a pas valeur d’état des risques et pollutions (ERP) réglementaire.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Loyers de référence</h2>
        <p className="mt-3 text-muted-foreground">
          Le loyer affiché est le loyer de référence en €/m²/mois publié par la Ville de Paris dans
          le cadre de l’encadrement des loyers. Il concerne le logement : aucune base publique ne
          publie les loyers commerciaux. Il est utilisé comme repère relatif de niveau de marché
          entre quartiers, jamais comme prix de commercialisation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Détection des locaux</h2>
        <p className="mt-3 text-muted-foreground">
          Les locaux proviennent d’OpenStreetMap : un local est considéré comme vacant lorsqu’il
          porte un attribut de local vide ou de commerce désaffecté, et comme occupé lorsqu’une
          activité y est renseignée. La couverture dépend donc des contributions de la communauté :
          un local fermé récemment et non signalé n’apparaîtra pas.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Limites assumées</h2>
        <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Les scores dépendent de la complétude d’OpenStreetMap, inégale d’un quartier à l’autre.</li>
          <li>Le flux piéton et le bruit sont des estimations, pas des mesures.</li>
          <li>Les loyers de référence ne couvrent que Paris intra-muros et concernent le logement.</li>
          <li>Aucun score ne remplace une visite ni une étude de marché.</li>
        </ul>
      </section>
    </PageLayout>
  </>
);

export default Methodology;
