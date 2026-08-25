# [P0] w1-terrasses — Terrasses et étalages autorisés

**ID** `w1-terrasses` · **vague 1** · **Q3 2026** · **P0**
**Dépend de** `w0-fiche`
**Sources** `terrasses`

## Pourquoi
Pour un café, c'est binaire : une terrasse est-elle déjà autorisée sur cette façade ?

## Comment
opendata.paris.fr/terrasses-autorisations, géolocalisé. Rattacher à l'adresse / au linéaire. Signal de vitalité et réponse d'exploitation.

## Doctrine
Fait administratif, measured. Ne pas en déduire un CA terrasse.

## Fait quand
La fiche restauration affiche oui/non/inconnu terrasse, avec le type (permanente, estivale) et la source.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Fait le 25 août 2026 — le critère est démontré par un appel anonyme réel, sur les trois états

**Issue [#15](https://github.com/IvandeMurard/paris-compass/issues/15)**, session 9. `PLAN-ACTION-VACANCE.md`
notait une contradiction assumée avant ce ticket : `PLAN.md` §5.4 classe les sources d'appoint
« à vérifier avant engagement, aucune n'a été confirmée », alors que ce ticket était en P0 avec
un critère définitif — « la vérification reste un préalable non écrit du ticket ». C'est par là
que la session a commencé.

### La source, vérifiée avant tout engagement

`terrasses-autorisations`, Direction de l'Urbanisme, ODbL. Mesuré le 25 août : **24 204 lignes**,
10 sans `typologie` du tout (ignorées, rien à classer). Le jeu ne publie **aucune cadence de mise
à jour** dans sa description (contrairement à `chantiers-perturbants`) et **aucun champ de date
ou de statut** — une autorisation qui a expiré n'est distinguable d'une autorisation active nulle
part dans le schéma. C'est un manque déclaré, pas une mesure : consigné dans la cadence `rare` et
sa note, plutôt que passé sous silence.

**Le type (permanente/estivale) n'a pas de table de codes**, contrairement à
`chantiers-perturbants`. La page réglementaire de paris.fr liée par le jeu tranche : « Les
terrasses estivales sont autorisées pour 7 mois chaque année, du 1er avril au 31 octobre »,
contre la « terrasse annuelle » pour le reste — l'« annuelle » du texte officiel est le
« permanente » du ticket. `categorie` est dérivée du texte `typologie` lui-même (`ESTIVALE`,
`(É)TALAGE`, sinon `permanente`), jamais inventée.

### Le rattachement par proximité a été mesuré, puis rejeté

Mesuré avant d'écrire l'attache : sur un échantillon aléatoire de 2 000 points, le local BDCom
le plus proche d'une terrasse est à une médiane de **4,4 m** (p90 10,7 m, p99 22 m) — assez
serré pour donner confiance dans un rattachement par proximité, à la manière de `w0-plu` et
`w1-chantiers`. **Un contrôle sur 12 terrasses nommées a dit l'inverse** : « LE MANDARIN DE
CHOISY » a pour local BDCom le plus proche, à 9 m, l'enseigne « PICARD » (un surgelé) ; « LEON DE
BRUXELLES » à 9,5 m pointe sur « MAN COCO ». Un tiers de l'échantillon pointait sur le mauvais
commerce — exactement le piège déjà documenté dans
[`src/services/compass/premiseHistory.ts`](../../src/services/compass/premiseHistory.ts) pour le
rattachement OpenStreetMap ↔ BDCom : le plus proche n'est pas la même vitrine dès que plusieurs
locaux se partagent une adresse ou un pas de porte.

**Le rattachement se fait donc par adresse**, en réutilisant la clé de rue déjà posée pour
BODACC (`compass_bodacc_street_key`, `20260809000002_bodacc_address_matching.sql`) plutôt qu'en
la réinventant : les deux sources écrivent le même vocabulaire de voie en toutes lettres et
accentué (« AVENUE DE CHOISY »), là où BDCom écrit « AV CHOISY ». L'adresse brute du jeu
(« 125 AVENUE DE CHOISY ») est parsée en numéro + type de voie + nom
(`scripts/ingest/terrasses.ts`, `parseAddress`) — mesuré sur l'export complet : **24 145 des
24 204 adresses se parsent (99,8 %)**, le reste étant sans numéro du tout ou franchement corrompu
(une adresse électronique trouvée dans le champ adresse).

**Trois états, pas deux — la question posée au lecteur plutôt qu'une réponse calculée pour
lui.** Mesuré sur les 24 145 adresses parsées : **4 295 adresses distinctes** rattachent à
**exactement un** local BDCom, **7 500** à **plusieurs** (69 % des locaux partagent un numéro de
rue, `PLAN.md` §3.3, et ce jeu ne fait pas exception), **2 625** à aucun. Une adresse partagée ne
dit pas *lequel* des locaux colocalisés porte l'autorisation — `terrasse_status` répond
`'inconnu'` plutôt que d'en tirer un au hasard, le même principe que `premiseHistory.ts` applique
déjà au rattachement OSM ↔ BDCom.

### Le critère, joué contre le distant, clé publiable seule, aucune chaîne `DATABASE_URL`

`compass_premises_within`, étendue de quatre colonnes
(`20260825000010_premises_within_terrasses.sql`), sur les trois états :

| Appel | `terrasse_status` | Détail |
| --- | --- | --- |
| `p_lat=48.8383872, p_lng=2.2982311` — **86 RUE ABBE GROULT** | **`oui`** | adresse non partagée, `terrasse_permanente: true` |
| `p_lat=48.8431196, p_lng=2.3419733` — **7 RUE ABBE DE L'EPEE** | **`inconnu`** | adresse partagée entre plusieurs locaux, `terrasse_estivale: true` |
| `p_lat=48.8539344, p_lng=2.3359628` — **1 RUE ABBAYE** | **`non`** | aucune autorisation sur cette adresse |

Chargé : **24 194** lignes (10 ignorées), rattachées à **4 295** locaux `oui` et **19 311**
locaux `inconnu` (des locaux, pas des adresses — 7 500 adresses partagées se répartissent sur
~2,6 locaux chacune en moyenne).

### Ce qui n'est pas fait, et pourquoi c'est le bon arrêt

**Aucun test unitaire n'a été ajouté** pour `parseAddress`/`categorie`, alors que ce sont les
premières fonctions de parsing de texte de tout `scripts/ingest/` — délibéré : aucun autre
chargeur (`bdcom.ts`, `geography.ts`, `plu.ts`, `chantiers.ts`) n'a de test unitaire, la
discipline établie est la mesure ad hoc (comptage, contrôle manuel sur échantillon) plus la porte
`eval`. Introduire un test unitaire pour ce seul fichier aurait rompu la cohérence du dossier
sans que le ticket ne le demande. La mesure elle-même (99,8 % parsé, contrôle manuel de
12 échantillons) est consignée ci-dessus et rejouable depuis les commentaires du code source.

**SIRET n'a pas servi au rattachement**, bien que présent sur 96 % des lignes. Croiser un SIRET
de ce jeu à un local BDCom demanderait de passer par SIRENE, exactement l'inférence que
`docs/SESSIONS.md` qualifie de « plus difficile du backlog » pour `w1-survie` — hors du
périmètre d'une ingestion droite. Le champ est conservé dans `terrasse_autorisation.siret` pour
qu'un chantier futur n'ait pas à retélécharger la source.

**Le front-end ne consomme aucun des nouveaux champs**, même arbitrage que PLU et chantiers :
`premiseHistory.ts` ne les mappe pas sur `PremiseCandidate`, et Lovable est indisponible jusqu'au
1ᵉʳ septembre.

**Le chargeur n'est pas câblé sur le cron**, comme PLU et chantiers avant lui — cadence `rare`
dans `ingestion_run`, chargeable seulement à la main.

### Portes

`typecheck` ✓ · **108 tests** ✓ (inchangé, voir « aucun test unitaire ajouté » ci-dessus) ·
`build` et `build:dev` ✓ · `eval` — 20/20 invariants, 8/8 cas dorés, composition de fiabilité
stable à 57,26 %. Sort avec le code 3 (`AVERTISSEMENT`), pas 0 : dix écarts de baseline sous le
seuil bloquant, la même dérive naturelle BODACC/SIRENE déjà notée aux clôtures précédentes —
`scripts/eval/run.ts` distingue `ÉCHEC` (code 1, `failures > 0`) d'`AVERTISSEMENT` (code 3,
`warnings > 0` seul) ; c'est le second, pas le premier. `verify:mcp` non relancée : ce ticket ne
touche ni `src/core/` ni `mcp-server/`.

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260825000009_terrasse_autorisation.sql` | Table `terrasse_autorisation`, rattachement dénormalisé sur `premise_location`, septième ligne `ingestion_run` |
| `supabase/migrations/20260825000010_premises_within_terrasses.sql` | `compass_premises_within` étendue de quatre colonnes terrasse |
| `scripts/ingest/terrasses.ts` | Chargement, parsing d'adresse, rattachement à trois états |
| `scripts/ingest/lib/db.ts` | `IngestionSource` gagne `'terrasses'` |
| `src/types/database.ts` | Signature de `compass_premises_within` à jour |
| `docs/PLAN-ACTION-VACANCE.md` §5.4 | Contradiction résolue, fait le 25 août consigné |
