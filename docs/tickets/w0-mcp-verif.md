# [P0] w0-mcp-verif — Le serveur MCP n'a aucune vérification automatique

**ID** `w0-mcp-verif` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** `w0-provenance` (#10, fait)
**Bloque** `w6-mcp` (#35)
**Sources** — *aucune source nouvelle*

## Pourquoi
`w0-provenance` a changé la signature de `scoreLocation` sous le serveur MCP, qui partage
`src/core/` avec le front. La session a trouvé au passage que **le serveur n'atteignait jamais
son miroir Overpass principal, et que rien ne le disait** (`9fbfda3`). Elle l'a trouvé en
regardant, pas parce qu'un contrôle a échoué — et c'est le problème.

**Mesuré le 24 août, trois trous qui se cumulent :**

| Ce qui devrait couvrir le MCP | Réalité |
| --- | --- |
| `npm.cmd run typecheck` à la racine | **ne le couvre pas** — `tsconfig.json` ne référence que `tsconfig.app.json` (`include: ["src"]`) et `tsconfig.node.json`. `mcp-server/` a son propre `tsconfig`, et son propre `typecheck` que rien n'appelle. |
| `npm.cmd run test` (73 tests) | **aucun ne touche `mcp-server/`** |
| `npm.cmd run eval` / `eval:anon` | portent sur la base, pas sur les outils MCP |
| `mcp-server/src/smoke-test.ts` | existe, exerce six outils, **n'est câblé à aucun script npm** — lancé à la main ou jamais |
| `mcp-server/src/provenance-check.ts` | contrôle ponctuel écrit pour `w0-provenance`, lancé à la main lui aussi |

Le typecheck du MCP passe aujourd'hui (`exit 0`, mesuré le 24 août depuis `mcp-server/`), mais
personne ne le saurait s'il cessait. Et `w6-mcp` (#35) prévoit de **publier** ce serveur : on ne
publie pas une surface que rien ne vérifie.

## Comment
**Analyse exhaustive d'abord, câblage ensuite.** L'ordre compte : câbler un contrôle sur un
serveur dont on n'a pas établi le comportement attendu fige l'état présent comme référence.

1. **Inventaire.** Les six outils exposés — `list_sources`, `score_location`, `explain_score`,
   `compare_locations`, `find_premises`, `trace_premise` — contre ce que `mcp-server/README.md`
   annonce et ce que `index.ts` enregistre réellement. Tout écart est un défaut, dans un sens
   ou dans l'autre.
2. **Chaque outil, contre le distant.** Réponse, forme, et surtout : la provenance citée est-elle
   celle de la couche lue ? C'est le critère de `w0-provenance`, et il vaut pour les six, pas
   seulement pour `explain_score`.
3. **Le chemin anonyme.** Le serveur doit respecter la retenue de licence comme le front : 2017
   et 2020 retenus, 2023 servi. Les défauts §9 à §12 de `DIAGNOSTIC.md` sont tous nés d'une
   fonction qui ne lisait pas son claim — vérifier qu'aucun outil MCP ne contourne la règle.
4. **Les modes de panne.** Miroir Overpass injoignable, base injoignable, point hors Paris,
   rayon absurde. Le défaut de `9fbfda3` était exactement ça : une panne silencieuse — 406
   sans `User-Agent`, suivi en [#52](https://github.com/IvandeMurard/paris-compass/issues/52).
   Ce ticket-ci existe pour que le prochain défaut de cette famille soit trouvé par un
   contrôle, pas par quelqu'un qui regardait.
5. **Puis câbler.** Un script npm à la racine qui lance le typecheck du MCP et le smoke test,
   et l'inclure dans ce qu'une session lance avant de pousser. Un contrôle qui existe sans être
   appelé n'existe pas — c'est ce ticket qui le démontre.

## Doctrine
L'agent est un ICP, pas un accessoire : même cœur, même traçabilité, même retenue de licence
que le navigateur. Un outil MCP qui cite une source qu'il n'a pas lue ment exactement comme un
chiffre affiché sans la sienne. Et un contrôle non câblé n'est pas un contrôle.

## Fait quand
Les six outils ont été exercés contre le distant et leur comportement est consigné — réponse
normale, chemin anonyme, et au moins deux modes de panne. Tout écart trouvé est soit corrigé,
soit ouvert en ticket. Un script npm lancé depuis la racine couvre le typecheck du MCP et le
smoke test, et `docs/SESSIONS.md` demande de le lancer avant de pousser.

Voir `mcp-server/README.md`, `docs/PLAN.md` §4.1, et [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md).
