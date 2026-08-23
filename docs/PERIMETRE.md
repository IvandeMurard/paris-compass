# Compass — périmètre, refus, et questions

Document de décision produit. Août 2026.
Ce n'est pas une roadmap : c'est ce qui délimite le produit, et ce qu'on refuse d'y mettre.
Le backlog ordonné est dans `docs/PLAN.md`, les décisions d'architecture dans `docs/CONTEXTE.md`.

---

## 1. Pour qui, et pour qui pas

**Le preneur.** Un commerçant, restaurateur, artisan ou franchisé qui doit choisir *où* ouvrir. Il prend cette décision une à trois fois dans sa vie professionnelle. Elle l'engage sur un bail 3/6/9. Il n'a ni base de comparaison, ni méthode, ni les moyens d'un conseil. Il décide aujourd'hui sur une visite, une intuition de passage, et le discours du bailleur.

**L'agent.** Un LLM qui instruit la même question pour le compte de quelqu'un — via un serveur MCP, sans interface. Même noyau de calcul, même exigence de traçabilité, sortie différente : JSON et chaîne de raisonnement au lieu d'une carte.

**Pas le courtier.** C'est le refus structurant. Le courtier qualifie des dizaines d'emplacements par mois pour des clients tiers ; il veut de l'export, du dossier, du portefeuille, de la comparaison en masse et une couverture nationale. Tout ce qu'il lui faut alourdit le produit du preneur, qui instruit *un* emplacement, en profondeur, une fois. Servir les deux, c'est ne servir ni l'un ni l'autre. Si le courtier a besoin de Compass, il utilisera la même chose que l'agent : l'API.

### Le refus mis à l'épreuve : le cas d'une agence de pop-up

Examiné le 17 août 2026 à partir de la communication publique de **My Pop Up Store**, agence parisienne qui revendique près de vingt ans d'activité et plus de 800 lieux sourcés. Le cas mérite d'être gardé parce qu'il teste le refus ci-dessus sans le contredire, et parce que la conclusion n'est pas celle d'`Appear Here` (voir `PLAN.md`, « Refusé — les places de marché »).

**Ce qui reste refusé, et pour la raison déjà écrite.** Mettre en avant des lieux exclusifs, c'est détenir du stock. L'argument décisif n'est pas doctrinal mais interne au produit : superposer quelques centaines d'emplacements *prime* aux 85 418 locaux du corpus fabriquerait une **fausse absence** — « pas de lieu ici » se lirait « rien à saisir ici », alors que la vérité serait « ce catalogue ne couvre pas ce quartier ». C'est le défaut corrigé partout ailleurs dans le scoring, réintroduit par la porte d'un partenariat.

**Un agent qui irait chercher photos et avis pour pré-qualifier est à écarter, pour deux raisons distinctes.** La première est la contrainte fondatrice : un avis de plateforme n'est ni re-dérivable ni sous licence ouverte, et une seule exception vide `Measured<T>` de son sens. La seconde n'était écrite nulle part et vaut d'être retenue : **un avis parle du commerce précédent, pas du local.** Un restaurant à 3,2 étoiles renseigne sur une gestion, pas sur un emplacement — et confondre les deux est l'erreur que le produit existe pour empêcher, la même que celle d'une suite d'activités lue comme un verdict.

**Ce qui marche, et ne demande aucune concession, c'est le sens inverse.** L'agence apporte l'adresse, Compass rend le contexte : c'est mot pour mot la promesse du §6. Un courtier possède précisément ce que Compass n'aura jamais, et Compass calcule précisément ce qu'un courtier affirme sans pouvoir le sourcer — *« savoir quelle rue draine le bon trafic »* est, dans cette communication, une assertion d'expertise. Le produit ne remplace pas l'accompagnement humain : **il rend vérifiables les affirmations de l'humain.** Et le canal existe déjà, celui que ce paragraphe annonçait : le serveur MCP, avec le rôle `anon` et rien d'autre.

**Trois réserves à ne pas perdre**, parce qu'elles bornent la valeur réelle :

- **Ce que l'agence vend — le cachet, la lumière, la modularité — est exactement ce qu'aucune donnée ouverte ne porte.** Compass ne pré-qualifiera jamais l'écrin. Il pré-qualifie la rue. C'est une répartition du travail, pas un manque.
- **Le cas d'usage pop-up ne consomme qu'une moitié du corpus.** La rotation triennale, la survie par activité et la projection (§5 bis C) sont bâties pour un bail 3/6/9 ; un pop-up de trois semaines ne s'intéresse pas à la pente d'un quartier en 2031. Mobiliscope, à l'inverse, y vaut *plus* que pour un bail long, puisque toute l'économie d'un pop-up est temporelle.
- **Compass ne chiffrera jamais un loyer de pop-up.** Ce n'est pas un 3/6/9 mais une convention d'occupation précaire ou un bail dérogatoire, et il n'existe aucune donnée ouverte sur ces niveaux — le §5 est déjà catégorique sur les loyers commerciaux, et ce cas est plus fermé encore.

