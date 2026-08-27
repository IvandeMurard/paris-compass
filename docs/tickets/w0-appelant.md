# [P1] w0-appelant — `authenticated` est-il privilégié ? Trancher pendant que c'est gratuit

**ID** `w0-appelant` · **vague 0** · **P1**
**Dépend de** `w0-retenue` (#57), fait
**Bloque** rien, et c'est ce qui le rend dangereux à repousser
**Sources** — *aucune source nouvelle*

## Pourquoi

**Deux règles écrites le même jour ne disent pas la même chose, et personne n'a tranché.**

| | Qui est restreint |
| --- | --- |
| La politique RLS de `20260809000008` | `to anon, authenticated` |
| Le test d'appelant de `20260809000010` | tout ce qui n'est pas `anon` est **privilégié** |

Tant que les fonctions étaient `SECURITY INVOKER`, le désaccord produisait un défaut — RLS
retirait les lignes sous une fonction qui avait déjà conclu « rien n'est retenu »
(`DIAGNOSTIC.md` §12, puis §21). `w0-retenue` a corrigé le défaut en passant les six fonctions
en `SECURITY DEFINER`. **RLS ne protège donc plus rien : le test de claim est désormais la seule
porte**, et il dit qu'un appelant `authenticated` voit tout.

**Ce que ça donne aujourd'hui, mesuré le 25 août 2026 sur `dbefhvmyfmmhjeetdddu`** — local 54652,
millésime 2017, `set local role authenticated` :

| Fonction | Réponse à `authenticated` |
| --- | --- |
| `compass_premise_history` | `observed = true`, `is_vacant = true`, `Locaux Vacants` |
| `compass_address_timeline` | idem |
| `compass_survival_by_trade` | 310 / 268 / **86,5 %**, `withheld = false` |
| `compass_premises_within` (Halles, 800 m) | **4 773 locaux** |
| `compass_scoring_context_within` | **4 773**, `withheld = false` |

2017 et 2020 portent `publicly_redistributable = false` **parce que la licence APUR n'a pas été
lue**. Elle n'a pas été lue pour `authenticated` non plus. **Créer un compte n'est pas une lecture
de licence.**

### Ce que `w0-retenue` a changé, et qu'il faut dire précisément

Avant, `compass_premises_within(…, 2017)` rendait **0 ligne** à un appelant `authenticated` — RLS
les retirait, silencieusement et sans marqueur : c'était le défaut §21. Après, elle en rend
**4 773**.

Les **faits** accessibles n'ont pas changé : le même appelant les obtenait déjà local par local
via `compass_premise_history`. La **facilité d'extraction**, si — de 85 418 appels à un seul. Sur
une licence non lue, c'est une différence de nature, pas de degré. La correction a rendu
l'exposition explicite et intentionnelle là où elle était accidentelle et restrictive ; il faut
maintenant décider si elle est voulue.

### Pourquoi maintenant, et pas plus tard

**`auth.users` compte 0 utilisateur**, mesuré le 25 août 2026. La correction ne retire rien à
personne. Le jour où l'inscription s'ouvre — le produit porte déjà `saved_properties` et
`saved_searches`, donc c'est l'intention — la même correction retire des données à des gens qui
les avaient, et ça ne se fait plus sans discussion.

> **Tranché le 26 août 2026 par Ivan : `authenticated` n'est PAS privilégié.**
> La recommandation du point 1 est donc la décision. Consignée dans `docs/REPRISE.md`,
> section « Décisions qui ne se déduisent pas du code », avec sa raison et sa condition
> de révision — une réponse de l'APUR, et rien d'autre.

## Comment

1. **Trancher, et écrire la décision.** La recommandation est `authenticated` **non privilégié**
   jusqu'à réponse de l'APUR : le privilège reste au rôle de service et à toute connexion directe,
   c'est-à-dire à ceux qui exploitent Compass. Si la décision inverse est prise, elle doit être
   écrite avec sa raison — un partenaire sous accord n'est pas un inscrit.

2. **Une seule expression du test, et non six copies.** Le test de claim est aujourd'hui **recopié
   à l'identique dans les six fonctions**, sous un commentaire qui dit « copié verbatim pour
   qu'elles ne divergent pas ». C'est le défaut de `DIAGNOSTIC.md` §20 en miniature : une intention
   au lieu d'une garantie. Extraire `compass_caller_is_privileged()`, `stable`, et la faire appeler
   par les six.

3. **La règle derrière**, sur le patron de `I23` : un invariant qui échoue si une fonction
   `compass_*` autre que celle-là lit `request.jwt.claims` dans son corps. La septième fonction ne
   pourra plus recopier le test.

## Doctrine

Une licence non lue n'est pas lue pour tout le monde. La retenue ne se négocie pas contre une
inscription.

Et : deux règles qui se contredisent ne sont pas deux règles, c'est un défaut en attente. Celle-ci
a produit `DIAGNOSTIC.md` §12 puis §21 ; elle en produira une troisième.

## Fait quand

1. La décision est écrite dans `docs/CONTEXTE.md` avec sa raison et sa date, pas seulement dans une
   migration.
2. Un appelant `authenticated`, joué avec `set local role` pour que ce soit réel, reçoit des six
   fonctions exactement ce que la décision dit — mesuré sur les mêmes points que le tableau
   ci-dessus, avant et après.
3. Le test de claim n'existe **qu'une fois** dans le schéma, et un invariant le garantit.

Et, comme pour `I22` et `I23` : **dire ce que la règle ne rattrape pas.**

Voir `DIAGNOSTIC.md` §21 pour la mesure, §12 pour l'occurrence précédente du même désaccord,
et `docs/tickets/w0-retenue.md` pour ce qui a rendu le sujet visible.

---

# Fait le 26 août 2026

Migration `20260826000002_caller_is_privileged.sql` posée sur `dbefhvmyfmmhjeetdddu`,
**ledger remesuré à 43**, fonctions `compass_*` à **14**, invariants à **34**.

## Le point 1 n'a pas été rouvert

La décision était prise avant la session : `authenticated` n'est pas privilégié. Le travail a
consisté à l'**appliquer**, et elle est écrite là où on la relira — `docs/CONTEXTE.md`, section
« Un compte n'ouvre aucune donnée », avec sa raison, sa date et sa condition de révision, en plus
de `docs/REPRISE.md` qui la portait déjà. Le critère 1 du « Fait quand » demandait `CONTEXTE.md`
nommément ; il n'y était pas.

## Le point 2 — une seule expression, et la forme qu'elle a prise

`public.compass_caller_is_privileged()`, `stable`, `parallel safe`, appelée par les six. Le test
était recopié à l'identique dans les six corps, sous le commentaire « copié verbatim pour qu'elles
ne divergent pas ».

**Le test est un laissez-passer nominatif, pas une liste noire.** `= 'service_role'`, jamais
`<> 'anon'` ni `not in ('anon', 'authenticated')`. Les deux formes s'accordent sur tous les rôles
qui existent aujourd'hui et se séparent sur ceux qui n'existent pas encore : une liste noire
privilégierait **par défaut** la prochaine valeur de claim, en silence. C'est exactement la
mécanique du désaccord qui a produit `DIAGNOSTIC.md` §12 puis §21. Le laissez-passer échoue fermé.
Une connexion directe ne porte aucun claim, retombe sur le `coalesce` et reste privilégiée.

**Méthode, et elle vaut d'être écrite.** Postgres ne sait pas modifier le corps d'une fonction :
les six corps devaient être restitués en entier, ce qui est la manière habituelle d'en faire
diverger deux. Ils ont donc été **relevés depuis `pg_proc`**, comparés au fichier versionné qui les
définit en dernier, puis réécrits par substitution de chaîne exacte — une seule substitution
possible par fonction, sinon le générateur refuse. Diff mesuré : **un seul écart par fonction**,
le test d'appelant. Deux des six sont déclarées `security invoker` dans leur propre fichier et
avaient été passées `definer` par `20260825000014` : le mode a été relu en base, pas supposé, sinon
la réécriture l'aurait annulé en silence.

**Et un écart trouvé au passage.** Cinq corps sur six étaient identiques au fichier, octet pour
octet. `compass_scoring_context_within` portait en base un commentaire **en français** là où son
fichier porte la traduction anglaise — un brouillon poussé avant la relecture. Sans conséquence, et
invisible à toute porte : rien ne compare `prosrc` aux fichiers. La migration remet les deux en
phase, revérifié après la poussée. `DIAGNOSTIC.md` §26.

## Le point 3 — le livrable : `I32`, plus `I33` et `I34`

Sur le patron de `I23`, avec ses deux exigences :

- **aucune copie** — une fonction `compass_*` autre que `compass_caller_is_privileged` qui lit
  `request.jwt.claims` dans son corps ;
- **et l'appel** — toute fonction de la population de `I23` doit appeler celle-là. Interdire la
  copie ne force pas l'appel : une septième fonction pourrait ne tester personne et rendre
  `withheld = false` en dur.

`I33` (`@as authenticated`) et `I34` (`@as service_role`) jouent la décision dans les deux sens.
`I33` a deux volets : le verdict, et ce que l'appelant reçoit réellement des Halles en 2017 — un
`not (privilégié or redistribuable)` inversé passerait le premier et pas le second.

**Éprouvés par sabotage**, `npm.cmd run eval:sabotage`, trois actes dans des transactions annulées :

| Acte | Ce qui est fabriqué | Attendu | Mesuré |
| --- | --- | --- | --- |
| 1 (existant) | sixième fonction `INVOKER`, sans marqueur | `I23` rouge, `I24` rouge | ✓ 1 ligne, population 7 |
| 2 | septième fonction `DEFINER`, colonne `withheld`, test **recopié** | `I32` rouge, `I23` **vert** | ✓ vue sur les deux motifs |
| 3 | `compass_caller_is_privileged` remise à `<> 'anon'` | `I33` rouge, `I34` **vert** | ✓ 500 lignes non marquées |

L'acte 2 est celui qui justifie `I32` : la fonction sabotée est irréprochable pour `I23`. L'acte 3
prouve que la décision elle-même est gardée. Après rollback, les cinq invariants repassent au vert,
et le nettoyage est vérifié **sur le corps** de la fonction d'appelant et pas seulement sur son nom.

## Critère 2 — mesuré avant et après, sur les points du ticket

`dbefhvmyfmmhjeetdddu`, local 54652 sur 2017, Halles (48,86229 / 2,34490) à 800 m sur 2017,
`compass_street_rotation` à 300 m. `anon` et `authenticated` joués avec le claim **et**
`set local role`, pour que RLS s'applique vraiment.

| Fonction | `anon` | `authenticated` avant | `authenticated` après | privilégié / `service_role` |
| --- | --- | --- | --- | --- |
| `compass_premise_history` | retenu | `observed = true`, `Locaux Vacants` | **retenu** | `observed = true` — inchangé |
| `compass_address_timeline` | retenu | idem | **retenu** | idem — inchangé |
| `compass_survival_by_trade` | retenu | 310 / 268 / 86,5 % | **retenu** | 310 / 268 / 86,5 % — inchangé |
| `compass_premises_within` | 1 marquée | **4 773 locaux** | **1 marquée** | 4 773 — inchangé |
| `compass_scoring_context_within` | 1 marquée | **4 773** | **1 marquée** | 4 773 — inchangé |
| `compass_street_rotation` | 2 marqueurs | 98 × 3 millésimes | **2 marqueurs** | 98 × 3 — inchangé |

**4 773 remesuré, pas recopié** : le ticket portait le chiffre depuis le 25 août, il tenait encore
le 26. Le volet SIRENE de `compass_survival_by_trade` reste rendu à tous — 185 / 102 / 55,1 %,
Licence Ouverte, aucune retenue à faire.

**Les deux autres appelants n'ont pas bougé**, et c'est mesuré et non déduit : la colonne `anon` est
identique avant et après, la colonne privilégiée aussi, et le claim `service_role` a été joué
séparément de la connexion directe parce que ce sont deux chemins distincts vers le même verdict.

## Ce que la règle ne rattrape pas

- **`prosrc` est du texte.** Une fonction qui rejouerait la décision autrement — `current_user`,
  `session_user`, un GUC applicatif, une table de rôles — n'est pas vue par `I32`. La règle
  interdit la copie, pas la réinvention.
- **`I32` ne juge pas l'usage.** `not (privilégié or redistribuable)` inversé appelle bien la
  fonction et retient exactement à l'envers. Ce sont les paires de comportement et `I33` qui
  l'attrapent.
- **`I32` ne dit rien du contenu de la décision.** Le jour où le privilège changerait de
  définition, `I32` resterait vert ; seuls `I33` et `I34` portent la décision, et seulement pour
  ces deux rôles-là. Un troisième rôle de claim inventé demain n'a aucun invariant.
- **Population `public.compass\_%`.** Une fonction posée dans un autre schéma, ou nommée autrement,
  en sort — même angle mort que `I23` et `I24`.
- **Rien de tout cela ne couvre l'accès direct aux tables.** `premise_observation` par PostgREST
  reste gouvernée par RLS seule ; c'est le bras D de `eval:anon` qui la mesure, 60 845 relevés
  visibles pour la clé publiable.
- **Le corps déployé n'est comparé à aucun fichier.** L'écart trouvé cette session ne pouvait être
  vu par aucune porte, et il ne le pourrait toujours pas : l'invariant qui le ferait demande de
  savoir quelle migration définit une fonction **en dernier**, ce qui se déduit du nom des fichiers
  et non du catalogue. Non écrit, et dit plutôt que tu.

**Et deux choses que ce ticket ne décide pas.** Le jour où l'APUR répond (#49), il faudra basculer
une ligne de `bdcom_vintage.publicly_redistributable` — pas toucher à cette fonction. Et le jour où
un partenaire sous accord existera, il lui faudra un rôle de claim nommé, ajouté ici à la main et
avec sa raison : le laissez-passer est fait pour que cet ajout soit un acte, pas un effet de bord.

**Survit-il à un rechargement ?** Oui, et sans rien à faire : la règle est dans le schéma, pas dans
les données. Un rechargement de BDCom réécrit `premise_observation` et ne touche ni les fonctions,
ni `bdcom_vintage.publicly_redistributable`. **Protège-t-il un consommateur qui n'existe pas
encore ?** Oui, et c'est le seul sens de `I32` : le front-end n'a aucun compte à faire signer —
`auth.users` compte 0 — donc le consommateur protégé aujourd'hui est la septième fonction, et
l'agent qui l'appellera par PostgREST.

## Portes

`typecheck` ✓ · **166 tests** ✓ · `eval` **34/34 invariants** ✓, 8/8 cas dorés, dix écarts de
baseline en avertissement (dérive BODACC/SIRENE connue, la plus large à 0,70 %) · `eval:anon`
**PASS, 12 contrôles**, du premier coup · `eval:sabotage` **PASS**, trois actes · `verify:mcp`
**40 au vert, 0 en échec, 1 suspendu** (E12, Overpass en 429 — panne amont) · `sessions:check` ✓ ·
`build` et `build:dev` **injouables ici**, Smart App Control bloque le binaire natif de
`@swc/core` ; contournées par `build:local` ✓ et `build:dev:local` ✓.

Toutes jouées le 26 août au soir, **rejouées le 27 à 08 h 18 UTC** contre le distant sur l'arbre
final : mêmes verdicts. Une réserve, et elle vaut d'être dite plutôt que lissée — au **premier**
appel de la matinée, `eval` est morte dans le bras A sur `canceling statement due to statement
timeout` (Postgres `57014`), et le passage suivant a rendu 34/34 sans qu'aucun fichier n'ait
bougé. Même mode de défaillance que les deux faux rouges de `eval:anon` le 26 août. Consigné dans
`docs/REPRISE.md`, « Pièges qui ont coûté du temps » : **rejouer avant de diagnostiquer.**
