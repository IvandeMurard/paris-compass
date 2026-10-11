# [P0] w0-sirene-url — L'URL du parquet SIRENE épinglée rend 404, et le chargeur ne peut plus tourner

**ID** `w0-sirene-url` · **vague 0** · **P0**
**Dépend de** `w0-cron`
**Sources** `sirene`

> **Fichier écrit rétrospectivement le 15 septembre 2026**, pour que ce ticket ait un identifiant
> comme ses cinquante-neuf voisins. Le travail est clos depuis le 25 août 2026. Le dossier
> complet — mesures, voies comparées, relevés du chargeur — est dans
> [`#56`](https://github.com/IvandeMurard/paris-compass/issues/56) ; ce fichier ne le recopie
> pas.

## Pourquoi

Trouvé le 25 août 2026 en rejouant les quatre chargeurs pour `w0-cron`. **Le chargeur SIRENE ne
pouvait plus tourner du tout** : `scripts/ingest/sirene.ts` épinglait l'URL du parquet INSEE, et
cette URL rendait **HTTP 404**. DuckDB échouait à la lecture, avant toute écriture.

**La cause n'est pas l'URL, c'est le portail.** `data.gouv.fr` **remplace** la ressource, il ne
l'archive pas : le jeu ne porte qu'un seul parquet à la fois. Épingler une URL sur ce jeu
garantit donc une panne dans le mois — l'épinglage a tenu du 15 juillet au 21 août 2026.

**Pourquoi c'était P0.** `w0-cron` déclarait une cadence **mensuelle** pour SIRENE. En l'état, ce
cron aurait échoué à chaque déclenchement : une cadence déclarée et jamais tenue, ce que la
doctrine interdit. `ingestion_run` a fait son travail — l'exécution ratée n'a rien avancé, et
`compass_source_freshness()` rendait toujours `sirene` en « jamais chargé ». Le défaut était
visible au lieu d'être masqué.

## Comment

L'épinglage n'était **pas une négligence** : il était documenté, et son motif était juste —
*« un changement silencieux de millésime déplacerait toutes les confirmations sans que rien ne le
dise »*. Un changement de millésime SIRENE déplace les confirmations, donc le niveau
`corrobore`, donc la composition de fiabilité.

**Ce qui a changé, c'est la prémisse, pas le raisonnement** : il n'existait alors nulle part où
consigner le millésime chargé. `ingestion_run.source_as_of` est cet endroit depuis
`20260825000001`. Le changement n'est donc plus silencieux, et n'a plus à être empêché.

## Doctrine

**Un chargeur qui devine est pire qu'un chargeur qui s'arrête.** Trois refus délibérés, et ils
sont le cœur du correctif :

- **portail injoignable → il lève**, sans repli sur l'URL précédente — un repli ferait avancer
  `last_success_at` sur un millésime que personne n'a choisi ;
- **plus d'une ressource parquet → il lève** — prendre « la plus récente » serait un choix que ce
  fichier n'a pas à faire en silence ;
- **URL sans millésime lisible → il lève** — un chiffre sans sa date n'est pas publié.

## Fait quand

Le chargeur résout son URL au lieu de la porter en dur, écrit le millésime résolu, et dit en
clair quand celui-ci change.

## Fait le 25 août 2026

`scripts/ingest/sirene.ts` **résout l'URL depuis l'API data.gouv.fr** et écrit le millésime
résolu dans `ingestion_run.source_as_of`. Le chargeur annonce le changement :

```
CHANGEMENT DE MILLÉSIME — 2026-07-21 -> 2026-08-21 — les confirmations vont bouger
```

Un mode `--dry-run` charge, mesure, puis **annule dans la même transaction** — parce qu'un
changement de millésime déplace la métrique de qualité du projet et qu'on doit pouvoir le
chiffrer avant de le commettre. Relevé du 25 août : 68 770 → 68 881 établissements (+111),
82 371 → 82 395 avis confirmés (+24), 1 884 → 1 878 infirmés (−6).

**Ce que ça ne rattrape pas.** La résolution suppose que le jeu data.gouv.fr garde un seul
parquet et un millésime lisible dans son URL. Le jour où le portail change l'une ou l'autre de
ces deux choses, le chargeur lève — c'est la bonne direction d'erreur, mais c'est une panne, pas
une adaptation.
