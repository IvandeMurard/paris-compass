# [P2] w1-colonnes-derivees — Une seule liste de colonnes par chargeur, tenue à la table

**ID** `w1-colonnes-derivees` · **vague 1** · **P2** · issue #262
**Dépend de** — #259 (terrasses n'écrit que ce qui change), #264 (plu, chantiers)
**Sources** — terrasses, PLU, chantiers

## Objectif

Qu'une colonne ajoutée ou retirée par une migration fasse **échouer** le chargement qui l'ignore, au lieu de passer en silence.

## Contexte

Depuis #244, les chargeurs n'écrivent que ce qui change. Pour savoir ce qui a changé, ils comparent les lignes colonne par colonne. La revue de #259 a relevé que `terrasses.ts` tenait ses colonnes deux fois, à la main : dans `COLUMNS` et dans `ROW_KEY`, la clé qui identifie une ligne faute d'identifiant à la source. Les deux copies étaient justes le jour de l'écriture. Mais une colonne ajoutée par une migration n'entrerait dans aucune des deux :
- absente de `COLUMNS`, elle ne serait jamais écrite ;
- absente de `ROW_KEY`, deux lignes qui ne diffèrent que par elle seraient prises pour la même, et la mise à jour de la source serait perdue.

Rien ne le signalerait. C'est la règle 2 de la revue : une liste tenue à la main est juste le jour où on l'écrit.

## Critère de sortie

Une migration qui ajoute ou retire une colonne de l'une des trois tables fait échouer le chargement suivant, avant tout écrit, au lieu d'être ignorée.

## Fait le 11 octobre 2026 — critère atteint

- `scripts/ingest/lib/columns.ts` lit le catalogue (`information_schema.columns`, hors colonnes générées et identité) et le compare à la liste déclarée par le chargeur. Toute différence (colonne manquante, en trop ou en double) refuse le chargement **avant tout écrit** et nomme la colonne. Les comparaisons sont construites depuis la liste vérifiée, les colonnes spatiales en `ST_AsBinary`.
- `terrasses.ts`, `plu.ts` et `chantiers.ts` passent par cette garde. `ROW_KEY` est dérivée de `COLUMNS`, dans le même ordre, donc avec les mêmes empreintes qu'avant.
- Démontré le 11 octobre 2026 sur le catalogue distant : la liste complète de plu est acceptée, et la même liste amputée de `length_m` est refusée, avec le nom de la colonne. Les trois essais à blanc rendent exactement les comptes d'avant le changement (terrasses 342 / 1 411 / 437, plu 0 / 0 / 13 116, chantiers 0 / 0 / 0).

### Ce que ça ne rattrape pas

La garde compare des **noms**, pas un sens. Elle laisse passer :
- une colonne renommée à la fois dans la migration et dans la liste ;
- une valeur mal rangée par `stage` : la correspondance entre un champ de la source et une colonne reste écrite à la main dans chaque chargeur.

Deux limites relevées par la revue de #266 :
- **Une colonne à `DEFAULT`** (`created_at default now()`) n'est pas exclue, alors que la base la remplit seule. Elle fait refuser le chargement tant qu'on ne l'ajoute pas à la liste. C'est le bon sens de l'erreur, bruyant et avant tout écrit, mais il faudra l'ajouter à la liste.
- **La garde joue au chargement suivant, pas à la migration.** Pour plu, c'est le 9 mars 2027. La jouer aussi dans une porte planifiée ferait rougir une migration le lendemain : c'est noté dans #265.

Les autres chargeurs (filosofi, idfm, BDCom, BODACC, SIRENE) ne passent pas encore par cette garde.
