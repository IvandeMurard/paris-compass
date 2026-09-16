/**
 * Everything a context page needs for one point — w6-contexte (#119).
 *
 * Two queries, kept apart because they fail apart: the address (BAN) and the neighbourhood.
 * A page can hold a resolved address and no neighbourhood, and that is not an error screen —
 * it is the case the verdict was written to refuse, so it must reach the page intact rather
 * than being swallowed by a thrown query.
 *
 * **The corpus first, Overpass second — w6-fiche-corpus (#157), decided by Ivan on
 * 13 September 2026.** Until 14 September every layer of this page came out of one Overpass
 * snapshot and every axis was stamped `uniformOrigins(OSM_ORIGIN(today()))`: the sheet
 * decorated OpenStreetMap, and the corpus fourteen gate arms were built to guard had no
 * product consumer at all. The premises layer now comes from
 * `compass_scoring_context_within` — APUR's door-to-door survey, dated, licensed and guarded —
 * and only amenities and roads still come from a free public mirror. The inversion is the
 * whole point: a dead mirror now DEGRADES the sheet instead of emptying it, where before a
 * saturated volunteer mirror held a month of traceability work hostage.
 *
 * **Why an unreachable mirror still returns scores.** `scoreLocation` already knows how to
 * produce a figure that says why it is absent: pass it a context whose `loaded` is empty and
 * every axis comes back `unavailable()` with the core's own `missingReason`. Rendering an
 * error page instead would throw that away and put a generic « something went wrong » where
 * the product's whole argument is that it names what is missing. It is also the only path on
 * which the browser can reach the refusal branch of `composeVerdict`, since the Overpass
 * snapshot otherwise carries all three layers or none.
 *
 * **That reasoning was correct and it did not reach the screen — w6-fiche-robuste (#156).**
 * Measured in production on 13 September 2026: the refusal was composed exactly as described
 * above, and then `ContextMap` threw while drawing its support illustration and the error
 * boundary took the whole page, refusal included. The branch that this file exists to make
 * reachable was unreachable in the one case that reaches it. Two things now stand between that
 * measurement and a repeat: the mini-map cannot throw the page away any more
 * (`src/lib/contextMapFrame.ts`), and the wait before this refusal is bounded by
 * `CONTEXT_BUDGET_MS` rather than by how long three saturated mirrors take to expire.
 *
 * **And since w6-fiche-delai (#180) the sheet does not wait for Overpass AT ALL.** One
 * `allSettled` held both halves together, so the page showed nothing until the mirror had
 * finished not answering: measured in production on 15 September 2026 at rue de Bretagne,
 * **10 976 ms** for a verdict whose four bearing axes had landed in one to two seconds. Since
 * `#169`, `VERDICT_AXES` records that the only layer still read on Overpass — `roads`, behind
 * the `noise` axis — is NOT bearing: its absence cannot refuse a conclusion, by construction.
 * A layer that decides nothing therefore no longer holds the page.
 *
 * The two halves are now two queries. `fetchCorpusContext` answers alone and the verdict is
 * composed on it; the Overpass snapshot completes the sheet when it arrives. `noise` is never
 * removed from the screen — it is named as being measured, then carries its value and its
 * source, or « source injoignable ». A page that is faster because it says less would not be a
 * faster page, which is what `w6-fiche-robuste` built and what this ticket must not undo.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AMENITY_RADIUS_M,
  BDCOM_ORIGIN,
  IDFM_ORIGIN,
  M_PER_DEG_LAT,
  SERVICE_RADIUS_M,
  buildIndex,
  mPerDegLng,
  scoreLocationDetailed,
  OSM_ORIGIN,
  type AreaScores,
  type FigureMotif,
  type Layer,
  type LayerNotes,
  type LayerOrigins,
  type NeighbourhoodContext,
  type Origin,
  type PremisePoint,
  type ScoringOperands,
  type ServicePoint,
  type Withholding,
} from '@/core';
import {
  SHEET_RADIUS_M,
  SHEET_VINTAGE,
  STATION_RADIUS_M,
  fetchActivityTransitions,
  fetchCorpusPremises,
  fetchCorpusServices,
  fetchCorpusStation,
  fetchPremisesOrigin,
  fetchStationOrigin,
  withholdingOf,
  type TransitionsVerdict,
} from '@/services/compass/addressCorpus';
import { geocode, type GeocodeResult } from '@/services/opendata/geocoding';
import { fetchOverpassSnapshot, type OverpassSnapshot } from '@/services/opendata/overpass';
import { toNeighbourhoodContext } from '@/services/opendata/scoring';
import type { BBox } from '@/services/opendata/types';

/** Overpass answers with the current state of the map, so the query date is the vintage. */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Provenance of a premises layer whose own metadata could not be read.
 *
 * `scoreLocation` still needs an origin for a layer that never loaded: `unavailable()` stamps
 * it on the missing figure so a reader learns WHICH dataset is silent, not merely that
 * something is. Reached only when `compass_vintages` itself fails — the same stand-in the MCP
 * server uses, written the same way on purpose.
 */
