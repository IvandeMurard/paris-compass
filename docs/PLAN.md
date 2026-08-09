# Compass — plan de travail

Backlog ordonné par dépendance, sans échéance. Lovable reste dans la boucle pour l'UI et le
déploiement. Contexte et décisions produit dans `docs/CONTEXTE.md`.

---

## Fait

**Phase 0 — rendre la démo montrable**

- Le loyer commercial fabriqué à partir d'une donnée d'habitation est supprimé, ainsi que le
  filtre de prix qui en dépendait. La donnée subsiste sous son vrai nom, moyennée sur les 32
  cases de la grille préfectorale, avec son millésime affiché.
- La carte distingue quatre états — vue trop large, panne de source, lecture en cours, résultat
  vide — là où un chargement s'affichait « 0 locaux ». Ouverture au zoom 16 sur Montorgueil,
  garde de surface sur la requête Overpass, réponse vide légitime distinguée d'une panne.
- README : promesse reformulée, persona, refus assumés, ce que le produit ne peut pas savoir.
- Dépendances : `react-leaflet` retiré (jamais importé, exigeait React 19 et empêchait
  `npm install`), `tsx`, `@types/leaflet` et `vitest` ajoutés.

**Phase 1 — sortir le calcul du front**

- `src/core/` pur : `geo.ts` (géométrie, `GridIndex`), `provenance.ts` (`Measured<T>`),
  `scoring.ts` (formules). Aucune dépendance à React, au DOM, à Leaflet ou à `fetch`.
- L'index spatial se construit une fois par snapshot au lieu d'une fois par local : le calcul
  quadratique qui figeait l'onglet a disparu.
- 21 tests, dont la cohérence de l'index avec un balayage brut et les deux cas de troncature.

**Reste ouvert** — la provenance est portée par les valeurs mais pas encore affichée dans
l'interface, qui consomme des nombres nus via l'adaptateur
`src/services/opendata/scoring.ts`.

---

## Phase 2 — le socle de données

Décision prise : **Supabase + PostGIS**. Les jeux différenciants sont des fichiers volumineux,
pas des API à interroger depuis le navigateur — 83 000 lignes de BDCom ne se chargent pas côté
client.

**2.1 — Base spatiale.** Activer PostGIS, écrire les migrations, indexer en GiST, exposer des
RPC prenant **un point et un rayon**, pas une bbox. C'est ce changement qui corrige
structurellement le bug des scores dépendants du cadrage (`DIAGNOSTIC.md` §2) : on interroge un
voisinage, plus un rectangle d'affichage. Et c'est aussi ce qui remplace le rattachement d'un
local à son quartier par centroïde le plus proche par un vrai test d'appartenance au polygone.

> **Fait en local le 8 août 2026.** Six migrations dans `supabase/migrations/` : PostGIS isolé
> dans son schéma ; géographie de référence (quartiers en polygones, tronçons de voie) ;
> référentiel BDCom, où **chaque millésime porte sa licence et son périmètre comme donnée**, pas
> comme commentaire ; locaux et relevés, la géométrie stockée une seule fois ; cinq RPC, toutes
> point + rayon.
>
> Deux garanties mécaniques plutôt que documentaires : la comparaison à périmètre commun est le
> **comportement par défaut** — il faut demander explicitement la version trompeuse — et un local
> absent d'un millésime renvoie « je ne sais pas », jamais « il a changé », parce que la donnée ne
> distingue pas une fermeture d'une sortie de périmètre.
>
> **Rien n'est appliqué sur l'instance Lovable.** L'activation de PostGIS là-bas est un « oui plus
> tard » explicite, à demander avant de l'exécuter.
>
> **Clos le 8 août 2026.** 80 quartiers et 25 094 tronçons de voie chargés, et les 85 418 locaux
> rattachés aux deux : 85 403 ont leur quartier par appartenance au polygone — le centroïde le
> plus proche a disparu — et 84 459 leur tronçon par le nom de rue.
>
> Le rattachement à la rue se fait **par le nom d'abord, la géométrie ensuite**. Le plus proche
> tronçon seul se trompe aux angles : un local du 1 rue de Rivoli est souvent plus près de l'axe
> de la rue perpendiculaire que du sien. Le nom décide donc de la rue, la distance ne décide que
> du tronçon.
>
> 925 locaux (1,1 %) n'ont pas de correspondance par le nom et sont rattachés par proximité, dans
> 40 mètres. Ce ne sont pas des erreurs de saisie : **Paris a renommé ces rues depuis le relevé**,
> en rendant leur prénom aux femmes honorées — « rue de Rochechouart » est devenue « rue Marguerite
> de Rochechouart », « rue Rodier » est devenue « rue Claude Rodier ». Les deux méthodes sont
> distinguées par la colonne `street_match`, jamais confondues. 34 locaux n'ont aucun tronçon et
> 15 aucun quartier : ils restent nuls plutôt que rattachés au hasard.

