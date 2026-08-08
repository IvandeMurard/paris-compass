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

**2.1 — Base spatiale.** Activer PostGIS sur l'instance existante, écrire les migrations,
indexer en GiST, exposer des RPC prenant **un point et un rayon**, pas une bbox. C'est ce
changement qui corrige structurellement le bug des scores dépendants du cadrage
(`DIAGNOSTIC.md` §2) : on interroge un voisinage, plus un rectangle d'affichage. Et c'est aussi
ce qui remplacera le rattachement d'un local à son quartier par centroïde le plus proche par un
vrai test d'appartenance au polygone.

**2.2 — `scripts/` devient un pipeline d'ingestion.** Un script par source, idempotent, avec
journal de millésime : télécharger, normaliser, géocoder si besoin, charger. Node ou Python pur.

**2.3 — BDCom (APUR), les trois millésimes.** 2017, 2020, 2023, ODbL, en KML/CSV/GeoJSON/SHP ou
par API. Recensement de terrain porte-à-porte de tous les locaux parisiens en rez-de-chaussée
avec vitrine et accès sur rue — 83 154 locaux en 2023, dont 60 845 commerces, plus 103
concentrations commerciales. Chaque local porte sa localisation fine, son type, son activité sur
une nomenclature à 224 postes et une tranche de surface.

Deux gains. La nomenclature et les tranches de surface écrasent le tagging OSM sur lequel le
produit repose aujourd'hui. Et surtout, trois millésimes d'un recensement exhaustif donnent la
**trajectoire de vacance et de rotation par tronçon de rue** — c'est de là que l'APUR tire ses
taux de vacance publiés. Aucun outil grand public n'expose ça. C'est le différenciateur.

**2.4 — PLU, protections du commerce et de l'artisanat.** Jeu `plub_protcom` sur
opendata.paris.fr, version votée le 20 novembre 2024. Contrainte binaire et cartographiée : sur
un linéaire protégé, un local en rez-de-chaussée ne peut pas changer de destination. C'est la
première chose qui peut faire capoter un projet. **Fourni pour information, sans valeur
réglementaire** — à afficher comme signal, avec renvoi au Portail des Règles d'Urbanisme.

**2.5 — L'affichage.** Une fois les RPC en place, la fiche « ce que cette rue est devenue depuis
2017 » et le bandeau d'alerte PLU se font plus vite côté Lovable.

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