const UNKNOWN_BDCOM: Origin = BDCOM_ORIGIN(
  SHEET_VINTAGE,
  'inconnue — compass_vintages n’a pas pu être lu',
  'inconnu',
);

/** The same stand-in for the rail layer, reached only when `ingestion_run` itself is silent. */
const UNKNOWN_IDFM: Origin = IDFM_ORIGIN('inconnu — ingestion_run n’a pas pu être lu');

/**
 * What the sheet says about a count PostgREST capped.
 *
 * **It was a French sentence until w6-langue-absences (#181), and that was the same defect
 * mirrored.** The core's notes were English on a French page; this one was French, and it
 * reached `/en/context/` in French. Neither caller was wrong about its own reader and both were
 * wrong about the other's, which is what a motif removes: the numbers travel structured, and
 * the sentence is composed once per language by `src/core/motif.ts`.
 *
 * The numbers are still what was actually received, never typed: a literal here would be the
 * unmeasured figure this whole page refuses.
 */
const truncatedNote = (
  layer: 'premises' | 'services',
  rendered: number,
  total: number,
  radiusM: number,
): FigureMotif => ({ kind: 'reponse_plafonnee', layer, rendered, total, radiusM });

/**
 * The box fetched around the point.
 *
 * One walking radius on each side, so the 800 m search is covered in every direction and the
 * core's truncation note stays off. At Paris latitude that is ~0.0144° by ~0.0219°, i.e.
 * ~0.00032 deg² — under the `MAX_BBOX_AREA_DEG2` ceiling that `useOpenData` enforces for the
 * map, which is what keeps the mirrors answering.
 */
export function boxAround(point: { lat: number; lng: number }, radiusM = AMENITY_RADIUS_M): BBox {
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / mPerDegLng(point.lat);
  return {
    south: point.lat - dLat,
    north: point.lat + dLat,
    west: point.lng - dLng,
    east: point.lng + dLng,
  };
}

/**
 * How long the ROAD layer is given before it declares itself unreachable — geste 2 of
 * w6-fiche-robuste (#156), narrowed to one non-bearing layer by w6-fiche-delai (#180).
 *
 * **What it bounds changed; the number did not.** Until #180 it bounded the page's answer: the
 * sheet stayed silent until Overpass had finished. It no longer waits, so this budget now
 * bounds one layer that decides nothing — the one behind `noise`. Keeping it at ten seconds is
 * not an oversight: the figure was already a statement about the reader, and a reader who has
 * held a verdict for eight seconds will not still be waiting on a finding that lands at forty.
 * A second figure to keep true was the price of the other direction, and this ticket declined
 * to pay it.
 *
 * **The number is about the reader, not about Overpass.** Measured in production on
 * 13 September 2026: three mirrors at seventy seconds each, **2 min 20** of « Lecture du
 * quartier en cours… » on `/contexte/rue-de-bretagne-paris` before the sheet could say
 * anything (`DIAGNOSTIC.md` §50). Two minutes is not a slow answer, it is no answer: nobody
 * stays. Ten seconds is the published limit for keeping a reader's attention on a task, and it
 * is the widest bound that is still a statement about the human rather than about how long a
 * saturated mirror takes to give up.
 *
 * **What it costs, measured rather than assumed, and #180 does not buy it back.** On the same
 * day, the one mirror that answered the sheet's real query — `overpass.private.coffee`, 2 188
 * elements, 685 983 octets — took **10 587 ms**. Under this budget that answer is still
 * abandoned 587 ms before it lands. What changed is the price of that abandonment: one
 * non-bearing finding reading « source injoignable », where it used to be the whole page
 * withheld for nine seconds from every reader.
 *
 * **And the budget is not the corpus's.** It is passed to `fetchOverpassSnapshot` and to
 * nothing else — now enforced by the query boundary rather than by discipline, since the two
 * halves no longer share a promise. Bounding a database call that answers in 144 to 735 ms
 * with a ten-second reader-attention limit would be a bound that never fires, and putting the
 * two behind one timer would hand the mirror the power to cancel the corpus — the exact
 * dependency `#157` inverted and `#180` finished.
 *
 * `/carte` keeps the unbounded walk. A visitor there asked for OpenStreetMap data and the map
 * IS the screen, so waiting buys something; here it buys a spinner.
 */
