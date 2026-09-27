# Compass — design handoff (1d, phased)

Supersedes 1c. Same design, same decisions; what changed is **what each screen may claim, and when**.
1c was checked against the repository on 27 September 2026; every correction below cites the file that
made it.

For: the Lovable build. Backend, `src/core/`, Supabase and MCP stay as they are.
**Lovable touches what is seen; local touches what is computed** (`docs/CONTEXTE.md`). Anything in
this document that needs a migration, an Edge Function or a change in `src/core/` is a **local
ticket**, listed as such — Lovable does not build it, and does not simulate it in the UI.

---

## 0. How to read this document — the data tag

Every block of every screen carries one of four tags. They decide what the screen shows.

| Tag | Means | The screen shows |
|---|---|---|
| **servi** | An anonymous visitor receives it today | The figure, with its source, licence, date and confidence |
| **retenu** | Computed, withheld because its licence has not been read | The withheld state, named: « Nous l'avons et ne pouvons pas le servir » + why. Never an empty block, never a placeholder figure |
| **à construire** | The data is loaded; no code reads it yet | Not shown in the phase that lacks it. Appears in the phase that builds it |
| **jamais** | No open source exists | What to do instead (count yourself, ask the landlord). Already the 1c pattern — keep it |

**Retenu is the important one.** BDCom 2017 and 2020 carry `publicly_redistributable = false` until the
APUR answers on their licence (`supabase/migrations/20260826000002_caller_is_privileged.sql`,
`docs/BDCOM.md` §7). An anonymous visitor therefore sees **only 2023**. That withholds, for the public:
- the unit's history before 2023 (`compass_premise_history`),
- street rotation, which needs two vintages (`compass_street_rotation`,
  `20260906000001_analyses_du_schema.sql`),
- survival by trade and quartier (`compass_survival_by_trade`, `src/core/modes.ts:185`).

This is not a gap to hide; it is the product's distinction between « nous ne l'avons pas » and « nous
l'avons et ne pouvons pas le servir ». Design the withheld state as a first-class component, once,
and reuse it. The day the APUR answers, the same screens fill in without a redesign.

---

## Phase 0 — prerequisite (Lovable settings, minutes)

**The published site answers no question today.** Measured 27 September 2026 with
`npm.cmd run porte:publie`: exit 1, same bundle as 17 September (`index-BsiM9msj.js`), no Supabase
project reference in either served bundle. `DIAGNOSTIC.md` §61 says the Lovable build environment
takes precedence over the `.env` tracked by git and points at the old project.

1. In Lovable's environment, set `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` to the project
   named in `docs/REPRISE.md` (« Le nœud Supabase »).
2. Republish.
3. Locally: `npm.cmd run porte:publie` then `npm.cmd run page` — the second must return a **verdict**,
   not a named refusal.

No screenshot for the case study before this is green.

---

## 1. Global rules (all phases)

### 1.1 Design tokens — unchanged from 1c, use literally

- Paper `#f6f3ec` · page ground `#f2efe8` · field `#fbf9f4` · document white `#fffefb`
- Ink `#1c1a17` · ink-2 `#2e2b26` · muted `#4a463f` (≥ 4.5:1 on paper) · rule `#d9d4c9`
- **Only accent = confidence**, teal `oklch(0.5 0.09 185)`:
  établi ● solid · corroboré ● `oklch(0.72 0.06 185)` · probable ○ ring · indéterminé ◌ dashed grey.
  Shape carries meaning, colour never alone.
- **New: retenu** — no accent. Ink-2 text, 1px dashed ink rule around the block, a small lock-free
  label « retenu — licence » in IBM Plex Mono. It must never look like an error or a loading state.
- Type: **Newsreader** (headlines, sentences, figures) · **Public Sans** (UI, body) · **IBM Plex Mono**
  (dates, sources, refs).
- Sharp corners, 1px / 2px ink rules, no cards, no pills, no shadows (except paper document previews).
- Hit targets ≥ 44px. Body ≥ 14px; captions ≥ 12px in ink-2, never lighter.

### 1.2 Map — **keep Leaflet** (changed from 1c)

1c asked for MapLibre GL. Nothing in the design needs it: `flyTo`, halos and custom markers are all
Leaflet. Switching is a dependency change with its own security review (`npm.cmd run avis`) and two
builds to re-verify, for no visible gain.

- Tiles: **a hosted provider with a production licence** (MapTiler, Stadia, or self-hosted). OSM France
  and openstreetmap.org forbid production hotlinking. One decision + one key; the key is a
  publishable one, restricted by referrer.
