// Regenerates the ordered session table in docs/SESSIONS.md from what is measurable:
// the ticket files on disk and the live issue state on GitHub. Everything a human
// decided — model choice, per-session prompt additions, why the order is what it is —
// lives outside the generated block and is never touched.
//
// The point is the rule CLAUDE.md carries: a document is not a measurement. A table
// typed by hand goes stale the moment a session closes an issue; a derived one cannot.
//
// **A derived table still goes stale if nobody derives it.** Being generated proves the
// table was true *once*, which is exactly the trap this repository keeps rediscovering: a
// measured figure without its date becomes false in silence. Hence `--check`, which answers
// "is what is committed still true?" without writing anything:
//
//   npm.cmd run sessions        regenerates and writes
//   npm.cmd run sessions:check  compares and exits 1 if the committed table has drifted
//
// `--check` compares the **claims**, not the bytes: the "régénérée le …" line is expected to
// differ every day and a check that failed on it would be noise, and noise is how a check
// gets disabled. It reports which ticket moved, so the diff is readable without a diff.
//
// ── The epics, added 15 September 2026 ────────────────────────────────────────────────────
//
// The same pair, one level up: the eight `[épic] Vague N` issues carry a checklist that was
// ticked by hand and compared to nothing. Three of the eight were wrong the morning this was
// written — #42 listed 7 of its 17 labelled tickets. The rule and its limits are in
// scripts/session-epiques.ts; this file only holds the two ends:
//
//   npm.cmd run sessions -- --epiques   rewrites the `## Tickets` block of each epic on GitHub
//   npm.cmd run sessions:check          ALSO cross-checks those lists, and exits 1 on drift
//
// `--epiques` is a flag rather than a second npm script on purpose. It is the same data, read
// by the same call, under the same promise — and a new script would owe `scripts/porte/
// cadence.json` an entry for an arm that adds nothing the check does not already say. The
// write stays behind the flag because it touches GitHub and `sessions` alone touches only a
// file in the repository.

import { readFileSync, writeFileSync, readdirSync, mkdtempSync } from "fs"
import { execFileSync } from "child_process"
import { tmpdir } from "os"
import { join, resolve } from "path"

import { modeleDe } from "./session-choix"
import {
  Ecart,
  corpsRegenere,
  epiquesDe,
  recouperLesEpiques,
  ticketsDeLaVague,
  vagueDe,
} from "./session-epiques"
import { Issue, RefusGitHub, issuesDuTicket, lireIssues } from "./session-issues"

const DOC = resolve("docs/SESSIONS.md")
const TICKETS = resolve("docs/tickets")
const BEGIN = "<!-- BEGIN sessions -- généré par `npm.cmd run sessions`, ne pas éditer à la main -->"
const END = "<!-- END sessions -->"

/** Order is a human decision, so it is declared here rather than inferred. Unlisted
 *  tickets fall to the end, sorted by id — visible, never silently dropped. */
