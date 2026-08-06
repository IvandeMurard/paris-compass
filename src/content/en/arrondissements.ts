import type { Arrondissement } from '../arrondissements';

const box = (lat: number, lng: number) => ({ lat, lng });

export const ARRONDISSEMENTS_EN: Arrondissement[] = [
  {
    slug: '1er-arrondissement',
    number: 1,
    label: '1st',
    name: 'Louvre',
    center: box(48.8626, 2.3363),
    intro:
      'The historic and highly touristic heart of Paris, dominated by the Louvre, Les Halles and Rue de Rivoli, with one of the lowest resident populations in the capital.',
    quartiers: ['Saint-Germain-l’Auxerrois', 'Halles', 'Palais-Royal', 'Place-Vendôme'],
  },
  {
    slug: '2e-arrondissement',
    number: 2,
    label: '2nd',
    name: 'Bourse',
    center: box(48.8686, 2.3412),
    intro:
      'The smallest arrondissement in Paris, defined by its covered passages, Rue Montorgueil and a high density of offices and tertiary-sector activity.',
    quartiers: ['Gaillon', 'Vivienne', 'Mail', 'Bonne-Nouvelle'],
  },
  {
    slug: '3e-arrondissement',
    number: 3,
    label: '3rd',
    name: 'Temple',
    center: box(48.8637, 2.3615),
    intro:
      'The northern Marais, between Arts-et-Métiers and Rue de Bretagne, known for its galleries, independent boutiques and the Enfants Rouges market.',
    quartiers: ['Arts-et-Métiers', 'Enfants-Rouges', 'Archives', 'Sainte-Avoye'],
  },
  {
    slug: '4e-arrondissement',
    number: 4,
    label: '4th',
    name: 'Hôtel-de-Ville',
    center: box(48.8543, 2.3574),
    intro:
      'The southern Marais and the Île de la Cité and Île Saint-Louis: destination retail, heavy tourist footfall and narrow ground-floor commercial units.',
    quartiers: ['Saint-Merri', 'Saint-Gervais', 'Arsenal', 'Notre-Dame'],
  },
  {
    slug: '5e-arrondissement',
    number: 5,
    label: '5th',
    name: 'Panthéon',
    center: box(48.8448, 2.3471),
    intro:
      'The Latin Quarter, strongly shaped by universities and elite colleges, with a student-driven customer base and a strong presence of bookshops and restaurants.',
    quartiers: ['Saint-Victor', 'Jardin-des-Plantes', 'Val-de-Grâce', 'Sorbonne'],
  },
  {
    slug: '6e-arrondissement',
    number: 6,
    label: '6th',
    name: 'Luxembourg',
    center: box(48.8496, 2.3327),
    intro:
      'Saint-Germain-des-Prés and the Luxembourg Gardens: upscale retail, art galleries and among the highest property values in Paris.',
    quartiers: ['Monnaie', 'Odéon', 'Notre-Dame-des-Champs', 'Saint-Germain-des-Prés'],
  },
  {
    slug: '7e-arrondissement',
    number: 7,
    label: '7th',
    name: 'Palais-Bourbon',
    center: box(48.8565, 2.3125),
    intro:
      'An institutional arrondissement (National Assembly, government ministries, the Eiffel Tower), with pockets of retail activity such as Rue Cler or Rue du Bac.',
    quartiers: ['Saint-Thomas-d’Aquin', 'Invalides', 'École-Militaire', 'Gros-Caillou'],
  },
  {
    slug: '8e-arrondissement',
    number: 8,
    label: '8th',
    name: 'Élysée',
    center: box(48.8726, 2.3125),
    intro:
      'The Champs-Élysées, Rue Saint-Honoré and the central business district: very high daytime footfall, luxury retail and premium ground-floor rents.',
    quartiers: ['Champs-Élysées', 'Faubourg-du-Roule', 'Madeleine', 'Europe'],
  },
  {
    slug: '9e-arrondissement',
    number: 9,
    label: '9th',
    name: 'Opéra',
    center: box(48.8768, 2.3374),
    intro:
      'Department stores, the Opéra Garnier and SoPi: a mix of offices, high-footfall retail and lively residential streets south of Pigalle.',
    quartiers: ['Saint-Georges', 'Chaussée-d’Antin', 'Faubourg-Montmartre', 'Rochechouart'],
  },
  {
    slug: '10e-arrondissement',
    number: 10,
    label: '10th',
    name: 'Entrepôt',
    center: box(48.8760, 2.3595),
    intro:
      'The Gare du Nord and Gare de l’Est, and the Canal Saint-Martin: very high transit flows and retail corridors that vary sharply from one street to the next.',
    quartiers: ['Saint-Vincent-de-Paul', 'Porte-Saint-Denis', 'Porte-Saint-Martin', 'Hôpital-Saint-Louis'],
  },
  {
    slug: '11e-arrondissement',
    number: 11,
    label: '11th',
    name: 'Popincourt',
    center: box(48.8594, 2.3765),
    intro:
      'One of the most densely populated districts in Europe, home to Oberkampf, Bastille and Boulevard Voltaire: a high concentration of restaurants and bars.',
    quartiers: ['Folie-Méricourt', 'Saint-Ambroise', 'Roquette', 'Sainte-Marguerite'],
  },
  {
    slug: '12e-arrondissement',
    number: 12,
    label: '12th',
    name: 'Reuilly',
    center: box(48.8412, 2.3876),
    intro:
      'Bercy, Nation and the Bois de Vincennes: a large arrondissement combining major facilities, residential neighbourhoods and retail axes such as Faubourg Saint-Antoine.',
    quartiers: ['Bel-Air', 'Picpus', 'Bercy', 'Quinze-Vingts'],
  },
  {
    slug: '13e-arrondissement',
    number: 13,
    label: '13th',
    name: 'Gobelins',
    center: box(48.8283, 2.3625),
    intro:
      'Butte-aux-Cailles, Les Olympiades and Paris Rive Gauche: a mix of older fabric, 1970s tower blocks and new-build developments around Austerlitz.',
    quartiers: ['Salpêtrière', 'Gare', 'Maison-Blanche', 'Croulebarbe'],
  },
  {
    slug: '14e-arrondissement',
    number: 14,
    label: '14th',
    name: 'Observatoire',
    center: box(48.8331, 2.3264),
    intro:
      'Montparnasse, Alésia and Denfert-Rochereau: a residential arrondissement with well-defined linear retail hubs.',
    quartiers: ['Montparnasse', 'Parc-de-Montsouris', 'Petit-Montrouge', 'Plaisance'],
  },
  {
    slug: '15e-arrondissement',
    number: 15,
    label: '15th',
    name: 'Vaugirard',
    center: box(48.8412, 2.2998),
    intro:
      'The most populous arrondissement in Paris, largely residential, with long shopping streets such as Rue du Commerce, Rue de Vaugirard and Rue Lecourbe.',
    quartiers: ['Saint-Lambert', 'Necker', 'Grenelle', 'Javel'],
  },
  {
    slug: '16e-arrondissement',
    number: 16,
    label: '16th',
    name: 'Passy',
    center: box(48.8637, 2.2769),
    intro:
      'Passy, Auteuil and the Bois de Boulogne: an affluent residential arrondissement, with neighbourhood retail concentrated on a handful of central streets.',
    quartiers: ['Auteuil', 'Muette', 'Porte-Dauphine', 'Chaillot'],
  },
  {
    slug: '17e-arrondissement',
    number: 17,
    label: '17th',
    name: 'Batignolles-Monceau',
    center: box(48.8836, 2.3219),
    intro:
      'From Les Batignolles to Monceau and Clichy-Batignolles: a contrasted arrondissement, with a fast-changing area around the new Clichy-Batignolles district.',
    quartiers: ['Ternes', 'Plaine-de-Monceaux', 'Batignolles', 'Épinettes'],
  },
  {
    slug: '18e-arrondissement',
    number: 18,
    label: '18th',
    name: 'Buttes-Montmartre',
    center: box(48.8925, 2.3444),
    intro:
      'Montmartre, Barbès and La Chapelle: very high population density, tourist footfall concentrated on the Butte, and highly active markets.',
    quartiers: ['Grandes-Carrières', 'Clignancourt', 'Goutte-d’Or', 'La Chapelle'],
  },
  {
    slug: '19e-arrondissement',
    number: 19,
    label: '19th',
    name: 'Buttes-Chaumont',
    center: box(48.8817, 2.3822),
    intro:
      'The Bassin de la Villette, Parc des Buttes-Chaumont and Cité des Sciences: major cultural facilities and an evolving retail fabric along the canals.',
    quartiers: ['Villette', 'Pont-de-Flandre', 'Amérique', 'Combat'],
  },
  {
    slug: '20e-arrondissement',
    number: 20,
    label: '20th',
    name: 'Ménilmontant',
    center: box(48.8635, 2.3985),
    intro:
      'Belleville, Ménilmontant and Père-Lachaise: a lively, working-class arrondissement with dense neighbourhood retail and rents more affordable than in central Paris.',
    quartiers: ['Belleville', 'Saint-Fargeau', 'Père-Lachaise', 'Charonne'],
  },
];

export const getArrondissementEn = (slug?: string) =>
  ARRONDISSEMENTS_EN.find((a) => a.slug === slug);
