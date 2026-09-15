/**
 * The scoring core. Pure functions: no React, no fetch, no Leaflet, no DOM.
 *
 * Everything here takes plain data in and returns provenance-carrying values out, which
 * is what lets the same code serve three consumers: the browser, a test runner, and the
 * MCP server an agent talks to.
 *
 * Formulas and constants are the ones published on the Methodology page. If one changes
 * here, it changes there.
 */

import { GridIndex, boundsCoverRadius, clamp, distanceM, type BBox, type Point } from './geo';
import {
  combineOrigins,
  unavailable,
  withValue,
  type Measured,
  type Origin,
} from './provenance';

export type AmenityCategory =
  | 'schools'
  | 'healthcare'
  | 'groceries'
  | 'parks'
  | 'transit';

export interface Amenity extends Point {
  category: AmenityCategory;
}

export interface Road extends Point {
  /** Relative acoustic weight of the road class. */
  weight: number;
}

export interface PremisePoint extends Point {
  status: 'vacant' | 'occupied';
}

/**
 * The families of MERCHANT service a ground-floor survey can tell apart — w6-amenites-corpus.
 *
 * They are BDCom's own `niv18` groups, regrouped and not invented: `alimentaire` is group 102,
 * `soins` is 104 (Santé-Beauté), `restauration` is 111 (Café et Restaurant), `demarches` is
 * 108 and 109 (Service aux particuliers, Agence), `culture` is 106 (Culture et loisirs). The
 * mapping itself is `serviceFamilyOf` below, so a code that changes group changes family in
 * one place.
 *
 * **What is deliberately NOT a family, and it is the whole doctrine of this axis.** BDCom
 * knows commerce and nothing else: no school, no post office, no public facility. The groups
 * left out — 101 Grand magasin, 103 Equipement de la personne, 105 Equipement de la maison,
 * 107 Bricolage-Jardinage, 110 Auto-Moto, 112 Hôtel — are merchant but they are not what
 * somebody walks to on an ordinary day; a clothes shop is a destination, a baker is a service.
 * Both exclusions are judgements and both are written down rather than buried in a filter.
 */
export type ServiceFamily = 'alimentaire' | 'soins' | 'restauration' | 'demarches' | 'culture';

/** A surveyed merchant premise, carrying the family it belongs to. */
export interface ServicePoint extends Point {
  family: ServiceFamily;
}

/**
 * The families of data a context carries, each loaded independently by the caller.
 *
 * **Five since w6-amenites-corpus, and the two new ones are the point of that ticket.** Until
 * 15 September 2026 three bearing axes of six — footfall, transit, walkability — read
 * `amenities`, a layer with exactly one source: Overpass. A mirror that would not answer
 * therefore took the verdict down whatever else had arrived, which is what
 * `/contexte/rue-de-bretagne-paris` did in production: one finding of six, and a refusal.
 *
 * `services` (APUR's BDCom survey, by activity code) and `stations` (Île-de-France Mobilités'
 * rail stops) give those axes an origin inside the corpus. Overpass stays, and stays useful:
 * it is the only layer that knows the NON-merchant — schools, healthcare, parks — which a
 * commercial survey cannot see and which `w2-bpe-marches-velo` (#17) exists to supply properly.
 */
export type Layer = 'amenities' | 'roads' | 'premises' | 'services' | 'stations';

/**
 * Where each layer came from — one `Origin` per layer, not one for the whole result.
 *
 * The single-`Origin` signature this replaces was a lie waiting to happen, and it had
 * already happened: the MCP server loads amenities and roads from Overpass but premises
 * from APUR's BDCom survey, and stamped "OpenStreetMap via Overpass, ODbL" on all three.
 * A licence is not a decoration — mislabelling APUR data as ODbL misinforms whoever
 * redistributes it.
 *
 * Required for every layer, including layers the caller did not load: a figure that is
 * missing still has to say which source it is missing *from*, otherwise `missingReason`
 * is the only thing a caller has and it names no dataset.
 */
export type LayerOrigins = Readonly<Record<Layer, Origin>>;

