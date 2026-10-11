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

## Où il en est — 6 octobre 2026, session de la proposition

**Le « Comment » s'est révélé faux sur un point, et la session l'a dit avant de coder.** Un
`TRUNCATE` dans une transaction rend l'ancien fichier au commit, mais la nouvelle version s'écrit
avant : le PIC d'un rechargement en bloc reste « ancien + nouveau ». Et il verrouille les lecteurs
jusqu'au commit — 4 min 30 chaque jour pour BODACC, en pleine journée. Ivan a validé le
6 octobre : BODACC et le stock SIRENE se rechargent **par morceaux** (une année d'une famille,
un code postal), SIRENE géolocalisé par `TRUNCATE` la nuit du vendredi, `geography.ts` n'écrit
que ce qui change, le staging BDCom est vidé. Le détail par chargeur : `DIAGNOSTIC-CORRIGES.md`
§62. En passant : `geography.ts` échouait depuis le 25 août — §65.

| « Fait quand » | État |
| --- | --- |
| 1. Rechargement mesuré sous ×1,3, sur le distant | **Pas encore démontré.** Ne se mesure qu'après fusion, aux premiers passages planifiés (BODACC le lendemain, SIRENE le vendredi). Démontré à blanc : `geography.ts` reproduit les 85 418 rattachements à l'identique (0 écriture), le stock SIRENE ses 375 629 établissements et 286 058 rattachements. |
| 2. Bras planifié, qui prouve son rouge | **Fait.** `npm run disque`, planifié dans `porte.yml` (pas besoin d'une raison dans `cadence.json` : il est joué) ; `disque.test.ts` joue la vraie règle sur le cas réel du 6 octobre (SIRENE stock en bloc : 514 Mo, rouge). |
| 3. Sauvegarde refaite avant le premier rechargement | **Fait.** `~/Backups/paris-compass/compass-20261006T1604Z.dump`, même procédure. |

**À faire juste après la fusion, dans cet ordre** : vider le staging BDCom
(`truncate stg_bdcom_od, stg_bdcom_2023`, −44 Mo, accord d'Ivan) — sans quoi `npm run disque`
reste rouge sur les pics SIRENE et BODACC ; puis mesurer chaque table après son premier passage.
**BDCom** reste signalé pour le 5 janvier 2027 (~520 Mo au tableau de bord) : à traiter avant
décembre, par le même découpage.
