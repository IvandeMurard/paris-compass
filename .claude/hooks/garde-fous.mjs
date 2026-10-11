// Les pièges de l'outil Bash qui ont déjà coûté du temps, transformés en refus.
//
// **Ce fichier porte une LISTE DE RÈGLES, et c'est le point.** La première version ne refusait
// qu'un piège, celui des antislashs mangés — un crochet pour un exemple. Ivan a demandé le
// 13 septembre 2026 que la correction soit « indépendante de l'exemple et s'applique par défaut,
// peu importe la session ». Ajouter un piège doit donc coûter une ENTRÉE, pas un crochet neuf :
// c'est la différence entre corriger une occurrence et corriger une classe, et c'est la même
// distinction que ce dépôt fait partout ailleurs entre énumérer et lister.
//
// **Pourquoi des refus plutôt que des notes.** Les deux règles ci-dessous étaient déjà écrites,
// l'une en mémoire de session, l'autre dans `CLAUDE.md`. Les deux ont quand même été enfreintes
// le 13 septembre, la seconde dix minutes après que je l'aie moi-même rappelée à une session de
// développement. Une note se lit quand on va la chercher ; l'erreur arrive quand on ne la cherche
// pas. C'est la doctrine du dépôt appliquée à son propre outillage : **une règle vit là où la
// sortie est produite.**
//
// **Le critère d'admission d'une règle, écrit pour que la liste ne gonfle pas.** Une règle entre
// ici quand elle réunit les trois : le piège a coûté du temps AU MOINS DEUX FOIS ; sa détection
// est syntaxique, donc sans faux positif plausible ; et il existe une autre façon de faire, que
// le message nomme. Un piège rare, ou dont le refus gênerait un geste courant, reste une note —
// **un crochet insupportable se fait désarmer, et un crochet désarmé ne garde plus rien.**

/**
 * Le corps utile, une fois retirés les chemins de fichiers Windows.
 *
 * `node C:\tmp\a\b.mjs` est plein d'antislashs et ne contient aucun code en ligne : les compter
 * ferait refuser la voie que ce crochet recommande, ce qui serait absurde.
 */
