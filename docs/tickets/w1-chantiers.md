# [P0] w1-chantiers — Chantiers de voirie (fait d'exposition)

**ID** `w1-chantiers` · **vague 1** · **Q3 2026** · **P0**
**Dépend de** `w0-fiche`
**Sources** `chantiers`

## Pourquoi
Un restaurateur signe ou non sur « 40 m d'un chantier perturbant, sept. 2026 → mars 2027 ».

## Comment
opendata.paris.fr : historiques 2019–2023 + chantiers-perturbants, polygones. Distance au local, dates déclarées. measured — acte administratif, pas un modèle. Cadence réelle de `chantiers-perturbants` : hebdomadaire, pas quotidienne (voir « Ce qui est démontré » ci-dessous).

## Doctrine
Jamais une prévision d'impact. La phrase, datée, sourcée. L'association chantier→disparition attend l'étude 5.5.

## Fait quand
La fiche d'un local à 40 m d'un polygone perturbant affiche le chantier ; un voisin hors polygone, non.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Fait le 25 août 2026 — le critère est démontré par un appel anonyme réel

**Issue [#11](https://github.com/IvandeMurard/paris-compass/issues/11)**, session 8. **Ce ticket
redit `docs/PLAN.md` §5.1** mot pour mot (« dix-huit mois de travaux devant une vitrine décident
d'un commerce, et personne ne le dit au preneur avant la signature ») ; les deux sont clos
ensemble et se citent l'un l'autre.

### Un chiffre du ticket était faux, trouvé avant d'écrire quoi que ce soit

Le « Comment » dit « chantiers-perturbants quotidien ». Mesuré le 25 août 2026 contre la
description du jeu sur le catalogue opendata.paris.fr lui-même : « Initialisation de la donnée,
Décembre 2016 - **Mise à jour hebdomadaire** ». Quotidien était faux, jamais recoupé contre la
source depuis la rédaction du plan — `docs/PLAN.md` §5.1 et `docs/PLAN-ACTION-VACANCE.md` §5.1
répétaient la même erreur et sont corrigés avec ce ticket. Conséquence directe : aucune des
quatre cadences existantes (`continuous`, `monthly`, `triennial`, `rare`) ne convient sans
mentir — `continuous` sert déjà BODACC pour « publié chaque jour ouvré », un rythme différent —
donc une cinquième, `weekly`, a été ajoutée à l'énumération `ingestion_cadence`
(`20260825000006_chantier_cadence.sql`), dans sa propre migration : Postgres refuse qu'une
transaction utilise une valeur d'énumération qu'elle vient d'ajouter elle-même.

### Ce qui est démontré, et comment

Jeu `chantiers-perturbants`, opendata.paris.fr — « les chantiers principaux ayant un impact sur
la circulation » : perturbent la circulation voiture ou vélo, durent plus d'une semaine, sont
situés sur les voies principales hors périphérique, polygones dessinés à la main par la ville.
Mesuré le 25 août : 121 lignes, 120 avec une géométrie exploitable (une ligne entièrement vide,
`CP003069`, ignorée par `scripts/ingest/chantiers.ts`) — 109 `Polygon`, 11 `MultiPolygon`. ODbL,
comme les autres couches Paris Open Data déjà chargées. Chargé dans
`public.chantier_perturbant` (`20260825000007_chantier_perturbant.sql`).

**Le rattachement, nearest-only dès la première version.** Contrairement au premier jet de
`w0-plu` (many-to-many, sur-attaché ×2,5), le rattachement chantier va directement du local vers
son chantier le plus proche (`distinct on (l.id)`, ordonné par `<->`) — la leçon apprise en dur
là-bas s'applique ici sans avoir eu à la refaire une fois de trop : chaque local pointe vers un
seul chantier, jamais vers plusieurs. Seuil 40 m, la distance nommée par le « Fait quand ».
Mesuré : **1 798 locaux exposés** sur les 120 chantiers chargés.

**Le critère, joué contre le distant, clé publiable seule, aucune chaîne `DATABASE_URL`** —
`compass_premises_within`, étendue de sept colonnes
(`20260825000008_premises_within_chantiers.sql`) :

| Appel | `chantier_exposed` | Détail |
| --- | --- | --- |
| `p_lat=48.8513790, p_lng=2.2730923` — **25 RUE JEAN DE LA FONTAINE** | **`true`** | `chantier_distance_m: 0`, `objet: ENTRETIEN_RESEAU`, `18 mai → 29 oct. 2026`, `en cours` |
| `p_lat=48.8509062, p_lng=2.2715625` — **50 RUE JEAN DE LA FONTAINE** | **`false`** | tous les champs chantier `null` |

Même rue, ~124 m d'écart, verdicts opposés — exactement le « Fait quand ». Vérifié aussi au
seuil lui-même plutôt qu'à une paire éloignée : **7 rue Valentin Hauy, 33,4 m** d'un chantier
proche de la rue César Franck, `chantier_exposed = true` ; **43 avenue de Saxe, 41,8 m** du même
chantier, `chantier_exposed = false` — deux locaux à moins de 9 m l'un de l'autre en distance au
chantier, de part et d'autre des 40 m.

### Ce qui n'est pas fait, et pourquoi c'est le bon arrêt

**Les cinq millésimes historiques (`chantiers-a-paris-copie` à `-copie3`, 2019–2023) ne sont pas
chargés.** Mesurés le 25 août sans être ingérés : 20 073 à 32 201 lignes chacun. Le « Comment »
du ticket les cite, mais le « Fait quand » n'exerce que `chantiers-perturbants`, et
`w7-etude-chantiers` (§5.5), qui dépend de ce ticket, est le seul chantier qui en a réellement
besoin — pour son étude rétrospective 2020→2023. Les charger par anticipation, sans savoir
encore quelle forme cette étude leur donnera, aurait élargi ce chantier bien au-delà de son
critère pour un usage qui n'existe pas encore. Même discipline que `w0-plu`, qui avait laissé le
bandeau d'alerte à Lovable plutôt que de l'anticiper.

**Le front-end ne consomme aucun des nouveaux champs.** `src/services/compass/premiseHistory.ts`
ne mappait déjà pas les champs PLU de `w0-plu` sur `PremiseCandidate` ; les champs chantier n'y
sont pas ajoutés non plus, pour la même raison — c'est un chantier d'ingestion (« Sessions 8 et
9 », `docs/SESSIONS.md`), pas d'interface, et Lovable est indisponible jusqu'au 1ᵉʳ septembre.

**Le chargeur n'est pas câblé dans `.github/workflows/ingestion.yml`.** Chargeable seulement à
la main (`npx tsx scripts/ingest/chantiers.ts`), `run_by = 'manual'` sur sa ligne
`ingestion_run`. `scripts/ingest/workflow.test.ts` continue de vérifier exactement les quatre
plannings existants — inchangé, toujours au vert. Pas demandé par le ticket ; câbler un
cinquième cron aurait élargi ce chantier au-delà de ce que le critère exige, même arbitrage que
`w0-plu`.

**Le serveur MCP n'expose pas l'exposition chantier.** `mcp-server/src/tools/findPremises.ts`
n'exposait déjà pas les champs PLU ; son interface `PremiseRow` reste volontairement en retard
sur ce que la RPC porte réellement, comme pour PLU — aucun risque de rupture (c'est une
assertion de type TypeScript, pas une validation zod du contenu réel), et l'ajouter n'était pas
demandé par ce ticket.

### Portes

`typecheck` ✓ · **108 tests** ✓ (inchangé — aucun test ajouté, ce ticket ne touche aucun code
sous test) · `build` et `build:dev` ✓ · `eval` ✓ (20/20 invariants, 8/8 cas dorés, composition de
fiabilité stable à 57,26 %, dix écarts de baseline sous le seuil d'avertissement — dérive
naturelle de BODACC/SIRENE déjà notée aux clôtures précédentes, sans rapport avec ce ticket).
`verify:mcp` non relancée : ce ticket ne touche ni `src/core/` ni `mcp-server/`.

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260825000006_chantier_cadence.sql` | Ajoute la cadence `weekly` à `ingestion_cadence` |
| `supabase/migrations/20260825000007_chantier_perturbant.sql` | Table `chantier_perturbant`, rattachement dénormalisé sur `premise_location`, sixième ligne `ingestion_run` |
| `supabase/migrations/20260825000008_premises_within_chantiers.sql` | `compass_premises_within` étendue de sept colonnes chantier |
| `scripts/ingest/chantiers.ts` | Chargement + rattachement, patron de `scripts/ingest/plu.ts` |
| `scripts/ingest/lib/parisOpendata.ts` | `datasetModified()` — lit `metas.default.modified` du catalogue, partagé pour w1-terrasses |
| `scripts/ingest/lib/db.ts` | `IngestionSource` gagne `'chantiers'` |
| `src/types/database.ts` | Signature de `compass_premises_within` à jour |
| `docs/PLAN.md` §5.1, `docs/PLAN-ACTION-VACANCE.md` §5.1 | Cadence corrigée (hebdomadaire, pas quotidienne), fait le 25 août consigné |
