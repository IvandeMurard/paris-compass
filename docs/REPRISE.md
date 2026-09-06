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

## L'état mesuré le plus récent — 3 septembre 2026, après le passage planifié qui valide les §33 et §34

**C'est le seul état que cette page porte** : les relevés antérieurs sont dans
`docs/REPRISE-ARCHIVE.md`, et quand deux se contredisent c'est le plus daté qui a tort. Ce qui
a bougé les 31 août et 1er septembre, et rien d'autre :

| Mesure | Valeur, mesurée le 31 août 2026, sauf mention du 1er septembre |
| --- | --- |
| Ledger distant `supabase_migrations` | **53, et recoupé pour la première fois aux migrations SUIVIES par git : 53 des deux côtés, mesuré le 6 septembre 2026 par le douzième bras** (`npm.cmd run ledger`, `w1-ledger` #82). Le recoupement va au-delà des identifiants — le ledger garde `statements text[]`, donc le texte appliqué — et **51 des 53 corps sont identiques caractère pour caractère** ; les deux autres sont `20260825000002` et `20260825000003`, réécrites après leur application le 25 août pour repasser leurs commentaires en anglais, consignées avec leurs empreintes dans `scripts/porte/ledger.json` et documentées en `DIAGNOSTIC.md` §39. **53** — mesuré le 5 septembre 2026 après `w1-geometrie` (#68), qui en pose **une** : `…20260905000006` rend `premise_location.geom` nullable, rattrape les quinze `POINT(NaN NaN)` et pose un `check` de finitude sur les **huit** colonnes `geography` du schéma. Il était à **52** — mesuré le 5 septembre 2026 après `w1-observabilite` (#72), qui en pose **cinq** : `…0001` le journal des questions, puis quatre qui la finissent et dont **trois viennent de défauts que seule une exécution a montrés** — `…0002` le cast d'enum (un `case` ne se convertit pas tout seul), `…0003` l'échappement de la porte (elle se comptait elle-même, dix seaux sur un produit sans trafic), `…0004` la volatilité (derrière PostgREST, une fonction `STABLE` tourne en lecture seule et ne journalise rien, en silence), `…0005` la latence, omise. Les trois pièges sont dans `docs/REPRISE-PIEGES.md`. Il était à **47** depuis le 31 août : ni `#69`, ni `#70`, ni `#71`, ni `#73` n'avaient posé de migration |
| Tests unitaires | **416**, mesurés le 6 septembre 2026 — dont les 20 de `scripts/porte/ledger.test.ts` ajoutés par `w1-ledger` (#82), qui jouent la comparaison des deux listes sans base et vérifient que chaque divergence consignée nomme encore un fichier suivi, **avec l'empreinte contre laquelle elle a été écrite** : une seconde réécriture de `20260825000002` fait échouer `test` seul, sans secret ni connexion. **396** mesurés plus tôt le même jour — dont les 20 de `scripts/porte/observabilite.test.ts` ajoutés par `w1-observabilite-echappement` (#81), qui énumèrent les fichiers atteignant PostgREST et exigent de chacun l'échappement ou une raison écrite. **376** mesurés le 5 septembre 2026 — dont les 10 de `scripts/ingest/lib/arcgis.test.ts` ajoutés par `w1-geometrie` (#68), qui éprouvent `featurePoint` sur la chaîne `"NaN"` que le service envoie pour un point absent. **366** mesurés plus tôt le même jour — dont les 15 de `scripts/porte/etat.test.ts` ajoutés par `w1-porte-lue` (#77) et les 14 de `scripts/porte/catalogue.test.ts`. **Le chiffre de 335 daté du 3 septembre était déjà faux** : remesuré sans le fichier neuf, le dépôt en portait **337**. Historique : 273 après `#71` , puis 299 avec `scripts/porte/cadences.test.ts`, la réconciliation distant/migrations et deux cas ajoutés de part et d'autre dans `scripts/ingest/workflow.test.ts` et `scripts/porte/workflow.test.ts`, puis **301** en tranchant les cadences sans seuil, puis **325** le 2 septembre 2026 avec les 14 tests de `scripts/build/envPublic.test.ts` , les 6 de `scripts/porte/publie.test.ts` , les 4 de `scripts/esbuildInvocation.test.ts` , les 6 de `scripts/eval/drift.test.ts` et les 4 de `scripts/mcpRegistry.test.ts` |
| **Sources et cadences** | **8 sources dans `compass_source_freshness()`, 8 entrées `cron`**, mesuré le 1er septembre 2026. Les huit du distant sont exactement les huit que les migrations déclarent — recoupé par `freshness`, zéro écart. Entretien remesuré le 5 septembre 2026 : **3 par `schedule`** (`bodacc`, `sirene`, `sirene_stock`), **2 par `workflow-dispatch`** (`geography`, `chantiers`), 3 depuis un terminal — le relevé du 1er septembre disait 1 / 1 / 6 et deux crons mensuels ont eu leur tour depuis. Les cadences les plus lentes n'ont toujours pas eu le leur, donc `freshness` sort en **3** et le dira jusqu'à ce qu'elles l'aient eu |
| Invariants | **42** — `I42` ajouté le 5 septembre 2026 par `w1-geometrie` (#68) : aucune colonne `geography`/`geometry` du schéma ne porte de coordonnée non finie, **et** chacune porte un `check` validé qui l'interdit — population énumérée depuis `pg_attribute`, donc la table suivante y entre en rouge tant qu'elle n'a pas sa contrainte. Rouge à **9 lignes** avant la migration (une de contenu, huit de forme), vert après, et démontré rouge deux fois dans l'acte 6 de `eval:sabotage`. **41** — `I39`, `I40` et `I41` ajoutés le 5 septembre 2026 par `w1-observabilite` (#72) : la rétention du journal, l'énumération de ses colonnes, et la retenue du quartier d'une question unique. Les trois sont **joués sous sabotage** dans l'acte 5 de `eval:sabotage`, en transaction annulée — colonne `ip` ajoutée, clé étrangère du quartier retirée, ligne de 400 jours insérée : les trois rougissent, et l'écriture suivante purge la ligne périmée d'elle-même. Le recensement de `I24` est passé de **6 à 7 fonctions** (`compass_question_summary` y entre d'office, `DIAGNOSTIC.md` §37), toutes couvertes. **38** — `I38` ajouté le 5 septembre 2026 par `w1-catalogue`, sur la table de codes des chantiers ; mesuré à **0 ligne** sur le distant, et démontré à **2 lignes** sous sabotage en transaction annulée, volume inchangé à 120 chantiers — **le rechargement du 5 septembre a porté la table à 113 lignes**, et `I38` reste à 0 sur ce contenu-là. Trois d'entre eux, `I1`, `I2` et `I7`, sont **joués en 22 instructions** au lieu d'une. Même population, toutes les tranches jouées |
| **Journal des questions** (`question_tally`) | **0 ligne, mesuré le 6 septembre 2026** — et mesuré *après* avoir rejoué les deux bras qui passent par PostgREST avec la vraie clé publiable, `eval:anon` (15 contrôles) puis `verify:mcp` (41 contrôles) : le journal est resté à zéro. C'est ce qui démontre que l'échappement de `#72` **s'applique** et n'est pas seulement déclaré — et la dernière porte planifiée, le 5 septembre à 11:21 UTC, avait tourné **avant** que l'échappement soit poussé (18:26 UTC), donc rien ne l'avait encore éprouvé sur un runner. Le zéro n'est pas un tuyau mort : un contre-test délibéré — un appel PostgREST sans l'en-tête, depuis `scripts/eval/sonde-w1-81.ts`, le 6 septembre — a bien écrit **un seau**, nommé et daté ici avant purge : *jour 2026-09-06, `rpc`, `compass_premises_within`, axe `premises`, rayon 800 m, millésime 2023, quartier `13`, issue `repondu`, 1 appel, 568 ms*. Purgé nommément le même jour, table revenue à 0 |
| **Coût des trois bras distants** (le quatrième, `freshness`, est **un aller-retour** : une RPC, aucun balayage) | Deux passages. `eval` **306 s** puis **299 s** (bras A seul 240 s) · `eval:anon` **5 s** deux fois · `verify:mcp` **114 s** puis **227 s** — **425 s puis 531 s**. L'écart est entièrement `verify:mcp`, et c'est Overpass : les contrôles suspendus attendent des miroirs publics à 429 et 504, chacun avec son délai. C'est ce chiffre-là qui dimensionne la cadence de la porte planifiée, **pas les 115 s de `#69`**, qui étaient `I1` seul avant son découpage |
| **Secrets de dépôt** | **`DATABASE_URL` seul.** `SUPABASE_URL` et `SUPABASE_ANON_KEY` **manquent**, donc `eval:anon` et `verify:mcp` n'ont pas de clé sur un runner. Le workflow s'arrête là-dessus en le nommant, avant de dépenser dix minutes |
| Portes | `typecheck` ✓ · `test` **416** ✓ (6 septembre, `w1-ledger`) · `ledger` **PASS, sortie 0** — 53 au ledger, 53 suivies par git, 51 appariées corps compris, 2 divergences consignées, 0 en écart (6 septembre 2026, première exécution) ; **démontré rouge sur l'incident du 5 septembre rejoué** : `git rm --cached` sur `20260905000006_geometrie_finie.sql`, fichier laissé sur le disque, rend **53 au ledger / 52 suivies, sortie 1**, identifiant nommé — et sortie 0 dès le fichier remis au suivi · `test` **396** ✓ (6 septembre, `w1-observabilite-echappement`) · `porte:etat` **0 sur un dépôt sans rouge ouvert, 1 démontré sur `#74` rouverte** (5 septembre) · `freshness` **8 sources, 0 en retard, 0 écart, 4 sans seuil par décision**, sortie 3, **remesuré le 5 septembre après le rechargement de `chantiers`** — `chantiers` était passé en retard le 4 (voir `docs/REPRISE-PIEGES.md`, le trou entre une cadence déclarée et sa première occurrence) · `eval` **sortie 3, zéro échec, 11 avertissements**, remesuré le 5 septembre 2026 après `w1-geometrie` (#68) — **42 invariants**, `I42` vert en 9,9 s, et les **onze** avertissements sont exactement ceux d'avant le ticket : le passage intermédiaire en portait 14, les trois de plus étant les rattachements que #68 déplace, regelés seuls avec leur cause. La dérive BODACC et SIRENE, elle, **n'a pas été regelée** — elle appartient à un autre ticket. Antérieurement remesuré après `w1-observabilite` — 41 invariants, dont les trois neufs au vert, et `porte:sabotage`/`eval:sabotage` **PASS en sept actes** · `prix_median_local_identifiable` mesuré à **163 587** (1,69 %), toujours en avertissement et chiffre publié inchangé à 160 000 ; rejoué le 5 septembre après le rechargement de `chantiers` — `I38` au vert en 0,0 s sur les 113 lignes neuves ; `prix_median_local_identifiable` est passé de 1,33 % à **1,69 %** d'écart brut, toujours en avertissement et **chiffre publié inchangé à 160 000** · `eval:anon` **PASS, 15 contrôles**, sortie 0, **rejoué le 6 septembre 2026** · `verify:mcp` **41 contrôles, 40 verts, 0 échec, 1 suspendu**, sortie 0, **rejoué deux fois le 6 septembre 2026**, même relevé les deux fois ; antérieurement **remesuré le 5 septembre 2026 après l'instrumentation du serveur MCP** (#72) — et **41 au vert, 0 suspendu** une heure plus tôt le même jour, un miroir Overpass allant et venant dans la journée : la différence est amont, pas dans le dépôt (39/2 plus tôt le même jour : un miroir Overpass est revenu) · `porte:sabotage` **PASS, sept actes** (6 septembre) — le septième rejoue le 5 septembre : une migration posée et suivie par personne rougit, remise au suivi elle reverdit, et un corps modifié sous le même identifiant rougit aussi. **Le chiffre de quatre était déjà faux le 5** : `w1-catalogue` (#73) en avait posé un cinquième, et `#81` pose le sixième, sur l'échappement d'observabilité · `eval:sabotage` **PASS, six actes, neuf sabotages** (5 septembre) · `porte:publie` **PASS contre la production, sortie 0** (2 septembre) · `build` ✓ **remesuré le 5 septembre** : `index-z86I-NBQ.js`, `App-PPJJEVRR.js`, un avertissement de taille de chunk et rien d'autre. Ce n'est pas le relevé du 2 septembre (`index-DX8ZO1QB.js`, `App-uI7Bjffv.js`, `MapView-BiNyeJsQ.js`), et l'écart n'est pas attribuable à cette session — `w1-porte-lue` n'a touché que `scripts/` et la documentation. `build:dev` ✓ (2 septembre), non rejoué le 5 : aucune montée de `vite` entre les deux |

**Le passage du 3 septembre 2026 est le premier entièrement au vert** —
[`33753907840`](https://github.com/IvandeMurard/paris-compass/actions/runs/33753907840), 12:12 UTC :
**8 bras sur 10 au vert, « Décision requise : aucune »**, les deux autres en « changé sans
décision » (`freshness`, et `eval` avec ses 11 avertissements). C'est la mesure qui vaut, parce
qu'elle est prise sur un runner et non sur ce poste : elle valide le §33 — `verify:mcp` **41
contrôles, 39 au vert, 0 en échec** — que Windows ne pouvait pas éprouver, et le §34. Et
`porte:publie`, le dixième bras, y sort vert à sa première exécution planifiée.

**La porte tourne toute seule depuis le 31 août** — `.github/workflows/porte.yml`, tous les
jours à 07:29 UTC, **douze bras** depuis le 6 septembre 2026 : `typecheck`, `test`, `build`,
`build:dev`, `sessions:check`, `freshness`, `eval`, `eval:anon`, `verify:mcp`, `porte:publie`,
`catalogue`, `ledger`. Le onzième est le seul qui interroge les **producteurs** plutôt que le
produit ; il ne porte aucun secret, et c'est voulu — il doit voir ce qu'un tiers voit. Le
douzième est le seul qui recoupe le dépôt **par** le distant — `w1-ledger` (#82) — là où les onze
autres regardent l'un **ou** l'autre ; il coûte une requête sur 53 lignes, l'ordre de grandeur de
`freshness`. Un rouge ouvre une issue `porte-rouge` ; une panne amont
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

### Retrouver ou reprendre une session de travail — mesuré le 3 septembre 2026

**Les sessions du CLI sont locales. Elles n'apparaissent ni sur claude.ai ni dans Claude
Desktop.** Vérifié ce jour-là : `AppData\Roaming\Claude\claude-code-sessions\`, le dossier qui se
synchronise vers le web, ne contient qu'une entrée du 16 juin — rien des sessions de ce projet.
Chercher l'historique dans l'application est donc une impasse, et ce n'est pas une panne.

Il vit ici, un fichier par session :

```powershell
Get-ChildItem "$env:USERPROFILE\.claude\projects\C--Users-ivand\*.jsonl" |
  Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, Length, LastWriteTime
```

**Le piège du répertoire.** Le nom du dossier encode le répertoire courant de la session, pas le
dépôt. Les sessions de septembre 2026 sur Compass ont tourné depuis `C:\Users\ivand` — donc
`C--Users-ivand`, et **pas** `C--Users-ivand-Documents-GitHub-paris-compass`. `claude --resume`
ne propose que les sessions du répertoire d'où on le lance : lancé depuis le dépôt, il ne montrera
rien de celles-là.

```powershell
cd C:\Users\ivand
claude --resume 3556551b-2a6f-4216-bd93-2041f4d0f44a   # la session du 2-3 septembre 2026
claude --continue                                       # la plus récente, sans choisir
```

Drapeaux voisins, vérifiés au `--help` le 3 septembre : `--fork-session` reprend en créant un
identifiant neuf, ce qui laisse l'original intact ; `--remote-control [nom]` ouvre la session au
pilotage depuis l'application mobile ou web — **mais le poste doit rester allumé**, ce n'est pas
une synchronisation.

**Ce que la reprise ne rend pas.** Le contexte ancien est compacté au fil de la conversation :
reprendre une longue session donne le fil et les décisions, pas chaque message d'origine. Le
`.jsonl`, lui, garde tout — c'est la source si l'on cherche un détail précis. Et un
`--fork-session` sur une session de 3 Mo repart de la même compaction.

**La vraie continuité n'est pas la session, c'est le dépôt.** C'est la raison d'être de la règle
du prompt commun : *ce qui n'existe qu'au chat meurt avec la session*. Un chiffre remesuré va
dans le fichier qui le portait, un défaut dans `DIAGNOSTIC.md`, un piège dans
`docs/REPRISE-PIEGES.md`. Une session perdue ne doit coûter que du confort.

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
npm.cmd run eval      # 37 invariants, 24 baselines, 8 cas dorés — ~45 s en local, ~3 min sur le distant
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

**Une session, une branche, une proposition — et `main` refuse la poussée directe.** Tranché
par Ivan le 6 septembre 2026. C'est l'inverse de la décision du 27 août, et le renversement est
assumé.

Ce qui l'a déclenché : la protection de `main` existait, exigeait une proposition, et portait
`enforce_admins: false`. Le seul compte du dépôt étant administrateur, elle ne s'appliquait à
personne — elle avertissait à chaque poussée sans jamais rien bloquer. Un contrôle qui crie et
n'arrête rien est ce que ce dépôt refuse ailleurs ; il fallait donc le supprimer ou le rendre
vrai. Ivan a choisi de le rendre vrai.

**Aucune approbation n'est requise** : `required_approving_review_count` reste à 0, donc une
session ouvre sa proposition et la fusionne elle-même. C'est la trace qui est exigée, pas un
goulot — le dépôt n'a qu'un seul humain.

**Méthodologie : spec-kit en référence, pas en outil.** Le format de ticket existant —
`Pourquoi` / `Comment` / `Doctrine` / `Fait quand` — est déjà une spécification, avec des
critères falsifiables et une limite déclarée. Empiler l'arborescence de spec-kit par-dessus
aurait créé deux systèmes de spécification en parallèle, exactement le « deux backlogs qui
divergent » que le projet combat depuis le 23 août. Seule la discipline de proposition est
reprise, plus une **revue** pour les tickets qui la méritent : migration, `src/core/`,
invariant ou bras de porte, `P0`. Les cinq questions de la revue sont dans `docs/SESSIONS.md`,
et chacune vient d'un défaut que ce dépôt a payé.


**`compass_question_summary()` reste exécutable par `anon`.** Tranché par Ivan le
5 septembre 2026, sur `w1-observabilite` (#72).

La raison n'est pas celle qui avait été avancée. Retirer le `grant` ne coûte pas « une ligne
de migration » : **`I11` échoue dès qu'une fonction `compass_*` n'est pas exécutable par
`anon`**, sa population étant `compass\_%` sans exception. Le retirer passerait donc la porte
au rouge, et le vrai coût serait une migration *plus* un amendement à l'invariant qui encode
« aucun chiffre n'existe que côté privilégié ». C'est cher, et ce n'est pas réversible au sens
où on l'entendait.

Ce que la fonction expose le permet : un dénombrement par jour et par quartier, retenu sous
effectif 2 (`I41`), sans identité, sans session, sans ordre d'arrivée. Et le produit n'a aucun
trafic — la table est à zéro ligne.

Révisable si l'usage agrégé devenait une question commerciale, ce que `docs/PERIMETRE.md`
écarte aujourd'hui. Ce serait alors un ticket, pas une ligne.


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


**Un rouge se lit au démarrage d'une session, et la notification n'y est pour rien.** Tranché
le 5 septembre 2026 en fermant `w1-porte-lue`
([#77](https://github.com/IvandeMurard/paris-compass/issues/77)), et tranché **sur mesure** :
la piste d'un second canal — courrier, Slack, webhook — est écartée parce que l'API de GitHub
dit que la notification n'a jamais manqué. Le dépôt est `subscribed` depuis le 27 juin, le fil
d'inbox de `#74` existe, et le fil de `#78` était encore `unread` **après** que l'issue eut été
trouvée et fermée. Un canal de plus aurait multiplié l'endroit où personne ne lit.

- **La destination est le prompt de session**, parce que c'est là que quelqu'un se tient déjà :
  les deux rouges de septembre ont été traités pendant une session, aucun par sa notification.
  `npm.cmd run brief` joue `porte:etat` tout seul — au-delà d'un jour le rouge entre dans le
  prompt collé, en deçà il reste sur `stderr`. Aucune discipline n'est demandée.
- **L'escalade est rare et déclarée : paliers 2 et 7 jours, jamais quotidienne.** C'est la règle
  que `scripts/porte/signal.ts` s'était déjà donnée en refusant d'ouvrir une seconde issue,
  appliquée un cran plus haut au titre. Les paliers vivent une seule fois, dans
  `scripts/porte/etat.ts`, et `etat.test.ts` refuse une seconde copie : deux tables de seuils
  sont deux seuils.
- **Ce que ça ne rattrape pas, et c'est entier** : une semaine sans session reste une semaine
  sans lecteur. Une porte ne peut pas voir sa propre absence, et elle ne peut pas non plus se
  faire lire.


**Le journal classe des questions, et il n'a pas de colonne pour classer des gens.** Tranché le
5 septembre 2026 en fermant `w1-observabilite`
([#72](https://github.com/IvandeMurard/paris-compass/issues/72)). Quatre décisions, chacune avec
sa raison, parce qu'aucune ne se déduit du code.

- **Des dénombrements, pas des appels.** `question_tally` porte des seaux — (jour, surface,
  fonction ou outil, axe, tranche de rayon, millésime, quartier, issue) et un effectif — jamais
  une ligne par appel. Une table à une ligne par appel se recoud : deux lignes de la même heure,
  au même endroit, avec des identifiants consécutifs sont un parcours sans qu'aucune colonne ne
  nomme personne, et **la clé primaire aurait suffi** — un `bigserial` publie l'ordre d'arrivée,
  qui est la moitié d'un parcours. Il n'existe donc aucune ligne brute à rendre et rien à
  ordonner. **Ce que ça ne rattrape pas** : la co-occurrence reste visible. Un jour où deux seaux
  seulement portent `appels = 1`, un lecteur peut *conjecturer* une même personne ; il ne peut
  pas l'établir. C'est une limite du volume, pas du schéma, et elle est à son maximum
  aujourd'hui, où le trafic est nul.
- **La coordonnée est au QUARTIER, et c'est une clé étrangère.** Les trois choix étaient la
  coordonnée brute — c'est une adresse —, le tronçon — 25 094 pour Paris, soit une adresse à
  quelques portes près, et personne ne branchera une source parce qu'un tronçon est mal servi —
  et le quartier, 80 polygones, qui répond exactement à « quels quartiers sont demandés et mal
  servis ». La granularité n'est pas une politesse de l'écrivain : `quartier_code` **référence**
  `public.quartier(code)`, il n'existe aucune colonne capable de porter une latitude, et
  `compass_record_question` prend un point pour n'en garder qu'un quartier — **l'appelant ne
  peut pas demander plus fin, il n'y a ni paramètre ni colonne pour cela**. `I40` recense les
  colonnes contre une liste blanche et refuse le retrait de la clé étrangère : c'est ce qui fait
  qu'un rechargement ne peut pas réintroduire l'état fautif.
- **Le jour, pas l'heure.** L'heure aurait rendu la co-occurrence bien plus parlante et n'achète
  que la chronologie fine d'un incident — le tableau de bord que ce ticket diffère tant qu'il n'y
  a rien à nourrir.
- **La rétention est de 180 jours, et la purge vit dans l'écriture.** Six mois pour une raison qui
  tient au sujet : le journal sert à choisir la **prochaine source**, et un dénombrement ne dit
  « ce quartier est mal servi » que contre le corpus qui l'a mal servi. Huit sources sont arrivées
  entre le 25 août et le 5 septembre 2026 ; à ce rythme, un compte de plus de six mois est un
  compte sur un autre produit. `compass_record_question` purge en ouvrant un seau d'un jour neuf
  — donc une sauvegarde ancienne restaurée dans la table ne survit pas au premier appel qui suit,
  démontré. **Ce que ça ne rattrape pas** : la purge est mue par l'usage, et un journal qui cesse
  d'être écrit cesse d'être purgé. D'où `I39`, qui tourne dans la porte quotidienne et ne dépend
  de personne.

**L'écriture vit dans la base, et les deux exceptions sont nommées.** C'est `DIAGNOSTIC.md` §9 à
§12 transposé : une garde sur le chemin de l'écran ne protège que l'écran. Les fonctions
`compass_premises_within` et `compass_scoring_context_within` journalisent elles-mêmes, donc le
front, le serveur MCP **et l'agent qui appelle PostgREST en direct** sont comptés par la même
ligne de code. Deux faits échappent à la base et sont écrits par le serveur MCP, faute d'autre
producteur possible : le **nom de l'outil** — la base voit `compass_scoring_context_within`, pas
`score_location` — et une **source tierce injoignable**, puisqu'un appel Overpass qui échoue
n'atteint jamais la base. Le front fait les mêmes appels Overpass et n'est pas instrumenté : un
axe `n/a` faute de miroir, côté navigateur, ne laisse aucune trace. C'est la direction du 31 août
— back-end, données et MCP avant le front — et c'est écrit plutôt que tu.

**Un motif d'échec est structuré, jamais relu dans un message.** `LayerUnavailable`
(`mcp-server/src/context.ts`) porte son `motif` depuis l'endroit exact où la cause est connue.
Classer « retenue de licence », « hors corpus » et « source injoignable » par un `includes()` sur
une phrase anglaise aurait suspendu le journal à une reformulation — ce que
[`#61`](https://github.com/IvandeMurard/paris-compass/issues/61) a déjà refusé pour les pannes
amont. Les trois ne mènent pas à la même action : un courrier à l'APUR, une source hors Paris, un
miroir.

**L'agrégat est lisible publiquement, et il ne devient jamais un chiffre.** `docs/PERIMETRE.md`
écarte déjà de *revendre* l'usage agrégé et interdit qu'un fait appris de l'usage s'affiche —
il n'a pas de source publique, donc la règle `Measured<T>` le sort de l'écran. Ce qui est livré
ici est un signal de priorisation : il décide **ce qu'on branche ensuite**, jamais ce qu'un
visiteur voit ni dans quel ordre. Le `grant` à `anon` est la moitié réversible de la décision —
il se retire en une ligne sans toucher au schéma, l'inverse n'est pas vrai.

**Ce que le journal ne mesure pas, et c'est entier** : un axe jamais demandé parce que le produit
ne le propose pas ne laisse aucune trace. Il mesure la **demande exprimée**, pas la demande
empêchée. Et il n'y a aucun trafic : ce chantier livre le tuyau, il ne produira aucun signal tant
que personne n'utilisera le produit — ce qui est le but, un tuyau posé après l'usage perd les
premières semaines.


**Le ledger est la mesure, le dépôt est la prose, et le douzième bras recoupe l'un par
l'autre.** Tranché le 6 septembre 2026 en fermant `w1-ledger`
([#82](https://github.com/IvandeMurard/paris-compass/issues/82)). Cinquième application de
« énumérer, pas lister », après les scripts (`#71`), les sources d'ingestion (`#70`), le
catalogue (`#73`) et les appelants de PostgREST (`#81`) — et la première dont la population vit
**sur le distant**.

- **`supabase/migrations/` décrit un schéma, il ne le constate pas.** C'est la règle de
  `CLAUDE.md` — *une documentation n'est pas une mesure* — appliquée au schéma lui-même. Onze
  bras regardaient le dépôt **ou** le distant ; aucun ne les comparait, et le 5 septembre le
  distant a porté vingt-quatre heures un schéma que le dépôt ignorait sans qu'un seul puisse le
  voir. La mesure qui l'a trouvé a été faite à la main, le lendemain.
- **Suivies par git, jamais celles du disque, et la nuance EST le défaut.** Le fichier était là
  le 5 septembre ; il n'était pas suivi. Une règle qui aurait lu le répertoire aurait été verte
  tout du long, sur le seul incident pour lequel elle existe.
- **Les deux sens ne s'additionnent pas.** Une migration au ledger et pas au dépôt est un schéma
  que personne ne peut reconstruire : sortie **1**. Une migration au dépôt et pas au ledger est
  du travail écrit et pas encore posé — l'état normal d'une session en vol : sortie **3**. Les
  compter ensemble aurait réclamé une décision sur la moitié qui n'en demande aucune.
- **La comparaison va au-delà des identifiants, et c'était conditionnel à une mesure.** Le ticket
  demandait de vérifier avant de promettre. `schema_migrations` porte `statements text[]` : le
  texte appliqué est là, 53 lignes sur 53, et **51 corps sont identiques caractère pour
  caractère**. C'est la moitié que `_cmp-fn.ts` avait emportée en étant supprimé le 26 août —
  *un contrôle supprimé parce qu'il était jetable n'a pas rendu son besoin jetable*.
- **Une divergence consignée porte ses deux empreintes, et c'est ce qui l'empêche d'être une
  excuse à vie.** Le ledger est de l'histoire : un fichier réécrit après son application diverge
  **pour toujours**, et aucune migration ne peut réparer une ligne du passé. Un rouge permanent
  serait l'alerte qu'on finit par couper. Donc la divergence se consigne dans
  `scripts/porte/ledger.json` avec sa raison **et** l'empreinte de chaque côté : la raison couvre
  un état mesuré et pas un autre, et le jour où l'un des deux rebouge, l'entrée cesse de
  correspondre et le bras rougit en disant lequel. `arms.ts`, `catalogue.json` et
  `observabilite.json` avaient appris le sens *orphelin* ; celle-ci ajoute le sens *périmé*.

**Ce que ça ne rattrape pas, et c'est une limite du ledger, pas du contrôle** : un schéma modifié
**à la main** sur le distant — un `create index` tapé dans l'éditeur SQL, une colonne retirée —
ne laisse aucune trace au ledger, et ce bras ne le verra jamais. C'est ce qui fait de
`docs/REPRISE-PIEGES.md` — *ne pas contourner un refus de `supabase db push` en appliquant le SQL
à la main* — une règle plutôt qu'une préférence. Ce qui attrape une modification manuelle est le
reste du protocole : les invariants d'`eval` lisent le catalogue vivant — `I42` énumère les
colonnes géographiques depuis `pg_attribute` — donc une table née hors migration y entre en
rouge. Trois limites plus étroites : la comparaison est aveugle aux espaces et à la place des
points-virgules (mesuré, `docs/REPRISE-PIEGES.md`) ; une ligne du ledger sans `statements` n'est
comparée que par son identifiant, et elle le dit au lieu de passer ; et un fichier réécrit avec
le **même** corps normalisé est indiscernable d'un fichier jamais touché, ce qui est la bonne
réponse.


**Un appelant de PostgREST déclare l'échappement d'observabilité, ou écrit pourquoi il est
compté.** Tranché le 6 septembre 2026 en fermant `w1-observabilite-echappement`
([#81](https://github.com/IvandeMurard/paris-compass/issues/81)). Quatrième application de
« énumérer, pas lister », après les scripts (`#71`), les sources d'ingestion (`#70`) et le
catalogue (`#73`) — et la première dont la population est un ensemble de **fichiers**.

- **Le rapport de `#72` était vrai à l'exécution et faux à la déclaration, et c'est tout le
  ticket.** « Un appel non journalisé ne laisse par définition aucune trace, donc aucun invariant
  ne peut voir cette absence » : exact pour l'écriture, et c'est là que le raisonnement s'arrêtait
  trop tôt. Le fichier qui appelle PostgREST est sur le disque, et il porte ou ne porte pas
  l'échappement. `scripts/porte/observabilite.ts` énumère, `scripts/porte/observabilite.test.ts`
  fait échouer `test`, l'acte 6 de `porte:sabotage` le démontre dans les deux sens.
- **La population est de quatre fichiers, dérivée et non tenue à la main** — mesurée le
  6 septembre 2026. Deux posent l'échappement : `scripts/eval/anon-http.ts` et
  `mcp-server/src/supabase.ts`. Deux portent une raison écrite dans
  `scripts/porte/observabilite.json` : `src/integrations/supabase/client.ts`, qui **est** le
  produit et doit être compté — c'est la raison d'être du journal —, et la fonction edge
  `send-property-notification`, qui porte la clé de service et ne touche aucune fonction
  `compass_*`.
- **Une raison écrite ne range pas ce qui dérange.** Un bras de la porte qui atteint PostgREST
  n'a pas sa place dans ce fichier : sa place est de poser l'en-tête. Les deux seules raisons
  légitimes sont « c'est le produit » et « le journal ne le voit de toute façon jamais ».

**Ce que la règle ne rattrape pas, et il faut le nommer** : elle vérifie qu'un fichier
**déclare** l'échappement, jamais qu'il l'**applique** à chaque appel — un fichier qui poserait
l'en-tête sur un client et pas sur un second passerait, et c'est pourquoi le commentaire de
`anon-http.ts` insiste sur l'endroit unique par lequel ce bras passe. Un appel émis depuis
ailleurs que le dépôt — un `curl`, un test à la main — n'est vu par rien. Un appelant qui
atteindrait PostgREST par une troisième voie, `postgrest-js` seul ou un chemin assemblé par
concaténation, n'est reconnu par aucun des deux signes. Et l'échappement lui-même reste
**déclaratif** : n'importe qui peut le poser et sortir du dénombrement, ce qui est sans
conséquence et reste le prix d'une règle qui ne peut pas reconnaître ses propres appels sans
pister.


**Une source du catalogue est vérifiée, ou porte une raison écrite de ne pas l'être.**
Tranché le 5 septembre 2026 en fermant `w1-catalogue`
([#73](https://github.com/IvandeMurard/paris-compass/issues/73)). Troisième application de
« énumérer, pas lister », après les scripts (`#71`) et les sources d'ingestion (`#70`), et la
première dont la population vit dans de la **prose** : le tableau « Catalogue des sources » de
`docs/PLAN-ACTION-VACANCE.md`, **trente-cinq lignes** — le ticket en annonçait trente.

- **VÉRIFIER et TESTER sont deux protocoles, et l'ordre compte.** Vérifier, c'est demander à
  la source si elle répond encore et déclare encore la licence qu'on a consignée : c'est
  `npm.cmd run catalogue`, onze sondes, aucune base. Tester, c'est demander si ce qu'on reçoit
  veut encore dire ce qu'on en a mappé : c'est un invariant, et il ne peut vivre qu'au contact
  des données — `I22` pour le pont NAF depuis le 25 août, `I38` pour la table de codes des
  chantiers depuis ce jour-là.
- **Un refus n'est pas interrogé.** `refusée` et `écartée` sortent de la population : demander
  chaque matin à SeLoger si ses CGU interdisent toujours la réutilisation est une alerte qui ne
  peut jamais dire autre chose, et ce dépôt a déjà tranché sur ce qu'il advient de celles-là.
- **Un champ de licence vide ne confirme rien.** Deux des trois sources ingérées ne publient
  aucune licence là où le produit les lit — `copyrightText` vide chez l'APUR, `license: null`
  chez BODACC, mesurés le 5 septembre 2026. `licence-attendue: null` n'est donc légal
  qu'accompagné d'une phrase disant d'où vient alors la licence. Détail dans
  `docs/REPRISE-PIEGES.md`.
- **Le compte rendu n'est pas redéfini.** `scripts/porte/report.ts` l'a écrit une fois pour
  `#71` ; le catalogue le réutilise, titre changé. Trois lignes quand tout va bien — démontré
  dans les deux états le 5 septembre, dont un provoqué.

**Ce que la règle ne rattrape pas, et il faut le nommer** : une source qui répond, sous la
bonne licence, avec les bonnes colonnes, et dont le **contenu** est faux. La vérification porte
sur la forme et la déclaration. Trois des onze sondes ne vérifient qu'une joignabilité, faute
d'un champ de licence à l'endpoint, et elles le disent. Et `I38` n'attrape pas un code qui
existe en changeant de sens — la même limite que `I22`, qui est celle de toute règle qui ne
remplace pas d'avoir lu.


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
- **Deux cadences n'ont volontairement aucun seuil.** Tranché par Ivan le même jour, contre
  les 400 jours qu'elles ont portés quelques heures : plus d'un an n'est pas un seuil, c'est
  un nombre qui se déclenche après le moment où l'on pouvait agir. `rare` et `triennial` sont
  des cadences de **vérification** ; ce qui les surveille réellement est `bodacc`, parce que
  **les huit crons vivent dans un seul fichier** et que le risque qu'elles courent — GitHub
  désactivant les workflows planifiés d'un dépôt calme depuis 60 jours — désactive ce fichier
  en entier. Une absence de seuil **écrite** n'est pas un `?? null` : c'est la distinction que
  `DIAGNOSTIC.md` §31 a coûté, et une source sans seuil est rendue `sans seuil`, jamais
  « à jour ».

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

**On pousse sur `main` sans passer par une PR, pour l'instant.** Décidé par Ivan le 2 septembre
2026, après trois passages en force signalés. GitHub porte une règle « Changes must be made
through a pull request » sur `main` ; les droits d'administration la contournent, et le message
`Bypassed rule violations` apparaît à chaque poussée. **Ce n'est pas un incident, c'est la
décision** — l'écrire ici évite qu'une session suivante le lise comme une dérive à corriger.

*Pourquoi elle tient.* La machinerie du dépôt suppose des poussées directes : `sessions:check`
recoupe la table committée à l'état GitHub, donc fermer une issue en laissant la table dans une
PR non fusionnée met la porte au rouge le lendemain matin pour rien. Et `docs/SESSIONS.md` dit
« pousser à la fin de chaque session, toujours ».

*Ce que ça coûte, et qu'il faut savoir avant de changer d'avis.* Aucune relecture avant `main`,
et le seul filet est la porte planifiée — qui juge après coup, une fois par jour. Le jour où
quelqu'un d'autre écrit dans ce dépôt, cette décision est à reprendre.


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

7. **Vérifier le premier build Lovable après la montée du 16 août.** Hors file
   d'attente : ce n'est pas un chantier, c'est un contrôle à faire **une fois**,
   puis à rayer.

   **Deux tiers faits le 2 septembre 2026 ; le dernier ne peut pas l'être d'ici.**
   Lovable a été ouvert — cinq commits sont arrivés sur `origin/main`. Donc *son build
   termine* : il a produit et publié `index-DZV_6s4n.js`, récupéré et lu depuis ce poste.
   Et *l'aperçu s'affiche* de son côté, puisque c'est la comparaison aperçu / page publiée
   qui lui a fait voir la panne (`.lovable/plan.md`). Reste le troisième point, que seul
   quelqu'un devant leur éditeur peut voir : **la sélection d'un composant dans l'éditeur
   visuel** — le seul symptôme qui signerait `lovable-tagger` 1.1.7 → 1.3.3.

   *Ne pas confondre les deux pannes.* L'écran blanc du 2 septembre n'a rien à voir avec
   cette montée : c'était `.env` ignoré par git, `DIAGNOSTIC.md` §32. Un `git revert` de
   la montée n'y aurait rien changé, et l'aurait fait chercher au mauvais endroit.

   *Il n'y a pas d'échéance*, contrairement à ce que ce point disait — précisé par Ivan
   le 31 août, voir `docs/SESSIONS.md`. La date du 1er septembre était fausse.

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

Ne pas ajouter une source au catalogue de `docs/PLAN-ACTION-VACANCE.md` sans la vérifier ni
écrire pourquoi elle ne l'est pas. Depuis le 5 septembre 2026, `npm.cmd run test` échoue tant
qu'une ligne de ce tableau n'a ni entrée dans `verifications` de `scripts/porte/catalogue.json`,
ni raison dans `sans-verification`. Et ne pas épingler la **page** d'un portail à la place de
son endpoint : recouper une page par une autre page ne recoupe rien, c'est la règle de
`CLAUDE.md` et le test la tient. `#73`.

Ne pas ajouter un script à `package.json` sans le classer. `npm.cmd run test` échoue tant qu'un
script n'est ni joué par un workflow qui porte un `on.schedule`, ni nommé dans
`scripts/porte/cadence.json` avec une **raison écrite**. C'est voulu, et c'est le trou de `#70`
un cran plus haut : six bras en six mois dont un que personne ne lance. Une raison qui se
résume à « pas besoin » est le début de la complaisance que `#71` refuse.

Ne pas atteindre PostgREST depuis un fichier du dépôt sans dire s'il doit être compté. Depuis le
6 septembre 2026, `npm.cmd run test` échoue tant qu'un fichier qui construit un client Supabase
ou nomme `/rest/v1/` ne pose ni `x-compass-observabilite: off` / `COMPASS_OBSERVABILITE`, ni une
raison écrite dans `sans-echappement` de `scripts/porte/observabilite.json`. Et **un brouillon de
session compte** : `.gitignore` ignore `scripts/tmp-*.ts`, la règle balaie quand même les
fichiers ignorés présents sous les répertoires de code, parce qu'un brouillon qui pollue
`question_tally` la pollue que git le suive ou non — mesuré le 6 septembre, la sonde du
contre-test était invisible sous ce nom-là et rouge sous un autre (`docs/REPRISE-PIEGES.md`).
`#81`.

Ne pas réécrire une migration déjà posée, même sans toucher au SQL. Une migration appliquée est
un fait daté, pas un document qu'on entretient : le ledger garde le texte du jour où elle est
passée, et le fichier réécrit diverge de lui **pour toujours** — aucune migration future ne peut
corriger une ligne du passé. C'est arrivé le 25 août 2026, par `89aa8ac`, sur `20260825000002` et
`20260825000003`, pour la meilleure des raisons — repasser en anglais des commentaires écrits en
français, ce que `CLAUDE.md` demande — et le distant porte depuis deux commentaires de catalogue
que le dépôt n'annonce plus. Trouvé le 6 septembre 2026 par le douzième bras, et pas avant :
`DIAGNOSTIC.md` §39. Si une migration posée dit quelque chose de faux, la sortie est une
**migration de plus**, jamais une réécriture de l'ancienne. Et si la réécriture a déjà eu lieu,
la consigner dans `corps-diverge` de `scripts/porte/ledger.json` avec ses deux empreintes — sans
quoi `npm.cmd run ledger` rougit chaque matin sur un fait du passé. `#82`.

Ne pas répondre à « personne n'a lu l'alerte » en ajoutant un canal. Mesuré le 5 septembre
2026 : la notification GitHub arrivait, et elle n'était pas lue — le fil d'inbox de `#78` était
encore `unread` après que l'issue eut été trouvée **et fermée**. Un courrier, un Slack ou un
webhook de plus ajoute une dépendance et un secret pour multiplier l'endroit où personne ne
lit. La réponse est de faire tomber l'alerte là où quelqu'un se tient déjà — le prompt de
session, `npm.cmd run brief`, qui joue `porte:etat` — et de ne jamais escalader plus souvent
qu'aux paliers déclarés dans `scripts/porte/etat.ts`. Une alerte quotidienne sur onze bras est
du bruit en trois semaines, et le bruit est comment un contrôle finit désactivé. `#77`.

Ne pas forcer `enable_nestloop = off` sur les fonctions de rayon, ni globalement ni
sur les quatre sans distinction de rayon : le hachage vaut −81 % de pages à 2 000 m
mais **dix-huit fois pire à 50 m**, alors que le rayon par défaut du produit est 800 m
et que `find_premises` plafonne à 500 m. Le levier ne sait pas dépendre du rayon.
`#65`, `DIAGNOSTIC.md` § 29.

Ne pas remplacer `ST_DWithin(g, point, d)` par `g && _ST_Expand(point, d) and
ST_Distance(g, point) <= d`, malgré la documentation qui les donne pour équivalentes.
**Le contre-exemple qui fondait cette ligne a été retiré le 5 septembre 2026** : les
quinze locaux à `POINT(NaN NaN)`, qui passaient la seconde forme à tous les rayons et
à tous les points jusqu'à 1 m, n'existent plus, et `premise_location_geom_fini` avec
`I42` interdisent qu'il en revienne — `DIAGNOSTIC.md` § 38. **Ce qui reste de
l'interdiction** : la mesure de plan de `#65` (§ 29), et le fait que l'équivalence des
deux formes deviendrait alors une propriété du SCHÉMA et non de la fonction — elle
tiendrait tant que la contrainte tient, ce qui est une dépendance qu'aucun commentaire
au point d'appel ne dirait.
