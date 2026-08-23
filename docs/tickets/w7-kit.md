# [P1] w7-kit — Kit ville — même cœur, BDCom substituable, confiance abaissée

**ID** `w7-kit` · **vague 7** · **2027** · **P1**
**Dépend de** `w7-foncier`
**Sources** `sirene`, `bodacc`, `osm`, `foncier`

## Pourquoi
La France entière est un refus. Un kit pour une ville qui a un recensement (CCI, observatoire, inventaire) est de la profondeur ailleurs, pas de la couverture.

## Comment
src/core/ inchangé. Swap BDCom → observatoire local, ou à défaut fichiers fonciers + SIRENE + BODACC + OSM. Abaisser les niveaux. Un Compass Lyon établi sur de l'OSM ment.

## Doctrine
Depth over breadth. Nommer le produit plus mince (signal, pas Compass complet) s'il n'y a pas de recensement de locaux.

## Fait quand
Un README kit : sources minimales, mapping de confiance, ce qui devient n/a hors Paris.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
