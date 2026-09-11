/**
 * Composition of the one-sentence verdict shown on a context page — w6-contexte (#119).
 *
 * **Why this is in `src/core/` and not in the page that displays it.** The same sentence has
 * to reach two consumers: the browser, and an agent calling the MCP server. A composition
 * written inside a React component is a composition the agent cannot obtain, and « la même
 * réponse pour un agent » would be false — which is the only novelty claim the product makes.
 * So it is a pure function: no fetch, no React, no DOM, per the contract of this directory.
 *
 * **The rule this module exists to enforce.** `#54 w0-conclusion` was titled « Une conclusion
 * tirée par-dessus une retenue » : a sentence was composed over figures that had been withheld
 * or never determined. Putting that same sentence at the top of a page makes the defect more
 * visible, not less. Hence:
 *
 * > The verdict names the findings it used, and refuses to compose when one of the BEARING
 * > findings is withheld or undetermined. It says what is missing instead.
 *
 * **No score out of 100, and the reason is written down** — `docs/PERIMETRE.md` §4 and
 * `docs/CONTEXTE.md` : the weights depend on the trade, and a single score averages things
 * that pull against each other. The verdict is a sentence of named axes. Nothing here returns
 * an aggregate number, and `Verdict` has no field that could hold one.
 *
 * **What this does NOT catch**, and it matters:
 *
 *  - A figure that is *present but weak* still composes. Footfall is `method: 'estimated'` by
 *    construction — no open pedestrian count exists for Île-de-France — so refusing on
 *    `estimated` would refuse every verdict, everywhere, forever. The caveat travels with the
 *    clause (`clause.measured.note`) and the interface must render it; that is a display
 *    obligation this function cannot enforce.
 *  - A figure whose coverage is truncated (`TRUNCATED` in scoring.ts) also composes, for the
 *    same reason: it has a value, and the value is a floor rather than a fiction.
 *  - Whether the caller classified a withholding correctly. `withheldBecause` is supplied by
 *    the code that met the failure — this module cannot re-derive it, and deliberately does
 *    not sniff `missingReason` for keywords (`#61` refused exactly that).
 *
 * The rule is published on `src/pages/Methodology.tsx`, as CLAUDE.md requires for the formulas
 * of `scoring.ts`: a sentence shown to every visitor needs its method no less than a number.
 */

import { assertObservational } from './observational';
import type { Measured } from './provenance';
import { noiseLabel, scoreLabel, type AreaScores, type Layer } from './scoring';

/** Locale of the composed sentence. Declared here rather than imported from `src/i18n`:
 *  that module is the browser's, and `src/core` must stay callable from the MCP server. */
export type VerdictLocale = 'fr' | 'en';

export type VerdictAxis = 'footfall' | 'transit' | 'walkability' | 'groceries' | 'noise';

/**
 * Why a finding carries no value, in a form a machine can read.
 *
 * The four names mirror `public.question_outcome` and the `QuestionOutcome` of the MCP server
 * (`mcp-server/src/record.ts`), minus the outcomes that are not absences. They are not
 * re-derived from `missingReason`: « retenue de licence », « hors corpus » and « source
 * injoignable » lead to three different actions — a letter to APUR, a point outside Paris, a
 * mirror — and telling them apart with `includes()` on an English sentence would hang the
 * distinction on a reformulation. The producer of the failure names it.
 *
 * The values are a `const` array and the type is derived from it, rather than the reverse. A
 * caller holding an arbitrary string — the MCP server holds a `QuestionOutcome`, a wider set —
 * has to decide, at runtime, whether it is one of these; with the type alone it could only do
 * that against a second hand-written list, free to fall out of step with this one.
 */
export const WITHHOLDINGS = [
  'retenue_licence',
  'hors_corpus',
  'source_injoignable',
  'indetermine',
] as const;

export type Withholding = (typeof WITHHOLDINGS)[number];

