# [P0] w0-deploy — Déployer le corpus sur la base hébergée

**ID** `w0-deploy` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** —
**Sources** `bdcom`, `bodacc`, `sirene`

## Pourquoi
Le chargement du distant **est fait depuis le 15 août** : `dbefhvmyfmmhjeetdddu` porte le schéma et les données, 85 418 locaux et 228 275 relevés mesurés sur place le 17 août, porte d'évaluation au vert (`docs/REPRISE.md`). Ce qui reste ouvert n'est pas le chargement mais le **retrait à l'anonyme** : que 2017 et 2020 sortent en `withheld` et non en zéro pour un visiteur sans clé.

## Comment
Poser `20260817000001_premises_within_withholding.sql` sur le distant — le ledger distant est à 24 migrations, `supabase/migrations/` en compte 25 — puis rejouer la porte en anonyme. Le reste (PostGIS, BDCom ×3, BODACC, SIRENE, géographie) est déjà en place.

## Doctrine
Rien n'est annoncé comme live s'il n'est pas interrogeable par un visiteur anonyme.

## Fait quand
Un appel anon PostgREST sur un point intra-muros renvoie des locaux 2023, et withheld (pas zéro) pour 2017/2020.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
