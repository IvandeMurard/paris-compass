import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';

const About = () => (
  <>
    <Seo
      title="Ambition — contextualiser les locaux commerciaux"
      description="Compass replace chaque local commercial d’Île-de-France dans son environnement et permet de chercher par besoin plutôt que par adresse, à partir de données publiques uniquement."
      path="/a-propos"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'Ambition de Compass',
          url: `${SITE_URL}/a-propos`,
          publisher: {
            '@type': 'Organization',
            name: 'Compass',
            founder: { '@type': 'Person', name: 'Ivan de Murard' },
          },
        },
      ]}
    />
    <PageLayout
      title="L’ambition : replacer chaque local dans son environnement"
      intro="Une annonce immobilière décrit un local. Compass décrit ce qu’il y a autour, parce que c’est cet environnement qui fait la réussite d’une activité."
      crumbs={[{ label: 'Ambition' }]}
    >
      <section>
        <h2 className="text-xl font-semibold">Le problème</h2>
        <p className="mt-3 text-muted-foreground">
          Une annonce de local commercial tient en trois lignes : surface, loyer, adresse. Rien
          sur les commerces voisins, le passage réel, la desserte, le bruit de l’axe d’en face ou
          la qualité de l’air. Le porteur de projet doit reconstituer ce contexte à la main, quartier
          par quartier, alors que la plupart de ces informations existent déjà en accès libre.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Notre parti pris : la contextualisation</h2>
        <p className="mt-3 text-muted-foreground">
          Chaque local affiché sur Compass est accompagné de son environnement mesuré : densité de
          commerces actifs, accès aux transports, équipements générateurs de flux, exposition
          estimée au bruit routier, qualité de l’air en temps réel, risques recensés et loyer de
          référence du quartier. Le local n’est plus un point sur une carte, c’est une situation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Chercher par besoin, pas par adresse</h2>
        <p className="mt-3 text-muted-foreground">
          On ne cherche pas « un local rue de Charonne », on cherche « un local pour une
          boulangerie, avec du passage matin et soir, près d’écoles, à moins de 300 mètres d’un
          métro ». Compass traduit ce besoin en seuils sur les scores d’environnement et n’affiche
          que les locaux qui les satisfont, dans la zone visible à l’écran.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Données publiques, méthode publiée</h2>
        <p className="mt-3 text-muted-foreground">
          Compass n’utilise aucune donnée de démonstration et aucune donnée propriétaire. Tout est
          interrogé en direct auprès de services publics ouverts, et la formule de chaque score est
          publiée. Vous pouvez vérifier, contester et refaire nos calculs.
        </p>
        <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <Link className="text-primary underline" to="/sources">Les sources</Link> : producteur,
            usage et licence de chaque jeu de données.
          </li>
          <li>
            <Link className="text-primary underline" to="/methodologie">La méthodologie</Link> : les
            formules, les rayons, les pondérations et les limites assumées.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Ce que Compass ne fait pas</h2>
        <p className="mt-3 text-muted-foreground">
          Compass n’est pas une agence et ne commercialise aucun local. Il ne connaît ni les baux,
          ni les droits d’entrée, ni les chiffres d’affaires. Il sert à réduire une liste de
          quartiers à visiter, pas à décider à votre place.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Qui édite Compass</h2>
        <p className="mt-3 text-muted-foreground">
          Compass est conçu et développé par Ivan de Murard, à partir d’un constat simple : les
          données environnementales — bruit, air, flux, équipements — manquent aux annonces
          immobilières alors qu’elles conditionnent l’usage réel d’un lieu.
        </p>
      </section>
    </PageLayout>
  </>
);

export default About;