**2.2 — `scripts/` devient un pipeline d'ingestion.** Un script par source, idempotent, avec
journal de millésime : télécharger, normaliser, charger.

> **Fait pour BDCom le 8 août 2026.** `scripts/ingest/` — un lecteur ArcGIS paginé, un accès
> Postgres, et `bdcom.ts` qui charge les trois millésimes. `npx.cmd tsx scripts/ingest/bdcom.ts`,
> environ trois minutes.
>
> Idempotent : le staging est vidé par millésime, la promotion fait un upsert sur des clés que la
> source garantit, et **le chargement entier tient dans une transaction** — un recensement à
> moitié chargé est pire que pas de recensement, puisque rien en aval ne peut distinguer « absent »
> de « pas encore chargé ». Un contrôle de complétude refuse de valider si le nombre de relevés
> promus diffère du nombre de lignes lues.

**2.3 — BDCom (APUR), les trois millésimes.** Recensement de terrain porte-à-porte de tous les
locaux parisiens en rez-de-chaussée avec vitrine et accès sur rue. Chaque local porte sa
localisation fine, son type, son activité sur une nomenclature à 224 postes et une tranche de
surface.

Il n'y a rien à télécharger à la main : l'APUR expose des services ArcGIS paginés. **2017 et 2020**
sont deux couches du même service `OPENDATA/BDCOM_OD` — 84 031 et 83 399 locaux, périmètre
complet, licence personnalisée. **2023** est publié à part, sous un schéma de colonnes entièrement
différent — 60 845 commerces, ODbL, 95 concentrations commerciales. Les coordonnées sont demandées
explicitement en Lambert 93 et converties par PostGIS à la promotion : la projection devient une
propriété du pipeline plutôt que de ce que le service sert ce jour-là.

> **Chargé le 8 août 2026** : 228 275 relevés, 85 418 locaux distincts, 222 codes d'activité.
> Tous les chiffres annoncés plus haut sont vérifiés sur la base et non plus sur échantillon —
> vacance 7 853 (9,3 %) en 2017 et 8 764 (10,5 %) en 2020, zéro en 2023 ; série à périmètre commun
> 62 705 → 61 541 → 60 845. Aucun code d'activité, aucune tranche de surface, aucune situation non
> résolue. 28 codes utilisés en 2017/2020 n'ont pas de niveau 47/18 : ils n'existent dans aucune
> source publiée, et la colonne reste nulle plutôt que devinée.

Deux gains. La nomenclature et les tranches de surface écrasent le tagging OSM sur lequel le
produit repose aujourd'hui. Et surtout, trois millésimes d'un recensement exhaustif dont
l'identifiant de local est stable donnent le **taux de rotation d'un local rapporté à celui de son
tronçon de rue**, et l'historique qui le justifie. Aucun outil grand public n'expose ça. C'est le
différenciateur.

