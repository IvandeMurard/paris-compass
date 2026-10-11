# Reprise — entrées closes

Extrait de `docs/REPRISE.md` le 31 août 2026, en même temps que `docs/REPRISE-PIEGES.md`.
**Ne se lit pas en début de session.** Ce sont les sections de la page de reprise dont
l'objet est clos : tickets terminés, états mesurés remplacés par un plus récent, points de
« La suite » rayés. Elles sont gardées pour leurs **mesures datées**, pas pour leur récit.

La différence avec `docs/JOURNAL.md` : le journal raconte *pourquoi* une décision a été
prise, session par session ; ce fichier-ci garde les chiffres tels qu'ils ont été relevés,
avec leur date, pour qu'une mesure ancienne reste recoupable. **Quand une mesure d'ici
contredit `docs/REPRISE.md`, c'est celle d'ici qui a tort** — elle est plus vieille par
construction.

> **Recouvrement connu, à résorber.** Les entrées `#64` et `#62` ci-dessous racontent la
> même chose que les entrées de même nom dans `docs/JOURNAL.md`, en d'autres mots. C'est
> exactement la surface de dérive que `CLAUDE.md` met en garde. Elles sont déplacées telles
> quelles plutôt que supprimées, faute d'avoir vérifié ligne à ligne qu'aucune nuance n'était
> unique à cette page. À trancher : le récit appartient au journal, les chiffres à
> `eval/baselines/` et à `DIAGNOSTIC.md`.

---

## Tickets clos

## `#64` — les deux dernières fonctions de rayon, et un défaut de méthode qui les cachait — 28 août 2026

**Corrigé par `20260828000003`. `compass_street_rotation` 286 744 → 87 879 pages,
`compass_scoring_context_within` 137 576 → 86 102.** La plus chère des quatre, de trois fois, est
devenue la moins chère. Détail complet dans `DIAGNOSTIC.md` §28.

**Le ticket se trompait dans les deux sens, et c'est ce qu'il faut retenir de lui.** La piste
d'index qu'il proposait était vraie mais ne valait que 22 % ; et la fonction qu'il déclarait « sans
piste technique — il y a une décision » portait le **même défaut**, à 37 %. **Aucune décision
produit n'a donc été nécessaire** : rien n'a été retiré, aucune formule publiée n'a bougé,
`src/core/scoring.ts` n'a pas été touché, et `compass_max_radius_m()` reste à 2 000 m pour les
quatre fonctions. La piste 2 du ticket — un rayon plus bas pour cette fonction-là — reposait de
plus sur une prémisse fausse : les outils MCP `score_location`, `explain_score` et
`compare_locations` déclarent tous les trois `radius_m … .max(2000)` et le passent tel quel.

**Ce qui cachait le vrai coût, et qui vaut au-delà de ce ticket : le cache de plans plpgsql.**
`anon-budget.json` disait de ces fonctions qu'elles « basculent entre deux plans d'un passage à
l'autre » et prenait l'écart pour de la chance. C'était le plan **custom** contre le plan
**générique**, et `auto` — la production — prend le générique à tous les coups : 286 710 contre
151 778 pour la rotation, 137 576 contre 103 241 pour le contexte. **Le chiffre bas n'a jamais été
payé par personne.** Voir plus bas, sous les pièges, la conséquence pour toute mesure future.

**Le correctif ne touche pas au planificateur** : les deux tables de libellés passent en CTE
`materialized` — une barrière, pas une indication —, plus l'`include` élargi à `activity_code`.
Les deux plans ont convergé depuis, à 25 pages près. **354 comparaisons, aucun chiffre affiché
déplacé** — `premises`, `vacant`, `changed_since_previous`, `total_matched`.

