# [P2] w5-parse — Extracteur BODACC / INPI (tuyauterie)

**ID** `w5-parse` · **vague 5** · **Q4 2026** · **P2**
**Dépend de** `w0-cron`
**Sources** `bodacc`, `inpi`

## Pourquoi
Le regex des prix est fragile. Activité, surface, prix, nature de l'acte se prêtent à un extracteur étiqueté derived.

## Comment
Modèle ou règles + LLM borné, rejeu possible, golden set dans eval/. Jamais un oracle de valorisation.

## Doctrine
IA de tuyauterie. La donnée extraite reste derived jusqu'à validation par champ structuré.

## Fait quand
Le gate d'éval couvre un échantillon de cessions ; les échecs restent n/a, pas 0 €.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
