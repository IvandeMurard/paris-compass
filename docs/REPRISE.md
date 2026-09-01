# Reprise — état au 31 août 2026 (soir)

À lire en premier après `CLAUDE.md`. Décrit ce qui tourne, ce qui bloque, et ce
qui n'est écrit nulle part ailleurs. **Une seule section d'état, la plus récente** :
tout état plus ancien est parti à l'archive, parce qu'un chiffre juste laissé en
place devient faux en silence.

Cette page a été découpée en trois le 31 août 2026, quand elle atteignait 1 378 lignes
et 89 Ko — soit, à elle seule, plus que tout le reste d'une session de lecture :

| Fichier | Quand |
| --- | --- |
| `docs/REPRISE.md` | **Ici.** Début de session : l'état, l'environnement, les décisions qui ne se déduisent pas du code, ce qui reste à faire. |
| `docs/REPRISE-PIEGES.md` | Au moment de faire la chose risquée, ou après s'être cogné. Trente-trois pièges datés, à repérer au `grep`. |
| `docs/REPRISE-ARCHIVE.md` | Rarement : tickets clos, états mesurés remplacés, points de « La suite » rayés. Gardés pour leurs mesures datées. |

Le reste du contexte est dans `docs/PLAN.md` (backlog, décisions produit),
`docs/PLAN-ACTION-VACANCE.md` (doctrine et backlog priorisé), `docs/BDCOM.md` (pièges
de la source), `eval/FAILURE_MODES.md` (le contrat d'évaluation) et `docs/JOURNAL.md`
(le récit des sessions passées).

## L'état mesuré le plus récent — 1er septembre 2026, après clôture de `#70`

**C'est le seul état que cette page porte** : les relevés antérieurs sont dans
`docs/REPRISE-ARCHIVE.md`, et quand deux se contredisent c'est le plus daté qui a tort. Ce qui
a bougé les 31 août et 1er septembre, et rien d'autre :

| Mesure | Valeur, mesurée le 31 août 2026, sauf mention du 1er septembre |
| --- | --- |
| Ledger distant `supabase_migrations` | **47** — inchangé, ni `#69` ni `#71` **n'ont posé de migration** : les deux défauts étaient dans les lanceurs, pas dans le schéma |
| Tests unitaires | **299**, mesurés le 1er septembre 2026 — 273 après `#71`, puis 299 avec `scripts/porte/cadences.test.ts` (21 cas), les trois de la réconciliation distant/migrations, et deux ajoutés de part et d'autre dans `scripts/ingest/workflow.test.ts` et `scripts/porte/workflow.test.ts` |
| **Sources et cadences** | **8 sources dans `compass_source_freshness()`, 8 entrées `cron`**, mesuré le 1er septembre 2026. Les huit du distant sont exactement les huit que les migrations déclarent — recoupé par `freshness`, zéro écart. Entretien : **1 par `schedule`** (`bodacc`), 1 par `workflow-dispatch` (`geography`), 6 depuis un terminal. Les cadences les plus lentes n'ont pas encore eu leur tour, donc `freshness` sort en **3** et le dira jusqu'à ce qu'elles l'aient eu |
| Invariants | **37** — inchangé. Trois d'entre eux, `I1`, `I2` et `I7`, sont **joués en 22 instructions** au lieu d'une. Même population, toutes les tranches jouées |
| **Coût des trois bras distants** (le quatrième, `freshness`, est **un aller-retour** : une RPC, aucun balayage) | Deux passages. `eval` **306 s** puis **299 s** (bras A seul 240 s) · `eval:anon` **5 s** deux fois · `verify:mcp` **114 s** puis **227 s** — **425 s puis 531 s**. L'écart est entièrement `verify:mcp`, et c'est Overpass : les contrôles suspendus attendent des miroirs publics à 429 et 504, chacun avec son délai. C'est ce chiffre-là qui dimensionne la cadence de la porte planifiée, **pas les 115 s de `#69`**, qui étaient `I1` seul avant son découpage |
| **Secrets de dépôt** | **`DATABASE_URL` seul.** `SUPABASE_URL` et `SUPABASE_ANON_KEY` **manquent**, donc `eval:anon` et `verify:mcp` n'ont pas de clé sur un runner. Le workflow s'arrête là-dessus en le nommant, avant de dépenser dix minutes |
| Portes | `typecheck` ✓ · `test` **299** ✓ (1er septembre) · `freshness` **8 sources, 0 en retard, 0 écart**, sortie 3 (1er septembre) · `eval` **deux passages, deux fois au bout**, sortie 3 sur les **11 avertissements de baseline** habituels, **zéro sur l'horloge** · `eval:anon` **PASS, 15 contrôles**, sortie 0 · `verify:mcp` **41 contrôles, 39 verts, 0 échec, 2 suspendus** (Overpass 429 puis 504), sortie 0 · `porte:sabotage` **PASS, 13 contrôles** · `build` et `build:dev` ✓, hashes inchangés (`index-DKJzmj15.js`, `MapView-8C8F8Ymz.js`) — rien dans `src/` |

**La porte tourne toute seule depuis le 31 août** — `.github/workflows/porte.yml`, tous les
jours à 07:29 UTC, neuf bras : `typecheck`, `test`, `build`, `build:dev`, `sessions:check`,
`freshness`, `eval`, `eval:anon`, `verify:mcp`. Un rouge ouvre une issue `porte-rouge` ; une panne amont
n'en ouvre pas. Le cron d'ingestion signale ses échecs **sur le même canal**. Le détail, les
mesures et ce que la règle ne rattrape pas :
[`#71`](https://github.com/IvandeMurard/paris-compass/issues/71).

**Le bras A ne meurt plus dans sa fenêtre, et il en a une à lui.** Il héritait des 120 000 ms
du rôle `postgres`, un réglage de cluster que personne ici n'a choisi ; il pose maintenant
`set local statement_timeout = 60000`, **moitié moins**, et alerte à 30 000 ms. C'est possible
parce que `I1`, `I2` et `I7` sont découpés : l'instruction la plus large fait **6 à 13 s** au
lieu de 118. Section 30, désormais dans `DIAGNOSTIC-CORRIGES.md` — l'index de `DIAGNOSTIC.md`
la résout.

| | Avant, 31 août à froid | Après |
| --- | ---: | ---: |
| Instruction la plus large du bras A | **118 137 ms** (I1) sur 120 000 | **6 200 à 13 100 ms** sur 60 000, alerte à 30 000 |
| Bras A entier | 296 160 ms | ~220 s — le découpage borne l'instruction, **pas le total** |
| Un `57014` sur un invariant | tue la course, **B, C et E jamais joués** | **suspendu**, nommé, la course va au bout, sortie 3 |


## Environnement — ce qui ne tourne pas sur ce poste, et le contournement

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
sur ceux documentés dans `docs/REPRISE-ARCHIVE.md`, « Ce qui existe et fonctionne », à la dérive normale près (les sources BODACC et
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

**Le back-end, les données et le MCP passent avant le front.** Direction donnée par Ivan le
31 août 2026. Ce qui est prioritaire, dans l'ordre : la fiabilité, la rapidité et la solidité
du socle ; l'accessibilité et le maintien en condition opérationnelle des API et du MCP ;
un protocole d'évaluation strict qui tourne **de lui-même**, pas quand quelqu'un y pense.

Trois conséquences qui se lisent dans le backlog :

- Un ticket qui rend une donnée plus fiable, plus fraîche ou plus vérifiable passe devant un
  ticket qui l'affiche mieux. `w1-ppri` (#13) est un défaut réel — un libellé de risque vrai
  presque partout dans Paris, affiché sur la carte avec sa méthode publiée — et il attend
  quand même, parce qu'il est du front.
- **« Toujours privilégier la logique et les actions durables. »** Une cadence posée à la main
  sur quatre sources n'est pas une cadence : c'est quatre décisions qui ne se répètent pas. La
  règle doit énumérer, pas lister — même exigence que `I23`/`I24` pour la retenue de licence.
- L'amélioration continue du protocole d'évaluation porte sur ce qu'il **détecte**, jamais sur
  ce qu'il **tolère**. Une porte qui se détend pour rester verte a cessé d'être une porte, et
  la règle des baselines le dit déjà : regeler est permis, jamais pour faire taire un
  avertissement.


**Un rouge et une panne amont se distinguent au code de sortie, et la clémence vit dans le
bras — jamais dans le rapport.** Tranché le 31 août 2026 en posant la porte planifiée
([`#71`](https://github.com/IvandeMurard/paris-compass/issues/71)).

Le seul risque sérieux de ce chantier est l'alerte qui crie pour rien : un miroir Overpass à
429, un endpoint momentanément injoignable, n'appellent aucune décision, et une alerte qui les
signale sera coupée en deux semaines — ce qui **supprime la vigilance sans fournir la
garantie**. La règle qui en découle tient en deux phrases.

- **Le rapport ne classe rien.** Il lit le code de sortie que le bras a arrêté : 0 rien à
  faire, 3 changé sans décision, 1 et 2 décision requise. Il ne lit jamais le texte.
- **La décision de faire cesser un échec se prend là où l'erreur et son `code` existent**,
  c'est-à-dire dans `scripts/eval/upstream.ts` : `classify` pour l'HTTP (`#61`),
  `classifyDriverError` pour le pilote (`#69`), `isUnreachable` pour l'endpoint qui n'a jamais
  répondu (`#71`). Si une classe de panne amont arrive au rapport en rouge, **c'est là qu'on
  la corrige**, pas en assouplissant le rapport — qui ne tient qu'une chaîne de caractères, et
  `#61` a déjà refusé de classer sur du texte.

Le format du compte rendu — **rien à faire** en une ligne pour l'ensemble, **changé sans
décision requise** nommé et daté, **décision requise** avec la mesure, sa date et la décision
attendue — est écrit une fois dans `scripts/porte/report.ts` et **réutilisé** par le cron
d'ingestion, et par `w1-catalogue` (#73) quand il passera. Trois protocoles qui produisent
trois formats de rapport, c'est trois choses à lire, donc zéro chose lue.


**Une cadence est une propriété de la source, et une source sans cadence est un rouge.**
Tranché le 1er septembre 2026 en fermant `w1-cadence`
([`#70`](https://github.com/IvandeMurard/paris-compass/issues/70)), et c'est la mise en oeuvre
de « toujours privilégier la logique et les actions durables » sur les données.

Trois choses en découlent, et aucune n'est les quatre entrées `cron` ajoutées ce jour-là.

- **La population est énumérée.** `scripts/porte/cadences.ts` lit les sources que les migrations
  insèrent dans `ingestion_run` — l'endroit où la valeur est **produite**, `recordRun` ne faisant
  ensuite que des `update` — et les croise avec la table `cron -> source` des workflows
  planifiés. Une neuvième source née sans cadence rougit à l'écriture de sa migration, dans
  `npm.cmd run test`, sans base.
- **Le recoupement se fait sur ce qui NOMME, jamais sur ce qui EXÉCUTE.** La branche `bdcom)`
  d'`ingestion.yml` lance aussi `geography.ts` ; apparier les sources aux chemins de leurs
  chargeurs aurait fait répondre le cron de BDCom pour `geography`. Détail dans
  `docs/REPRISE-PIEGES.md`.
- **Le dépassement de cadence est un bras de la porte, pas une ligne de journal.**
  `freshness` sort désormais 0, 3 ou 1 sur la convention de `scripts/porte/report.ts`, et il
  vit dans `porte.yml` — parce qu'un chargement qui n'a **jamais démarré** ne laisse aucun
  échec derrière lui : `ingestion.yml` ne peut pas rapporter un job qu'il n'a pas lancé.

**Ce que la règle ne rattrape pas, et il faut le nommer** : elle vérifie qu'un déclencheur
**existe**, jamais qu'il a **réussi** — ni que le chargeur a chargé la bonne chose.
`last_success_at` avance dès que le chargeur n'a pas levé ; une source qui se mettrait à
publier une couche vide rafraîchirait cette date chaque semaine et resterait verte ici pour
toujours. C'est l'affaire de la porte d'évaluation et de ses baselines. Deux limites plus
étroites sont écrites dans `DIAGNOSTIC.md` §31.


**La cadence de la porte est quotidienne, et elle est déduite.** Même date, même ticket.
Ce qui est surveillé est le distant, et la chose la plus rapide qui le déplace est le
chargement BODACC de 03:17 UTC — la seule source qui vieillit en jours. Une cadence plus fine
que ce qu'elle surveille n'achète rien et coûte huit millions de pages de balayage rejouées
vingt-quatre fois par jour sur une instance partagée ; une cadence hebdomadaire institue
exactement le délai « posé un mardi, trouvé un jeudi » que le ticket existe pour supprimer.
La porte partage le verrou `concurrency` de l'ingestion : **elle ne juge jamais une base en
cours de chargement**, et c'est le verrou qui le garantit, pas le décalage horaire.


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

> **Reconduite le 28 août en fermant `#64`, et sous une forme qu'il faut nommer :
> aucun rayon maximal propre à une fonction.** `#64` proposait d'en donner un, plus
> bas, à `compass_scoring_context_within` seule, en avançant que la promesse serait
> vide puisque « le serveur MCP la joue au rayon de score, pas au rayon de carte ».
> **Vérifié dans le code, c'est faux** : `score_location`, `explain_score` et
> `compare_locations` déclarent tous les trois `radius_m:
> z.number().positive().max(2000)` et le passent tel quel à la fonction. La promesse
> est donc réelle et un agent qui lit ces schémas la croit. Elle n'a pas eu à être
> retirée : le coût était ailleurs, et il a été traité dans le corps.

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

## La suite, par ordre

Les points **1, 3, 4, 8, 9, 10 et 11 sont rayés** et sont partis dans
`docs/REPRISE-ARCHIVE.md`, avec leur numérotation d'origine — `docs/PLAN.md` et
`docs/PLAN-ACTION-VACANCE.md` y renvoient par leur numéro. Restent ceux-ci.

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
jours pour cette raison (voir « Vulnérabilités » dans `docs/REPRISE-ARCHIVE.md`). Chercher la version
minimale dans l'avis GitHub ou l'export Socket avant de renoncer à une montée.

Ne pas vérifier une montée de `vite` avec `npm.cmd run build` seul. La commande
construit en mode production, où `lovable-tagger` **n'est pas chargé** : une panne
du lien avec Lovable passerait inaperçue. Lancer aussi `npm.cmd run build:dev`.

Ne pas restreindre la population de `I1` ou `I2` comme `I7` restreint la sienne. Celle de
`I7` est saine — un local sans avis BODACC ne peut pas violer une règle sur les avis BODACC.
Il n'existe pas d'équivalent : la chronologie émet une ligne de relevé **par millésime pour
chaque local**, observé ou non, donc tout local peut porter la ligne fautive. Ce serait un
**échantillon**, ce que `eval/FAILURE_MODES.md` refuse, et il faudrait le porter au contrat.
Le découpage en tranches de `#69` n'en est pas un : les bornes sont ouvertes aux deux
extrémités du domaine, donc toutes les lignes sont vues. `DIAGNOSTIC.md` § 30.

Ne pas monter la fenêtre du bras A pour absorber une lenteur. Elle est **déclarée** dans
`scripts/eval/invariants.ts` depuis le 31 août, à 60 000 ms, et l'alerte à 30 000 ms est là
pour que la discussion arrive **avant** le mur. Si une instruction s'en approche, la réponse
par défaut est de baisser `ARM_A_CHUNK_ROWS`, pas de monter `ARM_A_WINDOW_MS` : la première
borne le travail, la seconde le cache.

Ne pas rendre le rapport de la porte plus clément pour faire taire un signal. Le rapport lit
un code de sortie et rien d'autre ; la seule place légitime pour décider qu'une chose cesse
d'être un échec est `scripts/eval/upstream.ts`, dans le bras qui tient l'erreur et son `code`.
Assouplir `scripts/porte/report.ts` reviendrait à classer sur du texte, ce que `#61` a refusé,
et à éteindre les rouges à l'endroit exact où personne ne le verrait. `#71`.

Ne pas ajouter une source à `ingestion_run` sans lui donner une cadence tenue. Depuis le
1er septembre 2026, `npm.cmd run test` échoue tant qu'une source déclarée par une migration
n'a ni entrée `cron` dans un workflow planifié, ni raison écrite dans le bloc `sources` de
`scripts/porte/cadence.json`. Et ne pas élargir une tolérance de
`scripts/ingest/lib/cadence.ts` pour éteindre un « EN RETARD » : le seuil dit depuis quand
nous n'avons pas vérifié, et le monter ne rafraîchit rien — c'est le même geste que desserrer
une baseline, refusé une fois pour toutes. `#70`.

Ne pas ajouter un script à `package.json` sans le classer. `npm.cmd run test` échoue tant qu'un
script n'est ni joué par un workflow qui porte un `on.schedule`, ni nommé dans
`scripts/porte/cadence.json` avec une **raison écrite**. C'est voulu, et c'est le trou de `#70`
un cran plus haut : six bras en six mois dont un que personne ne lance. Une raison qui se
résume à « pas besoin » est le début de la complaisance que `#71` refuse.

Ne pas forcer `enable_nestloop = off` sur les fonctions de rayon, ni globalement ni
sur les quatre sans distinction de rayon : le hachage vaut −81 % de pages à 2 000 m
mais **dix-huit fois pire à 50 m**, alors que le rayon par défaut du produit est 800 m
et que `find_premises` plafonne à 500 m. Le levier ne sait pas dépendre du rayon.
`#65`, `DIAGNOSTIC.md` § 29.

Ne pas remplacer `ST_DWithin(g, point, d)` par `g && _ST_Expand(point, d) and
ST_Distance(g, point) <= d`, malgré la documentation qui les donne pour équivalentes.
**Elles ne le sont pas sur ce corpus** : quinze locaux à `POINT(NaN NaN)` passeraient
la seconde à tous les rayons et à tous les points, jusqu'à 1 m. Démontré sur la
population entière, `DIAGNOSTIC.md` § 29 et
[`#68`](https://github.com/IvandeMurard/paris-compass/issues/68).
