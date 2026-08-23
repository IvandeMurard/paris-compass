# [P2] w7-inpi — Comptes INPI comme échantillon, jamais comme moyenne de rue

**ID** `w7-inpi` · **vague 7** · **2027** · **P2**
**Dépend de** `w5-parse`
**Sources** `inpi`

## Pourquoi
~45 % confidentiels, biais vers les plus gros. Utile borné, toxique si on en fait un CA de rue.

## Comment
« Parmi les 12 commerces du tronçon ayant publié 2024, médiane de CA X. 7 n'ont pas publié. Ce n'est pas une moyenne de rue. »

## Doctrine
Observation bornée, effectif nommé. Jamais « votre café fera X ».

## Fait quand
La phrase d'affichage refuse de se calculer si n < seuil, et cite toujours les non-publiants.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
