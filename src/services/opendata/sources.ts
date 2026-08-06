export interface DataSource {
  name: string;
  nameEn: string;
  provider: string;
  providerEn: string;
  usage: string;
  usageEn: string;
  licence: string;
  licenceEn: string;
  url: string;
}

/** Every open dataset Compass queries, shown in the "Sources" panel. */
export const DATA_SOURCES: DataSource[] = [
  {
    name: 'OpenStreetMap (Overpass API)',
    nameEn: 'OpenStreetMap (Overpass API)',
    provider: 'Contributeurs OSM',
    providerEn: 'OSM contributors',
    usage: 'Locaux commerciaux, commerces, écoles, santé, parcs, transports, voirie',
    usageEn: 'Commercial spaces, shops, schools, healthcare, parks, transport, road network',
    licence: 'ODbL',
    licenceEn: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'Base Adresse Nationale',
    nameEn: 'Base Adresse Nationale (national address database)',
    provider: 'Etalab / IGN',
    providerEn: 'Etalab / IGN',
    usage: 'Géocodage des recherches et des adresses',
    usageEn: 'Geocoding of searches and addresses',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://adresse.data.gouv.fr',
  },
  {
    name: 'Sirene — recherche d’entreprises',
    nameEn: 'Sirene — business register',
    provider: 'INSEE / DINUM',
    providerEn: 'INSEE / DINUM',
    usage: 'Établissements actifs autour du local, dynamisme commercial',
    usageEn: 'Active businesses around the space, commercial vitality',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://recherche-entreprises.api.gouv.fr/docs/',
  },
  {
    name: 'Encadrement des loyers',
    nameEn: 'Rent control reference (encadrement des loyers)',
    provider: 'Ville de Paris',
    providerEn: 'Ville de Paris',
    usage: 'Loyer de référence €/m² par quartier (repère de marché)',
    usageEn: 'Reference rent €/m² per neighbourhood (market benchmark)',
    licence: 'ODbL',
    licenceEn: 'ODbL',
    url: 'https://opendata.paris.fr/explore/dataset/logement-encadrement-des-loyers/',
  },
  {
    name: 'CAMS Europe — qualité de l’air',
    nameEn: 'CAMS Europe — air quality',
    provider: 'Copernicus / Open-Meteo',
    providerEn: 'Copernicus / Open-Meteo',
    usage: 'Indice ATMO européen, PM2.5, NO₂ en temps réel',
    usageEn: 'European AQI, PM2.5 and NO₂ in real time',
    licence: 'CC BY 4.0',
    licenceEn: 'CC BY 4.0',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  {
    name: 'Géorisques',
    nameEn: 'Géorisques',
    provider: 'BRGM / Ministère de la Transition écologique',
    providerEn: 'BRGM / French Ministry for Ecological Transition',
    usage: 'Risques naturels et technologiques dans un rayon de 1 km',
    usageEn: 'Natural and technological risks within a 1 km radius',
    licence: 'Licence Ouverte (Etalab 2.0)',
    licenceEn: 'Open Licence (Etalab 2.0)',
    url: 'https://www.georisques.gouv.fr',
  },
];
