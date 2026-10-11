# [P2] w1-ecritures-prouvees — Prouver les écritures réelles de plu et chantiers, et compter ce qu'elles occupent

**ID** `w1-ecritures-prouvees` · **vague 1** · **P2** · issue #265
**Dépend de** — #264 (plu et chantiers n'écrivent que ce qui change)
**Sources** — PLU, chantiers (et terrasses pour le budget disque)

## Objectif

Qu'un chargeur « n'écrit que ce qui change » le soit **prouvé par un vrai passage**, et pas seulement par un essai à blanc. Et que le budget disque compte tout ce que le chargeur occupe au moment du pic.

## Contexte

La revue de #264 a rendu son verdict : fusionnable, mais à suivre. Elle a relevé quatre points.

1. **L'essai à blanc compte, il n'exécute pas.** `--dry-run` remplace chaque écriture réelle par un `count(*)`. Il prouve ce qu'un passage changerait, pas que l'*upsert*, l'`update` et le `delete` qui le changeraient sont justes.
2. **La clause « la ligne a-t-elle changé ? » de `plu.ts` était écrite deux fois** : une copie pour l'essai, une pour l'*upsert*. Si elles divergeaient, une colonne modifiée ne serait plus jamais réécrite.
3. **Les tables temporaires n'étaient pas comptées** dans `scripts/porte/disque.json`. Elles vivent jusqu'à la fin de la transaction, donc au pic.
4. **La borne de chantiers** (« les exposés réécrits une fois ») n'est pas une borne : un local réécrit est exposé avant **ou** après.

## Déjà fait, le 11 octobre 2026

- **chantiers** : passage réel le 11 octobre 2026 ([run 38141609039](https://github.com/IvandeMurard/paris-compass/actions/runs/38141609039)), aux mêmes comptes que l'essai (8 écrits, 5 retirés, 358 locaux). L'essai à blanc juste après donne **0 / 0 / 0**.
- **Une seule clause de comparaison** pour plu et chantiers, construite par `scripts/ingest/lib/columns.ts` (avec #262).
- **La limite de l'essai à blanc** est écrite en tête de `DryRunComplete` dans les trois chargeurs.
- **Tables temporaires mesurées le 11 octobre 2026**, en les reconstruisant depuis les tables réelles dans une transaction annulée. Une table temporaire compte bien dans `pg_database_size` : une copie de 9,5 Mo fait passer la base de 400,0 à 409,5 Mo, et un `truncate` la rend aussitôt.
  - plu : 5,3 Mo ;
  - chantiers : négligeable ;
  - terrasses : **26,5 Mo**, dont `tmp_terrasse_batch` (9,5 Mo), désormais vidée par `truncate` dès qu'elle ne sert plus, avant toute écriture de locaux.
- **Borne anciens + nouveaux** appliquée aux trois blocs, par cohérence :
  - chantiers 1 → 2 Mo ;
  - plu 14 → 33 Mo ;
  - terrasses 11 → 40 Mo.

  Effet sur `npm run disque` : plu 458 → 479 Mo (signal, pour mars 2027) ; **terrasses 466 → 498 Mo pour le 8 novembre 2026**, à 2 Mo du plafond réel de 500. C'est le pire cas, une source réécrite en entier. Le cas mesuré, 437 locaux, reste vers 475.
- **Tables temporaires des autres chargeurs**, mesurées le 11 octobre 2026 de la même façon (base 400,03 Mo, revenue à 400,03 après chaque annulation) :

  | Chargeur | Table temporaire | Taille | `ajout_mo` | Pic `npm run disque` |
  | --- | --- | --- | --- | --- |
  | SIRENE | `stg_sirene` | 6,01 Mo | 0 → 6 | 475 → **482** (16 octobre 2026) |
  | SIRENE stock | `tmp_quartier`, toute la session | 4,84 Mo | 0 → 5 | 453 → **459** (16 octobre 2026) |
  | BODACC | `tmp_address_geom`, toute la session | 5,84 Mo | 0 → 6 | 446 → **453** (chaque nuit) |
  | filosofi | `tmp_cells` + `tmp_filo` | 0,66 + 6,01 Mo | 0 → 7 | 490 → 498 (6 mars 2027) |
  | idfm | `tmp_nearest` | 4,50 Mo | 0 → 5 | 489 → 495 (5 mars 2027) |
  | BDCom | aucune : son staging est une vraie table, déjà comptée (44 Mo) | — | 44 | 489 |

  Le bloc SIRENE comptait le staging **à la place** de l'ancien fichier : un `truncate` d'une table qui existait avant la transaction garde l'ancien fichier jusqu'au commit, donc l'ancienne table, la nouvelle et le staging coexistent. Sa confirmation ne réécrit que les verdicts qui changent : 30 au changement de millésime du 25 août 2026, négligeable. Un régéocodage complet par l'INSEE en ferait basculer jusqu'à 85 486, ~45 Mo : non compté, écrit dans le bloc.

  **BODACC passe au rouge** (453 Mo, seuil 450), et il se charge chaque nuit. Ce n'est pas une aggravation : c'est ce que le bloc oubliait. Le plafond réel de 500 reste à 47 Mo. La réduction de #260 le ramène sous le seuil.

## À faire

1. **plu** : passage réel puis essai à blanc à 0 / 0 / 0. Son prochain passage planifié est le 9 mars 2027 ; un passage à la main avant est possible, mais il réécrira une fois les 13 116 locaux du départage (#263).
2. **Les écritures réelles sur une base locale**, deux passages, le second à 0. Faute de Docker fiable sur le poste, un coureur CI fera l'affaire.
3. ~~Les tables temporaires des autres chargeurs~~ : mesurées le 11 octobre 2026, voir plus haut.
4. **Tenir `checkColumns` par un test durable** (revue de #266). Sa seule preuve est la mesure du 11 octobre 2026 contre le catalogue distant. Il faut un test qui épingle le filtre « hors générées et identité » sur une vraie table, et l'égalité de `rowKey(COLUMNS)` avec l'ancienne `ROW_KEY` de terrasses. Option : jouer `checkColumns` des trois chargeurs dans une porte planifiée, pour qu'une migration rougisse le lendemain plutôt qu'au chargement suivant.

## Critère de sortie

- Un passage réel de plu suivi d'un essai à 0 / 0 / 0, consigné avec sa date et son run.
- Chaque bloc de `disque.json` compte ses tables temporaires, mesurées.

## Ce que ça ne rattrape pas

Un essai à 0 / 0 / 0 prouve qu'un second passage n'écrit rien sur **cette** source. Il ne prouve pas qu'un passage sur une source très différente écrirait juste.
