// Les types du module voisin, qui reste en `.mjs` pour une raison de fond : `verify-mcp.mjs`
// tourne sous `node` nu, sans tsx — c'est ce qui fait de lui une porte jouable partout, y
// compris sur le poste où tsx ne démarre pas. Le déclarer ici donne au test ses types sans
// rien faire dépendre d'un transpileur au moment où la porte s'exécute.

/** Vrai si le fichier commence par `#!` — un script — plutôt que par un en-tête d'exécutable. */
export function isNodeScript(path: string): boolean

/** Ce qu'il faut passer à `spawnSync` : les arguments de l'appelant viennent après `args`. */
export function esbuildInvocation(
  path: string,
  options?: { execPath?: string },
): { command: string; args: string[] }
