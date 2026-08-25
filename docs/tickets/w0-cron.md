# [P0] w0-cron — Ingestion planifiée + date de fraîcheur par source

**ID** `w0-cron` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** `w0-deploy`
**Sources** `bdcom`, `bodacc`, `sirene`

## Pourquoi
Les scripts sont idempotents mais rien ne les rejoue. Une date affichée sans rythme réel est le loyer fabriqué sous une autre forme.

## Comment
Job à privilèges élevés (GitHub Actions ou équivalent serveur), jamais la clé anon. Table générique (source, dernière exécution ok, n lignes). Cadences distinctes : SIRENE mensuel, BODACC continu, BDCom triennal, géographie rare.

## Doctrine
Afficher une date n'est honnête que si le rafraîchissement est réel ou déclaré.

## Fait quand
compass_* expose ingested_at pour BDCom, géographie, BODACC et SIRENE. Un cron a tourné au moins une fois sans intervention manuelle.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Fait le 25 août 2026 — le cron a tourné seul, issue fermée

**Ce ticket redit `docs/PLAN.md` §2.2bis et §2.2ter mot pour mot.** Les deux sont clos ensemble
et se citent l'un l'autre, plutôt que laissés diverger. §2.2bis posait la question « où tourne
un job planifié à privilèges élevés », §2.2ter demandait « une table générique (source,
dernière exécution réussie, nombre de lignes) » : ce sont les deux moitiés de ce ticket.

**Le critère est en deux temps, et les deux sont atteints.**