Le rapport juste entre les deux métiers est celui déjà écrit en `PLAN.md` §5.7 : **le pop-up n'est pas un concurrent du produit, c'est l'instrument de dérisquage de la décision que Compass instruit.** Un client d'agence dont le pop-up marche est le preneur de demain — c'est-à-dire le persona du §1. L'agence est en amont, pas en face.

---

## 2. Les deux contraintes fondatrices

> **Si un chiffre ne peut pas être re-dérivé depuis une source publique citée, il ne s'affiche pas.**

Cela exclut le déclaratif du bailleur, le scraping d'annonces, l'estimation propriétaire, et le score inventé pour combler un trou. Une donnée manquante s'affiche comme manquante. Rendu mécanique par le type `Measured<T>` de `src/core/provenance.ts`.

> **Si deux locaux de la même rue obtiennent le même verdict, Compass n'a rien dit.**

La granularité utile n'est pas l'arrondissement ni le quartier : c'est le tronçon de rue, parfois le côté du trottoir. Un indicateur qui ne varie pas à cette échelle est un indicateur de contexte général, pas un outil de décision — il informe, il ne tranche pas.

---

## 3. Ce que Compass fait

Compass répond à une question et une seule : **ce que vaut cet emplacement pour ce que je veux y faire.**

Il prend un point sur une carte et rend son environnement lisible : qui est déjà là, qui est parti, ce que la loi autorise, combien de gens passent, ce que ça coûte autour, et ce que l'environnement fait subir au local. Chaque chiffre est accompagné de sa source, de sa date, et de la manière dont il est calculé.

---

## 4. Ce que Compass ne fait pas

Chaque refus achète quelque chose. C'est la contrepartie qui compte, pas le refus.

| Refus | Ce que ça achète |
|---|---|
| **Ce n'est pas un portail d'annonces.** Compass ne liste pas ce qui est à louer, ne scrape aucun portail, n'a pas d'inventaire. Il montre en revanche ce qui **se libère** — cessations, liquidations, vacance recensée (§5 bis B). | Aucune exposition contractuelle, aucun stock périmé, et un positionnement en amont de l'annonce plutôt qu'en concurrence frontale avec elle. |
| **Ce n'est pas un CRM ni un outil de portefeuille.** Pas de pipeline, pas de mandats, pas d'équipe, pas de reporting. | Un écran qui parle d'un lieu, pas d'un process. Rien à remplir. |
| **Compass n'estime pas votre loyer.** Il n'existe aucune donnée publique de loyers commerciaux réels en France. | L'honnêteté sur le seul chiffre que tout le monde voudrait. |
| **Compass ne prédit pas votre chiffre d'affaires.** Pas de prévisionnel, pas de « ce commerce marchera ». | La crédibilité. Aucune donnée ouverte ne permet cette prédiction ; la produire quand même la rendrait invérifiable et fausserait tout le reste. |
| **Il n'y a pas de note globale sur 100.** Pas de « Compass Score ». | Les pondérations dépendent du métier : une boulangerie veut du flux, un studio de yoga veut du calme, un caviste veut du revenu médian. Un score unique moyenne des choses qui s'opposent. Compass affiche les axes séparément et laisse le métier arbitrer. |
| **Compass ne couvre pas la France.** Paris intra-muros, extension Île-de-France ensuite. | La profondeur. Les sources qui font la valeur — recensement terrain des commerces, PLU commercial, validations de transport — sont locales ou régionales. Étendre la couverture, c'est perdre exactement ce qui distingue Compass d'un agrégateur. |
| **Compass ne demande pas de compte pour explorer.** | Rien à franchir avant de voir si l'outil sert à quelque chose. |

---

## 5. Les questions, sur trois horizons

L'exercice : lister ce qu'un preneur veut réellement savoir, puis marquer honnêtement ce qui est atteignable.

### Horizon 1 — répondable, avec des sources ouvertes et gratuites

Rien ici ne demande de clé, de contrat, ni de budget. Ce qui manque, c'est le branchement.

**Sur le voisinage commercial**
- Combien de commerces de mon type dans un rayon de 300 m, et lesquels précisément ?
- **Quel est le taux de vacance commerciale de cette rue — et comment a-t-il bougé depuis 2017 ?**
- Qui a ouvert et qui a fermé dans ce tronçon ces trois dernières années ?
- Ce local a-t-il déjà accueilli un commerce, et lequel ?

