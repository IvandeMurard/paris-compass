import PageLayout from '@/components/PageLayout';
import Seo from '@/components/Seo';
import { SITE_URL } from '@/content/site';
import { useLocale } from '@/i18n/locale';

const WEIGHTS = [
  { familyFr: 'Commerces alimentaires', familyEn: 'Food shops', weight: '30 %', saturation: '18', source: 'OpenStreetMap' },
  { familyFr: 'Santé', familyEn: 'Healthcare', weight: '20 %', saturation: '14', source: 'OpenStreetMap' },
  { familyFr: 'Transports', familyEn: 'Transport', weight: '20 %', saturation: '25', source: 'OpenStreetMap' },
  { familyFr: 'Écoles', familyEn: 'Schools', weight: '15 %', saturation: '8', source: 'OpenStreetMap' },
  { familyFr: 'Parcs et espaces verts', familyEn: 'Parks and green spaces', weight: '15 %', saturation: '7', source: 'OpenStreetMap' },
];

/**
 * Les cinq familles MARCHANDES de la fiche de contexte — w6-amenites-corpus.
 *
 * Table distincte de `WEIGHTS` ci-dessus, et pas par commodité de mise en page : ce sont deux
 * axes qui comptent deux populations. `WEIGHTS` note des « aménités » OpenStreetMap, écoles et
 * parcs compris ; celui-ci note un relevé porte-à-porte qui ne connaît que le commerce. Publier
 * une seule table ferait croire qu'un poids a bougé alors que c'est la population qui a changé.
 *
 * Les constantes ne sont pas recopiées de la première : une aménité OSM se compte par dizaines,
 * un local relevé par centaines. Chacune est la médiane mesurée de sa famille divisée par ln 2,
 * sur douze points parisiens, le 15 septembre 2026 — la valeur qui place une adresse médiane
 * à 50 et laisse donc la moitié de l'échelle de chaque côté.
 */
const SERVICE_WEIGHTS_PUBLISHED = [
  { familyFr: 'Commerces alimentaires', familyEn: 'Food shops', weight: '30 %', saturation: '100', source: 'APUR BDCom 2023' },
  { familyFr: 'Santé-beauté', familyEn: 'Health and beauty', weight: '20 %', saturation: '55', source: 'APUR BDCom 2023' },
  { familyFr: 'Cafés et restaurants', familyEn: 'Cafés and restaurants', weight: '20 %', saturation: '215', source: 'APUR BDCom 2023' },
  { familyFr: 'Services aux particuliers et agences', familyEn: 'Personal services and agencies', weight: '20 %', saturation: '190', source: 'APUR BDCom 2023' },
  { familyFr: 'Culture et loisirs', familyEn: 'Culture and leisure', weight: '10 %', saturation: '60', source: 'APUR BDCom 2023' },
];

