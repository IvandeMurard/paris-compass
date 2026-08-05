export interface FaqItem {
  question: string;
  /** Direct answer first: this is the sentence answer engines quote. */
  answer: string;
  details?: string[];
}

export const FAQ: FaqItem[] = [
  {
    question: 'Qu’est-ce que Compass ?',
    answer:
      'Compass est un outil gratuit qui replace les locaux commerciaux d’Île-de-France dans leur environnement, à partir de données publiques interrogées en direct.',
    details: [
      'Là où une annonce classique décrit surtout une surface et un prix, Compass décrit ce qu’il y a autour : commerces actifs, transports, écoles, santé, parcs, exposition au bruit routier, qualité de l’air et loyers de référence du quartier.',
      'Aucune donnée de démonstration n’est utilisée : chaque chiffre affiché provient d’une source ouverte citée sur la page Sources.',
    ],
  },
  {
    question: 'Comment trouver un local commercial vacant à Paris ?',
    answer:
      'Sur Compass, les locaux repérés comme vacants proviennent d’OpenStreetMap (attributs de local vide ou de commerce désaffecté) et s’affichent directement sur la carte, dans la zone visible à l’écran.',
    details: [
      'Déplacez la carte sur le quartier visé : la liste et les scores se recalculent pour la zone affichée.',
      'Le filtre « locaux vacants » de la barre latérale masque les locaux occupés.',
      'La couverture dépend de la contribution OSM : un local fermé mais non signalé par la communauté n’apparaîtra pas. Compass complète donc une recherche terrain, il ne la remplace pas.',
    ],
  },
  {
    question: 'Qu’est-ce qu’un score de marchabilité ?',
    answer:
      'Le score de marchabilité de Compass note de 0 à 100 la densité de services accessibles à pied dans un rayon de 800 mètres autour du local.',
    details: [
      'Il combine cinq familles d’équipements : commerces alimentaires (30 %), santé (20 %), transports (20 %), écoles (15 %) et parcs (15 %).',
      'Chaque famille suit une courbe saturante : les premiers équipements font beaucoup monter le score, les suivants de moins en moins.',
      'Le détail des formules est publié sur la page Méthodologie.',
    ],
  },
  {
    question: 'D’où viennent les données affichées ?',
    answer:
      'Toutes les données proviennent de sources publiques : OpenStreetMap, Base Adresse Nationale, Sirene (INSEE), open data de la Ville de Paris, Copernicus/CAMS pour l’air et Géorisques pour les risques.',
    details: [
      'Elles sont appelées à la volée depuis le navigateur, sans base intermédiaire, puis mises en cache pour la durée de la session.',
      'Producteur, usage et licence de chaque jeu de données sont listés sur la page Sources.',
    ],
  },
  {
    question: 'Compass est-il gratuit ?',
    answer:
      'Oui. La consultation de la carte, des scores et des indicateurs d’environnement est gratuite et ne nécessite pas de compte.',
    details: [
      'Un compte sert uniquement à conserver ses recherches et ses préférences.',
    ],
  },
  {
    question: 'Comment chercher un local par besoin plutôt que par adresse ?',
    answer:
      'La barre de recherche accepte une adresse, un quartier ou un besoin exprimé en langage naturel, et les filtres traduisent ce besoin en seuils (surface, loyer, scores minimum).',
    details: [
      'Exemples de besoins : « local pour une boulangerie près d’écoles », « atelier calme avec du passage le week-end », « commerce à moins de 300 m d’un métro ».',
      'Les curseurs de la barre latérale permettent ensuite d’exiger un score minimum de commerces, de transports ou de flux piéton.',
    ],
  },
  {
    question: 'Quel loyer au m² afficher pour un quartier parisien ?',
    answer:
      'Compass affiche le loyer de référence par quartier issu du dispositif d’encadrement des loyers de la Ville de Paris, exprimé en €/m²/mois.',
    details: [
      'Ce repère concerne le logement : les loyers commerciaux ne font l’objet d’aucune publication ouverte en France.',
      'Il sert donc d’indicateur de niveau de marché du quartier, pas de prix de commercialisation d’un local.',
    ],
  },
  {
    question: 'Comment le flux piéton est-il estimé ?',
    answer:
      'Le flux piéton est une estimation : Compass combine la densité de commerces actifs dans un rayon de 400 mètres (65 %) et l’accès aux transports (35 %).',
    details: [
      'Aucun comptage piéton ouvert ne couvre l’ensemble de l’Île-de-France ; l’indicateur est un proxy, utile pour comparer deux emplacements, pas pour prévoir un chiffre d’affaires.',
    ],
  },
  {
    question: 'Le niveau de bruit affiché est-il une mesure ?',
    answer:
      'Non : le bruit affiché est une estimation calculée à partir de la proximité et de la classe des axes routiers proches, pas une mesure acoustique.',
    details: [
      'Les cartes de bruit stratégiques de Bruitparif sont prévues comme source de remplacement, ce qui permettra d’afficher des niveaux mesurés en dB(A).',
    ],
  },
  {
    question: 'La qualité de l’air affichée est-elle en temps réel ?',
    answer:
      'Oui : l’indice ATMO européen, les PM2.5 et le NO₂ proviennent du modèle CAMS de Copernicus et sont rafraîchis toutes les heures pour le centre de la carte.',
  },
  {
    question: 'Quels risques naturels ou technologiques sont signalés ?',
    answer:
      'Compass interroge Géorisques dans un rayon de 1 km autour du point observé et signale les risques naturels et technologiques recensés pour la commune.',
    details: [
      'Cette information ne remplace pas l’état des risques et pollutions (ERP) exigé lors d’une transaction.',
    ],
  },
  {
    question: 'Compass couvre-t-il toute l’Île-de-France ?',
    answer:
      'La carte, les aménités et les scores fonctionnent partout en Île-de-France ; les loyers de référence par quartier ne sont disponibles que pour Paris intra-muros.',
  },
  {
    question: 'Puis-je réutiliser les données affichées ?',
    answer:
      'Oui, dans le respect de la licence de chaque source : ODbL avec attribution pour OpenStreetMap et l’open data de la Ville de Paris, Licence Ouverte Etalab 2.0 pour la BAN, Sirene et Géorisques, CC BY 4.0 pour la qualité de l’air.',
  },
  {
    question: 'À quelle fréquence les données sont-elles mises à jour ?',
    answer:
      'Les données sont lues à chaque déplacement de carte : OpenStreetMap et Sirene reflètent l’état courant des bases, la qualité de l’air est horaire et les loyers de référence sont annuels.',
  },
  {
    question: 'Qui édite Compass ?',
    answer:
      'Compass est conçu et développé par Ivan de Murard, avec pour parti pris de n’utiliser que des données publiques et de publier la méthode de calcul des scores.',
  },
];
