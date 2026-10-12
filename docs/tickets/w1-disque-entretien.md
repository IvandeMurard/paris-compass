# [P1] w1-disque-entretien — Le `VACUUM FULL` ne se fait que si quelqu'un y pense

**ID** `w1-disque-entretien` · **vague 1** · **P1**
**Dépend de** `w1-chargeurs-gonflement` (#239)
**Sources** — *aucune*

> **Demandé par Ivan le 12 octobre 2026**, après une opération faite à la main le jour même.

## Pourquoi

`#239` a réglé la cause : les chargeurs ne rechargent plus en bloc. La preuve est mesurée — entre
le 6 et le 12 octobre, la base n'a repris que quelques mégaoctets de gonflement, là où elle en
avait pris **571** avant le correctif.

**Mais Postgres ne rend jamais la place au système tout seul.** L'autovacuum rend l'espace
*réutilisable* ; seul un `VACUUM FULL` rend le fichier. Il faut donc, tous les deux ou trois mois,
refaire une opération manuelle — et le 12 octobre, elle n'a eu lieu que parce qu'Ivan a demandé
une mise à jour de l'état. **Le bras `disque` sait dire que c'est dû ; rien ne sait le faire.**

## Ce qui a été mesuré le 12 octobre 2026

Quatre rouges du bras `disque`, dont un chargement BODACC prévu le lendemain à 453 Mo contre un
seuil de 450.

| | Avant | Après |
| --- | ---: | ---: |
| Base (Postgres) | 400 Mo | **361 Mo** |
| Base (tableau de bord, ×1,1018) | 441 Mo | **398 Mo** |
| Rouges du bras | 4 | 1, à 27 jours |

**40 Mo repris, trois fois l'estimation.** L'estimation de gonflement comparait la taille *utile*
à `pg_relation_size`, qui ne compte **que la table, pas ses index**. Les index gonflent aussi et
`VACUUM FULL` les reconstruit. Reprises par table : `sirene_etablissement_stock` 94 → 74 Mo,
`bodacc_announcement` 52 → 44, `bodacc_judgment` 21 → 17, `filosofi_grid_200m` 4 → 1.

**Et un fait qu'il faut comprendre avant d'automatiser** : le `VACUUM FULL` du 6 octobre avait
laissé la base à 393 Mo ; celui du 12 la laisse à **361**, soit 32 Mo plus bas, alors que six jours
de chargements s'étaient écoulés entre les deux. **Un passage peut donc en laisser derrière lui.**
L'hypothèse — les index non repris par le passage du 6 — n'est pas vérifiée, et le ticket ne la
tient pas pour acquise : c'est la première chose à mesurer.

## Ce que l'opération exige, et qui ne se négocie pas

La procédure du `DIAGNOSTIC-CORRIGES.md` §62, rejouée le 12 octobre :

1. **Sauvegarde d'abord.** `pg_dump -Fc` des schémas `public` et `supabase_migrations`, par
   `docker run --rm postgres:17` — il n'y a pas de `pg_dump` natif sur ce poste.
2. **Vérifiée avant toute écriture.** Le compte de lignes de chaque table dans le fichier, contre
   `count(*)` au distant. Le 12 octobre : **29 tables sur 29, aucun écart**, fichier de 40,5 Mo.
3. **`VACUUM (FULL, ANALYZE)` table par table, de la plus petite à la plus grande**, en comptant
   les lignes avant et après chacune, et en **s'arrêtant à la première anomalie**. Verrous mesurés
   de 0,8 à 9,7 s.

**Une sauvegarde non vérifiée ne vaut pas une sauvegarde.** C'est la clause qui autorise tout le
reste : sans elle, un `VACUUM FULL` est une écriture en masse sans filet.

## La décision que ce ticket pose, et qu'il ne tranche pas seul

**Automatique ou une seule commande ?**

Un `VACUUM FULL` **verrouille la table en production**. Une minute de verrous cumulés pendant
laquelle la fiche rend un refus nommé — pas une erreur, mais pas une réponse. Le lancer depuis un
cron, c'est accepter ça sans que personne regarde.

**Et la sauvegarde vit sur le poste d'Ivan**, pas sur un coureur GitHub. Un bras planifié ne peut
donc pas remplir la condition n° 2, qui est précisément celle qui rend l'opération sûre.

**La recommandation de ce ticket est donc : une commande, jouée quand le bras le dit** — pas un
cron. Le bras `disque` sait déjà dire que c'est dû ; ce qui manque est de pouvoir répondre en une
ligne au lieu de trente minutes de procédure relue. La session peut trancher autrement, à
condition d'écrire comment elle satisfait la vérification de sauvegarde.

## Fait quand

1. **Une commande fait les trois étapes dans l'ordre**, et **refuse de vacuumer** si la
   vérification de sauvegarde ne passe pas — démontré en faisant échouer la vérification exprès.
2. **Un écart de compte de lignes arrête la suite** et laisse les tables non traitées intactes —
   démontré, pas supposé.
3. **Le gonflement est mesuré index compris**, pas seulement sur la table : c'est l'erreur
   d'estimation du 12 octobre, et elle donnait un facteur trois.
4. **La commande imprime ce qu'elle a repris, table par table**, avec la durée de chaque verrou.
5. **Rien n'est écrit dans la base avant que la sauvegarde soit sur le disque ET vérifiée.**
6. **Le bras `disque` dit quand c'est dû**, et la commande le rejoue à la fin pour montrer l'effet.

**Ce que ça ne rattrape pas.** L'entretien récupère le gonflement ; il ne récupère rien de la
**croissance**. BODACC s'ajoute chaque nuit, et le jour où sa croissance atteindra le plafond,
aucun `VACUUM` ne sauvera — il faudra décider ce que la base garde. Le bras sait déjà dater ce
jour-là ; ce ticket ne le repousse pas, il nettoie seulement ce qui est repris chaque fois.

## Hors périmètre

Pas de cron qui vacuumerait sans sauvegarde vérifiée. Pas de changement de seuil ni de plafond
dans `scripts/porte/disque.json` — le plafond est celui de Supabase. Pas de réduction de source :
c'est une décision d'Ivan, et elle est ailleurs.

Voir `DIAGNOSTIC-CORRIGES.md` §62 et `scripts/porte/disque.json`.
