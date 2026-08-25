/**
 * The line between an observation and a forecast, as a function rather than as a paragraph.
 *
 * w1-survie states it and stops there: « 72 % des cafés tiennent six ans » is an observation,
 * « votre café a 72 % de chances » is a forecast, and the second is forbidden. A rule that
 * lives only in a ticket is a rule nothing enforces.
 *
 * **Why this is in `src/core/` and not in the i18n layer where it was first written.**
 * It was first written in `src/i18n/survivalText.ts`, which is the browser's path — and the
 * browser is the one consumer that does not exist yet. An agent calling
 * `compass_survival_by_trade` over PostgREST receives `evidence` directly and would never have
 * met the guard. The rule protected a hypothetical reader and let the real caller through.
 *
 * `src/core/` is pure by contract (CLAUDE.md): no fetch, no React, no DOM. That is what lets
 * the browser, the evaluation gate and the MCP server share one definition instead of three
 * drifting copies. A doctrine that only holds on one of three paths is not a doctrine.
 *
 * The database carries the same rule independently, as invariant `I21` — because `evidence` is
 * written in SQL, and a guard in TypeScript cannot stop a sentence from being stored. Two
 * enforcements of one rule, at the two places text is actually produced.
 */

/** A forbidden form, and why it is forbidden. The reason travels with the failure. */
export interface ForbiddenForm {
  pattern: RegExp;
  why: string;
}

/**
 * Forms that turn an observation into a forecast.
 *
 * Explicit rather than a clever regex over verb endings: `-ra` would catch « opéra » and
 * « caméra », and a guard that fires on innocent words is a guard someone eventually disables.
 * Every entry is a word that only appears once a sentence has started addressing the reader or
 * predicting for them.
 */
export const FORBIDDEN_FORMS: readonly ForbiddenForm[] = [
  {
    pattern: /\b(votre|vos|vous|your|yours|you)\b/i,
    why: "deuxième personne : la phrase s'adresse au lecteur au lieu de décrire une cohorte",
  },
  {
    pattern:
      /\b(chance|chances|risque|risques|probabilit\w*|pr[ée]vision\w*|probability|odds|forecast\w*|likelihood)\b/i,
    why: 'vocabulaire de probabilité : un taux observé est rendu comme une chance individuelle',
  },
  {
    pattern:
      /\b(tiendra|tiendront|durera|dureront|survivra|survivront|fermera|fermeront|restera|resteront|sera|seront|aura|auront|will|would|expect\w*)\b/i,
    why: 'futur : une observation sur le passé est rendue comme une prédiction',
  },
];

/**
 * The first forbidden form in `sentence`, or null when it reads as an observation.
 *
 * Separate from `assertObservational` so a caller that must not throw — a batch check, a
 * report, the evaluation gate — can ask the same question without exception handling.
 */
export function findForbiddenForm(sentence: string): { term: string; why: string } | null {
  for (const { pattern, why } of FORBIDDEN_FORMS) {
    const hit = pattern.exec(sentence);
    if (hit) return { term: hit[0], why };
  }
  return null;
}

/**
 * Throws if a sentence has drifted from observation into forecast; returns it otherwise.
 *
 * Throwing rather than sanitising is deliberate. Silently stripping « votre » would leave a
 * sentence meaning something its author did not intend, and the point is to stop it from being
 * written that way at all — the two founding errors of `PLAN.md` §2.5 were both made in prose
 * written by hand, and both would have passed a sanitiser.
 */
export function assertObservational(sentence: string, where = 'phrase de survie'): string {
  const hit = findForbiddenForm(sentence);
  if (hit) {
    throw new Error(
      `${where} — interdit doctrinal w1-survie : ${hit.why}. Terme trouvé : « ${hit.term} ». ` +
        `Phrase : « ${sentence} »`,
    );
  }
  return sentence;
}