/**
 * Every layer from the same place — the honest shape when it is genuinely true.
 *
 * Still true of `/carte`, whose three layers all come out of one Overpass snapshot
 * (`src/services/opendata/scoring.ts`). It stopped being true of `/contexte/:slug` on
 * 14 September 2026: that sheet reads premises from `compass_scoring_context_within`
 * and amenities and roads from Overpass — w6-fiche-corpus (#157) — so it builds its
 * `LayerOrigins` a layer at a time, as the MCP server has since 15 August. The type is
 * what made the difference visible rather than assumed.
 */
export function uniformOrigins(source: Origin): LayerOrigins {
  return {
    amenities: source,
    roads: source,
    premises: source,
    services: source,
    stations: source,
  };
}

/**
 * A caveat the CALLER knows and the core cannot derive, one per layer.
 *
 * There is exactly one thing this exists for today and it is worth naming rather than
 * generalising: a premises layer can arrive **truncated**. `compass_scoring_context_within`
 * matches every premise in the radius and PostgREST hands back at most `db-max-rows`, so a
 * caller can receive a thousand rows out of seventeen thousand. Measured on 14 September 2026
 * at rue de Bretagne, BDCom 2023: 920 of 920 at 400 m, 1 000 of 1 981 at 600 m, 1 000 of
 * **17 190** at 2 000 m. The core cannot see this — it is handed an array, and an array is all
 * it has — so the count would come back as a total when it is a floor.
 *
 * The caller that made the request is the only code that holds both numbers, which is why the
 * note is passed in rather than inferred, and why it is a `note` rather than an absence: a
 * floor is a real reading, and dropping it would lose more than it protects. Same discipline as
 * `TRUNCATED` below, which says the same thing about geographic coverage.
 */
export type LayerNotes = Partial<Record<Layer, string>>;

/** Everything the core needs to score a location. Assembled by the caller, never fetched here. */
export interface NeighbourhoodContext {
  amenities: readonly Amenity[];
  roads: readonly Road[];
  premises: readonly PremisePoint[];
  /** Surveyed merchant premises, typed by family — the `services` layer. */
  services: readonly ServicePoint[];
  /**
   * Metres to the nearest IDFM rail stop — the whole of the `stations` layer.
   *
   * `null` means the layer LOADED and found none inside the radius it was asked for, which is
   * a real reading and not an absence: measured 15 September 2026, the Bois de Vincennes has
   * no rail stop within 800 m and that is a true statement about the place. A layer that did
   * not load says so through `loaded`, never through this field — the same rule that forbids
   * an empty array from meaning « nothing here ».
   */
  nearestStationM: number | null;
  /**
   * Geographic extent the context actually covers. When present, the core checks whether a
   * search radius fits inside it and degrades the figure when it does not.
   */
  bounds?: BBox;
  /**
   * Which layers the caller actually loaded.
   *
   * Required, and deliberately not inferred from array length, because an empty array is
   * ambiguous: it means "nothing here" for a layer that loaded, and "we do not know" for
   * one that did not. Those two must not produce the same score — a road layer that failed
   * to load would otherwise score as silence, which is an assertion drawn from an absence.
   * Only the caller can tell them apart, and the core stays pure by refusing to guess.
   */
  loaded: readonly Layer[];
}

/** Radius used for amenity counting — roughly a ten-minute walk. */
export const AMENITY_RADIUS_M = 800;
/** Radius used for the footfall proxy. */
export const FOOTFALL_RADIUS_M = 400;
/** Radius beyond which a road no longer contributes to the noise proxy. */
export const NOISE_RADIUS_M = 500;

/** Saturation constants, per amenity family. The first few matter most; the eleventh barely. */
export const SATURATION: Record<AmenityCategory, number> = {
  schools: 8,
  healthcare: 14,
  groceries: 18,
  parks: 7,
  transit: 25,
};

/**
 * Saturation constant of the premises count, shared by `density` and by the premises half of
 * the footfall proxy.
 *
 * One constant rather than two, because the two figures count the same things in the same
 * radius and must agree: written twice they are two numbers to keep equal, which is how they
 * diverge. It was a literal `90` inside `footfall` until `density` needed it too.
 */
