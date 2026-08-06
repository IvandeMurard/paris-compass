import type { GlossaryEntry } from '../glossary';

export const GLOSSARY_EN: GlossaryEntry[] = [
  {
    term: 'Walkability',
    definition:
      'Score from 0 to 100 measuring the density of services accessible on foot within an 800-metre radius: food shops, healthcare, transport, schools and parks.',
  },
  {
    term: 'Foot traffic (estimated)',
    definition:
      'Footfall indicator calculated from the density of active businesses within a 400-metre radius and access to transport. It is a proxy, not an actual count.',
  },
  {
    term: 'EAQI (European Air Quality Index)',
    definition:
      'European air quality index rated from 0 to over 100: up to 20 excellent, 40 good, 60 moderate, 80 poor, above that very poor. Compass reads it from Copernicus\'s CAMS model.',
  },
  {
    term: 'PM2.5',
    definition:
      'Fine particles with a diameter of less than 2.5 micrometres, expressed in µg/m³. They penetrate deep into the respiratory system.',
  },
  {
    term: 'NO₂ (nitrogen dioxide)',
    definition:
      'Pollutant mainly produced by road traffic, expressed in µg/m³. Its concentration is a good marker of exposure to traffic.',
  },
  {
    term: 'Vacant premises',
    definition:
      'Commercial premises flagged as empty or disused in OpenStreetMap (tags such as empty premises or shop out of service).',
  },
  {
    term: 'Reference rent',
    definition:
      'Median rent in €/m²/month published by neighbourhood under the Paris rent control scheme. It relates to residential housing and is used here as a market-level benchmark.',
  },
  {
    term: 'IRIS',
    definition:
      'INSEE statistical unit of around 2,000 residents, finer-grained than the municipality or arrondissement, used for population and income data.',
  },
  {
    term: 'ODbL',
    definition:
      'Open Database License: a free licence requiring attribution of the source and share-alike distribution of derived databases. It is OpenStreetMap\'s licence.',
  },
  {
    term: 'Open Licence (Etalab 2.0)',
    definition:
      'Licence for reusing French public data, including for commercial purposes, provided the source and update date are mentioned.',
  },
  {
    term: 'Overpass API',
    definition:
      'OpenStreetMap query interface used to retrieve features in a geographic area based on their tags.',
  },
  {
    term: 'Géorisques',
    definition:
      'Service run by the BRGM and the Ministry for Ecological Transition listing natural and technological hazards by location.',
  },
];