const ORDER = [
  // --- P0, 13 September 2026: the product page does not work ----------------------------
  // Measured as an anonymous visitor: /contexte/<address> shows a loading line for 2 min 20
  // and then an error screen, on two addresses. These three head the queue because nothing
  // else can be measured on a page that crashes — and because the gate was entirely green
  // while it happened. Order decided by Ivan: the crash, then the corpus, then the arm that
  // would have caught both. They sit before every closed w0 ticket on purpose: what matters
  // is that they precede every ticket still OPEN, and the queue derives itself from that.
  "w6-fiche-robuste",
  "w6-fiche-corpus",
  "w1-porte-page",
  // Ouvert en passant par la session de #156, placé ici le 14 septembre 2026. Il suit
  // w6-fiche-corpus et non les tickets produit, pour une raison de connaissance et non de
  // valeur : c'est la session qui vient de découpler la fiche d'Overpass qui sait ce qu'il
  // reste à /carte. Placé plus loin, il serait repris par quelqu'un qui devrait tout
  // remesurer. Ce n'est pas un P0 — la fiche n'en dépendra plus — mais /carte interroge
  // toujours la même liste, sans budget, et rien ne dit si son ordre est encore juste.
  // Passe DEVANT w1-overpass-ordre, le 14 septembre 2026, et le rend presque sans objet pour
  // la fiche : une fois `amenities` servi par le corpus, l'ordre des miroirs ne décide plus
  // que de /carte. Mesuré le même jour — la fiche rend un constat sur six, et une seule
  // couche explique les trois axes porteurs manquants. C'est le dernier ticket entre l'état
  // courant et « un verdict se compose », pour le navigateur et pour l'agent à la fois.
  "w6-amenites-corpus",
  // --- Ce que l'utilisateur ressent, avant ce qui le protège — ordre validé par Ivan le
  // 15 septembre 2026. Le produit répond depuis ce jour-là ; ces deux tickets sont les seuls
  // défauts encore visibles à l'écran, et ils passent donc devant les instruments.
  "w6-fiche-delai",
  "w6-langue-absences",
  "w1-overpass-ordre",
  // Trouvé le 15 septembre en vérifiant que l'agent recevait bien le verdict que l'écran
  // compose : deux passages de verify:mcp, un refus puis un verdict, et le bras vert sur les
  // deux. Placé ici parce qu'il garde une promesse déjà livrée — le produit marche, ce ticket
  // empêche qu'il cesse de marcher sans que personne ne le voie.
  "w1-parite-refus",
  // Les trouvailles de la revue du 15 septembre, qui n'a pas été faite par les sessions qui
  // ont écrit le code. Elles gardent des instruments, donc elles ne se voient pas à l'écran —
  // et elles passent après les deux tickets qui s'y voient.
  //
  // Celui-ci passe devant les deux autres : il ne garde pas un bras, il garde l'outil qui
  // DISPATCHE les sessions. Depuis #187 le mauvais numéro d'issue porte un ordre
  // « ARRÊTE-TOI », donc tant qu'il est là, n'importe quelle session suivante peut être
  // arrêtée sur l'état d'une autre issue — y compris celles qui traitent les deux tickets
  // ci-dessous.
  "w1-brief-appariement",
  "w1-page-delai-derive",
  "w1-parite-axes-enumere",
  // Demandé par Ivan le 15 septembre 2026, après que la page est passée de 10 976 à 3 611 ms :
  // « il faudra itérer en continu pour accélérer le chargement ». Sans chiffre gardé, cette
  // intention n'a rien contre quoi itérer — le bras mesure la durée et la jette, donc une
  // dégradation de 3,6 s à 9 s ne rougirait nulle part.
  "w1-page-tendance",
  // Ouvert le 16 septembre 2026 : le journal des questions existe depuis #72, il ne voit que la
  // surface agent et personne ne le relit. C'est le seul instrument du depot qui dirait ce que
  // le produit ne sait PAS repondre — les quinze autres disent seulement s'il ment.
  "w1-questions-lues",
  // Remonté de la 58ᵉ place et de P2 à P1 le 16 septembre 2026, décidé par Ivan. La raison
  // n'est pas que le ticket a grandi : c'est que `w6-modes` (#36) vient de donner trois modes
  // métier à l'écran et aucun à l'agent. « La même réponse pour un agent » est la promesse
  // centrale du produit, et elle est fausse depuis hier — réparer une promesse qu'on vient de
  // casser passe avant d'ouvrir une surface nouvelle. La moitié du travail est d'ailleurs déjà
  // faite sans qu'on y ait touché : `modeAxisOrder` vit dans `src/core/`, donc le serveur MCP
  // l'atteint déjà.
  // Décidé par Ivan le 17 septembre 2026, sur le témoignage de Baptiste Braux (Kafé, rue Martel) :
  // « un lieu se définit surtout par les heures auxquelles il est utile à quelqu'un ». Compass
  // n'a AUCUNE notion d'heure — les douze axes sont des photos fixes. Et la donnée est déjà
  // payée : `idfm_validation_profile`, remplie le 7 septembre, porte la forme horaire de 258
  // stations, et `fetchCorpusStation` n'en lit que la distance et le nom. Ivan a tranché qu'il
  // passe DEVANT w5-explain-metier et w6-appuis : c'est le plus proche de la promesse du produit
  // pour le moins de travail de tout le backlog, puisqu'il n'ingère rien.
  // Demandé par Ivan le 17 septembre 2026, après la SEPTIÈME fusion restée en soute. `servi` est
  // le bras censé le dire, et il reste vert : il ne dérive que les routes de `src/App.tsx` et les
  // libellés de `src/i18n/ui.ts`, donc un bloc neuf sur une page existante lui est invisible —
  // c'est la forme qu'ont prise les sept. Mesuré le jour même : ~307 chaînes affichées hors de sa
  // population contre 288 dedans. Placé en tête parce que sa contre-preuve est périssable : la
  // production est en retard de deux fusions en ce moment, le bundle est capturé dans
  // `eval/temoins/`, et le cas réel disparaît à la prochaine republication.
  "w1-servi-contenu",
  "w2-rythme",
  "w5-explain-metier",
  // Demandé par Ivan le 17 septembre 2026, en mesurant pourquoi l'agent et l'écran ne nommaient
  // pas les mêmes axes : « une école à cent mètres, c'est une clientèle du midi ; un parc, c'est
  // un week-end — ces informations doivent faire partie du livrable final ». `AreaScores` porte
  // douze axes, la fiche en affiche six, et trois des six jetés sont une information que rien
  // d'autre ne donne. Placé DERRIÈRE w5-explain-metier parce qu'ouvrir une surface neuve pendant
  // qu'une promesse affichée est fausse coûte deux fois : la promesse casse plus fort à chaque
  // constat qu'un agent ne reçoit pas.
  "w6-appuis",
  // Décidé par Ivan le 17 septembre 2026, même conversation : « la rue doit devenir une échelle
  // affichée et valorisable par l'utilisateur ». Compass mesure au local (BDCom est porte-à-porte)
  // et restitue dans des cercles de 400 et 800 m ; l'échelle où un commerce vit n'existe nulle
  // part. Placé derrière w2-rythme parce qu'une rue sans heure reste une photo fixe, et derrière
  // w6-appuis parce que la vraie difficulté — où s'arrête « la rue » quand elle fait trois
  // kilomètres — mérite une file dégagée devant elle.
  "w6-rue",
  // Soulevé par Ivan le 17 septembre 2026 : « que se passe-t-il si des données s'opposent ? ».
  // Mesuré le jour même : `composeVerdict` juxtapose et ne remarque rien quand deux constats se
  // contredisent — il ne refuse de composer que sur un constat porteur MANQUANT. C'était le bon
  // comportement tant que le produit comptait ; depuis #197 il LIT, et deux lectures peuvent
  // s'opposer pour de bon. BLOQUÉ : ce qu'il faut trancher est une doctrine, pas du code.
  "w6-desaccord",
  "w0-deploy",
  "w0-history",
  "w0-provenance",
  "w0-fiche",
  "w0-mcp-verif",
  // Trouvé le 24 août en écrivant w0-mcp-verif, donc placé derrière lui : c'est le contrôle de
  // conformité du MCP qui a rendu le défaut visible. Identifiant et fichier posés le
  // 15 septembre 2026 — il n'en avait pas, et restait donc hors de toute table.
  "w0-hors-corpus",
  "w0-cron",
  // Trouvé le 25 août en rejouant les chargeurs pour w0-cron, donc placé derrière lui. Même
  // rattrapage d'identifiant, le même jour.
  "w0-sirene-url",
  "w0-retenue",
  "w0-plu",
  "w1-chantiers",
  "w1-terrasses",
  "w1-survie",
  // Opened 24 August by w0-fiche and left to sit for two days: the fix was SQL, the
  // ticket was interface. It comes after w0-retenue rather than before because the
  // census w0-retenue posed is what makes it demonstrable that this case escapes it —
  // I23 and I24 are green while the defect is alive, and that is their definition
  // rather than a hole in them.
  "w0-conclusion",
  // Both opened 25 August by w0-retenue, which found them without looking for them.
  // w0-appelant first, and the order is the recommendation rather than a preference:
  // it decides w1-licence-derivee's blast radius. If `authenticated` stops being
  // privileged, the mislabelled licence is only ever seen by the service role — the
  // people who operate Compass and already know 2017's licence. The reverse is not
  // true. And w0-appelant is free today: auth.users holds 0 accounts (measured
  // 25 August); once signup opens, the same fix takes data away from people who had it.
  "w0-appelant",
  "w1-licence-derivee",
  // Le socle avant l'ecran, direction du 31 aout. #70 donne une cadence aux quatre
  // sources qui n'en ont pas, #71 fait tourner la porte et rend ses echecs audibles,
  // #72 ouvre le tuyau d'observabilite avant qu'il y ait du trafic a observer.
  "w1-cadence",
  "w1-porte-planifiee",
  // #77 avant #72, decide le 5 septembre. #71 et #73 ont bati une alerte qui part
  // correctement et tombe ou personne ne se tient — #74 est restee deux jours non lue.
  // Batir un troisieme producteur de signal avant que le premier atteigne quelqu'un
  // ajoute du bruit a du bruit. Et #72 n'a aucun trafic a observer.
  "w1-porte-lue",
  "w1-porte-publiee",
  "w1-observabilite",
  "w1-catalogue",
  // Quatrieme application de "enumerer, pas lister", nee de #72 : la porte se comptait
  // elle-meme. Le rapport de #72 conclut qu'aucun invariant ne peut voir l'absence — vrai
  // a l'execution, faux a la declaration : le fichier qui appelle PostgREST est sur le
  // disque et porte ou ne porte pas l'echappement.
  "w1-observabilite-echappement",
  // Ne le passe pas devant #81 sans raison : les deux sont des enumerations, mais
  // celle-ci regarde le distant et non le depot, et elle est nee d'un incident reel —
  // #68 a laisse le distant en avance d'une migration pendant vingt-quatre heures
  // sans qu'aucun des onze bras puisse le voir.
  "w1-ledger",

  // --- Ce qui reste des vagues 0 et 1 ---------------------------------------------------
  // w1-historique n'était dans aucune file : ouverte le 10 août, bloquée sur l'APUR, elle
  // tombait dans « hors de cette file » et n'apparaissait donc que comme un chiffre. Un
  // ticket bloqué doit se voir bloqué — c'est à ça que sert BLOQUE plus bas.
  "w1-historique",
  // Reporté par la direction du 31 août (le socle avant l'écran) et repris ici en tête de
  // Q4 pour une raison mesurée : Géorisques est l'une des onze sources qui ont déjà une
  // sonde verte dans catalogue.json. Toutes celles des vagues 2 à 4 sont sans endpoint
  // épinglé. Commencer par la seule dont le tuyau est déjà vérifié coûte une session, pas
  // une session plus une négociation.
  "w1-ppri",
  "w1-dia",

  // --- Q4 2026 ---------------------------------------------------------------------------
  // Mesuré le 6 septembre sur scripts/porte/catalogue.json : sur les 35 sources du
  // catalogue, 11 ont une sonde et AUCUNE d'entre elles n'appartient aux vagues 2 à 4. Les
  // vingt et une autres portent chacune la raison de ne pas en avoir, et ces raisons ne se
  // valent pas — c'est ce qui ordonne ce bloc plus sûrement que les priorités déclarées :
  //
  //   endpoint seulement à choisir (data.gouv, opendata.paris.fr, licence ouverte) — une
  //     session suffit : w2-idfm, w2-filosofi, w2-mobiliscope, w4-meubles, w4-ecoles,
  //     w4-frequentation, w2-bpe-marches-velo
  //   compte ou jeton à ouvrir — une décision d'Ivan AVANT la session : w3-mapillary,
  //     w2-air-bruit, w7-inpi
  //   plusieurs producteurs ou licence « selon registre » — un arbitrage : w4-abf,
  //     w4-erp-copro-ads, w7-foncier
  //
  // Aucune source nouvelle, donc rien à négocier et rien à épingler : elle tire du corpus
  // déjà posé des réponses que rien ne pose aujourd'hui. Sous la direction « fiabilité,
  // rapidité, solidité du back-end », c'est le meilleur rapport de la file, et son préfixe
  // w6 est trompeur — ce ticket n'est pas de l'écran.
  "w6-analyse",
  // Le seul P0 encore ouvert, et il reste en tête malgré son blocage plutôt que d'être
  // rétrogradé en silence : le trou produit n°1 ne cesse pas d'être le trou produit n°1
  // parce qu'un jeton manque. Ce qu'il attend est écrit dans BLOQUE.
  "w3-mapillary",
  // Les quatre que rien n'arrête. IDFM d'abord : c'est le seul qui remplace un proxy déjà
  // affiché — le piéton — par une mesure, et remplacer un proxy vaut mieux qu'ajouter une
  // couche.
  "w2-idfm",
  "w2-filosofi",
  "w2-mobiliscope",
  "w4-meubles",
  // Puis les deux qui demandent une démarche, dans l'ordre de ce qu'elle coûte : une clé
  // d'API pour Airparif, un arbitrage entre producteurs pour l'ABF.
  "w2-air-bruit",
  "w4-abf",
  // --- L'IA au-dessus du cœur : encore du back-end, malgré le mot IA ----------------------
  // w5-entity avant les autres parce qu'il attaque le 36,7 % de « probable » à sa cause —
  // l'appariement BODACC × BDCom — quand les autres l'habillent. w6-mcp étant fermée,
  // w5-entretien n'est plus bloquée, et l'ordre de bataille du plan la place tôt en Q4.
  // w6-mcp est fermee depuis le 27 aout : elle reste dans l'ordre parce que w5-entretien en
  // dependait, et une file qui efface ce qui a debloque le reste ne se relit pas.
  "w6-mcp",
  "w5-entity",
  "w5-entretien",
  "w5-confiance-agent",
  "w5-parse",
  // --- L'écran, en second, et c'est la direction du 31 août qui le dit -------------------
  // w6-contexte passe devant les trois autres, décidé par Ivan le 10 septembre après un
  // aller-retour avec Lovable. Ce n'est pas un ticket d'écran de plus : il tranche que la
  // carte n'est pas le centre du produit. Les trois suivants supposent tous une réponse à
  // cette question — un dossier exportable, une couche « ce qui se libère » et des modes
  // métier se posent sur une structure, et cette structure n'était pas décidée.
  "w6-contexte",
  // Ouvert le 16 septembre sur objection d'Ivan, le jour même de la livraison de w6-modes.
  // Il passe devant w6-liberations pour la même raison que w5-explain-metier passe devant :
  // #36 a mis à l'écran un arbitrage qui ne dit pas son nom, et un produit dont la thèse est
  // qu'un chiffre porte sa provenance ne peut pas laisser un classement n'en porter aucune.
  // Réparer ce qu'on vient de livrer avant d'ouvrir une surface neuve.
  "w6-mode-raison",
  // Decision de perimetre, marquee BLOQUE : elle deplace ce que Compass EST — un lecteur de
  // donnees publiques qui devient aussi un collecteur — et un fait declare ne se re-derive pas.
  // Elle est dans la file pour rester visible, pas pour etre prise.
  "w6-declaration-preneur",
  "w6-liberations",
  "w6-dossier",
  "w6-modes",
  // Le design passe APRÈS les trois tickets produit ci-dessus, décidé par Ivan le 15 septembre
  // 2026 : ils vont encore déplacer ce que la fiche montre, et peindre avant eux serait peindre
  // deux fois. L'argument inverse — le produit compose un verdict et a l'air plus brut qu'il
  // n'est — a été pesé et écarté ; s'il redevient prioritaire, la réponse est de scinder le
  // ticket (typographie et palette d'un côté, accueil et /travaux de l'autre) plutôt que de le
  // remonter entier. Il n'avait jusqu'ici ni fichier ni place : c'est l'orphelin de la scission
  // de #119.
  // Scindé de w6-accueil le 17 septembre 2026, décidé par Ivan : « je ne veux plus attendre pour
  // le design ». Il ne dépend de RIEN et n'est pas exécuté par une session — Lovable le fait, à
  // 5 crédits/jour, sur `index.css`, `tailwind.config.ts`, `src/components/ui/` et `index.html`,
  // qu'aucun ticket ouvert ne touche. Ce qu'une session a à y faire est de VÉRIFIER : la refonte
  // a déjà été exécutée les 7 et 8 septembre et s'est évaporée — la page publiée chargeait
  // toujours Inter dix jours plus tard.
  "w6-peinture",
  "w6-accueil",
  // --- P2 : de l'appoint, à prendre quand une session est courte -------------------------
  "w3-osm-notes",
  "w2-bpe-marches-velo",
  "w4-ecoles",
  "w4-frequentation",
  "w4-erp-copro-ads",
  // --- 2027, et le rappeler ici évite de les croire à portée ------------------------------
  "w7-etude-chantiers",
  "w7-foncier",
  "w7-inpi",
  "w7-kit",
]

