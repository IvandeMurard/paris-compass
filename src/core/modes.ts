/**
 * Three trade modes — w6-modes (#36).
 *
 * **What a mode is, and what it is deliberately not.** A mode is a READING ORDER and a
 * CHECKLIST. It is not a weighting, not a per-trade score, and not a second set of figures.
 * `docs/PERIMETRE.md` §4 states the refusal this module implements: *« Les pondérations
 * dépendent du métier […] Compass affiche les axes séparément et laisse le métier arbitrer. »*
 * Until now « laisser le métier arbitrer » meant leaving the reader to do it in their head.
 * This module puts the arbitration on screen without letting it touch a number.
 *
 * So the invariant of the whole file is one sentence: **switching mode changes the SEQUENCE of
 * what is shown and nothing else.** `modeAxisOrder` returns a permutation of
 * `VERDICT_AXIS_ORDER` — same population, same length, no axis dropped and none added — and
 * `resolveChecks` never computes anything: it reads counts the sheet already received and
 * relays them with their population.
 *
 * **Why the order is declared rather than derived.** Every other enumeration in this
 * repository derives its population; this one cannot. Which axis a restaurateur reads first is
 * a product judgement, not a property of the data, and pretending to derive it would be
 * inventing a weighting under another name — the exact thing the ticket's doctrine forbids.
 * What IS derived is the tail: a mode names the axes that lead for it, and everything else
 * follows in the core's own order. A seventh axis added to `verdict.ts` therefore appears in
 * all three modes the day it is added, at the end, instead of silently vanishing from two of
 * them. `modes.test.ts` holds that to be true for every mode.
 *
 * **And a declared order owes a reason** — w6-mode-raison (#197). Refusing to derive the order
 * was right; leaving it on screen with nothing beside it was not. Each lead axis now carries the
 * STATUS of its reason here and the reason itself in `src/i18n/modeText.ts`, so the arbitration
 * can be refused by a reader instead of merely undergone.
 *
 * **Why the checklist is half empty, and why that is the honest half.** The ticket's *Comment*
 * names nine things across three trades. Three of them are in the corpus today — the terrace
 * register (`w1-terrasses`, #15) and the two PLU protections (`w0-plu`, #9), which are two of
 * this ticket's three declared dependencies. The other six are not, and each one names the
 * ticket that would bring it rather than being quietly left out. A checklist that showed only
 * what it can answer would read as a complete checklist, which is the fault
 * `src/lib/contextGaps.ts` exists to prevent, moved into a new block.
 *
 * **The near field, and why 25 m.** A PLU protection is a property of a street frontage and a
 * terrace authorisation of a street number; neither is a property of a 400 m disc. So the
 * checks read the premises within `RESOLUTION_RADIUS_M` of the point — the radius
 * `premiseHistory.ts` measured for exactly this question — and they report agreement over that
 * population rather than picking one premise. Picking the nearest is the second founding error
 * of `docs/PLAN.md` §2.5, and it is not committed here: « the four surveyed premises within
 * 25 m all sit on a protected linear » is a statement about the frontage that never names a
 * premise. When they disagree, the count says so.
 */

import type { Measured, Origin } from './provenance';
import { unavailable, withValue } from './provenance';
import { VERDICT_AXIS_ORDER, type VerdictAxis } from './verdict';

/**
 * The three modes, as a `const` array with the type derived from it.
 *
 * Same shape as `WITHHOLDINGS` and `MOTIF_KINDS`, and for the same reason: a census — the test
 * that visits every mode, the selector that renders every button — reads its population here
 * instead of from a second hand-written list free to fall out of step with the union.
 */
export const TRADE_MODES = ['restauration', 'boutique', 'artisanat'] as const;

export type TradeMode = (typeof TRADE_MODES)[number];

/** True when an arbitrary string is one of the three. Used by the URL reader, which holds one. */
export const isTradeMode = (value: string): value is TradeMode =>
  (TRADE_MODES as readonly string[]).includes(value);

/**
 * How a lead axis answers for its rank: a STATUS, never a sentence — w6-mode-raison (#197).
 *
 * **The prose lives in `src/i18n/modeText.ts`**, in both languages, for the reason
 * `w6-langue-absences` (#181) settled: a producer that writes prose picks a language for a
 * reader it has never met. What the core owns is the half that must not be re-read to be
 * trusted — *what kind of claim the reason is*. « We measured » and « we think » are the
 * difference between steering and constraining, and a status written as a sentence would drift
 * from its own reason the first time either was rewritten.
 *
 *  - `mesure` — measured here, and the reason cites its measurement. **No lead axis carries it
 *    today**, and that is the state rather than an omission.
 *  - `mesurable` — a measurement within reach would settle it, and nobody has made it. The
 *    reason names the measurement that would; the screen says « not measured to date » from
 *    this enum and never from the reason's own words.
 *  - `arbitrage` — a product judgement. Saying so hides nothing; dressing it as a fact would.
 */
