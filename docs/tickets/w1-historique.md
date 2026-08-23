# [P0] w1-historique — bdcom20032020 : porter l'historique de six à vingt ans

**ID** `w1-historique` · **vague 1** · **Q3 2026** · **P0**
**Dépend de** —
**Sources** `bdcom`

## Pourquoi
Le corpus voit trois millésimes — 2017, 2020, 2023 — et 2023 n'a plus les vacants. Le service
APUR `BDCOM/bdcom20032020/MapServer` expose **sept couches datées de 2003 à 2020, vacants
inclus**, dont `bdcom_evolution20032020_vacants_date` : dix-sept ans d'évolution déjà calculés
à la source. `docs/PLAN.md` §5.9 le qualifie de « vraisemblablement le levier le plus élevé de
tout le corpus ». Section entière dans `docs/BDCOM.md` §6, et aucune entrée de backlog jusqu'ici.

Ce ticket précède `w3-mapillary` dans l'ordre de valeur. Mapillary comble 2023–2026 par de la
vision par ordinateur, sous seuil, avec un jeu doré à annoter ; celui-ci ouvrirait 2003–2020
avec les vacants, par une API que le projet sait déjà interroger.

## Comment
**D'abord la licence, avant toute ingestion.** Le service porte la mention « Ne pas supprimer »
et alimente l'application interne de l'APUR. Techniquement joignable n'est pas juridiquement
réutilisable : contrairement aux couches d'`opendata.apur.org`, celle-ci **ne porte aucune
licence explicite**.

1. ~~Vérifier si le courrier à `data@apur.org` est parti.~~ **Parti le 10 août 2026, sans
   réponse au 23 — relance à faire.** Ce ticket est **bloqué sur un tiers** : ne pas l'ouvrir
   en session tant que la réponse n'est pas arrivée. Le courrier porte aussi les deux autres
   questions de licence : couche 2023 complète avec les vacants, et sortie publique de 2017
   et 2020. Son texte n'est pas au dépôt — à consigner quand la réponse arrivera, pour qu'on
   puisse vérifier qu'elle répond bien aux trois.
2. Si la réutilisation est accordée : ingestion par l'**API REST paginée**, `outSR=4326`, comme
   les millésimes déjà chargés — voir `docs/BDCOM.md` §8 et les scripts existants. La licence
   se porte **comme donnée**, par millésime, ainsi que le fait déjà le corpus pour l'écart entre
   l'ODbL de 2023 et les licences personnalisées de 2017 et 2020.
3. Si elle est refusée ou sans réponse : écrire la note publique et **s'arrêter**.

Ne pas comparer les effectifs bruts entre millésimes sans périmètre commun — c'est le piège
qui transforme un −3 % réel en effondrement apparent de 27 % (`docs/BDCOM.md`).

## Doctrine
Si ce n'est pas juridiquement réutilisable, la piste s'arrête et on l'écrit. Même règle que
`w1-dia` : Compass ne se sert pas d'un flux parce qu'il répond. Une licence absente n'est pas
une licence permissive, et un retrait à l'anonyme est déjà la mécanique du corpus pour 2017 et
2020 — elle s'appliquerait ici telle quelle si la réponse est partielle.

## Fait quand
Soit les couches 2003–2020 sont ingérées avec leur licence portée par millésime et le retrait
qui en découle, et un local des Halles montre une chronologie qui commence avant 2017 ; soit
une note publique dans `docs/BDCOM.md` dit que la piste est close, avec la date de la demande
et la teneur de la réponse.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md) et `docs/PLAN.md` §5.9,
`docs/BDCOM.md` §6 et §7.
