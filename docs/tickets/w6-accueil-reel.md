# [P1] w6-accueil-reel — L'accueil de la démo, sur le vrai corpus

**ID** `w6-accueil-reel` · **vague 6** · **P1** · **Phase 1.A du handoff**
**Dépend de** — *rien ; le design est tranché*
**Sources** — *aucune source nouvelle : une fonction construite, chargée, et lue par personne*

> **Décidé par Ivan le 5 octobre 2026** : *« Ces écrans-là, sur les vraies données, dans ce dépôt,
> c'était bien mon objectif. Un travail important, long et fastidieux a été réalisé, il faut
> maintenant le valoriser. »*

## Pourquoi celui-ci d'abord

`docs/HANDOFF-1d.md` le dit : **« Phase 1 — showable, all real. The portfolio screenshots come
from here. »** La démo publiée a tranché l'apparence de cet écran ; elle tourne sur un jeu figé
de 810 Ko. Ce ticket pose la même apparence sur le corpus.

**Et il valorise une fonction que personne ne lit.** Mesuré le 5 octobre 2026 au `grep` sur `src/`
et `mcp-server/src/`, types et tests exclus : **`compass_bodacc_within` a zéro consommateur**.
Elle est construite, la source BODACC est chargée, et le fil de signaux que la démo affiche —
cessions et procédures collectives dans 400 m — n'a aucun code qui le serve ici.

La démo montre du BODACC figé pendant que le dépôt sait servir le vrai.

## Ce que le handoff impose, bloc par bloc

| Bloc | Étiquette | Ce que ça veut dire ici |
| --- | --- | --- |
| Recherche + accroche « Avant de signer un bail, lisez la rue. » | — | accroche encore provisoire |
| Métier demandé en ligne, passable (« Juste regarder ») | **servi** | lit `src/lib/tradeMode.ts` |
| Adresses récentes | **servi** | `localStorage` |
| Fil de signaux — cessions et procédures BODACC | **servi** | `compass_bodacc_within`. **Chaque entrée porte son niveau de confiance** : BODACC nomme une adresse, pas un local |
| Fil de signaux — fermetures Sirene | **à construire** | aucun écran ne lit les fermetures Sirene. Hors de ce ticket : soit un ticket propre, soit retiré du fil |

## Doctrine

**Un chiffre affiché porte sa source**, et un signal BODACC porte en plus **sa réserve** : l'annonce
nomme une adresse et parfois un siège social, jamais une boutique. La démo l'écrit déjà — *« Siège
social : ce n'est pas nécessairement une boutique »* — et cette phrase n'est pas décorative, elle
est la raison pour laquelle le fil ne ment pas.

**Aucun chiffre écrit en dur.** Les distances, les dates et les compteurs viennent de la fonction,
jamais du composant.

## Fait quand

1. **L'accueil rend le fil de signaux depuis `compass_bodacc_within`**, pour l'adresse de référence,
   avec distance et date lues de la base.
2. **Chaque entrée porte son niveau de confiance et sa réserve**, et la population des réserves est
   dérivée — pas une phrase recopiée par entrée.
3. **Zéro station, zéro signal, source injoignable sont trois états distincts**, chacun nommé par
   son motif. Un fil vide n'est pas une panne, et une panne n'est pas un fil vide.
4. **Le visiteur anonyme reçoit ce qu'il doit recevoir** : un contrôle le joue en `anon`, pas avec
   une clé privilégiée.
5. **Aucune chaîne affichée n'est écrite hors des tables d'i18n** — sinon `servi` ne la voit pas
   (#217).
6. **L'ancien accueil est remplacé, pas doublé** : `pages/Index.tsx`, `HomeContent.tsx` et
   `home/HeroOverlay.tsx` ne coexistent pas avec le nouveau.

**Ce que ça ne rattrape pas.** BODACC publie des annonces légales : il voit une procédure déclarée,
jamais un rideau baissé sans procédure. Un commerce qui ferme sans publier n'apparaîtra pas, et le
fil ne doit pas laisser croire le contraire.

## Hors périmètre

Pas de fermetures Sirene. Pas de carte sur l'accueil — `w6-contexte` a tranché l'inverse. Pas de
compte utilisateur.

Voir `docs/HANDOFF-1d.md` § Phase 1.A.