export const CONTEXT_BUDGET_MS = 10000;

export interface AddressContext {
  scores: AreaScores;
  /**
   * What each figure was derived FROM — w6-dossier (#33).
   *
   * The counts and the distance, not the 0-100 results. The sheet does not display them; the
   * dossier publishes them, because « chaque figure est re-dérivable » is not satisfied by a
   * formula whose operand nobody can see. They come out of the SAME traversal of the index that
   * produced `scores` — `scoreLocationDetailed` — rather than from a second walk beside it,
   * which would have been one more pair of numbers to keep equal.
   */
  operands: ScoringOperands;
  /** Where each layer was read from — the same object `scoreLocation` was given, so the gaps
   *  block can name the premises source without going through a figure that may be absent. */
  origins: LayerOrigins;
  /** Structured reason per layer, for the layers that did not arrive. Empty when all did. */
  withheldBy: Partial<Record<Layer, Withholding>>;
  /** Layers that actually came back — what the gaps block reads to name what is missing. */
  loaded: readonly Layer[];
  /**
   * Layers still in flight — w6-fiche-delai (#180).
   *
   * The third state the sheet did not have while both halves shared one promise: a layer that
   * has neither arrived nor failed. It matters because the two read alike on screen and must
   * not — « source injoignable » is a hole a reader can act on, an answer still travelling is
   * not. Empty once every query has settled, and never holding a bearing layer: the sheet is
   * not rendered at all until the corpus has answered.
   */
  pending: readonly Layer[];
  /**
   * The points the scores were computed on — w6-contexte (#119), step 5.
   *
   * `ContextMap` draws these and no others. The alternative was a second fetch for the map,
   * which would have let the picture and the figures disagree without anything saying so: a
   * mirror answering twice, a minute apart, is enough. One snapshot, scored and drawn.
   */
  points: NeighbourhoodContext;
  bbox: BBox;
  /**
   * What `compass_activity_transitions` answered — w6-fiche-corpus (#157).
   *
   * Not an axis and not a figure: on every ordinary Paris address today it answers « withheld »,
   * because a transition derives from two vintages and only 2023 is redistributable. It reaches
   * the gaps block, which is where a thing Compass cannot say belongs. `null` when the call
   * itself failed — an outage and a licence refusal must not read alike.
   */
  transitions: TransitionsVerdict | null;
}

/** The Overpass layers. `premises` is deliberately absent: it comes from the corpus now. */
const OVERPASS_LAYERS: readonly Layer[] = ['amenities', 'roads'];

/**
 * What the corpus alone answered — everything the verdict is composed from.
 *
 * It is a separate return type rather than a half-filled `AddressContext` on purpose: a shape
 * that could stand in for the finished one is a shape that will eventually be rendered, and
 * scoring the sheet over a context whose Overpass half has not been decided yet would put a
 * measured zero of road noise on screen. `composeContext` is the only way to get an
 * `AddressContext`, and it cannot be called without saying what became of the mirror.
 */
export interface CorpusContext {
  loaded: Layer[];
  withheldBy: Partial<Record<Layer, Withholding>>;
  notes: LayerNotes;
  origins: LayerOrigins;
  premises: PremisePoint[];
  services: ServicePoint[];
  nearestStationM: number | null;
  transitions: TransitionsVerdict | null;
  bbox: BBox;
}

/**
 * What became of the Overpass half — w6-fiche-delai (#180).
 *
 * Three states and not two. `en_cours` is the one the sheet gained by no longer waiting, and
 * the reason this is a union rather than `OverpassSnapshot | null`: `null` would have to mean
 * both « the mirrors refused » and « nobody has answered yet », and the screen owes those two
 * different sentences.
 */
export type OverpassPart =
  | { etat: 'en_cours' }
  | { etat: 'arrive'; snapshot: OverpassSnapshot }
  | { etat: 'injoignable' };