> La BDCom de l'APUR est l'actif le plus sous-exploité du paysage. C'est un recensement de terrain, porte à porte, de **tous** les locaux parisiens en rez-de-chaussée avec vitrine et accès sur rue. Millésime 2023 : relevé en juin par une vingtaine d'enquêteurs, **83 154 locaux dont 60 845 commerces et services commerciaux**, plus 103 concentrations commerciales. Chaque local porte sa localisation fine (sur rue, en cour, à l'angle, en concentration), son type (boutique, atelier, bureau), son activité sur une **nomenclature à 224 postes**, et une tranche de surface (< 300 m², 300 à 1000, > 1000). ODbL, en KML/CSV/GeoJSON/Shapefile ou par API.
>
> Deux choses en découlent. D'abord, la nomenclature à 224 postes et les tranches de surface écrasent le tagging OSM sur lequel Compass repose aujourd'hui — le filtre surface actuel gagnerait une assise réelle. Ensuite et surtout : trois millésimes (2017, 2020, 2023) d'un recensement exhaustif, c'est une **série temporelle de la rotation commerciale rue par rue** — c'est d'ailleurs de là que l'APUR tire ses taux de vacance publiés. Aucun outil grand public n'exploite ça. C'est la réponse la plus forte que Compass puisse donner, et elle est disponible aujourd'hui.

**Sur la légalité**
- **Ce local est-il sur un linéaire commercial protégé — puis-je y faire ce que je veux ?**
- Le changement de destination est-il possible à cette adresse ?

> Le PLU parisien protège des linéaires commerciaux et artisanaux entiers : sur ces tronçons, un local en rez-de-chaussée ne peut pas être transformé. C'est une contrainte binaire, publique, cartographiée, sur opendata.paris.fr — et c'est la première chose qui peut faire capoter un projet. Compass ne la connaît pas aujourd'hui. (Fournie à titre indicatif, sans valeur réglementaire : à afficher comme signal, avec renvoi à l'urbanisme.)

**Sur le flux**
- **Combien de validations à la station la plus proche, un mardi ?**
- Le flux est-il matinal, vespéral, week-end ?

> IDFM publie les validations par station et par jour, avec historique depuis 2015 et profils horaires. C'est un chiffre réel qui remplacerait le « passage estimé » actuel, qui n'est qu'une densité de commerces croisée avec une couverture de transport.

**Sur le prix**
- Combien s'est vendu le m² de local commercial dans cette rue ces cinq ans ?
- **Combien se sont vendus les fonds de commerce du quartier, et lesquels ?**

> DVF (DGFiP, mise à jour en avril et octobre) couvre les mutations de **murs**, pas les fonds de commerce ni les ventes de parts de SCI.
> Le complément est le **BODACC** : les ventes et cessions de fonds de commerce y sont publiées **avec leur prix**, au titre de la publicité légale, via une API ouverte et gratuite de la DILA. C'est la donnée de prix la plus proche de ce que le preneur va réellement payer, et elle est publique.

**Sur la zone de chalandise**
- Combien de gens vivent dans les 500 m, avec quel revenu médian et quelle structure d'âge ?
- Combien de temps met-on vraiment pour venir ici depuis les quartiers résidentiels ?

> IRIS/FiLoSoFi pour le premier, GTFS IDFM pour le second — temps de trajet réels au lieu de proximité à vol d'oiseau.

### Horizon 2 — ouvert mais partiel, à assumer comme tel

Ces réponses existent, mais incomplètes ou biaisées. Elles se donnent avec leur marge.

