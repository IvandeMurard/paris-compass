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
  // Entered this list on 16 September 2026, the day the trade checklists started counting it —
  // w6-modes (#36). Loaded since 25 August (`w0-plu`, #9), and rightly absent from here for
  // three weeks: a dataset is listed once a SCREEN reads it, never once it is loaded.
  {
    name: 'PLU bioclimatique — protection du commerce et de l’artisanat',
    nameEn: 'Bioclimatic PLU — protection of commerce and craft',
    provider: 'Ville de Paris',
    providerEn: 'City of Paris',
    // What the screen counts, and the reserve that has to travel with it. The three flags are
    // kept apart rather than collapsed: the boutique checklist counts « at least one of the
    // three », the craft checklist counts `ppa` alone, and those are two different questions.
    usage:
      'Protection du commerce et de l’artisanat sur le linéaire de rue, comptée sur les locaux relevés à moins de 25 m dans les checklists métier de la fiche de contexte. Trois protections distinctes — générale, commerce artisanal de proximité, commerce culturel. Informatif, sans valeur réglementaire : l’autorité est le Portail des Règles d’Urbanisme.',
    usageEn:
      'Protection of commerce and craft along the street frontage, counted over the premises surveyed within 25 m in the trade checklists of the context sheet. Three distinct protections — general, local craft trade, cultural trade. Informational, with no regulatory value: the authority is the Portail des Règles d’Urbanisme.',
    licence: 'ODbL',
    licenceEn: 'ODbL',
    url: 'https://opendata.paris.fr/explore/dataset/plub_protcom/',
  },
  // Entered this list on 15 September 2026, the day `/contexte/:slug` started measuring an
  // axis from it — w6-amenites-corpus. Loaded since 7 September (`w2-idfm`, #19), and rightly
  // absent from here for eight days: a dataset is listed once a SCREEN reads it.
  {
    name: 'Île-de-France Mobilités — référentiel des arrêts',
    nameEn: 'Île-de-France Mobilités — stop reference',
    provider: 'Île-de-France Mobilités',
    providerEn: 'Île-de-France Mobilités',
    // What this layer measures, and what it does not. The hourly validation profiles are a
    // SEPARATE dataset with a separate licence, and they have their own entry below since
    // w2-rythme (#208) — until then this sentence said they served no figure, which was true
    // for eight days and stopped being true the day the sheet drew the shape of a day.
    usage:
      'Distance à l’arrêt ferré le plus proche — métro, RER, tramway — sur la fiche de contexte d’une adresse. 258 arrêts dans Paris. Les bus n’y sont pas. Les profils horaires de validation sont un autre jeu, sous une autre licence : voir la ligne suivante.',
    usageEn:
      'Distance to the nearest rail stop — metro, RER, tram — on the context sheet of an address. 258 stops inside Paris. Buses are not in it. The hourly validation profiles are a separate dataset under a separate licence: see the next row.',
    // The stop reference and the validation profiles carry DIFFERENT licences, and each figure
    // names its own. Naming ODbL here would bind a redistributor to an obligation the distance
    // does not carry; naming Etalab on the shape would release them from one it does.
    licence: 'Licence Ouverte 2.0 (Etalab) — référentiel des arrêts',
    licenceEn: 'Open Licence 2.0 (Etalab) — stop reference',
    url: 'https://data.iledefrance-mobilites.fr/explore/dataset/zones-d-arrets/',
  },
  // Entered this list on 17 September 2026, the day `/contexte/:slug` started SHOWING the shape
  // of a station's day — w2-rythme (#208). Loaded since 7 September with the stop reference
  // above and rightly absent from here for ten days: a dataset is listed once a screen reads
  // it. Its own row rather than a clause in the one above, because the two carry two licences
  // and a reader of this page has to be able to tell which obligation attaches to which figure.
  {
    name: 'Île-de-France Mobilités — validations, profils horaires',
    nameEn: 'Île-de-France Mobilités — validations, hourly profiles',
    provider: 'Île-de-France Mobilités',
    providerEn: 'Île-de-France Mobilités',
    usage:
      'La forme de la journée de l’arrêt le plus proche, sur la fiche de contexte d’une adresse : la part de la journée de cette station tombant dans chaque tranche horaire, un jour ouvré hors vacances scolaires. Une PART, jamais un compte — la source ne publie aucun volume, donc deux stations ne se comparent pas sur leur fréquentation. Et une validation se compte à la montée : le profil dit d’où l’on part, pas où l’on arrive. Aucune note, aucun score : ce constat n’entre pas dans le verdict.',
    usageEn:
      'The shape of the nearest stop’s day, on the context sheet of an address: the share of that station’s own day falling in each hour bucket, on a term-time working day. A SHARE, never a count — the source publishes no volume, so two stations cannot be compared on how busy they are. And a validation is counted on boarding: the profile says where people depart from, not where they arrive. No score and no rating: this finding does not enter the verdict.',
    licence: 'ODbL',
    licenceEn: 'ODbL',
    // A SEARCH on the family and not a dataset id, which is the one thing that cannot be
    // pinned here: IDFM republishes this family every quarter under an id that never settles
    // into one spelling (`20260907000002`'s header, and `scripts/ingest/lib/idfmOpendata.ts`,
    // which resolves it by title on every run for the same reason). Measured 17 September
    // 2026: the family id a reader would guess,
    // `…/explore/dataset/validations-reseau-ferre-profils-horaires-par-jour-type/`, answers
    // **404**, while this search answers **200** and lists all eight current editions. Pinning
    // the quarter that happens to be loaded today would repeat `#56` on the page whose whole
    // job is to say where a figure comes from.
    url: 'https://data.iledefrance-mobilites.fr/explore/?q=validations+profils+horaires+par+jour+type',
  },
  // Deliberately absent, and the rule is the same for all three: a dataset is listed here once
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