/**
 * The corpus half: premises, merchant services, rail, and the vintage metadata of each.
 *
 * **Six independent calls, six independent failures.** A database hiccup on the rail layer must
 * not blank a premises count that arrived in 200 ms. `allSettled` is what makes « une couche
 * morte dégrade la fiche au lieu de la vider » true rather than intended; a single `try` around
 * the lot is exactly the shape that produced the 13 September outage, one level up.
 *
 * **Overpass is no longer among them — w6-fiche-delai (#180).** It used to be the first entry
 * of this `allSettled`, which meant the six calls below could not be shown until the mirror had
 * finished not answering. The snapshot is now fetched by its own query, and the only thing this
 * function knows about it is the box to fetch it over.
 *
 * The vintage metadata is its own call and deliberately not bundled with the rows: a withheld
 * vintage returns no rows while its licence and date stay public, and those are precisely what
 * a reader needs in order to understand the refusal.
 */
export async function fetchCorpusContext(point: {
  lat: number;
  lng: number;
}): Promise<CorpusContext> {
  const bbox = boxAround(point);

  const [premises, premisesOrigin, transitions, services, station, stationOrigin] =
    await Promise.allSettled([
      fetchCorpusPremises(point.lat, point.lng, SHEET_RADIUS_M),
      fetchPremisesOrigin(),
      fetchActivityTransitions(point.lat, point.lng, SHEET_RADIUS_M),
      fetchCorpusServices(point.lat, point.lng, SERVICE_RADIUS_M),
      fetchCorpusStation(point.lat, point.lng, STATION_RADIUS_M),
      fetchStationOrigin(),
    ]);

  const loaded: Layer[] = [];
  const withheldBy: Partial<Record<Layer, Withholding>> = {};
  const layerNotes: LayerNotes = {};

  // ── The corpus: premises, from APUR's survey ────────────────────────────────────────────
  // Rows that arrived but cannot be attributed are rows that must not be scored: a figure
  // nobody can source is the one `Measured<T>` exists to keep off the screen. So a metadata
  // failure withdraws the layer even when the rows themselves came back — the same rule the
  // MCP server applies, because it is the same rule.
  const premisePoints: PremisePoint[] =
    premises.status === 'fulfilled' ? premises.value.points : [];
  if (premises.status === 'fulfilled' && premisesOrigin.status === 'fulfilled') {
    loaded.push('premises');
    if (premises.value.truncated) {
      layerNotes.premises = truncatedNote(
        'premises',
        premises.value.points.length,
        premises.value.totalMatched,
        SHEET_RADIUS_M,
      );
    }
  } else if (premises.status === 'rejected') {
    withheldBy.premises = withholdingOf(premises.reason);
  } else {
    // The rows are here and their licence is not. `indetermine` rather than a guess: « we do
    // not know why » is itself a fact, and it is never `retenue_licence` by guesswork.
    withheldBy.premises = 'indetermine';
  }

  // ── Hors du corpus, les DEUX autres couches du corpus tombent avec les locaux ───────────
  //
  // **Mesuré à l'écran le 15 septembre 2026, à Massy, et corrigé avant livraison.** Les deux
  // fonctions que ces couches appellent RÉUSSISSENT hors de Paris : `compass_premises_within`
  // rend zéro ligne sans marqueur — il n'en a jamais porté, `DIAGNOSTIC.md` §36 — et
  // `compass_station_profile` rend zéro ligne parce que `idfm_station` est restreinte à Paris
  // à l'ingestion. Traités isolément, les deux comptent donc comme « chargés et vides », et la
  // fiche affichait « services marchands à pied 0/100 » et « desserte ferrée 0/100 » sur une
  // commune qui a des commerces et un RER. C'est exactement le défaut de `DIAGNOSTIC.md` §16,
  // un cran plus loin : un chiffre calculé sur rien, estampillé d'une source.
  //
  // Seule `compass_scoring_context_within` porte `out_of_corpus`, donc elle est la SEULE
  // autorité sur la frontière, et les deux autres la suivent. Un second test ici serait une
  // deuxième autorité sur la même question, libre de contredire la première.
  const horsCorpus =
    premises.status === 'rejected' && withholdingOf(premises.reason) === 'hors_corpus';

  // ── The corpus: merchant services, from the same survey read by activity code ───────────
  // Same rule as premises, one level along: rows without their licence are rows that must not
  // be scored, so the premises metadata failing withdraws this layer too — the two read the
  // same vintage and `compass_vintages` is the only place that knows its licence.
  const servicePoints: ServicePoint[] = horsCorpus
    ? []
    : services.status === 'fulfilled'
      ? services.value.points
      : [];
  if (horsCorpus) {
    withheldBy.services = 'hors_corpus';
  } else if (services.status === 'fulfilled' && premisesOrigin.status === 'fulfilled') {
    loaded.push('services');
    if (services.value.truncated) {
      layerNotes.services = truncatedNote(
        'services',
        services.value.rendered,
        services.value.totalMatched,
        SERVICE_RADIUS_M,
      );
    }
  } else if (services.status === 'rejected') {
    withheldBy.services = withholdingOf(services.reason);
  } else {
    withheldBy.services = 'indetermine';
  }

  // ── The corpus: rail stops, from Île-de-France Mobilités ────────────────────────────────
  // A stop found or not found are both readings of a layer that ANSWERED **inside the
  // corpus**; only a thrown call, or a point the corpus does not cover, withdraws it.
  // `nearestStationM` carries the found/not-found distinction into the core, which is why it
  // is `number | null` and not an array whose emptiness would be ambiguous.
  const stationLoaded =
    !horsCorpus && station.status === 'fulfilled' && stationOrigin.status === 'fulfilled';
  if (horsCorpus) {
    withheldBy.stations = 'hors_corpus';
  } else if (stationLoaded) {
    loaded.push('stations');
  } else if (station.status === 'rejected') {
    withheldBy.stations = withholdingOf(station.reason);
  } else {
    withheldBy.stations = 'indetermine';
  }

  // Overpass answers with the current state of the map, so the query date is its vintage.
  // BDCom's is not today's date and must never be given it: `as_of` comes from the survey,
  // read off `compass_vintages` rather than written here. The OSM origins are written here
  // rather than by `composeContext` because they are what `noise` must carry BEFORE its
  // snapshot lands: a figure that is still travelling still names the dataset it is waiting on.
  const osm = OSM_ORIGIN(today());
  const bdcom = premisesOrigin.status === 'fulfilled' ? premisesOrigin.value : UNKNOWN_BDCOM;

  return {
    loaded,
    withheldBy,
    notes: layerNotes,
    origins: {
      amenities: osm,
      roads: osm,
      premises: bdcom,
      // The services layer reads the same survey and the same vintage as the premises layer,
      // so it carries the same origin by construction rather than by a second lookup that
      // could answer differently.
      services: bdcom,
      stations: stationOrigin.status === 'fulfilled' ? stationOrigin.value : UNKNOWN_IDFM,
    },
    premises: premisePoints,
    services: servicePoints,
    nearestStationM: !horsCorpus && station.status === 'fulfilled' ? station.value.distanceM : null,
    transitions: transitions.status === 'fulfilled' ? transitions.value : null,
    bbox,
  };
}

