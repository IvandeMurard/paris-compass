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
`I48` (un profil de station somme à 100 %, jamais un effectif). Voir §Avancement.

## Avancement — 7 septembre 2026, migration écrite, PAS ENCORE POSÉE

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
parisiennes) et `idfm_validation_profile` (29 609 lignes), colonnes
`nearest_idfm_station_id` / `idfm_station_distance_m` sur `premise_location`,
`compass_premises_within` étendue de deux colonnes (nom et distance de la station la plus
proche), nouvelle fonction `compass_station_profile` (le profil horaire complet, jamais dans
`compass_premises_within` — pas de précédent jsonb dans ce schéma).

**Une station parisienne sur 259 est écartée à l'ingestion** : `71545` « Porte de Clichy »,
parce que la source publie jusqu'à quatre lignes pour le même (code, jour, tranche horaire)
avec des pourcentages différents, sans aucun champ pour les départager — moyenner à l'aveugle
aurait publié un chiffre inventé. `scripts/ingest/idfm.ts` (`aggregateProfiles`) l'écarte plutôt
que de le faire, docs/REPRISE-PIEGES.md.

**Démonstration DÉRIVÉE (pas choisie à la main)**, par une requête qui prend l'extrême de la part
de midi (12h-13h) et l'extrême de la part de soir (18h-19h), sur le millésime chargé, trouvée le
7 septembre 2026 : la station la plus « midi » est le Funiculaire de Montmartre — gare haute
(14,95 % à midi, 14,73 % au soir — un profil touristique, pas un pôle de bureau classique, et
c'est une observation honnête, pas la confirmation attendue) ; la station la plus « soir » est
Kléber (9,34 % à midi, 30,18 % au soir — un profil résidentiel net). Deux rythmes distincts,
étiquetés station, obtenus par requête plutôt qu'écrits.

**Éprouvé le 7 septembre 2026 contre le distant, en TRANSACTION ANNULÉE** — la migration n'est
pas posée, même pratique que w6-analyse (#50) pour I43-I46 (docs/REPRISE.md) : `I47` et `I48`
(`eval/invariants.sql`) à zéro violation ; `compass_premises_within` et `compass_station_profile`
répondent correctement à Châtelet ; budget anon de `compass_station_profile` mesuré à 2 000 m,
Châtelet — 2 ms, 148 pages (`eval/baselines/anon-budget.json`).

**Ce qui manque avant de clore #19** : `supabase db push`, refusé par le classifieur de
permissions à cette session — relancé une fois, refusé une seconde fois, donc la ligne attend
Ivan (voir le récap de la session sur l'issue #92). Ne pas fermer #19 avant que la migration soit
réellement posée ET confirmée par `npm.cmd run ledger` — la leçon de la revue de #91 sur
w6-analyse : poser puis fusionner doit se faire dans la même fenêtre, jamais l'un sans l'autre.

**Laissé de côté, explicitement** : aucun écran ne lit encore `idfm_station_name` ni
`compass_station_profile` — comme `chantiers` et `sirene_stock` avant lui, ce ticket ferme sa
part backend sans ajouter `src/services/opendata/sources.ts` ni de composant d'affichage ; la
doctrine de brief (« une source rejoint sources.ts le jour où un écran la lit ») ne s'applique
donc pas encore ici, et ne devient fausse que le jour où un écran le fait.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
