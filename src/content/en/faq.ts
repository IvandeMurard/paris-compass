import type { FaqItem } from '../faq';

export const FAQ_EN: FaqItem[] = [
  {
    question: 'What is Compass?',
    answer:
      'Compass is a free tool that places commercial premises across Île-de-France in context, using public data queried live.',
    details: [
      'Where a standard listing mostly describes a floor area and a price, Compass describes what surrounds it: active businesses, transport, schools, healthcare, parks, exposure to road noise, air quality and reference rents for the neighbourhood.',
      'No demonstration data is used: every figure shown comes from an open source cited on the Sources page.',
    ],
  },
  {
    question: 'How can I find a vacant commercial premises in Paris?',
    answer:
      'On Compass, premises identified as vacant come from OpenStreetMap (tags for empty premises or disused shops) and appear directly on the map, within the area currently visible on screen.',
    details: [
      'Move the map to the neighbourhood you are targeting: the list and scores are recalculated for the area shown.',
      'The "vacant premises" filter in the sidebar hides occupied premises.',
      'Coverage depends on OSM contributions: a closed premises that has not been flagged by the community will not appear. Compass therefore complements an on-the-ground search rather than replacing it.',
    ],
  },
  {
    question: 'What is a walkability score?',
    answer:
      'Compass\'s walkability score rates from 0 to 100 the density of services accessible on foot within an 800-metre radius of the premises.',
    details: [
      'It combines five categories of amenities: food shops (30%), healthcare (20%), transport (20%), schools (15%) and parks (15%).',
      'Each category follows a saturating curve: the first amenities push the score up significantly, and each additional one adds progressively less.',
      'Full details of the formulas are published on the Methodology page.',
    ],
  },
  {
    question: 'Where does the data shown come from?',
    answer:
      'All data comes from public sources: OpenStreetMap, Base Adresse Nationale, Sirene (INSEE), Ville de Paris open data, Copernicus/CAMS for air quality and Géorisques for hazards.',
    details: [
      'It is fetched live from the browser, with no intermediate database, then cached for the duration of the session.',
      'The provider, use and licence of each dataset are listed on the Sources page.',
    ],
  },
  {
    question: 'Is Compass free?',
    answer:
      'Yes. Browsing the map, scores and environmental indicators is free and does not require an account.',
    details: [
      'An account is only needed to save your searches and preferences.',
    ],
  },
  {
    question: 'How can I search for premises by need rather than by address?',
    answer:
      'The search bar accepts an address, a neighbourhood or a need expressed in natural language, and the filters translate that need into thresholds (floor area, rent, minimum scores).',
    details: [
      'Examples of needs: "premises for a bakery near schools", "quiet workshop with weekend footfall", "shop within 300 m of a metro station".',
      'The sidebar sliders then let you require a minimum score for shops, transport or foot traffic.',
    ],
  },
  {
    question: 'What rent per m² is shown for a Paris neighbourhood?',
    answer:
      'Compass shows the reference rent per neighbourhood from the Ville de Paris rent control scheme, expressed in €/m²/month.',
    details: [
      'This benchmark relates to residential housing: no open publication of commercial rents exists in France.',
      'It therefore serves as an indicator of the neighbourhood\'s market level, not as a marketing price for a given premises.',
    ],
  },
  {
    question: 'How is foot traffic estimated?',
    answer:
      'Foot traffic is an estimate: Compass combines the density of active businesses within a 400-metre radius (65%) with access to transport (35%).',
    details: [
      'No open pedestrian count covers the whole of Île-de-France; the indicator is a proxy, useful for comparing two locations, not for forecasting turnover.',
    ],
  },
  {
    question: 'Is the noise level shown an actual measurement?',
    answer:
      'No: the noise level shown is an estimate calculated from the proximity and class of nearby roads, not an acoustic measurement.',
    details: [
      'Bruitparif\'s strategic noise maps are planned as a replacement source, which will make it possible to display levels measured in dB(A).',
    ],
  },
  {
    question: 'Is the air quality shown in real time?',
    answer:
      'Yes: the European ATMO index, PM2.5 and NO₂ come from Copernicus\'s CAMS model and are refreshed every hour for the centre of the map.',
  },
  {
    question: 'What natural or technological hazards are flagged?',
    answer:
      'Compass queries Géorisques within a 1 km radius of the observed point and flags the natural and technological hazards recorded for the municipality.',
    details: [
      'This information does not replace the state of risks and pollution disclosure (ERP) required in a transaction.',
    ],
  },
  {
    question: 'Does Compass cover the whole of Île-de-France?',
    answer:
      'The map, amenities and scores work everywhere in Île-de-France; reference rents by neighbourhood are only available for inner Paris.',
  },
  {
    question: 'Can I reuse the data shown?',
    answer:
      'Yes, subject to each source\'s licence: ODbL with attribution for OpenStreetMap and Ville de Paris open data, Etalab Open Licence 2.0 for the BAN, Sirene and Géorisques, CC BY 4.0 for air quality.',
  },
  {
    question: 'How often is the data updated?',
    answer:
      'Data is read every time the map moves: OpenStreetMap and Sirene reflect the current state of the databases, air quality is hourly and reference rents are annual.',
  },
  {
    question: 'Who publishes Compass?',
    answer:
      'Compass is designed and developed by Ivan de Murard, with a commitment to using only public data and publishing the method used to calculate the scores.',
  },
];
