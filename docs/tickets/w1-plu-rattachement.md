# [P1] w1-plu-rattachement — Rattacher un linéaire PLU aux tronçons qu'il longe, pas au premier trouvé

**ID** `w1-plu-rattachement` · **vague 1** · **P1** · **avant le passage PLU du 9 mars 2027**
**Dépend de** — #244 (plu n'écrit que ce qui change, départage par identifiant de tronçon)
**Sources** — PLU bioclimatique (linéaires de protection commerciale), BD TOPO (tronçons)

## Pourquoi

`scripts/ingest/plu.ts` rattache chaque linéaire de protection au **seul** tronçon de rue le plus proche, puis marque protégés les locaux de ce tronçon. Mesuré le 10 octobre 2026 sur le distant, dans une transaction annulée :

- **2 519 linéaires sur 5 107 (49 %)** sont à égalité, à 0 m, avec plusieurs tronçons, jusqu'à 13. Le linéaire longe un tronçon et touche ses voisins par les extrémités.
- Jusqu'à #244, `distinct on … order by distance` gardait la première ligne à égalité dans l'ordre physique. Le `VACUUM FULL` du 6 octobre a changé cet ordre : sans que la source bouge, **13 424 locaux** différaient de ce qu'un passage aurait calculé.
- #244 départage par identifiant de tronçon. Le choix est désormais reproductible, mais pas juste : il peut retenir le tronçon voisin plutôt que celui que le linéaire longe.
- Le nombre de locaux protégés dépend de la règle :
  - 29 481 aujourd'hui en base ;
  - 28 374 avec le départage par identifiant ;
  - 34 659 si l'on départage par la distance au milieu du linéaire.

  L'écart est d'environ 20 %, sur une donnée que le produit affiche (`src/core/modes.ts`, `src/services/compass/addressCorpus.ts`).

Le seuil d'exclusion « tronçon le plus proche seulement » du 25 août reste juste : rattacher à tout tronçon à moins de 15 m surprotégeait d'un facteur 2,5. Le défaut tient au départage entre tronçons à égalité, pas à la tolérance.

## À faire

1. Mesurer une règle par **longueur de recouvrement** : un linéaire protège chaque tronçon qu'il longe sur une longueur significative (par exemple `ST_Length(ST_Intersection(ST_Buffer(lineaire, x), troncon))` rapporté à la longueur du tronçon), et non le tronçon qu'il touche seulement par une extrémité.
2. Comparer les trois règles sur un échantillon vérifié à la main contre la carte du PLU : quelques rues dont on sait quels côtés sont protégés.
3. Écrire la règle retenue dans `plu.ts`, et ce que le produit en dit là où il le dit (`src/i18n/modeText.ts`, contenu des arrondissements).
4. Mesurer par `plu.ts --dry-run` le nombre de locaux réécrits, et rechiffrer le bloc `plu` de `scripts/porte/disque.json` si la part de locaux protégés change.

## Critère de sortie

- Deux passages successifs sur la même source donnent le même résultat (déjà vrai depuis #244, à garder).
- Sur l'échantillon vérifié à la main, aucun tronçon touché seulement par une extrémité n'est protégé.
- Le nombre de locaux protégés est consigné avec sa date, et ce que la règle ne rattrape pas est écrit.