- **Les commerces voisins gagnent-ils de l'argent ?** Les comptes annuels sont déposés au RNE et exposés par API INPI, mais **environ 45 % des dépôts sont assortis d'une déclaration de confidentialité**, et ce sont surtout les petites structures qui s'en prévalent. Réponse structurellement biaisée vers les plus gros : à présenter comme un échantillon, jamais comme une moyenne de rue.
- **Combien de piétons passent devant ?** Des comptages piétons existent mais par campagnes ponctuelles (mardi ou jeudi et samedi, en septembre-octobre), pas par capteurs permanents. Le comptage multimodal permanent de la Ville couvre vélo, trottinette, deux-roues, VL, PL, bus — pas les piétons. Indication ponctuelle, pas une mesure de flux.
- **Quel bruit réel ?** Bruitparif publie des cartes stratégiques modélisées et quelques points de mesure. Bon à l'échelle du quartier, insuffisant à l'échelle du trottoir. (C'est exactement le problème que Tacet résout par ray-tracing sur la volumétrie bâtie — transposable ici via la BD TOPO IGN.)
- **Quels travaux sont prévus devant ce local ?** Les chantiers sont publiés mais de façon fragmentée et à horizon court. Un chantier de douze mois devant une vitrine tue un commerce : la question vaut la peine même mal répondue.

### Horizon 3 — réellement bloqué

Cette liste est plus courte qu'elle n'en avait l'air. Deux questions d'abord classées ici en sont sorties après vérification : **le prix des fonds de commerce** (publié au BODACC) et **la disponibilité à venir des locaux** (dérivable des cessations et des procédures collectives). Voir §5 bis.

- **Quel loyer vais-je payer ?** Il n'existe pas d'observatoire ouvert des loyers commerciaux. Les observatoires locaux des loyers portent sur le parc locatif privé **d'habitation**. L'ILC de l'INSEE est un indice de révision, pas un niveau de loyer par rue. Les valeurs locatives commerciales par rue sont vendues par des acteurs privés — ce qui prouve précisément qu'elles ne sont pas ouvertes. *Contournement partiel : le prix des fonds de commerce au BODACC porte une information indirecte sur la valeur locative d'un emplacement.*
- **Combien de piétons passent devant ce local, en continu ?** Aucun capteur piéton permanent à Paris. Le comptage multimodal permanent compte vélo, trottinette, deux-roues, VL, PL et bus — **pas les piétons**. Les données de téléphonie sont propriétaires, coûteuses et lourdes en RGPD. *Contournement : mesurer la présence et le rythme plutôt que le passage. Voir §5 bis.*
- **Combien dépensent les gens du quartier, et en quoi ?** Données de transaction carte — propriétaires. Aucun contournement.
- **Quels locaux sont à louer aujourd'hui ?** Les annonces vivent sur des portails privés dont les CGU interdisent la reprise. Aucun contournement sur le stock présent. *Mais le stock à venir, lui, est public. Voir §5 bis.*

---

## 5 bis. Les contournements

### A. Le passage piéton : mesurer la présence et le rythme, pas le flux

Compter les piétons devant une vitrine est hors d'atteinte. Mais ce n'est pas exactement ce que le preneur veut savoir. Il veut savoir **combien de gens sont là, qui ils sont, et à quelle heure**. Quatre sources ouvertes répondent à ça, et aucune n'est branchée.

**1. Mobiliscope (CNRS) — la présence, heure par heure.**
Population effectivement présente dans chaque secteur, **pour chacune des 24 heures d'un jour de semaine moyen**, ventilée par âge, sexe et catégorie socio-professionnelle. 49 aires urbaines françaises, dont Paris. ODbL, CSV + GeoJSON, téléchargement libre. Construit à partir des grandes enquêtes de mobilité.
C'est la donnée qui manque le plus à Compass. Elle distingue un quartier de bureaux qui triple à midi et se vide à 19 h d'un quartier résidentiel au profil inverse — deux emplacements que la population résidentielle INSEE décrit de façon identique, et qui ne valent pas la même chose selon qu'on ouvre une boulangerie ou un bar à vin. Réserve à assumer : jour de semaine moyen, enquêtes de 2009 à 2019 selon les villes, maille secteur et non trottoir.

**2. Validations IDFM — les arrivées, comptées.**
Par station, par jour, par titre de transport, historique depuis 2015 avec profils horaires. Ce ne sont pas des estimations : ce sont des validations comptées.

**3. Vélib' en temps réel — le rythme de la rue.**
API GBFS, ~1 400 stations, mise à jour chaque minute, **sans clé**. Personne ne s'en sert de cette manière : le cycle de remplissage d'une station porte la direction et l'horaire du flux. Une station qui se vide à 8 h et se remplit à 19 h est en zone de départ ; l'inverse est une zone d'arrivée. Agrégé sur quelques semaines, c'est une signature horaire de la rue, gratuite et continue.

**4. Comptage multimodal permanent — l'activité de la voie.**
Capteurs thermiques, horaire, vélo/trottinette/deux-roues/VL/PL/bus. Pas de piétons, mais une mesure d'animation de la voie.

**Et la sortie honnête sur ce qui reste :** ce qu'aucune donnée ne donnera, un preneur peut le relever lui-même en vingt minutes sur le trottoir. Un protocole de comptage manuel — quel jour, quelle heure, combien de temps, comment extrapoler — publié comme outil gratuit et autonome, transforme le trou en méthode. Ça coûte une page, ça ne dépend d'aucune API, et c'est ce qui distingue un outil qui admet ses limites d'un outil qui les masque.

### B. La disponibilité : viser l'amont de l'annonce

Compass ne peut pas savoir ce qui est **sur le marché**. Il peut savoir, légalement et gratuitement, ce qui **se libère**. C'est en amont de l'annonce, pas en aval.

**1. BODACC (DILA) — API ouverte, gratuite, sans clé.**
Le bulletin publie les **ventes et cessions de fonds de commerce, avec leur prix** — c'est une obligation de publicité légale. Il publie aussi les **procédures collectives** : sauvegardes, redressements, liquidations. API officielle, formats CSV/JSON/Excel.
Deux conséquences directes. D'abord, le prix des fonds de commerce n'est pas une donnée fermée : c'est un journal officiel. Ensuite, une liquidation judiciaire à une adresse est un signal public qu'un local va se libérer, souvent des mois avant qu'une annonce paraisse.

**2. Cessations SIRENE — déjà à moitié branché.**
Compass interroge déjà l'API recherche-entreprises. Elle porte les dates de cessation d'établissement. Un établissement qui cesse à une adresse recensée comme commerce en BDCom, c'est un local qui vient de se vider.

**3. BDCom — les locaux déjà recensés vacants.** Instantané triennal, donc à traiter comme un point de départ d'enquête, pas comme une offre.

**4. Droit de préemption commercial parisien — piste à vérifier.**
Depuis le 7 août 2024, toute cession de fonds ou de bail dans les 5e, 6e et une partie du 7e doit être déclarée à la Ville, sous peine de nullité. Ces déclarations existent donc administrativement. Reste à vérifier si elles sont publiées en open data — le périmètre est étroit, mais si elles le sont, c'est le signal le plus précoce qui existe.

**5. Registre national d'immatriculation des copropriétés (RNIC, ANAH) — piste à vérifier.**
Repérée le 23 août 2026 en creusant un fil Reddit sur un outil de prospection prédictive résidentielle (Arpentiq). Le registre porte des indicateurs de difficulté financière du syndicat (impayés, procédure), consultables par adresse sur registre-coproprietes.gouv.fr. Un immeuble en difficulté pousse souvent ses copropriétaires à vendre avant que la situation empire — signal sur l'immeuble entier, donc sur le local commercial qu'il abrite. Reste à vérifier si un export en masse existe : sans lui, seule une recherche unitaire par adresse est possible, ce qui ne s'industrialise pas.

**Ce que ça change pour le produit :**

> Compass ne liste pas ce qui est à louer. Il montre ce qui se libère — le local dont l'exploitant vient de cesser, celui dont le fonds part en liquidation, celui que le dernier recensement a trouvé vide. Vous arrivez avant l'annonce, ou vous arrivez avec le contexte quand l'annonce arrive.

C'est une position plus forte que l'inventaire, pas un lot de consolation : un portail d'annonces montre ce que tout le monde voit déjà.

### C. La projection : les sources qui parlent du futur

Toutes les sources ci-dessus décrivent l'état actuel. Un bail commercial engage sur neuf ans. La question qui compte n'est pas « ce quartier vaut quoi », c'est **« ce quartier vaudra quoi »** — et c'est là que Compass peut être seul.

- **Sitadel (SDES) — les autorisations d'urbanisme depuis 2013.** Permis de construire, déclarations préalables créant du logement, **et permis de création ou d'extension de locaux non résidentiels**. C'est-à-dire : les futurs habitants et les futurs commerces concurrents, deux à trois ans avant leur arrivée. Diffusion mensuelle. Réserve : la maille communale est fréquente dans les séries agrégées ; la base détaillée est plus fine mais plus lourde à traiter.
- **Logements autorisés et commencés — séries mensuelles communales.** La trajectoire de la demande résidentielle, pas son instantané.
- **Observatoire des quartiers de gare du Grand Paris Express (APUR).** Périmètres de 800 m autour de 69 futures gares, avec les statistiques INSEE associées. Une gare qui ouvre redistribue les flux d'un quartier entier. Pour Paris intra-muros l'effet est marginal, mais c'est le levier majeur dès que le périmètre s'étend à l'Île-de-France — et il justifie à lui seul l'ordre d'extension géographique.
- **Chantiers et travaux de voirie.** Horizon court, publication fragmentée, mais un chantier de douze mois devant une vitrine change l'économie de la première année de bail.
- **Séries historiques INSEE par IRIS.** Le revenu médian d'aujourd'hui dit peu ; sa pente sur quinze ans dit beaucoup. La gentrification et le déclin sont des tendances, pas des états.

**Le cas d'un employeur qui change un quartier, testé le 23 août 2026 sur un cas réel — et qui a échoué.** Mistral AI installe son siège (~20 000 m², jusqu'à 1 000 salariés) dans l'immeuble Marcadet-Belvédère, 18e, début 2026. Un premier triplet SIRENE/BODACC/DVF a été envisagé puis vérifié brique par brique, sans tenir : SIRENE compte des *créations* d'établissements, pas le déménagement d'une entreprise déjà immatriculée ailleurs — utile pour une multitude de petites structures qui se regroupent, pas pour un poids lourd unique qui bouge d'un coup. BODACC publierait bien le transfert de siège, mais au moment du dépôt légal — une confirmation concurrente, pas une anticipation à plusieurs années. DVF ne couvre que les mutations de propriété : Mistral loue l'immeuble, elle ne l'achète pas, donc rien n'y apparaît. Seul Sitadel garde une prise réelle — un permis de rénovation lourde sur l'immeuble, des années avant l'emménagement — et encore en nommant le propriétaire (ici Icawood), jamais le futur locataire.

