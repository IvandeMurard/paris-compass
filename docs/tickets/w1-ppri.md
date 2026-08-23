# [P1] w1-ppri — PPRI en zonage, pas en booléen

**ID** `w1-ppri` · **vague 1** · **Q3 2026** · **P1**
**Dépend de** `w0-fiche`
**Sources** `georisques`

## Pourquoi
« Inondation : présent dans 1 km » est vrai presque partout à Paris, donc muet.

## Comment
Trois couches côte à côte : zone PPRI transcrite ; ce que le règlement impose au RDC (informatif) ; implication métier en derived (cave vs prêt-à-porter). Remontée de nappe BRGM à part. CatNat commune écartée (uniforme).

## Doctrine
Transcrire les classes du régulateur. Ne pas fondre PPRI + nappe + CatNat en un « risque 3/4 ».

## Fait quand
Un local berge (zone bleue) et un local du 20e (hors zone) ne reçoivent plus le même verdict.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
