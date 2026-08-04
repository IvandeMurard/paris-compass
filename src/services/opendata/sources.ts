export interface DataSource {
  name: string;
  provider: string;
  usage: string;
  licence: string;
  url: string;
}

/** Every open dataset Compass queries, shown in the "Sources" panel. */
export const DATA_SOURCES: DataSource[] = [
  {
    name: 'OpenStreetMap (Overpass API)',
    provider: 'Contributeurs OSM',
    usage: 'Locaux commerciaux, commerces, écoles, santé, parcs, transports, voirie',
    licence: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'Base Adresse Nationale',
    provider: 'Etalab / IGN',
    usage: 'Géocodage des recherches et des adresses',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://adresse.data.gouv.fr',
  },
  {
    name: 'Sirene — recherche d’entreprises',
    provider: 'INSEE / DINUM',
    usage: 'Établissements actifs autour du local, dynamisme commercial',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://recherche-entreprises.api.gouv.fr/docs/',
  },
  {
    name: 'Encadrement des loyers',
    provider: 'Ville de Paris',
    usage: 'Loyer de référence €/m² par quartier (repère de marché)',
    licence: 'ODbL',
    url: 'https://opendata.paris.fr/explore/dataset/logement-encadrement-des-loyers/',
  },
  {
    name: 'CAMS Europe — qualité de l’air',
    provider: 'Copernicus / Open-Meteo',
    usage: 'Indice ATMO européen, PM2.5, NO₂ en temps réel',
    licence: 'CC BY 4.0',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  {
    name: 'Géorisques',
    provider: 'BRGM / Ministère de la Transition écologique',
    usage: 'Risques naturels et technologiques dans un rayon de 1 km',
    licence: 'Licence Ouverte (Etalab 2.0)',
    url: 'https://www.georisques.gouv.fr',
  },
];