Le résultat de ce test est un refus de plus, pas une méthode. Le déménagement d'un employeur nommé se négocie dans le circuit privé de l'immobilier tertiaire (courtiers, presse spécialisée comme Business Immo ou Costar, sources de vérification du fait ci-dessus) et fuite là avant toute trace publique — même famille que le refus déjà posé en §5, horizon 3 : « quels locaux sont à louer aujourd'hui », un marché fermé plutôt qu'un angle mort de la donnée ouverte. Ce que Compass peut réellement anticiper reste ce que ce bloc décrivait déjà avant le test : la pente agrégée — jamais l'arrivée d'un acteur nommé.

**Mais ce n'est pas la question qui compte pour un preneur, et elle a une réponse.** Une fois l'installation connue — par la presse, jamais affichée comme telle — ce que ça fait au commerce alentour se mesure avec ce qui est déjà dans le périmètre, sans aucune source nouvelle. La rotation entre millésimes BDCom (§5, Horizon 1) dira si le mix d'activités autour de l'immeuble bascule vers la restauration rapide et les services au prochain relevé. SIRENE compte les créations et cessations à proximité immédiate, avant et après. BODACC dira si le prix des fonds de commerce du quartier bouge dans les mois suivants. IDFM, historique depuis 2015, dira si les validations à la station la plus proche augmentent. Vélib' dira si le cycle de la station voisine bascule d'une signature résidentielle à une signature bureau. DVF dira si le prix des murs commerciaux du quartier bouge dans les millésimes suivants. Aucun de ces six n'annonce l'arrivée à l'avance — tous mesurent, sourcés et datés, ce qu'elle a produit une fois advenue. C'est le même geste que la rotation commerciale rue par rue déjà décrite en §5 : un instrument de mesure, pointé sur un lieu et une date, pas un instrument de prédiction.

