/**
 * The dossier of one address — w6-dossier (#33).
 *
 * **What the ticket asks, and what that sentence actually demands.** « Depuis une fiche,
 * télécharger un fichier dont chaque figure est re-dérivable. » A figure is re-derivable when a
 * reader who distrusts it can obtain it again without asking us: they need the SOURCE that was
 * read, its LICENCE, its VINTAGE, the METHOD, the formula with its constants, the radius — and
 * the OPERAND the formula was applied to. The first five were already carried by `Measured<T>`
 * and shown on the sheet. The sixth and the seventh were not: a page saying « 99 / 100, APUR
 * BDCom 2023, calculé par une formule publiée » lets nobody check the arithmetic, only trust it.
 * `ScoringOperands` exists for that gap, and this module is what turns the pair into a file.
 *
 * **Why it is in `src/core/` and not in the component with the button.** `docs/PLAN.md` §2.6
 * splits the chantier along exactly this line — *« le contenu … est du noyau ; le bouton, sa
 * place et la génération du fichier sont de Lovable »* — and the reason is the one that governs
 * `verdict.ts` next door: the same content must reach two consumers, the browser and an agent
 * calling the MCP server. A dossier composed inside a React component is a dossier the agent
 * cannot obtain, and « la même réponse pour un agent » would be false.
 *
 * **The doctrine is structural, not a matter of restraint.** `buildDossier` takes ONE address
 * and returns ONE dossier; there is no array anywhere in this module and no function that takes
 * a list. `docs/PERIMETRE.md` §1 refuses the broker's portfolio, and `docs/PLAN.md` §2.6 puts
 * the line in the structure rather than in the discipline: « l'export part d'une fiche, jamais
 * de la liste de résultats. » A caller wanting fifty must call this fifty times and assemble
 * them itself, which is a thing this product will not have built.
 *
 * **What this module does NOT do**, and each one is a real limit:
 *
 *  - **It carries the figures OF THE SHEET, and the sheet is not the whole corpus.** The six
 *    axes, their provenance and the verdict — not `compass_address_timeline`, not the BODACC
 *    events, not the activity sequence. `#33`'s own comment of 13 September warned that a
 *    dossier of « rien de ce qu'un banquier lira » was the risk; since `#157` and `#169` the
 *    sheet's four bearing axes read APUR's survey and IDFM's stop reference, so the file is no
 *    longer an OpenStreetMap snapshot of the day. It is still not the chronology, and putting
 *    the chronology on the sheet is another ticket.
 *  - **It does not check that the formula STRING matches the function that ran.** `rederive`
 *    re-runs the core's own `saturating` / `decaying` over the constants and operands READ FROM
 *    THE DOSSIER, which is what proves the file carries enough; the prose in `formula` is
 *    published beside it for a human and is not executed. A reworded formula that still computed
 *    correctly would pass here — `src/pages/Methodology.tsx` is where that obligation lives.
 *  - **It re-derives the last step, not the source.** Handed `n = 920` a reader can check
 *    `100 × (1 − e^(−920/90))`; to check `920` itself they must go back to BDCom 2023 with the
 *    radius and the point, which the file names and this function cannot do for them.
 */

import { contextToolCall, type AgentCall, type ContextToolArguments } from './agentCall';
import type { Measured, Method } from './provenance';
import {
  FOOTFALL_RADIUS_M,
  FOOTFALL_WEIGHTS,
  NOISE_RADIUS_M,
  NOISE_SCALE,
  PREMISE_SATURATION,
  SERVICE_RADIUS_M,
  SERVICE_SATURATION,
  SERVICE_WEIGHTS,
  AMENITY_RADIUS_M,
  TRANSIT_DECAY_M,
  decaying,
  saturating,
  type ScoringOperands,
  type ServiceFamily,
} from './scoring';
import {
  VERDICT_AXES,
  VERDICT_AXIS_ORDER,
  type Verdict,
  type VerdictAxis,
  type VerdictFinding,
  type VerdictLocale,
  type Withholding,
} from './verdict';

