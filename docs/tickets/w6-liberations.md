# [P1] w6-liberations — Vue par défaut « ce qui se libère »

**ID** `w6-liberations` · **vague 6** · **Q4 2026** · **P1**
**Dépend de** `w0-fiche`, `w1-survie`
**Sources** `sirene`, `bodacc`, `dia`, `mapillary`

## Pourquoi
La promesse est l'amont de l'annonce. Elle n'est pas encore l'écran d'accueil.

## Comment
Sans adresse : cessations SIRENE, procédures BODACC, DIA si ouvertes, rideaux Mapillary. Avec adresse : la fiche. Jamais un stock d'annonces.

## Doctrine
Upstream. Absent sur cette couche ≠ rien à saisir — légender la couverture de chaque signal.

## Fait quand
L'ouverture de l'app sans requête montre des signaux de libération, chacun avec source et date, et une légende de couverture.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
