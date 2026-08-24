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

---

## Fait le 24 août 2026 — les six outils, exercés contre le distant

`npm.cmd run verify:mcp`, deux passages mesurés le 24 août contre `dbefhvmyfmmhjeetdddu`,
**0 en échec** dans les deux :

| Passage | Total | Au vert | Échec | Suspendus | Défaut connu |
| --- | --- | --- | --- | --- | --- |
| Overpass répond | **36** | 35 | **0** | 1 | 0 |
| Overpass rend 429 / 504 | **33** | 30 | **0** | 2 | 1 (§16) |

**Le total n'est pas fixe, et c'est voulu.** La famille `PROVENANCE` tombe de cinq assertions à
deux quand la couche d'aménités n'est jamais arrivée : affirmer la provenance de chiffres qui
n'ont pas été calculés serait un vert qui ne représente rien. **Lire le `0 en échec`, pas le
total** — c'est aussi pour ça que le second passage est plus instructif que le premier, puisque
c'est lui qui a rendu `E11` en `défaut` et non en `panne`.

Un défaut trouvé en chemin, qui demande une décision, a son issue :
[**#55**](https://github.com/IvandeMurard/paris-compass/issues/55) — `DIAGNOSTIC.md` §16.

**Ce ticket ne redit aucune section de `docs/PLAN.md`.** §4.1 décrit le serveur MCP et ce qu'il
expose ; il ne dit rien de sa vérification. C'est le premier ticket de la vague 0 dans ce cas —
`w0-deploy`, `w0-provenance` et `w0-fiche` redisaient tous une section existante. §4.1 portait
en revanche un chiffre périmé, « les quatre outils », alors qu'il y en a six depuis le 17 août :
corrigé là-bas, et pointé sur la porte écrite ici.

### Les chiffres d'entrée, remesurés

Les cinq lignes du tableau « trois trous qui se cumulent » ont été rejouées le 24 août avant le
chantier. **Les cinq étaient exactes**, et une manquait :

| Affirmation du ticket | Remesuré |
| --- | --- |
| `tsconfig.json` ne référence que `tsconfig.app.json` et `tsconfig.node.json` | **exact** |
| aucun test ne touche `mcp-server/` | **exact** — les sept fichiers de test sont tous sous `src/` |
| `smoke-test.ts` n'est câblé à aucun script npm | **exact** |
| `provenance-check.ts` lancé à la main | **exact** |
| typecheck du MCP à `exit 0` | **exact**, rejoué |
| *(absent du ticket)* | **`scripts/` n'est pas typechecké non plus** : `tsconfig.app.json` porte `include: ["src"]`, `tsconfig.node.json` `include: ["vite.config.ts"]`. Les quatre chargeurs d'ingestion et les deux bras de la porte ne passent sous aucun `tsc`. |

Et un écart en sens inverse, qui rendait le ticket **plus vrai qu'il ne le disait** : le
`tsconfig.json` de `mcp-server/` inclut `../src/core/**/*.ts` sous `strict: true` et
`noUnusedLocals`, quand `tsconfig.app.json` compile ce même noyau en `strict: false`. Le
typecheck que rien n'appelait était donc le **plus sévère des deux** sur le code partagé.

Le reste de l'état de départ, remesuré le 24 août : `tsc --build` sans erreur, **96 tests sur
sept fichiers**, ledger distant à **27** migrations, `20260824000002` comprise.

### 1. Inventaire — aucun écart entre `index.ts` et `README.md`

Les six outils enregistrés, leurs paramètres lus sur le schéma que le serveur publie
réellement, contre les six lignes du tableau du `README.md` : **identiques**. Tenu par
`T1`–`T3`, qui échouent si un outil apparaît, disparaît, change de paramètres ou perd sa
description.

### 2. Chaque outil contre le distant, et la provenance de la couche lue

`dbefhvmyfmmhjeetdddu`, appelant **anonyme** — clé publiable, jamais de clé de service, c'est la
frontière de confiance `I11`. Montorgueil (48,8657 · 2,3459), rayon 800 m :

| Champ | Valeur | `source` | `asOf` |
| --- | --- | --- | --- |
| schools, healthcare, groceries, parks, transit, walkability, noise | 100, 99, 100, 99, 100, 100, 51 | `OpenStreetMap via Overpass` | `2026-08-24` — le jour de la requête |
| **footfall** | **97** | **`APUR BDCom 2023 + OpenStreetMap via Overpass`** | **`2023-06`** — la date du recensement |

C'est le critère de `w0-provenance` tenu sur les six outils et non sur `explain_score` seul : le
champ qui lit deux couches les nomme toutes les deux, et il porte la date du relevé BDCom,
jamais celle de la requête. Une date de recensement remplacée par la date d'appel serait le
loyer fabriqué sous sa forme temporelle. Épinglé par `P4`/`P5`.

### 3. Le chemin anonyme — la retenue de licence, et le piège du libellé

`score_location` sur les millésimes retenus, `trace_premise` sur le local **46393**,
`10 RUE MANDAR` :

| Millésime | `withheld` | `observed` | `label` | Confiance |
| --- | --- | --- | --- | --- |
| 2017 | `true` | **`null`** | **`null`** | indéterminé |
| 2020 | `true` | **`null`** | **`null`** | indéterminé |
| 2023 | `false` | `true` | « Restaurant asiatique » | établi |

Et sur les scores : `footfall` revient `value: null` avec sa raison pour 2017 et 2020, **jamais
zéro**, la retenue nommée comme telle dans `context_failures`.

**Le piège tenu, et vérifié dans les deux sens.** `L5` échoue si une ligne retenue porte le
moindre `label`, `activity_code`, `detail` ou `amount_eur` — c'est la définition mécanique de
« pas de coalesce sur le libellé ». `L6` est le contre-test : il échoue si le millésime ODbL
perd son contenu, parce qu'un correctif trop zélé sur le silence détruirait ce qu'un appelant
anonyme a le droit de recevoir. Les deux ensemble, jamais l'un seul.

`L4` sépare `observed = null` de `observed = false` : c'est la règle que `#51` a posée côté
base, tenue ici côté agent. `false` est une réponse positive, indiscernable d'un relevé réel.

### 4. Les modes de panne — quatre, pas deux

| Mode | Comportement | Contrôle |
| --- | --- | --- |
| Point hors boîte (Lyon), rayon 999 999 m, rayon négatif, millésime 2011, rayon 501 m sur `find_premises`, métrique inconnue | refus zod avant tout appel réseau | `E1`–`E6` |
| **Base injoignable** | `list_sources`, `find_premises` et `trace_premise` **nomment la fonction** qui n'a pas répondu ; `score_location` garde ses champs OpenStreetMap et retire `footfall` | `E7`–`E9` |
| **Miroir Overpass injoignable** | rencontré **en vrai** pendant la session — 504 sur les trois miroirs — rapporté en `context_failures`, aucun champ rendu à zéro | `P1`, et le statut `panne` |
| Point hors corpus | **défaut §16**, ci-dessous | `E10`–`E11` |

Le mode « base injoignable » est déterministe : `verify.ts` relance un second serveur sur
`https://unreachable.invalid`, réservé par la RFC 2606. Il s'exerce donc à chaque passage, sans
dépendre d'une panne réelle — contrairement au mode Overpass, qui ne peut être que constaté.

**Un écart de délai, corrigé au passage.** `overpass.ts` abandonne un miroir à 70 000 ms, mais
le délai par défaut du SDK MCP est de **60 000 ms** — plus court que la patience du serveur.
Une réponse arrivant à 65 s produisait donc un dépassement côté client au lieu du résultat ou de
la panne honnête. `verify.ts` et `smoke-test.ts` posent tous deux un délai explicite plus long.

### Les deux écarts trouvés

**1. Le `README.md` du serveur annonçait une limitation levée.** Sa section « What this does not
cover yet » affirmait que chaque champ cite `OpenStreetMap via Overpass` même quand la couche
vient de BDCom, et que corriger « affects the browser too — flagged for a separate change ». Ce
changement séparé, c'est `w0-provenance` (#10), **fait le 24 août au matin**. Le paragraphe
décrivait donc un défaut corrigé quelques heures plus tôt. **Corrigé**, et la mesure du jour
mise à sa place.

**2. `DIAGNOSTIC.md` §16 — un point hors corpus scoré comme un quartier sans commerces.**
Ouvert en [#55](https://github.com/IvandeMurard/paris-compass/issues/55) plutôt que corrigé : le
correctif demande de trancher entre resserrer la boîte de coordonnées, retirer la couche quand
elle rend zéro ligne, ou interroger PostGIS sur les 80 quartiers. Mesuré à (48,7 · 2,2) —
Massy — où `find_premises` rend honnêtement zéro local et `score_location` rend malgré tout
`footfall: 22`, cité « APUR BDCom 2023 », sur zéro local BDCom lu.

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `mcp-server/src/verify.ts` | Les contrôles, en quatre familles. Assène, n'imprime pas. |
| `scripts/verify-mcp.mjs` | Orchestrateur : typecheck strict, build esbuild, exécution. Contourne `tsx`, qui ne démarre pas sur cette machine. |
| `package.json` | `verify:mcp` et `smoke:mcp`, deux lignes. |
| `mcp-server/src/smoke-test.ts` | Réparé : lance le bundle au lieu de `npx tsx`, et pose un délai plus long que l'abandon Overpass du serveur. **Il tourne pour la première fois.** |
| `mcp-server/README.md` | La section périmée corrigée, les deux scripts documentés, le contournement `tsx` écrit. |
| `DIAGNOSTIC.md` | §16. |
| `docs/PLAN.md` | §4.1 : « quatre outils » corrigé en six, et la porte pointée. |
| `docs/SESSIONS.md` | Les portes à lancer avant de pousser, dans le prompt commun. |

**Pourquoi `verify.ts` et non le smoke test câblé.** Le ticket demande « un script npm qui lance
le typecheck du MCP et le smoke test ». `smoke-test.ts` **imprime** et sort 0 tant que rien ne
lève : câblé tel quel, il aurait posé une porte qui reste verte pendant que chaque chiffre ment.
C'est exactement le piège que le « Comment » de ce ticket nomme — figer l'état présent comme
référence. Le smoke test reste, réparé et câblé sous `smoke:mcp` comme **lecture** ; la porte
est `verify:mcp`. C'est un écart assumé au libellé du ticket, pas à son intention.

**Et les défauts connus ne sont pas gelés comme corrects.** `E11` consigne §16 en `défaut` —
rapporté, non fatal — et **passe au rouge si le défaut disparaît**, pour qu'un correctif ne
puisse pas laisser `DIAGNOSTIC.md` et `#55` derrière lui.

### Ce qui reste, et qui n'était pas dans le critère

- **`provenance-check.ts` n'est toujours câblé à rien.** Ses assertions sont couvertes par
  `P1`–`P5` de `verify.ts`, sur les six outils au lieu d'`explain_score` seul — il est donc
  redondant plutôt que manquant. Le supprimer ou le câbler demande un arbitrage, laissé ouvert.
- **Le `typecheck` de la racine ne référence toujours pas `mcp-server/`.** C'est `verify:mcp`
  qui appelle le typecheck du MCP, pas `tsc --build`. Les faire converger demande de passer
  `mcp-server/tsconfig.json` en `composite: true`, ce qui change la façon dont le paquet se
  compile — hors périmètre d'un ticket de vérification.
- **`scripts/` reste hors de tout typecheck.** Trouvé en chemin, non corrigé, non ouvert en
  ticket : c'est une ligne d'`include` à ajouter, mais elle ferait apparaître des erreurs dont
  personne n'a mesuré le nombre. À instruire avant de promettre.
- **Aucun contrôle ne tourne tout seul.** `verify:mcp` est lancé par une session, pas par un
  cron. C'est `w0-cron` (#6), et le dépôt n'a toujours **aucun `.github/workflows/`** — mesuré
  le 24 août, seul `ISSUE_TEMPLATE/` existe.