/**
 * Identity of the format, so a file found on a disk in two years says what it is.
 *
 * The version is bumped when a FIELD changes meaning or leaves, never when a figure changes:
 * a reader holding an old dossier has to be able to tell « the product measured something else
 * that day » from « this file is shaped differently ».
 */
export const DOSSIER_FORMAT = 'compass.dossier';
export const DOSSIER_VERSION = 1;

/** The shape of the arithmetic, which is what `rederive` dispatches on. */
export type DerivationKind =
  /** `100 × (1 − exp(−n / S))` — one count, one saturation constant. */
  | 'saturating'
  /** `Σ weight_f × 100 × (1 − exp(−n_f / S_f))` — one term per family. */
  | 'weighted-saturating'
  /** `100 × exp(−d / D)` — a distance, nearer being better. */
  | 'decaying'
  /** `Σ weight_i × figure_i` over figures published elsewhere in this same dossier. */
  | 'blend'
  /** `K × Σ` — a sum accumulated over the layer, then scaled. */
  | 'scaled-sum';

export interface DossierDerivation {
  kind: DerivationKind;
  /** The formula as it is published, for a human. Not executed — see the header. */
  formula: string;
  /** The radius the layer was read in, in metres. */
  radiusM: number;
  /** Every constant the formula needs, named as the formula names it. */
  constants: Readonly<Record<string, number>>;
  /** What the formula was applied to. `null` on a figure whose layer never answered. */
  operands: Readonly<Record<string, number | null>>;
}

export interface DossierFigure {
  axis: VerdictAxis;
  /** The axis as the sheet names it, in the reader's language. Supplied, never invented here. */
  label: string;
  /** One line on what the axis counts, in the reader's language. */
  counts: string;
  /** Whether the verdict refuses to compose without it — `VERDICT_AXES`, never retyped. */
  bearing: boolean;
  scale: '0-100';
  value: number | null;
  // The five provenance fields keep the names `Measured<T>` gives them. Translating them into a
  // second vocabulary on the way out would be one more pair of strings to keep in step, and the
  // pair would be invisible: nothing type-checks a JSON key against the field it was copied from.
  source: string;
  licence: string;
  asOf: string;
  method: Method;
  note?: string;
  missingReason?: string;
  /** Structured cause of an absence — the same four names `question_outcome` uses. */
  withheldBecause?: Withholding;
  /**
   * The layer had neither arrived nor failed when the file was issued — w6-fiche-delai (#180).
   *
   * Present only when true, and it is NOT a fifth `Withholding`: those four mirror
   * `public.question_outcome` and each names a decided outcome, while this names an undecided
   * one. The sheet gained this third state so that « source injoignable » — a hole to act on —
   * would stop reading like « mesure en cours » — an answer on its way. A dossier that dropped
   * the distinction would put it back, one step later, in the document that gets forwarded.
   *
   * Measured on the ticket's own demonstration, 15 September 2026: clicking 2,1 s after the
   * verdict landed produced a file whose `noise` was « indetermine » with nothing saying that
   * OpenStreetMap was still being waited on.
   */
  pending?: boolean;
  derivation: DossierDerivation;
}

export interface DossierGap {
  axis: VerdictAxis;
  because: Withholding;
  reason: string;
  /** The layer was still travelling when the file was issued, not missing. */
  pending?: boolean;
}

