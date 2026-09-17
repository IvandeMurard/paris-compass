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
  // The three below entered this list on 26 August, and the delay was a defect rather than a
  // choice: the premise sheet has read APUR's BDCom and BODACC since 24 August (w0-fiche) and
  // the terrace register since today, while this page — the one that answers "where does this
  // come from?" — still listed neither. Two of the three are ODbL, whose attribution clause is
  // not satisfied by a per-row mention alone. The sheet was attributing correctly; the public
  // list of sources was incomplete, which is its own kind of false statement.
  {
    name: 'APUR BDCom — recensement des locaux commerciaux',
    nameEn: 'APUR BDCom — commercial premises survey',
    provider: 'Atelier parisien d’urbanisme (APUR)',
    providerEn: 'Atelier parisien d’urbanisme (APUR)',
    // Only 2023 is shown. 2017 and 2020 carry a licence that has not been read, so the
    // interface answers "millésime retenu" for them and discloses neither their content nor
    // whether a record exists — said here rather than left for the reader to discover.
    usage:
      'Activité, enseigne et vacance du local relevé, dans la fiche du local. Millésime 2023 seul : 2017 et 2020 sont retenus, leur licence n’ayant pas été lue.',
    usageEn:
      'Activity, trading name and vacancy of the surveyed premise, in the premise sheet. 2023 vintage only: 2017 and 2020 are withheld, their licence not having been read.',
    licence: 'ODbL-1.0 (millésime 2023)',
    licenceEn: 'ODbL-1.0 (2023 vintage)',
    // `bdcom_vintage.source_url` for 2023, verbatim — the same endpoint the sheet puts behind
    // "Consulter la source" on every 2023 row. Not a portal page written from memory.
    url: 'https://carto2.apur.org/apur/rest/services/BDCOM/bdcom2023/MapServer/0',
  },
  {
    name: 'BODACC — cessions de fonds et procédures collectives',
    nameEn: 'BODACC — business transfers and insolvency proceedings',
    provider: 'DILA / Journaux officiels',
    providerEn: 'DILA / Journaux officiels',
    usage:
      'Événements datés dans la chronologie du local : cession de fonds avec son prix publié, jugement, liquidation. Rattachés à une adresse, jamais au local lui-même.',
    usageEn:
      'Dated events in the premise chronology: business transfers with their published price, judgments, liquidations. Matched to an address, never to the premise itself.',
    // "Licence Ouverte" verbatim, as `source_licence` stores it and as the sheet prints it.
    licence: 'Licence Ouverte',
    licenceEn: 'Licence Ouverte (French open licence)',
    // The host of the per-announcement links the sheet already renders
    // (`.../annonces-commerciales-detail/?q.id=id:A2015…`).
    url: 'https://www.bodacc.fr/',
  },
  {
    name: 'Terrasses et étalages autorisés',
    nameEn: 'Authorised terraces and display stalls',
    provider: 'Direction de l’Urbanisme — Ville de Paris',
    providerEn: 'Direction de l’Urbanisme — City of Paris',
    usage:
      'Autorisation de terrasse ou d’étalage à l’adresse du local, avec son type. Un fait administratif : jamais la preuve qu’une terrasse est installée aujourd’hui.',
    usageEn:
      'Terrace or display-stall authorisation at the premise’s address, with its type. An administrative fact: never proof that a terrace is standing today.',
    licence: 'ODbL',
    licenceEn: 'ODbL',
    url: 'https://opendata.paris.fr/explore/dataset/terrasses-autorisations/',
  },
  // Deliberately absent, and the rule is the same for all four: a dataset is listed here once
  // a **screen reads it**, not once it is loaded. Claiming a provenance the interface does not
  // have is the one thing this product cannot afford.
  //   · Sirene — loaded (`scripts/ingest/sirene.ts`), client written
  //     (`services/opendata/sirene.ts`), queried by no component. Sits in the "upcoming" table.
  //   · PLU linéaires protégés and Chantiers perturbants — both loaded, both carried by
  //     `compass_premises_within`, and `premiseHistory.ts` maps neither onto `PremiseCandidate`.
  //     They join this list the day the sheet renders them, and not before.
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