export const LEAD_REASON_STATUSES = ['mesure', 'mesurable', 'arbitrage'] as const;

export type LeadReasonStatus = (typeof LEAD_REASON_STATUSES)[number];

/** An axis that leads a mode, carrying the status of the reason that puts it there. */
export interface LeadAxis {
  axis: VerdictAxis;
  status: LeadReasonStatus;
}

/**
 * The axes that LEAD for each mode, each with the status of its reason. Everything else follows
 * in `VERDICT_AXIS_ORDER`.
 *
 * **A figure on screen carries its source; an order on screen carries its reason** —
 * w6-mode-raison (#197), opened on Ivan's objection the day `#36` shipped. The ranking asserts
 * a hierarchy, and an assertion with nothing behind it is one a reader can only submit to. Put
 * the reason beside it and the arbitration becomes falsifiable, which is the whole difference
 * between steering and constraining — made mechanical rather than promised.
 *
 * **The sentences are NOT in this comment, and that is the point.** They live once, in two
 * languages, in `LEAD_REASON_COPY`. A second copy here would be a second statement of one
 * thing, free to disagree with the screen the first time either moved — the same fault
 * `FOOTFALL_WEIGHTS` was extracted to end. What this table owns is the population and the
 * status, and `modeText.test.ts` holds table and copy in exact correspondence **in both
 * directions**: a mode that gained a lead axis without a reason reddens `test` instead of
 * reaching the screen bare, and a reason left behind by an axis that stopped leading reddens it
 * too.
 *
 * **These three lists are still the one thing here that awaits a decision from Ivan**, and they
 * are still cheap to change: they move nothing but the sequence. This ticket makes the
 * arbitration visible and arguable; it does not make it true. What would settle it is three
 * conversations with shopkeepers, and no session can hold them.
 */
const LEAD_AXES: Record<TradeMode, readonly LeadAxis[]> = {
  restauration: [
    { axis: 'footfall', status: 'mesurable' },
    { axis: 'rail', status: 'arbitrage' },
    { axis: 'noise', status: 'mesurable' },
  ],
  boutique: [
    { axis: 'density', status: 'mesurable' },
    { axis: 'footfall', status: 'arbitrage' },
    { axis: 'services', status: 'arbitrage' },
  ],
  artisanat: [
    { axis: 'services', status: 'arbitrage' },
    { axis: 'density', status: 'arbitrage' },
    { axis: 'rail', status: 'arbitrage' },
  ],
};

/**
 * The lead axes of a mode, in order, with the status of each reason.
 *
 * Exported so the screen, the tests and — the day `w5-explain-metier` (#31) lands — the MCP
 * server read ONE population instead of three. `modeAxisOrder` below is the same table read for
 * its sequence alone; nothing else may name a lead axis.
 */
export const modeLeadAxes = (mode: TradeMode): readonly LeadAxis[] => LEAD_AXES[mode];

/**
 * The reading order of the axes for a mode, or the core's own order when no mode is chosen.
 *
 * A permutation, never a filter — the tail is computed from `VERDICT_AXIS_ORDER` rather than
 * listed, so an axis this file has never heard of still reaches every mode.
 */
export function modeAxisOrder(mode: TradeMode | null): readonly VerdictAxis[] {
  if (mode === null) return VERDICT_AXIS_ORDER;
  const lead = LEAD_AXES[mode].map((entry) => entry.axis);
  return [...lead, ...VERDICT_AXIS_ORDER.filter((axis) => !lead.includes(axis))];
}

/**
 * The checklist items, as a `const` array. One id per line of the ticket's *Comment*.
 *
 * `plu_lineaire` covers both words of « linéaire, PLU » in the boutique line: the dataset
 * `plub_protcom` publishes ONE object — a stretch of street carrying a protection — and
 * splitting it into two checks would show a reader two answers to one question.
 */
export const TRADE_CHECK_IDS = [
  'terrasse',
  'cuisine',
  'ppri_cave',
  'licence_debit',
  'plu_lineaire',
  'rotation_metier',
  'plu_artisanat',
  'copropriete',
  'livraison',
] as const;

export type TradeCheckId = (typeof TRADE_CHECK_IDS)[number];

