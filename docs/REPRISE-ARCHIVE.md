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