**Ce qui reste est ouvert en ticket, pas laissé en note :
[`#65`](https://github.com/IvandeMurard/paris-compass/issues/65).** Les quatre fonctions
descendent encore un index une fois par local — 71 952 et 71 728 pages pour les deux d'ici — parce
que l'estimation de `ST_DWithin` est fausse. Mesuré en ouvrant le ticket, et ça change la question :
la jointure par hachage vaut **−81 % de pages à 2 000 m** mais **dix-huit fois pire à 50 m**, où la
boucle est le bon plan et où se trouve le cas courant. Le levier existe à l'échelle d'une fonction
(`ALTER FUNCTION … SET enable_nestloop = off`, vérifié) mais il ne sait pas dépendre du rayon. Et
l'estimation se trompe d'un facteur **2 656 même avec le rayon écrit en clair** — ce n'est donc pas
le plan générique qui est en cause, et `force_custom_plan` n'y changerait rien. La piste à tenter
en premier est la seule qui ne retire rien : corriger l'estimation (`SET STATISTICS` sur `geom`),
pas forcer le plan.

Et **le réveil après une nuit n'est pas mesuré après correctif**, même réserve et même protocole
que pour `#62`.

## `#62` — la carte tenait la fenêtre anonyme à chaud et la dépassait à froid — 28 août 2026

**Le ticket sous-estimait son propre défaut.** Il citait 2 116 ms à chaud au rayon maximal, soit
70 % des 3 s accordées à `anon`. Mesuré comme son critère le demandait — premier appel d'une
instance restée inactive, ici dix heures — le premier appel est **annulé** : `57014`, HTTP 500,
4 536 ms. Au rayon que le produit promet, sur une instance froide, la carte ne s'affichait pas.

**Après correctif, le même premier appel répond** — 3 667 ms d'aller-retour HTTP, HTTP 200,
500 lignes, aucune annulation, après cinquante-cinq minutes d'inactivité. Les appels suivants
tombent à 205-353 ms contre 548-853 avant. **Réserve à lire avec le chiffre** : les deux fenêtres
d'inactivité ne sont pas les mêmes — dix heures avant, cinquante-cinq minutes après — donc le
réveil après une nuit reste **non mesuré après correctif**. Le protocole pour l'obtenir tient en
une ligne, et il est à la portée de la prochaine session : *dépenser le premier appel de la
matinée sur `compass_premises_within` à 2 000 m, avant toute autre requête.*

**Corrigé par la piste 2 du ticket, poussée plus loin qu'elle n'était formulée.** Le compte cesse
de matérialiser les cinq jointures de libellés, qui sont reportées sur les seules lignes que le
`limit` garde, et `premise_observation_location_idx` devient couvrant. **195 422 → 94 065 pages**
au rayon maximal. Le même défaut, en pire, a été trouvé en mesurant et corrigé dans
`compass_bodacc_within` — 9 331 ms au premier appel, trois fois la fenêtre entière — parce que la
porte ajoutée par ce ticket serait sinon partie rouge.

**La piste 3 est refusée** : baisser `compass_max_radius_m()` n'est pas une optimisation, c'est une
promesse produit qu'on retire. La décision est écrite plus bas, sous « Décisions qui ne se déduisent
pas du code ».

**Ouvert en le corrigeant, et clos le jour même : [`#64`](https://github.com/IvandeMurard/paris-compass/issues/64)** — voir la section au-dessus, qui fait foi. Ce qui suit est ce que `#62` en croyait à l'ouverture, et deux de ses affirmations se sont révélées fausses à la mesure : la piste d'index ne valait que 22 % du gain, et « son coût est sa réponse » était faux pour `compass_scoring_context_within` aussi. Conservé pour que le raisonnement reste lisible.
Les deux fonctions de rayon que `#62` n'a pas touchées. `compass_street_rotation` est désormais
la plus chère des quatre — 286 744 pages, trois fois `compass_premises_within`, et 2 091 ms au
premier appel observé. Et les deux ne sont pas le même cas, contrairement à ce que la première
rédaction de §27 disait : `compass_scoring_context_within` rend une ligne par local, donc son
coût est sa réponse ; `compass_street_rotation` est un agrégat qui rend 2 609 lignes en en lisant
64 147, donc il y a de la place. Corrigé dans §27 le jour même. **La piste d'index y est
mesurée, pas supposée** : élargir l'`include` à `activity_code` rend la recherche par local
`Index Only Scan`, `Heap Fetches: 0`, **136 072 → 71 952 pages** — mais le gain sur la fonction
entière reste inconnu, parce qu'elle bascule entre deux plans, et le coût en écriture à
l'ingestion n'est pas chronométré. Les deux réserves sont dans le ticket.

**Ce que le ticket laisse derrière lui, et qui vaut plus que le correctif** : le **bras E** de la
porte, qui énumère depuis `pg_proc` toute fonction de rayon appelable par `anon`, la joue au rayon
maximal, et bloque sur les **pages touchées** — jamais sur l'horloge. Détail complet, arbitrage et
ce qu'il ne rattrape pas : `DIAGNOSTIC.md` §27.

> **`eval` est à 37 invariants, pas à 34.** Le chiffre « 34/34 » circule encore — il est dans
> `docs/tickets/w0-appelant.md` et il était juste **le 26 août**. `I35`, `I36` et `I37` sont
> arrivées le 27 avec `20260827000001`. Un chiffre mesuré porte sa date : remesurer avant de
> recopier.

## `w1-dia` — clos par un refus, pas par une ingestion — 27 août 2026

**Le ticket prévoyait ce dénouement** : « Fait quand » acceptait une note « non publié, piste
close » à égalité avec une couche sourcée. C'est la première branche qui s'est vérifiée.
Le catalogue Paris Data ne publie aucune DIA — ni fonds de commerce, ni bail commercial —
seulement les **parcelles soumises** au droit de préemption (`plu-annexes-droit-de-preemption-urbain-renforce`),
qui est le périmètre où le droit s'exerce, pas le flux des déclarations elles-mêmes. Vérifié via
l'API du catalogue (`api/v2/catalog/datasets`, `total_count: 0` sur « préemption commerce
artisanat » et « aliéné »). `data.gouv.fr/datasets/dia/` existe mais couvre une intercommunalité
normande, sans rapport avec Paris. Détail dans `docs/PLAN-ACTION-VACANCE.md` §5.6. **Issue
[`#12`](https://github.com/IvandeMurard/paris-compass/issues/12) fermée** (« not planned »),
table de `docs/SESSIONS.md` régénérée, `sessions:check` ✓. Rien dans `src/`, donc pas de portes
à rejouer.


---

## États mesurés, remplacés depuis

## L'état mesuré le 28 août 2026, après clôture de `#65`

**Le tableau de la section suivante date du 24 août** et n'a pas été remesuré depuis ; celui-ci
l'a été, contre `dbefhvmyfmmhjeetdddu`, après la fermeture de `#65`. Quand les deux
se contredisent, c'est le plus daté des deux qui a tort — et la règle de `CLAUDE.md` s'applique
d'abord ici : **remesurer avant de recopier.**

| Mesure | Valeur, mesurée le 28 août 2026, après clôture de `#65` |
| --- | --- |
| Ledger distant `supabase_migrations` | **47** migrations, dernière `20260828000003` — remesuré en fin de session. Trois poussées ce jour, `…0001` et `…0002` (`#62`) puis `…0003` (`#64`) ; **`#65` n'en a posé aucune**, et c'est son résultat |
| Fonctions `compass_*` | **15** — inchangé, remesuré. Les trois migrations remplacent des corps sans en créer, et `#65` n'en touche aucun. Vérifié aussi qu'aucune fonction candidate n'a survécu aux transactions annulées de `#65` : **0 résidu** |
| Invariants | **37** — inchangé. **Pas 34** : ce chiffre circule encore (`docs/tickets/w0-appelant.md`) et était juste le 26 août, avant `I35`–`I37` |
| Bras de la porte | **cinq** : A invariants, B baselines, C jeu doré, **E budget de la fenêtre anon** (`#62`), D porte anonyme jouée à part |
| Tests unitaires | **188** — inchangé, ni `#64` ni `#65` ne changent de verdict |
| `auth.users` | **0** — aucun compte, ce qui rend la décision de `w0-appelant` gratuite aujourd'hui et coûteuse plus tard |
| Issues | **37 ouvertes, 24 fermées** — remesuré par `gh issue list --jq length` en toute fin de session, après fermeture de [`#65`](https://github.com/IvandeMurard/paris-compass/issues/65) **et ouverture de [`#68`](https://github.com/IvandeMurard/paris-compass/issues/68) et [`#69`](https://github.com/IvandeMurard/paris-compass/issues/69)**. Il valait 36/23 en début de session, 35/23 après la seule fermeture, et 37/20 l'avant-veille : **remesurer avant de recopier** |
| Épic [`#42`](https://github.com/IvandeMurard/paris-compass/issues/42) (vague 1) | ouverte, **5 cochés sur 7** — inchangé, remesuré ; ni `#62`, ni `#64`, ni `#65` n'y figurent |
| Portes | `typecheck` ✓ · `test` **188** ✓ · `build` ✓ · `eval` **37 invariants**, 8 cas dorés, bras E vert sur quatre fonctions et **sous leurs plafonds** (−0,0 % à −2,1 %), **11 avertissements de baseline** (sortie 3) · `eval:anon` **PASS, 15 contrôles** (sortie 0), requête la plus coûteuse `compass_premises_within` à **1 121 ms** sur 3 000 · `verify:mcp` **41 contrôles, 40 verts, 0 échec, 1 suspendu** (panne amont) · `eval:sabotage` **non relancé** — rien de ce jour ne touche la règle de retenue. **`eval` a demandé trois passages** : deux morts sur `57014` à 120 000 ms dans le bras A, voir le piège plus bas et [`#69`](https://github.com/IvandeMurard/paris-compass/issues/69) |

**Coût des quatre fonctions de rayon au rayon maximal**, mesuré après poussée de
`20260828000003`, claim `anon`, parallélisme coupé, pire de douze passages — c'est le contenu de
`eval/baselines/anon-budget.json`, et le bras E le rejoue à chaque `npm.cmd run eval` :

| Fonction | Pages | ms à chaud | Avant `#64` | Plafond déclaré |
| --- | ---: | ---: | ---: | --- |
| `compass_scoring_context_within` | **86 102** | 114 | 137 576 | 1 020 ms, soit 34 % de la fenêtre `anon` |
| `compass_street_rotation` | **87 879** | 246 | 286 744 | idem |
| `compass_premises_within` | 94 117 | 140 | 94 117 | idem |
| `compass_bodacc_within` | 148 346 | 294 | 148 206 | idem |

Les corps de fonction déployés sont **identiques aux fichiers versionnés**, revérifié après la
poussée de `20260828000002` — `compass_premises_within` et `compass_bodacc_within` comprises,
fins de ligne normalisées. Ils ne l'étaient pas tous avant : voir `DIAGNOSTIC.md` §26.

## Ce qui existe et fonctionne — en local **et sur le distant**

**Le distant est chargé depuis le 15 août.** C'est le changement le plus important
de cette page, et il annule le « point bloquant » que les versions antérieures
décrivaient : `dbefhvmyfmmhjeetdddu` porte le schéma **et** les données. Mesuré en
direct le 17 août sur la base elle-même, pas déduit :

| | Distant `dbefhvmyfmmhjeetdddu` |
| --- | --- |
| Migrations au ledger `supabase_migrations` | **27**, de `20250417000001` à `20260824000002` — remesuré le 24 août après la seconde poussée. Il valait 25 le matin et 26 en milieu de journée : trois valeurs justes en une journée. |
| Tables / fonctions `compass_*` | **18 / 10** — mêmes chiffres que la base de référence |
| Locaux (`premise_location`) | 85 418 |
| Relevés (`premise_observation`) | 228 275 — les trois millésimes additionnés |
| Tronçons de voie / quartiers | 25 094 / 80 |
| Établissements SIRENE | 68 770 |

**Le dépôt et le distant portent le même schéma** : les **27** fichiers de
`supabase/migrations/` sont au ledger, `20260824000002` comprise. Vérifié le
24 août après la poussée — mode de sécurité et comportement relevés en base, pas
seulement la signature. Détail au point 8 de « La suite, par ordre ».

**En local**, l'agrégat de référence reste en place et sert toujours : dix-neuf
migrations, quatre sources chargées, porte d'évaluation au vert — rejouée et
confirmée le **12 août**. Dix-neuf, pas vingt-et-une : `supabase/migrations/`
contenait alors 21 fichiers, mais les deux derniers (`20260809131158`,
`20260809131210`, générés par Lovable) ne sont pas appliqués en local. Le
répertoire en compte **24** depuis les fusions du 17 août.

### La répétition générale, et les deux défauts qu'elle a trouvés

Le 12 août, les 21 fichiers ont été rejoués **depuis zéro** sur une base vierge du
même agrégat, dans l'ordre des noms, chacun dans sa transaction — comme le fait la
CLI Supabase. Résultat final : **21/21, 18 tables, 10 fonctions `compass_*`**,
identique à la base de référence.

Elle n'est pas passée du premier coup, et c'était tout l'intérêt.

**1. Les tables utilisateur dépendaient de `uuid-ossp` sans jamais le déclarer.**
`uuid_generate_v4()` vient de cette extension, qu'un projet Supabase active par
défaut. Les migrations Compass déclarent proprement PostGIS ; les tables
utilisateur étaient l'exception, et s'appuyaient sur un provisionnement ambiant.
Corrigé dans `20250417000001` par deux lignes idempotentes — le schéma
`extensions` est déclaré aussi, ce fichier se classant **avant** la migration
PostGIS qui le crée. Sans savoir si `dbefhvmyfmmhjeetdddu` a l'extension activée,
la déclarer coûte deux lignes et supprime le pari.

**2. `20250417000001` et `20260809131158` sont des doublons exacts** — mêmes
quatre tables, mêmes quatorze politiques, mêmes noms. `CREATE TABLE IF NOT EXISTS`
absorbait la collision sur les tables, mais **Postgres n'a pas de
`CREATE POLICY IF NOT EXISTS`** : rejouer l'ensemble échouait au second passage.
Jamais vu jusqu'ici parce que les deux fichiers n'ont **jamais tourné ensemble** —
le local ne porte que le premier, Lovable n'a appliqué que le second. Une bascule
sur une base neuve les aurait rencontrés tous les deux. Corrigé par un
`DROP POLICY IF EXISTS` devant chacune des quatorze.

> Contrairement à ce qui a pu être dit, les tables utilisateur **ne tournent pas
> sans politique en local** : `20250417000001` les crée toutes, et elle est
> appliquée.

**Ce que la répétition ne prouve pas.** La base vierge est créée par
`create database` dans l'agrégat local : elle hérite des rôles, pas du
provisionnement par base que fait Supabase. Le schéma `auth` y est une **doublure**
— `auth.users` réduit à deux colonnes et `auth.uid()` lisant le claim JWT. Les
19 migrations Compass sont donc éprouvées pour de vrai ; les trois qui touchent
aux tables utilisateur ne le sont que sur cette doublure.

### Vulnérabilités : 21 → 9 → 7 → **0**, le 16 août

**État actuel : `npm.cmd audit` ne remonte plus rien.** Les cinq alertes qui
traînaient depuis le 12 août sont fermées. C'est la fin de ce chantier — sauf le
point de vigilance Lovable, plus bas.

**Ce qui a été analysé.** Deux exports Socket Security du 16 août
(`cyclonedx-manifest.json`, inventaire des dépendances, et `socket.vex.json`,
les alertes) plus un tableur `alerts.csv.xlsx` couvrant cinq dépôts. Le tableur
portait une colonne absente des autres sources : **la version minimale qui
corrige**. C'est elle qui a débloqué le dossier.

**Douze alertes Socket visaient Compass, dont cinq seulement sont des
vulnérabilités.** Ce sont ces cinq-là qui sont fermées. Les sept autres restent
affichées et **c'est normal** — elles ne relèvent pas de la sécurité :

| Combien | Nature | Ce que c'est |
| --- | --- | --- |
| 5 | vulnérabilités | `vite` ×3, `vitest`, `esbuild` — **fermées** |
| 5 | « code obfusqué à 90 % » | `recharts` ×2, `date-fns` ×2, `@tanstack/query-core`. Détection automatique qui confond **code minifié** et code délibérément masqué. Faux positif sur des bibliothèques de cette notoriété — rien à faire |
| 2 | paquet déprécié | `glob`, `recharts` — le mainteneur n'assure plus le suivi. Question d'entretien à terme, pas de sécurité |

Ne pas rouvrir le dossier en voyant sept alertes persister : le compteur qui fait
foi pour la sécurité est `npm.cmd audit`, à zéro.


---

## La porte anonyme — jouée pour la première fois le 24 août

**Ce qu'elle ajoute, et pourquoi elle manquait.** Le bras A de la porte fait dire
`anon` à une connexion privilégiée en posant `request.jwt.claims`, et n'émet
jamais `set local role anon`. Il éprouve donc le test que les fonctions font sur
le *claim* — ni la politique RLS en dessous, ni la sérialisation PostgREST de la
colonne `withheld`. Les deux étaient supposées depuis le 16 août. Aucune ne
l'était encore.

Le bras D ne détient **aucun identifiant de base** : la clé publiable et l'URL du
projet, exactement ce que le navigateur embarque.

```powershell
npm.cmd run eval:anon      # scripts/eval/anon-http.ts — quelques secondes
```

**Mesuré le 24 août** contre `dbefhvmyfmmhjeetdddu`, Châtelet (48.8566, 2.3522),
`compass_premises_within` :

| Millésime | HTTP | Lignes | `withheld` |
| --- | --- | --- | --- |
| 2017 | 200 | **1** | **`true`**, toutes les autres colonnes nulles |
| 2020 | 200 | **1** | **`true`**, toutes les autres colonnes nulles |
| 2023, 800 m | 200 | 5 (limite) | `false`, `total_matched = 3059` |
| 2023, rayon 1 m | 200 | **0** | — un vrai vide reste un vrai vide |

`compass_scoring_context_within` répond pareil sur 2017 et 2020.

**Le quatrième bras couvre désormais `compass_premise_history`**, ajouté par la
session 2 sur deux locaux : 54652, relevé vacant en 2017, et 5, présent en 2017
et 2020 et **absent** du millésime 2023 `retail_only` — le contre-test, puisqu'un
correctif trop zélé détruirait l'absence que cette fonction existe pour rapporter.
Les deux passent depuis `20260824000001` ; elles **échouaient** contre la fonction
défectueuse encore en ligne, et c'est ce qui les rend crédibles.

**Et RLS, enfin exercé pour de vrai.** La clé anon lisant `premise_observation`
en direct voit **60 845 relevés sur 228 275** — exactement le décompte du
millésime 2023. Les deux millésimes non redistribuables ne sortent pas de la
base ; la retenue n'est pas qu'une politesse de la fonction. C'est un décompte
et non un échantillon, précisément parce qu'un échantillon passerait au vert
alors qu'une seule ligne 2017 fuirait.

> **Depuis `#61` le décompte est clefé par millésime** : trois comptes exacts
> (2017 → 0, 2020 → 0, 2023 → 60 845) au lieu d'un total unique. **471 pages au
> lieu de 9 033**, parce que `vintage_id` mène `premise_observation_vintage_idx`
> et que chaque compte devient un parcours d'index seul. L'égalité exacte est
> gardée — c'était la crainte du ticket — et elle dit désormais *quel* millésime a
> bougé. Le verdict vit dans `scripts/eval/licence-counts.ts`, importé par
> `eval:sabotage` plutôt que recopié : son acte 4 élargit la politique RLS dans
> une transaction annulée et les comptes passent au rouge sur 2017 et 2020, quand
> I23 et I32 restent verts.

**Le bras a été éprouvé contre un vrai négatif**, comme I12/I13 en leur temps :
ses assertions ont été pointées sur `compass_premise_history`, dont on sait
maintenant qu'elle n'annonce rien — elles échouent. Il n'est donc pas vide.

**Ce qu'il a trouvé.** `compass_premise_history` porte le défaut de licence sous
sa forme la plus dure : elle rend `observed = false` et `is_vacant = false` là où
le local était relevé **et vacant**. Local 54652, `60 QU ORFEVRES`, 2017 —
privilégié `observed = true, is_vacant = true, « Locaux Vacants »` ; anonyme
`observed = false, is_vacant = false, null`. **Non corrigé**, hors périmètre de
`w0-deploy` : `DIAGNOSTIC.md` §10.

---


---

## « La suite, par ordre » — les points rayés

La numérotation est celle de `docs/REPRISE.md`, conservée telle quelle parce que
`docs/PLAN.md` et `docs/PLAN-ACTION-VACANCE.md` y renvoient par leur numéro. Les points
**2, 5, 6 et 7 sont restés ouverts** et vivent toujours dans `docs/REPRISE.md`.

1. ~~**L'hôte de connexion**, puis migrations et chargement sur Lovable Cloud,
   puis la porte contre l'instance distante.~~ **Fait** — sur
   `dbefhvmyfmmhjeetdddu` et non sur Lovable Cloud, la cible ayant changé (voir `docs/REPRISE.md`,
   « Le nœud Supabase »).

   **La porte a tourné contre le distant le 17 août.** Verdict :
   **AVERTISSEMENT**, code de sortie 3 — aucune défaillance, dix écarts tous
   sous le seuil bloquant de 1 %.

   | Phase | Résultat |
   | --- | --- |
   | A — invariants | **11 / 11**, y compris I9, I10 et I11 joués en anonyme |
   | B — baselines (gelées le 9 août) | 13 au vert, **10 avertissements**, le plus large à 0,88 % |
   | B bis — composition de fiabilité | **stable** : 57,31 % établi+corroboré, inchangé depuis le 15 août |
   | C — jeu doré | **8 / 8** |

   Les dix écarts portent tous sur BODACC et SIRENE (`+0,14 %` à `+0,88 %`), et
   pas un seul sur BDCom, dont les effectifs sont au chiffre près. C'est
   exactement ce que la note des baselines prévoit : la DILA et l'INSEE
   republient, l'APUR non. Ce n'est donc pas une dérive du pipeline.

   **Regelées le 17 août, verdict désormais SUCCÈS, code de sortie 0.** La règle
   « ne pas regeler pour faire taire un avertissement » n'est pas levée, elle est
   précisée — et la version précise vaut mieux que l'ancienne, parce que dix
   avertissements permanents finissent par ne plus être lus, ce qui détruit le
   signal aussi sûrement qu'un gel complaisant. Trois conditions, écrites dans
   `eval/baselines/ingestion.json` sous `note_regel` :

   - chaque écart est **attribué à une cause nommée avant** le gel — ici la
     republication DILA et INSEE, confirmée par le fait qu'aucun effectif BDCom
     n'a bougé d'un seul chiffre à la reprise ;
   - aucun n'atteint le seuil bloquant de 1 % ;
   - le gel remplacé reste lisible **dans le fichier** (`previous_freezes`, avec
     sa date et sa raison) et pas seulement dans git.

   Toute valeur est **remesurée** à la reprise, jamais reportée depuis un
   pourcentage de dérive. Les dix valeurs déplacées sont exactement les dix qui
   avertissaient — le gel n'a rien absorbé d'autre.

   `confiance_probable`, le plus large à 0,88 %, était celui qui approchait le
   seuil : il repart de 19 689 et non de 19 517, donc le prochain avertissement
   sur cette ligne mesurera un vrai mouvement et non l'accumulation depuis août.

   > **Correction.** Une version de cette page écrite le matin du 17 août
   > affirmait que la porte n'avait jamais tourné contre le distant. C'était
   > faux, et vérifiable sur place : `eval/confidence_history.jsonl` portait déjà
   > un point daté du 15 août dont la cible était `dbefhvmyfmmhjeetdddu`. Écrit
   > sans regarder le fichier.
8. ~~**Poser `20260816000001_scoring_context_withholding.sql` sur le distant.**~~
   **Fait le 17 août.** Ledger à **24** migrations, `20260816000001` enregistrée.
   Le distant et le dépôt portent désormais le même schéma.

   Vérifié en comportement, pas seulement en signature — c'est ce test qui avait
   révélé le défaut, rejoué sur le distant à Châtelet, rayon 800 m :

   | Rôle | Millésime | Lignes | Marqueur `withheld` |
   | --- | --- | --- | --- |
   | privilégié | 2017 / 2020 / 2023 | 3 855 / 3 825 / 3 059 | non |
   | **`anon`** | **2017 / 2020** | **1** | **oui**, coordonnées nulles |
   | `anon` | 2023 | 3 059 | non |
   | `anon` | 2023, rayon 1 m | **0** | non — un vrai vide reste un vrai vide |

   La dernière ligne est celle qui compte autant que les autres : la rétention
   s'annonce, et l'absence réelle continue de se lire comme une absence. Avant,
   les deux rendaient zéro ligne.

   **Note de procédure.** La commande a d'abord été refusée par le classificateur
   du mode auto de Claude Code — une écriture de schéma sur une base distante
   vivante. Ce n'était ni Supabase ni les identifiants. Lancée à la main depuis
   PowerShell, elle passe. Deux pièges pour la prochaine fois : l'URL doit être
   **percent-encodée** (le mot de passe contient un `&`, que `cmd.exe`
   interpréterait, et la CLI l'exige), et il ne faut **pas** passer par
   `--linked`, qui vise la connexion directe `db.<ref>.supabase.co`, AAAA seule
   donc injoignable depuis ce poste.

   ```powershell
   # Lit .env.local, encode l'URL, n'affiche jamais le secret. Ajouter --dry-run
   # pour voir ce qui partirait sans rien appliquer.
   $raw = (Get-Content .env.local | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1) -replace '^DATABASE_URL=','' -replace '^"','' -replace '"$',''
   if ($raw -match '^(postgresql://)([^:]+):(.*)@(.+)$') {
     $enc = $Matches[1] + [uri]::EscapeDataString($Matches[2]) + ':' + [uri]::EscapeDataString($Matches[3]) + '@' + $Matches[4]
     npx.cmd supabase db push --db-url $enc
   } else { "URL non reconnue dans .env.local" }
   ```

   **Suite du 24 août.** `20260817000001_premises_within_withholding.sql`, qui
   applique la même correction à `compass_premises_within`, est elle aussi posée :
   ledger à **25**, corps en base identique au fichier versionné. Elle l'était
   déjà avant cette session — ce point, et le ticket qui le recopiait, disaient
   24. I14 et I15 la couvrent, et la porte anonyme (section « La porte anonyme »)
   la démontre par HTTP.

   **Session 2 du 24 août : `20260824000001_premise_history_withholding.sql` est
   posée.** Ledger remesuré à **26**, enregistrée sous `premise_history_withholding`,
   corps en base identique au fichier versionné (aux fins de ligne près, voir le
   piège plus bas), `SECURITY INVOKER` conservé. Les deux portes rejouées derrière :
   17/17 invariants et 9 contrôles anonymes, au vert.

   **Le classificateur a de nouveau refusé la commande, et la relancer à la main
   depuis PowerShell a suffi** — deuxième fois sur trois poussées. Ce n'est pas un
   blocage, c'est une étape : préparer la ligne, la donner, la faire lancer.

   **Posée le 24 août : `20260824000002_premise_history_definer.sql`**, qui
   corrige le trou de l'appelant connecté laissé par la précédente
   (`DIAGNOSTIC.md` §12). Ledger à **27**, `SECURITY DEFINER` confirmé en base.
   Répétée d'abord dans une transaction annulée : `I18` échouait avant et passe
   après, `I16` et `I17` restent au vert.

   **Trois poussées, deux refus du classificateur.** Le refus n'est pas corrélé
   au contenu : `20260824000001` a été refusée, `20260824000002` est passée
   directement. Le préparer plutôt que s'en étonner.

   ~~**Ce que la porte d'évaluation ne couvrait pas.**~~ **Fait le 17 août** :
   I12 et I13 ajoutées à `eval/invariants.sql`, exécutées par le vrai lanceur
   contre le distant — **13/13**, verdict inchangé.

   - **I12** — un appelant anonyme reçoit le contenu ou une absence muette d'un
     millésime non redistribuable. `left join lateral … on true` transforme
     « la fonction n'a rien rendu » en une ligne de nulls que la requête peut
     voir : le silence de l'ancien défaut devient visible plutôt que de se
     cacher dans zéro ligne.
   - **I13** — le contre-test : un rayon réellement vide sur un millésime
     redistribuable doit rester silencieux, jamais un faux marqueur `withheld`.

   **Les deux vérifiées contre un vrai sabotage, pas une supposition.**
   L'ancienne fonction (avant `20260816000001`) recréée dans une transaction
   jetable, jamais validée, contre le distant : I12 **plante** dessus —
   `column r.withheld does not exist` — donc une régression de schéma ne
   pourrait jamais passer inaperçue en silence. I13 reste au vert sous
   l'ancienne fonction aussi : c'est attendu, elle protège contre une
   sur-correction future, pas contre le défaut d'hier.

   La précaution qui reste vraie : le lanceur pose `request.jwt.claims` mais ne
   fait jamais `set local role anon`, donc I12/I13 exercent la logique de
   la fonction (qui lit le claim), pas le filtrage RLS lui-même — consigné en
   commentaire dans le fichier, pas juste ici.

9. **La troisième fonction — `compass_premises_within`.** ~~À corriger.~~ **Fait
   le 17 août**, dans la foulée du point 8, par `20260817000001` et les
   invariants I14 et I15. Porte d'évaluation à **15 invariants**, verdict
   inchangé (avertissement, dix écarts de baseline, composition stable à
   57,31 %).

   *Pourquoi elle avait été manquée.* Le point 8 ne nommait que
   `compass_scoring_context_within`, donc I12 a couvert ce qu'on lui demandait.
   Le défaut de celle-ci est remonté le lendemain en écrivant l'outil MCP
   `find_premises` — même cause exactement : `SECURITY INVOKER`, la politique RLS
   de `20260809000008`, et zéro ligne rendue sans marqueur. **Il y avait trois
   fonctions portant la règle de licence, pas deux.** C'est la leçon à garder
   plus que le correctif : une famille de défauts se recense par requête sur le
   catalogue, pas de mémoire.

   *Mesuré en appelant anonyme réel via PostgREST* — plus fort que le lanceur,
   qui pose le claim sans prendre le rôle — à Châtelet sur 800 m :

   | | 2017 | 2020 | 2023 | 2023 à 1 m |
   | --- | --- | --- | --- | --- |
   | avant | 0 ligne | 0 ligne | 3 059 | 0 ligne |
   | après | 1 ligne `withheld` | 1 ligne `withheld` | 3 059 | 0 ligne |

   La dernière colonne compte autant : un vide réel se lit toujours comme un
   vide. Les chiffres privilégiés relevés au passage — 3 855 en 2017, 3 825 en
   2020 — recoupent `20260816000001` et le tableau du point 8.

   *Éprouvée avant d'être posée.* La migration a d'abord tourné dans une
   transaction jamais validée contre le distant, avec les deux invariants joués
   dedans. Et le sabotage n'a rien demandé de simulé : la fonction défectueuse
   était encore en ligne, donc I14 a été jouée contre elle telle quelle — elle
   **plante** (`column r.withheld does not exist`), I15 reste au vert. Même
   signature que I12/I13.

   *Note de procédure, différente d'hier.* `supabase db push` est passé
   directement cette fois, sans refus du classificateur. Le `--dry-run`
   préalable — qui a confirmé une seule migration en attente — vaut d'être gardé
   comme réflexe : c'est lui qui dirait qu'un fichier oublié partirait avec.

10. **`compass_address_timeline` est exposée aux agents.** Fait le 17 août, en
    **deux** outils MCP et non un : `trace_premise` rend la chronologie,
    `find_premises` rend les `location_id` sans lesquels elle est inappelable.
    C'est ce découpage qui était la « forme à décider » que `PLAN.md` §4.1
    attendait. Détail et raisons dans `mcp-server/README.md` ; les deux points
    qui ne se déduisent pas du code :

    - **`find_premises` est épinglé au millésime 2023, sans paramètre.** Règle de
      licence, pas couverture : `20260809000011` retient de 2017 et 2020
      l'existence même d'un relevé, et un annuaire qui énumérerait leurs locaux
      divulguerait exactement cette existence.
    - **`is_vacant` n'est pas rendu.** Structurellement faux sur tout 2023
      (`retail_only`), il se lirait comme « ce local est occupé » — un artefact de
      publication pris pour un fait.

    Le front n'a toujours pas de consommateur de la chronologie (`PLAN.md` §2.7) :
    ce serveur est désormais le seul, en dehors de la porte.

11. ~~**Une branche non fusionnée, à trancher.**~~ **Tranché le 17 août : rien
    n'était perdu.** `claude/stoic-varahamihira-24f96d` (`cb8b15f`) portait quatre
    commits absents de `main` **par identifiant**, et les quatre sont
    patch-équivalents à ce que `main` porte déjà : elle était la branche d'origine
    du serveur MCP, arrivée par les PR #2 et #3 sous d'autres identifiants. La
    branche et son worktree ont disparu avec la fermeture des sessions.

    **L'outil qui répond est `git cherry -v main <branche>`**, et non
    `git branch --merged` ni `git log main..<branche>` : ces deux-là comparent des
    identifiants, donc une branche rebasée ou reprise en PR paraît toujours
    divergente. `git cherry` compare les **patchs** et marque `-` ce qui est déjà
    présent. C'est la commande à sortir la prochaine fois qu'une branche a l'air
    orpheline — trois des quatre commits ci-dessus auraient sinon justifié une
    fusion inutile.

---


15. ~~**`ticket/w6-analyse` attend une seule commande, et elle n'est pas dans mes mains.**~~
    **La commande a été lancée. La migration est posée, et la consigne qui suivait est levée.**
    Ouvert le 6 septembre 2026 au soir, refermé le 7. La branche portait `w6-analyse` (#50) en
    entier — la migration `20260906000001_analyses_du_schema.sql`, les invariants `I43` à `I46`,
    trois budgets de bras E, `DIAGNOSTIC.md` §40 et §41.

    Ce qui manquait était `supabase db push`, qu'Ivan a lancé le 6 septembre au soir : le
    classifieur de permissions l'avait refusé deux fois (Bash puis PowerShell) et il n'a pas été
    contourné — appliquer le SQL à la main aurait laissé le ledger non tenu, ce que `w1-ledger`
    (#82) existe pour attraper.

    **Mesuré le 7 septembre 2026** : `npm.cmd run ledger` sort **PASS, 54 au ledger, 54 suivies
    par git, 0 en écart**. La phrase « ne pas fusionner avant de l'avoir lancé » qui tenait cette
    place **était périmée dès ce moment-là**, et c'est la revue de #91 qui l'a attrapée avant
    qu'elle ne parte sur `main` — à l'endroit exact qu'une session lit au démarrage. Elle ne
    décrivait plus le dépôt.

    Le SQL n'était pas un pari : syntaxe, comportement anonyme et privilégié, `I43` à `I46` au
    vert et les budgets avaient tous été éprouvés contre le distant **en transaction annulée**, le
    6 septembre. Ce que la transaction ne pouvait pas donner, c'est le ledger — et c'est
    exactement ce qui manquait.

    **La revue a eu lieu**, par une session distincte, comme « La revue » (`docs/SESSIONS.md`) le
    demande pour une branche qui pose une migration et des invariants. Elle a rendu six
    corrections avant fusion — trois sur cette page, trois sur `eval/invariants.sql` (le miroir
    manquant de `I43`, deux millésimes épinglés à dériver, et la limite que les quatre neufs
    n'énonçaient pas) — et une prémisse fausse à rectifier : le zéro fabriqué de
    `changed_since_previous` **ne touche que `compass_voie_rotation`**, jamais
    `compass_street_rotation`, qui porte la garde depuis le 28 août. Le fond part dans #89, le
    sabotage manquant dans #94.

18. ~~**`w6-contexte` (#119) est fait à MOITIÉ.**~~ **Livré en entier le 11 septembre 2026** —
    `e4402fa` à 10:12 (moitié 1, PR #124) et `3ca6be6` à 10:43 (moitié 2, étapes 3 à 6, PR
    #130). Remesuré le 13 septembre : `/carte` est bien dans `public/sitemap.xml`, donc le
    critère n° 6 est démontré. **Cette entrée a dit deux jours durant qu'il restait à faire
    des étapes livrées** — c'est ce que `#142` signale, et c'est la raison pour laquelle un
    état non redaté est plus coûteux qu'un état absent.

    ~~**Ce qui reste n'est pas du travail, c'est de l'hygiène de ticket, et c'est une décision
    d'Ivan.**~~ **Scindé et fermé le 13 septembre 2026.** Le **corps** de `#119` ne
    correspondait ni à son titre ni à son ticket : il portait le plan accueil du 8 septembre —
    typographie, palette, page `/travaux` — que `docs/tickets/w6-contexte.md` met explicitement
    hors périmètre. `#119` est close, et ce plan vit désormais dans
    [`#148`](https://github.com/IvandeMurard/paris-compass/issues/148), qui ne prétend plus être
    `w6-contexte`.

    **Ce que la clôture ne dit pas, et qui a été mesuré le soir même** : `w6-contexte` est
    livré ET servi, et la fiche ne rend pourtant rien — elle plante. Voir le point **19** de
    `docs/REPRISE.md`, qui a remplacé celui-ci en tête de « La suite ». Un ticket fermé sur ses
    critères n'est pas un produit qui marche, et les deux se mesurent séparément.

---

## Deux rouges de la porte, fermés — déplacés depuis `docs/REPRISE.md` le 9 septembre 2026

Sortis de la page de reprise parce qu'ils y étaient rayés depuis le 3 septembre et que le
plafond de `scripts/porte/documents.test.ts` demande à la session qui touche la page d'en
sortir une entrée close plutôt que de dépenser la marge. Gardés pour leurs mesures datées :
`#74` est le rouge que personne n'avait relevé — c'est lui qui a écrit `#77` — et `eval`
rouge depuis le 2 septembre est le défaut que la porte planifiée a montré la première fois.

13. ~~**Un rouge de la porte est ouvert et sans preneur — [`#74`](https://github.com/IvandeMurard/paris-compass/issues/74), du 1er septembre 2026.**~~ **Fermé le 3 septembre 2026.**
    Repéré le 2 septembre en cherchant autre chose, ce qui est déjà le symptôme : personne
    n'était allé voir. `verify:mcp` sort en **1** sur le runner, à l'étape « build index.ts » :

    ```
    /home/runner/.../node_modules/esbuild/bin/esbuild:1
    ELF^B^A^A
    SyntaxError: Invalid or unexpected token
    ```

    **Diagnostiqué et corrigé le 2 septembre 2026 — `DIAGNOSTIC.md` §33.** `verify-mcp.mjs`
    lançait `node node_modules/esbuild/bin/esbuild` : ce chemin est un script Node sur Windows
    et le binaire natif partout ailleurs. La ligne était *juste* sur le seul système où elle a
    été écrite. L'appel se décide désormais en lisant le fichier — `#!` ou `ELF` — et non en
    lisant `process.platform` ; `scripts/esbuildInvocation.mjs` porte la règle, et ses 4 tests
    jouent **les deux branches sur la même machine**, ce qu'aucun poste ne pouvait faire seul.

    **Preuve obtenue, et `#74` est fermée.** Passage planifié
    [`33753907840`](https://github.com/IvandeMurard/paris-compass/actions/runs/33753907840),
    3 septembre 2026 à 12:12 UTC — le premier à tourner avec les deux correctifs :

    ```
    **Rien à faire.** 8 bras sur 10 au vert le 3 septembre 2026.
    **Changé, sans décision requise.** freshness · eval (11 avertissements)
    **Décision requise.** Aucune.
    ```

    `verify:mcp` : **41 contrôles, 39 au vert, 0 en échec**, 2 suspendus (Overpass). C'est la
    mesure que ce poste ne pouvait pas prendre — une machine n'a qu'un système d'exploitation.
    Et `porte:publie`, le dixième bras, sort vert à son premier passage planifié.

    Ce que ça ne règle pas : ce rouge avait attendu deux jours sans lecteur, et c'est
    [`#77`](https://github.com/IvandeMurard/paris-compass/issues/77) qui porte ce défaut-là.

14. ~~**`eval` est rouge depuis le 2 septembre 2026, et personne ne l'avait vu.**~~ Sortie **1**,
    donc un vrai échec et non les 11 avertissements de baseline habituels :

    ```
    FAIL  prix_median_local_identifiable — attendu 160868, mesuré 163000 (1.33%)
    ```

    Signalé par la porte le 2 septembre à 12:22 UTC, en commentaire de
    [`#74`](https://github.com/IvandeMurard/paris-compass/issues/74), avec `verify:mcp`. Trouvé
    le soir même en cherchant autre chose — c'est ce qui a motivé
    [`#77`](https://github.com/IvandeMurard/paris-compass/issues/77).

    **Traité le 2 septembre 2026 — et ce n'était pas une dérive de données, mais un défaut de la
    règle qui les juge.** `DIAGNOSTIC.md` §34.

    Le bras B comparait **toutes** les baselines au même seuil de 1 %, dont le commentaire
    donnait la raison : au-delà, ce n'est plus une correction de source mais un changement de
    pipeline. Juste — *pour un comptage*. La médiane n'en est pas un : mesuré sur le distant, une
    population qui passe de 5 942 à 5 959 cessions (**+0,29 %**) déplace la médiane de
    160 868 à 163 000 € (**+1,33 %**), parce que les prix de fonds se massent sur les nombres
    ronds — `150 000` revient 130 fois, `180 000` 88 fois, `160 000` 63 fois — et que la médiane
    est assise sur une marche. Dix-sept cessions déplacent le rang médian de huit positions, et
    huit positions valent 5 000 € à cet endroit.

    **Le seuil était faux dans les deux sens**, et le second est le grave : une médiane passant
    de 164 999 à 165 001 € bouge de 0,001 %, donc passe en simple avertissement — alors qu'elle
    fait basculer le chiffre publié au `README` de 160 000 à 170 000 €. Le produit aurait affirmé
    un prix que la base ne portait plus, porte au vert.

    Une baseline porte donc désormais `publie: { pas, valeur }`, et `scripts/eval/drift.ts` juge
    un quantile sur le changement du **chiffre publié**, pas sur un pourcentage. Ce n'est pas un
    desserrage : la règle devient plus stricte là où le produit mentirait.

    **Vérifié** le 2 septembre 2026, `eval` rejoué en entier :

    ```
    WARN  prix_median_local_identifiable — attendu 160868, mesuré 163000 (1.33%) — quantile, chiffre publié inchangé à 160000
    AVERTISSEMENT — 11 écart(s) sous le seuil bloquant
    ```

    Sortie **3, zéro échec** — l'état du 31 août et du 1er septembre.

    **La baseline n'a pas été regelée, délibérément.** L'avertissement à 1,33 % reste, et il est
    honnête : la valeur brute a bougé. `note_regel` autorise le regel à trois conditions, mais
    impose de remesurer **toutes** les valeurs à la reprise du gel — jamais de les reporter
    depuis un pourcentage. C'est un acte daté et justifié, pas l'effet de bord d'un correctif de
    règle. À faire un jour, en le disant.

    *Ce qui reste ouvert et que ce correctif ne touche pas :* les prix par métier du `README` —
    250 000 €, 220 000 €, 86 000 €, 50 000 € — ne sont sous aucune baseline. Ils peuvent vieillir
    en silence, exactement comme la médiane l'aurait fait.
---

## Les deux publications du serveur MCP — déplacées depuis `docs/REPRISE.md` le 13 septembre 2026

Sorties de la page de reprise parce qu'elles y étaient rayées depuis le 3 septembre et que le
plafond de `scripts/porte/documents.test.ts` demande à la session qui touche la page d'en sortir
une entrée close plutôt que de dépenser la marge. Gardées pour leurs mesures datées : les deux
registres, leur ordre, et ce que chacun a refusé en chemin.

15. ~~**Publier `paris-compass-mcp`.**~~ **Fait le 3 septembre 2026** —
    [`paris-compass-mcp@0.1.0`](https://www.npmjs.com/package/paris-compass-mcp), et
    [`#35`](https://github.com/IvandeMurard/paris-compass/issues/35) est fermée avec sa
    démonstration.

    **Démontré sur ce que npm sert**, pas sur l'arbre : `npm.cmd run mcp:paquet -- --registre`
    installe le paquet depuis le registre dans un répertoire neuf hors du dépôt, puis
    l'interroge en JSON-RPC sans le SDK — s'en servir prouverait que notre client sait parler à
    notre serveur, pas que le protocole passe. **PASS, sortie 0**, 6 outils annoncés, les quatre
    du « Fait quand » exercés, **aucune configuration** dans le bac d'installation.

    **Deux défauts trouvés en chemin, qui auraient été publiés :**

    - `prepublishOnly` **ne tourne pas sur `npm pack`**. La première archive emportait un `dist/`
      périmé et levait encore l'ancienne erreur de configuration. Corrigé en `prepack`. Sans le
      contrôle d'avant-publication, c'est ce paquet-là qui serait sur npm ;
    - le contrôle ne regardait que l'archive **locale**, ce qui prouve l'empaquetage et jamais la
      publication — le §32 une fois de plus. Le drapeau `--registre` ferme cet écart.

    **La 2FA d'npm a bloqué deux tentatives**, et la sortie est le navigateur :
    `npm.cmd publish --access public --auth-type=web`. Un OTP npm ne s'envoie jamais par
    courriel — c'est un code TOTP de l'application appairée, ou un passkey, et dans le second cas
    le prompt `Enter OTP:` ne peut rien recevoir. Compte `compass222`, 2FA en `auth-and-writes`.

    *Ce qui reste ouvert, et qui n'est pas rien :* **le compte npm a été créé le 2 septembre à
    17:40 et sa 2FA activée neuf minutes plus tard.** Si les codes de récupération n'ont pas été
    conservés, le paquet dépend d'un seul appareil. À vérifier avant qu'il y ait des
    utilisateurs, pas après.

    *Et ce qu'aucun bras ne couvre :* `mcp:paquet` est excusé dans `cadence.json` — un `npm pack`
    et une installation réseau chaque matin dépenseraient ça contre un artefact qui ne bouge
    qu'à la publication. Une version publiée qui se casserait après coup, un dépendant retiré du
    registre par exemple, ne serait pas vue. À rejouer à la main avant chaque publication.

16. ~~**Publier au registre MCP.**~~ **Fait le 3 septembre 2026, `0.1.2`.**
    [`io.github.IvandeMurard/paris-compass-mcp`](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.IvandeMurard/paris-compass-mcp)
    — `status: active`, `isLatest: true`. Le serveur est **détectable** là où les clients MCP
    cherchent, en plus d'être accessible par npm.

    Vérifié une dernière fois sur ce que npm sert : `mcp:paquet -- --registre` rend **PASS,
    sortie 0**, `initialize → paris-compass 0.1.2`, six outils, les quatre du « Fait quand »
    exercés, sans configuration.

    **Trois refus du registre, tous découverts après une publication npm.** C'est la leçon, et
    elle a coûté deux montées de version :

    | Refus | Cause | Ce qui l'attrape maintenant |
    | --- | --- | --- |
    | `Registry validation failed` | `mcpName` absent du paquet npm | `mcpRegistry.test.ts` |
    | `422 expected length <= 100` | description de 209 caractères | idem, plafond **et** plancher |
    | `403 You do not have permission` | `io.github.ivandemurard` ≠ `io.github.IvandeMurard` — le registre compare **à la casse** | idem, recoupé au propriétaire du dépôt |

    Chacun n'apparaît qu'au `publish`, donc **après** que npm a figé la version : corriger impose
    de republier. Les six règles de `scripts/mcpRegistry.test.ts` les refusent désormais à chaque
    `npm.cmd run test`, donc aussi sur la porte planifiée. Le mode d'emploi complet, avec le
    tableau des messages et leur cause réelle, est dans **`mcp-server/PUBLISHING.md`**.

    *Un piège de séquence, à retenir :* le jeton du registre est de courte durée. Le nôtre a
    expiré pendant qu'on corrigeait la casse et republiait sur npm — `login github` puis
    `publish` s'enchaînent, ils ne se laissent pas séparer par un autre chantier.

    *Ce qui reste à décider, et qui n'est pas technique :* les descriptions de `lat` et `lng` sont
    en français quand tout le reste de la surface est en anglais. Un agent s'en accommode ; un
    lecteur humain du registre y verra une négligence. À trancher avant que le serveur ait des
    utilisateurs.

---

## Les comptes de tests antérieurs au 13 septembre 2026 — déplacés depuis `docs/REPRISE.md` le 13 septembre 2026

Sortis de la ligne « Tests unitaires » par `w1-porte-page` (`#158`) pour tenir le plafond de `scripts/porte/documents.test.ts`, qui refuse de se laisser monter pour éteindre son propre rouge. La mesure courante — **660 sur 49 fichiers** — reste dans `docs/REPRISE.md` avec les deux relevés qui la précèdent immédiatement ; ce qui suit est la chaîne plus ancienne, gardée pour ses dates.

**396** mesurés plus tôt le même jour — dont les 20 de `scripts/porte/observabilite.test.ts` ajoutés par `w1-observabilite-echappement` (#81), qui énumèrent les fichiers atteignant PostgREST et exigent de chacun l'échappement ou une raison écrite. **376** mesurés le 5 septembre 2026 — dont les 10 de `scripts/ingest/lib/arcgis.test.ts` ajoutés par `w1-geometrie` (#68), qui éprouvent `featurePoint` sur la chaîne `"NaN"` que le service envoie pour un point absent. **366** mesurés plus tôt le même jour — dont les 15 de `scripts/porte/etat.test.ts` ajoutés par `w1-porte-lue` (#77) et les 14 de `scripts/porte/catalogue.test.ts`. **Le chiffre de 335 daté du 3 septembre était déjà faux** : remesuré sans le fichier neuf, le dépôt en portait **337**. Historique : 273 après `#71` , puis 299 avec `scripts/porte/cadences.test.ts`, la réconciliation distant/migrations et deux cas ajoutés de part et d'autre dans `scripts/ingest/workflow.test.ts` et `scripts/porte/workflow.test.ts`, puis **301** en tranchant les cadences sans seuil, puis **325** le 2 septembre 2026 avec les 14 tests de `scripts/build/envPublic.test.ts` , les 6 de `scripts/porte/publie.test.ts` , les 4 de `scripts/esbuildInvocation.test.ts` , les 6 de `scripts/eval/drift.test.ts` et les 4 de `scripts/mcpRegistry.test.ts`

---

## Le point 17 — `ticket/w2-idfm` attendait une fusion, elle a eu lieu — déplacé depuis `docs/REPRISE.md` le 14 septembre 2026

Sorti de « La suite, par ordre » par `w6-fiche-corpus` (`#157`), pour la raison que le plafond de
`scripts/porte/documents.test.ts` annonce lui-même : la session qui touche à cette page y déplace
une entrée close plutôt que de dépenser la marge. Celle-ci l'était depuis une semaine sans que
personne le dise — le point annonçait « il ne reste donc que la fusion de #97 », et **`#97` est
fusionnée depuis le 7 septembre 2026 à 22:03 UTC, `#19` close**. Mesuré à la commande, pas relu.

Ce qu'il portait, et qui reste vrai : les trois migrations IDFM sont posées et au ledger, les
données chargées — 258 stations, 29 489 lignes de profil, 85 410 locaux rattachés —, le catalogue
porte la source en `ingérée`, et la revue avait trouvé la porte ROUGE sur quatre défaillances que
le bras n'avait jamais jouées : `I23`/`I24`/`I32` sur `idfm_validation_profile` avec RLS active et
zéro politique de lecture, `I42` sur `idfm_station.geom` sans contrainte de finitude. Corrigé par
une **troisième** migration, `20260907000003_idfm_lecture_publique.sql`, les deux premières étant
au ledger et ne se réécrivant pas (`#83`).

**Les deux points ouverts qui le suivaient ne sont pas clos et ne partent pas avec lui** :
`DIAGNOSTIC.md` §44 — l'exclusion de Porte de Clichy est plus large que le défaut, 156 locaux
mesurés reçoivent une station qui n'est pas la plus proche — et §45 — la sonde de catalogue IDFM
dérivera vers le vert sur une édition gelée. Les deux vivent dans `DIAGNOSTIC.md`, qui est leur
place ; ce point n'en était que l'écho.

---

## Les points 3 et 4 — la remontée de l'absence et de la provenance jusqu'à l'interface — déplacés depuis `docs/REPRISE.md` le 14 septembre 2026

Sortis de « La suite, par ordre » par `w6-fiche-corpus` (`#157`) pour tenir le plafond de
`scripts/porte/documents.test.ts`. Ils étaient rayés depuis août, et **la page annonçait déjà leur
départ** — la phrase « les points 1, 3, 4, 8… sont partis dans `docs/REPRISE-ARCHIVE.md` » était
fausse pour deux d'entre eux, qui étaient restés en place sous elle. Ils sont ici, intacts.

3. ~~**Corriger `?? 0`** dans `src/services/opendata/scoring.ts`.~~ **Fait le
   9 août.** L'absence remonte maintenant jusqu'à l'interface : `AreaScores` et
   `NoiseEstimate` sont nullables, la carte affiche « n/d » et un point gris
   plutôt qu'un rouge qui se lirait comme une mauvaise note, et un score inconnu
   n'exclut plus un local du filtre — l'exclure reviendrait à affirmer qu'il est
   hors bornes. Couvert par `src/services/opendata/scoring.test.ts`.

   **Suite, le même jour, un cran plus bas.** Le chemin nul câblé jusqu'à
   l'interface était correct mais inatteignable : le noyau n'émettait jamais de
   valeur nulle, et un `saturating(0, n)` valait 0 — donc une couche absente
   produisait un zéro *mesuré*. Deux correctifs :

   - `NeighbourhoodContext.loaded` (obligatoire) déclare les couches réellement
     chargées. Un tableau vide ne tranche pas entre « rien ici » et « rien reçu » ;
     seul l'appelant le sait, et le noyau reste pur en refusant de deviner.
     `scoreLocation` rend `unavailable()` par couche manquante, y compris pour les
     composites qui lisent deux couches.
   - **Le défaut réellement atteignable en production était ailleurs** : Overpass
     répond **HTTP 200** avec `elements: []` et un `remark` quand sa requête expire.
     Le `validate` l'acceptait. Tous les scores tombaient à 0 et le bruit devenait
     « très faible » — une rue calme affirmée à partir d'une panne. Voir
     `DIAGNOSTIC.md` §3.e.

   `src/pages/Methodology.tsx` publie désormais la règle, section « Quand une
   source manque » (règle de `CLAUDE.md` : formule modifiée, page mise à jour).
4. ~~**Remonter la provenance dans l'interface.**~~ **Fait le 12 août**, dans le
   dépôt et non côté Lovable. `computeScores` ne déballe plus `Measured<T>` : le
   noyau rend, l'interface affiche. Le bruit a rejoint les autres scores, sa
   forme propre `{ score, label }` étant celle qui lui faisait perdre sa réserve.
   Trois règles tenues en un point unique — absent en « n/d », estimation
   annoncée, source et millésime collés au nombre. Le marqueur de réserve est un
   **lien** vers `/methodologie`, pas une infobulle : une réserve au survol
   n'existe pas sur écran tactile et ne survit pas à une lecture à voix haute.
   La décision d'affichage est isolée dans `src/components/figureText.ts`, sans
   JSX, parce que le harnais tourne en `environment: 'node'`.

---

---

## Point 19 de « La suite, par ordre » — la fiche lit le corpus

**Sorti de `docs/REPRISE.md` le 15 septembre 2026** par `w6-amenites-corpus` (#169), qui le
remplace par un point 20 sur tout ce qui est encore vrai. Gardé ici pour ses mesures datées :
elles sont les seules du dépôt sur les trois états de la fiche entre le 13 et le 14 septembre.
Numérotation d'origine conservée.

19. **La fiche lit le corpus. Ce qui reste ouvert est le déploiement, pas le dépôt.**
    `#156`, `#158` puis `#157` fermées les 13 et 14 septembre 2026, dans l'ordre décidé par
    Ivan. Ce qui suit garde les mesures de chacune, parce qu'elles se répondent.

    **`#157`, le 14 septembre 2026 : la fiche appelle `compass_*`, et ses origines ne sont
    plus uniformes.** Les locaux viennent de `compass_scoring_context_within` — APUR BDCom
    2023, ODbL-1.0, millésime `2023-06` lu sur `compass_vintages` et jamais écrit dans le code
    — et seuls les équipements et la voirie restent sur Overpass. Un axe neuf, **`tissu
    commercial`**, ne lit que cette couche-là : c'est le constat qui survit à trois miroirs
    morts, et il est **porteur**, ce qui est « le corpus d'abord » écrit en code plutôt qu'en
    prose. Mesuré rue de Bretagne, chemin anonyme : **920 locaux dans 400 m en 144 à 735 ms**,
    contre 8 981 à 43 315 ms pour un miroir Overpass quand il répond.

    **Ce que la mesure a trouvé en chemin, et qui vivait sur le chemin de l'agent depuis le
    15 août** : PostgREST plafonne une réponse à mille lignes, `compass_scoring_context_within`
    rend `total_matched` pour le dire, et **personne ne le lisait**. À 2 000 m — le rayon que
    `score_location` annonce dans son schéma d'entrée — l'agent recevait **1 000 locaux sur
    17 190**, comptés comme un total et estampillés « APUR BDCom 2023 » sans réserve.
    `DIAGNOSTIC.md` §51, corrigé sur les deux surfaces le même jour.

    **Ce que `#157` ne rattrape pas, et c'est écrit dans son propre énoncé** : servir le corpus
    ne le rend pas *lisible*. La fiche porte maintenant six constats là où `w6-contexte` en
    veut quatre à six scannables — elle est à la borne haute, et le choix de ce qu'on montre
    reste un travail produit distinct. Et **la vacance n'est toujours pas servie** : BDCom 2023
    est `retail_only` et porte **0 local vacant** sur 60 845 relevés, contre 7 853 en 2017 et
    8 764 en 2020. C'est la réponse de l'APUR qui l'ouvre, pas du code — point 2 ci-dessous.

    **Ce qui est corrigé, et ce que la correction a appris.** `ContextMap` créait sa carte
    sans vue, donc Leaflet n'attachait aucune couche — `Map.addLayer` diffère par `whenReady`
    — et `circle.getBounds()` jetait `Cannot read properties of undefined (reading
    'layerPointToLatLng')` dans un effet, que React remet à la frontière d'erreur. **Le
    plantage ne dépendait pas d'Overpass** : démontré dans Chrome sans tête contre le build de
    `3cb9b5d`, miroirs **rétablis** avec un instantané Overpass réel rejoué, la page meurt
    quand même, sur le même message. La chaîne de cause du ticket avait un maillon de trop.
    `DIAGNOSTIC.md` §50 porte le détail et les miroirs remesurés.

    **Ce que la fiche rend maintenant**, mesuré le même jour, même navigateur, même URL :
    miroirs pendus, elle se pose en **10 224 ms** sur le refus et le bloc des trous, chacun
    nommant « source injoignable », **aucun écran d'erreur** ; miroirs refusant d'emblée,
    **272 ms** ; miroirs rétablis, **260 ms** et un verdict composé. Avant, dans les trois
    états : l'écran d'erreur.

    **Ce qui reste ouvert après les trois, et ce n'est plus du code.** Le quinzième bras,
    `page` ([`#158`](https://github.com/IvandeMurard/paris-compass/issues/158)), reste **ROUGE
    contre la production** et le restera chaque matin jusqu'à ce que Lovable republie : le
    bundle servi est antérieur à `#156`, donc à plus forte raison à `#157`. Le dépôt est vert,
    le visiteur ne l'est pas, et c'est exactement la distinction que ce bras existe pour tenir
    — ne pas le désarmer. **La porte était entièrement au vert pendant la panne de septembre**,
    et c'est ce qui l'a fait naître.

---

## Tests unitaires — le relevé de 746, le 15 septembre 2026

**Sorti de `docs/REPRISE.md` le 16 septembre 2026** par `w6-langue-absences` (#181), pour tenir le
plafond de `scripts/porte/documents.test.ts` : le fichier faisait 102 422 octets pour un plafond de
103 000, et le relevé neuf n'y entrait pas. Quatrième application du même geste après les 13 et
15 septembre. Monter le plafond reste interdit ; sortir une entrée close ne l'est pas.

Antérieurement **746 sur 53 fichiers, remesurés le 15 septembre 2026 au soir** par `w6-fiche-delai` (#180), qui en ajoute **huit** : quatre sur un miroir qui ne répond JAMAIS — la forme qui manquait, un miroir qui refuse répondant vite —, deux sur `pendingAxes`, deux sur le trou qui n'en est pas un. **`main` en portait 738 sur 53**, mesuré la même minute sur `2dabf49` : la ligne qui suit annonçait 718 sur 52, fausse de vingt tests avant que ce ticket commence.

## Tests unitaires — les relevés de 718 à 660, du 14 au 15 septembre 2026

**Sortis de `docs/REPRISE.md` le 15 septembre 2026 au soir** par `w6-dossier` (#33), pour tenir le
plafond de `scripts/porte/documents.test.ts` : le fichier faisait 102 953 octets pour un plafond de
103 000, soit **47 octets de marge**, et aucun relevé neuf n'y entrait. Monter le plafond est
interdit — `CLAUDE.md` le range avec le desserrage d'une baseline — sortir une entrée close ne
l'est pas. Troisième application du même geste après le 13 et le 15 septembre. Chaque relevé garde
sa date et ce que son ticket avait ajouté.

Antérieurement **718 sur 52 fichiers, mesurés le 15 septembre 2026** — dont les six que `w6-amenites-corpus` ajoute à `src/hooks/useAddressContext.test.ts`, qui jouent hors réseau ce que le distant ne peut pas produire à la demande : miroirs coupés et verdict qui SE COMPOSE (le critère du ticket, écrit en contre-preuve de `#157` dont le même appel refusait), un arrêt ferré trouvé et un arrêt absent comme deux LECTURES distinctes, une couche ferrée injoignable qui retire l'axe, et le **hors corpus qui fait tomber les trois couches du corpus ensemble** — celui-là a été écrit après que l'écran a montré le défaut, pas avant (`DIAGNOSTIC.md` §53). Antérieurement **689 sur 51 fichiers, mesurés le 14 septembre 2026** — dont les 13 de `src/hooks/useAddressContext.test.ts` et les 12 de `src/services/compass/addressCorpus.test.ts` (`#157`), qui jouent hors réseau les combinaisons que le distant ne peut pas produire : un millésime retenu, qui n'existe pas pour un appelant anonyme sur 2023, et un compte plafonné par PostgREST. Le contrôle qui porte le ticket est écrit en contre-preuve — miroirs injoignables, un constat doit RESTER, et porter « APUR BDCom 2023 ». Antérieurement **660 sur 49 fichiers, mesurés le 13 septembre 2026 au soir** — dont les 20 de `scripts/porte/page.test.ts` (`#158`), qui rejouent la règle du quinzième bras sur **quatre sondes capturées au navigateur**, dont les deux temps de la contre-preuve : la fiche bloquée sur « Lecture du quartier en cours… », puis plantée sur `layerPointToLatLng`. Deux cas tiennent la frontière que ce bras ne franchit pas — une mesure cassée sort en 2 jamais en 1, un libellé que `main` ne déclare plus sort en 3.

## Tests unitaires — les relevés de 640 à 416, du 6 au 13 septembre 2026

**Sortis de `docs/REPRISE.md` le 15 septembre 2026** par `w6-amenites-corpus` (#169), pour tenir
le plafond de `scripts/porte/documents.test.ts` — le même geste que le 13 septembre pour les
relevés de 396 à 273, et pour la même raison : monter le plafond est interdit, sortir une entrée
close ne l'est pas. Chaque relevé garde sa date et ce que son ticket avait ajouté.

Antérieurement **640 sur 48 fichiers, le même jour** — dont les 15 de `w6-fiche-robuste` (`#156`), et **le premier fichier de ce dépôt qui MONTE un composant** : `src/components/context/ContextMap.test.tsx` tourne sous `@vitest-environment jsdom` avec le vrai Leaflet, parce que le défaut n'existe qu'une fois la carte montée. Quatre de ses cinq cas échouent sur `3cb9b5d`, dont deux sur le message exact de production. `node` reste l'environnement par défaut, et c'est une règle : une décision sur des mots ou une géométrie se teste sans DOM. Antérieurement **625 sur 46 fichiers, mesurés le 13 septembre 2026** — dont les 6 de `#152` sur la seconde population du bras `servi` : l'un rejoue l'incident en miniature, un autre surveille que la part de libellés prouvables ne s'effondre pas, ce qui ferait du bras un témoin sans pouvoir de décision, en silence. Antérieurement **619 sur 46 fichiers, mesurés le 13 septembre 2026** — dont les 8 de `src/services/opendata/environment.test.ts` (`#145`), qui tiennent la distinction entre une source qui n'a rien et une source qui n'a pas répondu. L'un d'eux échoue si quelqu'un refusionne les deux cas pour simplifier un appelant. Antérieurement **611 sur 45 fichiers, mesurés le 13 septembre 2026** sur `ticket/servi-contre-suivi` — dont les 16 de `scripts/porte/servi.test.ts` (`#142`), qui rejouent l'incident fondateur **sur la vraie table de routes** : un bundle portant les anciennes routes et pas les quatre neuves rougit en nommant les quatre, et un bundle où rien n'est trouvé rend « mesure cassée » et non un rouge. L'écart avec les 440 du 9 septembre n'est pas de mon fait seul : d'autres sessions ont écrit entre-temps. **440, mesurés le 9 septembre 2026** sur `ticket/avis-atteignabilite` — dont les 18 de `scripts/porte/avis.test.ts` ajoutés par le treizième bras (`#115`), qui jouent la règle d'atteignabilité hors ligne : un avis non jugé rougit, un verdict à demi écrit rougit, un verdict qui dit ATTEIGNABLE rougit quand même, une entrée qu'aucun avis ne porte plus rougit, et une raison que le dépôt contredit rougit toute seule. **422** plus tôt le même jour, après la montée de `vitest` en 4.1.11 — le chiffre est inchangé de part et d'autre de la montée, et c'est ce qui la valide. Antérieurement **418**, remesurés le 6 septembre 2026 au soir sur `ticket/w6-analyse`, qui n'ajoute aucun test — le chiffre de 416 daté du même jour avait été pris avant `#85` et `#86`. Antérieurement **416**, mesurés le 6 septembre 2026 — dont les 20 de `scripts/porte/ledger.test.ts` ajoutés par `w1-ledger` (#82), qui jouent la comparaison des deux listes sans base et vérifient que chaque divergence consignée nomme encore un fichier suivi, **avec l'empreinte contre laquelle elle a été écrite** : une seconde réécriture de `20260825000002` fait échouer `test` seul, sans secret ni connexion.

## Le point 20 — les quatre axes porteurs lisent le corpus — déplacé depuis `docs/REPRISE.md` le 15 septembre 2026 au soir

Sorti par `w6-dossier` (#33) pour tenir le plafond de `scripts/porte/documents.test.ts`, qui ne
laissait plus que 47 octets : monter le plafond est interdit, sortir une entrée close ne l'est pas.
Même geste que le point 19 le matin même. **Ce qui y reste vivant est la dernière ligne : `rail`
est ferré seulement, et personne n'a tranché que « desserte » pouvait devenir « desserte ferrée ».**

20. **Les quatre axes porteurs lisent le corpus. Overpass ne peut plus refuser un verdict.**
    `w6-amenites-corpus` (#169) fermée le 15 septembre 2026. Le détail de la livraison est dans
    `docs/tickets/w6-amenites-corpus.md`, section « Livré » ; ce qui suit est l'état.

    **Miroirs Overpass COUPÉS AU RÉSOLVEUR** — pas lents, irrésolvables — rue de Bretagne, Chrome
    sans tête contre le build local : **verdict composé en 1 316 à 2 411 ms**, « Tissu commercial
    dense, passage soutenu, desserte ferrée moyenne, services marchands à pied moyennement
    présents. », **cinq constats sur six**. Le 14 septembre, le même point rendait **un sur six**
    et un refus. Hors corpus (Massy) : refus nommé sur quatre axes, et trois causes distinctes au
    même écran — hors du corpus, source injoignable, retenu pour licence.

    **Deux des trois moyens du ticket n'existaient pas, et `docs/PLAN.md` §3.2 portait la même
    erreur** — donc aucun des deux ne pouvait corriger l'autre. `compass_station_profile` ne rend
    **aucun comptage** : sa colonne est `pct_validations`, la part d'une journée de station par
    tranche horaire, 24 tranches sommant à 99,99 % à Oberkampf. `compass_scoring_context_within`
    ne porte **aucun code d'activité** : six colonnes. Les deux fichiers sont corrigés, le piège
    est dans `docs/REPRISE-PIEGES.md`. Les volumes, eux, tiennent : **258 arrêts, 29 489 lignes de
    profil, 85 410 locaux rattachés sur 85 418**, remesurés, et un appelant anonyme les atteint —
    le piège de `#97` est bien levé.

    **Trois axes changent de NOM, et le nom EST l'honnêteté.** `transit` → `rail` (une distance à
    l'arrêt **ferré**, pas un comptage de nœuds), `walkability` → `services` (un relevé de
    commerces, pas des « aménités » qui contiennent écoles et bureaux de poste), `groceries` →
    `alimentaire`. Les anciens restent dans `AreaScores` sur Overpass et **`/carte` les affiche
    encore**. `Methodology.tsx` publie les deux formules neuves, règle de `CLAUDE.md`.

    **Les constantes sont remesurées, jamais recopiées.** Celles d'OSM sizent un marquage
    bénévole — 18 pour l'alimentaire — quand BDCom trouve **87 commerces alimentaires dans 400 m
    rue de Bretagne** : les réutiliser aurait rendu **100 partout**, le défaut de `DIAGNOSTIC.md`
    §52. Chacune est la médiane mesurée de sa famille divisée par ln 2, sur douze points
    parisiens. L'axe **sépare Auteuil (32) de Montorgueil (64)** là où `density` lit 97 contre
    100. Douze points, pas quatre-vingts quartiers : l'ordre de grandeur est juste, la
    re-dérivation sur la population entière est un meilleur nombre et le bloqueur de personne.

    **Un défaut trouvé à l'ÉCRAN, pas en relecture** — `DIAGNOSTIC.md` §53. À Massy, les deux
    couches neuves affichaient **0/100** : leurs fonctions réussissent hors de Paris et rendent
    zéro ligne, donc elles comptaient « chargées et vides ». Corrigé sur les deux surfaces —
    `compass_scoring_context_within` reste seule autorité sur la frontière. **Ce que ça ne
    rattrape pas** : les appelants sont protégés, pas les fonctions ; un agent appelant
    `compass_premises_within` en direct reçoit toujours zéro ligne à Massy. C'est le §36, ouvert,
    et sa sortie est une migration.

    **Ce qui attend une décision d'Ivan.** `rail` est **ferré seulement** — 258 arrêts, les bus
    n'y sont pas — là où le comptage OSM qu'il remplace les incluait : plus fiable où il regarde,
    aveugle où il ne regarde pas. Le libellé a été changé pour le dire sans attendre, mais
    personne n'a tranché que « desserte » pouvait devenir « desserte ferrée ». Et `services`
    reste aveugle au non marchand jusqu'à `w2-bpe-marches-velo` (#17).

## Le point 12 — le contrôle de la page publiée après republication — déplacé depuis `docs/REPRISE.md` le 15 septembre 2026

Sorti par `w6-fiche-delai` (#180) pour tenir le plafond de `scripts/porte/documents.test.ts` : monter le plafond est interdit, sortir une entrée close ne l'est pas. **La question du dernier paragraphe est toujours ouverte** et ne se répond pas d'ici.

12. ~~**Contrôler la page publiée après republication.**~~ **Fait le 2 septembre 2026, la
    production est réparée.** Ivan a republié depuis Lovable ; mesuré sur l'artefact servi
    juste après :

    | | Avant republication | Après |
    | --- | --- | --- |
    | Chunk d'entrée servi | `index-DZV_6s4n.js`, 771 180 octets | `index-BDzDPi5T.js`, **163 738 octets** |
    | Référence de projet dans le bundle | **0** occurrence | **1** |
    | Couple `void 0` à la place du client | présent | **aucun** |
    | Garde de configuration de `src/main.tsx` | absente | **présente** |

    L'entrée est passée de 771 ko à 164 ko parce que le découpage d'`App` a survécu au build
    de Lovable : c'est la preuve que le bundle publié vient bien de ce dépôt, et pas d'un
    artefact plus ancien.

    **Ce que ça ne dit pas, et qui reste ouvert.** Que les valeurs soient arrivées ne prouve
    pas que la garde `prebuild` ait tourné : elles peuvent venir de `.env` sans que
    `scripts/build/envGuard.ts` ait été appelé, si Lovable invoque `vite build` plutôt que
    `npm run build`. La réponse tient en une ligne à chercher dans leur journal de build :

    ```
    Configuration du front présente en mode « production » : VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
    ```

    Absente, la garde 2 ne protège pas le chemin de publication et seule celle de `main.tsx`
    tient. À consigner ici dans les deux cas — c'est ce qui décide si la règle est au bon
    endroit.

## Le point 19 — le stub laissé le 15 septembre 2026, et ce qu'il annonçait de faux

Sorti de `docs/REPRISE.md` le soir du 15 septembre 2026 par `w6-fiche-delai` (#180). Le texte complet du point 19 est plus haut dans ce fichier ; ceci est le renvoi qui restait sur la page vive. **Sa dernière affirmation était périmée** : le bras `page` a rendu PASS contre la production ce soir-là, en 10 901 ms — Lovable avait republié sans que personne le mesure.

19. **La fiche lit le corpus. `#156`, `#158` puis `#157`, fermées les 13 et 14 septembre 2026.**
    Rayé le 15 septembre 2026 : le point 20 ci-dessus le remplace sur tout ce qui est encore
    vrai, et `w6-amenites-corpus` a levé ce qui restait ouvert côté code. **Le texte entier, avec
    ses mesures datées — 920 locaux en 144 à 735 ms, le plafond PostgREST à 2 000 m, le plantage
    `layerPointToLatLng` et les trois temps de la fiche — est dans `docs/REPRISE-ARCHIVE.md`.**
    Ce qui n'est PAS rayé : le quinzième bras `page` reste **rouge contre la production** jusqu'à
    ce que Lovable republie, et il ne faut pas le désarmer.

21. **La fiche rend son verdict en moins d'une seconde et demie, miroirs pendus.**
    `w6-fiche-delai` (#180) fermée le 15 septembre 2026. Sortie de `docs/REPRISE.md` le
    16 septembre 2026 par `w6-modes` (#36), pour tenir le plafond de `documents.test.ts`. Le
    détail, les six passages comparés et la méthode sont dans `docs/tickets/w6-fiche-delai.md`,
    section « Livré » ; ce qui suit est l'état tel qu'il a été mesuré.

    **Mesuré Chrome sans tête, build local, les trois hôtes Overpass pointés sur un puits qui ne
    répond jamais** : verdict composé et **les cinq constats du corpus chiffrés en 573 à
    1 115 ms**, là où `2dabf49` mettait **10 178 à 10 201 ms** dans la même minute. `bruit
    routier` reste à l'écran tout du long — « Mesure en cours » pendant l'attente, puis « source
    injoignable » à l'expiration du budget, relevée à 10 153–10 190 ms. Contre un miroir local
    debout, il prend sa valeur et sa source à **4 207 ms** sur une page dont le verdict était
    rendu à 584 ms.

    **Le critère du ticket était vert sur `main` avant que le ticket commence**, et c'est le seul
    enseignement qui dépasse cette livraison : il disait « miroirs injoignables », or une coupure
    au résolveur échoue en une milliseconde et `main` répondait déjà en 480 à 915 ms. Un critère
    qui nomme une panne doit nommer LAQUELLE — `docs/REPRISE-PIEGES.md` porte la mesure et la
    recette du puits. **Ce qui n'est PAS fait** : le corpus reste sur le chemin critique, et un
    appel à froid a été mesuré à 2 974 ms.


## Tests unitaires — le relevé du 16 septembre 2026 au matin, et sa chaîne

Sorti de `docs/REPRISE.md` le 16 septembre 2026 par `w6-modes` (#36) pour tenir le plafond de `documents.test.ts`. Il portait le relevé de `w6-langue-absences` (#181) et l'histoire des trois sabotages joués contre `src/core/dossier.test.ts`, dont le deuxième restait VERT tant que le gabarit posait une distance ronde de 190 m.

| Tests unitaires | **798 sur 56 fichiers, remesurés le 16 septembre 2026** par `w6-langue-absences` (#181), qui ajoute **un fichier et 11 tests** — `src/core/motif.test.ts` : le recensement des six genres de motif, les deux paramétrés déclinés sur les cinq couches, deux phrases exigées **différentes** pour chacun, et la contre-preuve de `#61` — une phrase anglaise falsifiée qui ne change pas ce que lit l'écran. Deux autres entrent dans des fichiers existants. **`main` en portait 785 sur 55.** Antérieurement **785 sur 55 fichiers, remesurés le 15 septembre 2026 au soir** par `w6-dossier` (#33), qui ajoute **un fichier et 22 tests** — `src/core/dossier.test.ts` : chaque figure du dossier exporté re-dérivée depuis un objet sorti de `JSON.parse`, la population énumérée depuis `VERDICT_AXIS_ORDER`, les constantes comparées à celles du noyau, un refus de verdict, une couche encore en vol, un axe non fourni. **`main` en portait 763 sur 54** — 785 mesurés ici moins les 22 du fichier neuf, aucun autre fichier de test touché ; le relevé de 746 ci-dessous datait d'avant la fusion de `#190`. **Trois sabotages ont été joués contre ce fichier**, chacun restauré, et le deuxième — un opérande arrondi — était **VERT** tant que le gabarit posait une distance ronde de 190 m : passé à 187 m, les trois rougissent. Le contrôle était sain, le gabarit était aveugle (`docs/REPRISE-PIEGES.md`). **Le relevé de 746, du 15 septembre 2026, est dans `docs/REPRISE-ARCHIVE.md`**, sorti d'ici le 16 septembre 2026 par `w6-langue-absences` (#181) pour tenir le budget de `documents.test.ts`. **Les relevés antérieurs — 718 à 660, du 14 au 15 septembre 2026 — sont dans `docs/REPRISE-ARCHIVE.md`**, sortis d'ici le 15 septembre 2026 au soir par `w6-dossier` (#33) pour tenir le budget de `documents.test.ts`, qui ne laissait plus que 47 octets. **Les relevés antérieurs — 640 à 416, du 6 au 13 septembre 2026 — sont dans `docs/REPRISE-ARCHIVE.md`**, sortis d'ici le 15 septembre 2026 pour tenir le budget de `documents.test.ts`, comme les 396 à 273 l'avaient été le 13. **Les relevés antérieurs — 396 à 273 — sont dans `docs/REPRISE-ARCHIVE.md`**, sortis d'ici le 13 septembre 2026 pour tenir le budget de `documents.test.ts`. |


## Les points 22 et 23 de « La suite, par ordre » — déplacés depuis `docs/REPRISE.md` le 16 septembre 2026

**Sortis par `w6-mode-raison` (#197)** pour tenir le plafond de `documents.test.ts`, qui refusait
`docs/REPRISE.md` à 105 203 octets pour 103 000 — monter le plafond est le geste que `CLAUDE.md`
interdit. Les deux tickets sont clos et leur détail vit dans `docs/tickets/` ; ce qui est gardé
ici est ce que ces deux points portaient de mesuré et de daté. Numérotation d'origine conservée.

23. **Le noyau ne produit plus de prose : il produit un motif, et la page l'écrit dans sa
    langue.** `w6-langue-absences` (#181) fermée le 16 septembre 2026, `DIAGNOSTIC.md` §49 clos.
    Le détail et les quatre démonstrations sont dans `docs/tickets/w6-langue-absences.md`,
    section « Livré ».

    **Ce qui dépasse la livraison** : le défaut n'était pas « le noyau écrit en anglais » mais
    « chaque producteur choisit une langue pour un lecteur qu'il ne connaît pas ». Le symétrique
    était là, non consigné — `truncatedNote` du navigateur était en français et partait sur
    `/en/context/`. `unavailable()` refuse désormais une `string` : c'est le type qui tient la
    règle, pas la vigilance.

    **Ce qui n'est PAS fait** : aucun bras n'ouvre `/en/context/` — `page` s'arrête à
    `/contexte/` — donc une régression propre à la page anglaise passerait au vert chaque matin.
    Et les contrôles jugent qu'il y a deux langues, jamais que chacune dit vrai.

22. **Une fiche se télécharge, et chaque chiffre du fichier se refait sans nous croire.**
    `w6-dossier` (#33) fermée le 15 septembre 2026. Le détail, les deux instants de clic comparés
    et ce qui n'est pas fait sont dans `docs/tickets/w6-dossier.md`, section « Livré » ; ce qui
    suit est l'état.

    **Mesuré Chrome sans tête, build local, téléchargement écrit sur le disque et relu** : le
    fichier part **167 ms** après le clic et porte **6 figures — 5 chiffrées, 1 retenue — zéro
    provenance incomplète et zéro écart de re-dérivation**. Chaque ligne descend avec sa source,
    sa licence, son millésime, sa méthode, la formule, ses constantes, le rayon et **l'opérande** :
    `density` 100 sur **920 locaux** dans 400 m, `rail` 45 sur **317,07 m**, `services` 59 sur cinq
    comptes par famille. C'est l'opérande qui manquait — `Measured<T>` portait déjà les quatre
    premiers mots du ticket, et un lecteur ne pouvait toujours refaire aucun calcul.

    **La doctrine tient dans la structure, pas dans la discipline** : `buildDossier` prend une
    adresse et n'a pas de forme plurielle, le bouton n'existe que sur la fiche, et
    `downloadDossier` non plus. Il n'y a rien à retirer pour refuser l'export de masse ; il
    faudrait écrire une boucle.

    **Deux défauts trouvés à l'ÉCRAN et pas en relecture** — `DIAGNOSTIC.md` §55, corrigés avant
    la livraison : le fichier créditait la **BAN** d'un libellé qu'elle n'avait pas rendu (la fiche
    affiche le slug de l'URL tant que le géocodeur répond), et il perdait la distinction « mesure
    en cours » / « source injoignable » que `#180` avait construite. Le test unitaire était vert
    sur les deux et le serait resté.

    **Ce qui attend une décision d'Ivan** : **le PDF n'est pas fait.** Le ticket écrit
    « (PDF/JSON) », JSON est livré, et le PDF coûterait une dépendance, un avis de sécurité à
    juger, et le format où « re-dérivable » se vérifie par machine est déjà celui qui est là.

    **Ce qui n'est PAS fait** : le dossier porte les figures de la FICHE — pas
    `compass_address_timeline`, pas les avis BODACC, pas la suite d'activités. Et **aucun bras de
    porte n'ouvre le navigateur pour ce chemin** : `page` s'arrête au verdict et ne clique rien,
    donc une régression du bouton passerait au vert chaque matin.

---

## « La suite » — deux entrées closes sorties de `docs/REPRISE.md` le 17 septembre 2026

Sorties par `w2-rythme` (#208) pour tenir le plafond de `scripts/porte/documents.test.ts`,
et non parce qu’elles auraient cessé d’être vraies : les deux tickets sont fermés, leurs
mesures sont datées, et c’est exactement ce que cette page garde.

25. **Un ordre affiché porte sa raison, comme un chiffre affiché porte sa source.**
    `w6-mode-raison` (#197) fermée le 16 septembre 2026, ouverte sur objection d'Ivan le jour même
    de la livraison de `#36`. Le détail, les huit lectures d'écran et les quatre actes de la
    contre-preuve sont dans `docs/tickets/w6-mode-raison.md`, section « Livré ».

    **Ce qui est démontré, Chrome sans tête contre le `dist/` de la branche, dans les deux
    langues** : chacun des neuf axes de tête porte sa raison sur sa carte de constat — à côté de
    l'axe, jamais au survol — avec le **statut** de cette raison lu d'une énumération de trois
    valeurs. Les axes de queue n'en portent aucune, et aucune n'apparaît tant qu'aucun métier
    n'est choisi. Trois raisons sur neuf disent « mesurable, non mesuré à ce jour » et nomment le
    recoupement qui les trancherait ; les six autres disent « arbitrage, pas une mesure ».
    **Aucune ne dit « mesuré »**, et un contrôle rougit le jour où quelqu'un l'écrit.

    **La contre-preuve est jouée en quatre actes**, `npm.cmd run test` à chacun : une raison
    retirée de `LEAD_AXES` sort en **1**, un axe de tête ajouté sans raison sort en **1** (douze
    contrôles sur trois fichiers), la phrase française d'une raison retirée sort en **1**, tout
    remis sort en **0**.

    **Un chiffre de l'énoncé était faux, et il est corrigé dans le ticket** : `noise` ne lit pas
    les 25 094 tronçons du corpus mais la couche OpenStreetMap des voies, à la demande. La mesure
    qui trancherait le bruit passe donc par le miroir qui tombe et non par une requête SQL —
    `docs/REPRISE-PIEGES.md`.

    **Ce qui attend TOUJOURS une décision d'Ivan** : `LEAD_AXES` lui-même. Ce ticket rend
    l'arbitrage visible et discutable ; il ne le rend pas vrai, et ce qui le trancherait sort du
    dépôt.

    **Ce qui n'est PAS fait** : aucun bras n'ouvre la page avec une clé `mode=` — le trou que
    `#36` avait déjà nommé, inchangé — et le serveur MCP ne sert toujours pas les modes, donc la
    raison attend son consommateur dans `w5-explain-metier` (#31).

24. **Le métier arbitre à l'écran, et il ne touche à aucun chiffre.** `w6-modes` (#36) fermée
    le 16 septembre 2026. Le détail, les deux adresses mesurées et ce qui n'est pas fait sont dans
    `docs/tickets/w6-modes.md`, section « Livré ».

    **Ce qui est démontré, Chrome sans tête contre le build local** : basculer de mode réordonne
    les cartes de constat, les clauses du verdict et le bloc des trous, en gardant **la même
    population et le même texte pour chaque axe, chiffre compris**. Le contrôle des alertes a
    demandé une SECONDE adresse : sur un point sain un seul trou porte un axe, donc il n'y a rien
    à permuter et une session qui s'arrêtait là aurait conclu à tort. C'est Massy, hors corpus et
    cinq trous rattachés à un axe, qui le montre.

    **Trois des neuf lignes de checklist sont répondues** — terrasses et les deux protections du
    PLU, lues dans des colonnes que `compass_premises_within` servait déjà et que la fiche jetait,
    comptées à 25 m et sans un appel de plus sur le chemin critique. **Les six autres nomment ce
    qui leur manque** : #13, #25, #49, et trois pour lesquelles aucune source ouverte n'existe.

    **Ce qui attend une décision d'Ivan** : l'ordre de tête des trois modes (`LEAD_AXES`) est un
    arbitrage produit, écrit avec sa raison, et il se change en trois lignes.

    **Ce qui n'est PAS fait** : aucun bras n'ouvre la page avec une clé `mode=`, donc une
    régression propre à un mode passerait au vert chaque matin — même trou que pour le bouton de
    `#33` et pour `/en/context/`. Et le mode ne suit ni dans le dossier exporté ni dans l'appel
    MCP montré, ce qui est voulu pour le fichier et n'était écrit nulle part.

23. — **le noyau produit un motif, la page l'écrit dans sa langue**, `w6-langue-absences`
    (#181), fermée le 16 septembre 2026, `DIAGNOSTIC.md` §49 clos. Sortie d'ici le 16 septembre
    2026 par `w6-mode-raison` (#197) pour tenir le plafond de `documents.test.ts` : l'état, ce
    qui dépasse la livraison et ce qui n'est PAS fait sont dans `docs/REPRISE-ARCHIVE.md`, le
    détail dans `docs/tickets/w6-langue-absences.md`.

22. — **une fiche se télécharge, et chaque chiffre du fichier se refait sans nous croire**,
    `w6-dossier` (#33), fermée le 15 septembre 2026. Sortie d'ici le 16 septembre 2026 par
    `w6-mode-raison` (#197) pour la même raison : les mesures du fichier — 167 ms, six figures,
    zéro écart de re-dérivation — les deux défauts trouvés à l'écran et le PDF non fait sont dans
    `docs/REPRISE-ARCHIVE.md`, le détail dans `docs/tickets/w6-dossier.md`.

21. — **la fiche rend son verdict en moins d'une seconde et demie, miroirs pendus**,
    `w6-fiche-delai` (#180), fermée le 15 septembre 2026. Sortie d'ici le 16 septembre 2026
    par `w6-modes` (#36) pour tenir le plafond de `documents.test.ts` : l'état, les six
    passages comparés — 573 à 1 115 ms contre 10 178 à 10 201 ms sur `2dabf49` — et ce qui
    n'est PAS fait sont dans `docs/REPRISE-ARCHIVE.md`, le détail dans
    `docs/tickets/w6-fiche-delai.md`.

20. — **les quatre axes porteurs lisent le corpus**, `w6-amenites-corpus` (#169), fermée le
    15 septembre 2026. Sortie d'ici le soir même par `w6-dossier` (#33) pour tenir le plafond
    de `documents.test.ts` : l'état, les mesures miroirs coupés et **ce qui attend une décision
    d'Ivan — `rail` est ferré seulement, les bus n'y sont pas** — sont dans
    `docs/REPRISE-ARCHIVE.md`, le détail dans `docs/tickets/w6-amenites-corpus.md`.

19. — **la fiche lit le corpus**, sorti d'ici le 15 septembre 2026 (`docs/REPRISE-ARCHIVE.md`).
    Ce qui y restait vivant — « `page` reste rouge contre la production » — a été **mesuré faux
    le même soir** : PASS en 10 901 ms, Lovable ayant republié sans que personne le mesure.

Les points **1, 3, 4, 8, 9, 10, 11, 15, 17 et 18 sont rayés** et sont partis dans
`docs/REPRISE-ARCHIVE.md`, avec leur numérotation d'origine — `docs/PLAN.md` et
`docs/PLAN-ACTION-VACANCE.md` y renvoient par leur numéro. Restent ceux-ci.


## Le point 26 — `w2-rythme` (#208) — sorti de `docs/REPRISE.md` le 17 septembre 2026

Fermée le 17 septembre, sortie de la page de reprise le même jour par `w1-servi-contenu` (#217)
pour tenir le plafond de `documents.test.ts`. Le détail vivant est dans
`docs/tickets/w2-rythme.md`, section « Livré » ; ce qui suit est le relevé tel que la page de
reprise le portait.

26. **Une adresse a des heures, et la source les portait depuis dix jours sans lecteur.**
    `w2-rythme` (#208) fermée le 17 septembre 2026. Le détail, les sept critères et leur
    démonstration sont dans `docs/tickets/w2-rythme.md`, section « Livré ».

    **La condition dont dépendait tout le ticket est vérifiée** : les lignes horaires sortent
    jusqu'au visiteur anonyme. Mesuré en `anon` avec la seule clé publiable —
    `compass_station_profile` rend **117 lignes à Châtelet en 416 ms**, 24 tranches JOHV sommant
    à 99,99 %, et les deux tables sont lisibles en direct (**29 489** lignes de profil, **258**
    stations). Le précédent de `#97` — une table muette derrière une fonction `security
    definer` — ne se rejoue pas.

    **Le ticket s'était trompé de SENS, et le schéma aussi.** L'énoncé, le commentaire de colonne
    de `20260907000002` et celui de `compass_station_profile` annoncent tous les trois qu'un pic
    de midi signe un quartier de bureaux. Mesuré sur les **258 stations**, 6 099 lignes JOHV : la
    fenêtre 11h-14h est la plus forte des trois à **ZÉRO station**, l'heure de pic est 8h à 89
    stations et 17h ou 18h à 166, et ce sont les quartiers **résidentiels** qui sont menés par le
    matin. Une validation se compte **à la montée** : le profil d'une station est la forme des
    départs depuis ce lieu, pas des arrivées. La lecture livrée est donc construite sur
    l'asymétrie matin/soir. `DIAGNOSTIC.md` §57 porte le défaut, `docs/REPRISE-PIEGES.md` le
    geste qui l'a trouvé.

    **Ce qui est démontré, Chrome sans tête contre le `dist/` de la branche, cinq adresses, les
    deux langues** : la forme de la journée de la station la plus proche, avec son nom, son
    millésime et **sa propre licence ODbL** — sur la même page que la carte « desserte ferrée »
    qui porte la **Licence Ouverte 2.0 (Etalab)**, même millésime, deux obligations. La réserve
    au-dessus du graphique et jamais au survol. La lecture avec son statut lu de
    `LEAD_REASON_STATUSES` — « arbitrage, pas une mesure » — et ce qui la trancherait. Aucun
    volume : un contrôle **parcourt** l'objet produit et refuse tout nombre hors [0, 100]. Rien
    n'entre dans le verdict : le bloc est hors de la liste des constats et la phrase du verdict
    est identique au caractère près avec et sans les lignes horaires. Au bois de Vincennes,
    l'absence de station est rendue par son motif, celui que l'axe de distance emploie déjà.

    **La contre-preuve est jouée en cinq actes** : licence recopiée (7 contrôles rouges sur 3
    fichiers), champ de volume ajouté (2), `rythme` promu axe du verdict (1), une lecture retirée
    de la table des mots (2), une réponse rendue comme une panne (5). Tout remis, sortie 0.

    **Ce qui attend une décision d'Ivan** : la marge de **1,15** qui sépare les trois formes est
    un arbitrage écrit une fois — 39 stations « menée par le matin », 43 « deux pointes », 176
    « menée par le soir ». Elle se déplace en une ligne.

    **Ce qui n'est PAS fait** : les deux `comment on` du distant disent toujours l'inverse et
    demandent un `supabase db push` — **#213** ; le serveur MCP ne sert pas la forme de la
    journée, elle attend `w5-explain-metier` (#31) comme la raison d'un axe de tête ; et aucun
    bras n'ouvre la page sur ce bloc, le même trou que pour `mode=`.

## Les portes du 17 septembre 2026 au matin — relevé remplacé le soir même

Sorti de `docs/REPRISE.md` le 17 septembre 2026, le jour de sa mesure : la republication d'Ivan l'a remplacé dans l'heure. Gardé parce que c'est l'état contre lequel `w1-servi-contenu` (#217) a été démontré, et parce que `scripts/porte/servi-temoin-2026-09-17.json` le rejoue.

Antérieurement, le même jour : **DEUX BRAS ROUGES CONTRE LA PRODUCTION, POUR LA MÊME CAUSE — mesuré par `w1-servi-contenu` (#217).** `servi` **ÉCHEC, sortie 1** : 1 196 859 octets lus en 21 fichiers, **758 jetons sur 1 168**, 358 absents — 106 dans `modeText.ts`, 79 dans `contextText.ts`, 59 dans `Methodology.tsx`, 40 dans `verdict.ts`, 28 dans `rythmeText.ts`, 21 dans `ui.ts`, 15 dans `motif.ts`, **et 4 routes** : `/carte`, `/contexte/:slug`, `/en/context/:slug`, `/en/map`. `page` **ÉCHEC, sortie 1** : « 404 Oups ! Page introuvable » à l'écran en 14 071 ms. **La production sert un bundle antérieur à `w6-contexte` (#119)** — elle ne déclare ni `/carte` ni `/contexte/`, et ne sert aucun morceau `Context` : l'incident fondateur de `#142` est revenu, `DIAGNOSTIC.md` §60. Le rouge appartient au déploiement, pas au dépôt, et **il attend une republication depuis Lovable**. Le même bras contre **un build de `main` du même jour** : **PASS, sortie 0**, 1 247 018 octets en 30 morceaux, **1 168 jetons sur 1 168** — donc la mesure fonctionne dans les deux sens, et le geste est dans l'en-tête de `scripts/porte/servi-verify.ts`. Le quatorzième bras a par ailleurs changé de population et de portée ce jour-là : **330 jetons dont 223 décisifs** avant, **1 168 dont 869** après, la prose étant désormais dérivée par `scripts/porte/prose.ts` — atteignable depuis `src/main.tsx`, choisie par la langue — et le crawl des morceaux étant devenu **transitif** (il en lisait 1 sur 29, `DIAGNOSTIC.md` §59). `LONGUEUR_MINIMALE` reste à **12**.
