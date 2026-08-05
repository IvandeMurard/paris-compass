export interface Arrondissement {
  slug: string;
  number: number;
  label: string;
  /** Common name of the arrondissement (official denomination). */
  name: string;
  center: { lat: number; lng: number };
  /** Neutral, verifiable framing: named quartiers and landmarks. */
  intro: string;
  quartiers: string[];
}

const box = (lat: number, lng: number) => ({ lat, lng });

export const ARRONDISSEMENTS: Arrondissement[] = [
  {
    slug: '1er-arrondissement',
    number: 1,
    label: '1er',
    name: 'Louvre',
    center: box(48.8626, 2.3363),
    intro:
      'Cœur historique et très touristique de Paris, dominé par le Louvre, les Halles et la rue de Rivoli, avec une population résidente parmi les plus faibles de la capitale.',
    quartiers: ['Saint-Germain-l’Auxerrois', 'Halles', 'Palais-Royal', 'Place-Vendôme'],
  },
  {
    slug: '2e-arrondissement',
    number: 2,
    label: '2e',
    name: 'Bourse',
    center: box(48.8686, 2.3412),
    intro:
      'Le plus petit arrondissement de Paris, marqué par les passages couverts, la rue Montorgueil et une forte densité de bureaux et d’activités tertiaires.',
    quartiers: ['Gaillon', 'Vivienne', 'Mail', 'Bonne-Nouvelle'],
  },
  {
    slug: '3e-arrondissement',
    number: 3,
    label: '3e',
    name: 'Temple',
    center: box(48.8637, 2.3615),
    intro:
      'Nord du Marais, entre Arts-et-Métiers et rue de Bretagne, connu pour ses galeries, ses boutiques indépendantes et le marché des Enfants Rouges.',
    quartiers: ['Arts-et-Métiers', 'Enfants-Rouges', 'Archives', 'Sainte-Avoye'],
  },
  {
    slug: '4e-arrondissement',
    number: 4,
    label: '4e',
    name: 'Hôtel-de-Ville',
    center: box(48.8543, 2.3574),
    intro:
      'Sud du Marais et îles de la Cité et Saint-Louis : commerce de destination, flux touristiques élevés et rez-de-chaussée commerciaux étroits.',
    quartiers: ['Saint-Merri', 'Saint-Gervais', 'Arsenal', 'Notre-Dame'],
  },
  {
    slug: '5e-arrondissement',
    number: 5,
    label: '5e',
    name: 'Panthéon',
    center: box(48.8448, 2.3471),
    intro:
      'Quartier latin, très marqué par les universités et les grandes écoles, avec une clientèle étudiante et une forte présence de librairies et de restauration.',
    quartiers: ['Saint-Victor', 'Jardin-des-Plantes', 'Val-de-Grâce', 'Sorbonne'],
  },
  {
    slug: '6e-arrondissement',
    number: 6,
    label: '6e',
    name: 'Luxembourg',
    center: box(48.8496, 2.3327),
    intro:
      'Saint-Germain-des-Prés et le jardin du Luxembourg : commerce haut de gamme, galeries d’art et niveaux de valeur immobilière parmi les plus élevés de Paris.',
    quartiers: ['Monnaie', 'Odéon', 'Notre-Dame-des-Champs', 'Saint-Germain-des-Prés'],
  },
  {
    slug: '7e-arrondissement',
    number: 7,
    label: '7e',
    name: 'Palais-Bourbon',
    center: box(48.8565, 2.3125),
    intro:
      'Arrondissement institutionnel (Assemblée nationale, ministères, tour Eiffel), avec des pôles commerçants localisés comme la rue Cler ou la rue du Bac.',
    quartiers: ['Saint-Thomas-d’Aquin', 'Invalides', 'École-Militaire', 'Gros-Caillou'],
  },
  {
    slug: '8e-arrondissement',
    number: 8,
    label: '8e',
    name: 'Élysée',
    center: box(48.8726, 2.3125),
    intro:
      'Champs-Élysées, Saint-Honoré et quartier d’affaires : très forte fréquentation en journée, commerce de luxe et loyers de pied d’immeuble élevés.',
    quartiers: ['Champs-Élysées', 'Faubourg-du-Roule', 'Madeleine', 'Europe'],
  },
  {
    slug: '9e-arrondissement',
    number: 9,
    label: '9e',
    name: 'Opéra',
    center: box(48.8768, 2.3374),
    intro:
      'Grands magasins, Opéra Garnier et SoPi : mélange de bureaux, de commerce de flux et de rues résidentielles très animées au sud de Pigalle.',
    quartiers: ['Saint-Georges', 'Chaussée-d’Antin', 'Faubourg-Montmartre', 'Rochechouart'],
  },
  {
    slug: '10e-arrondissement',
    number: 10,
    label: '10e',
    name: 'Entrepôt',
    center: box(48.8760, 2.3595),
    intro:
      'Gares du Nord et de l’Est, canal Saint-Martin : flux de transit très importants et corridors commerçants contrastés d’une rue à l’autre.',
    quartiers: ['Saint-Vincent-de-Paul', 'Porte-Saint-Denis', 'Porte-Saint-Martin', 'Hôpital-Saint-Louis'],
  },
  {
    slug: '11e-arrondissement',
    number: 11,
    label: '11e',
    name: 'Popincourt',
    center: box(48.8594, 2.3765),
    intro:
      'Un des arrondissements les plus densément peuplés d’Europe, avec Oberkampf, Bastille et le boulevard Voltaire : forte densité de restauration et de bars.',
    quartiers: ['Folie-Méricourt', 'Saint-Ambroise', 'Roquette', 'Sainte-Marguerite'],
  },
  {
    slug: '12e-arrondissement',
    number: 12,
    label: '12e',
    name: 'Reuilly',
    center: box(48.8412, 2.3876),
    intro:
      'Bercy, Nation et le bois de Vincennes : arrondissement étendu, mêlant grands équipements, quartiers résidentiels et axes commerçants comme le faubourg Saint-Antoine.',
    quartiers: ['Bel-Air', 'Picpus', 'Bercy', 'Quinze-Vingts'],
  },
  {
    slug: '13e-arrondissement',
    number: 13,
    label: '13e',
    name: 'Gobelins',
    center: box(48.8283, 2.3625),
    intro:
      'Butte-aux-Cailles, Olympiades et Paris Rive Gauche : cohabitation d’un tissu ancien, de tours des années 1970 et de programmes neufs autour d’Austerlitz.',
    quartiers: ['Salpêtrière', 'Gare', 'Maison-Blanche', 'Croulebarbe'],
  },
  {
    slug: '14e-arrondissement',
    number: 14,
    label: '14e',
    name: 'Observatoire',
    center: box(48.8331, 2.3264),
    intro:
      'Montparnasse, Alésia et Denfert-Rochereau : arrondissement résidentiel avec des pôles commerçants linéaires bien identifiés.',
    quartiers: ['Montparnasse', 'Parc-de-Montsouris', 'Petit-Montrouge', 'Plaisance'],
  },
  {
    slug: '15e-arrondissement',
    number: 15,
    label: '15e',
    name: 'Vaugirard',
    center: box(48.8412, 2.2998),
    intro:
      'Arrondissement le plus peuplé de Paris, très résidentiel, avec de longues artères commerçantes comme les rues du Commerce, de Vaugirard et Lecourbe.',
    quartiers: ['Saint-Lambert', 'Necker', 'Grenelle', 'Javel'],
  },
  {
    slug: '16e-arrondissement',
    number: 16,
    label: '16e',
    name: 'Passy',
    center: box(48.8637, 2.2769),
    intro:
      'Passy, Auteuil et le bois de Boulogne : arrondissement résidentiel aisé, avec un commerce de proximité concentré sur quelques rues centrales.',
    quartiers: ['Auteuil', 'Muette', 'Porte-Dauphine', 'Chaillot'],
  },
  {
    slug: '17e-arrondissement',
    number: 17,
    label: '17e',
    name: 'Batignolles-Monceau',
    center: box(48.8836, 2.3219),
    intro:
      'Des Batignolles à Monceau et Clichy-Batignolles : arrondissement contrasté, avec un secteur en fort renouvellement autour du nouveau quartier Clichy-Batignolles.',
    quartiers: ['Ternes', 'Plaine-de-Monceaux', 'Batignolles', 'Épinettes'],
  },
  {
    slug: '18e-arrondissement',
    number: 18,
    label: '18e',
    name: 'Buttes-Montmartre',
    center: box(48.8925, 2.3444),
    intro:
      'Montmartre, Barbès et La Chapelle : très forte densité de population, fréquentation touristique concentrée sur la Butte et marchés très actifs.',
    quartiers: ['Grandes-Carrières', 'Clignancourt', 'Goutte-d’Or', 'La Chapelle'],
  },
  {
    slug: '19e-arrondissement',
    number: 19,
    label: '19e',
    name: 'Buttes-Chaumont',
    center: box(48.8817, 2.3822),
    intro:
      'Bassin de la Villette, parc des Buttes-Chaumont et Cité des sciences : grands équipements culturels et tissu commercial en évolution le long des canaux.',
    quartiers: ['Villette', 'Pont-de-Flandre', 'Amérique', 'Combat'],
  },
  {
    slug: '20e-arrondissement',
    number: 20,
    label: '20e',
    name: 'Ménilmontant',
    center: box(48.8635, 2.3985),
    intro:
      'Belleville, Ménilmontant et Père-Lachaise : arrondissement populaire et vivant, avec un commerce de proximité dense et des loyers plus accessibles qu’au centre.',
    quartiers: ['Belleville', 'Saint-Fargeau', 'Père-Lachaise', 'Charonne'],
  },
];

export const getArrondissement = (slug?: string) =>
  ARRONDISSEMENTS.find((a) => a.slug === slug);