/**
 * Ce qui empêche un ticket d'être pris, quand ce n'est pas le code.
 *
 * Pourquoi cette table existe : « ouvert » et « ouvert mais personne ne peut y toucher » se
 * lisaient pareil, et w1-historique — bloquée sur l'APUR depuis le 10 août — n'était même pas
 * dans la file. Une session qui ouvre docs/SESSIONS.md et prend le premier ticket ouvert perd
 * alors sa première demi-heure à découvrir le blocage.
 *
 * Ce que la table ne fait pas, volontairement : elle ne reporte pas le ticket et ne le sort
 * pas de l'ordre. Un blocage est une chose à lever, pas une chose à cacher, et le sortir de la
 * file le rendrait invisible — exactement ce qui est arrivé à w1-historique.
 */
const BLOQUE: Record<string, string> = {
  "w1-historique": "APUR — courrier le 10 août 2026, relance le 24, sans réponse au 6 septembre.",
  "w3-mapillary":
    "jeton d'API Mapillary à créer, et l'attribution CC-BY-SA à trancher avant d'ingérer " +
    "(la question est ouverte dans `catalogue.json`). Décision d'Ivan, pas travail de session.",
  "w2-air-bruit": "clé d'API Airparif à demander. Bruitparif n'a pas d'endpoint ouvert épinglé.",
  "w7-foncier": "convention Ville / APUR / Cerema — accès réservé aux acteurs publics.",
  "w6-desaccord":
    "décision de doctrine d'Ivan, pas travail de session — cinq points à trancher, dont le " +
    "premier est ce qu'un désaccord EST mécaniquement. Le dériver demande que chaque lecture " +
    "porte une direction, champ qui n'existe pas ; le déclarer à la main est un arbitrage de " +
    "plus. Poser l'un ou l'autre avant la décision reviendrait à la prendre en silence.",
  "w6-declaration-preneur":
    "décision de périmètre d'Ivan, pas travail de session — six points à trancher, dont la " +
    "licence des déclarations et ce que devient le dossier téléchargeable, qui ne se re-dérive " +
    "plus. Écrire du schéma avant la décision reviendrait à la prendre en silence.",
}

