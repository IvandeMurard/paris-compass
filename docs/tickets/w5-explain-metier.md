# [P1] w5-explain-metier — explain_score métier-aware

**ID** `w5-explain-metier` · **vague 5** · **P1**
**Dépend de** `w0-provenance`, `w6-modes`
**Sources** —

> **Remonté de P2 à P1 et de la 58ᵉ à la 13ᵉ place, le 16 septembre 2026, décidé par Ivan.**
> La raison n'est pas que le ticket a grandi : c'est que `w6-modes` (#36) a donné **trois modes
> métier à l'écran et aucun à l'agent**. *« La même réponse, pour un agent »* est la promesse
> centrale du produit, et elle est fausse depuis cette livraison. Réparer une promesse qu'on
> vient de casser passe avant d'ouvrir une surface nouvelle.
>
> **La moitié du travail est déjà faite sans qu'on y ait touché** : `modeAxisOrder` vit dans
> `src/core/`, donc le serveur MCP l'atteint déjà. Ce qui manque est l'exposer et le démontrer.

## Pourquoi
Aujourd'hui l'outil explique un axe. Demain il dit ce qui compte pour CE métier.

## Comment
Pondération déclarée (cave à vins : calme + revenu 200 m ; kebab : flux midi). Pas de poids appris opaques.

## Doctrine
Le métier arbitre. Compass n'apprend pas un « bon emplacement » universel.

## Fait quand
explain_score(lat, lng, metric, trade) change l'ordre des phrases, pas les chiffres.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
