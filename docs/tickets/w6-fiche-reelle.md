# [P1] w6-fiche-reelle — La fiche d'adresse, le seul écran que la démo n'a pas tranché

**ID** `w6-fiche-reelle` · **vague 6** · **P1** · **Phase 1.B du handoff**
**Dépend de** — *une décision de design, pas d'un ticket*
**Sources** — *aucune*

## Pourquoi il attend, et ce qu'il attend

Mesuré le 5 octobre 2026 sur la démo publiée : elle couvre l'accueil, Méthode, Apprendre et Kit.
**Elle ne couvre pas la fiche d'adresse** — cliquer une adresse récente ne mène nulle part, et
`npm.cmd run page` obtient *« Adresse absente de cette démo »*.

**Or la fiche est le produit.** C'est elle qui porte le verdict composé, les six constats avec
leur source et leur licence, les trois métiers, la raison de chaque axe de tête, la forme de la
journée, le dossier téléchargeable et l'appel pour agent.

**C'est donc le seul écran sur lequel il reste à dépenser des crédits Lovable** — et c'est la
raison pour laquelle ce ticket ne doit pas être lancé avant que son apparence soit tranchée :
l'implémenter deux fois coûterait deux sessions au lieu d'une.

## Ce que le design devra respecter, et qui n'est pas négociable

Ces propriétés sont livrées et mesurées ; une refonte qui les perdrait serait une régression.

- **Un chiffre affiché porte sa source**, sa licence, son millésime et sa méthode. Deux figures de
  la même page peuvent porter **deux licences différentes** — la desserte ferrée est en Licence
  Ouverte, la forme de la journée en ODbL, et les confondre lierait un redistributeur à une
  obligation fausse.
- **Une réserve ne vit jamais au survol** : elle ne survit ni à un écran tactile, ni à une lecture
  à voix haute.
- **Un ordre affiché porte sa raison**, et la raison porte son statut — mesuré, mesurable, ou
  arbitrage (`#197`).
- **Un refus nommé n'est pas une page vide** : quand une source est injoignable, la fiche dit
  laquelle et pourquoi plutôt que d'inventer un verdict.
- **Le dossier téléchargeable descend chaque chiffre avec sa formule et ses opérandes.**

## Fait quand

1. **La fiche rend l'apparence tranchée**, sur le corpus, sans qu'aucune des cinq propriétés
   ci-dessus ne soit perdue — chacune vérifiée, pas relue.
2. **`npm.cmd run page` rend un verdict composé** contre le site publié, pas un refus.
3. **La parité tient** : le serveur MCP rend la même composition, et `verify:mcp` le prouve.
4. **Aucune chaîne affichée hors des tables d'i18n** (#217).

**Ce que ça ne rattrape pas.** Une fiche plus belle ne rend pas ses chiffres plus vrais, et ce
ticket ne touche à aucun calcul.

## Hors périmètre

Pas de changement de `src/core/`. Pas de nouvel axe, pas de nouveau constat. Pas de lancement tant
que l'apparence n'est pas tranchée dans la démo.

Voir `docs/HANDOFF-1d.md` § Phase 1.B.
