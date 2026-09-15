/**
 * Which layers the mini-map is allowed to draw — w6-contexte (#119), step 5.
 *
 * The ticket asks for « couches liées aux constats affichés ». That is a derivation, not a
 * choice of what looks good: `VERDICT_AXES` already records, per axis, the layers that axis
 * reads, because `composeVerdict` needs it to attribute a withholding to the right figure.
 * Reusing it means the picture and the sentence cannot drift — an axis added to the core
 * arrives on the map the same day, and one removed leaves it.
 *
 * **Why only the axes that RESOLVED.** A layer that produced no figure has nothing to
 * illustrate, and drawing its points anyway is the exact confusion `docs/PERIMETRE.md` warns
 * about: a screen full of dots reads as coverage. If footfall came back withheld for licence,
 * showing premises dots beside the refusal would contradict it in the one medium a visitor
 * reads first.
 *
 * **What this does not catch**: it says which layers MAY be drawn, never that the component
 * drew them, and never that the points it drew are the ones the figures were computed on. That
 * second guarantee is structural instead — `useAddressContext` hands over the single snapshot
 * it scored, so there is no other set of points to draw.
 */

import { VERDICT_AXES, VERDICT_AXIS_ORDER, type AreaScores, type Layer, type VerdictAxis } from '@/core';

/** The axes that came back with a value — the findings the sheet actually shows a figure for. */
export function resolvedAxes(scores: AreaScores): VerdictAxis[] {
  return VERDICT_AXIS_ORDER.filter((axis) => scores[axis].value !== null);
}

/**
 * The layers behind those axes, intersected with the layers that actually loaded.
 *
 * Both conditions are needed and neither implies the other: an axis can resolve on one of its
 * two layers (footfall reads premises *and* amenities), and a layer can load while every axis
 * reading it was withheld for another reason.
 */
/**
 * The axes whose absence is only an answer still travelling — w6-fiche-delai (#180).
 *
 * Same derivation as everything else here: `VERDICT_AXES` says which layers an axis reads, so
 * an axis is « still being measured » exactly when every layer it reads is still in flight. One
 * layer arrived and another pending would make the figure partial rather than pending, and
 * `scoreLocation` already decides that case — it is not re-decided here.
 *
 * It exists because « no figure yet » and « no figure, source unreachable » read alike on
 * screen and must not: the first is a sentence about this second, the second is a hole in the
 * data that coming back tomorrow might fix.
 */
export function pendingAxes(pending: readonly Layer[]): Set<VerdictAxis> {
  const axes = new Set<VerdictAxis>();
  if (pending.length === 0) return axes;
  for (const axis of VERDICT_AXIS_ORDER) {
    if (VERDICT_AXES[axis].layers.every((layer) => pending.includes(layer))) axes.add(axis);
  }
  return axes;
}

export function drawableLayers(scores: AreaScores, loaded: readonly Layer[]): Set<Layer> {
  const layers = new Set<Layer>();
  for (const axis of resolvedAxes(scores)) {
    for (const layer of VERDICT_AXES[axis].layers) {
      if (loaded.includes(layer)) layers.add(layer);
    }
  }
  return layers;
}
