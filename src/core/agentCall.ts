/**
 * The MCP call that answers the same question as a context sheet — w6-contexte (#119), step 6.
 *
 * **Why this is in `src/core/` and not in the component that prints it.** The sheet shows a
 * visitor « here is the call an agent would make for this address ». A tool name typed into a
 * React component is a claim about a server that component never talks to: rename a tool, add a
 * parameter, and the page goes on printing an invocation that errors. Putting the shape here
 * makes it reachable from the one place able to check it — `mcp-server/src/verify.ts` compiles
 * against this directory and asserts, against the live server, that the registered tool bears
 * this exact name and these exact parameters.
 *
 * So the displayed call is verified rather than claimed, which is the same discipline
 * `Measured<T>` applies to a figure, applied to an invocation.
 *
 * **What this does NOT catch.** It pins the name and the parameter names, never the semantics:
 * a tool that kept its signature and changed what it returns would pass. That half is covered
 * elsewhere — the PARITE family of `verify.ts` recomposes the server's verdict from the figures
 * the server publishes. And nothing here says the agent gets the same NUMBERS: the browser
 * reads premises from OpenStreetMap's `shop=vacant` tagging, the server from APUR's BDCom
 * survey, and that divergence is deliberate — the server's source is the better one. What is
 * shared is the composition, not the corpus.
 */

import { AMENITY_RADIUS_M } from './scoring';

/**
 * The BDCom vintage a caller gets unless it asks otherwise.
 *
 * 2023 and not the newest available: it is the only vintage published under ODbL. 2017 and
 * 2020 carry an APUR licence nobody has read, so an anonymous caller receives neither their
 * contents nor their counts — see `compass_vintages`, which is the only place that knows this
 * and the reason no licence string is written here.
 */
export const DEFAULT_VINTAGE_YEAR = 2023;

/** The tool a context sheet corresponds to, and the one a comparison corresponds to. */
export const CONTEXT_TOOL = 'score_location';
export const COMPARE_TOOL = 'compare_locations';

export interface ContextToolArguments {
  lat: number;
  lng: number;
  radius_m: number;
  vintage_year: number;
}

export interface CompareToolArguments {
  a: { lat: number; lng: number };
  b: { lat: number; lng: number };
  radius_m: number;
  vintage_year: number;
}

export interface AgentCall<T> {
  tool: string;
  arguments: T;
}

/** The call that reproduces one context sheet. */
export function contextToolCall(
  point: { lat: number; lng: number },
  radiusM = AMENITY_RADIUS_M,
  vintageYear = DEFAULT_VINTAGE_YEAR,
): AgentCall<ContextToolArguments> {
  return {
    tool: CONTEXT_TOOL,
    // Six decimals is ~0.1 m, the same precision the sheet's own URL carries: an agent handed
    // a rounder figure would score a different doorway and get a defensibly different answer.
    arguments: {
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
      radius_m: radiusM,
      vintage_year: vintageYear,
    },
  };
}

/**
 * The call that reproduces one two-address comparison.
 *
 * Two named points, `a` and `b`, because the tool takes two named points — and because a
 * comparison that could carry a list would be the broker's export that `docs/PERIMETRE.md` §1
 * refuses. The bound holds on both sides of the wire or it holds on neither.
 */
export function compareToolCall(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  radiusM = AMENITY_RADIUS_M,
  vintageYear = DEFAULT_VINTAGE_YEAR,
): AgentCall<CompareToolArguments> {
  const round = (p: { lat: number; lng: number }) => ({
    lat: Number(p.lat.toFixed(6)),
    lng: Number(p.lng.toFixed(6)),
  });
  return {
    tool: COMPARE_TOOL,
    arguments: { a: round(a), b: round(b), radius_m: radiusM, vintage_year: vintageYear },
  };
}