/**
 * Which model for which class of work — also a judgement, not a measurement.
 *
 * Le critère, tel qu'il a été appliqué aux trois premiers et étendu à Q4 : Sonnet pour une
 * ingestion dont la forme est déjà connue — un endpoint ouvert, un schéma à transcrire, une
 * cadence à déclarer, des invariants sur le modèle des précédents. Opus dès qu'il faut
 * *décider* : une licence à interpréter, une attribution à trancher, un appariement probable,
 * une phrase que le produit assumera. Ce n'est pas la difficulté du SQL qui départage, c'est
 * la présence ou non d'un arbitrage irréversible dans le ticket.
 */
// Le choix de modèle vit dans scripts/session-choix.ts depuis le 13 septembre 2026 : ce
// fichier appelle main() à l'import, donc brief.ts ne pouvait pas le lui emprunter. Un seul
// propriétaire, deux lecteurs — plutôt qu'une seconde table tenue à la main à côté.

interface Row {
  id: string
  title: string
  priority: string
  issue?: Issue
}

function readTickets(): Row[] {
  return readdirSync(TICKETS)
    .filter((f) => /^w\d+-.*\.md$/.test(f))
    .map((f) => {
      // Files land as CRLF on this machine (core.autocrlf), and a title may carry a
      // second em dash once a session appends its outcome to it — so split on either
      // ending and stop the title at the first dash only.
      const head = readFileSync(resolve(TICKETS, f), "utf8").split(/\r?\n/)[0].trim()
      // "# [P0] w0-history — titre" (— may recur further right)
      const m = head.match(/^#\s*\[(P[012])\]\s*([\w-]+)\s*—\s*(.*)$/)
      const id = f.slice(0, -3)
      return { id, priority: m?.[1] ?? "?", title: m?.[3]?.trim() ?? id }
    })
}

function build(rows: Row[]): string {
  const rank = (id: string) => {
    const i = ORDER.indexOf(id)
    return i === -1 ? ORDER.length : i
  }
  const planned = rows
    .filter((r) => ORDER.includes(r.id))
    .sort((a, b) => rank(a.id) - rank(b.id))

  const lines: string[] = [BEGIN, ""]
  lines.push(`*Table dérivée de \`docs/tickets/\` et de l'état GitHub, régénérée le ${today()}.*`)
  lines.push("")
  lines.push("| # | Ticket | Issue | État | Prio | Modèle |")
  lines.push("| --- | --- | --- | --- | --- | --- |")

  let n = 0
  for (const r of planned) {
    const done = r.issue?.state === "CLOSED"
    n += 1
    const num = r.issue ? `[#${r.issue.number}](https://github.com/IvandeMurard/paris-compass/issues/${r.issue.number})` : "—"
    const label = done ? `~~\`${r.id}\`~~` : `\`${r.id}\``
    const bloque = !done && BLOQUE[r.id] !== undefined
    const state = r.issue ? (done ? "**fait**" : bloque ? "**bloqué**" : "ouvert") : "**pas d'issue**"
    const idx = done ? `~~${n}~~` : `${n}`
    lines.push(`| ${idx} | ${label} | ${num} | ${state} | ${r.priority} | ${modeleDe(r.id)} |`)
  }

  // Les raisons sous la table plutôt que dans une colonne : une raison utile est une phrase,
  // et une phrase dans une cellule casse la lecture des cinq autres colonnes.
  const bloques = planned.filter((r) => r.issue?.state !== "CLOSED" && BLOQUE[r.id])
  if (bloques.length > 0) {
    lines.push("")
    lines.push(`**${bloques.length} tickets attendent autre chose que du code.** Ils restent à leur`)
    lines.push("place dans l'ordre — un blocage se lève, il ne se cache pas — mais ne pas les ouvrir")
    lines.push("en session tant que la ligne ci-dessous tient :")
    lines.push("")
    for (const r of bloques) lines.push(`- \`${r.id}\` — ${BLOQUE[r.id]}`)
  }

  // Depuis le 6 septembre l'ordre couvre les 51 tickets, donc cette phrase parle d'un cas qui
  // ne se produit plus qu'à l'écriture d'un ticket neuf — et c'est précisément là qu'elle sert.
  const rest = rows.filter((r) => !ORDER.includes(r.id) && r.issue?.state !== "CLOSED")
  lines.push("")
  if (rest.length === 0) {
    lines.push("**Tous les tickets du dépôt sont dans cette file.** Un ticket neuf tombera ici,")
    lines.push("hors ordre, tant que `ORDER` de `scripts/sessions.ts` ne lui aura pas donné sa place —")
    lines.push("le détail par vague est dans [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).")
  } else {
    lines.push(`**Hors de cette file : ${rest.length} tickets ouverts**, sans place déclarée dans \`ORDER\` — `)
    lines.push("le détail par vague est dans [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).")
  }

  const orphans = rows.filter((r) => !r.issue)
  if (orphans.length > 0) {
    lines.push("")
    lines.push(`> ⚠️ **${orphans.length} ticket(s) sans issue GitHub** : ${orphans.map((o) => `\`${o.id}\``).join(", ")}.`)
  }

  lines.push("")
  lines.push(END)
  return lines.join("\n")
}

function today(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

/** The block without its regeneration date — what the table actually claims. */
function claims(block: string): string[] {
  return block
    .split("\n")
    .filter((line) => !/^\*Table dérivée de/.test(line.trim()))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * The rows a reader would compare by hand, keyed by ticket id.
 *
 * Used only to say *what* drifted. Reporting "the table differs" would send the next session
 * to a diff; reporting "w1-terrasses: ouvert → fait" ends the question on the spot.
 */
function rowsById(block: string): Map<string, string> {
  const out = new Map<string, string>()
  // `.replace(/\r\n/g, "\n")` and not `split("\n")` alone: JavaScript's `.` does not match
  // a carriage return, so on a CRLF checkout the `(.*)$` below matched NOTHING and every row
  // was reported "absent de la table" — including rows plainly present. The drift verdict
  // itself was right (claims() trims); only the explanation was false, which is worse than
  // no explanation: it sent a reader looking for a missing table instead of one changed row.
  //
  // Fourth time this repository pays for CRLF, and the second time in this very file.
  for (const line of block.replace(/\r\n/g, "\n").split("\n")) {
    const m = line.match(/\|\s*~?~?\d+~?~?\s*\|\s*~*`?([\w-]+)`?~*\s*\|(.*)$/)
    if (m) out.set(m[1], m[2].trim())
  }
  return out
}

/**
 * Prints every drift of every epic, and says whether there was one.
 *
 * Grouped by epic rather than listed flat: an epic is what a reader opens next, and a list
 * sorted by kind would make them reconstruct which issue to go and edit.
 */
function direLesEcarts(ecarts: Ecart[]): void {
  const parEpique = new Map<number, Ecart[]>()
  for (const e of ecarts) parEpique.set(e.epique, [...(parEpique.get(e.epique) ?? []), e])
  console.error("Les listes des épics ne disent plus ce que portent les étiquettes.")
  for (const [numero, siennes] of [...parEpique].sort((a, b) => a[0] - b[0])) {
    console.error(`  #${numero} — ${siennes.length} écart(s)`)
    for (const e of siennes) console.error(`      ${e.genre.padEnd(10)} ${e.dit}`)
  }
  console.error("Corriger avec : npm.cmd run sessions -- --epiques")
}

