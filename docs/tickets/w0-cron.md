# [P0] w0-cron — Ingestion planifiée + date de fraîcheur par source

**ID** `w0-cron` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** `w0-deploy`
**Sources** `bdcom`, `bodacc`, `sirene`

## Pourquoi
Les scripts sont idempotents mais rien ne les rejoue. Une date affichée sans rythme réel est le loyer fabriqué sous une autre forme.

## Comment
Job à privilèges élevés (GitHub Actions ou équivalent serveur), jamais la clé anon. Table générique (source, dernière exécution ok, n lignes). Cadences distinctes : SIRENE mensuel, BODACC continu, BDCom triennal, géographie rare.

## Doctrine
Afficher une date n'est honnête que si le rafraîchissement est réel ou déclaré.

## Fait quand
compass_* expose ingested_at pour BDCom, géographie, BODACC et SIRENE. Un cron a tourné au moins une fois sans intervention manuelle.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
