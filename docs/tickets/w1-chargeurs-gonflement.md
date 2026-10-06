# [P0] w1-chargeurs-gonflement — Les rechargements gonflent les tables jusqu'à la lecture seule

**ID** `w1-chargeurs-gonflement` · **vague 1** · **P0** · **échéance : avant le 2 novembre 2026**
**Dépend de** — *rien*
**Sources** — BDCom, SIRENE, SIRENE stock, BODACC, géographie

## Pourquoi

`DIAGNOSTIC-CORRIGES.md` §62. Du 3 au 5 octobre 2026, le projet Supabase est passé en lecture
seule pendant les gros chargements, et trois ingestions ont échoué sur `cannot execute DELETE in a
read-only transaction`. La cause est le gonflement : mesuré le 6 octobre, les tables occupaient de
×2 à ×3,7 leur volume utile (`premise_location` 69 Mo pour 19 Mo utiles). Les chargeurs rechargent
par `DELETE` puis `INSERT`, `geography.ts` réécrit chaque ligne de `premise_location`, et
l'autovacuum ne rend jamais la place au système.

Un `VACUUM FULL` a ramené la base de 964 à 393 Mo le 6 octobre. **Ce n'est pas le correctif** : le
prochain gros chargement regonfle ce qu'il recharge. **Ivan a décidé le 6 octobre 2026 : pas de
plan payant.** Le disque se tient donc par les chargeurs, ou ne se tient pas.

**Échéance** : BODACC reconstruit `bodacc_announcement` chaque nuit (`bodacc.ts`), donc ses tables regonflent dès le 7 octobre ; `sirene_stock`, la plus grosse table, se recharge le 2 de chaque mois (cron `53 2 2 * *`), SIRENE le 3, BDCom chaque trimestre.

## Comment

1. **Mesurer d'abord**, chargeur par chargeur, ce que chacun réécrit : `DELETE` complet, `DELETE`
   partiel (`stg_bdcom_od where vintage_id = $1`), `UPDATE` de toutes les lignes.
2. **`TRUNCATE` là où le rechargement est complet.** Il rend la place au système et reste
   transactionnel en Postgres. Attention aux clés étrangères (`TRUNCATE … CASCADE` emporterait des
   tables dépendantes) et aux verrous : `TRUNCATE` prend un verrou exclusif, un lecteur attend la
   fin de la transaction.
3. **`geography.ts` ne réécrit que ce qui change** : `update … where (quartier_id, street_segment_id)
   is distinct from (…)`.
4. **Un bras qui mesure le gonflement** et rougit **avant** le plafond du projet, pas après — ratio
   disque / utile par table, ou taille de base contre un seuil déclaré avec sa raison. Population
   dérivée de `pg_class`, jamais listée.

## Fait quand

1. Un rechargement complet de chaque source laisse la taille de sa table à moins de ×1,3 de son
   volume utile — **mesuré**, avant et après, sur le distant.
2. Le bras du gonflement existe, est planifié dans `porte.yml`, classé dans `cadence.json`, et
   prouve son rouge par un sabotage.
3. La sauvegarde `pg_dump` (procédure dans `DIAGNOSTIC-CORRIGES.md` §62) est refaite avant le
   premier rechargement de test.

## Ce que ça ne rattrapera pas

Une source qui grandit vraiment finira par toucher le plafond sans aucun gonflement. Le bras le
dira ; la décision — réduire une source, ou payer — restera à Ivan.
