# Reprise — état au 17 août 2026, fin de session

À lire en premier après `CLAUDE.md`. Décrit ce qui tourne, ce qui bloque, et ce
qui n'est écrit nulle part ailleurs. Le reste du contexte est dans `docs/PLAN.md`
(backlog, décisions produit), `docs/BDCOM.md` (pièges de la source) et
`eval/FAILURE_MODES.md` (le contrat d'évaluation).

---

## Ce qui existe et fonctionne — en local **et sur le distant**

**Le distant est chargé depuis le 15 août.** C'est le changement le plus important
de cette page, et il annule le « point bloquant » que les versions antérieures
décrivaient : `dbefhvmyfmmhjeetdddu` porte le schéma **et** les données. Mesuré en
direct le 17 août sur la base elle-même, pas déduit :

| | Distant `dbefhvmyfmmhjeetdddu` |
| --- | --- |
| Migrations au ledger `supabase_migrations` | **24**, de `20250417000001` à `20260816000001` |
| Tables / fonctions `compass_*` | **18 / 10** — mêmes chiffres que la base de référence |
| Locaux (`premise_location`) | 85 418 |
| Relevés (`premise_observation`) | 228 275 — les trois millésimes additionnés |
| Tronçons de voie / quartiers | 25 094 / 80 |
| Établissements SIRENE | 68 770 |

**Le dépôt et le distant portent le même schéma** depuis le 17 août :
`20260816000001_scoring_context_withholding.sql`, la dernière en attente, y a
été posée et vérifiée en comportement. Détail au point 8 de « La suite, par
ordre ».

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
| `npm.cmd run test` | 73 tests sur 73 |
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
npm.cmd run eval      # 10 invariants, 24 baselines, 8 cas dorés — environ 45 s
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

**Quatre niveaux de fiabilité, calculés et jamais saisis** : `etabli`,
`corrobore`, `probable`, `indetermine`. Pas de score sur 100 — un pourcentage de
confiance serait le chiffre invérifiable que le produit refuse. La règle est dans
`docs/PLAN.md` §2.5.

**La composition de fiabilité est la métrique de qualité.** 51,6 % établi,
5,9 % corroboré, 36,5 % probable, 6,0 % indéterminé. S'améliorer veut dire
déplacer ces quatre nombres vers la gauche ; chaque source branchée se juge à ça.
Le résidu de 36,5 % est **structurel** : BODACC nomme une adresse, BDCom un
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

## Pièges qui ont coûté du temps aujourd'hui

**Une politique RLS n'est pas un `GRANT`.** Toutes les migrations ont d'abord été
écrites sans droit de lecture : les fonctions échouaient pour un visiteur avant
qu'aucune politique ne soit consultée. Corrigé en `20260809000009`.

**Dans une fonction `SECURITY DEFINER`, `current_user` est le propriétaire.**
Tester le privilège avec lui conclut toujours « privilégié ». Il faut lire le
rôle que PostgREST met dans `request.jwt.claims`.

**Le chemin privilégié réussit toujours.** Les trois défauts d'exposition n'ont
été trouvés qu'en jouant le chemin **anonyme**. Le lanceur d'évaluation sait le
faire : marqueur `-- @as anon` dans `eval/invariants.sql`.

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

**Ne jamais passer `--omit=optional` à npm sur ce projet.** Rollup livre son
binaire natif (`@rollup/rollup-win32-x64-msvc`) en dépendance *optionnelle* :
l'omettre casse `vitest` et `vite build` avec un `MODULE_NOT_FOUND` sur
`rollup/dist/native.js`, dont le message ne dit pas d'où vient le manque. Un
`npm.cmd install` simple répare.

---

## La suite, par ordre

1. ~~**L'hôte de connexion**, puis migrations et chargement sur Lovable Cloud.~~
   **Fait le 15 août, sur `dbefhvmyfmmhjeetdddu` et non sur Lovable Cloud** — la
   cible a changé, voir « Le nœud Supabase ». Reste de cet item : **la porte
   d'évaluation n'a jamais été jouée contre l'instance distante.** Elle ne l'a
   été que contre l'agrégat local. Le lanceur annonce sa cible depuis le 12 août,
   donc un « PASS » distant serait lisible comme tel. À faire une fois la
   migration du point 8 posée, pour que les deux bases portent le même schéma.
2. **Message à l'APUR** — rédigé, à envoyer le lundi 10 août. Il décide si 2017 et
   2020 sortent publiquement, et si le service `bdcom20032020` (sept couches de
   2003 à 2020, vacants compris) est utilisable — ce qui porterait l'historique de
   six à vingt ans.
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

   Reste, mais c'est l'item 1 : la porte d'évaluation n'a toujours jamais tourné
   contre le distant.

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