> ⚠️ **Lire `docs/BDCOM.md` avant toute reprise du schéma.** Quatre points, tous vérifiés sur les
> fichiers et sur le service :
>
> - **L'identifiant de local est stable d'un millésime à l'autre** — `ORDRE` en 2017 et 2020,
>   `c_ord` en 2023. Sur 300 locaux de 2023 tirés au hasard, 297 retrouvés en 2020, dont 99,7 % à
>   la même adresse. Retracer l'histoire d'un local est donc une jointure exacte, pas un
>   appariement probabiliste. *(Corrige une version antérieure de cet encadré qui donnait
>   l'identifiant pour absent.)* Mesuré au chargement : **74 identifiants sur 85 344** sont
>   réattribués à un autre local, soit moins de 0,1 %. On apparie sur l'identifiant, on **vérifie
>   sur l'adresse**, et on marque la divergence au lieu de la lisser.
> - Les commerces d'une même adresse partagent une coordonnée — jusqu'à 120 sur un seul point. La
>   coordonnée « bis » est un artefact d'affichage, jamais une position : elle n'est pas chargée.
> - **La vacance 2023 n'est pas calculable.** Le millésime publié ne contient que les 60 845
>   commerces ; les locaux vacants et non commerciaux en sont absents. Elle se mesure sur 2017 et
>   2020 seulement, où elle vaut 7 853 puis 8 764 locaux vides.
> - **Les comptages bruts ne sont pas comparables** — 84 031 → 83 399 → 60 845 se lit comme un
>   effondrement de 27 %. Restreinte au périmètre commun aux trois millésimes, la série vaut
>   62 705 → 61 541 → 60 845, soit environ −3 % en six ans. Les licences diffèrent aussi : ODbL
>   pour 2023, licence personnalisée à lire pour 2017 et 2020.

**2.4 — PLU, protections du commerce et de l'artisanat.** Jeu `plub_protcom` sur
opendata.paris.fr, version votée le 20 novembre 2024. Contrainte binaire et cartographiée : sur
un linéaire protégé, un local en rez-de-chaussée ne peut pas changer de destination. C'est la
première chose qui peut faire capoter un projet. **Fourni pour information, sans valeur
réglementaire** — à afficher comme signal, avec renvoi au Portail des Règles d'Urbanisme.

**2.5 — L'affichage.** Une fois les RPC en place, la fiche et le bandeau d'alerte PLU se font
plus vite côté Lovable.

La formulation de référence est le **taux de rotation du local rapporté à celui de sa rue**, pas
la trajectoire de rotation seule. Un local qui a changé deux fois d'activité en six ans ne dit
rien ; le même local dans un tronçon qui n'a pas bougé dit quelque chose. C'est la seconde
contrainte fondatrice appliquée telle quelle : la comparaison au tronçon, jamais la valeur
absolue. L'historique du local — ses vies antérieures, relevé par relevé — est la pièce
justificative sous le taux, pas l'inverse.

**L'historique reste accessible local par local**, partout où la donnée existe : trois relevés
pour un local vu trois fois, et pour un local vu deux fois les deux relevés **plus une mention
« non observé »** au troisième, avec sa raison. Le taux rapporté à la rue donne son sens à
l'historique, il ne le remplace pas.

> **Règle d'affichage, apprise en s'y trompant.** Un libellé d'activité absent ne doit jamais être
> remplacé par un texte de substitution. Il faut brancher sur la colonne `observed` :
> `observed = false` signifie « ce local n'a pas été recensé cette année-là », ce qui n'est ni
> « vacant » ni « plus un commerce ». Rendre l'un de ces deux textes à la place transforme un
> « je ne sais pas » en affirmation — la faute exacte que le produit existe pour empêcher, et
> qu'un `coalesce` sur le libellé suffit à commettre.
>
> Dans un millésime au périmètre complet (2017, 2020), une absence signifie que le local n'existait
> pas comme rez-de-chaussée avec vitrine : créé plus tard, transformé, ou manqué par l'enquête. La
> donnée ne tranche pas entre les trois, et l'affichage non plus.

### Trois règles de lecture, sans lesquelles le taux ment

**1. La référence est le métier, pas la ville.** Les activités ne tournent pas au même rythme.
Part des locaux exerçant encore la même activité six ans plus tard, mesurée sur les 62 705 locaux
de 2017 : hôtel 78 %, santé-beauté 77 %, alimentaire 77 %, café et restaurant 72 %, culture et
loisirs 63 %, équipement de la maison 60 %, **équipement de la personne 53 %**. Le prêt-à-porter
tourne deux fois plus vite que l'hôtellerie. Donc 50 % de rotation dans une rue de mode est banal,
et alarmant dans une rue d'hôtels. Comparer à la moyenne parisienne toutes activités confondues —
15,5 % entre 2020 et 2023 — est un mauvais étalon.

**2. La fréquence nationale n'a de valeur que rapportée au lieu.** Savoir que 72 % des
cafés-restaurants parisiens tiennent six ans n'apprend rien à quelqu'un qui a déjà décidé d'ouvrir
un restaurant : il ne choisit pas entre un restaurant et une boutique. Ce qui l'informe, c'est
l'écart local. Cafés-restaurants de 2017 encore en activité en 2023 : quartier du Mail **56 %**
(158 locaux), Bonne-Nouvelle 58 %, Paris entier 72 %, quartier des Halles **77 %** (310 locaux).

Le taux par métier n'est donc pas le produit — c'est le **dénominateur** qui rend le chiffre local
lisible. Et il faut une échelle : local → tronçon → quartier → ville, en montant d'un cran tant
que l'effectif est trop faible pour être lu, et **en affichant toujours à quelle maille et sur
quel effectif** le chiffre a été calculé.

**3. Une fréquence observée n'est pas une probabilité de réussite.** « Sur 14 587 cafés-restaurants
recensés en 2017, 72 % exerçaient encore la même activité six ans plus tard » est une observation
sur le passé, avec son effectif nommé. « Votre restaurant a 72 % de chances de tenir six ans » est
un prévisionnel, donc le même refus que le chiffre d'affaires estimé. La règle d'écriture qui tient
la frontière : **jamais un pourcentage nu, toujours l'effectif et la période.**

### Changement d'activité n'est pas changement de propriétaire

BDCom voit qu'un local est passé de boulangerie à coiffeur. Il ne voit **pas** un boulanger qui
vend son fonds à un autre boulanger : le code d'activité ne bouge pas. Les deux événements sont
distincts et leurs fréquences ne sont pas comparables — une durée de détention de fonds, telle
qu'on la cite couramment pour la boulangerie, ne se compare pas à un taux de changement
d'activité. La cession de fonds se mesure avec BODACC (§3.3), avec sa date et son prix.

Quatre réserves à afficher, pas à documenter. Elles bornent ce qu'on peut **affirmer**, pas ce
qui est **disponible** — et à ce jour la liste est complète, pas illustrative :

- **Le pas est de trois ans.** Un local devenu boulangerie → vacant → kebab → coiffeur entre deux
  enquêtes s'affiche « boulangerie → coiffeur ». Un local peut donc paraître stable en ayant
  tourné trois fois. C'est la réserve qui va le plus à l'encontre de l'usage qu'un preneur voudra
  en faire.
- **L'enseigne n'existe qu'en 2023.** Les couches publiées de 2017 et 2020 ne portent aucun champ
  de nom. On peut dire « c'était un fleuriste », jamais « c'était Au Nom de la Rose ».
- **Une disparition en 2023 signifie « ce n'est plus un commerce »**, jamais « c'est vacant ». Le
  local a pu fermer, ou devenir un cabinet dentaire : la couche ne distingue pas les deux, donc la
  base répond « je ne sais pas » plutôt que d'inventer un changement.
- **74 identifiants sur 85 344 sont réattribués** à un autre local d'un millésime à l'autre,
  soit moins de 0,1 % — chiffre mesuré au chargement, pas estimé. L'`ordre` 4231 est au 13 rue
  Vivienne dans le 2ᵉ en 2017 et 2020, et au 88 avenue Kléber dans le 16ᵉ en 2023.

### Le niveau de fiabilité, et pourquoi il est calculé et non écrit

Décidé le 9 août 2026, après deux erreurs commises **dans la prose et non dans la base** en
présentant un même local : une absence de relevé rendue par « pas un commerce » alors que la
donnée disait seulement « non observé », et un prix d'exemple pris sur un autre local qui se
lisait comme celui du local discuté. La base était juste les deux fois. Le récit ne l'était pas.

**Chaque fait affiché porte un niveau, et ce niveau est dérivé de colonnes existantes** — jamais
saisi, jamais estimé. Pas de score sur 100 : un pourcentage de confiance serait exactement le
genre de chiffre fabriqué que le produit refuse. Trois niveaux, dont la règle est publiée sur la
page Méthodologie au même titre que les formules de score.

| Niveau | Ce que ça veut dire | Ce qui le déclenche |
| --- | --- | --- |
| **Établi** | La source nomme directement ce local, et la pièce est jointe | `observed = true` et `match_method` ∈ {`ordre`, `new`} ; pour un prix : `price_source` renseigné **et** `address_source = 'etablissement'` **et** un seul local à l'adresse |
| **Probable** | Le fait est documenté, mais son rattachement à *ce* local est déduit | `address_source = 'siege_social'` ; plusieurs locaux à l'adresse ; `street_match = 'spatial'` ; `match_method = 'ordre_address_conflict'` |
| **Indéterminé** | La source est muette, et on le dit | `observed = false` ; `origin_raw` présent sans prix lu ; niveaux 47/18 absents |

Le niveau accompagne la valeur, il ne la remplace pas : un fait « probable » s'affiche, avec ce
qui manque pour qu'il soit établi. C'est l'inverse de le masquer.

### Le récit se génère, il ne se rédige pas

La leçon de fond des deux erreurs ci-dessus : **le problème n'était pas la donnée, c'était le
passage par une main humaine.** Recharger un champ de plus aurait corrigé un cas ; ce qu'il faut,
c'est qu'aucune affirmation ne puisse circuler sans sa pièce.

Trois procédés, par ordre d'importance :

1. **Une fonction unique produit la chronologie d'une adresse** — relevés BDCom, événements
   BODACC, avec pour chaque ligne sa source, sa date, son niveau de fiabilité et ce qui le
   justifie. Personne ne retape une chronologie à la main, donc personne ne peut rendre un
   « non observé » en « plus un commerce », ni emprunter un chiffre à un autre local. Une
   définition, trois consommateurs : l'interface, le dossier exportable (§2.6) et le serveur MCP
   (§4.1).
2. **Chaque RPC renvoie la pièce à côté du fait**, jamais le fait seul. Déjà vrai pour le prix
   (`origin_raw`), l'origine de l'adresse et la méthode d'appariement ; à tenir pour tout ce qui
   s'ajoutera.
3. **Le pipeline refuse de valider un fait sans sa pièce.** Le contrôle de complétude de BDCom est
   le premier du genre ; il en faut un par invariant — pas de prix sans phrase source, pas de
   relevé sans licence de millésime, pas de rattachement spatial sans distance enregistrée.

### À quoi sert la suite des activités

La valeur d'un enchaînement — prêt-à-porter → restaurant → coiffeur → café — n'est pas le récit.
Elle est **technique**, et elle se lit avant même la visite.

Un local qui a déjà hébergé un restaurant a, selon toute vraisemblance, une extraction, un bac à
graisses et la puissance électrique qui vont avec. Un local qui n'a jamais accueilli que des
boutiques n'a rien de tout ça : créer une extraction coûte des dizaines de milliers d'euros et
suppose l'accord de la copropriété, qui le refuse souvent. Pour quelqu'un qui cherche un local de
restauration, **« un restaurant a-t-il déjà été ici ? » est la question la plus chère à laquelle
cette donnée réponde**, et Compass y répond avant le déplacement.

Deux usages secondaires en négociation. Un local qui a changé plusieurs fois de destination
indique que le bail l'a déjà permis, ce qui pèse dans une demande de déspécialisation. Et une
période de vacance dans la suite est un argument sur le loyer : le bailleur a eu du mal à relouer.

Ce que la suite ne dit **pas** : pourquoi chacun est parti. Vente réussie, dépôt de bilan,
départ en retraite, immeuble repris — tout cela s'affiche à l'identique. Une suite d'activités
n'est pas un verdict, et la fiche ne doit pas la présenter comme tel.

Une réserve technique à afficher avec : Compass peut dire « un restaurant était ici en 2020 », pas
« l'extraction y est encore ». C'est une indication qui change ce qu'on va vérifier sur place, pas
une garantie.
  Sans garde-fou, l'historique recollerait deux commerces différents. L'appariement vérifie donc
  l'adresse en plus de l'identifiant et marque la divergence au lieu de la lisser : un historique
  ainsi marqué est une preuve plus faible, et l'interface doit pouvoir le dire.

**2.6 — Le dossier d'une adresse.** Un fichier téléchargeable pour **une** adresse : une ligne par
indicateur, et à côté sa source, sa licence, son millésime, sa méthode et sa réserve. Un fichier
où la moitié de la largeur sert à dire d'où vient l'autre moitié.

Ce n'est pas l'export refusé dans `docs/CONTEXTE.md`. Ce qui est refusé, c'est le **portefeuille** :
sortir cinquante adresses pour les trier, le geste du courtier. Le dossier d'une adresse est
l'inverse — la promesse de traçabilité rendue transportable. Et il répond à un fait concret : un
bail 3/6/9 ne se décide pas seul, il passe par un banquier, un comptable, un réseau de franchise.

La ligne se tient dans la structure, pas dans la discipline : **l'export part d'une fiche, jamais
de la liste de résultats.** Pas de bouton « exporter tout ». Un utilisateur qui empile lui-même
ses deux ou trois candidats fait son travail ; Compass ne le fait pas à sa place.

Prérequis : la remontée de la provenance dans l'interface, le point resté ouvert de la phase 1.
Tant que l'interface consomme des nombres nus, il n'y a rien à exporter d'intéressant. Partage :
le contenu — la fonction qui transforme une adresse évaluée en lignes portant leur provenance —
est du noyau ; le bouton, sa place et la génération du fichier sont de Lovable. Une définition,
deux sorties : **c'est le même contenu que renverra le serveur MCP** (4.1) à un agent.

Google Sheets en direct demanderait une connexion de compte pour peu de gain : un fichier
téléchargé se colle dans Sheets en deux secondes.

---

## Phase 3 — présence et libération

**3.1 — Mobiliscope (CNRS).** Population effectivement présente dans chaque secteur, pour
chacune des 24 heures d'un jour de semaine moyen, ventilée par âge et catégorie
socio-professionnelle. 49 aires urbaines françaises, ODbL, CSV + GeoJSON.

C'est le plus gros écart entre ce que Compass affiche et ce qu'un preneur veut savoir : la
donnée distingue un quartier de bureaux qui triple à midi d'un quartier résidentiel au profil
inverse, deux emplacements que la population résidentielle INSEE décrit à l'identique. Réserves à
afficher : jour de semaine moyen, enquêtes de 2009 à 2019 selon les villes, maille secteur.

**3.2 — Validations IDFM.** Par station, par jour, par titre, historique depuis 2015 avec profils
horaires. Remplace le passage estimé par un nombre compté.

**3.3 — BODACC (DILA).** API ouverte et gratuite, sans clé. Deux usages distincts : les **ventes
et cessions de fonds de commerce avec leur prix**, qui est la donnée de prix la plus proche de ce
qu'un preneur paiera réellement ; et les **procédures collectives**, signal public qu'un local va
se libérer, souvent des mois avant qu'une annonce paraisse.

> **Chargé le 9 août 2026**, Paris depuis 2015 : 43 057 cessions et 120 285 procédures
> collectives, 156 468 établissements dont **107 499 situés sur une adresse BDCom**. Prix lu sur
> 25 496 cessions — le prix médian d'un fonds parisien est de **126 000 €** (quartiles 48 000 et
> 290 000), et par activité déclarée : officine de pharmacie 950 000 €, restaurant 230 000 €,
> restauration rapide 100 000 €.
>
> Ce que le croisement donne, et qu'aucune des deux sources ne dit seule — 26 avenue de la Porte
> d'Ivry : BDCom voit « pas un commerce » en 2017, restaurant français en 2020, restaurant
> asiatique en 2023 ; BODACC ajoute l'ouverture d'une sauvegarde en mars 2023, le plan arrêté en
> mai 2024, et la vente du fonds pour 700 000 € en mars 2025.
>
> **Trois réserves, portées par le schéma et pas seulement par ce document.**
>
> - Le prix est publié à l'intérieur d'une phrase — « Fonds acquis par achat au prix stipulé de
>   170 000,00 euros » — donc extrait par expression régulière. La phrase est conservée telle
>   quelle à côté du nombre : un chiffre produit par une regex doit rester vérifiable contre sa
>   source. 96 % des cessions se lisent ; les autres gardent la phrase sans nombre.
> - **Un avis de procédure collective ne donne pas l'adresse du commerce, mais celle du siège
>   social.** Pour un petit commerçant c'est le même lieu, pour une société ce ne l'est pas — une
>   liquidation déposée à un siège ne dit rien de la boutique du rez-de-chaussée. La colonne
>   `address_source` distingue les deux et l'interface doit l'afficher.
> - BODACC identifie une **adresse**, BDCom un **local**, et jusqu'à 120 locaux partagent une
>   adresse. La fonction ne désigne donc un local que lorsqu'il est seul à son adresse ; sinon elle
>   renvoie le nombre de locaux concernés, pour qu'on écrive « l'un des 6 locaux de cette adresse »
>   au lieu de laisser croire qu'on sait lequel.
>
> Une limite à garder en tête pour l'analyse : l'activité déclarée dans BODACC est du texte libre
> — « Restaurant », « Restaurant. », « Restauration traditionnelle », « restauration » coexistent.
> Pour tout regroupement par activité, c'est le code BDCom à 224 postes qui fait foi, pas cette
> chaîne. C'est une raison de plus de croiser plutôt que de choisir.