/** The withholding a wider vocabulary maps to, or `indetermine` when it names no absence.
 *  Derived from `WITHHOLDINGS`, so a fifth cause is classified the day it is added. */
export const asWithholding = (motif: string): Withholding =>
  (WITHHOLDINGS as readonly string[]).includes(motif) ? (motif as Withholding) : 'indetermine';

export interface VerdictAxisRule {
  /** When true, the verdict refuses to compose without this axis. */
  bearing: boolean;
  /** Layers the axis reads, in the order `scoreLocation` gives up on them. */
  layers: readonly Layer[];
}

/**
 * Which axes carry the verdict, and which merely colour it.
 *
 * The three bearing ones are the three that answer the closed question a taker arrives with —
 * *does this address hold up?* : how many people pass (`footfall`), how well it is served
 * (`transit`), and what can be reached on foot (`walkability`). Food shops and road noise
 * qualify an answer; they cannot be the answer, so their absence does not block one.
 */
export const VERDICT_AXES: Readonly<Record<VerdictAxis, VerdictAxisRule>> = {
  footfall: { bearing: true, layers: ['premises', 'amenities'] },
  transit: { bearing: true, layers: ['amenities'] },
  walkability: { bearing: true, layers: ['amenities'] },
  groceries: { bearing: false, layers: ['amenities'] },
  noise: { bearing: false, layers: ['roads'] },
};

/** Reading order of the findings, on screen and in the sentence. */
export const VERDICT_AXIS_ORDER: readonly VerdictAxis[] = [
  'footfall',
  'transit',
  'walkability',
  'groceries',
  'noise',
];

export const BEARING_AXES: readonly VerdictAxis[] = VERDICT_AXIS_ORDER.filter(
  (a) => VERDICT_AXES[a].bearing,
);

/** Three bands, not four: a verdict clause is read in a second, and `scoreLabel`'s
 *  Excellent/Good split does not survive being turned into prose. */
export type Band = 'fort' | 'moyen' | 'faible';

export interface VerdictFinding {
  axis: VerdictAxis;
  measured: Measured<number>;
  /** Required reading whenever `measured.value` is null; defaults to `indetermine`. */
  withheldBecause?: Withholding;
}

export interface VerdictClause {
  axis: VerdictAxis;
  band: Band;
  /** The clause as it appears inside the sentence, e.g. « desserte forte ». */
  text: string;
  measured: Measured<number>;
}

export interface VerdictGap {
  axis: VerdictAxis;
  because: Withholding;
  /** The human-readable reason, straight from `Measured.missingReason`. Never rewritten. */
  reason: string;
}

export type Verdict =
  | {
      kind: 'compose';
      sentence: string;
      /** The axes the sentence used. Named, so a reader can check the sentence against them. */
      used: readonly VerdictAxis[];
      clauses: readonly VerdictClause[];
      /** Non-bearing clauses that resolved. Rendered apart, never folded into the sentence. */
      supporting: readonly VerdictClause[];
    }
  | {
      kind: 'refus';
      sentence: string;
      missing: readonly VerdictGap[];
      /** Bearing axes that did resolve — still worth showing, one by one, never merged. */
      available: readonly VerdictAxis[];
    };

/**
 * Band of a score.
 *
 * Noise has its own scale in `scoring.ts` and keeps it here: 70/100 of road exposure is not
 * the same claim as 70/100 of walkability, and mapping both through `scoreLabel` would say
 * that it is.
 */
export function bandOf(axis: VerdictAxis, score: number): Band {
  if (axis === 'noise') {
    const label = noiseLabel(score);
    if (label === 'High') return 'fort';
    if (label === 'Moderate') return 'moyen';
    return 'faible';
  }
  const label = scoreLabel(score);
  if (label === 'Excellent' || label === 'Good') return 'fort';
  if (label === 'Moderate') return 'moyen';
  return 'faible';
}

