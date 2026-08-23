# [P0] w0-provenance — Provenance par champ, pas un Origin unique OSM

**ID** `w0-provenance` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** —
**Sources** `bdcom`, `osm`

## Pourquoi
Le MCP l'avoue : tout est étiqueté Overpass, même quand la couche vient de BDCom via Supabase.

## Comment
Changer la signature de scoreLocation pour un Origin par métrique. Front et MCP bougent ensemble — c'est le cœur partagé.

## Doctrine
Chaque figure porte source, licence, millésime, méthode, réserve.

## Fait quand
explain_score sur un local BDCom cite APUR, pas OSM, pour l'activité ; OSM reste sur les aménités.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
