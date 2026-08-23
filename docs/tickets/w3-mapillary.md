# [P0] w3-mapillary — Mapillary : rideau, pancarte, vitrine — observation datée

**ID** `w3-mapillary` · **vague 3** · **Q4 2026** · **P0**
**Dépend de** `w0-fiche`
**Sources** `mapillary`

## Pourquoi
Trou produit n°1. BDCom 2023 sans vacants, OSM shop=vacant mal tenu, SeLoger interdit. La rue est le seul fait public récent.

## Comment
Mapillary (CC-BY) + éventuellement IGN imagerie orientée. Classes fermées : rideau baissé, « à louer / à céder », vitrine vide, graffitis, terrasse. Sortie = observation + date + crop. 50 façades gold dans eval/. Sous le seuil → silence.

## Doctrine
« Façade au rideau baissé, cliché du 12 mars 2026 » n'est pas « vacant = true ». derived, jamais établi par le modèle seul.

## Fait quand
Gate : précision/rappel sur 50 façades annotées. Affichage uniquement au-dessus du seuil, avec la photo et la date.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
