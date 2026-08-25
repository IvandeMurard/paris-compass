# [P0] w0-retenue — La règle de retenue, rendue mécanique — et `compass_street_rotation`, sa 5ᵉ victime

**ID** `w0-retenue` · **vague 0** · **P0**
**Dépend de** —
**Bloque** la fermeture de l'épic vague 0 (#41)
**Sources** — *aucune source nouvelle*

## Pourquoi

**Ce ticket n'est pas « corriger une cinquième fonction ». C'est « faire en sorte qu'il n'y ait
pas de sixième ».** Corriger `compass_street_rotation` seule reproduirait exactement le défaut
que `DIAGNOSTIC.md` §20 vient de nommer : réparer la donnée sans laisser la règle derrière.

La règle existe depuis le 9 août — *une fonction qui traverse `premise_observation` doit annuler
son propre contenu sur un millésime retenu, et ne jamais compter sur RLS pour l'avoir fait*.
Elle a été **réécrite quatre fois à la main**, une paire d'invariants par fonction :

| Fonction lisant `premise_observation` | Paire d'invariants | Occurrence |
| --- | --- | --- |
| `compass_address_timeline` | `I9`/`I10` | §9 |
| `compass_scoring_context_within` | `I12`/`I13` | §10 |
| `compass_premises_within` | `I14`/`I15` | §11 |
| `compass_premise_history` | `I16`/`I17`, puis `I18` | §10, §12 |
| **`compass_street_rotation`** | **aucune** | **§19 — celle-ci** |
| `compass_bodacc_within`, `compass_vintages`, `compass_source_freshness` | **aucune** | non examinées |

*Mesuré le 25 août par comptage des occurrences dans `eval/invariants.sql`.*

Quatre implémentations de la même règle, zéro expression de la règle. Chaque nouvelle fonction
naît fausse et n'est rattrapée que si quelqu'un regarde. La cinquième a été trouvée en écrivant
`w1-survie` — par accident, pas par un contrôle.

**Le défaut lui-même**, mesuré aux Halles, rayon 300 m (`DIAGNOSTIC.md` §19) :
un appelant privilégié voit 2017, 2020 et 2023 et `changed_since_previous = 78` ; un appelant
anonyme voit 2023 seul et **`0`**, sans marqueur. Zéro est une réponse positive : le taux de
rotation est rendu comme un fait alors qu'il est le résidu d'une retenue.

## Comment

**Dans cet ordre, et la partie 2 est le livrable.**

1. **Corriger `compass_street_rotation`** sur le patron déjà écrit quatre fois : lire
   `request.jwt.claims`, exposer la retenue, ne pas s'appuyer sur RLS. Migration, puisque le
   type de retour change. Le couple d'invariants qui va avec — l'un contre la fuite, l'autre
   contre la retenue excessive — comme `I16`/`I17`.

2. **Écrire la règle une fois pour toutes.** Un invariant de recensement qui **énumère** depuis
   le catalogue (`pg_proc`, `pg_depend`) toute fonction `compass_*` lisant `premise_observation`,
   et échoue si l'une d'elles n'est pas couverte par un test de retenue. Alors la sixième
   fonction ne peut plus naître sans qu'on le sache — c'est ça, la règle qui survit au
   rechargement et au changement de consommateur.

3. **Traiter les trois non examinées** — `compass_bodacc_within`, `compass_vintages`,
   `compass_source_freshness`. Le recensement de l'étape 2 les fera sortir de lui-même. Chacune
   est soit corrigée, soit déclarée hors périmètre **avec sa raison écrite**, jamais laissée en
   silence.

## Doctrine

Corriger une donnée n'est pas corriger un défaut. La règle vit là où la valeur est produite —
dans la fonction, pas dans l'écran, pas dans le front, pas dans le MCP qui l'appelle.

Zéro n'est pas une absence. `withheld` n'est pas vide. Et un taux calculé sur un sous-ensemble
retenu n'est pas un taux : c'est un artefact de licence, qui doit se nommer comme tel.

## Fait quand

Trois choses, et la deuxième est celle qui compte :

1. Un appel anonyme sur `compass_street_rotation` aux Halles ne rend plus `0` sans marqueur,
   mais une retenue nommée. Le couple d'invariants passe, éprouvé contre un sabotage dans
   chaque sens comme l'a été `I16`/`I17`.
2. **Un invariant de recensement échoue si l'on ajoute une fonction `compass_*` lisant
   `premise_observation` sans test de retenue.** Démontré en en ajoutant une pour de faux, dans
   une transaction annulée : la porte doit passer au rouge.
3. Les trois fonctions non examinées ont chacune un verdict écrit — corrigée, ou hors périmètre
   avec sa raison.

Et, comme pour `I22` : **dire ce que la règle ne rattrape pas.** Elle a toujours une limite.

Voir `DIAGNOSTIC.md` §19 pour la mesure, §20 pour la règle générale, §9 à §12 pour les quatre
occurrences précédentes.
