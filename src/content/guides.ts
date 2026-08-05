export interface GuideSection {
  heading: string;
  /** Lead answer, quoted first by answer engines. */
  lead: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** ISO date of the last substantive edit. */
  updated: string;
  intro: string;
  sections: GuideSection[];
  cta: string;
}

export const GUIDES: Guide[] = [
  {
    slug: 'evaluer-emplacement-local-commercial',
    title: 'Comment évaluer l’emplacement d’un local commercial',
    description:
      'Méthode en 6 critères pour juger l’emplacement d’un local commercial avec des données publiques : commerces, transports, bruit, air, risques, loyers de référence.',
    updated: '2026-08-05',
    intro:
      'Un local ne vaut que ce que vaut son environnement. Voici les six critères que l’on peut vérifier gratuitement, avant même la visite, à partir de données publiques.',
    sections: [
      {
        heading: '1. La densité de commerces actifs autour du local',
        lead:
          'Un local entouré de commerces ouverts capte le flux existant ; un local isolé doit créer le sien.',
        paragraphs: [
          'Comptez les établissements actifs dans un rayon de 300 à 400 mètres. Le répertoire Sirene (INSEE) liste les établissements par adresse et par activité, et OpenStreetMap indique lesquels sont ouverts, vacants ou désaffectés.',
          'Regardez aussi la composition : une rue de commerces complémentaires (boulangerie, primeur, presse) porte le passage, une rue saturée par la même activité le fragmente.',
        ],
      },
      {
        heading: '2. L’accès aux transports',
        lead:
          'La distance à pied jusqu’à la station la plus proche pèse davantage que le nombre de lignes desservant le quartier.',
        paragraphs: [
          'Au-delà de 500 mètres, l’effet d’entraînement d’une station se dilue nettement. Vérifiez également les entrées : une station à 200 mètres à vol d’oiseau peut être à 600 mètres de marche réelle.',
        ],
      },
      {
        heading: '3. Les générateurs de flux',
        lead:
          'Écoles, équipements de santé, marchés et parcs créent des passages réguliers et prévisibles, à des horaires différents.',
        bullets: [
          'Écoles : pics matin et fin d’après-midi, en semaine.',
          'Santé : flux diffus toute la journée, souvent adulte.',
          'Parcs et marchés : pics du week-end.',
          'Bureaux : flux midi, effondrement le week-end et en août.',
        ],
        paragraphs: [
          'Faites correspondre ces rythmes à votre activité : une activité du soir dans un quartier de bureaux affronte une courbe de fréquentation inverse à la sienne.',
        ],
      },
      {
        heading: '4. L’exposition au bruit et à la pollution',
        lead:
          'Le bruit et la qualité de l’air conditionnent l’usage d’une terrasse, le confort d’un atelier et le tri de la clientèle.',
        paragraphs: [
          'La proximité d’un axe à fort trafic augmente l’exposition sonore et les concentrations de NO₂. L’indice ATMO européen (modèle CAMS de Copernicus) donne un état horaire, les cartes de bruit stratégiques donnent le niveau structurel.',
        ],
      },
      {
        heading: '5. Les risques recensés',
        lead:
          'Géorisques recense les risques naturels et technologiques de la commune : inondation, retrait-gonflement des argiles, sites industriels.',
        paragraphs: [
          'C’est un point de vigilance pour un local en sous-sol ou en rez-de-chaussée bas, et un sujet à aborder avec l’assureur avant signature.',
        ],
      },
      {
        heading: '6. Le niveau de marché du quartier',
        lead:
          'Les loyers commerciaux ne sont pas publiés en open data : utilisez les loyers de référence du logement comme repère relatif entre quartiers.',
        paragraphs: [
          'Le dispositif d’encadrement des loyers de la Ville de Paris publie un loyer de référence en €/m²/mois par quartier. Il ne donne pas le prix d’un local, mais il classe correctement les quartiers entre eux et signale les écarts inattendus.',
        ],
      },
    ],
    cta:
      'Compass calcule ces six critères automatiquement pour chaque local affiché sur la carte.',
  },
  {
    slug: 'ouvrir-un-commerce-a-paris-donnees',
    title: 'Ouvrir un commerce à Paris : ce que les données publiques peuvent dire',
    description:
      'Quelles données ouvertes utiliser pour choisir un quartier où ouvrir un commerce à Paris, et où s’arrêtent leurs limites.',
    updated: '2026-08-05',
    intro:
      'Avant l’étude de marché payante, une grande partie du travail de cadrage se fait avec des données publiques gratuites. Voici lesquelles, et ce qu’elles ne disent pas.',
    sections: [
      {
        heading: 'Cadrer la zone de chalandise',
        lead:
          'Commencez par une zone de marche de 10 minutes, soit environ 800 mètres, et ne raisonnez pas en arrondissement.',
        paragraphs: [
          'Un arrondissement parisien mélange des situations très différentes. Les quartiers administratifs (80 quartiers pour Paris) sont une maille plus fidèle, et les IRIS de l’INSEE le sont encore davantage pour la population et les revenus.',
        ],
      },
      {
        heading: 'Mesurer la concurrence',
        lead:
          'Le répertoire Sirene permet de compter les établissements de votre code d’activité déjà installés dans la zone.',
        paragraphs: [
          'Deux lectures : une absence totale peut signaler une opportunité comme un marché inexistant ; une forte concentration signale une demande réelle mais une place à prendre.',
        ],
      },
      {
        heading: 'Repérer les locaux disponibles',
        lead:
          'OpenStreetMap signale les locaux vacants et les commerces désaffectés, ce qui donne une carte du renouvellement d’une rue.',
        paragraphs: [
          'Une rue avec plusieurs vacances rapprochées mérite une visite : soit un cycle de rotation rapide, soit un décrochage commercial. La donnée dit où regarder, pas pourquoi.',
        ],
      },
      {
        heading: 'Qualifier l’environnement',
        lead:
          'Transports, écoles, santé, parcs, bruit routier et qualité de l’air se lisent tous dans des jeux de données ouverts.',
        bullets: [
          'Transports et aménités : OpenStreetMap.',
          'Adresses et géocodage : Base Adresse Nationale.',
          'Qualité de l’air : CAMS Europe via Open-Meteo.',
          'Risques : Géorisques (BRGM).',
          'Repère de loyers : encadrement des loyers, Ville de Paris.',
        ],
      },
      {
        heading: 'Ce que les données ne diront pas',
        lead:
          'Aucune donnée ouverte ne donne le loyer commercial réel, le droit au bail, le chiffre d’affaires du voisinage ni le comptage piéton précis.',
        paragraphs: [
          'Ces éléments se collectent sur le terrain, auprès des commerçants, de la CCI ou d’un broker. Les données publiques servent à réduire la liste de quartiers à visiter, pas à décider à votre place.',
        ],
      },
    ],
    cta:
      'Ouvrez la carte Compass sur un quartier pour voir ces indicateurs assemblés en un seul écran.',
  },
  {
    slug: 'loyers-commerciaux-paris-comprendre-les-references',
    title: 'Loyers commerciaux à Paris : comprendre les références disponibles',
    description:
      'Pourquoi les loyers commerciaux ne sont pas en open data, quelles références utiliser à la place et comment les interpréter.',
    updated: '2026-08-05',
    intro:
      'Question fréquente : « quel est le prix au m² d’un local commercial dans ce quartier ? ». La réponse honnête est qu’aucune base publique ne le donne. Voici les repères mobilisables.',
    sections: [
      {
        heading: 'Pourquoi aucune base publique ne donne le loyer commercial',
        lead:
          'Les baux commerciaux sont des contrats privés qui ne font l’objet d’aucune déclaration ouverte, contrairement aux ventes immobilières.',
        paragraphs: [
          'La base DVF publie les mutations de vente, pas les locations. Les observatoires de loyers portent sur le logement. Les niveaux de loyers commerciaux circulent via des acteurs privés, sur base déclarative.',
        ],
      },
      {
        heading: 'Le repère mobilisable : les loyers de référence du logement',
        lead:
          'Le dispositif d’encadrement des loyers publie, par quartier parisien, un loyer de référence et un loyer majoré en €/m²/mois.',
        paragraphs: [
          'Ce n’est pas un prix de local commercial, mais un classement fiable de la tension immobilière quartier par quartier. Utilisé en relatif — quartier A contre quartier B — il reste pertinent.',
        ],
      },
      {
        heading: 'Compléter avec les prix de vente réels',
        lead:
          'La base DVF (Demandes de valeurs foncières, Cerema/DGFiP) donne les prix de vente réels, y compris pour des locaux, et éclaire la valeur d’un secteur.',
      },
      {
        heading: 'Comment lire un écart',
        lead:
          'Un local nettement moins cher que le repère de son quartier signale presque toujours une contrainte : accès, surface, état, exposition, nuisance ou emplacement en second rideau.',
        paragraphs: [
          'C’est exactement ce que Compass cherche à rendre visible : la contextualisation explique l’écart de prix, là où une annonce seule le laisse deviner.',
        ],
      },
    ],
    cta:
      'La carte Compass affiche le loyer de référence du quartier à côté des scores d’environnement.',
  },
];

export const getGuide = (slug?: string) => GUIDES.find((g) => g.slug === slug);
