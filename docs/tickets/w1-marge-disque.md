# [P1] w1-marge-disque — Rendre au disque une marge que les rechargements ne reprennent pas

**ID** `w1-marge-disque` · **vague 1** · **P1** · **avant le passage BDCom du 5 janvier 2027**
**Dépend de** — #239 fermé le 10 octobre 2026 ; mesure du passage SIRENE du 16 octobre 2026
**Sources** — SIRENE stock, BODACC, BDCom

## Pourquoi

#239 a tenu son critère : plus aucun chargeur ne gonfle son tas au-delà de ×1,3. Mais après la compaction du 6 octobre, les **index** se sont regonflés jusqu'à leur régime d'équilibre, et c'est cette place que la base ne rend plus. Le `REINDEX CONCURRENTLY` du 8 octobre a été repris dès le passage suivant.

Mesures du 10 octobre 2026, sur le distant et en lecture seule :

- **Base** : 399,8 Mo Postgres, soit 440 Mo au tableau de bord (rapport 1,1018), pour un plafond de 500. Elle était à 368,7 Mo le 8 octobre.
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

## Critère de sortie

`npm run disque` sans rouge, et sans signal pour BDCom ni filosofi, mesuré après le passage SIRENE qui suit la réduction.

## Ce que ça ne rattrape pas

`disque` estime un pic en ajoutant le travail d'un chargeur à la base. Il ne déduit pas la place libre déjà présente dans les fichiers de la table rechargée, que ce chargeur réutilise. Pour SIRENE stock et BODACC, le pic est donc surestimé en régime établi. Cette limite figure déjà dans le bloc `bodacc` de `disque.json`.