/**
 * What a check is missing, when it is missing a source.
 *
 * The number is the issue that would bring it, and `null` means no open source has been
 * identified at all — which is a different statement and must not borrow the first one's
 * hopefulness. `retenueLicence` marks the one case where the figure EXISTS in the database and
 * is withheld: `compass_survival_by_trade` computes a rate per trade, and its 2017 cohort is
 * not redistributable until the APUR answers. « Nous ne l'avons pas » and « nous l'avons et ne
 * pouvons pas le servir » are the distinction this product is built on.
 */
export interface TradeCheckGap {
  issue: number | null;
  retenueLicence?: true;
}

export interface TradeCheckRule {
  id: TradeCheckId;
  /** Absent when the corpus answers it today. */
  gap?: TradeCheckGap;
}

/**
 * The checklist of each mode, in the order the ticket lists it.
 *
 * Six of the nine carry a gap, and each gap names its cause:
 *
 *  - `cuisine`, `licence_debit`, `livraison` — **no open dataset identified**. Extraction ducts
 *    and liquor licences are held by the Préfecture and the copropriété, and delivery access is
 *    not published at all. `issue: null` says so rather than promising a ticket.
 *  - `ppri_cave` — `w1-ppri` (#13), still open: the flood zoning is a boolean on the map today
 *    and a cellar is exactly what the zoning decides.
 *  - `copropriete` — `w4-erp-copro-ads` (#25), still open.
 *  - `rotation_metier` — `w1-historique` (#49) and the letter to the APUR. Withheld, not
 *    absent.
 */
export const TRADE_CHECKS: Record<TradeMode, readonly TradeCheckRule[]> = {
  restauration: [
    { id: 'terrasse' },
    { id: 'cuisine', gap: { issue: null } },
    { id: 'ppri_cave', gap: { issue: 13 } },
    { id: 'licence_debit', gap: { issue: null } },
  ],
  boutique: [
    { id: 'plu_lineaire' },
    { id: 'rotation_metier', gap: { issue: 49, retenueLicence: true } },
  ],
  artisanat: [
    { id: 'plu_artisanat' },
    { id: 'copropriete', gap: { issue: 25 } },
    { id: 'livraison', gap: { issue: null } },
  ],
};

/**
 * The near-field facts the checks read, counted by the caller off rows it already holds.
 *
 * Nothing in this module fetches or filters by distance — `src/core` has no geography beyond
 * `geo.ts`, and the radius selection belongs to the service that made the call. What arrives
 * here is already the answer to « among the premises surveyed within `radiusM` of this point,
 * how many carry X ».
 *
 * **`terrasseInconnu` is carried and never folded into the other two.** The register answers
 * three states, not two: a street number shared by several premises where the authorisation
 * does not say which one holds it is `inconnu`, and counting it as « non » would invent an
 * absence — `src/i18n/terrasseText.ts` refused that once already.
 */
export interface TradeFacts {
  radiusM: number;
  /** Surveyed premises within `radiusM`. Zero is a real answer, not a failure. */
  total: number;
  terrasseOui: number;
  terrasseInconnu: number;
  /** At least one of the three protections — `premise_location.plu_protected`. */
  pluProtege: number;
  /**
   * The protection of *commerce artisanal de proximité* alone — `ppa` in `plub_protcom`.
   *
   * **Named `proximite` and not `artisanat`, and the trap is worth the extra word.** The
   * dataset publishes three flags and the one whose COLUMN is called `commerce_artisanat` is
   * `pca`, the *general* protection of commerce and craft — 4 607 of 5 107 linears. The one
   * that names craft specifically is `ppa`, « commerce artisanal de proximité », 468 linears.
   * The ticket's « PLU artisanat » could be read as either; this reads the narrower one,
   * because the broader one is already what the boutique check counts and showing the same
   * number twice under two names would be worse than showing one.
   */
  pluProximite: number;
}

export type TradeCheckState =
  /**
   * Counted, with the population it was counted over. The only state that carries a figure.
   *
   * **`indetermine` is the third column of the register, and leaving it out was a defect
   * measured on screen** — rue de Bretagne, 16 September 2026: 0 of the 25 surveyed premises
   * within 25 m carry a terrace authorisation in their own name, and **26 of the 28 locations
   * there are `inconnu`** — a street number where an authorisation exists and the register does
   * not say which premise holds it. Rendering that as « aucun » is inventing an absence, which
   * is the exact fault `src/i18n/terrasseText.ts` was written to refuse, reproduced one level up
   * in an aggregate. It is zero for a check whose source has only two states.
   */
  | { kind: 'constate'; count: number; of: number; radiusM: number; indetermine: number }
  /** The layer answered and the radius holds no surveyed premise. A measurement. */
  | { kind: 'aucun_local'; radiusM: number }
  /** The corpus layer never answered. An absence, never a zero. */
  | { kind: 'couche_absente' }
  /** No source reaches this question here. Carries the gap that says why. */
  | { kind: 'sans_source'; gap: TradeCheckGap };