**3.4 — Cessations SIRENE.** L'API `recherche-entreprises` est déjà interrogée et porte les dates
de cessation d'établissement. Croisée avec BDCom, une cessation à une adresse recensée comme
commerce, c'est un local qui vient de se vider.

**Et surtout : elle comble le pas de trois ans.** C'est le croisement le plus important du
produit, parce qu'il répare la principale réserve de l'historique. BDCom dit « boulangerie en
2020, téléphonie en 2023 » ; SIRENE dit « la boulangerie a cessé en mars 2021, la téléphonie
s'est immatriculée en septembre 2022 » — donc **dix-huit mois de vide**, que le relevé triennal
avait effacés. Aucune des deux sources ne peut le dire seule.

Les deux histoires ne sont pas de même nature et il ne faut pas les confondre à l'affichage.
BDCom est l'histoire du **local** : relevée à pied, physique, tous les trois ans. SIRENE est
l'histoire des **entreprises** : déclarative, continue, et rattachée à une adresse
d'immatriculation qui n'est pas forcément une vitrine. Un `Measured<T>` par source, jamais un
chiffre fusionné qui masquerait laquelle des deux l'a produit.

**3.5 — La vue « ce qui se libère ».** Une seconde entrée dans le produit, à côté de « j'ai une
adresse ».

