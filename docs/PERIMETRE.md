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

**Une observation de terrain qui teste ce bloc, lue le 27 août 2026 — et ce qu'elle vaut.** Le gérant de Kafé, rue Martel (10e), décrit publiquement trois clientèles qui se succèdent sans se mélanger dans le même local : les parents à 8h30 (il y a une école dans la rue, visite de sept à dix minutes), les travailleurs du quartier à midi — la majorité de son chiffre d'affaires —, les indépendants en visio à 15 h. Sa conclusion : un lieu se définit surtout par **les heures auxquelles il est utile à quelqu'un**, et non par son concept. C'est n=1, auto-déclaré, sans comptage, par quelqu'un qui a intérêt à ce que son lieu ait une histoire : sous la règle de `provenance.ts`, ce serait `estimated` au mieux, et ça ne s'afficherait pas. La note est ici pour ce que l'observation *propose*, pas pour ce qu'elle établit.

**L'hypothèse falsifiable qu'elle génère.** *La composition de la clientèle d'un local varie davantage au fil d'une journée qu'entre deux rues d'un même quartier.* Si elle tient, l'axe temporel discrimine plus que la moitié de l'axe spatial déjà branché. Elle se teste sur Mobiliscope à l'ingestion — variance horaire de la composition par CSP à l'intérieur d'un secteur, contre variance entre secteurs voisins — avant d'en tirer quoi que ce soit dans l'interface. C'est un contrôle à écrire dans `w2-mobiliscope`, pas une conclusion à recopier ici.

**Deux de ses trois clientèles sont déjà atteignables ; la troisième pose un problème de millésime.** Le pic de 8h30 est produit par un objet que Compass lit déjà : `amenity=school` figure dans la requête Overpass (`src/services/opendata/overpass.ts`), mais il est consommé comme une commodité — poids `0.15` dans la marchabilité, saturation à huit établissements, rayon de 800 m (`src/core/scoring.ts`). Autrement dit le modèle traite l'école comme une quantité à accumuler, jamais comme un objet unique qui produit une heure, et à une distance sans rapport avec le trajet d'un parent qui dépose son enfant. Le pic de midi relève de `w2-idfm` : validations comptées par station, avec profil horaire. Le pic de 15 h, lui, est un phénomène postérieur à 2020 — si les enquêtes de mobilité qui alimentent Mobiliscope s'arrêtent bien en 2019, la source est structurellement aveugle à celle des trois observations qui est la plus récente. **Ce millésime est repris du paragraphe « 1. Mobiliscope » ci-dessus, qui est de la prose et ne mesure rien : à vérifier sur le fichier du CNRS à l'ingestion, jamais à recopier d'ici.** Le risque, sinon, est de faire dire à Compass « quartier calme l'après-midi » sur une rue où c'est l'inverse.

**Ce que ça change pour la maille — et la sortie.** Mobiliscope est au secteur : branché tel quel sur la fiche, il donne la même courbe horaire à tous les locaux du secteur et échoue à la seconde contrainte fondatrice (§2). La sortie n'est pas de chercher une source plus fine — il n'y en a pas — mais de changer ce qu'on lui demande : **la courbe horaire ne conclut pas sur le local, elle vise la visite.** Un preneur ne peut pas compter les piétons, mais il peut se poster sur le trottoir ; ce qu'il ignore, c'est *quand*, et il y va un mardi à 11 h, l'heure creuse. Une courbe de secteur, même datée, même grossière, suffit à dire « allez-y à 8h30 et à 15 h, pas à 11 h ». Elle ne prétend rien sur la vitrine, donc elle ne viole pas la contrainte de maille, et elle rend le protocole de comptage manuel du paragraphe précédent opérationnel au lieu de générique. C'est aussi la lecture la plus fidèle de l'observation : son auteur n'a rien appris en analysant, il a appris en tenant un comptoir. Compass ne remplace pas ça — il dit où et quand se poster. À noter enfin que le critère d'acceptation de `w2-mobiliscope` (« la fiche oppose midi et soir sur le même local ») était déjà écrit dans ces termes avant cette lecture : c'est une validation extérieure du ticket, pas une raison d'en ouvrir un autre.

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

