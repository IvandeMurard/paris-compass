# [P1] w2-filosofi — Filosofi carroyé 200 m

**ID** `w2-filosofi` · **vague 2** · **Q4 2026** · **P1**
**Dépend de** `w0-fiche`
**Sources** `filosofi`

## Pourquoi
L'IRIS est trop large : deux rues du même IRIS peuvent n'avoir rien à voir. Le carreau 200 m passe le test de granularité.

## Comment
INSEE, revenus et population. Afficher la maille et l'année. Utile au caviste, muet pour le kebab de flux.

## Doctrine
Pas une moyenne d'arrondissement. Pas un score d'aisance.

## Fait quand
Deux locaux à 300 m l'un de l'autre, carreaux différents, montrent deux médianes.

> **Ce critère est faux, mesuré le 8 septembre 2026, et corrigé ici plutôt que livré tel quel.**
> Aucune source Filosofi carroyée — à 200 m, 1 km ou « niveau naturel » — ne publie de médiane
> par carreau. Le fichier ne porte qu'une seule variable de revenu, `ind_snv` : « Somme des
> niveaux de vie winsorisés des individus » (documentation INSEE, dictionnaire des variables) —
> une SOMME, jamais une médiane. Une médiane par carreau n'a jamais existé dans ce dispositif :
> elle exigerait une distribution ordonnée, un risque de divulgation plus grand qu'une somme au
> seuil de confidentialité de 11 ménages fiscaux, et l'INSEE a conçu le dispositif sans elle.
> **Le critère réel, satisfaisant la même « pourquoi »** (séparer deux rues du même IRIS, ce que
> l'IRIS ne peut pas faire) : deux carreaux différents montrent deux MOYENNES estimées de niveau
> de vie par habitant (`ind_snv / individus`, winsorisée par l'INSEE avant sommation), à 200 m —
> jamais une moyenne d'arrondissement, ce que la doctrine ci-dessus interdit réellement. Preuve
> par construction dans `eval/invariants.sql` (I51-I54), pas par un couple de locaux nommés — les
> locaux restent une illustration lisible, jamais la preuve. Détail complet, avec les chiffres
> mesurés contre le vrai parquet : en-tête de la migration `20260908000001_filosofi_grid_200m.sql`.

## État — 8 septembre 2026 (w2-filosofi)

Endpoint choisi et épinglé (`scripts/porte/catalogue.json`) : la page data.gouv.fr du dispositif
2019-2021, licence Licence Ouverte 2.0 (`lov2`). Migration `20260908000001` PRÉPARÉE, NON POSÉE
— aucune base n'était joignable depuis cette session (aucun `DATABASE_URL` dans cet arbre de
travail isolé), donc rien n'a pu être chargé ni éprouvé en transaction annulée, contrairement à
`w2-idfm`. Chargeur `scripts/ingest/filosofi.ts` écrit et vérifié seulement côté lecture DuckDB
contre le vrai parquet distant (compte de carreaux, magnitude de `ind_snv`, correspondance
`bbox`/géométrie) — jamais côté Postgres. Cadence `triennial` (réutilisée, aucun calendrier
annoncé par l'INSEE), cron ajouté à `ingestion.yml`, non encore éprouvé par un chargement réel.

**Limite non corrigée, à connaître avant d'appliquer la migration** : ce fichier data.gouv.fr ne
porte pas `i_est_200`, l'indicateur d'imputation qu'INSEE dit obligatoire à lire avant de faire
confiance à un carreau (79 % des carreaux de 200 m sont imputés au niveau national). Impossible
donc de distinguer, depuis cette table, un carreau mesuré d'un carreau reconstitué par groupe.
Moindre risque en zone dense parisienne (précaution que l'INSEE écrit elle-même), mais réel et
non rattrapé — voir `DIAGNOSTIC.md` pour le numéro de section.

Revue due avant fusion : migration + invariants neufs (docs/SESSIONS.md). Ne pas fusionner cette
proposition tant que la migration n'a pas été posée et éprouvée contre une base réelle.