export const PREMISE_SATURATION = 90;

/**
 * **What 90 costs `density`, measured rather than left to be discovered** — `DIAGNOSTIC.md` §52.
 *
 * It was sized for the premises HALF of the footfall proxy, where it carries 65 % of a blend.
 * Standing alone it reaches 100 at 415 premises, which any commercial Paris street clears.
 * Measured at 400 m on 14 September 2026: Les Halles 1 200 premises, rue de Bretagne 920,
 * Belleville 404 — all three read 99 or 100. Six of twelve sampled points do. The axis separates
 * a park from a street; it does not separate Belleville from Les Halles.
 *
 * It is left alone deliberately. The constant is shared with footfall and PUBLISHED on the
 * methodology page, so moving it changes a figure on an axis this ticket does not treat; and
 * choosing 200 or 400 off twelve points would be choosing a number because the table looks
 * better. What the axis bears — availability when the mirrors die, and refusal outside the
 * corpus — holds at any constant. The decision is Ivan's, and §52 states it.
 */

/** Weights of each family inside the walkability composite. Must sum to 1. */
export const WALKABILITY_WEIGHTS: Record<AmenityCategory, number> = {
  schools: 0.15,
  healthcare: 0.2,
  groceries: 0.3,
  parks: 0.15,
  transit: 0.2,
};

/**
 * Radius the merchant-service families are counted in — w6-amenites-corpus.
 *
 * `FOOTFALL_RADIUS_M` and not `AMENITY_RADIUS_M`, for a measured reason and not a tidy one:
 * the survey is fetched through PostgREST, which caps a response at a thousand rows, and at
 * 400 m three of twelve sampled Paris points already exceed it (Les Halles 1 000 of 1 136,
 * Montorgueil 1 000 of 1 171, Saint-Germain 1 000 of 1 310 — measured 15 September 2026). At
 * 800 m every central point would be a floor. Four hundred metres is also the five-minute walk
 * the axis claims to describe, so the constraint and the meaning agree here — which is luck,
 * and is written down so the next person does not read it as design.
 */
export const SERVICE_RADIUS_M = FOOTFALL_RADIUS_M;

/**
 * Saturation constant per merchant family, and how each number was obtained.
 *
 * **Not copied from `SATURATION`, and that is the ticket's first lesson.** Those constants size
 * an OpenStreetMap count, where a volunteer has tagged what a volunteer bothered to tag: 18 for
 * groceries. BDCom is a door-to-door survey of every ground-floor commercial unit in Paris, and
 * it finds 87 food shops inside 400 m on rue de Bretagne alone. Reusing 18 would read 100 in
 * every one of the twelve points sampled — an axis that answers the same thing everywhere,
 * which is exactly the defect `DIAGNOSTIC.md` §52 already records against `PREMISE_SATURATION`.
 *
 * **Each constant is the family's own measured median divided by ln 2**, which is the value
 * that puts a median Paris address at 50 and therefore leaves half the scale on each side of
 * it. Medians over twelve points on 15 September 2026, radius 400 m, vintage 2023: alimentaire
 * 70, soins 37, restauration 149, demarches 130, culture 42 → 100, 55, 215, 190, 60 after
 * rounding.
 *
 * **What twelve points cannot settle**, said here rather than discovered later: the sample is
 * deliberately spread (Les Halles and Montorgueil at one end, Bercy and the Bois de Vincennes
 * at the other) but it is twelve, not eighty quartiers. The constants are the right ORDER of
 * magnitude and the resulting axis separates Auteuil (32) from Montorgueil (64) where `density`
 * reads 97 against 100 — that is the property this axis was built for. A re-derivation over the
 * whole corpus is a better number and nobody's blocker.
 */
export const SERVICE_SATURATION: Record<ServiceFamily, number> = {
  alimentaire: 100,
  soins: 55,
  restauration: 215,
  demarches: 190,
  culture: 60,
};