/** The write direction: each epic's `## Tickets` block, rebuilt from the labels. */
function ecrireLesEpiques(issues: Issue[]): void {
  const epiques = epiquesDe(issues).sort((a, b) => a.number - b.number)
  if (epiques.length === 0) {
    console.error("Aucune issue ne porte l'étiquette `epic` : il n'y a pas de population.")
    process.exit(1)
  }

  // A file, never a pipe, and never an inline argument: the Windows console of this machine
  // mangles em dashes and accents on the way through, and an issue body is the one place where
  // that damage is published. `gh issue edit --body-file` reads the bytes Node wrote, and
  // writeFileSync in utf8 writes no BOM.
  const dossier = mkdtempSync(join(tmpdir(), "compass-epique-"))
  let touchees = 0
  for (const epique of epiques) {
    const suivant = corpsRegenere(epique, issues)
    if (suivant === null) {
      console.log(`#${epique.number} — déjà à jour.`)
      continue
    }
    const chemin = join(dossier, `${epique.number}.md`)
    writeFileSync(chemin, suivant, "utf8")
    execFileSync("gh", ["issue", "edit", String(epique.number), "--body-file", chemin], {
      encoding: "utf8",
    })
    touchees += 1
    console.log(`#${epique.number} — liste régénérée.`)
  }
  console.log(`${epiques.length} épics lus, ${touchees} réécrit(s).`)
}

