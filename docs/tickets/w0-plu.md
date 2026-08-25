# [P0] w0-plu — Ingérer le PLU plub_protcom

**ID** `w0-plu` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** `w0-deploy`
**Sources** `plu`

## Pourquoi
Identifié, pas encore chargé. Sur un linéaire protégé, le rez-de-chaussée ne peut pas changer de destination — première chose qui tue un projet.

## Comment
Jeu opendata.paris.fr, version votée 20 novembre 2024. Bandeau d'alerte sur la fiche. Informatif, sans valeur réglementaire, renvoi au Portail des Règles d'Urbanisme.

## Doctrine
Contrainte binaire cartographiée, pas un score d'urbanisme.

## Fait quand
Deux adresses de la même rue, l'une sur linéaire protégé, l'autre non, reçoivent deux verdicts distincts.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Fait le 25 août 2026 — le critère est démontré par un appel anonyme réel

**Issue [#9](https://github.com/IvandeMurard/paris-compass/issues/9)**, session 7. **Ce ticket
redit `docs/PLAN.md` §2.4** mot pour mot (« sur un linéaire protégé, un local en rez-de-chaussée
ne peut pas changer de destination ») ; les deux sont clos ensemble et se citent l'un l'autre.

**Piège reçu dans le prompt de session, à corriger avant de commencer.** L'en-tête demandait de
lire `docs/tickets/w0-fiche.md` — un ticket déjà clos le 24 août, sur un sujet différent (la
fiche locale). Même défaut que celui documenté dans `docs/REPRISE.md`, session 5 : les blocs de
consignes par session se collent à la main et peuvent glisser d'un cran. Vérifié contre
`docs/SESSIONS.md` (« Session 7 — `w0-plu` (#9) · Sonnet 5 ») avant de lire le bon fichier,
`docs/tickets/w0-plu.md`. Le corps du prompt portait aussi la consigne clé anon de `w0-cron`
(déjà clos) et son rappel de cadences — sans conséquence ici : `scripts/ingest/lib/db.ts`
applique déjà cette règle à tout chargeur, PLU compris.

### Ce qui est démontré, et comment

Jeu `plub_protcom`, opendata.paris.fr — 5 107 linéaires, licence ODbL, confirmée par l'API :
« Version du PLU votée par le Conseil de Paris le 20 novembre 2024 » (le texte du jeu lui-même,
pas une date recopiée). Chargés dans `public.plu_linear_protection`
(`20260825000004_plu_protection.sql`), trois protections indépendantes par linéaire —
`commerce_artisanat` (pca, 4 607), `commerce_proximite` (ppa, 468), `commerce_culturel` (pcc,
110), chaque ligne portant au moins l'une des trois.

**Le rattachement, mesuré avant d'être écrit.** Les deux réseaux — linéaires PLU et
`street_segment` (troncon_voie) — sont dessinés sur la même ligne centrale : distance au
tronçon le plus proche, sur les 5 107 linéaires, p10 = p50 = 0 m, p99 = 0,0003 m, max = 10,06 m.
15 m capture les 5 107. Une première version rattachait *tout* tronçon à moins de 15 m de
*n'importe quel* linéaire (many-to-many) plutôt que chaque linéaire à son tronçon le plus proche
(many-to-one) — sur des blocs courts près d'un carrefour, un même linéaire touchait deux ou
trois tronçons voisins, et le résultat mesuré (10 800 tronçons, 65 589 locaux) était environ
2,5× le chiffre du many-to-one. Rejoué avec le rattachement corrigé : **4 340 tronçons, 29 624
locaux `premise_location`** protégés sur au moins une des trois protections
(`scripts/ingest/plu.ts`, fonction `attach`).

**Le critère, joué contre le distant, clé publiable seule, aucune chaîne `DATABASE_URL`** —
`compass_premises_within`, étendue de quatre colonnes
(`20260825000005_premises_within_plu.sql`) :

| Appel | `plu_protected` | Détail |
| --- | --- | --- |
| `p_lat=48.8633198, p_lng=2.3462070` — **1 RUE MONTORGUEIL** | **`false`** | aucune des trois |
| `p_lat=48.8641770, p_lng=2.3465075` — **25 RUE MONTORGUEIL** | **`true`** | `plu_commerce_proximite: true` |

Même rue, tronçons `street_segment` voisins (750606002 puis 750605653), verdicts opposés —
exactement le « Fait quand ». Les deux adresses viennent de la même requête qui a servi à
trouver l'exemple : `RUE MONTORGUEIL`, déjà utilisée dans les démonstrations de
`w0-provenance` et `w0-fiche`, porte elle-même les deux verdicts sans qu'il ait fallu chercher
ailleurs.

### Ce qui n'est pas fait, et pourquoi c'est le bon arrêt

**Le bandeau d'alerte sur la fiche n'est pas construit.** `PLAN.md` §2.5 le dit explicitement :
« Une fois les RPC en place, la fiche et le bandeau d'alerte PLU se font plus vite côté
Lovable » — et `docs/SESSIONS.md` classe cette session « Ingestion droite », Sonnet 5, pas une
session d'interface. `compass_premises_within` porte maintenant `plu_protected` et ses trois
composantes ; `src/types/database.ts` déclare la signature à jour. Le prochain arrêt côté
`src/` (Lovable, après le 1er septembre) n'a plus qu'à lire les champs, pas à ouvrir un second
aller-retour vers la base.

**Le chargeur n'est pas câblé dans `.github/workflows/ingestion.yml`.** `w0-cron` (#6) a câblé
quatre sources sur un cron ; PLU est déclaré comme cinquième source dans `ingestion_run`
(cadence `rare`, comme la géographie — un vote du Conseil de Paris n'a pas de calendrier), mais
reste chargeable seulement à la main (`npx tsx scripts/ingest/plu.ts`), ce que confirme
`run_by = 'manual'` sur sa ligne. Ni le ticket ni `PLAN.md` §2.4/§2.5 ne demandent le cron ; il
n'a pas été ajouté pour ne pas élargir le git diff d'un chantier de CI publique au-delà de ce
que le critère exige. `scripts/ingest/workflow.test.ts` continue de vérifier exactement les
quatre plannings existants — inchangé, toujours au vert.

### Trois écarts trouvés en chemin, non corrigés — hors périmètre de ce ticket

En rejouant `npm.cmd run eval:anon` après le changement de signature de
`compass_premises_within` (porte non exigée par le prompt commun pour ce ticket, lancée quand
même parce que la fonction touchée y est exercée). Les quatre contrôles qui exercent
`compass_premises_within` passent ; trois autres échouent, et aucun des trois ne touche à ce que
`w0-plu` a changé — confirmé par `git log`. Détail complet dans `DIAGNOSTIC.md` §18 :

- Deux sur `compass_scoring_context_within` (`out_of_corpus` non toléré par
  `expectWithheld` — écart vieux du 25 août matin, avant cette session).
- Un timeout Postgres (`57014`) sur un `count=exact` brut de `premise_observation` via
  PostgREST — sans rapport avec `premise_location` ou `compass_premises_within`.

`npm.cmd run eval` (la porte qui compte pour ce ticket) reste au vert : 20/20 invariants, 8/8
cas dorés, composition de fiabilité stable à 57,26 %, dix écarts de baseline sous le seuil
d'avertissement (dérive naturelle de BODACC/SIRENE, < 1 %, déjà notée à la clôture de la session
6).

### Portes

`typecheck` ✓ · **108 tests** ✓ (inchangé — aucun test ajouté, ce ticket ne touche aucun code
sous test) · `build` et `build:dev` ✓ · `eval` ✓ (20/20 invariants, avertissements seuls sur les
baselines) · `eval:anon` — 6/9 (les trois écarts ci-dessus, hors périmètre). `verify:mcp` non
relancée : ce ticket ne touche ni `src/core/` ni `mcp-server/`.

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260825000004_plu_protection.sql` | Table `plu_linear_protection`, trois colonnes booléennes + `plu_protected` (générée) sur `premise_location`, cinquième ligne `ingestion_run` |
| `supabase/migrations/20260825000005_premises_within_plu.sql` | `compass_premises_within` étendue de quatre colonnes PLU |
| `scripts/ingest/plu.ts` | Chargement + rattachement, patron de `scripts/ingest/geography.ts` |
| `scripts/ingest/lib/parisOpendata.ts` | Lecteur d'export en masse pour opendata.paris.fr, extrait de `geography.ts` pour être partagé avec `plu.ts` |
| `scripts/ingest/lib/db.ts` | `IngestionSource` gagne `'plu'` |
| `src/types/database.ts` | Signature de `compass_premises_within` à jour |
| `DIAGNOSTIC.md` §18 | Les trois écarts `eval:anon` trouvés en chemin |
