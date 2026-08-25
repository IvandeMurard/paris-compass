// The coordinate box the tools accept, and what it is worth.
//
// Measured 25 August 2026 from the 80 polygons of `public.quartier` — ST_Extent of the whole
// layer, including the Bois de Boulogne and the Bois de Vincennes, which are administratively
// part of Paris. This is the tightest possible rectangle around the city.
//
// It replaces 48.6–49.1 / 2.1–2.5, which accepted a good part of the inner suburbs while its
// own description said "Paris intra-muros": the schema contradicted itself.
//
// **It does not fix DIAGNOSTIC.md §16, and must not be mistaken for the fix.** Measured the
// same day, four communes fall inside this rectangle without being in any quartier:
//
//   Boulogne-Billancourt (48.835 · 2.240)   Levallois (48.893 · 2.288)
//   Saint-Mandé          (48.845 · 2.418)   Montreuil (48.862 · 2.443)
//
// A rectangle does not describe a commune, and no tuning will make it. The real test is
// quartier membership, done by compass_scoring_context_within (20260825000003), which returns
// an `out_of_corpus` marker row. This file is schema hygiene only: making the constraint say
// what the promise says.

/** ST_Extent of the 80 quartiers, measured 25 August 2026. */
export const PARIS_BOUNDS = {
  latMin: 48.8156,
  latMax: 48.9022,
  lngMin: 2.2241,
  lngMax: 2.4698,
} as const

export const LAT_DESCRIPTION =
  "Latitude. Bornée à l'emprise réelle de Paris (48,8156–48,9022), mesurée sur les 80 quartiers. " +
  "Un point dans ces bornes peut malgré tout être hors du recensement — Boulogne, Levallois, " +
  "Saint-Mandé et Montreuil y tombent : les scores tirés des locaux reviennent alors inconnus."

export const LNG_DESCRIPTION =
  "Longitude. Bornée à l'emprise réelle de Paris (2,2241–2,4698), mesurée sur les 80 quartiers. " +
  "Voir la remarque sur la latitude : la boîte est un rectangle, le corpus ne l'est pas."
