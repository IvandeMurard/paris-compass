# [P1] w2-idfm — Validations IDFM horaires

**ID** `w2-idfm` · **vague 2** · **Q4 2026** · **P1**
**Dépend de** `w0-fiche`
**Sources** `idfm`

## Pourquoi
Remplace le proxy piéton par des entrées de station comptées depuis 2015.

## Comment
Profil horaire de la station la plus proche, millésime, réserve : ce n'est pas le trottoir de la vitrine. Distingue un pôle de bureau d'un pôle résidentiel.

## Doctrine
Mesuré à la station, pas à la porte. Le label le dit.

## Fait quand
Deux locaux à 800 m de deux stations au profil midi vs soir reçoivent deux rythmes distincts, étiquetés station.

Le « Fait quand » ci-dessus ne suffit pas seul : deux locaux nommés à la main sont une
**illustration**, jamais une preuve générale. La preuve porte sur un invariant qui DÉRIVE sa
population — `I47` (le rattachement stocké est bien la station réellement la plus proche) et
`I48` (un profil de station somme à 100 %, jamais un effectif), **et sur leurs deux miroirs**
`I49` / `I50`, sans lesquels les deux premiers passent au vert sur un corpus vide : mesuré le
7 septembre 2026, `idfm_station` neutralisée, `I47` et `I48` rendent zéro violation. Voir
§Avancement.

## Avancement — 7 septembre 2026, deux migrations POSÉES, une TROISIÈME en attente

**Endpoint choisi et vérifié** : le portail IDFM (`data.iledefrance-mobilites.fr`), pas
data.gouv.fr — ce dernier ne publie que le trafic **annuel** entrant par station, aucun profil
horaire. `scripts/porte/catalogue.json` épingle la ressource, avec la réserve écrite que son
`dataset_id` tourne chaque trimestre (docs/REPRISE-PIEGES.md) : le chargeur ne le pingle jamais,
il le résout par recherche de titre (`scripts/ingest/lib/idfmOpendata.ts`).

**Portée réellement couverte** : le millésime chargé est le TRIMESTRE COURANT (profil horaire),
jamais l'historique 2015-2024 — celui-ci est un fichier zip par année, sans schéma stable, hors
budget de cette session. « Historique depuis 2015 » (le « Pourquoi » ci-dessus) reste vrai comme
raison d'être du système de validation, pas comme promesse de rejouer dix ans de profils.