Rien à brancher pour ça : `compass_address_timeline` et `compass_street_rotation` existent déjà côté base et n'ont ni consommateur front (`PLAN.md` §2.7, « le plus structurant du projet ») ni appelant du tout pour la seconde (`PLAN.md` §6.3). Le cas Mistral est un bon cas de test pour cette fiche locale à construire, pas une raison d'en construire une autre. Deux règles déjà posées s'y appliquent sans changement : jamais en valeur brute, toujours rapportée au taux de rotation du tronçon (§2.5) ; et jamais de phrase causale (« parce que Mistral s'est installé ») — seule la chronologie datée s'affiche, l'inférence reste au lecteur.

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

### Pourquoi passer par Compass plutôt que par la source

Objection posée le 31 août 2026 : un agent atteint les mêmes données ouvertes directement, souvent
par MCP. C'est la seule objection qui peut tuer ce canal, et une partie en est juste. Pour une
question à une source — « combien de validations à cette station un mardi » — l'agent n'a pas
besoin de Compass. Si le produit vendait l'accès, MCP le rendrait inutile : c'est exactement ce que
le §9 acte en refusant de vendre l'agrégation.

Ce que l'agent n'obtient pas en allant à la source :

- **Les sources ne sont pas interrogeables à la granularité d'une question.** La BDCom n'est pas
  une API : trois millésimes de fichiers, 85 418 locaux, en KML/CSV/GeoJSON/Shapefile ; DVF est
  publié par lots semestriels. Aller à la source, pour un agent, c'est parser des dizaines de Mo
  en contexte pour répondre sur un tronçon de rue. Problème de forme, pas d'accès.
- **La jointure est le produit, et les pièges ne sont portés par aucune source.** Le périmètre
  commun qui transforme un effondrement apparent de 27 % en −3 % réels ; 74 réattributions
  d'identifiant sur 85 344 ; 69 % des locaux partageant leur numéro, ce qui fait d'un
  rapprochement BODACC ↔ BDCom une décision et non une jointure ; la licence qui change de
  millésime en millésime. **Un agent branché en direct sortira le −27 % avec la bonne citation et
  une confiance totale.** Il ne mentira pas, il aura tort — et personne en aval ne pourra le voir.
- **L'absence typée.** Compass distingue « pas de donnée », « donnée retirée par licence »
  (`withheld`) et « hors périmètre du corpus ». La source brute rend trois zéros identiques.
- **La porte d'évaluation, qui ne se re-dérive pas à la volée.** Ce qu'un consommateur paie n'est
  pas la donnée mais la garantie qu'une régression ne peut pas être livrée en silence. Le chemin
  direct n'a aucun corpus de non-régression : la source bouge, la réponse change, rien ne le dit.
- **La licence comme service.** Un agent qui tape la source hérite des obligations ODbL sans le
  savoir. Compass répond à une granularité déjà arbitrée, sous le rôle `anon` et son plafond de
  rayon. C'est un transfert de responsabilité, et c'est facturable.
- **L'arithmétique bête.** Un appel Compass rend une réponse datée, sourcée et calculée en un
  aller-retour, contre plusieurs téléchargements et une chaîne de raisonnement à reconstituer.

En une ligne : **la source dit ce qu'il y a dans le registre ; Compass dit ce que ça veut dire à
cette adresse — et, seul, ce qui ne peut pas être su ici et pourquoi.**

**Le garde-fou qui en découle, et qui est le vrai enseignement de l'objection : pour quels appels
Compass est-il réductible à un passe-plat ?** Pour ceux-là il ne doit pas être payant, et
`list_sources` doit renvoyer vers la source. La valeur tarifée doit se concentrer sur les appels
qui portent la jointure — rotation rue par rue sur trois millésimes, périmètre commun, cessations
vers disponibilité à venir. Un tarif à l'appel (§10) qui traite les deux familles à l'identique se
fera repérer par le premier client sérieux.