export interface Dossier {
  format: typeof DOSSIER_FORMAT;
  version: number;
  /** When this file was produced. Supplied by the caller: `src/core/` owns no clock. */
  issuedAt: string;
  locale: VerdictLocale;
  address: {
    label: string;
    lat: number;
    lng: number;
    /** BAN is what resolved the label and the coordinates, so it is cited like any figure. */
    source: string;
    licence: string;
  };
  verdict: {
    kind: Verdict['kind'];
    sentence: string;
    /** The axes the sentence was composed from. Empty on a refusal. */
    used: readonly VerdictAxis[];
  };
  figures: readonly DossierFigure[];
  /** What Compass does not know at this point, with the cause the producer named. */
  gaps: readonly DossierGap[];
  /** How to obtain this same answer without this file. */
  reproduce: {
    /** The published MCP call for this exact point — verified by `npm run verify:mcp`. */
    agentCall: AgentCall<ContextToolArguments>;
    methodology: string;
  };
  /** The refusal this product is built on, carried by the artefact that could break it. */
  doctrine: string;
}

/** The axis names and one-line descriptions, in the reader's language. */
export type DossierLabels = Readonly<Record<VerdictAxis, { label: string; counts: string }>>;

const SERVICE_FAMILIES = Object.keys(SERVICE_SATURATION) as ServiceFamily[];

/**
 * The derivation of one axis, built from the core's own constants.
 *
 * Every number here is imported. A radius or a saturation typed into this file would be a figure
 * in a signed document that nothing keeps in step with the function that produced the score —
 * the exact failure `Measured<T>` exists to prevent, moved into the export.
 *
 * `null` operands rather than a missing derivation on a withheld figure: a reader of a refusal
 * is owed what WOULD have been computed and over what radius, which is most of what tells them
 * whether the hole matters to them.
 */
function derivationOf(
  axis: VerdictAxis,
  operands: ScoringOperands,
  byAxis: ReadonlyMap<VerdictAxis, VerdictFinding>,
): DossierDerivation {
  const figure = (a: VerdictAxis) => byAxis.get(a)?.measured.value ?? null;
  switch (axis) {
    case 'density':
      return {
        kind: 'saturating',
        formula: '100 × (1 − exp(−n / S))',
        radiusM: FOOTFALL_RADIUS_M,
        constants: { S: PREMISE_SATURATION },
        operands: { n: operands.occupiedPremises },
      };
    case 'services':
      return {
        kind: 'weighted-saturating',
        formula: 'Σ_familles  w_f × 100 × (1 − exp(−n_f / S_f))',
        radiusM: SERVICE_RADIUS_M,
        constants: Object.fromEntries(
          SERVICE_FAMILIES.flatMap((f) => [
            [`w_${f}`, SERVICE_WEIGHTS[f]],
            [`S_${f}`, SERVICE_SATURATION[f]],
          ]),
        ),
        operands: Object.fromEntries(
          SERVICE_FAMILIES.map((f) => [`n_${f}`, operands.serviceCounts?.[f] ?? null]),
        ),
      };
    case 'alimentaire':
      return {
        kind: 'saturating',
        formula: '100 × (1 − exp(−n / S))',
        radiusM: SERVICE_RADIUS_M,
        constants: { S: SERVICE_SATURATION.alimentaire },
        operands: { n: operands.serviceCounts?.alimentaire ?? null },
      };
    case 'rail':
      return {
        kind: 'decaying',
        formula: '100 × exp(−d / D)',
        // The stop is LOOKED FOR in the amenity radius and the decay runs on a shorter
        // characteristic distance. Two different numbers, and a dossier that published one of
        // them would be read as publishing both.
        radiusM: AMENITY_RADIUS_M,
        constants: { D: TRANSIT_DECAY_M },
        // A rail layer that answered and found no stop is a measured zero, not an absence: it
        // is the one operand whose `null` has to be read against the figure beside it, which is
        // why `missingReason` and `note` travel on the same row.
        operands: { d: operands.nearestStationM },
      };
    case 'footfall':
      return {
        kind: 'blend',
        formula: 'w_locaux × densité + w_rail × desserte',
        radiusM: FOOTFALL_RADIUS_M,
        constants: { w_locaux: FOOTFALL_WEIGHTS.premises, w_rail: FOOTFALL_WEIGHTS.rail },
        // Both terms are figures this same dossier publishes on their own rows, so this one is
        // re-derivable from the file alone — no second lookup, no second source.
        operands: { densité: figure('density'), desserte: figure('rail') },
      };
    case 'noise':
      return {
        kind: 'scaled-sum',
        formula: 'K × Σ_voies  w × (1 − d / R)',
        radiusM: NOISE_RADIUS_M,
        constants: { K: NOISE_SCALE, R: NOISE_RADIUS_M },
        // `voies` is not decorative: a sum of zero over forty roads and a sum of zero over none
        // are two different statements, and only the count tells them apart.
        operands: { Σ: operands.roadExposure, voies: operands.roadsCounted },
      };
  }
}

