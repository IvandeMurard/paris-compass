/** UI label dictionary. Keys are stable identifiers, values are per-locale strings. */
export const UI = {
  // Branding
  'site.tagline': {
    fr: 'Trouver un local commercial en Île-de-France par son environnement',
    en: 'Find a commercial space in Île-de-France through its surroundings',
  },
  'site.credit': { fr: 'Conçu par Ivan de Murard', en: 'Made by Ivan de Murard' },
  'site.creditSentence': {
    fr: 'Conçu par Ivan de Murard.',
    en: 'Made by Ivan de Murard.',
  },
  'site.footerBlurb': {
    fr: 'Trouver un local commercial en Île-de-France par son environnement, à partir de données publiques.',
    en: 'Find a commercial space in Île-de-France through its surroundings, using public open data.',
  },

  // Navigation
  'nav.map': { fr: 'Carte', en: 'Map' },
  'nav.presentation': { fr: 'Présentation', en: 'Overview' },
  'nav.about': { fr: 'Ambition', en: 'Ambition' },
  'nav.methodology': { fr: 'Méthodologie', en: 'Methodology' },
  'nav.sources': { fr: 'Sources', en: 'Sources' },
  'nav.guides': { fr: 'Guides', en: 'Guides' },
  'nav.faq': { fr: 'FAQ', en: 'FAQ' },
  'nav.glossary': { fr: 'Glossaire', en: 'Glossary' },
  'nav.paris': { fr: 'Locaux par arrondissement', en: 'Spaces by arrondissement' },
  'nav.explore': { fr: 'Explorer', en: 'Explore' },
  'nav.data': { fr: 'Données', en: 'Data' },
  'nav.sitePages': { fr: 'Pages du site', en: 'Site pages' },
  'nav.main': { fr: 'Navigation principale', en: 'Main navigation' },
  'nav.breadcrumb': { fr: 'Fil d’Ariane', en: 'Breadcrumb' },
  'nav.home': { fr: 'Accueil', en: 'Home' },
  'nav.backToMap': { fr: 'Ouvrir la carte', en: 'Open the map' },
  'nav.toggleSidebar': { fr: 'Afficher ou masquer les filtres', en: 'Toggle filters' },
  'nav.language': { fr: 'Changer de langue', en: 'Switch language' },

  // Auth
  'auth.signIn': { fr: 'Connexion', en: 'Sign in' },
  'auth.signUp': { fr: 'Créer un compte', en: 'Sign up' },
  'auth.signOut': { fr: 'Se déconnecter', en: 'Sign out' },
  'auth.profile': { fr: 'Mon profil', en: 'My profile' },
  'auth.account': { fr: 'Mon compte', en: 'My account' },

  // Map / views
  'view.map': { fr: 'Vue carte', en: 'Map view' },
  'view.list': { fr: 'Vue liste', en: 'List view' },
  'map.layers': { fr: 'Couches de données', en: 'Data layers' },
  'map.layer.none': { fr: 'Aucune', en: 'None' },
  'map.layer.walkability': { fr: 'Marchabilité (OSM)', en: 'Walkability (OSM)' },
  'map.layer.amenities': { fr: 'Aménités (OSM)', en: 'Amenities (OSM)' },
  'map.loading': { fr: 'Chargement de la carte…', en: 'Loading the map…' },
  'map.unavailable': {
    fr: 'Données ouvertes momentanément indisponibles.',
    en: 'Open data is temporarily unavailable.',
  },
  'map.premises': { fr: 'locaux', en: 'spaces' },
  'map.amenitiesInView': { fr: 'aménités dans la vue', en: 'amenities in view' },
  'map.searching': {
    fr: 'Lecture du quartier en cours…',
    en: 'Reading the neighbourhood…',
  },
  'map.tooLarge': {
    fr: 'Vue trop large pour interroger OpenStreetMap. Rapprochez-vous d’une rue.',
    en: 'View too wide to query OpenStreetMap. Zoom in on a street.',
  },
  'map.noResult': {
    fr: 'Aucun local commercial recensé dans cette vue.',
    en: 'No commercial premises recorded in this view.',
  },
  'map.env.title': { fr: 'Indicateurs environnementaux', en: 'Environmental indicators' },
  'map.env.air': { fr: 'Qualité de l’air (indice EAQI) :', en: 'Air quality (EAQI index):' },
  'map.env.pm25': { fr: 'PM2.5 :', en: 'PM2.5:' },
  'map.env.risks': { fr: 'Risques recensés :', en: 'Recorded risks:' },
  'map.env.noRisk': { fr: 'Aucun dans 1 km', en: 'None within 1 km' },
  'map.na': { fr: 'n/d', en: 'n/a' },
  'map.zoomIn': { fr: 'Zoomer', en: 'Zoom in' },
  'map.zoomOut': { fr: 'Dézoomer', en: 'Zoom out' },
  'map.locate': { fr: 'Me localiser', en: 'Locate me' },
  'map.reset': { fr: 'Recentrer sur Paris', en: 'Recentre on Paris' },

  // Search
  'search.placeholder': {
    fr: 'Rechercher en langage naturel…',
    en: 'Search in natural language…',
  },
  'search.sidebarPlaceholder': {
    fr: 'Trouver un local commercial…',
    en: 'Find a commercial space…',
  },
  'search.hint': {
    fr: 'Essayez : « un local de 50 m² dans le 10e près d’un parc »',
    en: 'Try: “a 50 m² space in the 10th arrondissement near a park”',
  },
  'search.trySearching': { fr: 'Exemples de recherche :', en: 'Try searching for:' },
  'search.suggestion1': {
    fr: 'Un local de 50 m² dans le 10e près d’un parc',
    en: 'A 50 m² space in the 10th near a park',
  },
  'search.suggestion2': {
    fr: 'Local commercial avec du passage à moins de 2 000 €',
    en: 'Commercial space with high footfall under €2,000',
  },
  'search.suggestion3': {
    fr: 'Bureau calme dans le 16e avec un bon air',
    en: 'Quiet office in the 16th with good air quality',
  },
  'search.suggestion4': {
    fr: 'Boutique près d’une station de métro avec parking',
    en: 'Shop near a metro station with parking',
  },
  'search.voice': { fr: 'Recherche vocale', en: 'Voice search' },

  // Filters
  'filters.title': { fr: 'Filtres', en: 'Filters' },
  'filters.reset': { fr: 'Réinitialiser', en: 'Reset' },
  'filters.vacantOnly': { fr: 'Locaux vacants uniquement', en: 'Vacant spaces only' },
  // 'filters.rent' removed: Compass has no commercial rent to filter on. See DIAGNOSTIC.md §1.
  'filters.size': { fr: 'Surface (m²)', en: 'Size (m²)' },
  'filters.arrondissement': { fr: 'Arrondissement', en: 'Arrondissement' },
  'filters.walkability': { fr: 'Score de marchabilité', en: 'Walkability score' },
  'filters.minAmenityScores': {
    fr: 'Scores d’aménités minimum',
    en: 'Minimum amenity scores',
  },
  'filters.live': {
    fr: 'Les filtres s’appliquent en direct aux locaux issus des données ouvertes.',
    en: 'Filters apply live to the spaces returned by open data.',
  },
  'amenity.schools': { fr: 'Écoles', en: 'Schools' },
  'amenity.healthcare': { fr: 'Santé', en: 'Healthcare' },
  'amenity.groceries': { fr: 'Commerces alimentaires', en: 'Groceries' },
  'amenity.transit': { fr: 'Transports en commun', en: 'Public transit' },
  'amenity.parks': { fr: 'Parcs et loisirs', en: 'Parks & recreation' },

  // List
  'list.errorTitle': { fr: 'Données ouvertes indisponibles', en: 'Open data unavailable' },
  'list.errorBody': {
    fr: 'Les services publics interrogés n’ont pas répondu.',
    en: 'The public data services did not respond.',
  },
  'list.empty': {
    fr: 'Aucun local ne correspond aux filtres dans les données ouvertes de cette zone.',
    en: 'No space matches these filters in the open data for this area.',
  },
  'list.countPrefix': { fr: 'locaux issus de données publiques réelles', en: 'spaces from real public data' },
  'list.updatedAt': { fr: 'mis à jour', en: 'updated' },

  // Sources panel
  'sources.open': { fr: 'Sources des données', en: 'Data sources' },
  'sources.title': { fr: 'Sources de données', en: 'Data sources' },
  'sources.provider': { fr: 'Producteur', en: 'Provider' },
  'sources.usage': { fr: 'Usage', en: 'Usage' },
  'sources.licence': { fr: 'Licence', en: 'Licence' },
  'sources.openLink': { fr: 'Consulter la source', en: 'View source' },

  // Presentation page
  'presentation.title': {
    fr: 'Trouver un local commercial en Île-de-France par son environnement',
    en: 'Find a commercial space in Île-de-France through its surroundings',
  },
  'presentation.intro': {
    fr: 'Compass est un outil gratuit qui replace chaque local commercial dans son contexte : commerces actifs, transports, écoles, santé, parcs, bruit routier estimé, qualité de l’air et loyer de référence du quartier. Les données proviennent uniquement de sources publiques, interrogées en direct pour la zone affichée sur la carte.',
    en: 'Compass is a free tool that puts every commercial space back into its context: active shops, transport, schools, healthcare, parks, estimated road noise, air quality and the neighbourhood reference rent. All data comes from public sources, queried live for the area shown on the map.',
  },
  'presentation.needTitle': {
    fr: 'Chercher par besoin, pas seulement par adresse',
    en: 'Search by need, not just by address',
  },
  'presentation.needBody': {
    fr: 'Un local ne se juge pas sur sa surface et son loyer : il se juge sur ce qui l’entoure. Compass traduit un besoin — « du passage matin et soir », « près d’écoles », « au calme », « à moins de 300 mètres d’un métro » — en seuils sur des scores calculés à partir de données ouvertes, puis n’affiche que les locaux qui les satisfont.',
    en: 'A space is not judged on its floor area and rent alone, but on what surrounds it. Compass turns a need — “footfall morning and evening”, “near schools”, “quiet”, “within 300 metres of a metro station” — into thresholds on scores computed from open data, then shows only the spaces that meet them.',
  },
  'presentation.walkability': { fr: 'Marchabilité', en: 'Walkability' },
  'presentation.walkabilityBody': {
    fr: 'Densité de services accessibles à pied dans un rayon de 800 mètres, pondérée par famille d’équipements.',
    en: 'Density of services reachable on foot within 800 metres, weighted by category of amenity.',
  },
  'presentation.footfall': { fr: 'Flux piéton estimé', en: 'Estimated footfall' },
  'presentation.footfallBody': {
    fr: 'Proxy combinant la densité de commerces actifs à 400 mètres et l’accès aux transports.',
    en: 'A proxy combining the density of active shops within 400 metres and access to transport.',
  },
  'presentation.environment': { fr: 'Environnement', en: 'Environment' },
  'presentation.environmentBody': {
    fr: 'Qualité de l’air horaire, exposition estimée au bruit routier et risques recensés par Géorisques.',
    en: 'Hourly air quality, estimated exposure to road noise and risks recorded by Géorisques.',
  },
  'presentation.dataTitle': {
    fr: 'Des données publiques, une méthode publiée',
    en: 'Public data, a published method',
  },
  'presentation.dataBody': {
    fr: 'Aucune donnée de démonstration : chaque indicateur provient d’un jeu de données ouvert et chaque formule est documentée.',
    en: 'No demo data: every indicator comes from an open dataset and every formula is documented.',
  },
  'presentation.allSources': {
    fr: 'Toutes les sources et licences',
    en: 'All sources and licences',
  },
  'presentation.methodLink': { fr: 'La méthodologie de calcul', en: 'The scoring methodology' },
  'presentation.guidesTitle': { fr: 'Guides pratiques', en: 'Practical guides' },
  'presentation.parisTitle': {
    fr: 'Explorer Paris arrondissement par arrondissement',
    en: 'Explore Paris arrondissement by arrondissement',
  },
  'presentation.faqTitle': { fr: 'Questions fréquentes', en: 'Frequently asked questions' },
  'presentation.allFaq': { fr: 'Voir toutes les questions', en: 'See all questions' },
  'presentation.metaTitle': {
    fr: 'Présentation de Compass — chercher un local commercial par son environnement',
    en: 'About Compass — search commercial spaces by their surroundings',
  },
  'presentation.metaDescription': {
    fr: 'Comment Compass replace les locaux commerciaux d’Île-de-France dans leur environnement : scores de marchabilité, flux estimé, bruit, air, risques et loyers de référence, à partir de données publiques.',
    en: 'How Compass puts commercial spaces in Île-de-France back into their environment: walkability, estimated footfall, noise, air, risks and reference rents, all from public open data.',
  },

  // Home meta
  'home.metaTitle': {
    fr: 'Compass — trouver un local commercial en Île-de-France par son environnement',
    en: 'Compass — find a commercial space in Île-de-France by its surroundings',
  },
  'home.metaDescription': {
    fr: 'Carte gratuite des locaux commerciaux d’Île-de-France replacés dans leur environnement : commerces, transports, écoles, bruit, qualité de l’air et loyers de référence, à partir de données publiques.',
    en: 'Free map of commercial spaces in Île-de-France in context: shops, transport, schools, noise, air quality and reference rents, all from public open data.',
  },
} as const;

export type UiKey = keyof typeof UI;
