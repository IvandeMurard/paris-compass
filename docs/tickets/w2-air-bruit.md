# [P1] w2-air-bruit — Airparif + Bruitparif à la place des proxys

**ID** `w2-air-bruit` · **vague 2** · **Q4 2026** · **P1**
**Dépend de** `w0-provenance`
**Sources** `airparif`, `bruitparif`

## Pourquoi
Copernicus CAMS et le bruit modelé depuis les routes majeures sont trop lisses pour séparer deux rues.

## Comment
Mailles Île-de-France mesurées / modelées par les observatoires locaux. Une dimension par couche, jamais un indice unique air-bruit.

## Doctrine
Mesuré vs modelé, le mot exact. Si deux locaux de la rue ont le même niveau, on n'affiche pas la couche comme discriminante.

## Fait quand
Une rue canyon et une rue en retrait n'ont plus le même bruit ; la méthode cite Bruitparif, pas « major roads 500 m ».

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
