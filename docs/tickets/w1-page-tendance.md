# [P1] w1-page-tendance — Le bras mesure la durée de la page et la jette : rien ne verrait une dégradation lente

**ID** `w1-page-tendance` · **vague 1** · **P1**
**Dépend de** `w1-porte-page`
**Sources** — *aucune source nouvelle*

## Pourquoi

`npm.cmd run page` mesure le temps que met la fiche à rendre son verdict, l'imprime, et **ne le
garde nulle part**. Il ne rougit qu'au-delà de son délai. Entre les deux, il est vert et muet.

**État de départ, mesuré le 15 septembre 2026 :**

| | |
| --- | --- |
| Production, deux passages | **3 356 et 3 611 ms** |
| Build local, miroirs Overpass pendus | **573 à 1 115 ms** |
| Délai du bras | **14 000 ms** |

Une dégradation de 3,6 s à 9 s ne ferait donc **rougir personne**. C'est deux fois et demie plus
lent pour un visiteur, et la porte dirait que tout va bien tous les matins.

**Et c'est précisément le mode de panne qu'« itérer en continu » suppose de détecter** — décidé
par Ivan le 15 septembre 2026, après que la page est passée de 10 976 à 3 611 ms. Sans chiffre
gardé, l'intention n'a rien contre quoi itérer.

## Comment

**Le dépôt a déjà ce mécanisme, et il faut l'imiter plutôt que d'en inventer un.**
`eval/confidence_history.jsonl` garde un point par cible et par jour, écrit par
`scripts/eval/run.ts`, suivi par git ; la porte rapporte le delta contre le point précédent **et**
la tendance — « s'améliore » / « recule » / « stable ».

C'est un fichier suivi par git plutôt qu'une table du schéma, et pour la même raison ici : c'est
de la comptabilité d'évaluation, pas une donnée du domaine.

**Les deux mécaniques restent distinctes, comme pour la confiance** : le délai dit si on a dépassé
une borne fixe, l'historique dit si on s'en approche.

## Doctrine

**Un seuil dit « trop lent ». Une tendance dit « de plus en plus lent ».** Le dépôt a déjà appris
la différence sur la qualité des données — *« la baseline dit si on s'est écarté d'un instantané
fixe, l'historique dit si on avance »*. Le temps de réponse est la même chose, sur l'autre
surface.

**Et le seuil ne se monte pas pour éteindre une tendance**, pas plus qu'une tolérance de cadence
ne se monte pour éteindre un « EN RETARD ». Si la page ralentit, c'est la page qu'on corrige.

## Fait quand

1. **Chaque passage de `page` ajoute un point** — date, adresse, durée, et ce que la page a rendu
   (verdict ou refus, les deux n'ayant pas le même coût).
2. **La porte rapporte la tendance** au même endroit que le reste, avec le delta contre le point
   précédent.
3. **Contre-preuve jouée** : deux points fabriqués qui montrent un ralentissement produisent bien
   « recule », deux points stables « stable ».
4. `npm.cmd run test` et `npm.cmd run page` restent au vert, et **aucun script npm neuf** n'est
   ajouté — sinon `scripts/porte/cadence.json` lui doit une entrée.

**Ce que ça ne rattrape pas.** La mesure vient d'**une** adresse, depuis **une** machine, sur un
réseau qui varie — deux points consécutifs peuvent différer sans que le produit ait bougé. La
tendance ne vaut donc que sur plusieurs points, et le ticket de clôture doit dire à partir de
combien elle est lisible. Elle ne dira pas non plus **où** le temps est passé : les 3,6 s de
production contre 1,1 s en local sont du réseau et du chargement de bundle, et aucun point
d'historique ne les sépare.

## Hors périmètre

Pas d'optimisation dans ce ticket — il pose l'instrument, il ne rend rien plus rapide. Pas de
mesure multi-adresses, pas de découpage du temps par étape : ce serait un autre chantier, et
celui-ci doit rester assez petit pour être posé aujourd'hui.

Voir [`w1-porte-page.md`](./w1-porte-page.md) et [`w6-fiche-delai.md`](./w6-fiche-delai.md).