/**
 * Weights of each family inside the merchant-services composite. Must sum to 1.
 *
 * Derived from `WALKABILITY_WEIGHTS` rather than re-invented, so the change is readable as a
 * change: `groceries` 0.30 becomes `alimentaire` 0.30 and `healthcare` 0.20 becomes `soins`
 * 0.20, both unchanged. The 0.50 that `schools`, `parks` and `transit` held is redistributed
 * onto the two families a survey reveals and a volunteer map does not — `restauration` and
 * `demarches` at 0.20 each — with 0.10 to `culture`, which is the family whose membership is
 * the most elastic (group 106 runs from a bookshop to a tanning salon) and therefore the one
 * that should move a composite the least.
 *
 * Schools and parks are not re-weighted away because they stopped mattering. They are gone
 * because BDCom cannot see them at all, and the honest place for them is the INSEE BPE —
 * `w2-bpe-marches-velo` (#17). Until it lands, this axis is blind to the non-merchant and the
 * interface says so.
 */
export const SERVICE_WEIGHTS: Record<ServiceFamily, number> = {
  alimentaire: 0.3,
  soins: 0.2,
  restauration: 0.2,
  demarches: 0.2,
  culture: 0.1,
};

/**
 * Characteristic distance of the rail-access decay, in metres.
 *
 * `FOOTFALL_RADIUS_M`, so the number is a radius this product already publishes rather than a
 * knob tuned until the table looked right: at exactly one walking radius from a stop the score
 * is 100·e⁻¹ = 37. Measured over the same twelve points on 15 September 2026, nearest-stop
 * distances ran 14 m (Belleville) to 375 m (Batignolles) with a median of 127 m, and the
 * resulting axis spans 39 to 97 — a real spread on a city where rail is dense everywhere.
 */
export const TRANSIT_DECAY_M = FOOTFALL_RADIUS_M;

/** Saturating score: n items mapped onto 0-100, with diminishing returns. */
export function saturating(count: number, saturation: number): number {
  return clamp(Math.round(100 * (1 - Math.exp(-count / saturation))));
}

/**
 * Decaying score: a DISTANCE mapped onto 0-100, nearer being better.
 *
 * The mirror image of `saturating`, and deliberately the same shape: both are exponentials
 * with one characteristic constant, so a reader who has understood one has understood the
 * other. A linear « 100 minus distance over radius » would have been a second formula family
 * on the methodology page for no gain.
 */
export function decaying(distanceM: number, characteristicM: number): number {
  return clamp(Math.round(100 * Math.exp(-distanceM / characteristicM)));
}

/**
 * The merchant family a BDCom `niv18` activity group belongs to, or `null` when it is not one.
 *
 * Pure and in `src/core` on purpose: the decision of what counts as a service reachable on
 * foot is doctrine, not plumbing, and putting it in the fetch layer would hide it from every
 * test that does not go through the network.
 */
export function serviceFamilyOf(niv18: number | null | undefined): ServiceFamily | null {
  switch (niv18) {
    case 102:
      return 'alimentaire';
    case 104:
      return 'soins';
    case 111:
      return 'restauration';
    case 108:
    case 109:
      return 'demarches';
    case 106:
      return 'culture';
    default:
      return null;
  }
}