function main() {
  const rows = readTickets()
  let issues: Issue[]
  try {
    issues = lireIssues()
  } catch (e) {
    console.error(
      e instanceof RefusGitHub
        ? e.message
        : "Impossible d'interroger GitHub (gh absent, non authentifié, ou hors ligne).",
    )
    console.error("Rien n'est réécrit et rien n'est jugé : mieux vaut une table datée qu'une table devinée.")
    process.exit(1)
    return
  }

  for (const r of rows) {
    // The anchored ticket↔issue link lives in scripts/session-issues.ts since 15 September
    // 2026, because the epics need the very same rule and a second copy of it is how #131
    // happened in the first place. What it guards is written there.
    const officielles = issuesDuTicket(issues, r.id)

    // Two issues claiming one ticket is an ambiguity, and an ambiguity resolved in silence
    // is how the wrong number gets published. Say it, and stop.
    if (officielles.length > 1) {
      console.error(
        `${r.id} : ${officielles.length} issues portent le titre officiel du ticket — ` +
          officielles.map((i) => `#${i.number}`).join(", ") +
          `.\nUne seule issue par ticket. Renommer les autres : le titre « [Pn] <ticket> — » ` +
          `est ce qui lie la table au ticket, pas une mention du nom.`,
      )
      process.exit(1)
    }

    r.issue = officielles[0]
  }

  if (process.argv.includes("--epiques")) {
    ecrireLesEpiques(issues)
    return
  }

  const doc = readFileSync(DOC, "utf8")
  const i = doc.indexOf(BEGIN)
  const j = doc.indexOf(END)
  if (i === -1 || j === -1) {
    console.error(`Marqueurs absents de ${DOC}. Attendu :\n${BEGIN}\n${END}`)
    process.exit(1)
  }

  const expected = build(rows)
  const committed = doc.slice(i, j + END.length)
  const closed = rows.filter((r) => r.issue?.state === "CLOSED").length

  if (process.argv.includes("--check")) {
    // Two populations, one call, one verdict — and BOTH are always reported. Stopping at the
    // first drift would hide the second behind it, and a session that fixed the table would
    // believe it had finished.
    const drifted = claims(committed).join("\n") !== claims(expected).join("\n")
    if (drifted) {
      const before = rowsById(committed)
      const after = rowsById(expected)
      console.error("docs/SESSIONS.md — la table committée ne dit plus l'état GitHub.")
      for (const id of new Set([...before.keys(), ...after.keys()])) {
        const b = before.get(id)
        const a = after.get(id)
        if (b === a) continue
        if (b === undefined) console.error(`  + ${id} — absent de la table`)
        else if (a === undefined) console.error(`  − ${id} — présent dans la table, plus dans la file`)
        else console.error(`  ~ ${id}\n      committé : ${b}\n      réel     : ${a}`)
      }
      console.error("Corriger avec : npm.cmd run sessions")
    } else {
      console.log(
        `docs/SESSIONS.md — la table dit vrai : ${rows.length} tickets, ${closed} fermé(s), ` +
          `recoupé à l'état GitHub.`,
      )
    }

    const epiques = epiquesDe(issues)
    const ecarts = recouperLesEpiques(issues)
    if (ecarts.length > 0) {
      direLesEcarts(ecarts)
    } else {
      const lignes = epiques.reduce((n, e) => {
        const vague = vagueDe(e)
        return n + (vague ? ticketsDeLaVague(issues, vague).length : 0)
      }, 0)
      console.log(
        `Les ${epiques.length} épics disent vrai : ${lignes} tickets étiquetés, ` +
          `recoupés ligne à ligne et case à case.`,
      )
    }

    if (drifted || ecarts.length > 0) process.exit(1)
    return
  }

  const next = doc.slice(0, i) + expected + doc.slice(j + END.length)
  if (next === doc) {
    console.log("docs/SESSIONS.md — déjà à jour.")
    return
  }
  writeFileSync(DOC, next)
  console.log(`docs/SESSIONS.md — table régénérée : ${rows.length} tickets, ${closed} fermé(s).`)
}

main()