const COPY = {
  fr: {
    seoTitle: 'Méthodologie de calcul des scores',
    seoDescription:
      'Formules, rayons, pondérations et limites des scores Compass : marchabilité, flux piéton estimé, bruit routier, qualité de l’air et loyers de référence.',
    jsonLdHeadline: 'Méthodologie de calcul des scores Compass',
    jsonLdAbout: 'Scoring environnemental de locaux commerciaux à partir de données ouvertes',
    crumb: 'Méthodologie',
    title: 'Méthodologie',
    intro:
      'Chaque score affiché par Compass est calculé dans le navigateur, à partir de données publiques et de formules publiées ici. Aucune pondération n’est cachée.',
    walkTitle: 'Score de marchabilité',
    walkBody1a: 'Le score de marchabilité note de 0 à 100 la densité de services accessibles à pied dans un rayon de ',
    walkBody1b: ' (environ 10 minutes de marche) autour du local.',
    walkBody2a: 'Chaque famille d’équipements reçoit un sous-score saturant :',
    walkBody2b: 'où n est le nombre d’équipements dans le rayon et s la constante de saturation. Les premiers équipements font fortement monter le score, les suivants de moins en moins — un onzième supermarché n’améliore pas réellement un quartier.',
    thFamily: 'Famille',
    thWeight: 'Poids',
    thSaturation: 'Constante de saturation',
    thSource: 'Source',
    saturationUnit: (n: string) => `${n} équipements`,
    servicesTitle: 'Services marchands à pied',
    servicesBody1:
      'Sur la fiche de contexte d’une adresse, la marchabilité a changé d’énoncé le 15 septembre 2026, et le nom de l’axe le dit. Elle notait des « aménités » OpenStreetMap, qui contiennent du non marchand : écoles, bureaux de poste, équipements publics. Elle note désormais les commerces effectivement RELEVÉS par l’APUR dans un rayon de 400 mètres. Traduire l’ancien libellé sur la nouvelle mesure aurait donné un chiffre qui ment sur ce qu’il compte, et c’est exactement ce que Compass refuse.',
    servicesBody2:
      'Même courbe saturante que ci-dessus, cinq familles, poids qui somment à 1. Les constantes sont plus élevées d’un ordre de grandeur, et c’est la mesure qui l’impose : une enquête porte-à-porte trouve 87 commerces alimentaires dans 400 mètres rue de Bretagne, là où OpenStreetMap en compte quelques-uns. Réutiliser les constantes d’OpenStreetMap aurait donné 100 partout dans Paris.',
    servicesLimit:
      'Ce que cet axe ne voit pas, et il faut le nommer : le non marchand. Une école, une poste, un gymnase n’entrent dans aucun relevé BDCom, donc dans aucun de ces cinq sous-scores. La source juste pour cela est la base permanente des équipements de l’INSEE, à ingérer, et l’axe restera aveugle jusque-là. Par ailleurs, dans les quartiers les plus denses le service renvoie moins de locaux que le rayon n’en contient — mesuré sur trois points parisiens sur douze — et le compte porte alors sa réserve : c’est un plancher, pas un total.',
    railTitle: 'Desserte ferrée',
    railBody:
      'La distance à l’arrêt ferré le plus proche — métro, RER ou tramway — cherché dans un rayon de 800 mètres, d’après le référentiel des arrêts d’Île-de-France Mobilités. Le score décroît exponentiellement avec la distance : à un rayon de marche de l’arrêt, il vaut 37.',
    railLimitTitle: 'Deux limites, et la seconde est un changement de prétention',
    railLimit:
      'Les bus n’y sont pas : le référentiel lu est celui du réseau ferré, 258 arrêts dans Paris. L’axe est donc plus fiable que le comptage bénévole qu’il remplace là où il regarde, et aveugle là où il ne regarde pas. Et ce n’est plus un comptage mais une distance : le jeu de validations horaires d’Île-de-France Mobilités, chargé à côté, ne publie que la FORME de la journée d’une station en pourcentages, jamais un volume — deux stations n’y sont pas comparables sur leur fréquentation. Aucun chiffre de cette page n’en est tiré.',
    footTitle: 'Flux piéton estimé',
    footBody:
      'Aucun comptage piéton ouvert ne couvre l’ensemble de l’Île-de-France. Compass publie donc un proxy : 65 % de densité de commerces actifs dans un rayon de 400 mètres (même courbe saturante, constante 90) et 35 % de desserte ferrée. Sur la fiche de contexte, ses deux moitiés viennent donc du corpus depuis le 15 septembre 2026 — c’est ce qui lui permet de survivre à un miroir OpenStreetMap injoignable. Il permet de comparer deux emplacements entre eux, pas de prévoir une fréquentation ou un chiffre d’affaires.',
    noiseTitle: 'Exposition au bruit',
    noiseBody:
      'Le niveau de bruit est estimé, pas mesuré. Chaque axe routier situé à moins de 500 mètres contribue proportionnellement à sa classe (autoroute, voie primaire, secondaire, tertiaire) et de façon décroissante avec la distance. Le résultat est ramené sur une échelle 0-100, découpée en quatre niveaux (très faible, faible, modéré, élevé). Le remplacement par les cartes de bruit stratégiques de Bruitparif est prévu.',
    airTitle: 'Qualité de l’air',
    airBody:
      'L’indice ATMO européen (EAQI), les PM2.5 et le NO₂ proviennent du modèle CAMS Europe de Copernicus, interrogé pour le centre de la carte et rafraîchi toutes les heures. Ce sont des valeurs modélisées à l’échelle du quartier, pas des mesures à l’adresse.',
    riskTitle: 'Risques',
    riskBody:
      'Les risques naturels et technologiques sont ceux recensés par Géorisques dans un rayon de 1 km. Cette information n’a pas valeur d’état des risques et pollutions (ERP) réglementaire.',
    rentTitle: 'Loyer résidentiel du quartier',
    rentBody:
      'Le chiffre affiché est le loyer de référence en €/m²/mois publié par la Ville de Paris dans le cadre de l’encadrement des loyers. Il ne concerne que le logement et exclut explicitement les locaux commerciaux et professionnels : aucune base publique ne publie les loyers commerciaux. Compass ne l’utilise donc que pour une chose — situer le niveau de vie résidentiel du quartier, c’est-à-dire un signal de zone de chalandise. Il n’est jamais multiplié par une surface, ne produit aucune estimation de loyer commercial et ne filtre aucun résultat. La grille préfectorale découpe chaque quartier en 32 cases (4 époques de construction × 4 tailles de logement × meublé ou non) : Compass en fait la moyenne plutôt que d’en épingler une seule, et affiche le millésime de l’arrêté à côté du chiffre. Le millésime publié en open data accuse un décalage sur celui en vigueur.',
    historyTitle: 'L’historique d’un local, et son rattachement',
    historyBody:
      'La chronologie affichée dans le panneau « Historique » n’est pas rédigée : elle est produite par une seule fonction de la base, qui assemble les relevés de terrain de l’APUR (BDCom, millésimes 2017, 2020 et 2023) et les annonces légales du BODACC. Chaque ligne porte le fait, la pièce qui le justifie, un niveau de fiabilité et la règle qui a produit ce niveau. Compass affiche ces lignes telles quelles et n’en résume aucune : les deux erreurs qui ont conduit à cette règle ont été commises dans la phrase, jamais dans la base.',
    historyReadingTitle: 'Trois états à ne pas confondre',
    historyReading: [
      'Observé — le local a été relevé cette année-là, et l’activité relevée est affichée.',
      'Non observé — le local n’a pas été relevé cette année-là. Ce n’est ni « vacant », ni « ce n’est plus un commerce » : ce sont des conclusions, et la ligne ne les porte pas.',
      'Millésime retenu — la licence de ce millésime n’a pas été lue, donc ni son contenu ni l’existence d’un relevé ne sont divulgués. Une retenue n’est pas une absence.',
    ],
    historyNoLabel:
      'Quand une ligne n’a pas d’activité renseignée, elle le dit. Aucune valeur n’est reprise d’une autre colonne, d’une autre année ni d’OpenStreetMap pour combler le trou : un libellé placé sous une date qui ne le porte pas est exactement l’erreur que cette règle sert à ne plus commettre.',
    confidenceTitle: 'Les quatre niveaux de fiabilité',
    confidenceIntro:
      'Le niveau n’est jamais saisi : il est dérivé de colonnes existantes. Pas de pourcentage de confiance — un tel chiffre serait invérifiable, donc refusé.',
    confidence: [
      ['Établi', 'La source nomme directement ce local, et la pièce est jointe.'],
      ['Corroboré', 'Deux sources publiques indépendantes placent l’entreprise ici ; aucune ne nomme le local.'],
      ['Probable', 'Le fait est documenté, mais son rattachement à ce local est déduit.'],
      ['Indéterminé', 'La source est muette, et le dit.'],
    ],
    matchTitle: 'Pourquoi Compass ne choisit pas le local à votre place',
    matchBody:
      'Les locaux affichés sur la carte viennent d’OpenStreetMap ; les relevés viennent de la BDCom de l’APUR. Les deux jeux ne partagent aucun identifiant, et rien de public ne les relie : le rattachement ne peut être que spatial, donc déduit. Mesuré le 24 août 2026 sur 658 locaux OpenStreetMap autour des Halles, le local BDCom le plus proche est à 5 m pour la moitié d’entre eux, 24 m au troisième quartile et 58 m au neuvième décile ; dans un rayon de 25 m il y a une médiane de 5 candidats, et jusqu’à 125 dans une galerie marchande. Choisir le plus proche attribuerait régulièrement l’histoire d’un local à un autre — le panneau liste donc les candidats avec leur adresse et leur enseigne, et vous laisse trancher.',
    matchGapBody:
      'Le millésime 2023 ne couvre que les commerces et services commerciaux : un local vacant ou non commercial n’y figure pas, et le panneau peut donc n’avoir aucun candidat à proposer. Cette absence ne dit pas qu’il n’y a rien à cette adresse.',
    surveyStepTitle: 'Le pas de trois ans',
    surveyStepBody:
      'BDCom est un recensement triennal. Un local devenu boulangerie, puis vacant, puis kebab entre deux enquêtes s’affiche « boulangerie → kebab » : un local peut paraître stable en ayant tourné trois fois. Et une suite d’activités ne dit jamais pourquoi quelqu’un est parti — vente réussie, dépôt de bilan, départ en retraite et immeuble repris s’affichent à l’identique.',
    detectTitle: 'Détection des locaux',
    detectBody:
      'Sur la carte, les locaux proviennent d’OpenStreetMap : un local est considéré comme vacant lorsqu’il porte un attribut de local vide ou de commerce désaffecté, et comme occupé lorsqu’une activité y est renseignée. La couverture dépend donc des contributions de la communauté : un local fermé récemment et non signalé n’apparaîtra pas.',
    detectSheetBody:
      'Sur la fiche de contexte d’une adresse, non : les locaux y viennent du relevé de terrain de l’APUR, millésime 2023, sous licence ODbL-1.0. C’est une enquête porte-à-porte plutôt qu’un marquage bénévole, et ce millésime-là ne couvre que le commerce de détail et les services commerciaux — un local vacant, ou un rez-de-chaussée non commercial, n’y figure pas et n’est donc pas compté. Le compte porte sa réserve quand le service renvoie moins de locaux que le rayon n’en contient.',
    densityTitle: 'Tissu commercial',
    densityBody:
      'Le nombre de locaux commerciaux relevés dans un rayon de 400 mètres, ramené sur 0-100 par la même courbe saturante que les familles d’équipements, avec une constante de 90. C’est le seul constat de la fiche qui ne lise que le relevé de l’APUR : il reste donc affiché quand les miroirs OpenStreetMap ne répondent pas. Un nombre de vitrines n’est ni un chiffre d’affaires ni une garantie de passage — il dit qu’un commerce s’y trouve déjà, pas qu’il y prospère.',
    provenanceTitle: 'D’où vient chaque chiffre',
    provenanceBody:
      'Chaque score porte la source de la couche de données qu’il lit réellement, et non une source unique valable pour toute la fiche. Les cinq familles d’équipements, la marchabilité et le bruit viennent d’OpenStreetMap. Le flux piéton estimé, lui, mélange deux couches : la densité de commerces actifs et l’accès aux transports. Il nomme donc les deux sources, cumule leurs licences — un chiffre composé oblige à respecter les deux — et porte la plus ancienne de leurs deux dates, parce qu’un chiffre composé n’est jamais plus frais que son ingrédient le plus ancien. Sur la carte, les trois couches proviennent du même instantané OpenStreetMap, donc la mention y est unique. Sur la fiche de contexte d’une adresse, elle ne l’est plus depuis le 14 septembre 2026 : les locaux viennent de la BDCom de l’APUR et les équipements d’OpenStreetMap, exactement comme dans l’interface destinée aux agents, et le flux piéton y cite les deux.',
    verdictTitle: 'Comment le verdict d’une fiche de contexte est composé',
    verdictIntro:
      'La fiche de contexte d’une adresse ouvre sur une phrase. Cette phrase n’est pas rédigée : elle est composée par une fonction publiée, à partir des constats déjà calculés, et elle nomme ceux qu’elle a utilisés. Comme les formules ci-dessus, la règle est ici parce qu’elle est affichée à tout le monde.',
    verdictRule:
      'Quatre constats portent le verdict — le tissu commercial, le passage, la desserte ferrée et les services marchands à pied, et depuis le 15 septembre 2026 les quatre se lisent dans le corpus plutôt que sur un miroir public gratuit. Quand l’un des quatre est retenu pour licence, hors du corpus, issu d’une source injoignable ou simplement indéterminé, le verdict ne se compose pas : la fiche dit lequel manque et pourquoi, et affiche séparément les constats qui ont abouti. Conclure par-dessus une absence est le défaut que cette règle existe pour empêcher. Le tissu commercial est porteur depuis le 14 septembre 2026, et c’est une décision : Compass ne signe pas de verdict sur une adresse commerciale sans le relevé des commerces de cette adresse. Hors de Paris intra-muros, où le corpus s’arrête, le verdict refuse donc désormais.',
    verdictSupport:
      'Les commerces alimentaires et le bruit routier viennent en appui. Leur absence ne bloque rien, et leur présence n’entre pas dans la phrase : ils qualifient une réponse, ils ne sont pas la réponse.',
    verdictNoScore:
      'Aucune note sur 100 n’est produite pour une adresse, et ce n’est pas un oubli. Les pondérations entre passage, desserte et calme dépendent du métier — une note unique moyennerait ce qui s’oppose, et un boulanger et un cabinet comptable ne liraient pas le même chiffre de la même façon. Le verdict est une phrase d’axes nommés, dont chacun se déplie sur sa source, sa licence, son millésime et sa méthode.',
    verdictLimit:
      'Ce que cette règle ne rattrape pas : un chiffre présent mais faible se compose quand même. Le flux piéton est une approximation par construction, faute de comptage piéton ouvert en Île-de-France ; refuser sur ce motif refuserait tous les verdicts, partout. La réserve voyage alors avec le constat, et se lit sous le chevron.',
    compareTitle: 'Pourquoi la comparaison s’arrête à deux adresses',
    compareBody:
      'Une fiche de contexte accepte une seconde adresse, et une seule. Ce n’est pas une limite de performance : la comparaison en masse — l’export, le portefeuille, le classement — est le geste que Compass refuse, parce qu’il transforme un contexte instruit en liste à trier. La borne tient dans le code et non dans une intention : la fonction de comparaison prend deux jeux de constats nommés, jamais une liste, et une adresse ne peut donc pas s’ajouter aux deux premières.',
    compareNoRank:
      'Aucune des deux adresses n’est déclarée meilleure. Les axes sont posés côte à côte, dans les mêmes mots que la phrase de verdict, et un axe qu’un seul des deux côtés porte est marqué non comparable plutôt que mis en regard d’un vide : deux chiffres alignés se soustraient, et l’un des deux n’existe pas.',
    parityTitle: 'La même réponse pour un agent, et comment elle est vérifiée',
    parityBody:
      'Le verdict est composé par une fonction du noyau, hors de toute page. Le serveur MCP de Compass compile ce même noyau et sert donc la même règle de composition : une fiche affiche l’appel qui rend la réponse correspondante. La parité ne se déclare pas — le contrôle recompose le verdict du serveur à partir des chiffres que le serveur publie, et rougit si les deux diffèrent.',
    parityLimit:
      'Ce que cette parité ne dit pas : les deux surfaces ne lisent pas le même corpus. Le navigateur compte les locaux dans OpenStreetMap, l’agent dans la BDCom de l’APUR — un relevé porte-à-porte, meilleure source. Les chiffres peuvent donc différer, et c’est assumé. Ce qui est partagé, c’est la règle de composition, pas le corpus.',
    dossierTitle: 'Le dossier d’une adresse, et ce qu’il contient',
    dossierBody:
      'Une fiche de contexte se télécharge. Le fichier porte une ligne par constat, et à côté de chaque chiffre : sa source, sa licence, son millésime, sa méthode, la formule appliquée, ses constantes, le rayon, et l’opérande — le nombre de locaux compté, la distance à l’arrêt. Les formules et les constantes sont celles publiées ci-dessus, lues dans le code plutôt que recopiées : le fichier contient donc de quoi refaire chaque calcul sans nous croire sur parole.',
    dossierNoBulk:
      'Un dossier, une adresse. Il n’existe pas de bouton « tout exporter », et le départ se fait depuis une fiche et jamais depuis une liste de résultats : constituer un portefeuille de cinquante adresses est le geste que Compass refuse, pour la même raison que la comparaison s’arrête à deux. La limite tient dans la structure — la fonction qui produit un dossier prend une adresse et n’a pas de forme plurielle.',
    dossierGaps:
      'Un constat absent descend lui aussi, avec la cause de son absence — source injoignable, hors du corpus, retenu pour licence, indéterminé — et il n’est jamais rendu en zéro. Un constat dont la source n’avait pas encore répondu au moment du téléchargement est marqué comme tel : une réponse en route et un trou ne se lisent pas de la même manière.',
    missingTitle: 'Quand une source manque',
    missingBody:
      'Un score n’est calculé que si la couche de données dont il dépend a réellement été chargée. Si elle manque, Compass n’affiche pas 0 : il affiche « n/d » et indique pourquoi. La distinction compte surtout pour le bruit, où un 0 se lirait « très faible » — soit une rue calme affirmée à partir d’une donnée absente. Un quartier réellement dépourvu d’équipements, lui, reçoit bien un 0 : c’est un comptage, pas une lacune.',
    limitsTitle: 'Limites assumées',
    limits: [
      'Les scores dépendent de la complétude d’OpenStreetMap, inégale d’un quartier à l’autre.',
      'Le flux piéton et le bruit sont des estimations, pas des mesures.',
      'Compass n’affiche aucun loyer commercial : cette donnée n’existe pas en open data en France.',
      'Aucun score ne remplace une visite ni une étude de marché.',
    ],
  },
  en: {
    seoTitle: 'Score calculation methodology',
    seoDescription:
      'Formulas, radii, weightings and limitations of Compass scores: walkability, estimated foot traffic, road noise, air quality and reference rents.',
    jsonLdHeadline: 'Compass score calculation methodology',
    jsonLdAbout: 'Environmental scoring of commercial spaces based on open data',
    crumb: 'Methodology',
    title: 'Methodology',
    intro:
      'Every score shown by Compass is computed in the browser, from public data and formulas published here. No weighting is hidden.',
    walkTitle: 'Walkability score',
    walkBody1a: 'The walkability score rates from 0 to 100 the density of services reachable on foot within a ',
    walkBody1b: ' radius (roughly a 10-minute walk) around the space.',
    walkBody2a: 'Each amenity family gets a saturating sub-score:',
    walkBody2b: 'where n is the number of amenities within the radius and s the saturation constant. The first amenities push the score up sharply, later ones less and less — an eleventh supermarket doesn’t really improve a neighbourhood.',
    thFamily: 'Family',
    thWeight: 'Weight',
    thSaturation: 'Saturation constant',
    thSource: 'Source',
    saturationUnit: (n: string) => `${n} amenities`,
    servicesTitle: 'Shops and services on foot',
    servicesBody1:
      'On the context sheet of an address, walkability changed what it claims on 15 September 2026, and the name of the axis says so. It used to rate OpenStreetMap "amenities", which include the non-merchant: schools, post offices, public facilities. It now rates the shops APUR actually SURVEYED within a 400-metre radius. Carrying the old label over the new measure would have produced a figure that lies about what it counts, which is precisely what Compass refuses.',
    servicesBody2:
      'Same saturating curve as above, five families, weights summing to 1. The constants are an order of magnitude higher, and measurement forces that: a door-to-door survey finds 87 food shops within 400 metres on rue de Bretagne, where OpenStreetMap holds a handful. Reusing the OpenStreetMap constants would have read 100 everywhere in Paris.',
    servicesLimit:
      'What this axis does not see, and it must be named: the non-merchant. A school, a post office, a sports hall appear in no BDCom survey, therefore in none of these five sub-scores. The right source for that is INSEE\u2019s permanent facilities base, still to be ingested, and the axis stays blind until then. In the densest neighbourhoods the service also returns fewer premises than the radius holds \u2014 measured on three of twelve Paris points \u2014 and the count then carries its caveat: it is a floor, not a total.',
    railTitle: 'Rail access',
    railBody:
      'The distance to the nearest rail stop \u2014 metro, RER or tram \u2014 looked for within an 800-metre radius, from \u00cele-de-France Mobilit\u00e9s\u2019 stop reference. The score decays exponentially with distance: at one walking radius from the stop it reads 37.',
    railLimitTitle: 'Two limits, and the second is a change of claim',
    railLimit:
      'Buses are not in it: the reference read is the rail network\u2019s, 258 stops inside Paris. The axis is therefore more reliable than the volunteer count it replaces where it looks, and blind where it does not. And it is no longer a count but a distance: the hourly validation dataset loaded beside it publishes only the SHAPE of a station\u2019s day, as percentages, never a volume \u2014 two stations cannot be compared there on how busy they are. No figure on this page is drawn from it.',
    footTitle: 'Estimated foot traffic',
    footBody:
      'No open pedestrian count covers all of Île-de-France. Compass therefore publishes a proxy: 65% density of active shops within a 400-metre radius (same saturating curve, constant 90) and 35% rail access. On the context sheet both halves therefore come from the corpus since 15 September 2026 — which is what lets it survive an unreachable OpenStreetMap mirror. It lets you compare two locations against each other, not predict footfall or revenue.',
    noiseTitle: 'Noise exposure',
    noiseBody:
      'Noise level is estimated, not measured. Every road within 500 metres contributes proportionally to its class (motorway, primary, secondary, tertiary road) and decreasingly with distance. The result is mapped onto a 0-100 scale, split into four levels (very low, low, moderate, high). Replacement with Bruitparif’s strategic noise maps is planned.',
    airTitle: 'Air quality',
    airBody:
      'The European AQI (EAQI), PM2.5 and NO₂ come from Copernicus’ CAMS Europe model, queried for the map centre and refreshed every hour. These are neighbourhood-scale modelled values, not address-level measurements.',
    riskTitle: 'Risks',
    riskBody:
      'Natural and technological risks are those recorded by Géorisques within a 1 km radius. This information does not have the regulatory value of an official risk and pollution disclosure (ERP).',
    rentTitle: 'Neighbourhood residential rent',
    rentBody:
      'The figure shown is the reference rent in €/m²/month published by the City of Paris as part of rent control. It covers housing only and explicitly excludes commercial and professional premises: no public database publishes commercial rents. Compass therefore uses it for one thing — placing the residential standard of living of the neighbourhood, i.e. a catchment-area signal. It is never multiplied by a floor area, produces no commercial rent estimate, and filters no results. The prefectural grid splits each quartier into 32 cells (4 construction periods × 4 dwelling sizes × furnished or not): Compass averages all of them rather than pinning one, and displays the vintage of the decree next to the figure. The vintage published as open data lags the one in force.',
    historyTitle: 'A premise’s history, and how it is linked',
    historyBody:
      'The chronology shown in the "History" panel is not written: it is produced by a single database function that assembles APUR’s field surveys (BDCom, 2017, 2020 and 2023 vintages) and BODACC legal notices. Every line carries the fact, the record that justifies it, a confidence level and the rule that produced that level. Compass shows those lines as they come and summarises none of them: the two errors that led to this rule were made in the sentence, never in the database.',
    historyReadingTitle: 'Three states not to be confused',
    historyReading: [
      'Surveyed — the premise was recorded that year, and the activity recorded is shown.',
      'Not surveyed — the premise was not recorded that year. This is neither "vacant" nor "no longer a shop": those are conclusions, and the line does not carry them.',
      'Withheld vintage — this vintage’s licence has not been read, so neither its content nor whether a record exists is disclosed. Withholding is not absence.',
    ],
    historyNoLabel:
      'When a line has no activity recorded, it says so. No value is borrowed from another column, another year or OpenStreetMap to fill the gap: a label placed under a date that does not carry it is exactly the error this rule exists to stop repeating.',
    confidenceTitle: 'The four confidence levels',
    confidenceIntro:
      'The level is never typed in: it is derived from existing columns. No confidence percentage — such a figure would be unverifiable, and is therefore refused.',
    confidence: [
      ['Established', 'The source names this premise directly, and the record is attached.'],
      ['Corroborated', 'Two independent public sources place the business here; neither names the premise.'],
      ['Probable', 'The fact is documented, but tying it to this premise is inferred.'],
      ['Undetermined', 'The source is silent, and says so.'],
    ],
    matchTitle: 'Why Compass does not pick the premise for you',
    matchBody:
      'The premises on the map come from OpenStreetMap; the surveys come from APUR’s BDCom. The two datasets share no identifier and nothing public joins them: the link can only be spatial, and is therefore inferred. Measured on 24 August 2026 across 658 OpenStreetMap premises around Les Halles, the nearest BDCom premise sits at 5 m for half of them, 24 m at the third quartile and 58 m at the ninth decile; within 25 m there is a median of 5 candidates, and up to 125 in a shopping arcade. Picking the nearest would regularly attach one premise’s history to another — so the panel lists the candidates with their address and trading name, and leaves the call to you.',
    matchGapBody:
      'The 2023 vintage covers retail and commercial services only: a vacant or non-commercial unit is not in it, so the panel may have no candidate to offer. That absence does not say there is nothing at the address.',
    surveyStepTitle: 'The three-year step',
    surveyStepBody:
      'BDCom is a triennial census. A unit that became a bakery, then vacant, then a kebab shop between two surveys shows as "bakery → kebab": a premise can look stable having turned over three times. And a sequence of activities never says why anyone left — a successful sale, a bankruptcy, a retirement and a repossessed building all render identically.',
    detectTitle: 'Detecting spaces',
    detectBody:
      'On the map, spaces come from OpenStreetMap: a space is considered vacant when it carries a vacant-shop or disused-shop attribute, and occupied when an activity is recorded. Coverage therefore depends on community contributions: a recently closed space that hasn’t been reported won’t appear.',
    detectSheetBody:
      'On the context sheet of an address, they do not: premises there come from APUR’s field survey, 2023 vintage, under ODbL-1.0. That is a door-to-door survey rather than volunteer tagging, and that vintage covers retail and commercial services only — a vacant unit, or a non-commercial ground floor, is not in it and is therefore not counted. The count carries a caveat whenever the service returns fewer premises than the radius holds.',
    densityTitle: 'Commercial fabric',
    densityBody:
      'The number of surveyed commercial premises within a 400-metre radius, mapped onto 0-100 by the same saturating curve as the amenity families, with a constant of 90. It is the only finding on the sheet that reads APUR’s survey and nothing else, so it stays on screen when the OpenStreetMap mirrors do not answer. A number of shopfronts is neither revenue nor a guarantee of footfall — it says trade is already here, not that it thrives here.',
    provenanceTitle: 'Where each figure comes from',
    provenanceBody:
      'Every score carries the source of the data layer it actually reads, not one source stamped on the whole card. The five amenity families, walkability and noise come from OpenStreetMap. Estimated foot traffic mixes two layers instead — active-shop density and transport access — so it names both sources, carries both licences (a composite figure binds you to both), and takes the older of the two dates, because a composite is never fresher than its oldest ingredient. On the map all three layers come from the same OpenStreetMap snapshot, so a single mention is accurate there. On the context sheet of an address it stopped being accurate on 14 September 2026: premises come from APUR’s BDCom survey and amenities from OpenStreetMap, exactly as in the agent-facing interface, and foot traffic cites both.',
    verdictTitle: 'How a context sheet composes its verdict',
    verdictIntro:
      'The context sheet of an address opens on one sentence. That sentence is not written by hand: it is composed by a published function from the findings already computed, and it names the ones it used. Like the formulas above, the rule is here because the sentence is shown to everyone.',
    verdictRule:
      'Four findings bear the verdict — the commercial fabric, footfall, rail access and shops and services on foot, and since 15 September 2026 all four are read from the corpus rather than from a free public mirror. When one of the four is withheld for licence, outside the corpus, coming from an unreachable source or simply undetermined, the verdict does not compose: the sheet says which one is missing and why, and shows the findings that did resolve separately. Concluding over an absence is the defect this rule exists to prevent. The commercial fabric has been bearing since 14 September 2026, and that is a decision: Compass does not sign a verdict about a commercial address without the survey of the commerce at that address. Outside Paris intra-muros, where the corpus stops, the verdict therefore now refuses.',
    verdictSupport:
      'Food shops and road noise come alongside. Their absence blocks nothing, and their presence does not enter the sentence: they qualify an answer, they are not the answer.',
    verdictNoScore:
      'No score out of 100 is produced for an address, and that is not an oversight. The weights between footfall, transit and quiet depend on the trade — a single score would average things that pull against each other, and a baker and an accountancy practice would not read the same figure the same way. The verdict is a sentence of named axes, each unfolding onto its source, licence, vintage and method.',
    verdictLimit:
      'What this rule does not catch: a figure that is present but weak still composes. Estimated foot traffic is a proxy by construction, since no open pedestrian count covers Île-de-France; refusing on that ground would refuse every verdict, everywhere. The caveat then travels with the finding, and is read under its chevron.',
    compareTitle: 'Why comparison stops at two addresses',
    compareBody:
      'A context sheet accepts one second address, and only one. This is not a performance limit: comparison in bulk — the export, the portfolio, the ranking — is the gesture Compass refuses, because it turns an instructed context into a list to sort. The bound is in the code rather than in an intention: the comparison function takes two named sets of findings, never a list, so a third address has nowhere to go.',
    compareNoRank:
      'Neither address is declared better. The axes are set side by side, in the same words the verdict sentence uses, and an axis only one side carries is marked not comparable rather than placed opposite a blank: two aligned figures invite subtraction, and one of the two does not exist.',
    parityTitle: 'The same answer for an agent, and how it is checked',
    parityBody:
      'The verdict is composed by a function of the core, outside any page. The Compass MCP server compiles that same core and therefore serves the same composition rule: a sheet displays the call that returns the corresponding answer. Parity is not declared — the check recomposes the server’s verdict from the figures the server publishes, and goes red if the two differ.',
    parityLimit:
      'What this parity does not say: the two surfaces do not read the same corpus. The browser counts premises from OpenStreetMap, the agent from APUR’s BDCom — a door-to-door survey, the better source. The figures may therefore differ, and that is deliberate. What is shared is the composition rule, not the corpus.',
    dossierTitle: 'The dossier of an address, and what it holds',
    dossierBody:
      'A context sheet can be downloaded. The file carries one row per finding, and beside every figure: its source, its licence, its vintage, its method, the formula applied, its constants, the radius, and the operand — the premises counted, the distance to the stop. The formulas and the constants are the ones published above, read from the code rather than copied: the file therefore holds enough to redo each computation without taking our word for it.',
    dossierNoBulk:
      'One dossier, one address. There is no "export everything" button, and the export leaves from a sheet and never from a list of results: assembling a portfolio of fifty addresses is the gesture Compass refuses, for the same reason comparison stops at two. The bound is structural — the function that produces a dossier takes one address and has no plural form.',
    dossierGaps:
      'A missing finding goes down too, with the cause of its absence — source unreachable, outside the corpus, withheld for licence, undetermined — and it is never rendered as a zero. A finding whose source had not answered yet at the moment of download is marked as such: an answer on its way and a hole do not read alike.',
    missingTitle: 'When a source is missing',
    missingBody:
      'A score is only computed if the data layer it depends on actually loaded. When that layer is missing, Compass does not show 0: it shows "n/a" and says why. The distinction matters most for noise, where a 0 would read as "very low" — a quiet street asserted from absent data. A neighbourhood genuinely without amenities does get a 0: that is a count, not a gap.',
    limitsTitle: 'Acknowledged limitations',
    limits: [
      'Scores depend on OpenStreetMap completeness, which varies from one neighbourhood to another.',
      'Foot traffic and noise are estimates, not measurements.',
      'Compass shows no commercial rent: that data does not exist as open data in France.',
      'No score replaces a site visit or a market study.',
    ],
  },
} as const;

