import type { Guide } from '../guides';

export const GUIDES_EN: Guide[] = [
  {
    slug: 'evaluer-emplacement-local-commercial',
    title: 'How to evaluate the location of a commercial property',
    description:
      'A 6-criteria method for judging a commercial property location using public data: shops, transport, noise, air quality, risks, and reference rents.',
    updated: '2026-08-05',
    intro:
      'A property is only as good as its surroundings. Here are six criteria you can check for free, even before the viewing, using public data.',
    sections: [
      {
        heading: '1. Density of active shops nearby',
        lead:
          'A property surrounded by open shops captures existing footfall; an isolated property has to create its own.',
        paragraphs: [
          'Count active establishments within a 300 to 400 metre radius. The Sirene (INSEE) directory lists establishments by address and activity, and OpenStreetMap shows which ones are open, vacant, or derelict.',
          'Also look at the mix: a street of complementary shops (bakery, greengrocer, newsagent) drives footfall, while a street saturated with the same activity fragments it.',
        ],
      },
      {
        heading: '2. Access to public transport',
        lead:
          'Walking distance to the nearest station matters more than the number of lines serving the neighbourhood.',
        paragraphs: [
          'Beyond 500 metres, a station\u2019s pulling power drops off sharply. Also check the actual entrances: a station 200 metres away as the crow flies can mean a 600-metre walk in practice.',
        ],
      },
      {
        heading: '3. Footfall generators',
        lead:
          'Schools, healthcare facilities, markets, and parks create regular, predictable footfall at different times of day.',
        bullets: [
          'Schools: peaks in the morning and late afternoon, on weekdays.',
          'Healthcare: steady footfall throughout the day, mostly adults.',
          'Parks and markets: weekend peaks.',
          'Offices: lunchtime peaks, with a sharp drop on weekends and in August.',
        ],
        paragraphs: [
          'Match these rhythms to your business: an evening venue in an office district faces a footfall curve that runs opposite to its own.',
        ],
      },
      {
        heading: '4. Exposure to noise and pollution',
        lead:
          'Noise and air quality determine how usable a terrace is, how comfortable a workshop feels, and how customers self-select.',
        paragraphs: [
          'Proximity to a busy road increases noise exposure and NO\u2082 concentrations. The European ATMO index (Copernicus CAMS model) gives an hourly reading, while strategic noise maps give the structural level.',
        ],
      },
      {
        heading: '5. Recorded risks',
        lead:
          'Géorisques lists natural and technological risks for a given municipality: flooding, clay shrink-swell, and industrial sites.',
        paragraphs: [
          'This is a point of caution for a basement or low ground-floor unit, and a subject worth raising with the insurer before signing.',
        ],
      },
      {
        heading: '6. Local market level',
        lead:
          'Commercial rents are not published as open data: use residential reference rents as a relative benchmark between neighbourhoods.',
        paragraphs: [
          'The City of Paris rent control scheme publishes a reference rent in €/m²/month by neighbourhood. It doesn\u2019t give the price of a commercial unit, but it ranks neighbourhoods correctly against each other and flags unexpected gaps.',
        ],
      },
    ],
    cta:
      'Compass calculates these six criteria automatically for every listing shown on the map.',
  },
  {
    slug: 'ouvrir-un-commerce-a-paris-donnees',
    title: 'Opening a business in Paris: what public data can tell you',
    description:
      'Which open datasets to use when choosing a neighbourhood to open a business in Paris, and where their limits lie.',
    updated: '2026-08-05',
    intro:
      'Before commissioning a paid market study, much of the groundwork can be done with free public data. Here\u2019s what to use, and what it doesn\u2019t tell you.',
    sections: [
      {
        heading: 'Defining the catchment area',
        lead:
          'Start with a 10-minute walking zone, roughly 800 metres, rather than thinking in terms of arrondissement.',
        paragraphs: [
          'A Paris arrondissement blends very different situations. The city\u2019s administrative neighbourhoods (80 "quartiers" for Paris) give a more accurate grid, and INSEE\u2019s IRIS zones are even finer for population and income data.',
        ],
      },
      {
        heading: 'Measuring competition',
        lead:
          'The Sirene directory lets you count establishments in your activity code already operating in the area.',
        paragraphs: [
          'Two readings are possible: a total absence can signal either an opportunity or a non-existent market; a high concentration signals real demand but a crowded field.',
        ],
      },
      {
        heading: 'Spotting available units',
        lead:
          'OpenStreetMap flags vacant units and closed shops, giving a picture of turnover on a given street.',
        paragraphs: [
          'A street with several vacancies close together is worth a visit: it could mean a fast rotation cycle, or a commercial decline. The data tells you where to look, not why.',
        ],
      },
      {
        heading: 'Assessing the surroundings',
        lead:
          'Transport, schools, healthcare, parks, road noise, and air quality can all be read from open datasets.',
        bullets: [
          'Transport and amenities: OpenStreetMap.',
          'Addresses and geocoding: Base Adresse Nationale.',
          'Air quality: CAMS Europe via Open-Meteo.',
          'Risks: Géorisques (BRGM).',
          'Rent benchmark: City of Paris rent control scheme.',
        ],
      },
      {
        heading: 'What the data won\u2019t tell you',
        lead:
          'No open dataset gives you the actual commercial rent, the lease premium, neighbouring businesses\u2019 turnover, or precise foot-traffic counts.',
        paragraphs: [
          'Those come from on-the-ground research, from shopkeepers, the local chamber of commerce, or a broker. Public data helps narrow down the list of neighbourhoods to visit — it doesn\u2019t decide for you.',
        ],
      },
    ],
    cta:
      'Open the Compass map on a neighbourhood to see these indicators brought together on a single screen.',
  },
  {
    slug: 'loyers-commerciaux-paris-comprendre-les-references',
    title: 'Commercial rents in Paris: understanding the available benchmarks',
    description:
      'Why commercial rents aren\u2019t open data, which benchmarks to use instead, and how to interpret them.',
    updated: '2026-08-05',
    intro:
      'A common question is: "what\u2019s the price per square metre for a commercial unit in this neighbourhood?" The honest answer is that no public database provides it. Here are the benchmarks you can actually use.',
    sections: [
      {
        heading: 'Why no public database gives commercial rent',
        lead:
          'Commercial leases are private contracts with no open reporting requirement, unlike property sales.',
        paragraphs: [
          'The DVF database publishes sale transactions, not rentals. Rent observatories cover residential housing only. Commercial rent levels circulate through private players, on a self-reported basis.',
        ],
      },
      {
        heading: 'The usable benchmark: residential reference rents',
        lead:
          'The rent control scheme publishes, for each Paris neighbourhood, a reference rent and a rent ceiling in €/m²/month.',
        paragraphs: [
          'This isn\u2019t a commercial rent, but it\u2019s a reliable ranking of housing market pressure neighbourhood by neighbourhood. Used relatively — neighbourhood A versus neighbourhood B — it remains a useful signal.',
        ],
      },
      {
        heading: 'Supplementing with actual sale prices',
        lead:
          'The DVF database (Demandes de valeurs foncières, Cerema/DGFiP) provides actual sale prices, including for commercial units, and sheds light on an area\u2019s value.',
      },
      {
        heading: 'How to read a gap',
        lead:
          'A property priced well below its neighbourhood\u2019s benchmark almost always signals a constraint: access, size, condition, exposure, nuisance, or a secondary location.',
        paragraphs: [
          'This is exactly what Compass aims to make visible: context explains the price gap, where a listing alone leaves you guessing.',
        ],
      },
    ],
    cta:
      'The Compass map displays the neighbourhood\u2019s reference rent alongside the environment scores.',
  },
];