export interface TradeCheck {
  id: TradeCheckId;
  state: TradeCheckState;
  /**
   * The figure behind a `constate`, carrying its source.
   *
   * Present exactly when `state.kind === 'constate'` and absent otherwise, so nothing on screen
   * can print a count that has no provenance — `CLAUDE.md`, « un chiffre affiché porte sa
   * source ». The origin is a parameter because only the database knows a dataset's own date
   * (`ingestion_run.source_as_of`); writing one here would be the unmeasured claim
   * `BDCOM_ORIGIN` and `IDFM_ORIGIN` already refuse to make.
   */
  measured?: Measured<number>;
}

/** Which dataset answers each corpus-backed check. Two datasets, three checks. */
const CHECK_SOURCE: Partial<Record<TradeCheckId, 'terrasses' | 'plu'>> = {
  terrasse: 'terrasses',
  plu_lineaire: 'plu',
  plu_artisanat: 'plu',
};

/** How each corpus-backed check counts itself, off `TradeFacts`. */
const CHECK_COUNT: Partial<Record<TradeCheckId, (f: TradeFacts) => number>> = {
  terrasse: (f) => f.terrasseOui,
  plu_lineaire: (f) => f.pluProtege,
  plu_artisanat: (f) => f.pluProximite,
};

/**
 * How many premises the check's source could not decide about.
 *
 * Only the terrace register has a third state. A check with no entry here counts none, which
 * says « this source answers yes or no » rather than « nobody looked » — and the difference
 * matters because a zero that means the first is a fact and a zero that means the second is a
 * hole. The PLU flags are booleans on every row: there is no undecided linear.
 */
const CHECK_UNKNOWN: Partial<Record<TradeCheckId, (f: TradeFacts) => number>> = {
  terrasse: (f) => f.terrasseInconnu,
};

export interface TradeOrigins {
  terrasses?: Origin;
  plu?: Origin;
}

/**
 * The checklist of a mode, resolved against what this address actually holds.
 *
 * `facts === null` means the premises layer did not answer — every corpus-backed check comes
 * back `couche_absente`, and the ones with no source keep saying they have none. The two
 * absences are never merged: one is an outage that tomorrow may fix, the other is a property of
 * French open data.
 *
 * **Nothing here is computed.** Every number in the output was counted by the caller and is
 * relayed with the population it was counted over. That is what « sans inventer de chiffre »
 * means in code: the mode selects which counts are shown and in which order, and it cannot
 * change one.
 */
export function resolveChecks(
  mode: TradeMode,
  facts: TradeFacts | null,
  origins: TradeOrigins = {},
): readonly TradeCheck[] {
  return TRADE_CHECKS[mode].map((rule): TradeCheck => {
    if (rule.gap) return { id: rule.id, state: { kind: 'sans_source', gap: rule.gap } };

    const dataset = CHECK_SOURCE[rule.id];
    const count = CHECK_COUNT[rule.id];
    // A rule with no gap and no counter would be a check that silently shows nothing. It
    // cannot happen through the tables above, and `modes.test.ts` enumerates them to keep it
    // that way; the guard is here so the failure is a visible absence rather than a blank line.
    if (!dataset || !count) return { id: rule.id, state: { kind: 'couche_absente' } };

    const origin = origins[dataset];
    if (facts === null || origin === undefined) {
      return {
        id: rule.id,
        state: { kind: 'couche_absente' },
        ...(origin ? { measured: unavailable<number>(origin, { kind: 'couche_absente', layer: 'premises' }) } : {}),
      };
    }

    if (facts.total === 0) {
      return { id: rule.id, state: { kind: 'aucun_local', radiusM: facts.radiusM } };
    }

    return {
      id: rule.id,
      state: {
        kind: 'constate',
        count: count(facts),
        of: facts.total,
        radiusM: facts.radiusM,
        indetermine: CHECK_UNKNOWN[rule.id]?.(facts) ?? 0,
      },
      // `measured`, never `derived`: these are rows of a register relayed as they came, and the
      // only arithmetic is the addition that counted them.
      measured: withValue(count(facts), origin, 'measured'),
    };
  });
}
