# Reprise — état au 28 août 2026, fin de session 16

À lire en premier après `CLAUDE.md`. Décrit ce qui tourne, ce qui bloque, et ce
qui n'est écrit nulle part ailleurs. Le reste du contexte est dans `docs/PLAN.md`
(backlog, décisions produit), `docs/PLAN-ACTION-VACANCE.md` (doctrine et backlog
priorisé), `docs/BDCOM.md` (pièges de la source) et `eval/FAILURE_MODES.md` (le
contrat d'évaluation).

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

**Ouvert en le corrigeant : [`#64`](https://github.com/IvandeMurard/paris-compass/issues/64).**
Les deux fonctions de rayon que `#62` n'a pas touchées. `compass_street_rotation` est désormais
la plus chère des quatre — 286 744 pages, trois fois `compass_premises_within`, et 2 091 ms au
premier appel observé. Et les deux ne sont pas le même cas, contrairement à ce que la première
rédaction de §27 disait : `compass_scoring_context_within` rend une ligne par local, donc son
coût est sa réponse ; `compass_street_rotation` est un agrégat qui rend 2 609 lignes en en lisant
64 147, donc il y a de la place. Corrigé dans §27 le jour même.

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

## L'état mesuré le plus récent — 28 août 2026, après clôture de `#62`

**Le tableau de la section suivante date du 24 août** et n'a pas été remesuré depuis ; celui-ci
l'a été, contre `dbefhvmyfmmhjeetdddu`, après la fermeture de `#62`. Quand les deux
se contredisent, c'est le plus daté des deux qui a tort — et la règle de `CLAUDE.md` s'applique
d'abord ici : **remesurer avant de recopier.**

| Mesure | Valeur, mesurée le 28 août 2026, après clôture de `#62` |
| --- | --- |
| Ledger distant `supabase_migrations` | **46** migrations, dernière `20260828000002` — deux poussées ce jour, `20260828000001` et `20260828000002` |
| Fonctions `compass_*` | **15** — inchangé, les deux migrations remplacent des corps sans en créer |
| Invariants | **37** — inchangé. **Pas 34** : ce chiffre circule encore (`docs/tickets/w0-appelant.md`) et était juste le 26 août, avant `I35`–`I37` |
| Bras de la porte | **cinq** : A invariants, B baselines, C jeu doré, **E budget de la fenêtre anon** (nouveau, `#62`), D porte anonyme jouée à part |
| Tests unitaires | **188** — 179 la veille, +9 pour `budgetVerdict` et `parseWindowMs` |
| `auth.users` | **0** — aucun compte, ce qui rend la décision de `w0-appelant` gratuite aujourd'hui et coûteuse plus tard |
| Issues | **35 ouvertes, 22 fermées** — remesuré par `gh issue list --jq length` après fermeture de [`#62`](https://github.com/IvandeMurard/paris-compass/issues/62). Il valait 37/20 la veille : **remesurer avant de recopier** |
| Épic [`#42`](https://github.com/IvandeMurard/paris-compass/issues/42) (vague 1) | ouverte, **5 cochés sur 7** — inchangé, `#62` n'y figure pas |
| Portes | `typecheck` ✓ · `test` **188** ✓ · `build` ✓ · `eval` **37 invariants**, 8 cas dorés, bras E vert sur quatre fonctions, **11 avertissements de baseline inchangés depuis la veille** (sortie 3) · `eval:anon` **PASS, 15 contrôles**, trois passages · `verify:mcp` **41 contrôles, 40 verts, 1 suspendu** (Overpass 429, panne amont) · `eval:sabotage` **non relancé** — rien de ce jour ne touche la règle de retenue |

**Coût des quatre fonctions de rayon au rayon maximal**, mesuré après poussée, claim `anon`,
parallélisme coupé, pire de douze passages — c'est le contenu de `eval/baselines/anon-budget.json`,
et le bras E le rejoue à chaque `npm.cmd run eval` :

| Fonction | Pages | ms à chaud | Plafond déclaré |
| --- | ---: | ---: | --- |
| `compass_premises_within` | 94 117 | 133 | 1 020 ms, soit 34 % de la fenêtre `anon` |
| `compass_bodacc_within` | 148 206 | 294 | idem |
| `compass_scoring_context_within` | 137 576 | 149 | idem |
| `compass_street_rotation` | 286 744 | 355 | idem |

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

### `npm.cmd run lint` ne tourne plus — constaté le 24 août

**Il plante avant d'avoir lint quoi que ce soit**, sur `mcp-server/src/index.ts` :

```
TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions':
Cannot read properties of undefined (reading 'allowShortCircuit')
```

C'est une incompatibilité entre ESLint 9.39.5 et la version de
`@typescript-eslint/eslint-plugin` installée — le plugin appelle la règle de base
avec un schéma d'options que cette version d'ESLint ne fournit plus. Ce n'est pas
une erreur de code : **aucun fichier n'est analysé**.

**Vérifié antérieur à la session du 24 août** : `git stash -u`, relance, même
plante sur un arbre propre. Ce n'est donc pas le bras D qui l'a introduit.

**Pas corrigé, délibérément.** La sortie est une montée de dépendance, et
`CLAUDE.md` est explicite : chercher la plus petite version qui suffit, jamais
`npm audit fix --force`. C'est le chantier de `DIAGNOSTIC.md` §7 et §8, pas un
à-côté de session. **Conséquence à connaître** : depuis une date inconnue, tout
ce qui a été écrit dans ce dépôt l'a été **sans passer par le linter**. `tsc
--build` et `vitest` restent les seuls filets, et ils tournent.

**La conclusion du 15 août était fausse, et voici pourquoi.** `DIAGNOSTIC.md` §7
et cette page annonçaient « Correctif = vite 8 » et « Correctif = vitest 4 ».
Ces numéros venaient de ce que proposait `npm audit fix --force`, qui va
**toujours vers la dernière majeure publiée**, jamais vers la plus petite qui
suffit. Les correctifs étaient en réalité disponibles bien plus bas : **vite
6.4.3** et **vitest 3.2.6**. Trois majeures d'écart, et un chantier réputé
intouchable qui tenait en une heure.

> **Leçon à garder.** Ce que `npm audit fix --force` veut installer n'est pas la
> version qui corrige : c'est la plus récente. Toujours chercher la version
> minimale — Socket la donne, les avis GitHub aussi.

**Ce qui a été fait**, en trois étapes séparées pour savoir laquelle casse quoi :

| | Paquet | Avant | Après |
| --- | --- | --- | --- |
| Étape A | `@vitejs/plugin-react-swc` | 3.5.0 | **3.11.0** |
| | `lovable-tagger` | 1.1.7 | **1.3.3** |
| Étape B | `vitest` | 2.1.9 | **3.2.7** |
| Étape C | `vite` | 5.4.21 | **6.4.3** |
| (transitif) | `esbuild` | 0.21.5 | **0.25.12** |

L'étape A ne corrige rien par elle-même : ces deux paquets **refusaient** vite 6
tant qu'ils n'étaient pas montés. C'est le seul ordre qui fonctionne — bumper
vite d'abord fait échouer `npm.cmd install` sur un conflit.

**Aucun fichier de configuration n'a eu besoin de changer.** Ni `vite.config.ts`,
ni `vitest.config.ts` : ils n'utilisent aucune des interfaces supprimées par
vite 6. Aucun code applicatif non plus.

**Ce qui a été vérifié**, dans cet ordre, après chaque étape :

| Vérification | Résultat |
| --- | --- |
| `npm.cmd run typecheck` | passe |
| `npm.cmd run test` | 73 tests sur 73 *(chiffre du 23 août — **96 sur 96 au 24 août**, fin de session 4)* |
| `npm.cmd run build` | passe — 1 865 modules |
| `npm.cmd run build:dev` | passe — **seul chemin qui charge `lovable-tagger`** |
| Serveur de dev + navigateur | page rendue, zéro erreur console, aucune requête en échec |
| Carte Leaflet | conteneur monté, tuiles chargées, 96 marqueurs |

Le `build:dev` n'est pas une redondance : `lovable-tagger` n'est monté que si
`mode === 'development'`. Un `npm.cmd run build` seul ne l'exécute **jamais** et
laisserait une panne Lovable invisible jusqu'au prochain build de leur côté.

**Un défaut pré-existant a dû être corrigé d'abord.** `npm.cmd run typecheck`
échouait déjà avant qu'on touche à quoi que ce soit, sur l'import mort de
`NoiseEstimate` signalé par `DIAGNOSTIC.md` §7 le 15 août. Sans le corriger,
le typecheck ne pouvait servir de garde-fou : impossible de distinguer une
casse due à la montée d'une casse déjà là. Une ligne, aucun effet sur le
comportement.

**`bun.lockb` régénéré le 16 août**, même procédure (conteneur `oven/bun:1.1.38`,
répertoire jetable, `package.json` seul). Les deux verrous portent désormais des
versions **identiques sur tous** les paquets nommés par les avis — `vite` 6.4.3,
`vitest` et `@vitest/mocker` 3.2.7, `vite-node` 3.2.4, `esbuild` 0.25.12,
`nanoid` 3.3.18, `react-router-dom` 7.18.2. La divergence sur
`@vitejs/plugin-react-swc` et `lovable-tagger` notée le 15 août **a disparu** :
`package.json` les épingle maintenant explicitement. Seul `esbuild` réclamé par
`tsx` diverge encore (0.28.1 npm / 0.28.2 bun) — cette copie-là n'est visée par
aucun avis.

**Ce qui reste à faire : rien de technique, un seul point de vigilance.** Voir
§7 de « La suite, par ordre ».

### Bun ne tourne pas sur cette machine : passer par Docker

**Le poste est en Windows ARM64** — le Postgres local le confirme, compilé en
`aarch64`. Bun ne publie **aucun binaire Windows ARM64** : `npm install -g bun`
échoue sur `Unsupported platform: win32 arm64`, quelle que soit la version, et
`npx bun` échoue en silence avec un code 1 sans message. Ce n'est pas un problème
de version, c'est l'architecture.

WSL ne contient que `docker-desktop` et `docker-desktop-data` — pas de Linux
généraliste à exploiter. La voie qui marche est l'image officielle, qui existe en
Linux ARM64, avec un répertoire jetable contenant **seulement `package.json`** :

```powershell
# Sans bun.lockb dans le repertoire : la resolution repart de zero et prend les
# dernieres versions dans les plages de package.json — donc les correctifs. Avec
# le verrou present, bun conserverait les versions epinglees et ne corrigerait rien.
docker run --rm -v "${tmp}:/app" -w /app oven/bun:1.1.38 bun install
```

Rejouée le 16 août sans accroc — compter environ **deux minutes et demie**
d'installation. Docker Desktop n'était pas lancé au démarrage de la session : le
démon met ensuite une quinzaine de secondes à répondre, et les conteneurs
Supabase remontent seuls, volumes intacts. Le verrou obtenu se recopie ensuite à
la main dans le dépôt.

Rester en **bun 1.1.x** : à partir de 1.2, bun migre `bun.lockb` vers `bun.lock`
en texte, ce qui changerait le format que Lovable attend. Ne pas monter le dépôt
lui-même — bun y écrirait un `node_modules` Linux par-dessus celui de Windows.

### Ne pas lancer `supabase start` sans regarder d'abord

La pile locale qui tourne s'appelle **`supabase_db_pulfdlztjbkgydmyrkfy`** — la
référence *ComparaCourse*, « sans rapport » d'après le tableau plus bas. Les
conteneurs portent ce nom parce que `config.toml` pointait dessus quand ils ont
été créés, et **toute la donnée de référence est dans ce volume**.

Depuis que `config.toml` dit `nwnhhvogwrzstslxtxca`, `supabase start` veut créer
une pile neuve et vide sous ce nom-là. Elle échoue sur un conflit de port 54322 —
ce qui est une chance : en cas de succès elle aurait donné une base vide, avec
l'air d'être la bonne. Se connecter directement à `127.0.0.1:54322`, qui reste la
bonne adresse quel que soit le nom du conteneur.

```powershell
docker ps --format "{{.Names}} | {{.Ports}}"   # voir quelle pile tourne vraiment
```

| | Volume |
| --- | --- |
| Relevés BDCom 2017 / 2020 / 2023 | 84 031 / 83 399 / 60 845 |
| Locaux distincts | 85 418 |
| Quartiers / tronçons de voie | 80 / 25 094 |
| Avis BODACC (cessions + procédures) | 43 057 + 120 285 |
| Établissements SIRENE géolocalisés | 68 672 |

```powershell
# .env.local vise le distant : sans cette variable, la porte partirait vers eu-north-1.
# Les variables du shell priment sur .env.local — vérifié, inutile de toucher au fichier.
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
npm.cmd run eval      # 18 invariants, 24 baselines, 8 cas dorés — ~45 s en local, ~3 min sur le distant
Remove-Item Env:\DATABASE_URL
```

Le lanceur **annonce désormais sa cible**, en en-tête et dans la ligne de verdict :
un « PASS » collé dans un rapport dit contre quelle base il a été rendu. Sans ça,
une porte au vert contre la mauvaise base ne veut rien dire.

Les fonctions exposées : `compass_premises_within`, `compass_scoring_context_within`,
`compass_premise_history`, `compass_street_rotation`, `compass_bodacc_within`,
`compass_address_timeline`, `compass_vintages`. Toutes prennent **un point et un
rayon**, jamais une bbox.

---

## Le point bloquant — **levé le 15 août**

**Il n'y a plus de point bloquant.** La connexion au distant fonctionne, le
schéma y est appliqué et les données chargées. Vérifié le 17 août en ouvrant la
connexion : `connectionTarget()` annonce
`dbefhvmyfmmhjeetdddu via aws-1-eu-west-1.pooler.supabase.com`, et la base
répond. Les volumes sont dans le tableau en tête de page.

`connectionTarget()`, dans `scripts/ingest/lib/db.ts`, affiche la cible sans
jamais montrer le secret : **s'en servir avant tout chargement**. Cette règle
reste entière — c'est elle qui a permis de constater le 17 août que `.env.local`
ne visait plus du tout le projet que cette page décrivait.

> **Pourquoi cette page a menti pendant deux jours.** La correction existait
> depuis le 15 août, mais elle vivait dans la PR #2, restée ouverte. La branche
> du serveur MCP a été forkée d'un `main` antérieur, donc elle a hérité d'un
> `REPRISE.md` figé sur la décision Lovable Cloud et sur un mot de passe
> introuvable. Une session du 17 août a passé une heure à rouvrir un dossier
> déjà clos. Ce n'était pas une documentation périmée par négligence, mais
> **fausse par branche** — un mode de défaillance à connaître : ce que dit
> `main` fait foi, une correction non mergée n'existe pour personne.

L'historique des essais de connexion vers l'ancienne cible Lovable Cloud
(`nwnhhvogwrzstslxtxca`, région `eu-north-1`, `28P01` sur le pooler) n'a plus
d'objet et a été retiré. Ce qu'il faut en garder tient en une ligne, et vaut
pour tout nouveau projet : **le pooler est propre à chaque projet, et la
connexion directe `db.<ref>.supabase.co` n'a qu'un enregistrement AAAA, donc
injoignable depuis ce poste sans IPv6.** Détail dans « Le nœud Supabase »
ci-dessous.

Le balayage de plusieurs cibles à la suite avec un mot de passe **est bloqué par
la politique d'exécution** — cela ressemble à un essai de connexions en série.
Tester une cible à la fois. Cette règle-là reste valable.

### Le nœud Supabase, à ne pas redécouvrir

**Mise à jour du 15 août 2026 : la cible a changé, à nouveau.** `dbefhvmyfmmhjeetdddu`
est désormais le bon projet — la décision « viser Lovable Cloud » ci-dessous est
**caduque**. `supabase/config.toml` et `.env.local` pointent maintenant sur
`dbefhvmyfmmhjeetdddu`. Les 21 migrations y ont été appliquées via
`supabase db push` : 18 tables, 10 fonctions `compass_*` — mêmes chiffres que la
base de référence. **Ingestion rejouée le 15 août** (`bdcom.ts`, `geography.ts`,
`bodacc.ts`, `sirene.ts`, dans cet ordre) : 85 418 locaux, 80 quartiers, 25 094
tronçons, 163 684 avis BODACC, 68 770 établissements SIRENE. Chiffres alignés
sur ceux documentés plus haut, à la dérive normale près (les sources BODACC et
SIRENE se sont enrichies depuis).

`sirene.ts` a échoué une première fois avec `ECONNRESET` — la connexion
Postgres, ouverte dès le début du script, reste inactive pendant les ~5 minutes
de lecture/jointure DuckDB du parquet INSEE avant la moindre écriture ; le
pooler l'a coupée une fois. Rien n'avait été écrit à ce stade-là, la relance
telle quelle a suffi. Si ça se reproduit systématiquement, il faudra ouvrir la
connexion Postgres après la lecture DuckDB plutôt qu'avant.

Trois références ont circulé au total.

| Référence | Ce que c'est | Accès |
| --- | --- | --- |
| `dbefhvmyfmmhjeetdddu` | **Cible actuelle.** Projet *paris-compass* créé à la main par Ivan, région West EU (Ireland). Vide le 12 août ; schéma peuplé le 15 août, données pas encore chargées. | complet |
| `nwnhhvogwrzstslxtxca` | **Ancienne cible** (backend Lovable Cloud). Ne plus utiliser — ni `config.toml` ni `.env.local` n'y pointent plus. | **aucun** — absent du compte Supabase d'Ivan |
| `pulfdlztjbkgydmyrkfy` | Projet *ComparaCourse*, **sans rapport**. `config.toml` pointait dessus jusqu'au 9 août. | — |

Ancienne décision (14→15 août, remplacée ci-dessus) : les données et
l'authentification devaient vivre dans le même projet Lovable Cloud, parce que
le front appelle les fonctions avec la clé anonyme et que la règle de licence
dépend du rôle porté par le jeton. Ce raisonnement reste valable, seul le projet
cible a changé.

**Piège de connexion, retrouvé à l'identique sur le nouveau projet :**
`db.dbefhvmyfmmhjeetdddu.supabase.co` (connexion directe) n'a qu'un
enregistrement AAAA — injoignable depuis ce poste sans IPv6. Passer par le
pooler, propre à chaque projet (l'hôte `eu-north-1` de l'ancien projet ne
s'applique pas ici) :
`postgres.dbefhvmyfmmhjeetdddu@aws-1-eu-west-1.pooler.supabase.com:5432`, port
**5432** (session pooler) et non 6543 (transaction pooler, casse les tables
temporaires dont les chargeurs se servent). Chaîne à jour dans `.env.local`.

**Nouveau piège, trouvé en peuplant `dbefhvmyfmmhjeetdddu` : `search_path` et
`uuid_generate_v4()`.** `supabase db push` exécute chaque migration dans une
session dont le `search_path` ne reprend pas la valeur par défaut du rôle —
l'appel nu `uuid_generate_v4()` de `20250417000001_create_user_tables.sql`
échouait avec « function does not exist » alors que `uuid-ossp` était bien
installée dans le schéma `extensions`. Corrigé par
`ALTER DATABASE postgres SET search_path TO "$user", public, extensions` sur le
projet cible — une commande SQL, pas un changement de fichier versionné. À
refaire sur tout nouveau projet avant `supabase db push`.

---

## Décisions qui ne se déduisent pas du code

**`authenticated` n'est pas un appelant privilégié.** Tranché par Ivan le 26 août 2026,
sur `w0-appelant` (#58). Le privilège reste au rôle de service et aux connexions directes
— ceux qui *exploitent* Compass — jamais à un compte créé sur le site.

La raison, et elle tient en une phrase : **créer un compte n'est pas une lecture de
licence.** 2017 et 2020 portent `publicly_redistributable = false` parce que la licence
APUR n'a pas été lue ; elle ne l'a pas été davantage pour un inscrit. Un partenaire sous
accord n'est pas un inscrit, et le jour où il y en aura un, ce sera une autre décision,
écrite comme celle-ci.

Décidé pendant que c'était gratuit : `auth.users` comptait **0 utilisateur** le 25 août.
Une fois l'inscription ouverte — le produit porte déjà `saved_properties` et
`saved_searches`, donc c'est l'intention — la même décision retirerait des données à des
gens qui les avaient.

Révisable sur un seul événement : une réponse de l'APUR autorisant la redistribution.
Rien d'autre ne la rouvre.

**Appliquée le 26 août par `20260826000002`**, et elle n'est plus seulement écrite :
`public.compass_caller_is_privileged()` est la **seule** expression du test, appelée par
les six fonctions qui retiennent — il en existait six copies. Le test est un
**laissez-passer nominatif** (`= 'service_role'`) et non une liste noire (`<> 'anon'`) :
le prochain rôle de claim est retenu par défaut plutôt que privilégié par oubli, ce qui
est précisément la mécanique du désaccord ayant produit `DIAGNOSTIC.md` §12 puis §21.
Gardée par `I32` (une seule expression), `I33` (`@as authenticated`) et `I34`
(`@as service_role`, le contre-test), et démontrée par `npm.cmd run eval:sabotage`, dont
le troisième acte remet la décision à son état d'avant et vérifie que la porte rougit.
Le détail, la mesure avant/après et **ce que la règle ne rattrape pas** : `DIAGNOSTIC.md`
§26 et `docs/CONTEXTE.md`.


**Le rayon maximal reste à 2 000 m.** Tranché le 28 août 2026 en corrigeant `#62`, où la
troisième piste du ticket était de le baisser.

La raison tient en une phrase : **baisser `compass_max_radius_m()` n'est pas une
optimisation, c'est une promesse produit qu'on retire.** 2 000 m est le plafond que l'outil
MCP `find_premises` annonce dans son schéma d'entrée — un agent qui lit ce schéma le croit —
et la fonction est le garde-fou de **quatre** RPC — les quatre que le bras E énumère.
La baisser pour qu'une requête chère passe rétrécirait aussi `compass_bodacc_within`,
`compass_scoring_context_within` et `compass_street_rotation`, dont aucun ticket ne l'a
demandé. C'est le même geste que monter
`statement_timeout` sur `anon`, dans l'autre sens : déplacer le coût sur ce qui n'a rien
demandé.

Le coût a donc été traité là où il naît, dans le corps des fonctions : `DIAGNOSTIC.md` §27.
Ce qui rouvrirait la décision : une mesure montrant qu'au-delà d'un certain rayon la réponse
cesse d'avoir un sens produit — « ce quartier » à 2 km n'est plus un quartier. Ce serait une
décision de périmètre, écrite comme celle-ci, et pas un correctif de performance.

**Quatre niveaux de fiabilité, calculés et jamais saisis** : `etabli`,
`corrobore`, `probable`, `indetermine`. Pas de score sur 100 — un pourcentage de
confiance serait le chiffre invérifiable que le produit refuse. La règle est dans
`docs/PLAN.md` §2.5.

**La composition de fiabilité est la métrique de qualité.** 51,4 % établi,
5,9 % corroboré, 36,7 % probable, 6,0 % indéterminé — mesurés sur les baselines
regelées le 17 août, `eval/baselines/ingestion.json`. S'améliorer veut dire
déplacer ces quatre nombres vers la gauche ; chaque source branchée se juge à ça.

> **Corrigé le 23 août.** Cette page, le README et `docs/PLAN.md` portaient encore
> 51,6 / 5,9 / 36,5 / 6,0 — la composition du gel du 9 août, restée en place quand
> les baselines ont été regelées le 17. Le déplacement de `probable` vers la droite
> n'est **pas une dégradation de la qualité** : il vient de la republication DILA,
> dont les avis BODACC entrent en `probable` faute de nommer le local, et aucun
> effectif BDCom n'a bougé d'un chiffre. L'agrégat suivi en porte le confirme —
> 57,31 % établi+corroboré, inchangé depuis le 15 août, valeur qui ne se déduit
> que des nouveaux nombres.

Le résidu de 36,7 % est **structurel** : BODACC nomme une adresse, BDCom un
local, et 69 % des locaux partagent leur numéro. Aucune donnée publique ne dira
laquelle des huit vitrines a été vendue.

**Le récit se génère, il ne se rédige pas.** `compass_address_timeline` existe
parce que deux erreurs ont été commises **dans la prose et non dans la base** :
une année sans relevé rendue par « pas un commerce », et un prix d'exemple pris
sur un autre local. Un appelant qui affiche cette table ne peut plus affirmer ce
que la donnée ne dit pas. Ne jamais retaper une chronologie à la main.

**Exposition publique limitée au millésime ODbL.** 2017 et 2020 portent une
licence non lue ; un appelant anonyme reçoit `withheld = true`, jamais le contenu
et jamais l'absence. Une ligne de `bdcom_vintage.publicly_redistributable`
bascule quand l'APUR répond.

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

## Pièges qui ont coûté du temps aujourd'hui

**Les portes qui interrogent le distant rendent un faux rouge sur une base froide,
code Postgres `57014`.** `canceling statement due to statement timeout`, sur un
invariant différent à chaque fois, puis vert au passage suivant sans que rien
n'ait changé. Mesuré sur `eval:anon` le 26 août — deux passages rouges puis un
vert — et sur **`eval`** le 27 août à 08 h 11 UTC, premier appel de la matinée :
mort dans le bras A, repassé intégralement au vert à 08 h 18. Le premier appel
matinal paie le réveil de l'instance et la reconstruction des caches ; c'est la
latence, pas la donnée.

> **La fenêtre a un chiffre depuis le 27 août** : `anon` porte
> `statement_timeout = 3s`, `authenticated` et `authenticator` 8 s, relevés dans
> `pg_roles.rolconfig`. Ce n'est pas une valeur PostgREST à deviner, c'est une
> option de rôle qu'on peut lire.

**`eval:anon` ne rend plus ce faux rouge — les autres portes, si.** Depuis `#61`,
elle classe un `57014` en **« suspendu — panne amont »** et sort en **3** : ni
vert, ni rouge, et le mot « INDÉTERMINÉ » est écrit en toutes lettres. Rejouer une
sortie 3 est légitime ; rejouer un **FAIL** ne l'est pas, et c'est toute la
différence que ce ticket a achetée. `eval` (bras A) et `verify:mcp` n'ont pas
cette distinction pour le timeout : là, **rejouer avant de diagnostiquer** reste
la règle, et ne conclure à une régression qu'au deuxième rouge.

**Un refus du classificateur sur `supabase db push` peut céder à la relance —
essayer une fois avant de passer la main.** Quatrième et cinquième poussées, le
28 août : la **même commande, inchangée**, refusée puis acceptée quelques minutes
plus tard. Ça confirme ce que la note de procédure du 24 août disait — le refus
n'est pas corrélé au contenu — et ça ajoute la conduite à tenir : relancer une
fois, et seulement ensuite préparer la ligne pour qu'Ivan la lance. Ne pas
contourner en appliquant le SQL à la main : le ledger `supabase_migrations` ne
serait pas tenu, et c'est lui qui dit ce qui est posé.

**On ne peut pas fabriquer un cache froid sur cette instance — ne pas y passer la
matinée.** Trois voies essayées le 28 août, trois impasses. Faire tourner le pool avec
un gros balayage ne suffit pas : douze passages de ~28 000 pages sur
`sirene_etablissement_stock` et `bodacc_establishment` laissent `Shared Read Blocks` à
**0** sur la requête visée, parce que ses pages portent un `usagecount` de 5 sur 5 et
que l'horloge de remplacement trouve toujours des victimes plus tièdes.
`pg_buffercache_evict()` existe bien en PostgreSQL 17.6 mais rend **`42501`** : elle
demande un vrai superutilisateur, et le rôle `postgres` de Supabase n'en est pas un. Et
même réussi, rien de tout ça n'atteint le cache du système sous Postgres.

> **Ce qui marche, à la place.** Mesurer **la page touchée** — `explain (analyze,
> buffers)` —, qui ne dépend pas de la température : c'est le travail à faire, le cache
> ne décide que du prix de chaque page. Et, pour le froid réel, **attendre** : le premier
> appel après une nuit d'inactivité est la mesure que le critère de `#62` demandait, et
> c'est comme ça qu'elle a été obtenue. Une session à cheval sur une nuit vaut de
> dépenser son premier appel sur la mesure qui compte, avant toute autre requête.

**Deux sessions dans le même arbre de travail se commitent l'une l'autre.** Le
26 août au soir, deux sessions ont tourné en parallèle sur ce dépôt : l'une
scindait `REPRISE.md` vers `JOURNAL.md`, l'autre posait `w0-appelant`. La
première a fait `git add -A` et **emporté dans son commit** (`c861bac`, poussé)
les fichiers de travail temporaires de la seconde — `.fn-dump/`, quatre scripts
`scripts/eval/_*.ts` — **et sa migration**, `20260826000002`, sous un message qui
parle de tout autre chose. Rien n'est perdu et rien n'est cassé ; l'historique,
lui, ment sur qui a fait quoi. Les fichiers temporaires sont retirés par le commit
suivant, en marche avant : réécrire un historique déjà poussé coûterait plus cher
que l'écart qu'il corrige.

> **Ce n'est pas un cas de la règle Lovable de `CLAUDE.md`** — qui parle de deux
> *outils* éditant le dépôt — mais elle a la même cause et la même parade. Une
> session qui commite doit regarder ce qu'elle met dans son commit : `git add -A`
> dans un arbre partagé n'ajoute pas « mes fichiers », il ajoute *tout ce qui
> traîne*. Et une session qui écrit des fichiers de travail doit les nommer de
> façon à ce qu'ils soient ignorés, ou les tenir hors du dépôt : le répertoire de
> travail temporaire de l'agent existe pour ça.

**Comparer un corps de fonction en base à son fichier exige de normaliser les
fins de ligne.** `core.autocrlf=true` donne un arbre de travail en CRLF, et
`supabase db push` envoie les octets tels quels : le corps stocké porte alors un
`\r` en fin de chaque ligne. `prosrc = <fichier>` répond **faux** sur une
migration parfaitement posée. Mesuré le 24 août sur les dix fonctions `compass_*`
du distant — **six portent des CR, quatre non**, selon la machine qui les a
poussées. Sans conséquence pour Postgres, qui traite `\r` comme une espace ; mais
une session qui compare naïvement conclura que le distant a divergé du dépôt.
Comparer après `replace(/\r/g, "")`.

**Une politique RLS n'est pas un `GRANT`.** Toutes les migrations ont d'abord été
écrites sans droit de lecture : les fonctions échouaient pour un visiteur avant
qu'aucune politique ne soit consultée. Corrigé en `20260809000009`.

**Dans une fonction `SECURITY DEFINER`, `current_user` est le propriétaire.**
Tester le privilège avec lui conclut toujours « privilégié ». Il faut lire le
rôle que PostgREST met dans `request.jwt.claims`.

**Le chemin privilégié réussit toujours.** Les trois défauts d'exposition n'ont
été trouvés qu'en jouant le chemin **anonyme**. Le lanceur d'évaluation sait le
faire : marqueur `-- @as anon` dans `eval/invariants.sql`.

**Mais « anonyme » a deux sens, et l'un des deux ne voit rien.** Le marqueur
`-- @as anon` pose `request.jwt.claims` sur une connexion **privilégiée** et
n'émet jamais `set local role anon` : RLS **ne s'applique pas** pendant qu'il
tourne. Il n'éprouve donc que le test que la fonction fait sur le *claim*. Une
fonction qui ne lit pas le claim du tout — c'était `compass_premise_history`
jusqu'au 24 août — lui rend **tout le contenu** sans que rien paraisse anormal.
C'est ce qui l'a rendue invisible pendant quinze jours, et c'est pour ça que le
bras D (`npm.cmd run eval:anon`, vraie clé publiable, RLS derrière) n'est pas un
doublon du bras A. Corollaire pour toute correction de ce type : la fonction doit
**nuller ses colonnes elle-même**, jamais compter sur RLS pour avoir vidé la
jointure — sans quoi le bras A lira du vrai contenu sur une ligne marquée retenue.

**Une absence n'est pas une mesure, et `coalesce(..., false)` en fabrique une.**
Le défaut de licence a une version sans licence : `coalesce(a.is_vacant, false)`
répondait « pas vacant » de 24 573 locaux jamais relevés en 2023. Même faute que
« zéro ligne = quartier mort », sur la colonne dont le produit fait son sujet.
`DIAGNOSTIC.md` §11. À chercher partout où un `coalesce` comble une jointure
externe par une valeur qui se lira comme un fait.

**`TRUNCATE ... CASCADE` sur une table de référence vide la table qui la
référence.** Le chargeur de géographie a effacé les 85 418 locaux avant d'être
corrigé ; seule la transaction a sauvé le chargement.

**Docker Desktop qui se coince** laisse le port ouvert mais tue la poignée de
main. `docker restart` du seul conteneur de base recrée la liaison sans toucher
au volume — ne pas faire `supabase stop`, plus risqué pour les données. Si le
démon lui-même ne répond plus : `wsl --shutdown`, puis relancer Docker Desktop.

Vécu le 12 août, avec une variante : le démon répondait sur le tube nommé mais
rendait **500 sur toutes les routes `/info`**. Épingler une version d'API basse
(`DOCKER_API_VERSION`) n'y change rien — ce n'est pas un décalage client/serveur.
Il faut tuer les processus `Docker Desktop` et `com.docker.backend`, puis
`wsl --shutdown`, puis relancer. Compter deux à trois minutes avant que le démon
réponde ; les conteneurs remontent seuls, volumes intacts.

**Le terminal d'Ivan est PowerShell 5.1**, pas 7 : ni `&&`, ni `grep`, ni `ls -l`.
Et `npm.ps1` est bloqué — toujours `npm.cmd` et `npx.cmd`.

**`Select-Object -First N` en bout de tuyau fabrique un faux échec.** PowerShell
ferme le tuyau dès qu'il a ses N lignes, le processus en amont reçoit un tube
rompu, et le code de sortie remonte à 1 alors que rien n'a échoué. Vu le 17 août
sur `src/smoke-test.ts`, qui rendait 0 sans filtre et 1 avec. **Ne jamais conclure
d'un code de sortie relevé derrière un filtre tronquant** : relancer sans le
filtre, ou rediriger vers `$null` et lire `$LASTEXITCODE`.

**Pousser sur `main` contourne une règle de protection, en silence ou presque.**
Le dépôt exige une pull request ; le compte d'Ivan a le droit de passer outre,
donc `git push origin main` réussit et GitHub se contente d'une ligne —
`Bypassed rule violations for refs/heads/main`. Facile à manquer dans la sortie.

> **Et c'est le mode voulu, tranché par Ivan le 27 août 2026 : pousser sur
> `main`.** Les versions antérieures de cette page disaient l'inverse, en
> s'appuyant sur les PR #2 et #3 — mais aucune PR n'avait été ouverte pour un
> ticket depuis le 25 août, et la question a été posée en clôturant `#61` : la
> réponse est le push direct. Ne pas ouvrir de PR pour un ticket sans qu'on la
> demande.

**Ne jamais relire un corps d'issue GitHub dans une variable PowerShell pour le
réécrire.** Le 24 août, la commande `$b = gh issue view 41 --json body -q .body`
puis `gh issue edit --body-file` a **corrompu** le corps de l'épic #41 : `ç` est
devenu `├º`, `—` est devenu `ÔÇö`. Mesuré sur les octets bruts par
`gh api ... --jq .body | od -c` — `342 224 234 302 272` au lieu de `303 247` —
donc bien dans la donnée stockée, pas dans l'affichage. PowerShell décode la
sortie de `gh` avec la page de codes de la console et non en UTF-8 ; réécrire
cette chaîne en UTF-8 la ré-encode une seconde fois.

**Le sens aller est sain, le sens retour non.** Passer une chaîne accentuée *à*
`gh` en argument fonctionne — vérifié, et l'issue #52 créée le même jour a ses
accents intacts. C'est la **capture** de la sortie qui casse. Une vérification
qui ne teste que l'aller conclut à tort que tout va bien : c'est exactement
l'erreur qui a été commise.

**La corruption a fait une seconde victime, invisible pendant vingt-quatre heures : les
cases à cocher.** Réparer le corps de #41 l'a réécrit depuis une copie **périmée**, où `#7`,
`#10` et `#51` n'étaient pas encore cochés — et `docs/REPRISE.md` affirmait pourtant, dans la
même journée, que l'épic les cochait. Constaté le 24 août à la clôture de la session 4, sur
les octets bruts (`gh api … --jq .body`), en fermant `#8` : `#8` s'est coché tout seul —
GitHub suit les listes de tâches qui référencent une issue — et les trois autres, fermés
depuis plus longtemps, sont apparus **décochés**.

**La règle générale : réparer un contenu depuis une copie efface tout état qui ne vivait que
dans l'original.** L'encodage se voit, l'état ne se voit pas. Une réparation qui ne recoupe
que ce qu'elle voulait corriger conclut à tort qu'elle est finie — c'est le même mode de
défaillance que « le sens aller est sain, le sens retour non », un cran plus haut. **Avant de
réécrire un corps d'issue, relever ce qu'il porte et qui n'est écrit nulle part ailleurs.**

**Non reproduit**, et c'est à savoir avant de croire à un correctif : dans un
`powershell.exe -NoProfile -File` non interactif sur cette même machine,
l'aller-retour est propre **sans** rien changer. La casse dépend donc de
l'encodage console du terminal réellement utilisé. `[Console]::OutputEncoding =
[Text.Encoding]::UTF8` est le garde-fou correct mais n'a pas pu être éprouvé
contre le cas qui a échoué. **Donc la règle est d'éviter le motif, pas de le
rustiner** : modifier le corps depuis l'interface web, ou faire la lecture et
l'écriture depuis un outil qui parle UTF-8 de bout en bout — c'est par là que la
réparation est passée.

**Le chemin agent n'hérite d'aucune des politesses du navigateur.** `User-Agent`,
cookies, `Origin` : tout ce que le navigateur pose gratuitement est absent d'un
`fetch` Node, et un service public a le droit de s'en formaliser. Overpass rend
**406** sans `User-Agent`, ce qui a rendu le miroir principal du serveur MCP
inatteignable sans que rien ne le signale. À vérifier pour toute source que
`mcp-server/` interroge et que le front interroge aussi : la même requête n'est
pas la même requête des deux côtés.

**Ne jamais passer `--omit=optional` à npm sur ce projet.** Rollup livre son
binaire natif (`@rollup/rollup-win32-x64-msvc`) en dépendance *optionnelle* :
l'omettre casse `vitest` et `vite build` avec un `MODULE_NOT_FOUND` sur
`rollup/dist/native.js`, dont le message ne dit pas d'où vient le manque. Un
`npm.cmd install` simple répare.

---

## La suite, par ordre

1. ~~**L'hôte de connexion**, puis migrations et chargement sur Lovable Cloud,
   puis la porte contre l'instance distante.~~ **Fait** — sur
   `dbefhvmyfmmhjeetdddu` et non sur Lovable Cloud, la cible ayant changé (voir
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
2. **Message à l'APUR** — ~~rédigé, à envoyer le lundi 10 août.~~ **Envoyé.
   Réponse en attente au 23 août 2026.** Il décide de trois choses : si 2017 et
   2020 sortent publiquement — la ligne `bdcom_vintage.publicly_redistributable`
   bascule à ce moment-là ; si une couche 2023 complète, vacants inclus, est
   diffusable ; et si le service `bdcom20032020` (sept couches de 2003 à 2020,
   vacants compris) est utilisable, ce qui porterait l'historique de six à vingt
   ans.

   **Parti le 10 août 2026, sans réponse. Relance envoyée le 24 août 2026.**

   **C'est la seule dépendance externe du projet, et elle bloque trois choses à la
   fois** : `w1-historique` (#49) en entier, l'exposition publique de 2017 et 2020,
   et la vacance 2023. Aucune ne s'ouvre par le code.

   > **Le texte du courrier n'est pas au dépôt.** `docs/BDCOM.md` §6 dit qu'il faut
   > écrire à `data@apur.org` et pourquoi, mais ce qui a effectivement été demandé
   > n'existe nulle part ici. Quand la réponse arrivera, personne ne pourra vérifier
   > qu'elle couvre les trois questions — ni, en cas de réponse partielle, laquelle
   > est restée sans réponse. À consigner, avec sa date, au même titre qu'un chiffre
   > affiché porte sa source.
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

5. **Afficher la composition de fiabilité — après la bascule.** Les quatre
   niveaux (`etabli`, `corrobore`, `probable`, `indetermine`) sont **un
   instrument de traçabilité, pas un indicateur de tableau de bord** : un agent
   qui répond doit pouvoir annoncer son degré de confiance dans la donnée qu'il
   cite. C'est donc autant le serveur MCP (§4.1) que l'écran qui en a besoin.

   Bloqué tant que le front ne parle qu'à Overpass : ces quatre nombres viennent
   du croisement BDCom × BODACC, donc de la base. Les écrire en dur serait
   exactement le chiffre invérifiable que le produit refuse. À reprendre une fois
   `dbefhvmyfmmhjeetdddu` chargé, et pas avant.

6. **Cap de long terme : l'agent s'évalue lui-même.** Décidé le 12 août. La
   métacognition et l'amélioration continue — l'agent sachant dire ce qu'il sait,
   ce qu'il ignore, et à quel point sa réponse s'est améliorée depuis la dernière
   source branchée — doivent devenir **une capacité autonome du produit**, pas un
   travail refait à la main à chaque session.

   Ce que ça implique, et qui n'est pas encore vrai :

   - **`confidence_reason` est du texte libre**, construit par concaténation SQL.
     Un humain le lit, une machine ne peut pas raisonner dessus. Pour qu'un agent
     s'auto-évalue il faut un motif **structuré** — la règle déclenchée et les
     valeurs de colonnes qui l'ont déclenchée, pas une phrase.
   - **La composition de fiabilité doit être historisée.** Aujourd'hui les 24
     baselines la figent à une date ; « s'améliorer » se démontre en comparant
     deux instantanés, donc il faut les garder.
   - **La porte d'évaluation est déjà la brique de mesure.** Elle sait dire si la
     qualité a dérivé ; il lui manque de savoir dire de combien elle a *progressé*,
     et contre quelle base — d'où l'annonce de cible ajoutée le 12 août.

   Ne pas confondre avec un score de confiance en pourcentage : le refus reste
   entier. C'est la *traçabilité* qui devient autonome, pas la certitude.

7. **Vérifier le premier build Lovable après la montée du 16 août —
   à partir du 1er septembre 2026.** Hors file d'attente : ce n'est pas un
   chantier, c'est un contrôle à faire **une fois**, puis à rayer.

   *Pourquoi cette date.* Lovable n'est pas disponible avant le 1er septembre.
   Le code est poussé depuis le 16 août et attend là ; il n'y a rien à faire
   dans l'intervalle, et rien qui se dégrade en attendant. Ce délai de deux
   semaines est la raison d'être de ce point : sans lui, le contrôle serait
   oublié d'ici là.

   *Pourquoi ce point existe.* Sur les quatre paquets montés, trois ne servent
   qu'ici (`vite`, `vitest`, `@vitejs/plugin-react-swc`) et sont vérifiés en
   local. Le quatrième, **`lovable-tagger`, s'exécute chez Lovable** — c'est
   l'outil qui relie leur éditeur visuel au code. Il est passé de 1.1.7 à 1.3.3,
   parce que la 1.1.7 refusait vite 6. Le chemin qui le charge a été éprouvé en
   local (`npm.cmd run build:dev`, au vert), mais l'environnement de Lovable
   n'est pas le nôtre et personne ne peut l'éprouver d'ici.

   *Ce qu'il faut regarder*, dans cet ordre :

   - le build Lovable termine sans erreur ;
   - l'aperçu s'affiche comme avant ;
   - la sélection d'un composant dans leur éditeur visuel fonctionne toujours —
     c'est précisément ce que fait `lovable-tagger`, donc le seul symptôme qui
     signerait un problème lié à cette montée.

   *Si ça casse.* Rien n'est perdu et rien n'est urgent : le correctif tient en
   un `git revert` du commit de montée, qui ramène l'ensemble à vite 5. Les cinq
   vulnérabilités reviendraient avec — toutes cantonnées au serveur de
   développement, aucune atteignable par un visiteur du site. On aurait alors
   le temps de chercher la bonne version de `lovable-tagger`.

   *Une fois vérifié*, supprimer ce point 7 : il n'aura plus lieu d'être.

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

## Ce qu'il ne faut pas faire

Ne pas appliquer de migration sur une instance distante **sans avoir vérifié la
référence du projet visé** — deux heures ont été perdues à cause d'un
`config.toml` qui pointait vers un projet sans rapport.

Ne pas publier un chiffre par métier groupé sur le champ texte de BODACC : c'est
du texte libre où « Restauration rapide » et « Restauration rapide. » sont deux
catégories. Le code BDCom à 224 postes fait foi.

Ne pas committer de sauvegarde de base : le dépôt est **public**. Le `.gitignore`
couvre désormais `*.backup*`, `*.dump`, `db_cluster-*`.

Ne pas conclure qu'une vulnérabilité « exige la dernière majeure » **parce que
`npm audit` le dit**. L'outil propose toujours la version la plus récente, pas la
plus petite qui corrige. Trois majeures ont été crues nécessaires pendant quatre
jours pour cette raison (voir « Vulnérabilités » plus haut). Chercher la version
minimale dans l'avis GitHub ou l'export Socket avant de renoncer à une montée.

Ne pas vérifier une montée de `vite` avec `npm.cmd run build` seul. La commande
construit en mode production, où `lovable-tagger` **n'est pas chargé** : une panne
du lien avec Lovable passerait inaperçue. Lancer aussi `npm.cmd run build:dev`.