Rien de tout ça n'est un moat d'accès : un concurrent peut le refaire. Ce qu'il doit refaire, ce
sont les mêmes erreurs pendant un an (§9).

---

## 9. La position vis-à-vis des projets voisins

Trois builders, sur les mêmes registres publics français, à quelques semaines d'écart.

- **iFeyz2** agrège 96 sources à l'échelle nationale, structurées pour les LLM. Il vend la **couverture**.
- **Towncenter** utilise trois sources (SIRENE, IGN, OSM) et refuse quatre familles de fonctionnalités. Il vend la **découpe**.
- **Arpentiq** croise DPE, DVF et cadastre pour scorer de 0 à 100 la probabilité qu'un logement se vende, côté agent immobilier plutôt que preneur. Il vend la **prédiction**.
- **Gini (MyTraffic)**, ajouté le 2 septembre 2026, hors catégorie : pas un builder sur registres publics mais un agent conversationnel sur base propriétaire — panel GPS mobile, 700+ clients, offre d'entrée à 249 €/mois visant explicitement les franchisés et petits opérateurs. Il vend l'**interprétation**, lui aussi. Analyse complète dans `PLAN.md`, « Concurrence — Gini (MyTraffic) ».

SIRENE + IGN + OSM est devenu une recette triviale à assembler. Le nombre de sources n'est plus un signal — ni en avoir plus, ni en avoir moins.

**Compass ne vend ni la couverture, ni la découpe, ni la prédiction : il vend l'interprétation.** Un chiffre brut ne dit rien à un preneur. « 12 % de vacance sur ce tronçon, contre 4 % il y a six ans » dit quelque chose. La valeur n'est pas dans le nombre de sources connectées, elle est dans la distance entre la donnée brute et une phrase sur laquelle on peut décider.

C'est la thèse à défendre dans le case study, et elle s'énonce en une ligne : **l'agrégation n'est pas le produit, l'interprétation l'est.**

**Resserré le 2 septembre 2026, après l'analyse de Gini.** « Vendre l'interprétation » ne suffit plus à nous distinguer : Gini la vend aussi, avec une base de données que personne ici ne peut s'offrir. La ligne qui reste est plus étroite, et meilleure parce qu'elle est structurelle plutôt que comparative — Gini vend l'**interprétation propriétaire**, auditée par lui ; Compass vend l'**interprétation vérifiable**, re-dérivable par le lecteur. Un concurrent peut acheter de la donnée GPS ; il ne peut pas rendre re-dérivable une donnée fermée. Formulation courte à réutiliser partout : *« audited » dit qui a vérifié, « re-derivable » dit qui peut vérifier.*

**Une confirmation externe, datée du 23 août 2026.** Sur le fil Reddit où Arpentiq se présentait, un commentateur a résumé l'outil ainsi : *« Ce n'est pas un signal pour savoir quels biens vont passer en vente, c'est plus pour savoir sur lesquels concentrer son énergie. La base d'un CRM quoi. »* C'est exactement la confusion que le refus du score unique (§4) anticipe : un chiffre agrégé se lit comme une priorité de portefeuille plutôt que comme un fait vérifiable, parce qu'il ne porte pas sa propre décomposition. Le fondateur a dû corriger en argumentant après coup. Compass évite la correction en évitant le score.

### Ce qui protège l'interprétation — et ce qui ne la protège pas

Question posée le 17 août 2026 : l'entraînement d'un ou plusieurs agents est-il le moat de Compass, avec l'apprentissage continu de l'usage ? La réponse est non, et se tromper là-dessus coûterait cher, parce que ça reviendrait à investir dans la seule couche que personne ne peut défendre.

**Il n'y a pas d'entraînement dans Compass, et il ne devrait pas y en avoir.** Pas de *fine-tuning*, pas de corpus propriétaire de résultats étiquetés. « Un agent mieux prompté » n'est défendable par personne : iFeyz2 agrège déjà 96 sources structurées pour les LLM, et n'importe qui peut brancher un modèle sur les mêmes données ouvertes. Le modèle est la couche commodité. L'interprétation que vend Compass ne vit pas dans le prompt.