- Standard look, no filter. Compass layers on top in ink with a 3px white halo: ■ changed ·
  □ unchanged · ◆ signal · ● your unit · ○ your addresses · pulsing dot = « vous êtes ici ».
  **■ changed / □ unchanged depend on rotation → retenu** for the public: in Phase 1 draw every unit
  as □ with no change claim, and say so in the chapter text.
- Desktop: map full-bleed, 520px paper sheet on the left; chapters `flyTo` (unit z≈17 → segment 16 →
  300 m 15.7 → 800 m 14.8).
- Mobile: 290px band collapsing to a 58px strip on scroll.
- Every map layer also exists as text in its chapter (a11y).

### 1.3 Hubs compose existing pages — they do not replace their files (changed from 1c)

`/methode` renders `Methodology.tsx`, `Sources.tsx` and `Progress.tsx` as its sections; `/apprendre`
renders `Guides`, `Faq` and `Glossary`. **Do not merge them into a new file.** `CLAUDE.md` binds
`src/core/scoring.ts` to `src/pages/Methodology.tsx`, and `scripts/porte/servi.ts`,
`src/core/dossier.ts` and `src/core/verdict.ts` reference that file. Keeping the files keeps the
coupling; the hub is layout.

### 1.4 Account

`docs/CONTEXTE.md`, decided 26 August 2026: **an account opens no data.** « Retrouver sur un autre
appareil » syncs recents and saved addresses, nothing else. Nothing is ever behind login.

### 1.5 Figures

No figure on any screen that is not served by the corpus or quoted from `README.md` /
`src/pages/Methodology.tsx`. Mock figures stay in the design files. Specifically removed from 1c:
« la moitié de ses vitrines en trois ans » (in neither source, and rotation is retenu).

---

## 2. Routes, redirects, English

`src/App.tsx` serves the whole site twice, French and `/en/…`. 1c listed French only.

| New route (fr) | New route (en) — proposal | Phase |
|---|---|---|
| `/` | `/en` | 1 |
| `/contexte/:slug` | `/en/context/:slug` (unchanged) | 1 |
| `/methode` | `/en/method` | 1 |
| `/apprendre` | `/en/learn` | 1 |
| `/contexte/:slug/visite` | `/en/context/:slug/visit` | 2 |
| `/contexte/:slug/dossier` | `/en/context/:slug/dossier` | 2 |
| `/verifier/:ref` | `/en/verify/:ref` | 3 |

**Redirects (Phase 1).** Old URLs are in the sitemap, `llms.txt`, and search indexes. Each gets a
client-side `<Navigate replace>` to its new home; the canonical and sitemap move to the new URL.
(This is not a server 301 — Lovable hosting serves an SPA. Acceptable; say so if SEO asks.)

| Old | New |
|---|---|
| `/methodologie`, `/en/methodologie` | `/methode#formules`, `/en/method#formulas` |
| `/sources`, `/en/sources` | `/methode#sources`, `/en/method#sources` |
| `/faq`, `/en/faq` | `/apprendre#questions`, `/en/learn#questions` |
| `/guides`, `/guides/:slug` (+ en) | `/apprendre#guides`, `/apprendre/:slug` (+ en) |
| `/glossaire`, `/en/glossaire` | `/apprendre#glossaire`, `/en/learn#glossary` |
| `/carte`, `/en/map` | `/`, `/en` |
| `/presentation`, `/en/presentation` | `/`, `/en` |

Kept: `/paris`, `/paris/:slug` (linked from Apprendre), `/a-propos`, `/signin`, `/signup`, `/profile`.
`noindex` on `/contexte/*` stays (decided 10 September).

Local follow-up in the same week: `npm.cmd run servi` derives its population from `App.tsx`; run it
after the Lovable merge and expect it to follow the new routes.

---

## Phase 1 — showable, all real

The portfolio screenshots come from here. Everything is **servi** or a designed **retenu** state.

### 1.A Home — `Compass 1c - Home.dc.html` (H1, H2, H3)

Replaces `pages/Index.tsx`, `HomeContent.tsx`, `home/HeroOverlay.tsx`.

