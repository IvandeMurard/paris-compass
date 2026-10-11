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
//
// **Ce que le raisonnement ci-dessus n'avait pas vu, et que le 11 septembre a payé.** Il a
// remplacé un seuil faux par un arrondi — et un arrondi a lui aussi un bord. Mesuré sur le
// distant le 11 septembre 2026, après l'ingestion BODACC de 08:12 UTC : la médiane atteint
// 165 000 € exactement, soit le MILIEU du pas de 10 000. Deux conséquences, et aucune n'est
// une marche d'escalier :
//
//   - l'arrondi part à 170 000, soit 5 000 € au-dessus de la mesure — un demi-pas, l'écart
//     maximal qu'un arrondi puisse produire. Le produit aurait publié le nombre le plus faux
//     que cette règle autorise ;
//   - 165 000 € ne revient que 10 fois dans les 5 971 cessions, aux rangs 2986 à 2995, et le
//     rang médian est 2986 — le PREMIER du plateau. La valeur distincte juste en dessous est
//     164 174 € (rang 2985). UNE cession de plus sous la médiane la fait retomber là, donc
//     arrondir à 160 000. Le chiffre publié était à une vente de rebasculer, et BODACC ingère
//     toutes les nuits.
//
// Corriger le README aurait donc imposé une seconde édition inverse peu après. Un nombre qui
// oscille entre deux valeurs publiées au fil des nuits n'est pas une mesure.
//
// **Le correctif, tranché par Ivan le 13 septembre 2026 : le produit publie une TRANCHE.**
// « Entre 160 000 et 170 000 € », et il dit pourquoi — les prix de fonds se déclarent en
// nombres ronds, la médiane est assise sur une marche. Le bras juge donc la tranche, au
// `Math.floor` et non au `Math.round`.
//
// Et ce n'est toujours pas un desserrage, pour une raison mécanique : un arrondi place la
// mesure au BORD de ce qu'il publie, une tranche la place DEDANS. Remesuré sur les trois
// valeurs qu'a prises cette médiane — 160 868 le 9 août, 163 000 le 2 septembre, 165 000 le
// 11 — les trois tombent dans la MÊME tranche 160 000-170 000. La règle d'arrondi, elle,
// aurait crié sur la troisième. Ce qui bloque désormais est le franchissement d'un multiple
// du pas, c'est-à-dire le seul moment où la phrase publiée cesse d'être vraie.
//
// **Ce que ça ne rattrape pas.** Le bras juge la tranche PUBLIÉE, jamais que cette tranche
// soit la bonne à publier : un pas de 10 000 sur une population de 5 971 cessions est une
// décision éditoriale, pas une propriété de la donnée. Et il ne connaît que le README et
// /methodologie — la même valeur recopiée dans un guide ou une page éditoriale lui échappe.
// Le tableau des médianes PAR MÉTIER du README n'est gardé par aucune baseline : voir l'issue
// ouverte le 13 septembre 2026.

/** Au-delà, un comptage ne dérive plus : le pipeline a changé. Inchangé depuis le 9 août 2026. */
export const DRIFT_FAIL = 0.01

/** La précision à laquelle la mesure est publiée — README, /methodologie. */
export interface Publie {
  /** La largeur de la tranche, en euros. Le README publie au dix-millier. */
  pas: number
  /** La borne BASSE de la tranche publiée, au moment du gel. Le produit écrit « entre
   *  `bas` et `bas + pas` ». */
  bas: number
}

export interface Attendu {
  value: number
  publie?: Publie
}

export interface Verdict {
  bloquant: boolean
  detail: string
}

/**
 * La tranche telle que le produit l'affiche : la borne basse de « entre bas et bas + pas ».
 *
 * `Math.floor` et non `Math.round`, et la différence est tout le correctif du 13 septembre :
 * un arrondi place la mesure au BORD de ce qu'il publie, une tranche la place DEDANS.
 */
export function tranchePubliee(valeur: number, pas: number): number {
  return Math.floor(valeur / pas) * pas
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

  const pas = attendu.publie.pas
  const tranche = tranchePubliee(mesure, pas)
  const dire = (bas: number) => `${bas}-${bas + pas}`

  if (tranche !== attendu.publie.bas) {
    return {
      bloquant: true,
      detail:
        `${brut} — et la tranche publiée change : ${dire(attendu.publie.bas)} → ${dire(tranche)}. ` +
        "Mettre à jour le README et /methodologie avant de regeler, sinon le produit affiche " +
        "une fourchette que la base ne porte plus.",
    }
  }

  return {
    bloquant: false,
    detail: `${brut} — quantile, tranche publiée inchangée à ${dire(attendu.publie.bas)}`,
  }
}