Trois choses composent réellement, et toutes les trois sont déjà dans le dépôt :

- **Le substrat de jointure.** L'identifiant BDCom stable entre millésimes (74 réattributions sur 85 344, *mesurées* au chargement) ; le périmètre commun qui transforme un effondrement apparent de 27 % en −3 % réels ; la licence portée **comme donnée** par millésime ; l'écart entre une adresse BODACC et un local BDCom quand 69 % des locaux partagent leur numéro. Rien de tout ça ne sort d'un prompt : c'est une année de pièges vérifiés, et refaire Compass suppose de refaire les mêmes erreurs.
- **La porte d'évaluation.** **Trente-sept** invariants, vingt-quatre baselines, huit cas dorés, l'historique de composition — *comptés le 31 août 2026 par `grep -c '^-- @invariant ' eval/invariants.sql` et `Object.keys(counts)` ; ce paragraphe annonçait quinze, un chiffre recopié qui était devenu faux en silence.* C'est le seul actif qui s'accumule vraiment, et c'est le bon type d'accumulation : il ne rend pas les réponses plus fines, il rend une régression impossible à livrer en silence. **Corpus de non-régression, pas jeu d'entraînement** — la confusion entre les deux est précisément ce qui ferait dériver le produit.
- **Les refus.** Ils sont défendables parce qu'ils coûtent cher à tenir. Aino et Gini promettent le *foot traffic* ; Compass explique pourquoi personne ne peut le donner **de façon vérifiable** (§9, et `PLAN.md`, « Concurrence — Aino » et « Concurrence — Gini (MyTraffic) »). *Corrigé le 2 septembre 2026 : ce paragraphe disait « honnêtement », ce qui ne tient pas contre un acteur qui publie son panel, son redressement et ses biais reconnus. La ligne de partage est la vérifiabilité, pas l'honnêteté.*

**Sur l'apprentissage de l'usage, une seule forme est admissible.** Un fait appris de l'usage n'a pas de source publique : il ne peut donc pas s'afficher, règle `Measured<T>`. L'usage peut légitimement décider **ce qu'on branche ensuite** et **ce qu'on met à l'écran** ; il ne doit jamais devenir un chiffre. C'est un signal de priorisation, pas une source de données — et si les demandes viennent d'un tiers professionnel, ses briefs sont son actif commercial, pas le nôtre.

La version tenable de « un agent toujours plus fin » est celle déjà décidée en `PLAN.md` §6.8 : **c'est la traçabilité qui devient autonome, pas la certitude.**

### Ce qui s'améliore avec l'usage, et à quelles conditions

Question posée le 31 août 2026 : Compass peut-il répondre plus vite, plus précisément et à moindre
coût à mesure que l'usage augmente ? Les trois verbes n'ont pas la même réponse, et les séparer est
tout l'intérêt de la question.

**Plus vite et moins cher : oui, mécaniquement, et sans toucher à la doctrine.** Une réponse Compass
est une fonction déterministe du corpus, pas d'un modèle : la même question sur le même millésime
rend le même résultat. Tout est donc cachable, précalculable, matérialisable — la réponse ne change
pas, seul son coût de production change. Le levier économique suit : l'ingestion est un coût fixe,
l'appel marginal est une requête.