/**
 * The sheet as it stands right now: the corpus, plus whatever became of the Overpass half.
 *
 * **Pure, and that is what makes the progressive sheet safe.** It is called again on every
 * state of the mirror with the same corpus, so the figures cannot drift between the two paints
 * for any reason other than the snapshot arriving. Composing the second paint by patching the
 * first would have been the other design, and it is the one where a note or a withholding
 * written on the first paint quietly survives its cause.
 *
 * The three Overpass states map to three different screens and none of them removes `noise`:
 * still travelling leaves it without a figure and without a cause, arrived gives it its value
 * and its source, unreachable gives it « source injoignable ».
 */
export function composeContext(
  point: { lat: number; lng: number },
  corpus: CorpusContext,
  overpass: OverpassPart,
): AddressContext {
  const loaded: Layer[] = [...corpus.loaded];
  const withheldBy: Partial<Record<Layer, Withholding>> = { ...corpus.withheldBy };
  const pending: Layer[] = [];

  // The mirrors refused, the payload was malformed, or the budget ran out before any of them
  // answered. The three are one outcome here — the layer is unreachable, not empty, and that
  // difference is the whole point: an empty context declared `loaded` would score a measured
  // zero. Which of the three it was is not re-read from the message.
  const snapshot = overpass.etat === 'arrive' ? overpass.snapshot : null;
  const osmPoints = snapshot ? toNeighbourhoodContext(snapshot, corpus.bbox) : null;
  for (const layer of OVERPASS_LAYERS) {
    if (overpass.etat === 'en_cours') pending.push(layer);
    else if (snapshot && osmPoints && snapshot.loaded.includes(layer)) loaded.push(layer);
    else withheldBy[layer] = 'source_injoignable';
  }

  const points: NeighbourhoodContext = {
    amenities: osmPoints?.amenities ?? [],
    roads: osmPoints?.roads ?? [],
    premises: corpus.premises,
    services: corpus.services,
    nearestStationM: corpus.nearestStationM,
    bounds: corpus.bbox,
    loaded,
  };

  const scored = scoreLocationDetailed(point, buildIndex(points), corpus.origins, corpus.notes);

  return {
    scores: scored.scores,
    operands: scored.operands,
    origins: corpus.origins,
    withheldBy,
    loaded,
    pending,
    points,
    bbox: corpus.bbox,
    transitions: corpus.transitions,
  };
}