function sansCheminsWindows(commande) {
  return commande.replace(/[A-Za-z]:\\[^\s"']*/g, " ")
}

const INTERPRETEUR = /(^|[\s;&|(])(python3?|node|perl|ruby)([\s]|$)/
const NOURRI_EN_LIGNE = /<<-?\s*['"]?\w+|(^|\s)-[ce](\s|$)/

const TUBE_VERS_LECTEUR = /\|\s*(tail|head|grep|findstr|more|less|wc)\b/
const LIT_LE_CODE = /\$\?/
const SAIT_CE_QU_IL_FAIT = /pipefail|PIPESTATUS/

/**
 * La commande privée des CORPS de heredoc.
 *
 * **Un corps de heredoc est une donnée, pas du shell**, et les deux règles n'en veulent pas la
 * même chose : celle des antislashs doit le lire — c'est là que vit le code d'interpréteur —
 * tandis que celle du tube ne le doit surtout pas.
 *
 * Trouvé en me le prenant, le 13 septembre 2026 : le message de commit qui EXPLIQUAIT la règle
 * du tube citait `npm.cmd run X | tail; echo $?` en prose, et la règle a refusé son propre
 * commit. Les messages de ce dépôt citent des commandes en permanence ; sans cette coupe, la
 * règle rendrait le geste le plus courant du dépôt impraticable.
 */
function sansCorpsDeHeredoc(commande) {
  const lignes = commande.split("\n")
  const gardees = []
  let terminateur = null

  for (const ligne of lignes) {
    if (terminateur !== null) {
      if (ligne.trim() === terminateur) terminateur = null
      continue
    }
    const ouverture = /<<-?\s*['"]?(\w+)['"]?/.exec(ligne)
    gardees.push(ligne)
    if (ouverture) terminateur = ouverture[1]
  }
  return gardees.join("\n")
}

/**
 * Les instructions de la commande, dans l'ordre.
 *
 * **Découper est nécessaire, et la première version ne le faisait pas.** Elle cherchait un tube
 * ET un `$?` n'importe où dans la chaîne, et a refusé, le 13 septembre 2026, une commande
 * parfaitement correcte : deux redirections vers des fichiers suivies chacune de leur `$?`, puis
 * un `grep … | head` final que rien ne jugeait. Le tube et le `$?` coexistaient sans avoir le
 * moindre rapport. C'est précisément le faux positif qui fait désarmer un crochet — donc ce qui
 * compte n'est pas la coexistence, c'est la SUCCESSION.
 */
function instructions(commande) {
  return commande.split(/;|&&|\|\||\n/)
}

export const REGLES = [
  {
    nom: "echappements-manges",
    detecte(commande) {
      return (
        INTERPRETEUR.test(commande) &&
        NOURRI_EN_LIGNE.test(commande) &&
        sansCheminsWindows(commande).includes("\\")
      )
    },
    message:
      "Cet appel écrit du code d'interpréteur EN LIGNE et ce code contient des antislashs. " +
      "L'outil Bash en retire un niveau avant que le shell les voie : `\\s` arrive en `s`, " +
      "`\\\\` en `\\`. Le script échoue, ou fait silencieusement autre chose.\n\n" +
      "À faire à la place, et c'est la seule façon qui ait tenu :\n" +
      "  1. écrire le script dans un fichier avec l'outil Write (le scratchpad convient) ;\n" +
      "  2. le lancer par son chemin — `python <chemin>` / `node <chemin>`.\n\n" +
      "Payé trois fois le 13 septembre 2026, après avoir déjà été consigné en mémoire. Et une " +
      "fois de plus que du temps perdu : le 26 août, un `\\y` mangé a fait rendre une " +
      "population vide à une requête de catalogue, et j'ai failli écrire dans `DIAGNOSTIC.md` " +
      "que le recensement `I23`/`I24` ne marchait plus. Un défaut d'échappement ne ressemble " +
      "pas à un défaut d'échappement : il ressemble à une découverte.",
  },
  {
    nom: "code-de-sortie-au-travers-d-un-tube",
    detecte(commande) {
      const shell = sansCorpsDeHeredoc(commande)
      if (SAIT_CE_QU_IL_FAIT.test(shell)) return false
      const suite = instructions(shell)
      // Un tube vers un lecteur, DONT LE CODE EST LU juste après. Le `$?` d'une instruction
      // plus loin parle d'autre chose et ne regarde pas ce tube.
      return suite.some(
        (instruction, i) =>
          TUBE_VERS_LECTEUR.test(instruction) && LIT_LE_CODE.test(suite[i + 1] ?? ""),
      )
    },
    message:
      "Cet appel canalise une commande vers un lecteur (`tail`, `head`, `grep`…) puis lit " +
      "`$?`. **`$?` rend alors le code du LECTEUR, pas celui de la commande** — et `tail` " +
      "réussit presque toujours. Le rapport dira 0 quelle que soit la vérité.\n\n" +
      "À faire à la place :\n" +
      "  1. rediriger vers un fichier — `npm.cmd run X > sortie.txt 2>&1` ;\n" +
      "  2. lire `$?` juste après ;\n" +
      "  3. puis seulement lire le fichier.\n\n" +
      "Ou poser `set -o pipefail`, ou lire `${PIPESTATUS[0]}` — le crochet laisse alors passer.\n\n" +
      "Ce dépôt a conclu faux deux fois comme ça, et `CLAUDE.md` porte la règle : le rapport " +
      "ne lit que le code de sortie. Le 13 septembre 2026, un `sessions:check` annoncé vert " +
      "sortait en réalité en 1 — dix minutes après que la même règle ait été écrite dans le " +
      "prompt d'une session de développement.",
  },
]

/**
 * La raison du refus, ou `null` quand l'appel peut passer.
 *
 * Rend une chaîne plutôt qu'un booléen parce qu'un refus doit dire quoi faire à la place : un
 * blocage sans issue écrite se fait contourner, puis désarmer.
 */
export function verdict(commande) {
  if (typeof commande !== "string" || commande.length === 0) return null
  for (const regle of REGLES) {
    if (regle.detecte(commande)) {
      return `Refusé par le garde-fou \`${regle.nom}\`.\n\n${regle.message}`
    }
  }
  return null
}

async function main() {
  let brut = ""
  for await (const morceau of process.stdin) brut += morceau

  let commande
  try {
    commande = JSON.parse(brut)?.tool_input?.command
  } catch {
    // Un crochet qui plante ne doit jamais bloquer le travail : en cas de doute, il laisse passer.
    process.exit(0)
  }

  const raison = verdict(commande)
  if (raison === null) process.exit(0)

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: raison,
      },
    }),
  )
}

// Importé par le test, exécuté par le crochet : ne lire stdin que dans le second cas.
if (process.argv[1] && process.argv[1].endsWith("garde-fous.mjs")) await main()