/**
 * Re-derive one figure from what the dossier itself carries.
 *
 * It reads the constants and the operands OFF THE ROW and nothing else, then applies the core's
 * own `saturating` / `decaying`. That is the claim being made: the file holds enough to obtain
 * the number again. Using the core's functions rather than a second implementation is
 * deliberate — a reimplementation here would be a copy of the control, and a bug in the copy
 * would report a defect in the product or hide one (`docs/SESSIONS.md`, question 4 of the review).
 *
 * `null` when an operand is absent, which is the honest answer for a withheld figure: there is
 * nothing to re-derive, and returning 0 would manufacture the measured zero this codebase
 * refuses everywhere else.
 */
export function rederive(d: DossierDerivation): number | null {
  const need = (name: string): number | null => {
    const v = d.operands[name];
    return typeof v === 'number' ? v : null;
  };
  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  switch (d.kind) {
    case 'saturating': {
      const n = need('n');
      return n === null ? null : saturating(n, d.constants.S);
    }
    case 'weighted-saturating': {
      let sum = 0;
      for (const [name, value] of Object.entries(d.operands)) {
        if (typeof value !== 'number') return null;
        const family = name.slice('n_'.length);
        sum += d.constants[`w_${family}`] * saturating(value, d.constants[`S_${family}`]);
      }
      return clamp(Math.round(sum));
    }
    case 'decaying': {
      const dist = need('d');
      return dist === null ? null : decaying(dist, d.constants.D);
    }
    case 'blend': {
      const a = need('densité');
      const b = need('desserte');
      if (a === null || b === null) return null;
      return clamp(Math.round(a * d.constants.w_locaux + b * d.constants.w_rail));
    }
    case 'scaled-sum': {
      const sum = need('Σ');
      return sum === null ? null : clamp(Math.round(sum * d.constants.K));
    }
  }
}

/**
 * Everything the caller has to supply. One address; there is no plural form of this.
 *
 * **`findings` and not `scores`**, and the difference is the point: the sheet composes its
 * verdict from `findingsFromScores(scores, withheldBy)`, which is where a raw `Measured<T>`
 * acquires the STRUCTURED cause of its absence. Taking `AreaScores` here would have meant
 * re-deriving that cause on this side — and `verdict.ts` is explicit that it must never be
 * sniffed out of `missingReason` (`#61` refused exactly that). One array, read by the verdict
 * and by the dossier, is the only way the file and the sentence above the button cannot
 * disagree about why a figure is missing.
 */
export interface DossierInput {
  address: { label: string; lat: number; lng: number; source: string; licence: string };
  /** The same array `composeVerdict` was given. */
  findings: readonly VerdictFinding[];
  /**
   * Axes whose layer had not answered yet — the sheet's own `pendingAxes`, passed in rather than
   * guessed. Empty on any caller that waits for everything, which is every caller but the sheet.
   */
  pending?: ReadonlySet<VerdictAxis>;
  operands: ScoringOperands;
  verdict: Verdict;
  labels: DossierLabels;
  locale: VerdictLocale;
  /** ISO timestamp. Passed in because `src/core/` reads no clock, same as `Measured.asOf`. */
  issuedAt: string;
  /** Prose the sheet already publishes: the methodology line and the doctrine sentence. */
  copy: { methodology: string; doctrine: string };
}