| « Fait quand » | État |
| --- | --- |
| `compass_*` expose `ingested_at` pour BDCom, géographie, BODACC et SIRENE | **fait** — `compass_source_freshness()`, migration `20260825000001`, ledger distant remesuré à **30** en fin de session |
| Un cron a tourné au moins une fois sans intervention manuelle | **fait** — run [32807455464](https://github.com/IvandeMurard/paris-compass/actions/runs/32807455464), événement `schedule`, `run_by = schedule` |

**Les deux moitiés sont remplies, issue fermée le 25 août.** Le cron BODACC s'est déclenché
seul à 04:02 UTC pour une planification à 03:17 — le retard habituel de GitHub, sans
conséquence. `run_by` vaut `schedule`, ni `manual` ni `workflow-dispatch`, et `run_ref` porte
l'URL du run : l'affirmation se recoupe au lieu de se croire.

**Et l'enchaînement s'est vérifié en conditions réelles.** `bodacc.ts` →
`sirene.ts --confirm-only` a réévalué **84 255 avis**, et les confirmations sont intactes après
un rechargement automatique — **82 371 confirmés, 1 884 infirmés**, les valeurs d'avant. Sans
cette chaîne, ce passage aurait détruit les 3 147 niveaux `corrobore` et recommencé chaque nuit.
Le défaut est vérifié corrigé par le mécanisme même qui l'aurait déclenché.

**Ce qui est démontré en CI**, run
[32798202890](https://github.com/IvandeMurard/paris-compass/actions/runs/32798202890) du
25 août : le job atteint le distant **par le pooler**, charge la géographie — 80 quartiers,
25 094 tronçons — et enregistre `run_by = workflow-dispatch`. **Pas `schedule`**, et c'est le
point : le relevé de fin de job écrit toujours « aucune source n'a encore été rafraîchie par un
cron, cadence déclarée, pas tenue ». Une pression sur un bouton ne se fait pas passer pour une
cadence tenue.

> **Le premier lancement, lui, a échoué** — et utilement. La valeur du secret n'était pas une
> URL `postgres://`, la garde a refusé de démarrer, et rien n'a été écrit. Mais son message
> envoyait chercher à l'aveugle, et sur un runner personne ne peut inspecter la valeur.
> `assertPrivileged` décrit désormais la **forme** de ce qu'elle a reçu sans en révéler le
> contenu : ligne `.env` entière collée, guillemets ramassés, marque-place `[YOUR-PASSWORD]`,
> commande `psql` prise pour une URL, espaces en tête — plus le cas `db.<ref>.supabase.co`, qui
> échoue sur un runner faute d'IPv6, exactement comme sur ce poste.

### Les chiffres d'entrée, remesurés

| Affirmation | Remesuré le 24-25 août |
| --- | --- |
| « les scripts sont idempotents mais rien ne les rejoue » | **la seconde moitié est vraie, la première est fausse.** `bdcom.ts` n'était pas rejouable — `DIAGNOSTIC.md` §17 |
| aucun `.github/workflows` | **exact** — seul `ISSUE_TEMPLATE/` existait |
| `bdcom_vintage.ingested_at` posé, seul `bdcom.ts` l'écrit | **exact** — figé au **15 août 15:22 UTC**, jamais rejoué depuis, soit dix jours |
| SIRENE mensuel, BODACC continu, BDCom triennal, géographie rare | **exact**, et repris tel quel comme `cadence` |
| `pg_cron` comme option | **disponible en 1.6.4, non installé** |

### Où va le secret, et pourquoi

**Secret de dépôt GitHub Actions**, sous le nom `DATABASE_URL` que `scripts/ingest/lib/db.ts`
lit déjà — aucune indirection à inventer. Déclencheurs réduits à `schedule` et
`workflow_dispatch`, `permissions: contents: read`.

Écartés, avec leur raison mesurée :

- **Edge Functions Supabase** — runtime Deno, pas de DuckDB, limite de temps d'exécution. Le
  pipeline lit un parquet INSEE de plusieurs centaines de Mo ; il ne s'y transpose pas.
- **`pg_cron`** — disponible mais non installé sur `dbefhvmyfmmhjeetdddu` (1.6.4, mesuré le
  24 août). Postgres n'exécute ni Node ni DuckDB : il ne saurait qu'appeler un webhook, ce qui
  exigerait un jeton GitHub **stocké dans la base même que le job protège**. Deux secrets au
  lieu d'un, et le plus sensible rangé du mauvais côté.

Le dépôt est **public** et ne portait **aucun secret, aucune variable, aucun environnement**
(mesuré le 24 août). Sur dépôt public les secrets ne sont pas transmis aux PR de forks, mais
quiconque peut pousser un workflow peut les lire : d'où les déclencheurs restreints, testés.

### Deux dates, jamais une — c'est tout le sujet

La faute que ce ticket doit éviter n'est pas l'absence de date, c'est **l'effondrement de deux
dates en une**. Recharger BODACC aujourd'hui rend *notre copie* à jour ; ça ne rajeunit pas les
annonces. Un millésime BDCom rechargé ce matin reste un recensement de 2023.

Mesuré le 25 août, après avoir rechargé BDCom **le jour même** :

| source | cadence | source datée | chargé le | lignes | par |
| --- | --- | --- | --- | --- | --- |
| `bdcom` | triennial | **2023-06** | **2026-08-25** | 228 275 | manual |
| `bodacc` | continuous | 2026-08-23 | 2026-08-25 | 163 788 | manual |
| `geography` | rare | 2026-08-25 | 2026-08-25 | 25 174 | manual |
| `sirene` | monthly | — | — | — | — |

La ligne `bdcom` est la démonstration : les deux dates diffèrent de trois ans sur une donnée
chargée il y a une minute. Épinglé par `F2` de `mcp-server/src/verify.ts`, qui échoue si la
date de la donnée devient celle du chargement.

La ligne `sirene` en est une autre : **jamais chargée**, et elle le dit — elle n'emprunte pas
la date d'un voisin. `F3` le tient.

### Quatre cadences, un fichier

`.github/workflows/ingestion.yml`. Quatre `cron` plutôt qu'une planification commune : le pas
de temps est une propriété de la source.

| Jeu | Cadence | Pourquoi |
| --- | --- | --- |
| BODACC | quotidien | la seule source qui vieillit en **jours** |
| SIRENE | mensuel, le 3 | l'INSEE republie le fichier géolocalisé chaque mois |
| BDCom | trimestriel | recensement triennal : on vérifie que la couche servie est toujours celle publiée, on ne rajeunit rien |
| Géographie | semestriel | quartiers et voies ne bougent qu'à la marge |

**BDCom enchaîne `geography.ts` derrière lui**, et pas l'inverse : le rattachement des locaux
aux quartiers et aux tronçons se recalcule là. Recharger le recensement sans rejouer le
rattachement laisserait les nouveaux locaux hors des agrégats par quartier — une perte
silencieuse, la famille de défauts que ce projet traque. Tenu par test.

Un verrou `concurrency: ingestion` avec `cancel-in-progress: false` : deux chargeurs ne doivent
jamais écrire ensemble, et **tuer celui qui tourne annule sa transaction**, donc perd
l'exécution au lieu de la remplacer.

### Ce que rejouer les quatre chargeurs a trouvé

Aucune de ces deux choses ne se déduisait d'une lecture. Il fallait les lancer.

**1. `bdcom.ts` ne pouvait tourner qu'une fois.** `DIAGNOSTIC.md` §17, **corrigé**. Il vidait
`bdcom_activity`, que `premise_observation.activity_code` référence : le `delete` ne passait
qu'au premier chargement, quand `premise_observation` est encore vide. Rejoué après correctif,
il rend **exactement les mêmes chiffres** qu'au 15 août — l'idempotence est mesurée sur deux
exécutions, plus supposée.

**2. L'URL du parquet SIRENE rend 404.**
[**#56**](https://github.com/IvandeMurard/paris-compass/issues/56), **ouverte, P0**.
data.gouv.fr a remplacé la ressource le 21 août et ne garde qu'un seul parquet : celle épinglée
au 21 juillet n'existe plus. Le cron mensuel SIRENE **échouera** tant que ce n'est pas tranché,
et c'est délibérément laissé ainsi — un job qui échoue bruyamment chaque mois est un rappel, un
job absent est un oubli.

> L'épinglage était un choix documenté : « a silent change of vintage would move every
> confirmation without anything saying so ». Le raisonnement était juste **et sa prémisse a
> changé le 25 août** — il n'existait alors aucun endroit où consigner le millésime chargé.
> `ingestion_run.source_as_of` est maintenant cet endroit.

### La garantie centrale, démontrée par un vrai échec

**Une exécution ratée ne rajeunit rien.** `recordRun` est appelée après le commit, jamais
dedans. Ça n'a pas eu à être mis en scène : l'échec de `bdcom.ts` a laissé
`compass_source_freshness()` sur « jamais chargé » pour `bdcom`, et l'échec de `sirene.ts` l'y
laisse encore. Le workflow relève d'ailleurs la fraîcheur avec `if: always()` — c'est en cas
d'échec que le relevé compte le plus, puisqu'il montre que rien n'a bougé.

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260825000001_ingestion_freshness.sql` | `ingestion_run`, l'énumération des cadences, `compass_source_freshness()`, RLS lecture seule. **Posée sur le distant**, ledger à 28. |
| `scripts/ingest/lib/db.ts` | `recordRun()` et `assertPrivileged()` — ce dernier refuse une clé Supabase déguisée en chaîne de connexion, et refuse de retomber sur `127.0.0.1` sur un runner. |
| `scripts/ingest/{bdcom,geography,bodacc,sirene}.ts` | Chacun écrit sa ligne, avec **sa** stratégie de `source_as_of` : millésime pour BDCom, date d'export pour la géographie, annonce la plus récente pour BODACC, date lue sur l'URL épinglée pour SIRENE. |
| `scripts/ingest/freshness.ts` | `npm.cmd run freshness`. Lecture seule, et dit « cadence déclarée, pas tenue » tant qu'aucun job planifié n'est passé. |
| `.github/workflows/ingestion.yml` | Quatre cadences, un secret, verrou de concurrence. |
| `scripts/ingest/workflow.test.ts` | **11 tests** : la table cron -> jeu ne peut pas dériver du bloc `on.schedule` sans que `npm.cmd run test` le dise. |
| `mcp-server/src/tools/listSources.ts` | La fraîcheur des quatre jeux atteint l'agent, avec la lecture des deux dates écrite à côté. |
| `mcp-server/src/verify.ts` | Famille `FRAICHEUR`, quatre contrôles. |
| `scripts/ingest/sirene.ts` | `--confirm-only` : rejoue la confirmation sans relire l'INSEE. |
| `eval/baselines/ingestion.json` | `identifiants_reattribues` compte enfin ce que son nom annonce. |
| `tsconfig.node.json`, `vitest.config.ts` | `scripts/` entre dans le typecheck et dans les tests. |

### Deux défauts de plus, trouvés le même jour en rejouant les chargeurs

Aucun des deux ne se déduisait d'une lecture, et **aucun des deux ne faisait échouer quoi que ce
soit** : le premier détruisait une donnée en silence, le second produisait une base différente
sans erreur.

**3. Recharger BODACC détruit toutes les confirmations SIRENE.** `bodacc.ts` reconstruit
`bodacc_announcement` en entier, ce qui cascade sur `bodacc_establishment` et emporte
`operator_confirmed`. Mesuré à la porte d'évaluation : **3 147 niveaux `corrobore` tombés à
zéro**, soit **5,92 points** de composition établi+corroboré — la métrique de qualité du projet.

Et c'était un défaut du **workflow autant que du chargeur** : un cron BODACC *quotidien* aurait
effacé ces niveaux chaque nuit, quand SIRENE ne repasse que *tous les mois*. Corrigé par
`sirene.ts --confirm-only`, qui rejoue la seule étape de confirmation — elle ne lit que
`sirene_establishment`, que BODACC ne touche pas, donc sans relire les centaines de mégaoctets
du parquet INSEE. Ce qui tombe bien : cette URL rend 404 (#56), et les confirmations auraient
été autrement irrécupérables. La branche `bodacc` du workflow enchaîne désormais cette étape, et
un test l'exige.

**Réparé** : `corrobore` de retour à 3 147, les huit cas dorés au vert, tendance
établi+corroboré revenue à 57,26 %.

**4. La promotion BDCom dépendait de l'ordre de chargement.** `DIAGNOSTIC.md` §17, seconde
partie. Le drapeau `ordre_address_conflict` se calculait pendant chaque promotion, contre l'état
courant de `premise_location` — donc contre un corpus encore en construction.

| | 2017 | 2020 | 2023 | total |
| --- | --- | --- | --- | --- |
| chargement initial, 15 août | 0 | 0 | 74 | **74** |
| rechargement, 25 août | 73 | 73 | 74 | **220** |

**Les deux chiffres sont vrais et ne mesurent pas la même chose.** Il y a bien **74 identifiants
réattribués** — propriété stable du corpus — et ils touchent **220 relevés**. La métrique
s'appelait `identifiants_reattribues` et sa requête comptait des *relevés* : les deux ne
coïncidaient que par l'artefact ci-dessus. Corrigé des deux côtés — drapeau posé après les trois
promotions, requête en `count(distinct l.ordre)` — et **la valeur gelée n'a pas eu à bouger**.

> Cela invalide une phrase que ce même ticket portait plus haut. « Rejoué après correctif, il
> rend exactement les mêmes chiffres » était vrai des **effectifs** et faux du **contenu** : la
> base n'était pas identique. L'en-tête de `bdcom.ts` promettait « Re-running yields the same
> database » ; il était faux deux fois, et il est maintenant mesuré.

### Ce qui reste, et qui n'était pas dans le critère

- **Aucun cron n'a tourné.** C'est la seconde moitié du « Fait quand », et elle est **bloquée
  sur le secret** — à poser par une main humaine. Tant que `run_by` vaut `manual` partout, la
  cadence est déclarée et non tenue, et tout ce qui l'affiche le dit.
- **SIRENE est en panne** — #56, à trancher.
- **La fraîcheur n'atteint pas le navigateur.** `compass_source_freshness()` est exposée et
  lisible par `anon`, mais `src/` ne l'appelle pas : la fiche et la carte n'affichent aucune
  date de mise à jour. C'est du travail d'interface, hors périmètre de ce ticket.
- **GitHub désactive les workflows planifiés d'un dépôt public après 60 jours sans activité.**
  Non traité : ça n'a de conséquence qu'à partir de novembre, et le dépôt est actif.
- **Le rôle reste `postgres`.** Le pipeline a besoin de contourner RLS, pas d'être
  superutilisateur. Un rôle `compass_ingest` dédié serait plus juste — laissé ouvert, parce que
  le créer touche aux privilèges de la base et demande une décision.