/** Clause wording, per axis and per band. Prose, so it lives next to the rule it renders. */
const CLAUSES: Record<VerdictLocale, Record<VerdictAxis, Record<Band, string>>> = {
  fr: {
    footfall: { fort: 'passage soutenu', moyen: 'passage moyen', faible: 'passage faible' },
    transit: { fort: 'desserte forte', moyen: 'desserte moyenne', faible: 'desserte faible' },
    walkability: {
      fort: 'services à pied nombreux',
      moyen: 'services à pied moyennement présents',
      faible: 'services à pied rares',
    },
    groceries: {
      fort: 'commerces alimentaires nombreux',
      moyen: 'commerces alimentaires présents',
      faible: 'commerces alimentaires rares',
    },
    noise: {
      fort: 'exposition au bruit routier forte',
      moyen: 'exposition au bruit routier moyenne',
      faible: 'exposition au bruit routier faible',
    },
  },
  en: {
    footfall: { fort: 'steady footfall', moyen: 'moderate footfall', faible: 'low footfall' },
    transit: {
      fort: 'strong transit access',
      moyen: 'moderate transit access',
      faible: 'weak transit access',
    },
    walkability: {
      fort: 'many services within walking distance',
      moyen: 'some services within walking distance',
      faible: 'few services within walking distance',
    },
    groceries: { fort: 'many food shops', moyen: 'some food shops', faible: 'few food shops' },
    noise: {
      fort: 'high road-noise exposure',
      moyen: 'moderate road-noise exposure',
      faible: 'low road-noise exposure',
    },
  },
};

/** Subject of a refusal clause. Deliberately a noun phrase followed by a colon: French
 *  agreement on « indéterminé » would otherwise have to be declined per axis, and a status
 *  list reads faster than a sentence nobody finishes. */
const SUBJECTS: Record<VerdictLocale, Record<VerdictAxis, string>> = {
  fr: {
    footfall: 'le passage',
    transit: 'la desserte',
    walkability: 'les services à pied',
    groceries: 'les commerces alimentaires',
    noise: 'le bruit routier',
  },
  en: {
    footfall: 'footfall',
    transit: 'transit access',
    walkability: 'services within walking distance',
    groceries: 'food shops',
    noise: 'road noise',
  },
};

const WHY: Record<VerdictLocale, Record<Withholding, string>> = {
  fr: {
    retenue_licence: 'retenu pour licence',
    hors_corpus: 'hors du corpus',
    source_injoignable: 'source injoignable',
    indetermine: 'indéterminé',
  },
  en: {
    retenue_licence: 'withheld for licence',
    hors_corpus: 'outside the corpus',
    source_injoignable: 'source unreachable',
    indetermine: 'undetermined',
  },
};

const COPY: Record<
  VerdictLocale,
  { refus: string; noFinding: string; colon: string; separator: string }
> = {
  fr: {
    refus: 'Compass ne compose pas de verdict pour cette adresse',
    noFinding: 'Ce constat n’a pas été calculé pour ce point.',
    // French typography puts a space before the colon and the semicolon; English does not.
    // Hardcoding one of the two would leave the other locale looking machine-translated.
    colon: ' : ',
    separator: ' ; ',
  },
  en: {
    refus: 'Compass does not compose a verdict for this address',
    noFinding: 'This finding was not computed for this point.',
    colon: ': ',
    separator: '; ',
  },
};

const capitalise = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/**
 * The clause an axis reads at a band, and the sentence used when a finding was never computed.
 *
 * Exported for `comparison.ts`, which shows the same prose in a two-address table. A second
 * copy of these words elsewhere would read identically the day it was written and drift the
 * day one of them is reworded — and the drift would show up as a sentence and a table
 * disagreeing about the same address, which is worse than either being wrong alone.
 */
export const clauseText = (axis: VerdictAxis, band: Band, locale: VerdictLocale = 'fr'): string =>
  CLAUSES[locale][axis][band];

