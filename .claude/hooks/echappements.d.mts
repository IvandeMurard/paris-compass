// Les types du module voisin, qui reste en `.mjs` pour la même raison que
// `scripts/esbuildInvocation.mjs` : un crochet est lancé par `node` nu, sans tsx. Le déclarer
// ici donne ses types au test sans faire dépendre d'un transpileur le moment où le crochet
// s'exécute — c'est-à-dire avant chaque appel Bash, plusieurs fois par minute.

/**
 * La raison du refus, ou `null` quand l'appel peut passer.
 *
 * Rend une chaîne plutôt qu'un booléen parce que le refus doit dire quoi faire à la place :
 * un blocage sans issue écrite se fait contourner, puis désarmer.
 */
export function verdict(commande: unknown): string | null