export interface AreaScores {
  /**
   * How many commercial premises stand within `FOOTFALL_RADIUS_M` — the one figure that reads
   * the premises layer and nothing else.
   *
   * It exists because of what that buys: on the sheet the premises layer is APUR's BDCom
   * survey and the other two are Overpass, so this is the finding that survives three dead
   * mirrors. Footfall cannot — it mixes premises with transit access, so a silent Overpass
   * takes it down with everything else, which is precisely how a sheet built on a free public
   * mirror ends up saying nothing (w6-fiche-corpus, #157).
   *
   * It is a count of premises, not of businesses and not of vacancies: BDCom records a
   * surveyed ground-floor commercial unit, and the caller must say which vintage's scope that
   * is. On the 2023 vintage it is retail and commercial services only.
   */
  density: Measured<number>;
  /**
   * **Merchant services reachable on foot** — the axis that replaces `walkability` on the
   * context sheet, w6-amenites-corpus, decided by Ivan on 14 September 2026.
   *
   * It is a different NAME because it counts a different population, and that is the whole
   * reason it exists rather than being a re-sourcing of `walkability`. OpenStreetMap's
   * « amenities » hold the non-merchant — schools, post offices, public facilities — and BDCom
   * holds none of it. Serving a survey of shops under a label that promised shops *and*
   * schools would be a figure lying about what it counts, which is the one failure
   * `Measured<T>` exists to prevent.
   *
   * `walkability` below is not deprecated by it: that axis is still the honest reading of an
   * Overpass snapshot, and `/carte` — whose three layers all come from one — still shows it.
   */
  services: Measured<number>;
  /**
   * **Rail access**: distance to the nearest Île-de-France Mobilités stop, decayed.
   *
   * It replaces the amenity-counted `transit` on the context sheet. Two changes of claim come
   * with it and both are stated on the methodology page: it is a DISTANCE and no longer a
   * count, and it is RAIL ONLY — metro, RER and tram, the 258 Paris zones d'arrêt of the IDFM
   * référentiel. Buses are not in it. The count it replaces did include them, so this axis is
   * more authoritative on rail and blind where the old one was vague.
   */
  rail: Measured<number>;
  /** Food shops from the SURVEY — the non-bearing axis that replaces `groceries` on the sheet. */
  alimentaire: Measured<number>;
  walkability: Measured<number>;
  schools: Measured<number>;
  healthcare: Measured<number>;
  groceries: Measured<number>;
  parks: Measured<number>;
  transit: Measured<number>;
  footfall: Measured<number>;
  noise: Measured<number>;
}

/** Indexes built once per context and reused across every point scored against it. */
export interface ScoringIndex {
  amenities: GridIndex<Amenity>;
  premises: GridIndex<PremisePoint>;
  services: GridIndex<ServicePoint>;
  roads: readonly Road[];
  nearestStationM: number | null;
  bounds?: BBox;
  loaded: ReadonlySet<Layer>;
}

export function buildIndex(context: NeighbourhoodContext): ScoringIndex {
  return {
    amenities: new GridIndex(context.amenities),
    premises: new GridIndex(context.premises),
    services: new GridIndex(context.services),
    roads: context.roads,
    nearestStationM: context.nearestStationM,
    bounds: context.bounds,
    loaded: new Set(context.loaded),
  };
}

const TRUNCATED =
  'The data covering this point stops before the full search radius, so the count is a floor, not a total.';

/**
 * Why a figure is missing, per layer.
 *
 * These read as full sentences because they are shown, not logged: `missingReason` is what
 * the interface and the MCP layer put in front of a caller in place of the number.
 */
const MISSING = {
  amenities:
    'The amenity layer did not load for this area, so nothing was counted. Nothing counted is not the same as nothing there.',
  premises:
    'The premises layer did not load for this area, so surrounding activity is unknown rather than absent.',
  roads:
    'The road layer did not load for this area, so exposure could not be modelled. This is not a quiet location, it is an unmeasured one.',
  services:
    'The surveyed-services layer did not load for this area, so merchant services on foot are unknown rather than absent. Nothing counted is not the same as nothing there.',
  stations:
    'The rail-stop layer did not load for this area, so distance to the nearest stop is unknown. This is not a location far from transit, it is an unmeasured one.',
} as const;

/**
 * What the rail axis says when the layer answered and found no stop inside the radius.
 *
 * A `note`, never an absence: a point with no rail stop within the search radius has been
 * MEASURED to have none, and turning that into « unknown » would throw away the one reading
 * the layer gives with certainty. Same discipline as an empty premises radius inside Paris.
 */
const NO_STATION_IN_RADIUS =
  'No Île-de-France Mobilités rail stop was found inside the search radius, so this reads zero because none is near — not because the layer is silent.';

function coverageNote(point: Point, radiusM: number, bounds?: BBox): string | undefined {
  if (!bounds) return undefined;
  return boundsCoverRadius(point, radiusM, bounds) ? undefined : TRUNCATED;
}

export function countAmenities(
  point: Point,
  category: AmenityCategory,
  index: ScoringIndex,
  radiusM = AMENITY_RADIUS_M,
): number {
  return index.amenities.within(point, radiusM).filter((a) => a.category === category).length;
}