/**
 * The neighbourhood around a point. Never disabled by a failure: see the header.
 *
 * **Two queries, and the split IS the ticket — w6-fiche-delai (#180).** The corpus one decides
 * when the page renders; the Overpass one decides nothing and completes the sheet when it
 * lands. A caller sees one object either way, so the page does not have to know there are two.
 *
 * The result is not a `UseQueryResult`: it cannot be, since it merges two of them. It carries
 * the three fields the sheet actually reads, and `isPending` is deliberately the corpus query's
 * alone — a page that stayed « en cours de lecture » until the mirror answered would be the
 * defect this ticket exists to remove, rebuilt one level up.
 */
export function useAddressContext(point: { lat: number; lng: number } | null): {
  data: AddressContext | undefined;
  isPending: boolean;
  isError: boolean;
} {
  const corpus = useQuery({
    queryKey: ['address-corpus', point?.lat.toFixed(5), point?.lng.toFixed(5)],
    queryFn: () => fetchCorpusContext(point as { lat: number; lng: number }),
    enabled: point !== null,
    staleTime: 30 * 60 * 1000,
    // Same reasoning as `usePremises`: the corpus fetcher already reports each layer's failure
    // as an absence rather than throwing, so a second attempt would only repeat the same call.
    retry: false,
    refetchOnWindowFocus: false,
  });

  const roads = useQuery({
    queryKey: ['address-overpass', point?.lat.toFixed(5), point?.lng.toFixed(5)],
    queryFn: () =>
      fetchOverpassSnapshot(boxAround(point as { lat: number; lng: number }), {
        budgetMs: CONTEXT_BUDGET_MS,
      }),
    enabled: point !== null,
    staleTime: 30 * 60 * 1000,
    // A retry here would spend `CONTEXT_BUDGET_MS` a second time, and the fetcher has already
    // walked all three mirrors. It matters less than it used to — nobody is held up by it now —
    // which is exactly why it must not be relaxed by inattention.
    retry: false,
    refetchOnWindowFocus: false,
  });

  // The page rebuilds `point` on every render, so the identity this memo turns on is its two
  // coordinates — the same key both queries are cached under. Without the memo `ContextMap`
  // would be handed a new `points` object on every render and redraw the map each time.
  const lat = point?.lat ?? null;
  const lng = point?.lng ?? null;
  const snapshot = roads.isSuccess ? roads.data : null;
  const injoignable = roads.isError;

  const data = useMemo(() => {
    if (lat === null || lng === null || !corpus.data) return undefined;
    const part: OverpassPart = snapshot
      ? { etat: 'arrive', snapshot }
      : injoignable
        ? { etat: 'injoignable' }
        : { etat: 'en_cours' };
    return composeContext({ lat, lng }, corpus.data, part);
  }, [lat, lng, corpus.data, snapshot, injoignable]);

  return { data, isPending: corpus.isPending, isError: corpus.isError };
}

/**
 * Resolve a slug to an address.
 *
 * It answers two different questions and the caller must not confuse them. The POINT comes
 * from the query string whenever the URL carries one, so the figures never depend on BAN
 * answering; this query then only supplies the LABEL, which a slug cannot give back — its
 * capitals and accents are gone. When the URL carries no coordinates, it supplies both, and
 * the page rewrites itself to the canonical URL.
 */
export function useAddressFromSlug(search: string, enabled: boolean) {
  return useQuery<GeocodeResult | null>({
    queryKey: ['ban', search.toLowerCase()],
    queryFn: async () => (await geocode(search, 1))[0] ?? null,
    enabled: enabled && search.length > 2,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