| Block | Tag | Note |
|---|---|---|
| Search + tagline « Avant de signer un bail, lisez la rue. » | — | Tagline still provisional |
| Trade asked inline, skippable (« Juste regarder ») | servi | Reads `src/lib/tradeMode.ts` |
| Recents (returning visitor) | servi | localStorage |
| Signal feed — BODACC cessions and procedures | servi | `compass_bodacc_within`. **Every item shows its confidence level**: BODACC names an address, not a unit |
| Signal feed — Sirene closures | à construire | No UI reads Sirene closures today. Phase 2 local ticket, or drop from the feed |

### 1.B Address sheet — `Compass visual directions.dc.html` § 1c → `/contexte/:slug`

Replaces `pages/Context.tsx`, `context/*` (Verdict, Finding, Gaps, Map, Modes).

| Chapter | Block | Tag |
|---|---|---|
| Verdict | The four findings and the verdict sentence | servi — `src/core/verdict.ts` |
| **Avant** | The unit in 2023 (activity, trade) | servi — BDCom 2023, ODbL |
| | The unit in 2017 and 2020 | **retenu** — design this state here first |
| | Cessions and procedures at the address since 2015 | servi — BODACC. This is what makes Avant tell a story today |
| **Aujourd'hui** | Commercial fabric, services on foot, rail access | servi — Methodology.tsx |
| | Rhythm of the nearest station — term-time weekday | servi — `src/core/rythme.ts` reads `JOHV` only |
| | Street rotation vs quartier | **retenu** |
| **Demain** | Procedures and cessions within 300 m / 800 m | servi |
| | Protected linear (PLU) | servi — « indication ; le Portail des règles d'urbanisme fait foi » |
| **Autour** | Air (modelled), risks within 1 km, noise (modelled) | servi |
| | Residential rent control figure | servi — **logement only; never multiplied, never a commercial rent, never a filter** |
| Gaps | What no data says (rent, footfall, spend) | jamais — `src/lib/contextGaps.ts` |

### 1.C Méthode hub — `Compass 1c - Methode.dc.html` → `/methode`

Composes `Methodology.tsx` (`#formules`), `Sources.tsx` (`#sources`), `Progress.tsx`
(`#avancement`), plus `#principes` and `#fiabilite`. Add a short section **« Ce qui est retenu, et
pourquoi »** — the licence question to the APUR, stated once. It is the single most distinctive page
of the product.

### 1.D Apprendre hub — `Compass 1c - Apprendre.dc.html` → `/apprendre`

Content in §5 below. Links to `/paris/:slug`.

### 1.E Footer — `Site Footer.dc.html` (full / sheet / mobile)

Replaces `SiteFooter.tsx`. Feedback link is **absent in Phase 1** (the pipeline is Phase 3); use a
`mailto:` or a link to GitHub issues until then.

### 1.F SEO / GEO (Phase 1)

1. Titles and descriptions per hub, question-shaped (« Comment lire un emplacement avant un bail
   3/6/9 »); home title = tagline.
2. JSON-LD: `WebSite` + `SearchAction` on home; `FAQPage` on Apprendre questions; `HowTo` on guides;
   `Dataset` + `license` per source on Méthode › Sources; `Organization` only on À propos.
3. One quotable sentence ≤ 30 words at the top of every section.
4. **`public/llms.txt` — rewrite.** It says the MCP server is « Not yet published » (it is:
   `npx -y paris-compass-mcp`); it must list the six tools — `list_sources`, `score_location`,
   `explain_score`, `compare_locations`, `find_premises`, `trace_premise` — and point to `/methode`,
   `/methode#fiabilite`, `/apprendre`. No mention of `/verifier` or `report_issue` before Phase 3.

### Phase 1 local tickets (small)

- Tile provider decision + key.
- `llms.txt` rewrite (can be done locally, it is not a screen).
- After the Lovable merge: `servi`, `page`, `porte:publie` green.

---

## Phase 2 — the entrepreneur's tools

Screens can be designed now; they ship when their local ticket lands.

### 2.A Visit — `Compass 1c - Visite.dc.html` → `/contexte/:slug/visite`

| Block | Tag |
|---|---|
| Advice by neighbourhood type, term-time weekday | servi |
| Holidays, Saturday, Sunday | **à construire** — ingestion loads all five IDFM day types (`JOHV, JOVS, SAHV, SAVS, DIJFP`), `src/core/rythme.ts:61` reads one, on purpose |
| Reading = departures, not arrivals | servi — keep the sentence |
| Passer-by counter (optional tool) | jamais as data; the tool records the user's own count |

