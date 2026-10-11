# [P1] w6-hubs-reels — Méthode, Apprendre et le pied de page, sur le vrai dépôt

**ID** `w6-hubs-reels` · **vague 6** · **P1** · **Phases 1.C, 1.D et 1.E du handoff**
**Dépend de** — *rien ; le design est tranché*
**Sources** — *aucune*

## Pourquoi

Le handoff découpe la Phase 1 en cinq écrans. La démo publiée a tranché l'apparence de **Méthode**,
**Apprendre** et du **pied de page** ; ils tournent sur un jeu figé. Ce ticket les pose sur le
dépôt.

**Ils composent des pages existantes, ils ne les remplacent pas** — `docs/HANDOFF-1d.md` § 1.3 est
explicite là-dessus, et c'est ce qui rend ce ticket petit : `Methodology.tsx`, `Faq.tsx`,
`Glossary.tsx`, `Guides.tsx` et `Sources.tsx` existent déjà et portent leur contenu.

## La contrainte qui n'est pas cosmétique

**Les formules de `src/core/scoring.ts` sont publiées sur la page Méthode**, et `CLAUDE.md` en fait
une règle : modifier l'une exige de mettre l'autre à jour. **Redessiner la page Méthode ne doit
donc rien retirer de ce qu'elle publie.** Une refonte qui rendrait une formule moins lisible
casserait la propriété centrale du produit — un lecteur doit pouvoir refaire le calcul.

Mesuré le 5 octobre 2026 : `servi` compte **121 jetons** venant de `src/pages/Methodology.tsx`.
C'est la page la plus bavarde du produit après les tables d'i18n, et chacun de ces jetons est une
chose qu'un lecteur peut vérifier.

## Fait quand

1. **Les trois surfaces rendent l'apparence de la démo** sur le contenu du dépôt.
2. **Rien de ce que Méthode publiait n'a disparu** — contrôle par recensement, pas à l'œil : les
   formules, leurs constantes et leurs opérandes sont toujours lisibles.
3. **Aucune chaîne affichée n'est écrite hors des tables d'i18n**, sinon `servi` ne la voit pas
   (#217).
4. **Les routes existantes répondent toujours**, dans les deux langues, et `servi` le prouve.
5. **`build` et `build:dev` passent tous les deux** — `lovable-tagger` n'est monté qu'en mode
   development, et une panne du lien Lovable serait sinon invisible.

**Ce que ça ne rattrape pas.** Une page plus belle n'est pas une page plus juste : ce ticket ne
vérifie pas que ce que Méthode publie est vrai, seulement que rien n'en a été perdu. La justesse
des formules appartient à `scoring.ts` et à ses tests.

## Hors périmètre

Pas de réécriture du contenu d'Apprendre — le handoff § 5 le prévoit, c'est un autre ticket. Pas
de nouvelle route. Pas de suppression de page.

Voir `docs/HANDOFF-1d.md` § Phase 1.C, 1.D, 1.E.
