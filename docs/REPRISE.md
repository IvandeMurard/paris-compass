# Reprise — état au 12 août 2026, fin de session

À lire en premier après `CLAUDE.md`. Décrit ce qui tourne, ce qui bloque, et ce
qui n'est écrit nulle part ailleurs. Le reste du contexte est dans `docs/PLAN.md`
(backlog, décisions produit), `docs/BDCOM.md` (pièges de la source) et
`eval/FAILURE_MODES.md` (le contrat d'évaluation).

---

## Ce qui existe et fonctionne — en local uniquement

**Dix-neuf** migrations appliquées sur une base locale, quatre sources chargées,
la porte d'évaluation au vert — rejouée et confirmée le **12 août**.

Dix-neuf, pas vingt-et-une : `supabase/migrations/` contient 21 fichiers, mais les
deux derniers (`20260809131158`, `20260809131210`, générés par Lovable) ne sont
pas appliqués en local.

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

### Vulnérabilités : 21 → 9 → 7, et pourquoi les sept restent

`npm.cmd audit fix` (jamais `--force`) le 12 août. `package.json` n'a pas bougé :
aucune plage de version élargie, seul le verrou a changé. Typecheck, 43 tests et
build de production vérifiés après coup.

**`react-router-dom` passé en v7 le 15 août** (voir `DIAGNOSTIC.md` §7) : l'*open
redirect* par antislash disparaît avec la version majeure. Il ne restait que celle-là
à exiger un changement cassant pour se corriger ; les sept autres n'en sortiront pas
plus aujourd'hui.

Les sept restantes exigent toutes une **majeure**, et aucune n'est atteignable
par un visiteur :

| Paquet | Gravité | Pourquoi on ne bouge pas |
| --- | --- | --- |
| `vitest` | critique | L'avis vise le **serveur d'interface** de Vitest. Le projet lance `vitest run`, jamais `--ui`. Correctif = vitest 4 |
| `vite`, `esbuild` | haute / modérée | Serveur de **développement** uniquement. Le produit est un site statique sans backend joignable. Correctif = vite 8 |

Les XSS hautes de React Router, elles, **sont corrigées** : c'était la seule
famille qui atteignait réellement le navigateur, avec `nanoid`, passé en 3.3.18.

**`bun.lockb` a été régénéré** le 12 août, puis à nouveau le 15 août après le
passage de `react-router-dom` en v7 — même procédure, même conteneur jetable sans
lockfile préexistant. Il porte les mêmes versions que `package-lock.json` sur les
paquets que les avis nomment (détail dans `DIAGNOSTIC.md` §7) ; deux paquets sans
rapport avec un avis (`@vitejs/plugin-react-swc`, `lovable-tagger`) divergent en
version mineure, une résolution fraîche prenant plus récent qu'un verrou npm non
retouché depuis le 12 — sans conséquence, leur vulnérabilité déclarée n'est
qu'héritée de `vite`, identique des deux côtés. Les deux verrous restent alignés
là où ça compte, et les correctifs partiront en production au prochain build
Lovable.

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

## Le point bloquant, unique

**Rien n'a jamais été poussé ni chargé sur une instance distante.**

`.env.local` existe, et **tout y est juste sauf le mot de passe**.
`connectionTarget()` dans `scripts/ingest/lib/db.ts` affiche la cible sans jamais
montrer le secret : **s'en servir avant tout chargement**.

La région est `eu-north-1` (Stockholm), donnée par Lovable et **vérifiée** le
12 août. L'hôte du fichier a été corrigé en conséquence.

| Cible | Réponse |
| --- | --- |
| `aws-0-eu-west-3.pooler.supabase.com:5432` (hôte d'origine) | `XX000 tenant/user postgres.nwnhhvogwrzstslxtxca not found` |
| `aws-1-eu-west-3.pooler.supabase.com:5432` | même refus |
| `db.nwnhhvogwrzstslxtxca.supabase.co:5432` (direct) | enregistrement **AAAA seul**, machine sans IPv6 → `ENOTFOUND` |
| `https://nwnhhvogwrzstslxtxca.supabase.co/rest/v1/` | 401 avec `sb-project-ref` renvoyé — **le projet est vivant** |
| **`aws-0-eu-north-1.pooler.supabase.com:5432`** | **`28P01 password authentication failed`** |

Ce dernier changement d'erreur est le résultat utile : passer de `XX000` à
`28P01` prouve que **le tenant est trouvé**. Hôte, port, rôle et chemin IPv4
sont donc validés. Le pooler eu-north-1 répond en IPv4 : ni option payante, ni
`db.<ref>.supabase.co`, ni IPv6 nécessaires.

**Il ne reste qu'une inconnue : le mot de passe.** Celui du fichier vient d'un
autre projet et n'a jamais été bon — il n'avait simplement jamais pu être
testé, le refus de tenant arrivant avant l'authentification.

Lovable ne peut pas *lire* le mot de passe : sur Lovable Cloud ni l'agent ni
l'interface n'y ont accès. Mais il peut le **réinitialiser** — c'est une action
de propriétaire, et Lovable est propriétaire du projet. Ne pas redemander « le
mot de passe » (question sans réponse possible), demander **une rotation**.

Le balayage de plusieurs régions à la suite avec le mot de passe **est bloqué par
la politique d'exécution** — cela ressemble à un essai de connexions en série.
Tester une cible à la fois.

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

1. **L'hôte de connexion** (voir le tableau plus haut), puis migrations et
   chargement sur Lovable Cloud, puis la porte contre l'instance distante. Une
   vingtaine de minutes une fois la chaîne en main.
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
