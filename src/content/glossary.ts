export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Marchabilité',
    definition:
      'Note de 0 à 100 mesurant la densité de services accessibles à pied dans un rayon de 800 mètres : commerces alimentaires, santé, transports, écoles et parcs.',
  },
  {
    term: 'Flux piéton (estimé)',
    definition:
      'Indicateur de passage calculé à partir de la densité de commerces actifs dans un rayon de 400 mètres et de l’accès aux transports. Il s’agit d’un proxy, pas d’un comptage.',
  },
  {
    term: 'EAQI (indice ATMO européen)',
    definition:
      'Indice européen de qualité de l’air noté de 0 à plus de 100 : jusqu’à 20 excellent, 40 bon, 60 moyen, 80 dégradé, au-delà mauvais. Compass le lit sur le modèle CAMS de Copernicus.',
  },
  {
    term: 'PM2.5',
    definition:
      'Particules fines de diamètre inférieur à 2,5 micromètres, exprimées en µg/m³. Elles pénètrent profondément dans l’appareil respiratoire.',
  },
  {
    term: 'NO₂ (dioxyde d’azote)',
    definition:
      'Polluant majoritairement issu du trafic routier, exprimé en µg/m³. Sa concentration est un bon marqueur de l’exposition à la circulation.',
  },
  {
    term: 'Local vacant',
    definition:
      'Local commercial signalé comme vide ou désaffecté dans OpenStreetMap (attributs de type local vide ou commerce hors service).',
  },
  {
    term: 'Loyer de référence',
    definition:
      'Loyer médian en €/m²/mois publié par quartier dans le cadre de l’encadrement des loyers parisiens. Il concerne le logement et sert ici de repère de niveau de marché.',
  },
  {
    term: 'IRIS',
    definition:
      'Découpage statistique de l’INSEE d’environ 2 000 habitants, plus fin que la commune ou l’arrondissement, utilisé pour la population et les revenus.',
  },
  {
    term: 'ODbL',
    definition:
      'Open Database License : licence libre imposant l’attribution de la source et le partage à l’identique des bases dérivées. C’est la licence d’OpenStreetMap.',
  },
  {
    term: 'Licence Ouverte (Etalab 2.0)',
    definition:
      'Licence de réutilisation des données publiques françaises, y compris commerciale, sous réserve de mentionner la source et la date de mise à jour.',
  },
  {
    term: 'Overpass API',
    definition:
      'Interface d’interrogation d’OpenStreetMap permettant de récupérer les objets d’une zone géographique selon leurs attributs.',
  },
  {
    term: 'Géorisques',
    definition:
      'Service du BRGM et du ministère de la Transition écologique recensant les risques naturels et technologiques par localisation.',
  },
];
