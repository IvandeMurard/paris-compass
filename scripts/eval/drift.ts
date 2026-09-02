// Ce qu'un écart de baseline signifie — et pourquoi un comptage et un quantile ne se jugent pas
// avec la même règle.
//
// **Le raisonnement d'origine, qui reste juste pour ce qu'il visait.** Une baseline de comptage
// ne bouge que si des lignes entrent ou sortent : au-delà de 1 %, ce n'est plus une
// republication de source mais un changement de comportement du pipeline. C'est la règle du
// bras B depuis le 9 août 2026, et elle ne change pas ici.
//
// **Où elle ne tient pas.** `prix_median_local_identifiable` n'est pas un comptage, c'est un
// quantile — et un quantile sur une distribution en paliers se déplace par sauts. Mesuré le
// 2 septembre 2026 sur le distant : la population passe de 5 942 à 5 959 cessions (+0,29 %), et
// la médiane de 160 868 à 163 000 € (+1,33 %). Entre les rangs 2 971 et 2 988, les valeurs
// montent de 160 000 à 165 000 : la médiane est assise sur un escalier, parce que les prix de
// fonds se massent sur les nombres ronds — 150 000 € revient 130 fois, 180 000 € 88 fois,
// 160 000 € 63 fois, et entre les paliers la densité est mince. Dix-sept cessions de plus
// déplacent le rang médian de huit positions, et huit positions valent ici 2 132 €.
//
// Le seuil de comptage appliqué à ce nombre-là rendait donc la porte **fausse dans les deux
// sens** :
//
//   - trop bruyante — un rouge bloquant sur une marche d'escalier, alors que rien du pipeline
//     n'a bougé et qu'aucune affirmation publiée n'a changé ;
//   - trop silencieuse — et c'est le côté grave. Une médiane passant de 164 999 à 165 001 €
//     bouge de 0,001 %, donc passe en avertissement sans réveiller personne. Elle fait pourtant
//     basculer le chiffre publié de 160 000 à 170 000 €.
//
// **Ce que ces nombres existent pour protéger.** `eval/baselines/ingestion.json` le dit
// lui-même : « les prix publiés dans le README sortent de ces deux mesures ». L'invariant utile
// n'est donc pas « la médiane brute a peu bougé », c'est « le chiffre publié n'a pas changé
// sans qu'on le sache ». Une baseline qui porte `publie` est jugée là-dessus, et son mouvement
// brut reste rapporté en avertissement — visible, jamais bloquant.
//
// Ce n'est pas un desserrage de seuil : la règle devient plus stricte exactement là où le
// produit ment, et cesse de crier là où il ne ment pas.

/** Au-delà, un comptage ne dérive plus : le pipeline a changé. Inchangé depuis le 9 août 2026. */
export const DRIFT_FAIL = 0.01

/** La précision à laquelle la mesure est publiée — README, /methodologie. */
export interface Publie {
  /** Le pas d'arrondi, en euros. Le README publie des prix au dix-millier. */
  pas: number
  /** La valeur arrondie telle qu'elle est écrite dans le produit, au moment du gel. */
  valeur: number
}

export interface Attendu {
  value: number
  publie?: Publie
}

export interface Verdict {
  bloquant: boolean
  detail: string
}

/** L'arrondi tel que le produit l'affiche. */
export function arrondiPublie(valeur: number, pas: number): number {
  return Math.round(valeur / pas) * pas
}

export function derive(attendu: number, mesure: number): number {
  return Math.abs(mesure - attendu) / Math.max(attendu, 1)
}

/**
 * Le verdict d'une baseline, comptage ou quantile.
 *
 * L'appelant a déjà traité l'égalité stricte : ici, la valeur a bougé.
 */
export function verdictEcart(attendu: Attendu, mesure: number): Verdict {
  const ecart = derive(attendu.value, mesure)
  const brut = `attendu ${attendu.value}, mesuré ${mesure} (${(ecart * 100).toFixed(2)}%)`

  if (attendu.publie === undefined) {
    return { bloquant: ecart > DRIFT_FAIL, detail: brut }
  }

  const arrondi = arrondiPublie(mesure, attendu.publie.pas)
  if (arrondi !== attendu.publie.valeur) {
    return {
      bloquant: true,
      detail:
        `${brut} — et le chiffre publié change : ${attendu.publie.valeur} → ${arrondi}. ` +
        "Mettre à jour le README et /methodologie avant de regeler, sinon le produit affiche " +
        "une valeur que la base ne porte plus.",
    }
  }

  return {
    bloquant: false,
    detail: `${brut} — quantile, chiffre publié inchangé à ${attendu.publie.valeur}`,
  }
}
