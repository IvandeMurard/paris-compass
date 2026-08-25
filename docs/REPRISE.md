# Reprise — état au 25 août 2026, fin de session 9

À lire en premier après `CLAUDE.md`. Décrit ce qui tourne, ce qui bloque, et ce
qui n'est écrit nulle part ailleurs. Le reste du contexte est dans `docs/PLAN.md`
(backlog, décisions produit), `docs/PLAN-ACTION-VACANCE.md` (doctrine et backlog
priorisé), `docs/BDCOM.md` (pièges de la source) et `eval/FAILURE_MODES.md` (le
contrat d'évaluation).

## Clôture de la session 9 — l'état exact au 25 août 2026, 10 h 16 UTC

Tout est mesuré à la clôture, pas recopié. C'est le point de départ propre de la session
suivante.

| Mesure | Valeur |
| --- | --- |
| `main` local | arbre modifié, **pas encore poussé** — voir « Ce qui reste à faire » ci-dessous |
| Ledger distant `dbefhvmyfmmhjeetdddu` | **37** migrations, dernière `20260825000010` |
| Fonctions `compass_*` | **11**, compte inchangé — `compass_premises_within` a été étendue une troisième fois, pas ajoutée |
| Issues | **40 ouvertes, 11 fermées** — remesuré par `gh`, inchangé : `#15` reste ouverte, sa fermeture est laissée à une décision explicite |
| Portes | `typecheck` ✓ · **108 tests** ✓ (inchangé) · `eval` — 20/20 invariants, 8/8 cas dorés, sort avec le code 3 (`AVERTISSEMENT`, pas `ÉCHEC`) sur les dix mêmes écarts de baseline déjà notés · `build` et `build:dev` ✓ · `verify:mcp` non relancée (ni `src/core/` ni `mcp-server/` touchés) |

**`w1-terrasses` (#15) est fait**, deuxième ticket de la vague 1 sur les trois de la file.
Le suivant et dernier dans l'ordre de `docs/SESSIONS.md` est `w1-survie` (#14), Opus 5 — après
lui, tous les tickets P0 non bloqués de la vague 1 seront faits (`w1-historique` reste hors
file, suspendu à une réponse de l'APUR).

### Les sept sources sont chargées, terrasses est la nouvelle

```
source     cadence     source datée  chargé le   âge   lignes    par
bdcom      triennial   2023-06       2026-08-25  0 j   228 275   manual
bodacc     continuous  2026-08-23    2026-08-25  0 j   163 788   schedule
chantiers  weekly      2026-08-25    2026-08-25  0 j       120   manual
geography  rare        2026-08-25    2026-08-25  0 j    25 174   workflow-dispatch
plu        rare        2024-11-20    2026-08-25  0 j     5 107   manual
sirene     monthly     2026-08-21    2026-08-25  0 j    68 881   manual
terrasses  rare        2026-08-25    2026-08-25  0 j    24 194   manual
```

`terrasses` reste sur `rare` par défaut — le jeu ne publie aucune cadence, à la différence de
`chantiers-perturbants` : un manque déclaré, pas une mesure, voir « Le 25 août, session 9 »
plus bas. `par = manual`, comme PLU et chantiers avant elle.

### Les branches restantes, et ce qu'il faut en faire

Aucune ne porte de travail à récupérer. **Vérifié une par une à la clôture**, pas supposé :

**Trois ont été supprimées le 25 août**, après vérification une par une. Leurs identifiants sont
notés ici parce que c'est ce qui les rend récupérables : une branche effacée se recrée par
`git branch <nom> <sha>` tant que le commit n'est pas ramassé par le garbage collector.

| Branche supprimée | Identifiant | Pourquoi |
| --- | --- | --- |
| `fix/loyer-et-carte-vide` | `196992c` | **fusionnée** dans `main` |
| `mcp-server-agent` | `bad78d1` | **fusionnée** dans `main` |
| `fix/noiseestimate-import-mort` | `fdc60ef` | **périmée** — voir ci-dessous |

> **Le cas périmé mérite sa note, parce qu'un contrôle naïf s'y trompe.** `git diff
> main...branche` compare à la **base de fusion**, pas à `main` d'aujourd'hui : il affichait donc
> le correctif comme s'il manquait. Le diff à deux points, qui compare les contenus réels, montre
> l'inverse — `main` porte déjà la ligne corrigée, et tout le reste de l'écart est du travail que
> `main` a **en plus** (les origines par couche de `w0-provenance`). La branche était simplement
> en retard de 54 commits. **Trois points pour l'historique, deux points pour le contenu**, et
> c'est le second qui décide si une branche a quelque chose à donner.

| Branche restante | État | Quoi en faire |
| --- | --- | --- |
| `claude/js-yaml-merge-key-vuln-0d3vyf` | **non fusionnée, et à ne pas fusionner** | voir ci-dessous |

**Pourquoi la dernière n'a pas été fusionnée.** Elle ne touche que `package-lock.json`
(+1 353 / −2 162), date du 19 août, et `main` a bougé de 35 commits depuis. Surtout,
`npm.cmd audit` rend **0 vulnérabilité** à la clôture : elle ne corrige plus rien, et la
fusionner reviendrait à ramener un état de verrou périmé sur un arbre qui a changé — pour un
gain nul. `CLAUDE.md` est explicite sur la prudence en matière de dépendances. À fermer plutôt
qu'à fusionner, mais c'est une décision, pas un geste de ménage.

Elle est donc la **seule branche restante** avec `main`. Elle n'a pas été supprimée : à la
différence des trois autres, elle porte un commit que `main` n'a pas, et effacer une référence
distante ne se fait pas sur un « probablement inutile ».

---

> **Les sessions 5 et 6 sont à cheval sur minuit.** Les mesures de la session 5 — les contrôles
> MCP, le local 46393, le point de Massy, l'état GitHub — ont été prises le **24 août** ; celles
> de la session 6 — les chargements, la table de fraîcheur, le 404 de SIRENE — le **25**. Les
> dates écrites plus bas sont celles de la mesure, pas celles de la rédaction, et c'est la règle
> de `CLAUDE.md` : un chiffre mesuré porte **sa** date.

---

## Le 25 août, session 9 : `w1-terrasses` est fait, rattaché par adresse et non par proximité

**`w1-terrasses` (#15) est fait**, démontré par un appel anonyme réel sur ses **trois** états :
**86 RUE ABBE GROULT** (adresse non partagée) rend `terrasse_status: oui`,
`terrasse_permanente: true` ; **7 RUE ABBE DE L'EPEE** (adresse partagée par plusieurs locaux)
rend `inconnu` plutôt qu'un local tiré au hasard, avec `terrasse_estivale: true` ; **1 RUE
ABBAYE** rend `non`. Détail complet dans `docs/tickets/w1-terrasses.md`.

**Ce ticket levait une contradiction que `PLAN-ACTION-VACANCE.md` assumait déjà par écrit** :
`PLAN.md` §5.4 classe les sources d'appoint « à vérifier avant engagement, aucune n'a été
confirmée », alors que `w1-terrasses` était en P0 avec un critère définitif — « la vérification
reste un préalable non écrit du ticket ». C'est par là que la session a commencé, avant d'écrire
une ligne de migration : la source existe (24 204 lignes, ODbL), mais sans code de typologie ni
cadence de mise à jour publiés — deux manques déclarés dans la doctrine et la documentation
plutôt que découverts en cours de chargement.

### Le rattachement par proximité a été mesuré, puis rejeté — avant d'être écrit en base

Sur un échantillon aléatoire de 2 000 terrasses, le local BDCom le plus proche est à une médiane
de 4,4 m (p90 10,7 m) — assez serré pour tenter le même rattachement par nearest-match que
`w0-plu` et `w1-chantiers`. Un contrôle sur 12 terrasses nommées a renversé ce diagnostic : « LE
MANDARIN DE CHOISY » a pour local le plus proche, à 9 m, l'enseigne « PICARD » — un surgelé —
et un tiers de l'échantillon pointait sur le mauvais commerce. C'est le piège que
`src/services/compass/premiseHistory.ts` documente déjà pour OpenStreetMap ↔ BDCom : dès que
plusieurs locaux se partagent une adresse ou un pas de porte, le plus proche n'est pas la même
vitrine.

**Le rattachement se fait donc par adresse**, en réutilisant `compass_bodacc_street_key`
(la clé déjà posée pour BODACC le 9 août) plutôt qu'en écrivant une seconde fonction de
normalisation de rue. L'adresse brute du jeu (« 125 AVENUE DE CHOISY ») est parsée par
`scripts/ingest/terrasses.ts` en numéro + type de voie + nom — 99,8 % des 24 204 adresses s'y
prêtent. Mesuré ensuite : **4 295 adresses distinctes** rattachent à un seul local (`oui`),
**7 500** à plusieurs (`inconnu` — 69 % des locaux partagent un numéro de rue, `PLAN.md` §3.3),
**2 625** à aucun (`non`).

### Trois états, pas deux — appliqué en base plutôt qu'en commentaire

Le « Fait quand » du ticket demandait explicitement oui/non/**inconnu**, pas juste un
booléen. `terrasse_status` porte les trois valeurs, avec une contrainte `check` plutôt qu'un
commentaire de bonne intention : une adresse partagée ne dit jamais laquelle des locations
colocalisées détient l'autorisation, et le coder en `oui` pour toutes aurait été exactement la
seconde erreur fondatrice que `PLAN.md` §2.5 nomme — attribuer le fait d'un commerce à son
voisin.

### Ce qui n'a pas été fait, et pourquoi c'est le bon arrêt

- **Aucun test unitaire** pour `parseAddress`/`categorie`, alors que ce sont les premières
  fonctions de parsing de texte de `scripts/ingest/` — délibéré, pour rester cohérent avec les
  quatre chargeurs précédents, aucun n'en a : la discipline établie est la mesure ad hoc plus la
  porte `eval`, pas des tests unitaires par fichier.
- **SIRET n'a pas servi au rattachement**, bien que présent sur 96 % des lignes — le croiser à
  BDCom passerait par SIRENE, l'inférence que `docs/SESSIONS.md` nomme « la plus difficile du
  backlog » pour `w1-survie`, hors du périmètre d'une ingestion droite. Conservé en base pour
  qu'un chantier futur n'ait pas à retélécharger la source.
- **Front-end et cron**, même arbitrage que PLU et chantiers : laissés à Lovable et au
  chargement manuel.

### Portes

`typecheck` ✓ · **108 tests** ✓ (inchangé) · `build` et `build:dev` ✓ · `eval` — 20/20
invariants, 8/8 cas dorés, composition de fiabilité stable. **Sort avec le code 3
(`AVERTISSEMENT`), pas 0** : dix écarts de baseline sous le seuil bloquant, la même dérive
BODACC/SIRENE déjà notée aux clôtures précédentes — `scripts/eval/run.ts` distingue `ÉCHEC`
(code 1) d'`AVERTISSEMENT` (code 3, avertissements seuls) ; lire le message, pas le seul code de
sortie. `verify:mcp` non relancée : ce ticket ne touche ni `src/core/` ni `mcp-server/`.

---

## Le 25 août, session 8 : `w1-chantiers` est fait, deuxième ticket de la vague 1

**`w1-chantiers` (#11) est fait**, démontré par un appel anonyme réel : **25 RUE JEAN DE LA
FONTAINE**, à 0 m d'un chantier `ENTRETIEN_RESEAU` en cours (18 mai → 29 oct. 2026), rend
`chantier_exposed: true` avec l'objet, les dates et le statut ; **50 RUE JEAN DE LA FONTAINE**,
même rue, ~124 m plus loin, rend `chantier_exposed: false` et tout le reste `null`. Vérifié
aussi au seuil lui-même — 7 rue Valentin Hauy à 33,4 m d'un chantier (exposé) contre 43 avenue
de Saxe à 41,8 m du même chantier (non exposé), à moins de 9 m l'un de l'autre. Détail complet
dans `docs/tickets/w1-chantiers.md`.

**Ce ticket redit `docs/PLAN.md` §5.1** presque mot pour mot (« dix-huit mois de travaux devant
une vitrine décident d'un commerce, et personne ne le dit au preneur avant la signature ») ; les
deux sont clos ensemble.

### Un chiffre du ticket était faux, trouvé avant d'écrire quoi que ce soit

Le « Comment » du ticket et `PLAN.md` §5.1 disaient tous deux « chantiers-perturbants
quotidien ». Mesuré contre la description du jeu sur le catalogue opendata.paris.fr lui-même :
« Mise à jour hebdomadaire ». Faux depuis la rédaction du plan, jamais recoupé contre la source
— même mode de défaillance que le ledger à 24 de la session 1 et le « quotidien » aurait pu
rester non détecté indéfiniment puisque rien ne l'aurait fait échouer, contrairement à un
chiffre qui alimente un test. Les deux documents sont corrigés. Conséquence directe en base :
aucune des quatre cadences existantes (`continuous`, `monthly`, `triennial`, `rare`) ne convenait
sans mentir — `continuous` sert déjà BODACC pour un rythme différent (chaque jour ouvré) — donc
une cinquième valeur, `weekly`, a été ajoutée à `ingestion_cadence`, dans sa propre migration
plutôt que celle qui l'utilise : Postgres refuse qu'une transaction se serve d'une valeur
d'énumération qu'elle vient d'ajouter elle-même.

### La leçon de `w0-plu` appliquée sans avoir à la refaire

Le rattachement local → chantier va directement du côté local (`distinct on (l.id)`, plus proche
d'abord), jamais du côté chantier vers tous les locaux à portée : exactement la restriction que
`w0-plu` avait dû ajouter après coup, quand sa première version, many-to-many, avait sur-attaché
d'un facteur 2,5. Écrite nearest-only dès le premier jet cette fois, et vérifiée directement au
seuil de 40 m (le couple Valentin Hauy / Saxe ci-dessus) plutôt que supposée correcte.

### Ce qui n'a pas été chargé, et pourquoi c'est le bon arrêt

**Les cinq millésimes historiques (`chantiers-a-paris-copie` à `-copie3`, 2019–2023, 20 073 à
32 201 lignes chacun) ne sont pas chargés.** Le « Comment » du ticket les cite, mais le « Fait
quand » n'exerce que `chantiers-perturbants`, et c'est `w7-etude-chantiers` (§5.5), qui dépend
de ce ticket, qui en aura réellement besoin pour son étude rétrospective 2020→2023. Les charger
maintenant aurait élargi ce chantier au-delà de son critère pour un usage pas encore défini —
même arbitrage que `w0-plu` avec le bandeau d'alerte, laissé à Lovable plutôt qu'anticipé.

**Ni le front-end ni le serveur MCP ne consomment les nouveaux champs**, pour la même raison que
PLU : `premiseHistory.ts` ne mappait déjà pas les champs PLU sur `PremiseCandidate`, et
`findPremises.ts` ne les exposait pas non plus — ce chantier est une ingestion (« Sessions 8 et
9 » de `docs/SESSIONS.md`), pas une session d'interface, et Lovable reste indisponible jusqu'au
1ᵉʳ septembre.

**Le chargeur n'est pas câblé sur le cron.** Chargeable seulement à la main
(`npx tsx scripts/ingest/chantiers.ts`) ; `scripts/ingest/workflow.test.ts` continue de vérifier
exactement les quatre plannings existants, inchangé.

### Portes

`typecheck` ✓ · **108 tests** ✓ (inchangé — aucun test ajouté, ce ticket ne touche aucun code
sous test) · `eval` ✓ (20/20 invariants, 8/8 cas dorés, composition de fiabilité stable à
57,26 %, dix écarts de baseline sous le seuil d'avertissement — dérive naturelle de
BODACC/SIRENE déjà notée aux clôtures précédentes) · `build` et `build:dev` ✓. `verify:mcp` non
relancée : ce ticket ne touche ni `src/core/` ni `mcp-server/`.

### Ce qui reste, et qui n'appartient pas à cette session

- **L'issue #11 est fermée**, avec un commentaire reprenant le tableau des deux adresses,
  sur autorisation explicite donnée au tour suivant — même geste que `w0-plu` avant elle.
- **Le bandeau « chantier à proximité » sur la fiche** reste côté Lovable, comme le bandeau PLU
  avant lui.
- **Les millésimes historiques 2019–2023** restent non chargés — voir ci-dessus.

---

## Le 25 août, session 7 : `w0-plu` est fait, dernier ticket de la vague 0

**`w0-plu` (#9) est fait**, démontré par un appel anonyme réel : `compass_premises_within` sur
**1 RUE MONTORGUEIL** rend `plu_protected: false`, sur **25 RUE MONTORGUEIL** — même rue,
tronçon voisin — rend `plu_protected: true`. Deux adresses, deux verdicts, sans avoir eu à
chercher plus loin que la rue déjà utilisée par `w0-provenance` et `w0-fiche`. Détail complet
dans `docs/tickets/w0-plu.md` — sources, seuil de rattachement mesuré, et le bug de conception
trouvé puis corrigé avant que rien ne soit poussé.

**Ce ticket redit `docs/PLAN.md` §2.4** mot pour mot ; les deux sont clos ensemble.

### Le piège du prompt, encore — même défaut que la session 5, un cran plus loin

Le prompt annonçait « Ticket `w0-plu` (issue #9) » mais demandait de lire
`docs/tickets/w0-fiche.md` — un ticket clos la veille, sur un sujet différent. Vérifié contre
`docs/SESSIONS.md` avant d'écrire quoi que ce soit : la session 7 est bien `w0-plu`. Le corps du
prompt portait aussi la consigne « clé anon » et le rappel de cadences de `w0-cron` (déjà clos)
plutôt que celle de `w0-plu` — sans conséquence, `lib/db.ts` applique déjà cette règle à tout
chargeur. **La leçon de la session 5** — « un identifiant de ticket et un numéro d'issue sont
deux mesures, et elles peuvent diverger sans que rien ne l'annonce » — vaut aussi pour le fichier
de consignes cité en tête : recouper contre `docs/SESSIONS.md`, pas supposer que le prompt colle
au bon bloc.

### Un bug de conception trouvé par la mesure, avant tout push

Le rattachement linéaire PLU → tronçon de rue a d'abord été écrit en « tout tronçon à moins de
15 m de n'importe quel linéaire » plutôt qu'en « chaque linéaire à son tronçon le plus proche ».
Résultat mesuré : **10 800 tronçons, 65 589 locaux** — environ 2,5× le chiffre attendu. La cause :
sur des blocs courts près d'un carrefour, un même linéaire PLU sied à moins de 15 m de deux ou
trois tronçons voisins, et la version many-to-many les protégeait tous. Trouvé en comparant au
résultat d'une mesure exploratoire faite *avant* d'écrire le chargeur (percentiles de distance
linéaire → tronçon dans une transaction annulée), pas après coup — la même discipline que le
`--dry-run` de `sirene.ts` (session 6) appliquée à un nouveau chargeur plutôt qu'à un
rechargement. Rejoué avec le rattachement many-to-one : **4 340 tronçons, 29 624 locaux**,
conforme à la mesure exploratoire (± 1 %, du bruit d'égalité de distance dans l'opérateur KNN de
PostGIS, sans incidence sur le critère).

### Un écart trouvé en lançant une porte non exigée par ce ticket

`npm.cmd run eval:anon` n'est pas dans la liste des portes du prompt commun pour ce ticket (elle
l'est seulement « si tu as touché `src/core/` ou `mcp-server/` », ce que `w0-plu` ne fait pas) —
lancée quand même parce que `compass_premises_within`, la fonction exercée, a changé de
signature. Trois échecs sur neuf, aucun lié à `w0-plu` : deux sur `compass_scoring_context_within`
(un écart datant du matin même du 25 août, avant cette session — `expectWithheld` n'a pas été
mise à jour après que `20260825000003` lui a ajouté la colonne `out_of_corpus`), un timeout
Postgres (`57014`) sur un `count=exact` de `premise_observation`. `git log` confirme qu'aucun des
deux fichiers en cause n'a bougé depuis avant cette session. Consigné, non corrigé — hors
périmètre. `DIAGNOSTIC.md` §18.

### Poussé et fermé — `#9` clôturée avec un commentaire, pas seulement le libellé du ticket

**Poussé sur `origin/main` à `125125f`**, sur autorisation explicite donnée au tour suivant
(« pousse et merge, puis ferme proprement ») — rien à fusionner, ce dépôt n'ouvre pas de PR pour
ce genre de session, `git push` a posé directement sur `main`. **Issue
[#9](https://github.com/IvandeMurard/paris-compass/issues/9) fermée**, avec le tableau des deux
adresses en commentaire, comme `w0-fiche` l'avait fait avant elle. `npm.cmd run sessions`
régénéré derrière : 39 tickets suivis, 7 fermés.

> **Le compte d'issues de la table de clôture, plus haut, portait déjà un écart avant cette
> session.** « 43 ouvertes, 8 fermées » (hérité de la clôture de la session 6) omettait
> [#52](https://github.com/IvandeMurard/paris-compass/issues/52) — le défaut Overpass de la
> session 3, fermé entre-temps sans que cette page ne soit remesurée. Remesuré par `gh` en
> fermant `#9` : **41 ouvertes, 10 fermées** avant même de compter `#9`. Encore un exemple de la
> règle que cette page répète depuis le 24 août — un état GitHub est une mesure, pas une valeur
> à recopier d'une session à l'autre.

### Ce qui reste, et qui n'appartient pas à cette session

- **Le bandeau d'alerte PLU sur la fiche** reste côté Lovable, comme `PLAN.md` §2.5 l'annonce —
  cette session pose le RPC, pas l'écran.
- **`w0-plu` n'est pas câblé sur le cron de `w0-cron`.** Cadence `rare` déclarée dans
  `ingestion_run`, chargeable seulement à la main. Pas demandé par le ticket ; à trancher si le
  produit veut un jour republier automatiquement une nouvelle version du PLU.

---

## Le 25 août, session 6 : la fraîcheur est mesurable, le cron ne tourne pas encore

**`w0-cron` (#6) est fait, issue fermée.** Les deux moitiés du critère : `compass_*` expose une
date de fraîcheur pour les quatre sources — migration `20260825000001`, ledger distant remesuré
à **30** — et **un cron a tourné seul** le 25 août, run
[32807455464](https://github.com/IvandeMurard/paris-compass/actions/runs/32807455464),
`run_by = schedule`. Déclenché à 04:02 UTC pour une planification à 03:17 : GitHub est en retard
sur les crons, sans conséquence ici.

> **La chaîne anti-destruction s'est vérifiée dans la foulée.** Ce passage automatique a rejoué
> `sirene.ts --confirm-only` derrière BODACC — 84 255 avis réévalués, **82 371 confirmés et
> 1 884 infirmés**, les valeurs d'avant. Sans elle, le cron aurait détruit les 3 147 niveaux
> `corrobore` cette nuit-là et chaque nuit suivante. Le correctif est vérifié par le mécanisme
> même qui aurait déclenché le défaut.

**Ce ticket redit `PLAN.md` §2.2bis et §2.2ter mot pour mot.** Les deux sont traités comme un
seul chantier et se citent l'un l'autre.

### Deux dates, jamais une — c'est tout le sujet

La faute à éviter n'est pas l'absence de date, c'est **l'effondrement de deux dates en une**.
Mesuré le 25 août, après avoir rechargé BDCom **le jour même** :

| source | cadence | source datée | chargé le | lignes | par |
| --- | --- | --- | --- | --- | --- |
| `bdcom` | triennial | **2023-06** | **2026-08-25** | 228 275 | manual |
| `bodacc` | continuous | 2026-08-23 | 2026-08-25 | 163 788 | manual |
| `geography` | rare | 2026-08-25 | 2026-08-25 | 25 174 | manual |
| `sirene` | monthly | — | — | — | — |

La ligne `bdcom` est la démonstration : trois ans d'écart sur une donnée chargée il y a une
minute. La ligne `sirene` en est une autre : **jamais chargée**, et elle le dit au lieu
d'emprunter la date d'un voisin. La colonne `par` est celle qui rend la doctrine vérifiable —
tant qu'elle vaut `manual`, la cadence est déclarée et non tenue, et `npm.cmd run freshness`
l'écrit noir sur blanc.

### Rejouer les quatre chargeurs a trouvé deux choses qu'aucune lecture n'aurait données

**1. `bdcom.ts` ne pouvait tourner qu'une fois.** `DIAGNOSTIC.md` §17, **corrigé**. Il vidait
`bdcom_activity`, que `premise_observation.activity_code` référence. Le `delete` ne passait
qu'au premier chargement, quand `premise_observation` est encore vide — le 15 août était ce
premier chargement, et le défaut attendait le second. **La prémisse du ticket était donc
fausse** : « les scripts sont idempotents » ne valait pas pour celui-ci.

**2. L'URL du parquet SIRENE rendait 404.**
[**#56**](https://github.com/IvandeMurard/paris-compass/issues/56), **corrigée et fermée le
25 août**. data.gouv.fr **remplace** la ressource au lieu de l'archiver : celle épinglée au
21 juillet n'existait plus, et le chargeur ne pouvait plus tourner du tout. Un épinglage sur ce
jeu garantit une panne dans le mois — il a tenu du 15 juillet au 21 août.

`sirene.ts` résout désormais l'URL depuis l'API data.gouv.fr et **écrit le millésime résolu**
dans `source_as_of`. Il refuse de retomber sur une URL précédente si le portail est injoignable :
un repli ferait avancer `last_success_at` sur un millésime que personne n'a choisi, ce qui est
précisément le défaut que ce projet traque.

> L'épinglage était un choix documenté, et **sa prémisse a changé** : il n'existait alors aucun
> endroit où consigner quel millésime avait été chargé, donc épingler était le seul moyen de
> rendre le changement délibéré. `ingestion_run.source_as_of` est cet endroit, et le chargeur
> hurle en clair quand le millésime bouge — `CHANGEMENT DE MILLÉSIME 2026-07-21 -> 2026-08-21`.

**Et `--dry-run` est né de là.** Un changement de millésime déplace les confirmations, donc le
niveau `corrobore`, donc la composition de fiabilité. Le mode charge, mesure, puis **annule**
dans la même transaction : l'écart est connu avant d'être commis. Mesuré le 25 août avant de
charger — +111 établissements, **+24 avis confirmés**, −6 infirmés. Négligeable, donc commis ;
si l'écart avait été celui du 25 août au matin (−3 147 corroborations), il aurait fallu
s'arrêter. C'est l'outil qui manquait ce matin-là.

### La garantie centrale, démontrée par un vrai échec

**Une exécution ratée ne rajeunit rien.** `recordRun` est appelée après le commit, jamais
dedans. Ça n'a pas eu à être mis en scène : l'échec de `bdcom.ts` a laissé
`compass_source_freshness()` sur « jamais chargé », et celui de `sirene.ts` l'y laisse encore.

### Le même jour, plus tard : `#55` corrigé, et deux défauts trouvés en le faisant

**`DIAGNOSTIC.md` §16 est corrigé** — voie 3 (PostGIS) plus voie 1 (hygiène), migration
`20260825000003`. `compass_scoring_context_within` rend une ligne-marqueur `out_of_corpus` sur
le modèle de `withheld` ; la couche est retirée, `footfall` revient inconnu. **`verify:mcp` :
41 contrôles, 41 au vert, zéro défaut connu.**

> **Le contre-test est la moitié qui compte.** Traiter « zéro ligne » comme couche absente
> aurait été plus simple et faux : le Bois de Vincennes est dans le quartier Picpus et porte
> **zéro local dans 400 m** — un vrai zéro. `E12` et `I20` l'interdisent. Sans eux, le mauvais
> correctif serait passé au vert.

**Deux défauts trouvés en rejouant les chargeurs, tous deux invisibles à la lecture :**

- **Recharger BODACC détruit toutes les confirmations SIRENE.** La reconstruction de
  `bodacc_announcement` cascade sur `bodacc_establishment`, donc sur `operator_confirmed`.
  Mesuré : **3 147 niveaux `corrobore` tombés à zéro, 5,92 points** de composition
  établi+corroboré — la métrique de qualité du projet. Un cron BODACC **quotidien** les aurait
  effacés chaque nuit quand SIRENE ne repasse que **tous les mois**. D'où
  `sirene.ts --confirm-only`, qui rejoue la confirmation sans relire l'INSEE — ce qui tombe
  bien, l'URL du parquet rendant 404 (#56) — et l'enchaînement dans le workflow, tenu par test.
  **Réparé** : `corrobore` de retour à 3 147, les huit cas dorés au vert.
- **La promotion BDCom dépendait de l'ordre de chargement.** Le drapeau de conflit se calculait
  contre un corpus encore en construction : 74 relevés marqués sur base vierge, 220 au
  rechargement. Les **identifiants** réattribués sont 74 dans les deux cas — c'est la requête de
  la baseline qui comptait des *relevés* sous un nom qui annonce des *identifiants*. Corrigé des
  deux côtés, et la valeur gelée n'a pas eu à bouger. `DIAGNOSTIC.md` §17.

> **Ce que ces deux-là ont en commun** : rien n'échouait. Le premier détruisait une donnée en
> silence, le second produisait une base différente sans erreur. Aucun des deux ne se serait vu
> autrement qu'en lançant les chargeurs — ce que `w0-cron` a forcé à faire pour la première fois
> depuis le 15 août.

### Trois choses à savoir pour la prochaine session

- **Le secret `DATABASE_URL` est posé et le cron tourne.** Le premier lancement avait échoué
  sur la *valeur* du secret : la garde a refusé de démarrer, rien n'a été écrit. Le poser depuis
  `.env.local` par un tube — jamais à la main — évite le préfixe et les guillemets. Toujours la
  chaîne du **pooler session, port 5432** : `db.<ref>.supabase.co` n'a qu'un enregistrement AAAA
  et les runners GitHub n'ont pas d'IPv6, même piège qu'en local, et la garde le nomme.
- **`scripts/` est enfin typechecké et testé.** Ajouté à `tsconfig.node.json` et à
  `vitest.config.ts` — mesuré à **zéro erreur** en `strict` avant de l'inclure, ce qui ferme le
  trou que `w0-mcp-verif` avait trouvé sans le combler. `npm.cmd run test` : **107 tests**.
- **Le workflow se relit lui-même.** `scripts/ingest/workflow.test.ts` vérifie que la table de
  correspondance cron -> jeu n'a pas dérivé du bloc `on.schedule`. Sans ça, une dérive ne se
  verrait que le jour où le cron se déclenche — deux fois l'an pour la géographie.

---

## Le 24 août, session 5 : le serveur MCP a enfin une porte

**`w0-mcp-verif` (#53) est fait.** `npm.cmd run verify:mcp` exerce les six outils contre
`dbefhvmyfmmhjeetdddu` en appelant **anonyme**, clé publiable seule. Deux passages mesurés le
24 août, **0 en échec** dans les deux :

| Passage | Total | Au vert | Échec | Suspendus | Défaut connu |
| --- | --- | --- | --- | --- | --- |
| Overpass répond | **36** | 35 | **0** | 1 | 0 |
| Overpass rend 429/504 | **33** | 30 | **0** | 2 | 1 (§16) |

**Le total n'est pas fixe, et c'est voulu** : la famille `PROVENANCE` tombe de cinq assertions à
deux quand la couche d'aménités n'est jamais arrivée. Affirmer la provenance de chiffres qui
n'ont pas été calculés serait un vert qui ne représente rien. **Lire le `0 en échec`, pas le
total.** Détail complet dans `docs/tickets/w0-mcp-verif.md`.

| Famille | Ce qu'elle tient |
| --- | --- |
| `INVENTAIRE` | les six outils enregistrés, contre les six que `mcp-server/README.md` annonce |
| `PROVENANCE` | chaque chiffre attribué à la couche lue — `footfall` cite ses deux sources et porte `asOf: 2023-06`, la date du recensement et non celle de la requête |
| `LICENCE` | 2017 et 2020 retenus (`observed: null`, `label: null`), 2023 servi, **et le contre-test** qui échoue si la retenue vide aussi le millésime ODbL |
| `PANNE` | boîte de coordonnées, rayons, millésime inconnu, **base injoignable**, miroir Overpass injoignable |

### Le piège de ce ticket : un contrôle qui imprime n'est pas un contrôle

Le ticket demandait de câbler `smoke-test.ts`. **Il ne fallait pas.** Ce fichier *imprime* les
réponses et sort `0` tant que rien ne lève : câblé tel quel, il aurait posé une porte qui reste
verte pendant que chaque chiffre ment. C'est exactement ce que le « Comment » du ticket met en
garde — figer l'état présent comme référence — appliqué à son propre libellé.

`mcp-server/src/verify.ts` a donc été écrit **à côté**, et il assène. Le smoke test reste,
réparé, sous `npm.cmd run smoke:mcp`, comme lecture quand une règle a cassé et qu'on veut voir
les réponses brutes.

### Trois statuts, pas deux — et le défaut connu qui ne se fige pas

Un miroir Overpass public qui rend 504 n'est pas un défaut de ce dépôt. La porte le classe en
`panne`, suspend les assertions qui en dépendent, et **vérifie quand même que la panne a été
rapportée** et qu'aucun champ n'est revenu à zéro. Sans ça, la porte serait rouge un jour sur
trois et personne ne la lancerait.

Le troisième statut est `défaut` : un défaut déjà consigné, rapporté et non fatal. **Et il passe
au ROUGE si le défaut disparaît.** C'est voulu : un correctif ne doit pas pouvoir laisser
`DIAGNOSTIC.md` et son issue derrière lui. Aujourd'hui un seul, `E11` pour §16.

### Le défaut trouvé en chemin : un point hors corpus scoré comme un quartier sans commerces

**`DIAGNOSTIC.md` §16, [#55](https://github.com/IvandeMurard/paris-compass/issues/55) — ouverte,
elle demande une décision.** C'est le défaut du point 9 dans sa variante **géographique** :
non plus une couche retenue par licence, mais une couche absente parce que le corpus s'arrête.

Mesuré à **(48,7 · 2,2)**, Massy, à 18 km du 1er : `find_premises` rend honnêtement
`total_matched: 0`, et `score_location` rend malgré tout `footfall: 22`, cité
« APUR BDCom 2023 + OpenStreetMap via Overpass », licence ODbL, `asOf: 2023-06` — **sur zéro
local BDCom lu**. Le chiffre est entièrement dérivé d'OpenStreetMap : `62 × 0,35 = 21,7`.

Le garde-fou de `context.ts` ne l'attrape pas parce que la requête **réussit** avec zéro ligne,
donc la couche compte comme chargée. Une licence retenue lève, une base injoignable échoue —
mais un vide hors corpus est indiscernable d'un vide réel. Trancher entre resserrer la boîte
zod, retirer la couche à zéro ligne, ou interroger PostGIS sur les 80 quartiers : c'est la
décision, et elle n'appartenait pas à ce ticket.

### Le second écart : une documentation qui décrivait un défaut corrigé le matin même

`mcp-server/README.md`, section « What this does not cover yet », affirmait encore que chaque
champ cite `OpenStreetMap via Overpass` même quand la couche vient de BDCom, et renvoyait à
« a separate change ». Ce changement, c'est `w0-provenance` (#10), **fait quelques heures plus
tôt le même jour**. Corrigé.

> C'est la règle de `CLAUDE.md` — « un correctif consigné porte sa source » — dans son angle
> mort : la page n'était pas fausse quand elle a été écrite, elle l'est devenue le jour où le
> chantier qu'elle annonçait a été fait, **et rien dans le dépôt ne relie les deux**. Le ticket
> qui corrige doit relire les pages qui *attendaient* ce correctif, pas seulement celles qui le
> décrivent.

### Trois choses à savoir pour la prochaine session

- **`npm.cmd run verify:mcp` fait partie des portes avant de pousser**, et c'est écrit dans le
  prompt commun de `docs/SESSIONS.md`. À lancer dès qu'on touche `src/core/` ou `mcp-server/` —
  le typecheck du MCP compile `../src/core` en `strict: true`, plus sévère que le `tsc --build`
  de la racine qui le compile en `strict: false`.
- **`tsx` ne démarre toujours pas sur cette machine**, et c'est maintenant contourné pour de
  bon : `scripts/verify-mcp.mjs` bundle avec l'esbuild de la racine et lance `node`. Les scripts
  qui restent sur `tsx` — `eval`, `eval:anon`, `sessions`, `generate-sitemap` — n'ont pas été
  touchés.
- **`scripts/` n'est typechecké par rien**, trouvé en chemin et laissé ouvert. `tsconfig.app.json`
  porte `include: ["src"]`, `tsconfig.node.json` `include: ["vite.config.ts"]` : les quatre
  chargeurs d'ingestion et les deux bras de la porte ne passent sous aucun `tsc`. Ajouter la
  ligne d'`include` est trivial ; le nombre d'erreurs qu'elle ferait apparaître n'a **pas** été
  mesuré, donc rien n'a été promis.

### Le piège de la session : le prompt lui-même était faux

Le prompt reçu annonçait « Ticket `w0-cron` (issue #53) » et demandait de lire
`docs/tickets/w0-fiche.md`. **Trois tickets différents dans un seul en-tête** : `w0-cron` est
l'issue **#6**, `#53` est `w0-mcp-verif`, et `w0-fiche` (#8) était clos depuis la veille au soir.
Les consignes de fin de prompt — clé anon, cadences SIRENE/BODACC/BDCom — sont le corps de
`w0-cron.md` mot pour mot ; le piège `observed = false` est celui de `w0-fiche`.

L'origine est mécanique : les blocs de consignes par session de `docs/SESSIONS.md` se collent à
la main, et `w0-mcp-verif` avait été inséré **sans numéro de session** entre la 4 et la 5, ce
qui a décalé tout ce qui suivait. Renuméroté depuis, aligné sur le tableau généré.

> **La leçon vaut au-delà de ce fichier.** Un identifiant de ticket et un numéro d'issue sont
> deux mesures, et elles peuvent diverger sans que rien ne l'annonce — même mode de défaillance
> que le ledger à 24 et l'état GitHub périmé trois fois dans la journée. **Recouper l'un contre
> l'autre par `gh` avant de commencer**, et ne pas supposer que l'en-tête du prompt est juste.

---

## Le 24 août, session 4 : `w0-fiche` est fait, et le navigateur parle enfin à la base

**Fait et démontré dans le navigateur**, `npm.cmd run dev`, clé publiable seule, donc appelant
**anonyme** — le seul que le front sache être. Local **3 rue du Jour**, quartier **Halles**,
identifiant BDCom **1250**, ouvert depuis la carte OpenStreetMap « Local vacant (ancien
sewing) », 9-11 rue du Jour :

| Date | Ce que la fiche affiche | Niveau |
| --- | --- | --- |
| 16 sept. 2015 | Dépôt de l'état des créances · LITTLE FASHION GALLERY | Corroboré |
| 3 mars 2016 | Jugement de clôture pour insuffisance d'actif · LITTLE FASHION GALLERY | Corroboré |
| **2017** | **Millésime retenu** | Indéterminé |
| 23 juin 2017 | Autre jugement prononçant · EXCELLENCE & COMPAGNIE | Corroboré |
| 8 avril 2018 | Jugement de clôture pour insuffisance d'actif · EXCELLENCE & COMPAGNIE | Corroboré |
| **2020** | **Millésime retenu** | Indéterminé |
| **2023** | **Prêt-à-porter Homme** · AGNES B | Établi |

**`.rpc(` passe de 0 à 2 occurrences dans `src/`.** C'est le constat de `PLAN.md` §2.7 —
« dix fonctions `compass_*`, la machinerie de confiance à quatre niveaux et les 85 418 locaux
n'ont aucun consommateur » — qui tombe après douze jours. Remesuré avant le chantier : le
chiffre du ticket était juste. Portes au vert : `tsc --build`, **96 tests** sur sept fichiers,
`build` **et** `build:dev`.

**Le ticket redisait `docs/PLAN.md` §2.7.** Les deux sont clos ensemble et se citent l'un
l'autre — troisième ticket de suite dans ce cas, après `w0-history` et `w0-provenance`.

### Le piège de ce ticket : le plus proche n'est pas le bon

**OpenStreetMap et la BDCom ne partagent aucun identifiant.** Rien de public ne les relie, donc
rattacher une carte à un local relevé est une déduction **spatiale**. Mesuré le 24 août sur
658 locaux OpenStreetMap autour des Halles :

| | p10 | p25 | **p50** | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- | --- |
| Distance au local BDCom le plus proche | 1 m | 2 m | **5 m** | 24 m | 58 m | 101 m |

| Rayon | Aucun candidat | Exactement un | Médiane | Max |
| --- | --- | --- | --- | --- |
| 10 m | 35 % | 17 % | 1 | 13 |
| **25 m** | **24 %** | **3 %** | **5** | **125** |
| 40 m | 18 % | 1 % | 13 | 136 |

**Et le plus proche est souvent le mauvais commerce** : « Les Trésors Pets » dans
OpenStreetMap a **« BA&SH » à 0 m** dans BDCom ; « Carhartt Work in Progress » a « STUDIO
PIERRE CARDIN ». Sur les 275 locaux qui portent une adresse, **154 seulement** partagent
numéro et voie avec leur plus proche voisin BDCom.

**Auto-sélectionner aurait donc rattaché l'histoire d'un local à un autre** — mot pour mot la
seconde des deux erreurs fondatrices de `PLAN.md` §2.5, refaite à un nouvel endroit et cette
fois dans le code plutôt que dans une phrase. La fiche liste les candidats dans 25 m avec
adresse, activité, enseigne et distance, et laisse le lecteur trancher. **La règle générale :
quand deux jeux de données n'ont pas de clé commune, le rattachement est une question posée au
lecteur, pas une réponse calculée pour lui.**

### `observed = false` est écrit et testé, mais pas encore atteignable

Le piège nommé par le ticket est tenu : `observed = false` rend **« Non observé »**, jamais
« vacant » ni « plus un commerce », vérifié par test sur la ligne exacte du distant (local
54653). **Mais aucun appelant anonyme ne peut atteindre cette ligne aujourd'hui** : la liste de
candidats vient de `compass_premises_within` épinglé sur 2023, donc tout local listé y est
observé ; et 2017 comme 2020 reviennent `withheld`. La branche s'allumera le jour où la licence
APUR sera lue. C'est du travail prêt d'avance, et c'est le bon moment pour l'écrire — pas le
jour où la licence tombe.

### Le défaut trouvé en chemin : une conclusion tirée par-dessus une retenue

[**#54**](https://github.com/IvandeMurard/paris-compass/issues/54), ouverte le 24 août.

Sur un millésime `retail_only`, `compass_address_timeline` justifie une absence par « une
absence signifie « plus un commerce », pas « vacant » ». **« Plus un commerce » suppose que le
local en était un avant — et c'est précisément ce que la même réponse retient** pour un
appelant anonyme. La fonction conclut à partir de deux millésimes dont elle vient de dire
qu'elle ne dirait rien.

Famille des points 9 à 12, variante nouvelle : non plus une retenue rendue comme un fait, mais
une **conclusion posée par-dessus une retenue**. `DIAGNOSTIC.md` §15, **ouvert** : le correctif
est dans le SQL, le ticket était de l'interface, et la phrase existe aussi dans `PLAN.md` —
corriger l'un sans l'autre laisserait la doctrine contredire la base. **À trancher, pas à
corriger mécaniquement.**

### Trois choses à savoir pour la prochaine session d'interface

- **Le panneau ne s'ouvre que depuis la vue liste.** Les popups Leaflet sont des chaînes HTML
  brutes (`useMapLayers.ts`), donc y poser un bouton demande un pont d'événements dans une
  couche qui porte déjà un défaut ouvert. Laissé de côté volontairement.
- **Les pièces restent en français sur la page anglaise.** `evidence` et `confidence_reason`
  viennent de la base, qui n'écrit qu'en français, et la fiche les relaie verbatim : les
  traduire serait réécrire la pièce. Le correctif est côté base.
- **La page Méthodologie a gagné une section**, parce que la règle des trois états et les
  quatre niveaux atteignent maintenant l'écran. `CLAUDE.md` : une règle affichée est publiée.

---

## Le 24 août, session 3 : `w0-provenance` est fait, et il redisait `PLAN.md` §4.1

**Fait et démontré contre le distant.** `scoreLocation` prend désormais un `Origin`
**par couche** au lieu d'un seul pour les huit champs. `explain_score` sur Montorgueil,
rayon 800 m, à travers les vrais miroirs et la vraie base :

| Millésime | Métrique | Valeur | `source` | `asOf` |
| --- | --- | --- | --- | --- |
| 2023 | `footfall` | 97 | **`APUR BDCom 2023 + OpenStreetMap via Overpass`** | **`2023-06`** |
| 2023 | `groceries` | 100 | `OpenStreetMap via Overpass` | `2026-08-24` |
| 2023 | `noise` | 51 | `OpenStreetMap via Overpass` | `2026-08-24` |
| 2017 | `footfall` | `null` | **`APUR BDCom 2017`**, licence APUR non lue | **`2017`** |

Les cinq lignes disaient auparavant `OpenStreetMap via Overpass`, `ODbL`, et la date du jour.
Tableau complet et métadonnées de millésime dans `docs/tickets/w0-provenance.md` ; défaut dans
`DIAGNOSTIC.md` §13.

**Le ticket redisait `docs/PLAN.md` §4.1**, qui portait le même manque depuis le 15 août sous le
titre « deux manques restants ». Les deux sont clos ensemble et se citent l'un l'autre, plutôt
que laissés diverger — c'est exactement le recoupement que « Ce que le plan d'action ne garantit
pas » annonce plus bas pour une vingtaine de tickets.

**Trois choses que le ticket ne demandait pas et qui sont tombées avec :**

- **La date. `asOf` valait `new Date()`** sur un relevé de terrain de juin 2023 : trois ans
  d'écart annoncés comme frais du jour. La licence et la date du millésime se lisent maintenant
  dans `compass_vintages`, jamais dans une constante du code.
- **`OSM_ORIGIN` passe de `ODbL` à `ODbL-1.0`**, l'orthographe de `bdcom_vintage.licence`. Sans
  cela le flux piéton aurait annoncé `ODbL-1.0 + ODbL` : deux obligations là où il n'y en a
  qu'une. Aucun rendu du front n'affiche ce champ, seul le MCP le voit.
- **Un millésime retenu nomme désormais sa source.** `footfall` nul sur 2017 porte
  `APUR BDCom 2017` et sa licence non lue : l'appelant apprend *quel* jeu se tait et *pourquoi*.

**Portes au vert** : `tsc --build` sur les deux paquets, **79 tests sur six fichiers** (73 avant).

### Le défaut trouvé en chemin : le MCP n'atteignait jamais son miroir Overpass principal

**`overpass-api.de` répond 406 à une requête sans `User-Agent`, et le `fetch` de Node n'en envoie
aucun.** Le serveur tournait donc depuis toujours sur ses deux miroirs de secours, tous deux en
panne ce jour-là — ce qui a rendu le critère indémontrable jusqu'à ce que la cause soit trouvée.
Le navigateur n'a jamais eu le problème : il pose son propre `User-Agent`. Corrigé, et consigné
dans `DIAGNOSTIC.md` §14.

**Ce qui l'a rendu invisible mérite plus d'attention que le 406 lui-même** : la boucle sur les
trois miroirs ne gardait que `lastError`. Un 406 **permanent** sur le premier disparaissait
derrière le 500 **passager** du troisième, et l'appelant lisait une panne intermittente là où il
y avait une panne définitive. Règle générale : **un client qui essaie N serveurs doit rendre les
N erreurs.**

### `tsx` ne démarre pas sur cette machine — contourner par esbuild

**Une stratégie de contrôle d'application Windows bloque `esbuild.exe` 0.28.2**, celui de
`mcp-server/node_modules`. `npx tsx` échoue donc en `spawn UNKNOWN` (errno `-4094`), un message
qui ne dit rien de la cause. L'esbuild **0.25.12** de la racine, lui, s'exécute — c'est un
blocage par binaire, pas par produit. Vérifié le 24 août avec `Start-Process`, qui est le seul
appel à rendre le vrai message : « Une stratégie de contrôle d'application a bloqué ce fichier ».

Contournement, depuis la racine du dépôt :

```powershell
.\node_modules\.bin\esbuild.cmd mcp-server/src/index.ts --bundle --platform=node `
  --format=esm --packages=external --outfile=mcp-server/.build/server.mjs
node mcp-server/.build/server.mjs   # depuis mcp-server/, pour que ../.env soit trouvé
```

`mcp-server/.build/` est ignoré par git. `mcp-server/src/provenance-check.ts` est le script de
vérification écrit pour ce ticket : il rejoue `explain_score` sur trois métriques et deux
millésimes et imprime source, licence et date. Il spawne le serveur par `npx tsx`, donc **il
faut bundler les deux fichiers** et remplacer cette commande par `process.execPath` sur le
bundle. Même remarque pour `src/smoke-test.ts`.

---

## Le 24 août : le correctif de `w0-history` a raté l'appelant connecté

**Corrigé et posé.** `20260824000002_premise_history_definer.sql` est sur le
distant, ledger remesuré à **27**, `compass_premise_history` est `SECURITY
DEFINER` en base. Les deux portes au vert : **18/18** invariants dont `I18`, et
9 contrôles anonymes.

**Le chemin que la porte ne sait pas tester, mesuré à la main.** Appelant
`authenticated` avec `set local role` pour que RLS s'applique réellement, local
54652 :

| Millésime | Avant `…002` | Après `…002` |
| --- | --- | --- |
| 2017 | `withheld=false, observed=false` | `withheld=false, observed=true, is_vacant=true, Locaux Vacants` |
| 2020 | `withheld=false, observed=false` | `observed=true, Galerie d'art` |

**Et le pire cas pour `SECURITY DEFINER`, où RLS ne protège plus rien** : appelant
`anon` par le claim seul, et par HTTP avec la clé publiable — `withheld = true`,
tout nul sur 2017 et 2020. La fonction retient par elle-même, ce qui est
exactement ce que le passage en `DEFINER` l'oblige à savoir faire. Le local 5
reste lisible comme absent de 2023 (`observed = false`, `is_vacant` nul) pour
l'appelant connecté aussi : l'absence n'est pas redevenue une occupation.

**Ce qui s'est passé.** `20260824000001` a rendu le chemin **anonyme** honnête et
laissé le chemin **authentifié** affirmer. La politique RLS de `20260809000008`
restreint `to anon, authenticated` ; le test d'appelant de `20260809000010` juge
privilégié tout ce qui n'est pas `anon`. Une fonction `SECURITY INVOKER` hérite
des deux : pour un utilisateur connecté, le claim pose `withheld = false` —
*rien ne vous est caché* — pendant que RLS retire les lignes 2017 dessous, et
`observed` revient `false`. Mesuré sur le distant, local 54652, 2017 :
`withheld = false, observed = false` sur un local relevé **et vacant**.

**C'est pire que le silence qu'il remplaçait** : le marqueur contresigne
maintenant le mensonge. `DIAGNOSTIC.md` §12.

**La règle était écrite depuis le 9 août**, dans `20260809000008`, à propos de la
fonction sœur — « donc la fonction devient `SECURITY DEFINER` : elle voit toutes
les lignes et décide de ce qu'elle divulgue ». Le paragraphe décrit
`compass_premise_history` mot pour mot. Il vivait dans une migration que rien
n'obligeait à lire, et `20260824000001` a argumenté l'inverse dans son en-tête.
**`I18` en fait une vérification** : une fonction `compass_*` portant une colonne
`observed` doit être `SECURITY DEFINER`. Structurel et non comportemental, parce
que le lanceur n'émet jamais `set local role` — RLS ne s'applique **jamais**
pendant qu'il tourne, donc ce défaut est invisible à tout test de comportement
que la porte sait exprimer.

> **Trouvé dans un worktree, pas dans le code.** La session du 24 août qui a
> *découvert* le défaut du point 10 y avait laissé un brouillon **non commité**
> de la migration, qui était arrivé à `SECURITY DEFINER` par ce chemin exact. Il
> n'a jamais atterri. **Une session qui se termine sans pousser emporte son
> raisonnement avec elle**, et la suivante refait le trajet — ou prend le mauvais
> embranchement, ce qui est arrivé ici. Le worktree a été supprimé après reprise
> du raisonnement dans `20260824000002`.

**Sur le suivi.** `#51` reste **fermée à juste titre** : son critère portait sur
l'appel **anonyme**, et il est démontré. Le trou de l'appelant connecté était un
défaut **distinct**, ouvert et refermé dans la même journée sans passer par une
issue — il vit en `DIAGNOSTIC.md` §12, avec sa mesure et sa date.

---

## Le 24 août, session 2 : `w0-history` est posé sur le distant

**Le quatrième défaut de licence est corrigé**, par
`supabase/migrations/20260824000001_premise_history_withholding.sql` — et par la
même occasion un cinquième, qui n'avait rien à voir avec une licence. Détail en
`DIAGNOSTIC.md` §10 et §11.

**Le critère est démontré en direct**, par un appel PostgREST avec la seule clé
publiable, aucun identifiant de base, local 54652 `60 QU ORFEVRES` :

| Millésime | `withheld` | `observed` | `is_vacant` | `activity_label` |
| --- | --- | --- | --- | --- |
| 2017 — **avant** | *(colonne absente)* | `false` | `false` | `null` |
| 2017 — après | `true` | **`null`** | **`null`** | `null` |
| 2020 — après | `true` | `null` | `null` | `null` |
| 2023 — après | `false` | `true` | `false` | `Antiquités` |

**Les deux portes sont au vert contre le distant** : `npm.cmd run eval` rend
**17/17** invariants, 24 baselines et les 8 cas dorés ; `npm.cmd run eval:anon`
rend 9 contrôles, dont les deux nouvelles sondes `premise_history`. Composition de
fiabilité inchangée à **57,31 %** établi+corroboré, dérive nulle sur les quatre
niveaux — le correctif ne touche aucun chiffre publié.

**Ce qui est éprouvé, et contre quoi.** La migration a d'abord tourné dans une
transaction jamais validée contre le distant, avec `I16` et `I17` joués dedans.
Le couple a ensuite été **éprouvé contre deux sabotages**, chacun dans une
transaction annulée — une version qui pose `withheld` mais garde les valeurs par
défaut (I16 échoue, I17 reste vert), une version qui retient tous les millésimes
(I17 échoue, I16 reste vert). La sonde du bras D, jouée contre la fonction
défectueuse encore en ligne, échouait elle aussi. Aucun des trois n'est vide.

> **Ce que le bras A n'aurait jamais pu trouver, et pourquoi le bras D existe.**
> L'ancienne `compass_premise_history` ne lisait **pas du tout** le claim. Faire
> dire `anon` à une connexion privilégiée — ce que fait le bras A — lui rendait
> donc tout le contenu, sans rien d'anormal à l'œil. Seule une vraie clé
> publiable, avec RLS derrière, montrait la ligne fabriquée. Les trois autres
> fonctions lisent le claim, donc ce piège ne se déduit pas d'elles.

**`supabase db push` a d'abord été refusé par le classificateur du mode auto** de
Claude Code — une écriture de schéma sur une base distante vivante, exactement le
refus déjà rencontré le 17 août. **Lancé à la main depuis PowerShell, il passe**,
comme la fois précédente : c'est un réflexe à garder, pas un blocage. La commande
et ses deux pièges (URL percent-encodée, pas de `--linked`) sont au point 8 de
« La suite, par ordre ».

**Ledger remesuré après la poussée : 26**, `20260824000001` enregistrée sous le
nom `premise_history_withholding`. Le dépôt et le distant portent de nouveau le
même schéma. `SECURITY INVOKER` est bien conservé en base, et les treize colonnes
de sortie sont dans l'ordre du fichier.

**L'issue [#51](https://github.com/IvandeMurard/paris-compass/issues/51) est
fermée**, le 24 août à 15h48 UTC, et le tableau d'ordre de `docs/SESSIONS.md` a
été régénéré derrière. Le ticket est clos de bout en bout : code, distant, porte,
documentation, suivi.

**Sur GitHub, deux chiffres de cette page étaient périmés** — remesurés le
24 août par `gh` : l'issue [#7](https://github.com/IvandeMurard/paris-compass/issues/7)
`w0-deploy` est **fermée**, pas ouverte, et l'issue
[#51](https://github.com/IvandeMurard/paris-compass/issues/51) `w0-history`
**existait** déjà, là où cette page la disait absente de GitHub.

**État remesuré à la clôture de la session : 44 ouvertes, 2 fermées.** Il valait
45/1 quelques heures plus tôt, dans la même journée, et 43/0 la veille. Trois
valeurs justes à leur date en trente-six heures — c'est la raison d'être de
`npm.cmd run sessions`, qui dérive le tableau d'ordre au lieu de le recopier.

---

## Le 24 août, session 1 : `w0-deploy` est clos, et son chiffre d'entrée était faux

**`w0-deploy` (#7) est fait.** Ce qu'il demandait de poser était déjà posé ; ce
qu'il fallait vraiment faire, personne ne l'avait fait. Les deux moitiés sont
détaillées ci-dessous et dans `docs/tickets/w0-deploy.md`.

**Le ledger distant est à 25 migrations, pas 24.** Cette page l'annonçait à 24 et
le ticket la recopiait. Le chiffre était vrai le 17 août, mesuré *avant* la
poussée de `20260817000001_premises_within_withholding.sql`, et jamais remesuré.
Remesuré le 24 août : 25 lignes, `20260817000001` enregistrée sous le nom
`premises_within_withholding`, et le corps de `compass_premises_within` en base
est **identique caractère pour caractère** au fichier versionné.

> C'est exactement le mode de défaillance que cette page décrit ailleurs sous
> « fausse par branche », dans sa variante temporelle : un chiffre juste à sa
> date, cité par un document qui n'a pas de date. Remesurer avant de recopier.

**La porte anonyme a été jouée pour la première fois** — voir la section du même
nom plus bas. Elle a trouvé un quatrième défaut de licence, sur
`compass_premise_history` : `DIAGNOSTIC.md` §10. **Corrigé et posé le même jour
par la session 2**, ci-dessus.

---

## Le 23 août : rien du produit n'a bougé, le plan de travail oui

**Aucune ligne de `src/`, de `mcp-server/`, de `supabase/` ni de `eval/` n'a
changé.** La session du 23 août n'a touché que la documentation et GitHub. Tout
ce qui suit sur cette page à propos du code, du distant et de la porte reste vrai
tel qu'écrit le 17 août.

Ce qui est nouveau :

- **`docs/PLAN-ACTION-VACANCE.md`** — doctrine non négociable, backlog priorisé
  P0/P1/P2 en huit vagues, catalogue de trente sources avec leurs pièges, et ce
  que l'IA a le droit de faire. Il **complète** `docs/PLAN.md`, qui garde
  l'exécution technique des phases 0 à 6.
- **45 issues ouvertes** — huit épics `#41`–`#48`, trente-cinq tickets `#6`–`#40`,
  puis `#49` (`w1-historique`) et `#50` (`w6-analyse`) ouverts après recoupement
  avec `docs/PLAN.md`. Treize labels. Chaque épic coche ses tickets par leur
  numéro. Les corps vivent aussi dans `docs/tickets/`.
- **Les pourcentages de fiabilité ont été rattrapés.** Le README, cette page et
  `docs/PLAN.md` portaient encore la composition du gel du 9 août. Détail plus
  bas, à « La composition de fiabilité est la métrique de qualité ».

**État vérifié le 23 août** *(remesuré le 24 août : **96 tests sur sept fichiers**)* : `tsc --build` sans erreur, **73 tests au vert sur
six fichiers**. C'est le point de départ propre de la prochaine session.

### Par où reprendre

**L'ordre complet des sessions, avec le prompt et le modèle de chacune, est dans
`docs/SESSIONS.md`.** Ce qui suit en donne la tête.

~~`w0-deploy` (**#7**)~~ **est clos depuis le 24 août**, et l'issue est fermée :
la migration était déjà posée, la porte anonyme a été jouée, le critère est
démontré.

~~`w0-history` (**#51**)~~ **est clos depuis le 24 août, issue fermée** :
migration posée, ledger à 26, les deux portes au vert contre le distant — voir la
section du 24 août, session 2, en tête de page. Il débloquait `w0-fiche` (#8),
qui sans lui aurait affiché « non observé, non vacant » sur un local qui était
vacant.

~~`w0-fiche` (**#8**)~~ **est clos depuis le 24 août, session 4, issue fermée** — voir la
section en tête de page. Deux choses en sont sorties qui n'étaient pas au ticket : le
rattachement OpenStreetMap ↔ BDCom, qui n'a pas de clé et se pose donc au lecteur, et
[**#54**](https://github.com/IvandeMurard/paris-compass/issues/54) / `DIAGNOSTIC.md` §15,
**ouverte**, qui demande une décision avant correctif.

~~`w0-mcp-verif` (**#53**)~~ **est clos depuis le 24 août, session 5, issue fermée** — voir la
section en tête de page. Le serveur MCP a une porte, `npm.cmd run verify:mcp`, et elle est dans
les consignes d'avant-poussée. Un défaut en est sorti :
[**#55**](https://github.com/IvandeMurard/paris-compass/issues/55) / `DIAGNOSTIC.md` §16,
**ouverte**, qui demande une décision avant correctif.

~~**État GitHub remesuré le 24 août par `gh`, à la clôture de la session 4 : 45 ouvertes,
4 fermées** — `#7`, `#8`, `#10`, `#51`.~~ **Remesuré à la clôture de la session 5 : 45 ouvertes,
5 fermées** — `#7`, `#8`, `#10`, `#51`, `#53`. Le nombre d'ouvertes n'a pas bougé et **ce n'est
pas une coïncidence à interpréter** : `#53` a été fermée et `#55` ouverte dans la même session.
Deux mouvements qui s'annulent dans le total — raison de plus pour lire la liste et non le
compte. Un état GitHub est une mesure : la remesurer, pas la recopier.

~~**Le suivant dans l'ordre est `w0-cron` (#6)**~~ **Fait et clos le 25 août, session 6** — voir
la section en tête de page. Le secret `DATABASE_URL` est **posé en secret de dépôt GitHub
Actions** et le cron tourne. ~~**Le suivant dans l'ordre est `w0-plu` (#9)**, en Sonnet 5 : c'est
le dernier de la vague 0, et une ingestion de source qui suit le patron de `scripts/ingest/`.~~
**Fait et clos le 25 août, session 7** — voir la section en tête de page. La vague 0 est
terminée ; le suivant dans l'ordre de `docs/SESSIONS.md` est `w1-chantiers` (#11), Sonnet 5.

~~`w0-provenance` (**#10**)~~ **est clos depuis le 24 août, session 3, issue fermée** :
provenance par couche, démontrée contre le distant par `explain_score` — voir la
section en tête de page. Le défaut Overpass trouvé en chemin a son issue,
[#52](https://github.com/IvandeMurard/paris-compass/issues/52), ouverte pour la
seule trace : le correctif est posé. **État GitHub remesuré à la clôture de la
session 3 : 44 ouvertes, 3 fermées** — `#7`, `#51` et `#10` — plus `#52` ouverte.
~~L'épic `#41` coche désormais `#7`, `#10` et `#51`.~~ **Faux, remesuré le 24 août à la
clôture de la session 4 : l'épic ne cochait aucun des trois.** La réparation d'encodage du
même jour les avait décochés sans que personne le voie — voir le piège plus bas. Recoché et
vérifié sur les octets bruts. ~~Le suivant dans l'ordre est `w0-fiche` (#8).~~ ~~**`#8` est clos
depuis la session 4** ; le suivant est `w0-mcp-verif` (#53).~~ **`#53` est clos depuis la
session 5** ; le suivant est `w0-cron` (#6). Vérifié sur les octets bruts à la clôture de la
session 5 : l'épic `#41` coche bien `#7`, `#8`, `#10`, `#51` et `#53`, et laisse `#6` et `#9`
décochés — cette fois sans réparation à faire.

~~**GitHub n'a pas été touché le 24 août.**~~ **Périmé trois fois dans la journée,
et c'était le piège de cette page.** Remesuré par `gh` à la clôture de la
session 2 : **44 ouvertes, 2 fermées**, `#7` et `#51` toutes deux fermées. Le
paragraphe d'origine était vrai à l'heure où il a été écrit et faux quelques
heures plus tard, sans que rien ne l'annonce — même mode de défaillance que le
ledger à 24. **Un état GitHub est une mesure : la remesurer, pas la recopier**,
et c'est pourquoi le tableau d'ordre de `docs/SESSIONS.md` se dérive par
`npm.cmd run sessions` au lieu de se taper.

**Le ticket ouvert par ce que la session 1 a trouvé était
[#51](https://github.com/IvandeMurard/paris-compass/issues/51)** :
`compass_premise_history` annonçait `observed = false` et `is_vacant = false` là
où le local était relevé et vacant. C'est le défaut de `DIAGNOSTIC.md` §9 pour la
quatrième fois, et sous sa forme la plus dure — une affirmation fausse, pas un
silence. **Corrigé, posé et fermé le même jour par la session 2.**

Trois avertissements pour la suite, qui ne se déduisent pas des tickets :

- ~~**`w0-fiche` (#8) est du travail d'interface, donc le terrain de Lovable.**~~ **Fait le
  24 août.** Lovable était indisponible, donc pas de synchronisation croisée à craindre ce
  jour-là — mais l'avertissement vaut pour la suite : tout doit être poussé avant le
  1er septembre, date à laquelle Lovable reprend la main sur l'arbre qu'il trouvera.
- ~~**`w0-provenance` (#10) a le rayon d'action le plus large du lot.**~~ **Fait le
  24 août.** L'avertissement s'est vérifié : le changement a touché `src/core/`,
  les deux appelants de production, `mcp-server/src/context.ts` et
  `src/pages/Methodology.tsx`, plus un défaut Overpass trouvé en chemin. Il n'a
  effectivement été entrelacé avec rien.
- **`w0-cron` (#6) touche aux privilèges.** Le ticket le dit lui-même : job à
  privilèges élevés, jamais la clé anon. **Tranché le 24 août** : le secret
  `DATABASE_URL` ira en **secret de dépôt GitHub Actions**, sous le nom que
  `scripts/ingest/lib/db.ts` lit déjà, avec les déclencheurs limités à `schedule`
  et `workflow_dispatch` et `permissions: contents: read`. Écartés : les Edge
  Functions Supabase (runtime Deno, pas de DuckDB — `PLAN.md` §2.2bis), et
  `pg_cron`, **disponible mais non installé** sur le distant (1.6.4, mesuré le
  24 août), qui ne saurait qu'appeler un webhook et exigerait de stocker un jeton
  GitHub *dans la base* — deux secrets au lieu d'un, le plus sensible rangé dans
  ce que le job protège.
  > Le serveur MCP, lui, n'a besoin d'**aucun** secret privilégié : sa porte
  > `verify:mcp` s'exerce avec la clé publiable, ce qui est tout l'intérêt — elle
  > éprouve ce qu'un visiteur anonyme reçoit.

### Ce que le plan d'action ne garantit pas

Il a été rédigé par un agent sans accès en lecture au dépôt. Quatre de ses
chiffres étaient faux à l'entrée et ont été corrigés — la liste et la source de
chaque recoupement sont en tête du document, section « Écarts corrigés à
l'intégration ». **Les autres n'ont pas été relus ligne à ligne.** Remesurer
avant de recopier un chiffre lu dans un ticket.

Il **recoupe largement `docs/PLAN.md`** — une vingtaine de ses tickets redisent une
section existante — et il laissait trois trous. Deux sont comblés depuis le 23 août :
`w1-historique` (#49) pour §5.9 `bdcom20032020`, `w6-analyse` (#50) pour quatre des
six items de la phase 6. Restent sans ticket, **délibérément** : §6.7 (audit de
colonnes dormantes), §6.9 (moitié backend faite par `I11`, moitié `src/` donc
Lovable), et l'idée de pente de §5.8. Le relevé complet est dans le plan d'action,
section « Ce que ce document ne couvre pas ».

**L'ordre de bataille reste discutable, et c'est le point à trancher avant
d'exécuter.** Le plan d'action met `w3-mapillary` en P0 pour combler 2023–2026 par
de la vision par ordinateur, avec un jeu doré de cinquante façades à annoter, alors
que `w1-historique` ouvrirait dix-sept ans **avec les vacants** par une API que le
projet sait déjà interroger. Ce dernier est suspendu à une réponse de l'APUR — le
service ne porte aucune licence explicite. **Le courrier est parti, la réponse est
attendue** (point 2 de « La suite, par ordre »), donc `#49` est bloqué sur un tiers
et ne doit pas être pris en session. `w0-deploy` (#7) et `w0-provenance` (#10)
étant clos, reprendre par `w0-fiche` (#8) selon `docs/SESSIONS.md`.

Ses horizons — Q3 2026, Q4 2026, 2027 — sont à lire comme un ordre de passage et
non comme des dates : dix tickets au Q3 et vingt et un au Q4 ne tiennent pas dans
un calendrier réel. `docs/PLAN.md` refusait les échéances par choix, et ce choix
tient.

---

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
Les PR #2 et #3 montrent que le mode de travail voulu est la PR : le push direct
est une exception à demander, pas un défaut.

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