C'est ce bloc qui donne son sens à la formule « replacer le local dans son environnement » : l'environnement d'un bail 3/6/9 est autant temporel que spatial. Un outil qui décrit le présent aide à visiter ; un outil qui décrit la pente aide à signer.

---

## 6. Ce que Compass promet

Le stock présent est justement ce que Compass ne peut pas connaître. Promettre une recherche d'offres sans offres, c'est se placer sur le terrain où on perd.

La promesse tenable, en deux temps :

> **Vous apportez l'adresse, Compass apporte le contexte** — celle qu'un agent vous propose, celle du panneau vu hier, celle où vous hésitez.
> **Et quand vous n'avez pas d'adresse, Compass montre celles qui se libèrent** — cessations, liquidations, locaux recensés vacants.

Aucune des deux ne dépend d'un inventaire.

---

## 7. Le loyer de référence — corrigé, et pourquoi ça compte

*Historique conservé : c'est la correction la plus instructive du projet.*

Le README annonçait parmi les sources connectées un « Rent control dataset — Reference rent €/m² per neighbourhood ». L'encadrement des loyers parisien **ne s'applique qu'au logement** — vide ou meublé, résidence principale, loi du 6 juillet 1989 — et exclut explicitement les locaux commerciaux et professionnels.

Le code ne faisait pas que l'afficher : il le multipliait par la surface du local pour produire un `estimatedMonthlyRent`, qui filtrait ensuite les résultats. Le curseur « Loyer mensuel » agissait donc sur une grandeur qui n'existe pas.

Le plus instructif est ailleurs : **la page Méthodologie disait déjà la vérité.** Elle affirmait que le chiffre « concerne le logement » et n'est « jamais [utilisé] comme prix de commercialisation ». Le discours était rigoureux pendant que le code prenait un raccourci. C'est le risque propre au build assisté, et il mérite d'être raconté plutôt que caché.

Corrigé en deux temps. D'abord la suppression du loyer fabriqué et du filtre. Ensuite la correction du choix de données lui-même : le module épinglait une seule case de la grille préfectorale — deux pièces, non meublé, construit entre 1946 et 1970 — soit un trente-deuxième du jeu. Il en fait désormais la moyenne des 32, et affiche le millésime.

Deux réserves qui restent, et qu'il faut afficher plutôt que masquer : le jeu ouvert accuse un retard sur l'arrêté en vigueur (2019 à 2025 disponibles en août 2026), et le rattachement au quartier se fait encore par centroïde le plus proche plutôt que par appartenance au polygone — PostGIS réglera ce second point.

---

## 8. L'agent comme second ICP

Le même noyau de calcul, exposé deux fois. C'est le pont explicite entre Compass et Tacet.

- Un serveur MCP au-dessus du moteur : `score_location`, `compare_locations`, `explain_score`, `list_sources`.
- Chaque réponse embarque sa chaîne de raisonnement — l'entrée, la source, la date, le calcul, la marge — pour qu'un agent puisse l'expliquer sans la reconstituer.
- Un `llms.txt` à la racine du site.
- La contrainte de conception qui en découle : **aucun chiffre ne peut exister uniquement dans l'UI.** Si un score n'est calculable que dans un composant React, il n'est pas exposable à un agent.

