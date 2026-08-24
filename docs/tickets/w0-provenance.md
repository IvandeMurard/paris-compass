# [P0] w0-provenance — Provenance par champ, pas un Origin unique OSM

**ID** `w0-provenance` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** —
**Sources** `bdcom`, `osm`

## Pourquoi
Le MCP l'avoue : tout est étiqueté Overpass, même quand la couche vient de BDCom via Supabase.

## Comment
Changer la signature de scoreLocation pour un Origin par métrique. Front et MCP bougent ensemble — c'est le cœur partagé.

## Doctrine
Chaque figure porte source, licence, millésime, méthode, réserve.

## Fait quand
explain_score sur un local BDCom cite APUR, pas OSM, pour l'activité ; OSM reste sur les aménités.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Relevé des appelants de `scoreLocation` — mesuré le 24 août 2026

Établi **avant** toute modification de la signature, par `grep -rn "scoreLocation"`
sur `*.ts` / `*.tsx` hors `node_modules`, puis remontée transitive des enveloppes.
C'est la liste complète : rien d'autre n'appelle la fonction.

### Appelants directs — production (2)

| Fichier | Ligne | Enveloppe | Ce qu'il passait en `origin` |
| --- | --- | --- | --- |
| `src/services/opendata/scoring.ts` | 86 | `computeScores(point, index)` | `OSM_ORIGIN(aujourd'hui)` |
| `mcp-server/src/scorePoint.ts` | 21 | `scorePoint(lat, lng, radiusM, vintageYear)` | `OSM_ORIGIN(aujourd'hui)` |

**C'est le second qui porte le défaut du ticket.** `mcp-server/src/context.ts`
charge les aménités et les routes depuis Overpass, mais les locaux depuis
**BDCom via `compass_scoring_context_within`** — et l'unique `Origin` étiquetait
la couche APUR « OpenStreetMap via Overpass, ODbL ». Le front, lui, charge bien
ses trois couches d'un même instantané Overpass : son `Origin` unique n'était pas
faux, seulement indistinct.

### Appelants transitifs — production (5)

- `computeScores` ← `src/services/opendata/properties.ts:81`, dans
  `fetchPremises(bbox)`, une fois par local (≤ 120) sur un index construit une fois.
  De là : `Premise.scores` → `PropertyCard.tsx`, `useMapLayers.ts`,
  `matchPremise.ts`.
- `scorePoint` ← `mcp-server/src/tools/scoreLocation.ts:48` (outil `score_location`),
  `mcp-server/src/tools/explainScore.ts:56` (outil `explain_score`, celui du critère
  d'acceptation), `mcp-server/src/tools/compareLocations.ts:57-58` (outil
  `compare_locations`, deux appels).

> **Ne pas confondre** `mcp-server/src/tools/scoreLocation.ts` — le fichier de
> l'outil MCP `score_location` — avec `scoreLocation` de `src/core/scoring.ts`.
> Le fichier n'importe pas la fonction : il passe par `scorePoint`.

### Appelants de test (2 fichiers)

- `src/core/scoring.test.ts` — **12 sites d'appel** (l. 155, 164, 179, 193, 202,
  217, 225, 232, 249, 264, 281, 282), tous avec une constante `ORIGIN` locale.
- `src/services/opendata/scoring.test.ts` — `scoreLocation` y est **remplacé par
  un `vi.fn()`** (`vi.hoisted` + `vi.mock('@/core')`). Aucune assertion sur ses
  arguments : ce fichier est insensible au changement de signature.

### Ce qui ne bouge pas

`AreaScores` garde ses huit champs et `Measured<T>` sa forme. Seul le troisième
paramètre change. Les six consommateurs d'affichage (`PropertyCard`,
`useMapLayers`, `matchPremise`, et les trois outils MCP) lisent
`.source` / `.licence` / `.asOf` sans savoir d'où ils viennent — ils affichent
donc la nouvelle attribution sans être touchés.

**Base de départ mesurée le 24 août** : `tsc --build` sans erreur, **73 tests au
vert sur six fichiers**.