export const noFindingText = (locale: VerdictLocale = 'fr'): string => COPY[locale].noFinding;

/**
 * Turn a full `AreaScores` into the findings this module reasons over.
 *
 * `withheldBy` is how a caller that met a *structured* failure passes it on: the MCP server
 * already carries one `motif` per failed layer (`mcp-server/src/context.ts`), and the browser
 * knows a mirror refused. Anything not declared falls back to `indetermine`, which is the
 * honest default — « we do not know why » is itself a fact, and it is never `retenue_licence`
 * by guesswork.
 */
export function findingsFromScores(
  scores: AreaScores,
  withheldBy: Partial<Record<Layer, Withholding>> = {},
): VerdictFinding[] {
  return VERDICT_AXIS_ORDER.map((axis) => {
    const measured = scores[axis];
    if (measured.value !== null) return { axis, measured };
    // Layers are listed in the order the axis reads them, so the first declared withholding
    // is the one that actually stopped the figure.
    const because = VERDICT_AXES[axis].layers.map((l) => withheldBy[l]).find(Boolean);
    return { axis, measured, withheldBecause: because ?? 'indetermine' };
  });
}

/**
 * Compose the verdict, or refuse to.
 *
 * Both sentences go through `assertObservational`: a verdict is the most read sentence of the
 * product, so the w1-survie ban on forecast forms applies to it before anything else. A
 * wording change that slipped « votre » or a future tense into a clause fails the unit tests
 * rather than reaching a visitor.
 */
export function composeVerdict(
  findings: readonly VerdictFinding[],
  locale: VerdictLocale = 'fr',
): Verdict {
  const byAxis = new Map(findings.map((f) => [f.axis, f] as const));

  const clauseOf = (f: VerdictFinding): VerdictClause | null => {
    if (f.measured.value === null) return null;
    const band = bandOf(f.axis, f.measured.value);
    return { axis: f.axis, band, text: CLAUSES[locale][f.axis][band], measured: f.measured };
  };

  const missing: VerdictGap[] = [];
  const bearingClauses: VerdictClause[] = [];

  for (const axis of BEARING_AXES) {
    const finding = byAxis.get(axis);
    // A bearing axis nobody supplied is as blocking as one that came back null: composing
    // over a finding that was never even attempted is the same defect, one step earlier.
    if (!finding) {
      missing.push({ axis, because: 'indetermine', reason: COPY[locale].noFinding });
      continue;
    }
    const clause = clauseOf(finding);
    if (!clause) {
      missing.push({
        axis,
        because: finding.withheldBecause ?? 'indetermine',
        reason: finding.measured.missingReason ?? COPY[locale].noFinding,
      });
      continue;
    }
    bearingClauses.push(clause);
  }

  if (missing.length > 0) {
    const list = missing
      .map((g) => `${SUBJECTS[locale][g.axis]}${COPY[locale].colon}${WHY[locale][g.because]}`)
      .join(COPY[locale].separator);
    const sentence = assertObservational(
      `${COPY[locale].refus} — ${list}.`,
      'verdict de contexte (refus)',
    );
    return {
      kind: 'refus',
      sentence,
      missing,
      available: bearingClauses.map((c) => c.axis),
    };
  }

  const supporting = VERDICT_AXIS_ORDER.filter((a) => !VERDICT_AXES[a].bearing)
    .map((a) => byAxis.get(a))
    .filter((f): f is VerdictFinding => f !== undefined)
    .map(clauseOf)
    .filter((c): c is VerdictClause => c !== null);

  const sentence = assertObservational(
    `${capitalise(bearingClauses.map((c) => c.text).join(', '))}.`,
    'verdict de contexte',
  );

  return {
    kind: 'compose',
    sentence,
    used: bearingClauses.map((c) => c.axis),
    clauses: bearingClauses,
    supporting,
  };
}