**Le dispositif n'est pas seulement un frein, c'est déjà un cliquet, et il a déjà bougé.** Le bras E
« échoue au-dessus de +10 %, jamais en dessous — un plan devenu moins cher n'est pas une régression »
(`baselines/anon-budget.json`) : le plafond a le droit de descendre. Mesuré le 28 août 2026, après
les migrations `20260828000001/2/3` (#62, #64) :

| Fonction | Pages avant | Pages après | |
| --- | ---: | ---: | ---: |
| `compass_street_rotation` | 286 744 | **87 879** | −69 % |
| `compass_bodacc_within` | 361 965 | **148 346** | −59 % |
| `compass_premises_within` | 195 422 | **94 117** | −52 % |
| `compass_scoring_context_within` | 137 576 | **86 102** | −37 % |

Le champ `plan_cache` du même fichier enregistre en plus un apprentissage de **méthode** et non de
donnée — mesurer le corps d'une fonction comme une requête SQL nue la sous-estime d'un facteur deux,
parce qu'une requête nue est planifiée en *custom* quand la production prend le plan *générique*.
C'est ce genre de ligne qui empêche la mesure suivante d'être fausse. Et la métrique de qualité
produit a son historique propre, `eval/confidence_history.jsonl`, une ligne par mesure.

**Ce que l'usage n'apporte pas encore, et qui est l'ouverture réelle.** Rien dans cette boucle
n'apprend seul, et rien n'est pondéré par l'usage : le point mesuré est fixe — Châtelet, rayon
maximal, le pire cas. C'est le bon plafond et c'est un angle mort, puisqu'il ne dit pas quelle
fonction mérite l'optimisation suivante. Un second profil de budget pondéré par l'usage réel
**s'ajouterait** au pire cas sans le remplacer ; le remplacer laisserait dériver la fonction rare et
chère. Chantier, pas doctrine : il appartient à `PLAN.md`.

**Plus précisément : non, pas par l'usage** — c'est la décision du 17 août, ci-dessus. La précision
n'augmente que par deux chemins, dont aucun n'est un entraînement : brancher une source de plus, ou
améliorer la jointure. L'usage a le droit de décider **laquelle en premier**, jamais de produire le
chiffre. Le piège tentant est sur la jointure : se servir des corrections d'usage comme données
d'apprentissage du rapprochement BODACC ↔ BDCom serait précisément le corpus propriétaire étiqueté
qui est refusé. La ligne tient en une phrase :

> **L'usage peut révéler qu'une règle publiée est fausse. Il ne peut jamais devenir un poids non
> publié.**

Corriger la règle est un changement de code, re-dérivable, publié sur `Methodology.tsx`. La forme
admissible de l'accumulation est celle qui existe déjà : une correction devient un **cas doré ou un
invariant**. Le produit ne devient donc pas plus fin avec l'usage — il devient de plus en plus
incapable de régresser. **Apprentissage par cliquet, pas par gradient.**

### Ce qui s'oublie, et sous quelle autorité

La contrepartie du cliquet est la péremption, et elle a déjà un protocole : `note_regel` de
`baselines/ingestion.json` pose trois conditions au regel — chaque écart attribué à une cause
**nommée avant** le gel, aucun n'atteignant le seuil bloquant, et le gel remplacé qui reste lisible
dans `previous_freezes` — plus une règle anti-dérive : toute valeur est *remesurée* à la reprise,
jamais reportée depuis un pourcentage. Ce n'est pas un oubli, c'est une **péremption avec reçu**.

Il se généralise à condition de distinguer **deux durées de vie**, dont la confusion donne l'une des
deux pannes — servir un chiffre périmé, ou ne plus savoir qu'il a bougé :

- **Les valeurs dérivées** — cache, vues matérialisées — s'oublient sans cérémonie parce qu'elles
  sont recalculables. La clé de cache porte le millésime ; un nouveau millésime est une nouvelle
  clé, pas une invalidation à décider.
- **Les références gelées** — baselines, cas dorés — ne s'oublient qu'avec cérémonie parce qu'elles
  *sont* la mémoire du produit.

Les cas dorés ne sont pas immortels non plus, et c'est déjà arbitré au bras B : un déplacement vers
la gauche vient d'un changement délibéré, « dont les cas dorés doivent être mis à jour dans la même
PR ». Précédent réel : le chargement de SIRENE a fait échouer `gold-siege-001`, qui attendait
`probable` là où la fonction rendait désormais `corrobore`.

**Sur l'autorité, il manque quelque chose.** Le procédé est écrit — modifier un seuil est une
décision explicite, PR plus trace dans `PLAN.md` — et le critère d'admission aussi : un cas doit
venir d'une faute réelle ou d'une réserve documentée, avec un `why` qui dit ce qu'il **verrouille**.
**Mais rien n'est écrit sur le retrait.** Le dispositif ne sait qu'entrer et mettre à jour : c'est un
cliquet asymétrique, où le corpus ne peut que grossir. À trente-sept invariants et près de trois
minutes contre le distant, c'est sain ; à deux cents, la porte devient ce qu'on contourne — et le
mode de panne est qu'on supprime un cas pour faire passer un build, exactement ce que `note_regel`
interdit pour les baselines et que rien n'interdit ailleurs. Le correctif a la forme de
`previous_freezes` : un cas retiré laisse une ligne disant pourquoi et ce qui le remplace.
**L'autorité ne doit pas être une personne mais une règle qui laisse une trace** — une personne ne
passe pas à l'échelle et ne survit pas à une session.

La question devient opérationnelle dès que l'usage monte, puisque les corrections arrivent alors en
volume. Le filtre découle de la doctrine :

> Une correction devient un cas **si et seulement si elle nomme une règle publiée qui est fausse.**
> Sinon, c'est un signal de priorisation, pas un cas.

« Ce chiffre me semble faux » n'est pas re-dérivable et oriente le backlog. « La règle de
rapprochement se trompe quand deux vitrines partagent un numéro » nomme une règle publiée : celle-là
devient un cas doré.

**La valeur qui s'accumule vraiment, elle, n'est pas dans les réponses.** C'est la carte des
**questions posées auxquelles Compass ne sait pas répondre** : elle ordonne le backlog des sources,
elle alimente les horizons du §5, et elle est admissible parce qu'elle ne devient jamais un chiffre
affiché. Deux effets dérivés : la baisse du coût par appel rend viable le palier « à l'appel » du §10,
qui ne l'est pas si chaque appel balaie 85 418 locaux ; et savoir quelles **absences** sont le plus
demandées dit lesquelles méritent une explication plutôt qu'un `null`.

**Un refus à poser avant qu'il ne se pose tout seul :** revendre l'usage agrégé — « quels quartiers
sont les plus recherchés » — est écarté. Ce n'est pas une source publique, donc ce n'est pas
affichable ; et si les requêtes viennent d'un tiers professionnel, ses recherches sont son actif
commercial, pas le nôtre. La règle déjà écrite ci-dessus pour ses briefs vaut pour sa télémétrie.

---

## 10. Monétisation — pistes et hypothèses

Réflexion ouverte le 31 août 2026, en session avec Ivan. Rien ici n'est décidé au sens des refus
ci-dessus : ce sont des pistes à valider, pas une doctrine. Le positionnement ne change pas —
l'interprétation, pas l'agrégation (§9) — ce qui change, c'est qui paie pour y accéder.

**Trois segments.**

- **Entrepreneur / réseau de franchise.** Le preneur isolé décide « une à trois fois dans sa vie
  professionnelle » (§1) — pas de récurrence, pas d'abonnement. Le payeur répété est le réseau de
  franchise qui scoute plusieurs adresses par an. Produit payant : le dossier d'une adresse
  (`PLAN.md` §2.6), à l'unité ou en abonnement réseau. **Un seul format, quel que soit le
  destinataire** — banquier, comptable, franchiseur : le dossier n'est pas le prévisionnel refusé
  en §4, c'est une pièce jointe sourcée. L'adapter par établissement financier réintroduirait par
  la bande ce que §4 refuse déjà.
- **Collectivité.** SEMAEST, mairie d'arrondissement, CCI Paris IDF — vente B2G d'un tableau de
  bord ou d'une licence de données sur la rotation commerciale par tronçon et la vacance BDCom.
  `compass_street_rotation` existe déjà en base sans appelant (`PLAN.md` §6.3, §5 bis C) : le
  manque est un client, pas une fonctionnalité.
- **Agents via MCP.** Voir ci-dessous — le seul des trois qui touche à une porte déjà construite.

**La résolution du refus courtier (§1) passe par le volume, pas par les outils.**

Le serveur MCP (§8, `PLAN.md` §4.1) est en production depuis le 15 août 2026 : six outils, tous
sur le rôle `anon`, **gratuits et sans limite aujourd'hui** — fait vérifié dans `mcp-server/`,
pas une hypothèse. `compare_locations` en fait partie, et **doit le rester en accès libre** :
il compare **deux points**, `a` et `b` — l'outil du preneur qui hésite entre deux adresses, pas
le portefeuille de cinquante que §1 refuse. Le retirer derrière un palier payant serait un
contresens produit, pas une décision de pricing.

Ce qui distingue un courtier d'un preneur n'est donc pas *quel* outil il appelle, c'est
*combien de fois*. Le futur palier payant, s'il se construit, est un palier de **volume** (quota
au-delà d'un seuil gratuit) — les six outils restent identiques des deux côtés.

**Deux portes à ne pas confondre en construisant ça.** `compass_caller_is_privileged()` tranche
une question de **licence** — un appelant peut-il voir les millésimes BDCom 2017/2020 dont la
licence APUR n'a pas été lue (`CONTEXTE.md` §"Un compte n'ouvre aucune donnée"). Un futur palier
payant tranche une question **commerciale** — quota au-delà du gratuit. Les deux portes sont
indépendantes ; la seconde n'accorde jamais ce que la première retient.

**Si un palier payant se construit un jour**, il demande une nouvelle classe d'appelant — une clé
d'API, ni `anon` ni un compte site (`authenticated` n'est pas privilégié, décision du 26 août) —
et une décision écrite de la même façon que celle-là avant d'exister en code.