---

## Phase 4 — l'agent, et le récit

**4.1 — Serveur MCP.** Un paquet séparé au-dessus du noyau : `score_location`,
`compare_locations`, `explain_score`, `list_sources`. Chaque réponse embarque sa chaîne de
raisonnement, construite à partir du type `Measured`. Prérequis : remonter la provenance dans
l'UI, ou au moins cesser de la déballer dans l'adaptateur.

**4.2 — `llms.txt`** à la racine du site.

**4.3 — Prompt d'installation** à coller dans un agent de code, qui installe et lance Compass en
une fois.

**4.4 — Case study.** Trois angles à tenir ensemble :

- **L'ouverture conjoncturelle.** 71 100 défaillances d'entreprises sur douze mois glissants,
  niveau inédit depuis 2009 ; 29 766 cessions de fonds de commerce en 2025, en recul de 6,1 % ;
  une entreprise sur deux ne trouve pas de repreneur, au point que l'État a présenté un plan
  « Objectif Reprises » en avril 2026. La valeur d'un outil de jugement monte quand le marché
  descend.
- **La thèse.** L'agrégation n'est pas le produit, l'interprétation l'est. À positionner face
  aux 96 sources nationales d'un côté et aux trois sources assumées de Towncenter de l'autre.
- **Le fil rouge.** Troisième preuve de la conviction portée par Sonor et Tacet, dans un
  troisième secteur. À énoncer explicitement, sinon le lecteur y verra une redite.

---

## Différé, à garder en vue

- **Vélib' en GBFS** — API sans clé, ~1 400 stations, rafraîchie chaque minute. Le cycle de
  remplissage d'une station porte la direction et l'horaire du flux de la rue. Usage détourné que
  personne ne fait.
- **Sitadel** (SDES) et **observatoire des quartiers de gare du Grand Paris Express** (APUR) pour
  la projection : un bail engage sur neuf ans, l'environnement est autant temporel que spatial.
- **Protocole de comptage piéton manuel**, publié comme outil autonome — vingt minutes sur le
  trottoir, méthode d'extrapolation incluse. Transforme un trou de données en méthode.
- Vérifier si les déclarations de cession du droit de préemption commercial parisien (5e, 6e et
  partie du 7e, obligatoires depuis le 7 août 2024) sont publiées en open data.
- Trancher entre `bun.lockb` et `package-lock.json`, ajouter un `.gitattributes`
  (`* text=auto eol=lf`), sortir `public/sitemap.xml` du suivi git.
- Regarder les vulnérabilités `npm audit` à froid, sans `--force`.
