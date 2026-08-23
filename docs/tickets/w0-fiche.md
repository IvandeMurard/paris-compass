# [P0] w0-fiche — Fiche locale + timeline dans l'interface

**ID** `w0-fiche` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** `w0-deploy`
**Sources** `bdcom`, `bodacc`

## Pourquoi
Le MCP a trace_premise ; le navigateur non. L'historique du local est le produit, pas un accessoire.

## Comment
Brancher compass_address_timeline sur la fiche. Chaque ligne : source, date, niveau, justification. observed=false → « non observé », jamais vacant ni « plus un commerce ».

## Doctrine
L'historique justifie le taux de rotation rapporté à la rue ; il ne le remplace pas.

## Fait quand
Un local des Halles affiche 2017 → 2020 → 2023 (ou withheld) + événements BODACC, sans coalesce sur le libellé.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
