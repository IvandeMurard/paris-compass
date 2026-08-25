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

## Le 25 août 2026 — la moitié posée, la moitié bloquée sur un secret

**Ce ticket redit `docs/PLAN.md` §2.2bis et §2.2ter mot pour mot.** Les deux sont clos ensemble
et se citent l'un l'autre, plutôt que laissés diverger. §2.2bis posait la question « où tourne
un job planifié à privilèges élevés », §2.2ter demandait « une table générique (source,
dernière exécution réussie, nombre de lignes) » : ce sont les deux moitiés de ce ticket.

**Le critère est en deux temps, et un seul est atteint.**

| « Fait quand » | État |
| --- | --- |
| `compass_*` expose `ingested_at` pour BDCom, géographie, BODACC et SIRENE | **fait** — `compass_source_freshness()`, migration `20260825000001`, ledger distant à **28** |
| Un cron a tourné au moins une fois sans intervention manuelle | **non** — le secret de dépôt `DATABASE_URL` n'est pas posé, et ce n'est pas à une session de le poser |

L'issue reste donc **ouverte**. Elle se ferme au premier passage planifié, que
`compass_source_freshness()` rendra visible en basculant `run_by` de `manual` à
`github-actions`.

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
| `tsconfig.node.json`, `vitest.config.ts` | `scripts/` entre dans le typecheck et dans les tests. |

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