/**
 * Noise proxy: each major road within 500 m contributes in proportion to its class and
 * decreasingly with distance. Explicitly an estimate — it models exposure from road
 * geometry alone, ignores buildings, and is not a measurement.
 */
export function noiseExposure(point: Point, roads: readonly Road[]): number {
  let exposure = 0;
  for (const road of roads) {
    const d = distanceM(point, road);
    if (d > NOISE_RADIUS_M) continue;
    exposure += road.weight * (1 - d / NOISE_RADIUS_M);
  }
  return clamp(Math.round(exposure * 5));
}

/**
 * Every metric is attributed to the layer or layers it actually reads — never to a single
 * `Origin` covering the whole result. The mapping is fixed and short: the five amenity
 * families and walkability read `amenities`, noise reads `roads`, and footfall reads both
 * `premises` and `amenities`, so it names both.
 */
export function scoreLocation(
  point: Point,
  index: ScoringIndex,
  origins: LayerOrigins,
  /** Caveats only the caller can know — see `LayerNotes`. Absent by default, never invented. */
  layerNotes: LayerNotes = {},
): AreaScores {
  const amenityNote = coverageNote(point, AMENITY_RADIUS_M, index.bounds);
  const hasAmenities = index.loaded.has('amenities');
  const hasPremises = index.loaded.has('premises');
  const hasRoads = index.loaded.has('roads');
  const hasServices = index.loaded.has('services');
  const hasStations = index.loaded.has('stations');

  // Two caveats about one figure are two caveats, not a choice between them. Joined rather
  // than overwritten: a truncated premises layer at the edge of a truncated fetch area is a
  // real combination, and keeping only the last one written would drop whichever the reader
  // most needed.
  const noteOf = (...parts: readonly (string | undefined)[]): string | undefined => {
    const kept = parts.filter((p): p is string => Boolean(p));
    return kept.length > 0 ? kept.join(' ') : undefined;
  };

  const byCategory = {} as Record<AmenityCategory, Measured<number>>;
  const rawByCategory = {} as Record<AmenityCategory, number>;

  for (const category of Object.keys(SATURATION) as AmenityCategory[]) {
    if (!hasAmenities) {
      byCategory[category] = unavailable(origins.amenities, MISSING.amenities);
      continue;
    }
    const count = countAmenities(point, category, index);
    const score = saturating(count, SATURATION[category]);
    rawByCategory[category] = score;
    byCategory[category] = withValue(
      score,
      origins.amenities,
      'derived',
      noteOf(amenityNote, layerNotes.amenities),
    );
  }

  // Every composite below is guarded by the layers it reads. A composite computed from a
  // layer that never loaded would be arithmetic on an assumption, not a derivation.
  const walkability = hasAmenities
    ? withValue(
        Math.round(
          (Object.keys(WALKABILITY_WEIGHTS) as AmenityCategory[]).reduce(
            (sum, category) => sum + rawByCategory[category] * WALKABILITY_WEIGHTS[category],
            0,
          ),
        ),
        origins.amenities,
        'derived',
        noteOf(amenityNote, layerNotes.amenities),
      )
    : unavailable<number>(origins.amenities, MISSING.amenities);

  // Counted once and read twice — by `density`, which is this layer alone, and by the
  // premises half of the footfall proxy. Two walks of the same index would be the same
  // arithmetic written twice, free to drift the day one of them changes radius.
  const occupiedNearby = hasPremises
    ? index.premises.within(point, FOOTFALL_RADIUS_M).filter((p) => p.status === 'occupied').length
    : 0;

  const density = hasPremises
    ? withValue(
        saturating(occupiedNearby, PREMISE_SATURATION),
        origins.premises,
        'derived',
        layerNotes.premises,
      )
    : unavailable<number>(origins.premises, MISSING.premises);

  // ── The corpus services layer: one walk of the index, read by two axes ──────────────────
  // Counted once and reused, the same discipline as `occupiedNearby`: `services` and
  // `alimentaire` count the same points in the same radius, and two walks would be two
  // numbers to keep in step.
  const serviceCounts = {} as Record<ServiceFamily, number>;
  const serviceScores = {} as Record<ServiceFamily, number>;
  if (hasServices) {
    const nearby = index.services.within(point, SERVICE_RADIUS_M);
    for (const family of Object.keys(SERVICE_SATURATION) as ServiceFamily[]) {
      const count = nearby.filter((s) => s.family === family).length;
      serviceCounts[family] = count;
      serviceScores[family] = saturating(count, SERVICE_SATURATION[family]);
    }
  }

  const serviceNote = noteOf(
    coverageNote(point, SERVICE_RADIUS_M, index.bounds),
    layerNotes.services,
  );

  const services = hasServices
    ? withValue(
        clamp(
          Math.round(
            (Object.keys(SERVICE_WEIGHTS) as ServiceFamily[]).reduce(
              (sum, family) => sum + serviceScores[family] * SERVICE_WEIGHTS[family],
              0,
            ),
          ),
        ),
        origins.services,
        'derived',
        serviceNote,
      )
    : unavailable<number>(origins.services, MISSING.services);

  const alimentaire = hasServices
    ? withValue(
        saturating(serviceCounts.alimentaire, SERVICE_SATURATION.alimentaire),
        origins.services,
        'derived',
        serviceNote,
      )
    : unavailable<number>(origins.services, MISSING.services);

  // ── The rail layer: a distance, not a count ─────────────────────────────────────────────
  // A loaded layer that found no stop is a measured zero and says so in its note; a layer
  // that did not load is an absence. Collapsing the two would turn « we did not look » into
  // « there is nothing », which is the assertion-from-absence this module refuses everywhere
  // else.
  const rail = hasStations
    ? index.nearestStationM === null
      ? withValue(0, origins.stations, 'derived', noteOf(NO_STATION_IN_RADIUS, layerNotes.stations))
      : withValue(
          decaying(index.nearestStationM, TRANSIT_DECAY_M),
          origins.stations,
          'derived',
          layerNotes.stations,
        )
    : unavailable<number>(origins.stations, MISSING.stations);

  // Footfall mixes two layers, so it survives only if both are there — and when it does,
  // it is attributed to both. Naming only the premises source would hide that 35 % of the
  // figure is rail access measured by Île-de-France Mobilités.
  //
  // **The transport half moved from `amenities` to `stations` — w6-amenites-corpus.** It was
  // `rawByCategory.transit`, an Overpass count, which is why a dead mirror blanked footfall
  // even though the premises had arrived from the database in 200 ms. Both halves now come
  // from the corpus, and the axis survives an outage entirely.
  let footfall: Measured<number>;
  if (!hasPremises) {
    footfall = unavailable<number>(origins.premises, MISSING.premises);
  } else if (!hasStations) {
    footfall = unavailable<number>(origins.stations, MISSING.stations);
  } else {
    footfall = withValue(
      clamp(
        Math.round(
          saturating(occupiedNearby, PREMISE_SATURATION) * 0.65 + (rail.value ?? 0) * 0.35,
        ),
      ),
      combineOrigins(origins.premises, origins.stations),
      'estimated',
      noteOf(
        'No open pedestrian count exists for Île-de-France. This is a proxy from active-business density and rail access: it compares two locations against each other, it does not predict footfall.',
        layerNotes.premises,
        layerNotes.stations,
      ),
    );
  }

  return {
    ...byCategory,
    density,
    services,
    alimentaire,
    rail,
    walkability,
    footfall,
    noise: hasRoads
      ? withValue(
          noiseExposure(point, index.roads),
          origins.roads,
          'estimated',
          noteOf(
            'Modelled from the proximity and class of major roads only. Buildings, traffic volume and time of day are not taken into account.',
            layerNotes.roads,
          ),
        )
      : unavailable<number>(origins.roads, MISSING.roads),
  };
}

export function scoreLabel(score: number): 'Excellent' | 'Good' | 'Moderate' | 'Low' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

export function noiseLabel(score: number): 'High' | 'Moderate' | 'Low' | 'Very low' {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 15) return 'Low';
  return 'Very low';
}