**Pourquoi ça compte pour le portfolio.** Compass devient la démonstration visible d'une architecture que Tacet, Aetherix et Anima portent sans interface. Le produit fini n'est pas seulement la carte : c'est la preuve que le même moteur sert un humain et un agent. C'est l'argument que les autres projets ne peuvent pas montrer.

---

## 9. La position vis-à-vis des projets voisins

Trois builders, sur les mêmes registres publics français, à quelques semaines d'écart.

- **iFeyz2** agrège 96 sources à l'échelle nationale, structurées pour les LLM. Il vend la **couverture**.
- **Towncenter** utilise trois sources (SIRENE, IGN, OSM) et refuse quatre familles de fonctionnalités. Il vend la **découpe**.
- **Arpentiq** croise DPE, DVF et cadastre pour scorer de 0 à 100 la probabilité qu'un logement se vende, côté agent immobilier plutôt que preneur. Il vend la **prédiction**.

SIRENE + IGN + OSM est devenu une recette triviale à assembler. Le nombre de sources n'est plus un signal — ni en avoir plus, ni en avoir moins.

**Compass ne vend ni la couverture, ni la découpe, ni la prédiction : il vend l'interprétation.** Un chiffre brut ne dit rien à un preneur. « 12 % de vacance sur ce tronçon, contre 4 % il y a six ans » dit quelque chose. La valeur n'est pas dans le nombre de sources connectées, elle est dans la distance entre la donnée brute et une phrase sur laquelle on peut décider.

C'est la thèse à défendre dans le case study, et elle s'énonce en une ligne : **l'agrégation n'est pas le produit, l'interprétation l'est.**

**Une confirmation externe, datée du 23 août 2026.** Sur le fil Reddit où Arpentiq se présentait, un commentateur a résumé l'outil ainsi : *« Ce n'est pas un signal pour savoir quels biens vont passer en vente, c'est plus pour savoir sur lesquels concentrer son énergie. La base d'un CRM quoi. »* C'est exactement la confusion que le refus du score unique (§4) anticipe : un chiffre agrégé se lit comme une priorité de portefeuille plutôt que comme un fait vérifiable, parce qu'il ne porte pas sa propre décomposition. Le fondateur a dû corriger en argumentant après coup. Compass évite la correction en évitant le score.

### Ce qui protège l'interprétation — et ce qui ne la protège pas

Question posée le 17 août 2026 : l'entraînement d'un ou plusieurs agents est-il le moat de Compass, avec l'apprentissage continu de l'usage ? La réponse est non, et se tromper là-dessus coûterait cher, parce que ça reviendrait à investir dans la seule couche que personne ne peut défendre.

**Il n'y a pas d'entraînement dans Compass, et il ne devrait pas y en avoir.** Pas de *fine-tuning*, pas de corpus propriétaire de résultats étiquetés. « Un agent mieux prompté » n'est défendable par personne : iFeyz2 agrège déjà 96 sources structurées pour les LLM, et n'importe qui peut brancher un modèle sur les mêmes données ouvertes. Le modèle est la couche commodité. L'interprétation que vend Compass ne vit pas dans le prompt.

Trois choses composent réellement, et toutes les trois sont déjà dans le dépôt :

- **Le substrat de jointure.** L'identifiant BDCom stable entre millésimes (74 réattributions sur 85 344, *mesurées* au chargement) ; le périmètre commun qui transforme un effondrement apparent de 27 % en −3 % réels ; la licence portée **comme donnée** par millésime ; l'écart entre une adresse BODACC et un local BDCom quand 69 % des locaux partagent leur numéro. Rien de tout ça ne sort d'un prompt : c'est une année de pièges vérifiés, et refaire Compass suppose de refaire les mêmes erreurs.
- **La porte d'évaluation.** Quinze invariants, vingt-quatre baselines, huit cas dorés, l'historique de composition. C'est le seul actif qui s'accumule vraiment, et c'est le bon type d'accumulation : il ne rend pas les réponses plus fines, il rend une régression impossible à livrer en silence. **Corpus de non-régression, pas jeu d'entraînement** — la confusion entre les deux est précisément ce qui ferait dériver le produit.
- **Les refus.** Ils sont défendables parce qu'ils coûtent cher à tenir. Aino promet le *foot traffic* ; Compass explique pourquoi personne ne peut le donner honnêtement (§9, et `PLAN.md`, « Concurrence — Aino »).

**Sur l'apprentissage de l'usage, une seule forme est admissible.** Un fait appris de l'usage n'a pas de source publique : il ne peut donc pas s'afficher, règle `Measured<T>`. L'usage peut légitimement décider **ce qu'on branche ensuite** et **ce qu'on met à l'écran** ; il ne doit jamais devenir un chiffre. C'est un signal de priorisation, pas une source de données — et si les demandes viennent d'un tiers professionnel, ses briefs sont son actif commercial, pas le nôtre.

La version tenable de « un agent toujours plus fin » est celle déjà décidée en `PLAN.md` §6.8 : **c'est la traçabilité qui devient autonome, pas la certitude.**

