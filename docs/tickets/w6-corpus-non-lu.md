# [P1] w6-corpus-non-lu — Six fonctions construites, chargées, et lues par personne

**ID** `w6-corpus-non-lu` · **vague 6** · **P1**
**Dépend de** — *rien*
**Sources** — *aucune source nouvelle : tout est déjà en base*

> **Demandé par Ivan le 5 octobre 2026** : *« L'ensemble des jeux de données ingérés doivent être
> valorisés. »*

## Ce qui a été mesuré le 5 octobre 2026

Comptage des consommateurs réels de chaque fonction `compass_*`, au `grep` sur `src/` et
`mcp-server/src/`, **en excluant `src/types/database.ts` et les tests** — un type généré n'est pas
un lecteur. **Approximation à confirmer par la session** : un appel construit dynamiquement
échapperait à ce comptage.

| Fonction | Consommateurs | Ce qu'elle porte |
| --- | --- | --- |
| `compass_bodacc_within` | **0** | cessions et procédures collectives autour d'un point |
| `compass_premise_history` | **0** | l'histoire d'un local entre millésimes |
| `compass_street_rotation` | **0** | la rotation d'une rue |
| `compass_voie_rotation` | **0** | la rotation d'une voie |
| `compass_price_by_activity` | **0** | les prix par activité |
| `compass_sales_vs_collective` | **0** | cessions contre procédures |
| `compass_meubles_within` | **0** | les meublés touristiques |

À côté, ce qui est lu : `compass_scoring_context_within` 9, `compass_address_timeline` 8,
`compass_premises_within` 8, `compass_vintages` 8, `compass_station_profile` 5,
`compass_activity_transitions` 3, `compass_survival_by_trade` 3.

**Et le chargeur `meubles` n'a aucun lecteur du tout** — ni fonction appelée, ni écran.

## Pourquoi ce n'est pas un ticket de nettoyage

Chacune de ces fonctions a coûté une migration, un chargeur, une vérification de licence et une
place au ledger. **Le travail est fait ; c'est la dernière marche qui manque.** Et deux d'entre
elles répondent à des tickets déjà ouverts :

- `compass_bodacc_within` est le fil de signaux de l'accueil — `w6-accueil-reel`.
- `compass_street_rotation` et `compass_voie_rotation` sont l'échelle de la rue — `w6-rue` (#209),
  qui disait *« Compass mesure en cercles »* sans savoir que la rue était déjà calculée.

## Ce que le ticket demande, et ce n'est pas « tout afficher »

**Une décision écrite par fonction, et trois issues possibles :**

1. **Un lecteur existe déjà ailleurs** — alors le dire, avec le fichier, et refermer la ligne.
2. **Un écran doit la lire** — alors nommer lequel, et ouvrir le ticket s'il n'existe pas.
3. **Elle ne doit pas être servie** — alors écrire pourquoi. Une licence non lue, un millésime
   retenu, un risque de réidentification sont des raisons. « Personne n'a eu le temps » n'en est
   pas une ; c'est l'état actuel, pas une décision.

**La réserve de licence compte comme une décision pleine.** `docs/HANDOFF-1d.md` l'écrit : BDCom
2017 et 2020 sont retenus tant que l'APUR n'a pas répondu, donc l'histoire d'un local et la
rotation d'une rue **ne peuvent pas être servies au public aujourd'hui**. L'état à afficher n'est
pas un vide : c'est *« nous l'avons et ne pouvons pas le servir »*, avec sa raison. C'est la
distinction qui fait la valeur du produit, pas un défaut à cacher.

## Fait quand

1. **Chaque fonction `compass_*` du schéma a sa ligne**, avec son nombre de lecteurs **remesuré**
   et son issue parmi les trois.
2. **La population est dérivée du schéma**, pas recopiée de ce ticket : une fonction ajoutée demain
   entre dans le recensement sans que personne n'y pense.
3. **Un contrôle tient la règle** : une fonction sans lecteur et sans décision écrite fait rougir
   `test`. C'est la même forme que les sondes de catalogue et les cadences d'ingestion.
4. **Les décisions « retenu » nomment la condition qui les annulerait** — pour BDCom, la réponse de
   l'APUR.
5. **Aucune fonction n'est supprimée dans ce ticket.** Décider qu'une chose ne se sert pas n'est
   pas décider qu'elle n'existe pas.

**Ce que ça ne rattrape pas.** Le recensement dit qu'un lecteur *existe*, jamais qu'il est *bon* :
une fonction lue par un écran qui l'affiche mal passera au vert. Et il ne voit pas une donnée
chargée qu'aucune fonction n'expose — c'est le cas de `meubles`, qui a une fonction, et ce ne sera
pas le cas du prochain chargeur écrit sans elle.

## Hors périmètre

Pas de suppression. Pas de nouvel écran dans ce ticket — il ouvre les tickets, il ne les exécute
pas. Pas de levée de la réserve BDCom : elle appartient à l'APUR.

Voir [`w6-accueil-reel.md`](./w6-accueil-reel.md), [`w6-rue.md`](./w6-rue.md) et
`docs/HANDOFF-1d.md` § 0.
