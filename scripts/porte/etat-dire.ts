// `npm.cmd run porte:etat` — the open reds and their age, without opening GitHub.
//
// Split from scripts/porte/etat.ts for the reason scripts/porte/catalogue-verify.ts is split
// from catalogue.ts: scripts/brief.ts imports the module, and a module that runs on import
// would fire a `gh` call every time somebody imports it, including in the test run.

import { etatCourant } from "./etat"

const etat = etatCourant()
process.stdout.write(etat.lignes.join("\n") + "\n")
process.exitCode = etat.code