**Local ticket — `rythme` five day types.** Medium, one session: sentences per day type in
`src/core/rythme.ts` and `src/i18n/rythmeText.ts`, tests, the dossier's day-shape record. Until it
lands, the Visit screen shows the weekday only and says the other three are coming — or does not ship.

### 2.B Dossier — `Compass 1c - Dossier.dc.html` → `/contexte/:slug/dossier`

Entrepreneur's document, no Compass brand, neutral trade order. **No e-signature.** No ref, no QR
until Phase 3 — the dossier must not promise a verification that does not exist yet.

**Local ticket — PDF render of `src/core/dossier.ts`.** Medium. The JSON stays attached. The
retenu blocks appear in the PDF as retenu, with their reason.

---

## Phase 3 — trust infrastructure (local tickets, then screens)

Each item is backend work with abuse, privacy or security implications. Lovable designs the screens;
the builds are local tickets, each with its own proposal and review.

| Ticket | What | Why it is not a UI task |
|---|---|---|
| **Verification** | `/verifier/:ref`; store `sha256` + ref + date + initials at issue; compare client-side | Migration (goes through `npm.cmd run ledger`); decide **which artefact is hashed — the PDF the recipient holds**, not the JSON, or the banker cannot verify what they received |
| **Feedback** | Panel / bottom sheet → Edge Function → GitHub issue (label avis / erreur / idée); contact → private table | GitHub token on a public repo whose issues already carry the gate's reds — labels must not collide; a personal-data table needs the privacy text reviewed first; every PostgREST caller declares `x-compass-observabilite` (#81) |
| **`issue_dossier` (MCP)** | Store hash + ref for agent-issued dossiers | First **write** path on an anonymous public server: rate limit and abuse model first |
| **`report_issue` (MCP)** | Agent reports a wrong answer → same pipeline, label `agent` | Same. A report becomes a golden case only if it names a published rule |

Then: add the ref + QR to the Dossier, the feedback link to the footer, and both tools to `llms.txt`.

---

## 5. Content — Apprendre (replaces `content/guides.ts`, `faq.ts`, `glossary.ts`)

Rules: Paris intra-muros only · one quotable lead ≤ 30 words · no figure outside README /
Methodology.tsx · « vérifiable » not « re-dérivable » · every item tagged **avant** / **devant** /
**signer**. Corrections from 1c are marked ✎.

### 5.1 FAQ

