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

> **Écrit et vérifié en local le 8 août 2026.** Cinq migrations dans `supabase/migrations/`,
> appliquées sur une base locale et testées sur jeu fictif : PostGIS isolé dans son schéma ;
> géographie de référence (quartiers en polygones, tronçons de voie) ; référentiel BDCom, où
> **chaque millésime porte sa licence et son périmètre comme donnée**, pas comme commentaire ;
> locaux et relevés, la géométrie stockée une seule fois ; cinq RPC, toutes point + rayon.
>
> Deux garanties mécaniques plutôt que documentaires : la comparaison à périmètre commun est le
> **comportement par défaut** — il faut demander explicitement la version trompeuse — et un local
> absent d'un millésime renvoie « je ne sais pas », jamais « il a changé », parce que la donnée ne
> distingue pas une fermeture d'une sortie de périmètre.
>
> **Rien n'est appliqué sur l'instance Lovable.** L'activation de PostGIS là-bas est un « oui plus
> tard » explicite, à demander avant de l'exécuter.

**2.2 — `scripts/` devient un pipeline d'ingestion.** Un script par source, idempotent, avec
journal de millésime : télécharger, normaliser, géocoder si besoin, charger. Node ou Python pur.

**2.3 — BDCom (APUR), les trois millésimes.** Recensement de terrain porte-à-porte de tous les
locaux parisiens en rez-de-chaussée avec vitrine et accès sur rue. Chaque local porte sa
localisation fine, son type, son activité sur une nomenclature à 224 postes et une tranche de
surface.

Il n'y a rien à télécharger à la main : l'APUR expose des services ArcGIS paginés. **2017 et 2020**
sont deux couches du même service `OPENDATA/BDCOM_OD` — 84 031 et 83 399 locaux, périmètre
complet, licence personnalisée. **2023** est publié à part, sous un schéma de colonnes entièrement
différent — 60 845 commerces, ODbL, 95 concentrations commerciales. Ingestion en GeoJSON par
tranches de 1 000, en demandant la sortie en WGS 84 pour ne pas reprojeter le Lambert 93 soi-même.

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
>   l'identifiant pour absent.)* Reste ~0,3 % d'identifiants réattribués à un autre local : on
>   apparie sur l'identifiant, on **vérifie sur l'adresse**, et on marque la divergence.
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
- **Environ 0,3 % des identifiants sont réattribués** à un autre local d'un millésime à l'autre.
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

**3.4 — Cessations SIRENE.** L'API `recherche-entreprises` est déjà interrogée et porte les dates
de cessation d'établissement. Croisée avec BDCom, une cessation à une adresse recensée comme
commerce, c'est un local qui vient de se vider.

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
