// Le journal des questions, côté serveur MCP — w1-observabilite (#72).
//
// POURQUOI ICI ALORS QUE LE TICKET DIT « PAS DANS LE MCP ». La règle du ticket est que
// l'écriture vive là où la valeur est produite, et non sur le chemin de l'écran : une garde
// posée dans le front laisserait passer l'agent qui appelle PostgREST en direct. C'est pour ça
// que l'essentiel du journal est écrit par les fonctions `compass_*` elles-mêmes, dans la base,
// le seul endroit où les trois appelants se rejoignent (20260905000001).
//
// Restent deux faits que la base ne peut pas voir, et dont ce fichier est le producteur :
//
//   — LE NOM DE L'OUTIL. La base voit `compass_scoring_context_within` ; elle ne sait pas si
//     l'appel venait de `score_location`, de `compare_locations` ou de `explain_score`. Le
//     ticket demande « quel outil MCP coûte, lequel échoue » : ce nom n'existe qu'ici.
//   — UNE SOURCE TIERCE INJOIGNABLE. Overpass est appelé en HTTP par ce processus. Quand il ne
//     répond pas, aucune requête n'atteint la base, et aucune règle posée dans la base ne peut
//     l'apprendre. Le producteur d'un échec réseau est celui qui a fait l'appel réseau ; il n'y
//     a pas d'autre place possible, et c'est une limite du monde, pas un raccourci.
//
// CE QUE CE FICHIER NE COUVRE PAS : le front fait les mêmes appels Overpass depuis le
// navigateur et n'est pas instrumenté. Un axe `n/a` pour cause de miroir injoignable côté
// navigateur ne laisse donc aucune trace. C'est assumé — la direction du 31 août 2026 met le
// back-end, les données et le MCP avant le front (docs/REPRISE.md) — et c'est écrit plutôt que
// tu.

import { supabase } from "./supabase"

/** Les issues de `public.question_outcome`. Recopiées ici parce que TypeScript ne lit pas le
 *  catalogue Postgres ; I40 tient l'énumération côté base, et un nom inconnu est ignoré par
 *  `compass_record_question` plutôt que de faire échouer un appel. */
export type QuestionOutcome =
  | "repondu"
  | "vide"
  | "retenue_licence"
  | "hors_corpus"
  | "source_injoignable"
  | "erreur"

export interface QuestionRecord {
  /** Nom de l'outil MCP. La base ne le connaît pas. */
  appelee: string
  issue: QuestionOutcome
  lat?: number
  lng?: number
  radiusM?: number
  vintageYear?: number
  /** L'axe, quand la ligne enregistre un verdict d'axe plutôt qu'un appel. */
  axe?: string
  latencyMs?: number
}

/**
 * Enregistre une question. Ne rend rien, n'attend rien, ne lève jamais.
 *
 * NI ATTENDU NI RELANCÉ, et c'est délibéré. Le journal ne doit ni retarder la réponse d'un
 * aller-retour ni la faire échouer : `compass_record_question` porte déjà la même garde côté
 * base, pour la même raison. Ce qui se perd est une ligne de journal ; ce qui est protégé est
 * la réponse. Le serveur MCP vit le temps de la session d'un agent, donc la promesse a le temps
 * d'aboutir — un processus qui sortirait immédiatement après un appel perdrait sa dernière
 * ligne, et c'est le prix accepté.
 *
 * Aucune identité n'est transmise, et il n'y a pas de paramètre pour en transmettre une : le
 * point donné ici est résolu en quartier par la base, qui le jette ensuite.
 */
export function recordQuestion(r: QuestionRecord): void {
  // Le même interrupteur que `supabase.ts` : `verify:mcp` ne doit pas se compter. Lu ici aussi
  // parce que cet appel-ci ne passe pas par un en-tête qu'on relirait — il EST l'écriture.
  if (process.env.COMPASS_OBSERVABILITE === "off") return
  void supabase
    .rpc("compass_record_question", {
      p_surface: "outil_mcp",
      p_appelee: r.appelee,
      p_issue: r.issue,
      p_lat: r.lat ?? null,
      p_lng: r.lng ?? null,
      p_radius_m: r.radiusM ?? null,
      p_vintage_year: r.vintageYear ?? null,
      p_axe: r.axe ?? null,
      p_latency_ms: r.latencyMs ?? null,
    })
    .then(
      () => undefined,
      () => undefined,
    )
}