| Stage | Question | Answer (lead) | Details |
|---|---|---|---|
| avant | Qu'est-ce que Compass ? | Un outil gratuit qui lit le contexte d'une adresse commerciale à Paris — ce qui était là, ce qui change, ce que ça coûte — à partir de données publiques. | Chaque chiffre cite sa source, sa licence, sa date et son niveau de fiabilité. Sans compte. Paris intra-muros. |
| avant | ✎ Compass liste-t-il des locaux à louer ? | Non. Compass montre ce qui se publie avant toute annonce : cessions de fonds et procédures collectives, au BODACC. | Les annonces vivent sur des portails privés dont les conditions interdisent la reprise. Le BODACC nomme une adresse, pas un local. Une absence de signal ne veut pas dire « rien à saisir ». *(« locaux recensés vacants » retiré : le relevé 2023 n'en contient aucun — `docs/BDCOM.md` §3.)* |
| avant | Pourquoi Compass n'estime-t-il pas le loyer ? | Parce qu'aucune donnée publique de loyers commerciaux n'existe en France. | L'encadrement des loyers publié par la Ville ne concerne que le logement. L'ILC est un indice de révision, pas un niveau. Le prix des fonds (BODACC) porte un signal indirect, rien de plus. |
| avant | Pourquoi pas une note sur 100 ? | Parce qu'une boulangerie veut du passage, un studio de yoga du calme : une note unique ferait la moyenne de ce qui s'oppose. | Compass affiche les axes séparément et laisse votre métier fixer l'ordre de lecture. |
| avant | D'où viennent les données ? | De registres publics : recensement des commerces de l'APUR, BODACC, Sirene, profils horaires IDFM, OpenStreetMap, Copernicus, Géorisques. | Le détail, source par source, avec sa licence et son état, est dans Méthode › Sources. |
| avant | ✎ **Nouvelle** — Pourquoi certaines informations sont-elles « retenues » ? | Parce que Compass les a calculées mais n'a pas encore le droit de les montrer : la licence des relevés APUR 2017 et 2020 n'a pas été lue. | La question est posée à l'APUR. Tant qu'elle est sans réponse, seul le relevé 2023 est public : l'histoire d'un local avant 2023, la rotation d'une rue et la survie d'un métier restent retenues. Compass le dit plutôt que de le taire. |
| devant | ✎ Comment savoir si une cuisine a déjà existé dans un local ? | Regardez l'activité recensée en 2023 et les cessions publiées à l'adresse : un fonds de restauration cédé là est un indice fort. | Vérifiez la gaine sur place : la créer coûte des dizaines de milliers d'euros et demande l'accord de la copropriété. Les relevés 2017 et 2020 sont retenus. |
| devant | ✎ Cette rue est-elle un cimetière ou une bonne rue ? | Compass compare les vitrines d'un relevé à l'autre ; cette comparaison est retenue tant que la licence des relevés anciens n'est pas lue. | En attendant, lisez ce qui se publie autour — procédures collectives et cessions — et comptez les vitrines fermées en visite. |
| devant | ✎ À quelle heure visiter un local ? | Aux heures où votre clientèle passe — Compass les déduit du profil horaire de la station la plus proche, un jour ouvré hors vacances. | Une station compte les départs : matinale = quartier d'habitation, vespérale = bureaux ou destination. Vacances, samedi et dimanche : à venir. |
| devant | Combien de piétons passent devant la vitrine ? | Aucune donnée ouverte ne le dit : Paris n'a pas de capteur piéton permanent. | Les chiffres vendus viennent de panels de téléphones, modélisés et invérifiables. Compass vous dit quand vous poster, et vous pouvez compter vous-même. |
| signer | Combien coûte un fonds de commerce à Paris ? | La médiane des cessions publiées au BODACC se situe entre 160 000 et 170 000 € ; autour de 220 000 € pour un café-restaurant. | Une fourchette, pas un prix : les montants sont déclarés en chiffres ronds et le métier pèse plus que la rue. *(README.md:61 et :65.)* |
| signer | Qu'est-ce qu'un linéaire commercial protégé ? | Un tronçon où le PLU interdit de transformer un rez-de-chaussée commercial en autre chose. | Indication seulement : le Portail des règles d'urbanisme de la Ville fait foi. |
| signer | ✎ Que contient le dossier que je peux envoyer à mon banquier ? | Une étude d'emplacement à votre nom : synthèse, constats sourcés, limites, et vos observations de visite si vous les joignez. | *(Phase 2. La phrase sur la référence et le code de vérification n'entre qu'en Phase 3.)* |

### 5.2 Glossary (A–Z)

- ✎ **BDCom** — Recensement porte-à-porte de tous les rez-de-chaussée commerciaux parisiens par l'APUR (2017, 2020, 2023). Un même local garde son identifiant d'un relevé à l'autre. Seul le relevé 2023 est public dans Compass aujourd'hui.
- **BODACC** — Bulletin officiel où sont publiées les ventes de fonds (avec leur prix) et les procédures collectives. Il nomme une adresse, pas un local.
- **Bail 3/6/9** — Bail commercial de neuf ans, résiliable par le locataire tous les trois ans.
- **Cession de fonds** — Vente du fonds de commerce : clientèle, droit au bail, matériel. Publiée au BODACC.
- **Établi / corroboré / probable / indéterminé** — Les quatre niveaux de fiabilité d'un fait : la source nomme le local · deux sources concordent · le rattachement au local est déduit · la source est muette.
- **Gaine d'extraction** — Conduit qui évacue fumées et odeurs de cuisson jusqu'au toit. Sa présence change le coût d'un projet de restauration.
- **ILC** — Indice des loyers commerciaux (INSEE). Sert à réviser un loyer existant, jamais à le fixer.
- **Linéaire protégé** — Tronçon de rue où le PLU interdit le changement de destination d'un commerce en rez-de-chaussée.
- **Mesuré / modélisé / estimé** — Compté ou relevé · produit par un modèle publié (ex. air) · approximation faute de donnée ouverte, toujours signalée.
- **ODbL** — Licence libre d'OpenStreetMap et de BDCom 2023 : citer la source et partager à l'identique.
- **Procédure collective** — Sauvegarde, redressement ou liquidation judiciaire. Publiée au BODACC, souvent des mois avant qu'un local soit proposé.
- ✎ **Retenu** — Calculé par Compass, mais pas montré : la licence de la source n'a pas été lue. Différent de « absent », où la donnée n'existe pas.
- **Rotation** — Part des vitrines d'un tronçon qui ont changé d'activité entre deux recensements, lue contre celle du quartier.
- **Tronçon** — Portion de rue entre deux intersections : l'échelle à laquelle Compass compare.
- **Validation** — Passage de carte à l'entrée d'une station. Le réseau parisien n'en a pas à la sortie : un profil horaire décrit les départs.

### 5.3 Guides (3, one per stage) — full texts still to write from these outlines

**avant — Choisir un quartier pour son métier** (6 min)
Lead: Un même local ne vaut pas la même chose pour une boulangerie et pour un bar à vin : lisez d'abord le rythme du quartier.
1. Matinal ou vespéral — lire le profil de la station la plus proche (départs, pas arrivées).
2. ✎ La semaine et les vacances — *Phase 2 ; en Phase 1, ne garder que le jour ouvré et dire que le reste vient.*
3. ✎ Votre métier ici aujourd'hui — ce que le relevé 2023 compte autour ; la survie par quartier est retenue, et le guide dit pourquoi.
4. Ce qui arrive — procédures et cessions publiées autour.
5. Ce qu'aucune donnée ne dira — loyer, passage, dépenses.

**devant — Visiter un local : les points à trancher** (8 min)
Lead: La visite doit répondre à ce qu'aucune donnée publique ne dit ; Compass vous dit quoi regarder et quand venir.
1. ✎ Les vies du local — l'activité de 2023, les cessions à l'adresse ; cuisine, extraction, arrivée électrique à vérifier sur place.
2. La vitrine exacte — quand plusieurs partagent un numéro.
3. Le trottoir — largeur, terrasse, livraisons, arrêt de bus.
4. Les heures — venir aux pics de votre clientèle, pas aux creux.
5. Compter soi-même — 10 minutes, trois créneaux, relevé à votre nom.
6. Les questions au bailleur — loyer, destination du bail, copropriété, travaux.

**signer — Racheter un fonds : lire un prix publié** (7 min)
Lead: Les cessions de fonds sont publiques et chiffrées ; une médiane de quartier situe une négociation, elle n'estime pas un prix.
1. Où trouver les prix — BODACC, cession par cession.
2. Lire une médiane — fourchette, chiffres ronds, marches d'escalier.
3. Le métier d'abord — alimentaire, café, habillement, services.
4. Le linéaire protégé — la vérification qui peut tout arrêter.
5. ✎ Constituer le dossier — *Phase 2.*

---

## 6. Portfolio — ivandemurard.com (separate Lovable project)

No Compass case study exists yet (the site lists Sonor, Aetherix, Tacet, Lore, Anima). Compass is the
natural sequel to Sonor — open data turned into a decision tool — and the rigour thread matches Lore's
evaluation harness.

**Screens and their provenance**

| Screen | Source for the image | Caption rule |
|---|---|---|
| Home, Address sheet, Méthode, Apprendre | **Live production**, after Phase 0 and Phase 1 | Real. Name the address and the date of capture |
| The retenu state (Avant chapter) | Live production | Real — and the strongest image: the product saying what it has and may not show |
| Visit, Dossier | Claude Design mocks until Phase 2 ships | « Design direction — figures illustrative » |
| Verification, Feedback | Claude Design mocks | Same caption |

**Two rules for the images**
- **Never capture a privileged session.** Your own logged-in view may receive the 2017/2020 vintages;
  publishing a screenshot of them redistributes data whose licence has not been read — exactly what
  the product refuses to do. Capture anonymously, in a private window.
- Any figure visible in a screenshot is either served (and dated in the caption) or the image is
  captioned as a mock.

**Angles for the case study** (measured facts from the repo, cite them from their file):
the gate that runs every morning and opens an issue on red; the four-level confidence scale computed
from columns, never typed; « retenu » vs « absent »; the MCP server serving the same core to agents
(`npx -y paris-compass-mcp`, six tools); the refusals (no rent estimate, no score out of 100, no
footfall figure).

---

## 7. Open items

- Tagline wording « lisez la rue ».
- Dossier order by audience (banquier / comptable / franchise) — hypothesis, test before shipping.
- Source logos — to supply; check each body's usage rules.
- Quartier-level indexable pages (`/paris/17/batignolles`) — decide after Phase 1: survival, the
  quartier's best content, is retenu; check what a quartier page can say with servi data only.
- The APUR licence answer — unblocks Avant, rotation and survival at once, with no redesign.
- Legal review: dossier disclaimer (Phase 2), feedback privacy text (Phase 3), mentions légales.
- All figures in the mocks are illustrative except those quoted from README / Methodology.tsx.