/**
 * Build the dossier of ONE address.
 *
 * The figure population is `VERDICT_AXIS_ORDER`, enumerated and never listed — a seventh axis
 * enters the dossier the day it enters the sheet, which is the discipline `arms.ts`,
 * `catalogue.json` and the invariant census all follow (`docs/SESSIONS.md`, question 2). The
 * order is the sheet's reading order, so a reader comparing the two never has to map one onto
 * the other.
 */
export function buildDossier(input: DossierInput): Dossier {
  const byAxis = new Map(input.findings.map((f) => [f.axis, f] as const));

  const figures = VERDICT_AXIS_ORDER.map((axis): DossierFigure => {
    const finding = byAxis.get(axis);
    // An axis nobody supplied is `indetermine` — the same default `findingsFromScores` applies,
    // and the same refusal to guess. It cannot happen from the sheet, which passes all six; it
    // can happen from a caller that passes fewer, and that caller gets a row saying so rather
    // than a dossier quietly one figure short.
    const m: Measured<number> | null = finding?.measured ?? null;
    const derivation = derivationOf(axis, input.operands, byAxis);
    const enCours = input.pending?.has(axis) ?? false;
    return {
      axis,
      label: input.labels[axis].label,
      counts: input.labels[axis].counts,
      bearing: VERDICT_AXES[axis].bearing,
      scale: '0-100',
      value: m?.value ?? null,
      source: m?.source ?? UNSUPPLIED,
      licence: m?.licence ?? UNSUPPLIED,
      asOf: m?.asOf ?? UNSUPPLIED,
      method: m?.method ?? 'derived',
      ...(m?.note ? { note: m.note } : {}),
      ...(m?.missingReason ? { missingReason: m.missingReason } : {}),
      ...((m?.value ?? null) === null
        ? { withheldBecause: finding?.withheldBecause ?? 'indetermine', ...(enCours ? { pending: true } : {}) }
        : {}),
      derivation,
    };
  });

  return {
    format: DOSSIER_FORMAT,
    version: DOSSIER_VERSION,
    issuedAt: input.issuedAt,
    locale: input.locale,
    address: input.address,
    verdict: {
      kind: input.verdict.kind,
      sentence: input.verdict.sentence,
      used: input.verdict.kind === 'compose' ? input.verdict.used : [],
    },
    figures,
    // Derived from the figures rather than taken as a parameter: a dossier whose gap list could
    // be supplied separately is a dossier whose list can disagree with its own rows.
    gaps: figures
      .filter((f) => f.value === null)
      .map((f) => ({
        axis: f.axis,
        because: f.withheldBecause ?? 'indetermine',
        reason: f.missingReason ?? UNSUPPLIED,
        ...(f.pending ? { pending: true } : {}),
      })),
    reproduce: {
      agentCall: contextToolCall({ lat: input.address.lat, lng: input.address.lng }),
      methodology: input.copy.methodology,
    },
    doctrine: input.copy.doctrine,
  };
}

/** What a provenance field says when the caller supplied no finding for an axis at all. */
const UNSUPPLIED = 'non fourni';

/**
 * The name the file lands under.
 *
 * It carries the address and the day, because a dossier is a dated piece: two files for the same
 * address a month apart are two different claims, and a name that collided would let the second
 * overwrite the first in a downloads folder without anyone noticing.
 *
 * Sanitised down to what every filesystem accepts rather than transliterated: « Boulevard
 * Saint-Germain » keeping its accents in a name is a file that arrives corrupted through one mail
 * gateway in ten, and this file's whole purpose is to be forwarded.
 */
export function dossierFilename(dossier: Dossier): string {
  const slug = dossier.address.label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const day = dossier.issuedAt.slice(0, 10);
  return `compass-dossier-${slug || 'adresse'}-${day}.json`;
}

/** The dossier as the bytes that get written. Two-space indent: it is meant to be read. */
export function dossierToJson(dossier: Dossier): string {
  return JSON.stringify(dossier, null, 2);
}