**Migration** `20260907000002_idfm_station_profile.sql` : tables `idfm_station` (258 stations
parisiennes) et `idfm_validation_profile` (**29 489** lignes — mesuré le 7 septembre 2026 sur
`dbefhvmyfmmhjeetdddu` après chargement, `select count(*)` et `ingestion_run.row_count`
concordants ; « 29 609 » a figuré ici et dans `PLAN-ACTION-VACANCE.md` jusqu'à la revue de #97,
recopié d'une transaction annulée et jamais remesuré), colonnes
`nearest_idfm_station_id` / `idfm_station_distance_m` sur `premise_location`,
`compass_premises_within` étendue de deux colonnes (nom et distance de la station la plus
proche), nouvelle fonction `compass_station_profile` (le profil horaire complet, jamais dans
`compass_premises_within` — pas de précédent jsonb dans ce schéma).

**Une station parisienne sur 259 est écartée à l'ingestion** : `71545` « Porte de Clichy »,
parce que la source publie jusqu'à quatre lignes pour le même (code, jour, tranche horaire)
avec des pourcentages différents, sans aucun champ pour les départager — moyenner à l'aveugle
aurait publié un chiffre inventé. `scripts/ingest/idfm.ts` (`aggregateProfiles`) l'écarte plutôt
que de le faire, docs/REPRISE-PIEGES.md.

> **Et l'exclusion porte plus loin que le défaut, ce qui n'était écrit nulle part.** Le fait
> sale est le PROFIL de cette station ; sa POSITION, elle, est propre — et le chargeur écarte
> les deux, puisqu'il ne charge dans `idfm_station` que les zdc qu'un profil nomme. Mesuré le
> 7 septembre 2026 en transaction annulée, la zdc 71545 réinsérée avec le centroïde que
> `buildParisStations` lui donnerait (4 zdaid, Lambert-93 x=649699,5 y=6866273,5, lus sur
> `zones-d-arrets` ce jour-là) : **156 locaux** sur les 85 410 rattachés reçoivent une station
> qui n'est pas la plus proche, avec jusqu'à **603 m** de surestimation. Pire cas,
> `10 AV PORTE DE CLICHY` : `idfm_station_distance_m` annonce **877 m** vers Brochant quand la
> station écartée est à **274 m**. `I47` valide ce rattachement, puisqu'il recalcule le plus
> proche PARMI LES STATIONS CHARGÉES. La conséquence est désormais écrite là où un appelant la
> lit — `comment on column premise_location.idfm_station_distance_m`, migration
> `20260907000003` — et **DIAGNOSTIC.md §44** porte la séparation des deux, qui reste ouverte.

**Démonstration DÉRIVÉE (pas choisie à la main)**, par une requête qui prend l'extrême de la part
de midi (12h-13h) et l'extrême de la part de soir (18h-19h) sur `cat_jour = 'JOHV'`, remesurée
le 7 septembre 2026 contre la base chargée : la station la plus « midi » est le Funiculaire de
Montmartre — gare haute (**7,57 %** à midi, **7,75 %** au soir — un profil touristique presque
plat, pas un pôle de bureau classique, et c'est une observation honnête, pas la confirmation
attendue) ; la station la plus « soir » est Kléber (**5,21 %** à midi, **18,49 %** au soir — un
profil résidentiel net). Deux rythmes distincts, étiquetés station, obtenus par requête plutôt
qu'écrits.

> **Ces quatre pourcentages ont été faux ici jusqu'à la revue de #97.** Le ticket publiait
> 14,95 / 14,73 et 9,34 / 30,18, recopiés d'une transaction annulée antérieure à la correction
> du `k` fixe (`aggregateProfiles`) et jamais remesurés : aucun ne se reproduit sous aucun des
> cinq `cat_jour`. Les deux STATIONS, elles, se reproduisent exactement — la requête dérivée
> retrouve les mêmes. Défaut de la même famille que #89 (`DIAGNOSTIC.md` §41) : un chiffre
> publié qu'aucune requête ne reproduit.

**Éprouvé le 7 septembre 2026 contre le distant** : `I47`, `I48`, `I49`, `I50` à zéro violation ;
`compass_premises_within` et `compass_station_profile` répondent correctement à Châtelet ; budget
anon de `compass_station_profile` mesuré à 2 000 m, Châtelet — 2 ms, 148 pages
(`eval/baselines/anon-budget.json`, à remesurer maintenant que la migration est posée : le réel
relevé par la revue est 157 pages pour un plafond de 160, la marge la plus mince du fichier).

**Ce que la revue de #97 a trouvé, et ce que la troisième migration corrige.** `npm.cmd run
eval` sortait en **1** avec quatre défaillances, toutes introduites par cette branche et
invisibles parce que le bras n'avait jamais été joué : `I23`, `I24` et `I32` — une seule cause,
`idfm_validation_profile` avec RLS active et **zéro politique de lecture**, donc 29 489 lignes
présentes et muettes pour tout appelant PostgREST direct pendant que la fonction
`security definer` répondait — et `I42`, `idfm_station.geom` étant la seule colonne `geography`
du schéma sans contrainte de finitude. `20260907000003_idfm_lecture_publique.sql` pose les deux ;
les deux migrations du 7 septembre **ne sont pas réécrites**, elles sont au ledger (règle `#83`).

**Ce qui manque avant de clore #19** : `supabase db push` de la TROISIÈME migration, refusé par
le classifieur de permissions — relancé une fois, refusé une seconde fois, donc la ligne attend
Ivan (voir le récap de la session sur l'issue #92). Ne pas fermer #19 avant que `npm.cmd run
eval` repasse au VERT et que `npm.cmd run ledger` confirme les trois migrations — la leçon de la
revue de #91 sur w6-analyse : poser puis fusionner doit se faire dans la même fenêtre.

**Laissé de côté, explicitement** : aucun écran ne lit encore `idfm_station_name` ni
`compass_station_profile` — comme `chantiers` et `sirene_stock` avant lui, ce ticket ferme sa
part backend sans ajouter `src/services/opendata/sources.ts` ni de composant d'affichage ; la
doctrine de brief (« une source rejoint sources.ts le jour où un écran la lit ») ne s'applique
donc pas encore ici, et ne devient fausse que le jour où un écran le fait.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