const Methodology = () => {
  const { locale } = useLocale();
  const c = COPY[locale];

  return (
    <>
      <Seo
        title={c.seoTitle}
        description={c.seoDescription}
        path="/methodologie"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: c.jsonLdHeadline,
            url: `${SITE_URL}/methodologie`,
            author: { '@type': 'Person', name: 'Ivan de Murard' },
            about: c.jsonLdAbout,
          },
        ]}
      />
      <PageLayout title={c.title} intro={c.intro} crumbs={[{ label: c.crumb }]}>
        <section>
          <h2 className="text-xl font-semibold">{c.walkTitle}</h2>
          <p className="mt-3 text-muted-foreground">
            {c.walkBody1a}<strong>{locale === 'en' ? '800 metres' : '800 mètres'}</strong>{c.walkBody1b}
          </p>
          <p className="mt-3 text-muted-foreground">
            {c.walkBody2a}
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
              score = 100 × (1 − e^(−n / s))
            </code>
            {c.walkBody2b}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-white">
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thFamily}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thWeight}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thSaturation}</th>
                  <th scope="col" className="py-2 font-semibold">{c.thSource}</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHTS.map((w) => (
                  <tr key={w.familyFr} className="border-b">
                    <td className="py-3 pr-4">{locale === 'fr' ? w.familyFr : w.familyEn}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{w.weight}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.saturationUnit(w.saturation)}</td>
                    <td className="py-3 text-muted-foreground">{w.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Avant le flux piéton, parce que c'est l'ordre de lecture de la fiche et que cet
            ordre EST la doctrine de #157 : ce que la base tient d'abord, ce qu'un miroir
            public gratuit ajoute ensuite. */}
        <section>
          <h2 className="text-xl font-semibold">{c.densityTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.densityBody}</p>
        </section>

        {/* Les deux axes que w6-amenites-corpus a déplacés dans le corpus. Ils sont ici
            parce que `CLAUDE.md` l'exige — toute formule de `src/core/scoring.ts` est
            publiée — et AVANT le flux piéton, qui lit la desserte ferrée. */}
        <section>
          <h2 className="text-xl font-semibold">{c.servicesTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.servicesBody1}</p>
          <p className="mt-3 text-muted-foreground">{c.servicesBody2}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-white">
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thFamily}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thWeight}</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{c.thSaturation}</th>
                  <th scope="col" className="py-2 font-semibold">{c.thSource}</th>
                </tr>
              </thead>
              <tbody>
                {SERVICE_WEIGHTS_PUBLISHED.map((w) => (
                  <tr key={w.familyFr} className="border-b">
                    <td className="py-3 pr-4">{locale === 'fr' ? w.familyFr : w.familyEn}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{w.weight}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.saturationUnit(w.saturation)}</td>
                    <td className="py-3 text-muted-foreground">{w.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-muted-foreground">{c.servicesLimit}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.railTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.railBody}</p>
          <p className="mt-3 text-muted-foreground">
            <code className="mr-1 rounded bg-muted px-1 py-0.5 text-xs">
              score = 100 × e^(−d / 400 m)
            </code>
          </p>
          <h3 className="mt-4 font-semibold">{c.railLimitTitle}</h3>
          <p className="mt-2 text-muted-foreground">{c.railLimit}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.footTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.footBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.noiseTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.noiseBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.airTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.airBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.riskTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.riskBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.rentTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.rentBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.detectTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.detectBody}</p>
          {/* Deux écrans, deux sources, et il faut le dire plutôt que le laisser déduire —
              w6-fiche-corpus (#157). La carte compte des locaux marqués par des bénévoles, la
              fiche compte un relevé de terrain, et les deux nombres ne veulent pas dire la
              même chose. Une page de méthode qui n'en décrirait qu'un serait fausse sur
              l'autre. */}
          <p className="mt-3 text-muted-foreground">{c.detectSheetBody}</p>
        </section>

        {/* Published here because the interface now renders it. `CLAUDE.md`: a rule that
            reaches the screen is published on this page, like the scoring formulas. The
            wording of the three states is the one `src/i18n/timelineText.ts` produces. */}
        <section>
          <h2 className="text-xl font-semibold">{c.historyTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.historyBody}</p>

          <h3 className="mt-4 font-semibold">{c.historyReadingTitle}</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
            {c.historyReading.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-muted-foreground">{c.historyNoLabel}</p>

          <h3 className="mt-4 font-semibold">{c.confidenceTitle}</h3>
          <p className="mt-2 text-muted-foreground">{c.confidenceIntro}</p>
          <dl className="mt-2 space-y-1 text-muted-foreground">
            {c.confidence.map(([level, meaning]) => (
              <div key={level}>
                <dt className="inline font-medium text-foreground">{level} — </dt>
                <dd className="inline">{meaning}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-4 font-semibold">{c.matchTitle}</h3>
          <p className="mt-2 text-muted-foreground">{c.matchBody}</p>
          <p className="mt-3 text-muted-foreground">{c.matchGapBody}</p>

          <h3 className="mt-4 font-semibold">{c.surveyStepTitle}</h3>
          <p className="mt-2 text-muted-foreground">{c.surveyStepBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.provenanceTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.provenanceBody}</p>
        </section>

        {/* CLAUDE.md requires the formulas of src/core/scoring.ts to be published here. A
            sentence shown to every visitor needs its method no less than a number does, so the
            composition rule of src/core/verdict.ts is published under the same obligation. */}
        <section>
          <h2 className="text-xl font-semibold">{c.verdictTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.verdictIntro}</p>
          <p className="mt-3 text-muted-foreground">{c.verdictRule}</p>
          <p className="mt-3 text-muted-foreground">{c.verdictSupport}</p>
          <p className="mt-3 text-muted-foreground">{c.verdictNoScore}</p>
          <p className="mt-3 text-muted-foreground">{c.verdictLimit}</p>
        </section>

        {/* Same obligation, one step further: the two-address bound and the agent parity are
            rules a visitor is subject to, so they are published rather than merely enforced. */}
        <section>
          <h2 className="text-xl font-semibold">{c.compareTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.compareBody}</p>
          <p className="mt-3 text-muted-foreground">{c.compareNoRank}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.parityTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.parityBody}</p>
          <p className="mt-3 text-muted-foreground">{c.parityLimit}</p>
        </section>

        {/* Same obligation again: a dossier is a document that LEAVES, so the rule it carries —
            one address, no bulk export, and an absence that stays an absence — is published here
            rather than only enforced in `src/core/dossier.ts`. w6-dossier (#33). */}
        <section>
          <h2 className="text-xl font-semibold">{c.dossierTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.dossierBody}</p>
          <p className="mt-3 text-muted-foreground">{c.dossierNoBulk}</p>
          <p className="mt-3 text-muted-foreground">{c.dossierGaps}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.missingTitle}</h2>
          <p className="mt-3 text-muted-foreground">{c.missingBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{c.limitsTitle}</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
            {c.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      </PageLayout>
    </>
  );
};

export default Methodology;