**Chiffrage — hypothèses non validées, datées du 31 août 2026, à revérifier avant tout
engagement :**

| Segment | Modèle | Fourchette | Marché |
|---|---|---|---|
| Réseau de franchise | Export à l'unité ou abonnement | 30–49 €/fiche ; 99–299 €/mois | Quelques dizaines de comptes atteignables an 1 |
| Collectivité | Licence de données annuelle | 5 000–20 000 €/an selon périmètre | Poignée de cibles (SEMAEST, Mairie de Paris, CCI Paris IDF) |
| MCP volume | Quota gratuit + palier d'**analyses**, jamais d'appels | Stock mensuel d'analyses, paliers 49–199 €/mois | Le plus scalable — pas de démarchage |

Le plus vérifiable en premier : le MCP, parce qu'il tourne déjà. Observer qui dépasse un usage
raisonnable avant de construire quoi que ce soit ne coûte rien ; démarcher une collectivité ou un
réseau de franchise coûte du temps avant même un ticket.

**Deux corrections du 2 septembre 2026, après l'analyse de Gini** (`PLAN.md`, « Concurrence —
Gini (MyTraffic) »). Le tableau ci-dessus les porte déjà.

**L'unité facturée est l'analyse, pas l'appel.** Le chiffrage disait « 0,01–0,05 €/appel ». Gini
facture la *conversation* — une analyse lancée, non reportable d'un mois sur l'autre — et cette
unité-là résout gratuitement le garde-fou du §8. Y est écrit qu'il faut repérer les appels où
Compass est réductible à un passe-plat et ne pas les facturer : à l'appel, le problème est
insoluble, il faudrait classer chaque outil et le premier client sérieux contestera la
classification. À l'analyse, il disparaît — un `list_sources` n'est pas une analyse. Les six
outils restent donc libres au niveau de l'appel, et ce qui se facture est l'unité que le client
reconnaît lui-même comme du travail. C'est aussi la réponse à l'objection du §1 : le preneur qui
décide une à trois fois dans sa vie professionnelle n'achète pas un abonnement, il achète un
stock d'analyses.

**Le prix monte de 15–30 à 30–49 €/fiche.** L'offre d'entrée de Gini est à 249 €/mois pour cinq
conversations, soit ~50 € l'analyse, sur un segment qu'elle nomme « entrepreneurs, analystes solo,
petits opérateurs et franchisés » — c'est-à-dire le persona du §1, à un prix de marché prouvé.
Être trois fois moins cher se lit « produit moindre » plus souvent que « meilleur rapport ».
Reste une hypothèse non validée, au même titre que le reste de ce tableau, et à revérifier avant
tout engagement.

---

## 11. Le contexte de marché

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
