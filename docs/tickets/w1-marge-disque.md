# [P1] w1-marge-disque — Rendre au disque une marge que les rechargements ne reprennent pas

**ID** `w1-marge-disque` · **vague 1** · **P1** · **avant le passage BDCom du 5 janvier 2027**
**Dépend de** — #239 fermé le 10 octobre 2026 ; mesure du passage SIRENE du 16 octobre 2026
**Sources** — SIRENE stock, BODACC, BDCom

## Pourquoi

#239 a tenu son critère : plus aucun chargeur ne gonfle son tas au-delà de ×1,3. Mais après la compaction du 6 octobre, les **index** se sont regonflés jusqu'à leur régime d'équilibre, et c'est cette place que la base ne rend plus. Le `REINDEX CONCURRENTLY` du 8 octobre a été repris dès le passage suivant.

Mesures du 10 octobre 2026, sur le distant et en lecture seule :

- **Base** : 399,8 Mo Postgres (`pg_database_size`). Cela fait environ 440 Mo au tableau de bord, une valeur **calculée et non lue** : 399,8 × 1,1018, un rapport relevé le 6 octobre 2026 (`rapport_tableau_de_bord` de `disque.json`). Le plafond est de 500. À relire sur le tableau de bord à la prochaine mesure. Elle était à 368,7 Mo le 8 octobre.
- **Pics de `npm run disque`** :
  - rouges : SIRENE à 475 Mo le 16 octobre (puis chaque vendredi), terrasses à 466 Mo le 8 novembre (après #259), SIRENE stock à 453 Mo ;
  - signaux : BDCom à 489 Mo le 5 janvier 2027, filosofi à 490 et idfm à 489 en mars, plu à 472.
- **Plus grosses tables**, tas + index : `sirene_etablissement_stock` 93,8 Mo, `bodacc_establishment` 84,5, `bodacc_announcement` 51,3, `premise_observation` 41,5, `premise_location` 40,5.
- **Index jamais lus depuis le 24 juillet 2026** (`pg_stat_user_indexes.idx_scan = 0`) : `sirene_stock_naf_idx` (4,8 Mo) et `terrasse_autorisation_geom_idx` (1,7 Mo). C'est un levier marginal.

Ivan a écarté le plan payant le 6 octobre 2026. Le seuil et le plafond de `scripts/porte/disque.json` ne se montent pas pour éteindre un rouge.

## À faire

1. **Le 16 octobre** : mesurer la base après le passage SIRENE.
   - Si elle reste vers 400 Mo, le régime est établi et la marge est le vrai problème.
   - Si elle monte encore, c'est un défaut de chargeur, et on le cherche d'abord.
2. **Chiffrer les options de réduction**, chacune avec ce qu'elle fait perdre au produit et ce qu'elle rend en Mo. Les premières à examiner :
   - les colonnes et les lignes de `sirene_etablissement_stock` qu'aucun écran ni outil MCP ne lit ;
   - l'historique BODACC depuis 2015 ;
   - les deux index jamais lus.
3. **La décision revient à Ivan.** Confirmation écrite avant toute suppression de jeu de données (décision du 6 octobre 2026).

## Déjà fait, le 13 octobre 2026 — en brouillon, rien de supprimé

- **Chiffrage** posé le 11 octobre 2026 dans #260. Recommandation : **S2**, ne garder du stock SIRENE que les établissements créés depuis le premier millésime BDCom **et** rattachés à un quartier.
- **Le 12 octobre 2026**, un `VACUUM FULL` manuel (#268) a ramené la base de 400 à 361 Mo Postgres. Le 13 octobre, elle était déjà remontée à 382,6 Mo.
- **Le filtre S2 est écrit dans `sirene-stock.ts`**, en proposition non fusionnée :
  - la date est filtrée à la lecture INSEE ; la borne est lue dans `bdcom_vintage` (`min(year)`, 2017 aujourd'hui) et pas écrite en dur ;
  - le rattachement au quartier passe d'un `left join` à un `join`.
- **Mesuré le 13 octobre 2026** :
  - `sirene-stock.ts --dry-run` : 156 685 lus depuis 2017, **116 890 écrits**, contre 375 629 en base ;
  - **0 réponse de `compass_survival_by_trade` changée** sur 1 440 (80 quartiers × métiers du pont × paires de millésimes), en retirant les 258 739 lignes écartées dans une transaction annulée ;
  - la table filtrée, reconstruite avec ses index : **25,8 Mo contre 74,2**, soit −48,4 Mo Postgres (~−53 au tableau de bord). C'est moins que les ~65 du chiffrage, parce que le `VACUUM FULL` du 12 en a déjà repris une partie.
- **Le gain n'atteint le disque qu'après un `VACUUM FULL` de la seule table**, une fois, après le premier passage filtré. Le passage par code postal libère la place à l'intérieur du fichier sans la rendre au disque. Ce compactage suit la procédure de #268 : sauvegarde vérifiée d'abord, puis confirmation écrite d'Ivan.

- **Revue de #272, le 13 octobre 2026** : fusionnable mais à suivre. Le filtre est exact **par le bas** (le plus ancien millésime, le quartier), mais **volontairement large par le haut**. Le lecteur ferme aussi sa fenêtre au 1er janvier du millésime de fin, et le dernier est 2023 : 62 071 des 116 890 lignes gardées (53 %) ne sont lues par aucune cohorte aujourd'hui.

## Décidé par Ivan le 13 octobre 2026, après la revue de #272

- **A. Les lignes postérieures au dernier millésime sont gardées.** Pas de borne haute. Les couper aurait libéré de l'ordre de 12 Mo de plus, mais un millésime ajouté aurait lu un stock tronqué jusqu'au vendredi suivant. S2 seule ramène déjà les pics sous le seuil.
- **B. La garde est appliquée** : l'invariant **I57** de `eval/invariants.sql`, joué chaque matin par la porte. Il rougit quand le stock n'a aucun établissement daté de la première année de la plus ancienne cohorte, autrement dit quand la borne du chargeur n'a pas suivi `bdcom_vintage`. Vérifié le 13 octobre 2026 : 0 ligne sur la base, et 1 ligne (le rouge) en retirant dans une transaction annulée les 11 246 établissements de 2017. Il ne voit qu'une année vide, pas une année amputée : c'est écrit dans son en-tête.

## Reste à décider le 17 octobre 2026, avec la mesure

Fusionner #272 ou non. C'est la suppression elle-même, réversible par rechargement.

## Critère de sortie

`npm run disque` sans rouge, et sans signal pour BDCom ni filosofi, mesuré après le passage SIRENE qui suit la réduction.

## Ce que ça ne rattrape pas

`disque` estime un pic en ajoutant le travail d'un chargeur à la base. Il ne déduit pas la place libre déjà présente dans les fichiers de la table rechargée, que ce chargeur réutilise. Pour SIRENE stock et BODACC, le pic est donc surestimé en régime établi. Cette limite figure déjà dans le bloc `bodacc` de `disque.json`.
