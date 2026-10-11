# [P1] w1-parite-axes-enumere — `verify:mcp` liste ses axes à la main, et la partition n'est affirmée nulle part

**ID** `w1-parite-axes-enumere` · **vague 1** · **P1**
**Dépend de** `w1-parite-refus`
**Sources** — *aucune source nouvelle*

> Trouvé le 15 septembre 2026 par la **revue** de [`PR #174`](https://github.com/IvandeMurard/paris-compass/pull/174).

## Pourquoi

`mcp-server/src/verify.ts` répartit les axes du scoring en deux listes **écrites à la main** —
`OSM_ONLY` (7 axes) et `CORPUS_SOURCE` (4), plus `footfall` traité à part. Les douze couvrent
exactement `AreaScores` aujourd'hui.

**Cette partition est complète au 15 septembre, et affirmée nulle part.** Rien ne rougit si un
axe neuf n'entre dans aucune des deux listes : il sortirait simplement de la population, et le
contrôle resterait vert sur un axe qu'il ne regarde plus.

**Le risque n'est pas théorique, il vient de se produire ailleurs.** `#169` a renommé trois axes
— `transit` → `rail`, `walkability` → `services`, `groceries` → `alimentaire` — et en a ajouté
un, `density`. Une liste tenue à la main traverse ce genre de changement sans bruit.

C'est la **question 2** du prompt de revue, celle que ce dépôt a déjà payée cinq fois :
`I23`/`I24`, `arms.ts`, `cadence.json`, `catalogue.json` et `observabilite.ts` dérivent tous leur
population. Une sixième règle qui listerait serait fausse au premier ajout.

## Comment

Dériver la partition au lieu de l'écrire : les axes viennent de `AreaScores`, leur source vient
de `VERDICT_AXES` — qui dit déjà, pour chaque axe, les couches qu'il lit. Un axe absent des deux
côtés doit **rougir**, pas disparaître.

**Ce qu'il ne faut pas faire** : compléter les deux listes à la main et passer à autre chose.
Elles seraient justes le jour où on les écrit, ce qui est exactement le défaut.

## Doctrine

**Énumérer, pas lister.** Une population dérivée dit la vérité au prochain ajout ; une population
écrite dit la vérité le jour où on l'écrit. La différence ne se voit jamais le jour même — elle
se voit le jour où quelqu'un ajoute quelque chose et que rien ne le signale.

## Fait quand

1. **La partition est dérivée**, et un axe qui n'appartient à aucun des deux côtés fait **rougir**
   `verify:mcp`.
2. **Contre-preuve jouée** : un axe neuf ajouté à `AreaScores` et à aucune liste → rouge ;
   rattaché → vert. L'arbre restauré après.
3. `npm.cmd run verify:mcp` reste au vert sur l'état courant, les douze axes couverts.

**Ce que ça ne rattrape pas.** La dérivation dira qu'un axe est **classé**, jamais qu'il est
classé **du bon côté** : un axe du corpus rangé en `OSM_ONLY` resterait vert. Séparer les deux
demanderait de lire les couches que l'axe interroge vraiment, ce qui est un cran plus loin que ce
ticket.

## Hors périmètre

Pas de reprise de la famille `PARITE` au-delà de cette partition — le classement d'un refus
impossible est [`#177`](https://github.com/IvandeMurard/paris-compass/issues/177), et les deux se
traitent bien ensemble mais ne se confondent pas.