---

## 10. Le contexte de marché

À vérifier avant publication du case study, les chiffres bougent.

- **71 100 défaillances d'entreprises** sur douze mois glissants, niveau inédit depuis 2009. Le commerce de proximité est en première ligne.
- **29 766 cessions de fonds de commerce** en 2025, soit −6,1 %, sous les 30 000 pour la première fois depuis 2022. Prix moyen en recul de 6,4 %.
- **Une entreprise sur deux ne trouve pas de repreneur** — au point que l'État a présenté un plan « Objectif Reprises » le 23 avril 2026.
- Vacance commerciale nationale en centre-ville : 10,8 % en 2024, 11,7 % en 2025. Paris : 10,5 % en moyenne, 8,6 % sur les artères, 17 % dans le 1er.

Trois conséquences. Le flux BODACC de procédures collectives, que §5 bis B présente comme un contournement, est alimenté à un niveau historique — la source de repli est celle que la conjoncture rend la plus riche. La thèse « l'interprétation est le produit » est contracyclique : quand tout se vend, personne n'a besoin de juger un emplacement ; quand la moitié ne se vend pas, l'écart entre un bon et un mauvais emplacement sépare un commerce des 71 100 autres. Et il faut assumer que le côté rare est l'acheteur, alors que la douleur la plus forte est du côté du vendeur — servir ce dernier reviendrait à défaire le refus du §1.

---

## Sources vérifiées

| Donnée | Producteur | Accès | Réserve |
|---|---|---|---|
| BDCom — recensement des commerces parisiens | APUR | **Licence par millésime** : ODbL 1.0 pour 2023 ; licence personnalisée non lue pour 2017 et 2020. KML/CSV/GeoJSON/SHP + API | Triennal, terrain ; rez-de-chaussée avec vitrine et accès sur rue uniquement. **Ne jamais annoncer « ODbL » en bloc** — la base porte un drapeau `publicly_redistributable` par millésime, et un appelant anonyme se voit retenir 2017 et 2020, contenu *et* existence. Voir `BDCOM.md` §7 |
| PLU bioclimatique — protections du commerce et de l'artisanat (`plub_protcom`) | Ville de Paris / Direction de l'Urbanisme | opendata.paris.fr, version votée le 20 novembre 2024 | **Fourni pour information, sans valeur réglementaire** — renvoyer au Portail des Règles d'Urbanisme |
| Validations réseau ferré | Île-de-France Mobilités | Ouvert, historique depuis 2015 | Mise à jour trimestrielle à semestrielle |
| DVF | DGFiP | Ouvert, 5 ans glissants, avril et octobre | Hors fonds de commerce et cessions de parts |
| Comptes annuels RNE | INPI | API | ~45 % des dépôts sous déclaration de confidentialité |
| Comptages piétons | Ville de Paris | Ouvert | Campagnes ponctuelles (mardi ou jeudi et samedi, sept.–oct.), pas de capteurs permanents |
| Comptage multimodal permanent | Ville de Paris | Ouvert, horaire, capteurs thermiques | Vélo, trottinette, 2RM, VL, PL, bus — **les piétons ne sont pas comptés** |
| **Mobiliscope** — population présente heure par heure | CNRS / Université Paris Cité | **ODbL, CSV + GeoJSON, téléchargement libre**, 49 aires urbaines françaises | Jour de semaine moyen ; enquêtes de mobilité 2009–2019 ; maille secteur |
| **BODACC** — ventes et cessions de fonds de commerce, procédures collectives | DILA | **API ouverte et gratuite**, CSV/JSON/Excel | Publicité légale : prix des fonds publiés ; pas de loyers |
| **Vélib' Métropole** — disponibilité temps réel | Vélib' Métropole | **GBFS, sans clé**, ~1 400 stations, rafraîchi chaque minute | Proxy de rythme, pas de comptage de personnes |
| Sitadel — autorisations d'urbanisme | SDES | Ouvert, mensuel, depuis 2013 | Inclut les locaux non résidentiels ; maille communale sur les séries agrégées |
| Observatoire des quartiers de gare GPE | APUR | Ouvert | Périmètres 800 m autour de 69 gares ; effet marginal dans Paris intra-muros |
| Encadrement des loyers | Ville de Paris / OLAP | Ouvert, 7 millésimes (2019–2025), 80 quartiers × 32 cases | **Habitation uniquement — exclut les locaux commerciaux** |
| LOVAC — locaux vacants | Cerema | Agrégé en open data ; **détail réservé** aux collectivités et services de l'État | **Logements uniquement**, pas les locaux commerciaux |
| Loyers commerciaux par rue | — | **Inexistant en open data** | Produit payant chez des acteurs privés |
| Flux piétons continus | — | **Inexistant en open data** | Téléphonie et trajectoires : propriétaire, coûteux, RGPD |
