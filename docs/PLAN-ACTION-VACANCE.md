# Compass — Plan d'action

*Vacance commerciale · Document de construction : doctrine, backlog, sources, IA et produit. Destiné à vivre dans le dépôt paris-compass.*

- Version 1.0 — 23 août 2026
- Dépôt : https://github.com/IvandeMurard/paris-compass
- Carte live : https://paris-compass.lovable.app
- Fichier : `docs/PLAN-ACTION-VACANCE.md`

## Où ça vit dans le dépôt

Ce document **complète** `docs/PLAN.md` (exécution technique, phases 0–6). Il ne le remplace pas.

| Fichier | Rôle |
| --- | --- |
| `docs/PLAN.md` | Backlog d'exécution déjà écrit (phases, ingestions, MCP) |
| `docs/CONTEXTE.md` | Persona, refus, contraintes |
| `docs/PERIMETRE.md` | Paris intra-muros, ce qui est hors scope |
| `docs/BDCOM.md` | Pièges du recensement APUR |
| `docs/PLAN-ACTION-VACANCE.md` | **Ceci** — doctrine, priorisation, sources nouvelles, IA, tickets |
| `docs/tickets/` | Corps des issues GitHub (épics + tickets) |

À coller en tête de `docs/PLAN.md` :

```markdown
> **Plan d'action vacance (août 2026).** Doctrine, backlog priorisé et tickets : [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).
> Ce fichier reste le backlog d'exécution technique (phases 0–6 déjà faites ou en cours).
> L'autre dit *quoi faire ensuite*, *dans quel ordre*, et *ce que la doctrine interdit*.
```

## Écarts corrigés à l'intégration — 23 août 2026

Ce document a été rédigé sans accès en écriture au dépôt. Quatre chiffres ont été recoupés
contre les fichiers du dépôt au moment de l'intégration et corrigés ici. La règle du projet
vaut pour la documentation comme pour l'écran : **un correctif consigné porte sa source**.

| Écrit dans la v1.0 | Corrigé en | Source du recoupement |
| --- | --- | --- |
| « rejouer les 21 migrations » | 25 dans `supabase/migrations/`, ~~24~~ **25** au ledger distant | `ls supabase/migrations` · ~~`docs/REPRISE.md`~~ **le ledger lui-même, remesuré le 24 août** |
| « le gate (10 invariants…) » | 15 — `I1` à `I15` | `eval/invariants.sql` |
| Établi / probable 51,6 % / 36,5 % | 51,4 % / 36,7 % | `eval/baselines/ingestion.json`, gel du 17 août |
| `w0-deploy` présenté comme entièrement à faire | Chargement fait le 15 août ; reste le retrait à l'anonyme | `docs/REPRISE.md`, « La suite, par ordre » n° 1 et 8 |

> **Un cinquième écart, le 24 août — et c'est cette ligne-ci qui l'a propagé.**
> « 24 au ledger distant » venait de `docs/REPRISE.md` et non du ledger. Le
> chiffre y était juste **au 17 août**, mesuré avant la poussée de
> `20260817000001`, et cité ensuite par une ligne qui ne portait pas cette date.
> Le tableau respectait donc la lettre de la règle — un correctif porte sa
> source — et en manquait l'esprit : **une documentation n'est pas une mesure.**
> Recouper contre la base, pas contre la page qui en parle.

Deux diagnostics du document ont en revanche été **vérifiés exacts** :

- `w0-provenance` — `scoreLocation(point, index, origin)` prenait bien un `Origin` unique pour
  toutes les métriques (`src/core/scoring.ts`), et `OSM_ORIGIN` était le seul constructeur exporté
  de `src/core/provenance.ts`. La provenance par champ était bien à écrire. **Fait le 24 août.**
  Le ticket **redisait `docs/PLAN.md` §4.1**, qui portait le même manque depuis le 15 août : les
  deux sont traités comme un seul chantier et clos ensemble, plutôt que laissés diverger.
- `w0-fiche` — aucune occurrence de `timeline` ni de `trace_premise` dans `src/`. Le MCP expose
  `compass_address_timeline` depuis le 17 août, le navigateur non.
  **Remesuré le 24 août avant le chantier : toujours exact, et plus large que ça — `.rpc(` et
  `compass_` avaient zéro occurrence dans `src/`. Corrigé le jour même.**

Les autres chiffres du corpus sont conformes aux baselines : 85 418 locaux, 228 275 relevés,
vacance 2017 à 9,3 %, 2020 à 10,5 %, médiane des fonds à 160 868 €.

Les mêmes corrections ont été portées dans `docs/tickets/` — `w0-deploy.md` et `w5-entity.md`
répétaient les chiffres périmés. L'index `00-INDEX.md` du pack n'a pas été repris : il dupliquait
à l'identique les 43 liens de la section « Tickets GitHub » ci-dessous.

## Ce que ce document ne couvre pas — relevé le 23 août

Recoupé section par section contre `docs/PLAN.md` après l'ouverture des issues.

**Une vingtaine des 37 tickets redisent une section de `PLAN.md`** : `w0-plu` §2.4,
`w0-fiche` §2.7, `w0-provenance` §4.1 (ligne 539), `w6-dossier` §2.6, `w2-mobiliscope` §3.1,
`w2-idfm` §3.2, `w6-liberations` §3.5, `w6-mcp` §4.1 et §4.2, `w1-chantiers` §5.1,
`w1-survie` §5.2 et §6.2, `w1-ppri` §5.3, `w7-etude-chantiers` §5.5, `w1-dia` §5.6,
`w5-entity` §6.6, `w5-confiance-agent` §6.8, et `w1-terrasses` / `w2-filosofi` /
`w2-bpe-marches-velo` §5.4. Ils sont mieux formulés ici — chaque ticket porte un critère
d'acceptation, ce que `PLAN.md` n'a pas — mais **les deux doivent être traités comme un seul
chantier**, sinon les deux backlogs divergent.

**Trois choses manquent, et l'une est importante.**

- **`PLAN.md` §5.9 — `bdcom20032020`.** ~~Aucun ticket.~~ **Comblé le 23 août** par
  `w1-historique`, en P0. Sept couches APUR de 2003 à 2020, vacants inclus, que `PLAN.md`
  qualifie de « vraisemblablement le levier le plus élevé de tout le corpus ». Il est en
  vague 1 et non 0 parce qu'il est suspendu à une réponse de l'APUR : le service ne porte
  aucune licence explicite. **L'ordre de bataille reste à revoir** : ce document met
  `w3-mapillary` en P0 pour combler 2023–2026 par de la vision, alors que `w1-historique`
  ouvre dix-sept ans avec les vacants par une API déjà maîtrisée.
- **La phase 6 de `PLAN.md`** — ~~six items, aucun ticket.~~ **Quatre comblés le 23 août** par
  `w6-analyse` : §6.1 matrices de transition, §6.3 agrégation par voie, §6.4 prix par activité,
  §6.5 ventes contre liquidations. **Deux restent sans ticket, délibérément** : §6.7 (colonnes
  chargées que rien ne lit — `is_bio`, `situation`, les bandes de surface, et surtout
  `bodacc_judgment.judged_on`) est un audit et non une fonction ; §6.9 (rendre vérifiable
  l'invariant « aucun chiffre ne peut exister uniquement dans l'UI ») est à moitié fait —
  `I11` couvre le versant backend — et l'autre moitié touche `src/`, donc Lovable.
- **L'idée de pente** (`PLAN.md` §5.8) — la gentrification est une tendance, pas un état.
  `w2-filosofi` est un instantané et ne la porte pas. **Toujours sans ticket.**

**Une contradiction assumée.** `PLAN.md` §5.4 écrit des sources d'appoint « à vérifier avant
engagement, aucune n'a été confirmée » ; `w1-terrasses` est ici en P0 avec un critère
définitif. La vérification reste un préalable non écrit du ticket.

## Thèse

Compass ne remplit pas les vitrines. Il dit laquelle vaut le coup, laquelle est un cimetière, laquelle se libère avant l'annonce, et pour quel métier — au tronçon, avec la source sous chaque chiffre. Le risque n'est pas trop peu de sources : c'est trois ans d'aveuglement sur la vacance, une fiche locale encore absente du front, et un pipeline qui ne se recharge pas tout seul.

## Doctrine — non négociable

**Pas de chiffre sans source citée**

Si un nombre ne peut pas être re-dérivé d'une source publique citée, il n'est pas affiché. Manquant = n/a, jamais 0. Pas de déclaration de bailleur, pas d'annonce scrapée, pas d'estimé propriétaire.

**Si deux locaux de la même rue ont le même verdict, Compass n'a rien dit**

La granularité utile est le tronçon, parfois le côté du trottoir. Un indicateur uniforme sur la rue décrit un contexte général ; il ne tranche pas une décision.

**Règles d'écriture**

- Quatre niveaux de fiabilité — établi, corroboré, probable, indéterminé — jamais un pourcentage de confiance.
- Une fréquence observée n'est pas une probabilité de réussite. Toujours l'effectif et la période, jamais un pourcentage nu.
- Air mesuré, bruit modelé, flux proxy : le mot exact, à l'écran comme ici.
- Changement d'activité (BDCom) n'est pas changement de propriétaire (BODACC).
- Absent n'est pas zéro. Withheld n'est pas vide. Non observé n'est ni vacant ni « plus un commerce ».

**Test d'une source nouvelle.** Est-ce public, daté, est-ce que ça sépare deux locaux de la même rue, est-ce que ça s'écrit en phrase décidable ?

### Personas

- **Le preneur** (Persona primaire) — Commerçant, restaurateur, artisan, franchisé. Décide où ouvrir 1 à 3 fois dans une vie, bail 3/6/9. Compass l'aide à ne pas signer sur une hunch.
- **L'agent** (ICP secondaire) — Un LLM via MCP. Même cœur, même traçabilité, sortie JSON + chaîne de raisonnement. C'est aussi le canal collectivités / CCI / SEM — pas une seconde carte.
- **Pas le broker** (Refus assumé) — Portefeuilles, comparaison de masse, couverture nationale : ça alourdit le produit pour celui qui étudie une adresse en profondeur. Un broker qui veut Compass prend l'API.

### Refus et ce qu'ils achètent

| Compass refuse | Ce que ça achète |
| --- | --- |
| Portail d'annonces | Position en amont : cessations, cessions, liquidations, recensés vides — pas ce que tout le monde voit déjà. |
| Estimation de loyer | Honnêteté. Aucun observatoire ouvert des loyers commerciaux en France. |
| Prévisionnel de CA | Crédibilité. L'inventer empoisonnerait tous les autres chiffres. |
| Score unique 0–100 | Une boulangerie veut du flux, un yoga du calme. Un score moyenne ce qui tire en sens contraire. |
| Couverture nationale | La profondeur. Les sources qui portent la valeur sont locales. |
| Compte pour explorer | Zéro friction avant de savoir si l'outil sert. |
| Places de marché (Appear Here et assimilés) | Évite la fausse absence : « pas d'annonce ici » ≠ « rien à saisir ». Le corpus couvre 85 418 locaux, ces plateformes quelques centaines en prime. |

## Contexte — la vacance

| Indicateur | Valeur | Source |
| --- | --- | --- |
| France 2025, tous formats | 11,6 % | Codata Digest 2026 |
| Pieds d'immeuble (centres-villes) | 11,7 % | Codata / CDF |
| Paris, commerce de détail | 12,7 % | Knight Frank 2025 |
| Artères commerçantes parisiennes | 8,6 % | Knight Frank, 84 axes |
| Axes prime Paris | 4,5 % | Knight Frank |
| Villes moyennes, souvent | 12–15 % | Commerce Immo / FACT |

| Corpus Compass | Valeur |
| --- | --- |
| Locaux au corpus | 85 418 |
| Observations BDCom | 228 275 |
| Vacance 2017 | 9,3 % |
| Vacance 2020 | 10,5 % |
| Vacance 2023 | n/a |
| Établi / probable | 51,4 % / 36,7 % |
| Établi + corroboré | 57,31 % |

- Les loyers ne baissent pas malgré la vacance (ILC en hausse, stratégies de foncières). Compass ne peut pas dire « trop cher de 20 % » : pas d'observatoire ouvert des loyers commerciaux.
- Le prêt-à-porter tourne deux fois plus vite que l'hôtellerie. 50 % de rotation dans une rue de mode est banal ; alarmant dans une rue d'hôtels.
- Même métier, même ville : 77 % des cafés de 2017 tiennent encore aux Halles six ans plus tard, 56 % dans le quartier du Mail.
- Médiane des fonds parisiens rattachés à une vitrine : 160 000 €. Alimentaire 250 k€, café 220 k€, vêtements 86 k€, services à la personne 50 k€.
- Vacance frictionnelle (0–6 mois), conjoncturelle (6 mois–2 ans), structurelle (> 2 ans). Compass peut aider à les distinguer au tronçon — pas avec un taux d'arrondissement.

### Ce que Compass répond déjà

- **Qu'est-ce qu'il y avait ici ?** Chronologie d'activité au local, millésime par millésime.
- **Rue morte ou rue qui tourne ?** Rotation du local rapportée à celle de son tronçon, par métier.
- **Combien ça se paie vraiment ?** Prix de fonds BODACC, médians par métier, effectif nommé.
- **Qu'est-ce qui se libère avant l'annonce ?** Cessation, cession, procédure, recensé vacant.
- **Le local est-il déjà équipé ?** Une cuisine a-t-elle déjà existé ? Extraction, graisse, puissance.
- **L'environnement tient-il ?** Aménités 800 m, air, risques — chaque axe séparé, sourcé.

### Ce qu'il ne peut pas répondre

- **Quel loyer vais-je payer ?** Pas d'observatoire ouvert des loyers commerciaux. L'ILC est un indice de révision, pas un niveau.
- **Combien de piétons devant la porte ?** Paris n'a pas de capteur piéton permanent. Telco propriétaire. Compass mesure présence et rythme.
- **Que dépensent les gens ici ?** Cartes bancaires propriétaires. Pas de contournement.
- **Quels locaux sont en annonce aujourd'hui ?** Portails privés, CGU. D'où le travail en amont.

## Vagues

### Vague 0 — Socle — ce qui débloque le produit

*Q3 2026.* Sans ça, le reste ne se voit pas. Déployer le corpus, montrer la timeline, dire la fraîcheur, ingérer le PLU, scinder la provenance.

### Vague 1 — Décision cette semaine

*Q3 2026.* Sources déjà identifiées dans PLAN.md, réordonnées : chantiers, survie SIRENE×BDCom, terrasses, PPRI zoné, DIA si ouverte.

### Vague 2 — Flux et présence mesurés

*Q4 2026.* Remplacer les proxys (piéton, bruit, air) par des mesures qui séparent deux locaux de la même rue.

### Vague 3 — Voir la vitrine maintenant

*Q4 2026.* Combler le trou 2023–2026. BDCom 2023 n'a plus les vacants. Observation visuelle datée, jamais un taux inventé.

### Vague 4 — Ce qui habite la rue

*Q4 2026.* Meublés, écoles, ABF, ERP, copro : le preneur se trompe souvent sur qui passe et sur ce que le bâtiment autorise.

### Vague 5 — IA au-dessus du cœur

*Q4 2026.* L'IA n'entre pas dans src/core/. Elle interroge, apparie, parse, explique. Chaque sortie est derived ou probable.

### Vague 6 — Produit — l'interprétation à l'écran

*Q4 2026.* Couche « ce qui se libère », modes métier, dossier d'une adresse, MCP publié. Compass vend des phrases, pas des couches.

### Vague 7 — Partenariats et kit hors Paris

*2027.* DIA si open, fichiers fonciers si acteur public, étude chantiers×BDCom, kit ville avec confiance abaissée. Pas de carte nationale.

## Backlog

### P0

| ID | Vague | Horizon | Action | Fait quand |
| --- | --- | --- | --- | --- |
| `w0-deploy` | 0 | Q3 2026 | Déployer le corpus sur la base hébergée | Un appel anon PostgREST sur un point intra-muros renvoie des locaux 2023, et withheld (pas zéro) pour 2017/2020. |
| `w0-fiche` | 0 | Q3 2026 | Fiche locale + timeline dans l'interface | Un local des Halles affiche 2017 → 2020 → 2023 (ou withheld) + événements BODACC, sans coalesce sur le libellé. — **fait le 24/08** : démontré sur 3 rue du Jour (quartier Halles, BDCom 1250) dans le navigateur avec la seule clé publiable ; `.rpc(` passe de 0 à 2 occurrences dans `src/` ; 96 tests, les deux builds au vert. Redisait `PLAN.md` §2.7, clos avec. Détail dans `docs/tickets/w0-fiche.md`. |
| `w0-cron` | 0 | Q3 2026 | Ingestion planifiée + date de fraîcheur par source | compass_* expose ingested_at pour BDCom, géographie, BODACC et SIRENE. Un cron a tourné au moins une fois sans intervention manuelle. |
| `w0-plu` | 0 | Q3 2026 | Ingérer le PLU plub_protcom | Deux adresses de la même rue, l'une sur linéaire protégé, l'autre non, reçoivent deux verdicts distincts. |
| `w0-provenance` | 0 | Q3 2026 | Provenance par champ, pas un Origin unique OSM | explain_score sur un local BDCom cite APUR, pas OSM, pour l'activité ; OSM reste sur les aménités. |
| `w1-chantiers` | 1 | Q3 2026 | Chantiers de voirie (fait d'exposition) | La fiche d'un local à 40 m d'un polygone perturbant affiche le chantier ; un voisin hors polygone, non. |
| `w1-survie` | 1 | Q3 2026 | Courbes de survie SIRENE × BDCom | Un café aux Halles et un café au Mail affichent deux survies, chacune avec n et millésimes, rapportées au métier pas à Paris entier. |
| `w1-terrasses` | 1 | Q3 2026 | Terrasses et étalages autorisés | La fiche restauration affiche oui/non/inconnu terrasse, avec le type (permanente, estivale) et la source. |
| `w0-history` | 0 | Q3 2026 | `compass_premise_history` : une retenue de licence rendue comme un fait | Un appel anonyme sur le local 54652 en 2017 ne rend plus `observed = false` avec `is_vacant = false`, le couple d'invariants est posé, et `eval:anon` le couvre. — **fait le 24/08** : migration `20260824000001` posée (ledger remesuré à 26), I16/I17 et la sonde éprouvés contre sabotage, les deux portes au vert contre le distant. Issue #51 fermée. Détail dans `docs/tickets/w0-history.md`. |
| `w1-historique` | 1 | Q3 2026 | bdcom20032020 : porter l'historique de six à vingt ans | Soit les couches 2003–2020 ingérées avec leur licence portée par millésime, soit une note publique dans `docs/BDCOM.md` fermant la piste. |
| `w3-mapillary` | 3 | Q4 2026 | Mapillary : rideau, pancarte, vitrine — observation datée | Gate : précision/rappel sur 50 façades annotées. Affichage uniquement au-dessus du seuil, avec la photo et la date. |

### P1

| ID | Vague | Horizon | Action | Fait quand |
| --- | --- | --- | --- | --- |
| `w1-ppri` | 1 | Q3 2026 | PPRI en zonage, pas en booléen | Un local berge (zone bleue) et un local du 20e (hors zone) ne reçoivent plus le même verdict. |
| `w1-dia` | 1 | Q3 2026 | Droit de préemption / DIA — vérifier l'open data | Soit une couche DIA sourcée sur le périmètre, soit une note publique « non publié, piste close ». |
| `w2-idfm` | 2 | Q4 2026 | Validations IDFM horaires | Deux locaux à 800 m de deux stations au profil midi vs soir reçoivent deux rythmes distincts, étiquetés station. |
| `w2-mobiliscope` | 2 | Q4 2026 | Mobiliscope — présence heure par heure | La fiche oppose midi et soir sur le même local, avec le secteur Mobiliscope nommé. |
| `w2-filosofi` | 2 | Q4 2026 | Filosofi carroyé 200 m | Deux locaux à 300 m l'un de l'autre, carreaux différents, montrent deux médianes. |
| `w2-air-bruit` | 2 | Q4 2026 | Airparif + Bruitparif à la place des proxys | Une rue canyon et une rue en retrait n'ont plus le même bruit ; la méthode cite Bruitparif, pas « major roads 500 m ». |
| `w4-meubles` | 4 | Q4 2026 | Meublés touristiques déclarés | Le Marais touristique et une rue du 20e résidentiel n'ont pas le même n à 200 m. |
| `w4-abf` | 4 | Q4 2026 | ABF, monuments, SPR — façade contrainte | Un local en abords MH et un local hors périmètre reçoivent deux alertes distinctes. |
| `w5-entretien` | 5 | Q4 2026 | Agent d'entretien du preneur (8 questions → checklist) | Un scénario restaurateur et un scénario yoga sur la même adresse produisent deux checklists, zéro verdict 0–100. |
| `w5-confiance-agent` | 5 | Q4 2026 | Auto-évaluation de confiance de l'agent | Chaque réponse MCP/agent porte un bloc « ce que je ne sais pas » non vide dès qu'un axe est n/a. |
| `w5-entity` | 5 | Q4 2026 | Résolution d'entité BODACC × BDCom | eval/ : golden set de 8 chronologies + cas d'adresses partagées. Pas de promotion automatique de niveau. |
| `w6-liberations` | 6 | Q4 2026 | Vue par défaut « ce qui se libère » | L'ouverture de l'app sans requête montre des signaux de libération, chacun avec source et date, et une légende de couverture. |
| `w6-modes` | 6 | Q4 2026 | Trois modes métier | Le basculement de mode réordonne les axes et les alertes, sans inventer de chiffre. |
| `w6-dossier` | 6 | Q4 2026 | Dossier exportable d'une adresse | Depuis une fiche, télécharger un fichier dont chaque figure est re-dérivable. |
| `w6-analyse` | 6 | Q4 2026 | Les analyses déjà permises par le schéma | Quatre fonctions `compass_*` couvertes par la porte : transition d'activité, voie entière, prix par code d'activité, ventes contre liquidations. |
| `w6-mcp` | 6 | Q4 2026 | Publier le MCP + llms.txt | Un agent externe peut score_location / trace_premise / compare_locations / list_sources sur le dépôt documenté. |
| `w7-foncier` | 7 | 2027 | Fichiers fonciers / MAJIC — partenariat public | Soit un flux fichiers fonciers sous convention, soit EmpCom clairement étiqueté trop grossier, sans sur-promesse. |
| `w7-etude-chantiers` | 7 | 2027 | Étude rétrospective chantiers × BDCom | Note méthodologique dans le dépôt, avec effet ou absence d'effet, et règle d'affichage qui en découle. |
| `w7-kit` | 7 | 2027 | Kit ville — même cœur, BDCom substituable, confiance abaissée | Un README kit : sources minimales, mapping de confiance, ce qui devient n/a hors Paris. |

### P2

| ID | Vague | Horizon | Action | Fait quand |
| --- | --- | --- | --- | --- |
| `w2-bpe-marches-velo` | 2 | Q4 2026 | BPE, marchés alimentaires, comptages vélo | Un commerce de bouche à 80 m d'un marché deux jours par semaine le voit sur la fiche ; BPE et OSM d'une école se recoupent en corroboré. |
| `w3-osm-notes` | 3 | Q4 2026 | Notes OSM et fraîcheur du POI | La fiche peut montrer « POI OSM non touché depuis 4 ans » sans changer le statut du local. |
| `w4-ecoles` | 4 | Q4 2026 | Effectifs scolaires | Une fiche alimentaire proche d'un groupe scolaire affiche l'effectif et la distance. |
| `w4-erp-copro-ads` | 4 | Q4 2026 | ERP / PMR, copropriétés, permis ADS | La fiche restauration peut dire cave/ERP/copro/ADS chacun en measured ou n/a. |
| `w4-frequentation` | 4 | Q4 2026 | Fréquentation musées, piscines, bibliothèques | Un local à 100 m d'un musée à forte fréquentation le voit, avec la source et l'année. |
| `w5-parse` | 5 | Q4 2026 | Extracteur BODACC / INPI (tuyauterie) | Le gate d'éval couvre un échantillon de cessions ; les échecs restent n/a, pas 0 €. |
| `w5-explain-metier` | 5 | Q4 2026 | explain_score métier-aware | explain_score(lat, lng, metric, trade) change l'ordre des phrases, pas les chiffres. |
| `w7-inpi` | 7 | 2027 | Comptes INPI comme échantillon, jamais comme moyenne de rue | La phrase d'affichage refuse de se calculer si n < seuil, et cite toujours les non-publiants. |

### Fiches d'action

#### w0-deploy — Déployer le corpus sur la base hébergée

- Priorité **P0** · vague 0 · Q3 2026
- **Pourquoi.** Le chargement du distant **est fait depuis le 15 août** : `dbefhvmyfmmhjeetdddu` porte le schéma et les données, 85 418 locaux et 228 275 relevés mesurés sur place le 17 août, porte d'évaluation au vert (`docs/REPRISE.md`, « Ce qui existe et fonctionne »). Ce qui reste ouvert n'est pas le chargement mais le **retrait à l'anonyme** : que 2017 et 2020 sortent en `withheld` et non en zéro pour un visiteur sans clé.
- **Comment.** ~~Poser `20260817000001_premises_within_withholding.sql` sur le distant — le ledger distant est à 24 migrations, `supabase/migrations/` en compte 25~~ — **faux, remesuré le 24 août : le ledger est à 25 et la migration était déjà posée** — puis rejouer la porte en anonyme. Le reste (PostGIS, BDCom ×3, BODACC, SIRENE, géographie) est déjà en place.
- **Doctrine.** Rien n'est annoncé comme live s'il n'est pas interrogeable par un visiteur anonyme.
- **Fait quand.** Un appel anon PostgREST sur un point intra-muros renvoie des locaux 2023, et withheld (pas zéro) pour 2017/2020. — **Démontré le 24 août**, Châtelet : 2017 et 2020 rendent une ligne `withheld = true` sans contenu, 2023 rend 3 059 locaux, un rayon d'un mètre rend zéro ligne. Détail et négatif de contrôle dans `docs/tickets/w0-deploy.md`. Rejouable : `npm.cmd run eval:anon`.

#### w0-fiche — Fiche locale + timeline dans l'interface

- Priorité **P0** · vague 0 · Q3 2026
- Dépend de : `w0-deploy`
- **Pourquoi.** Le MCP a trace_premise ; le navigateur non. L'historique du local est le produit, pas un accessoire.
- **Comment.** Brancher compass_address_timeline sur la fiche. Chaque ligne : source, date, niveau, justification. observed=false → « non observé », jamais vacant ni « plus un commerce ».
- **Doctrine.** L'historique justifie le taux de rotation rapporté à la rue ; il ne le remplace pas.
- **Fait quand.** Un local des Halles affiche 2017 → 2020 → 2023 (ou withheld) + événements BODACC, sans coalesce sur le libellé. — **Démontré le 24 août** dans le navigateur, clé publiable seule : **3 rue du Jour, quartier Halles**, identifiant BDCom 1250 — 2017 retenu, 2020 retenu, 2023 « Prêt-à-porter Homme / AGNES B », plus quatre annonces BODACC de 2015 à 2018, et aucune reprise de libellé sur les lignes retenues. Détail, mesures de rattachement et limites dans `docs/tickets/w0-fiche.md`.
- **Ce ticket redisait `docs/PLAN.md` §2.7**, comme la section « Ce que ce document ne couvre pas » l'annonçait. Les deux sont clos ensemble et se citent l'un l'autre.
- **Un défaut trouvé en chemin, hors périmètre :** sur un millésime `retail_only`, `compass_address_timeline` conclut « plus un commerce » à partir de millésimes qu'elle retient dans la même réponse. `DIAGNOSTIC.md` §15, issue [#54](https://github.com/IvandeMurard/paris-compass/issues/54) — correctif SQL, à trancher.

#### w0-cron — Ingestion planifiée + date de fraîcheur par source

- Priorité **P0** · vague 0 · Q3 2026
- Dépend de : `w0-deploy`
- **Pourquoi.** Les scripts sont idempotents mais rien ne les rejoue. Une date affichée sans rythme réel est le loyer fabriqué sous une autre forme.
- **Comment.** Job à privilèges élevés (GitHub Actions ou équivalent serveur), jamais la clé anon. Table générique (source, dernière exécution ok, n lignes). Cadences distinctes : SIRENE mensuel, BODACC continu, BDCom triennal, géographie rare.
- **Doctrine.** Afficher une date n'est honnête que si le rafraîchissement est réel ou déclaré.
- **Fait quand.** compass_* expose ingested_at pour BDCom, géographie, BODACC et SIRENE. Un cron a tourné au moins une fois sans intervention manuelle.

#### w0-plu — Ingérer le PLU plub_protcom

- Priorité **P0** · vague 0 · Q3 2026
- Dépend de : `w0-deploy`
- **Pourquoi.** Identifié, pas encore chargé. Sur un linéaire protégé, le rez-de-chaussée ne peut pas changer de destination — première chose qui tue un projet.
- **Comment.** Jeu opendata.paris.fr, version votée 20 novembre 2024. Bandeau d'alerte sur la fiche. Informatif, sans valeur réglementaire, renvoi au Portail des Règles d'Urbanisme.
- **Doctrine.** Contrainte binaire cartographiée, pas un score d'urbanisme.
- **Fait quand.** Deux adresses de la même rue, l'une sur linéaire protégé, l'autre non, reçoivent deux verdicts distincts.

#### w0-provenance — Provenance par champ, pas un Origin unique OSM

- Priorité **P0** · vague 0 · Q3 2026
- **Pourquoi.** Le MCP l'avoue : tout est étiqueté Overpass, même quand la couche vient de BDCom via Supabase.
- **Comment.** Changer la signature de scoreLocation pour un Origin par métrique. Front et MCP bougent ensemble — c'est le cœur partagé.
- **Doctrine.** Chaque figure porte source, licence, millésime, méthode, réserve.
- **Fait quand.** explain_score sur un local BDCom cite APUR, pas OSM, pour l'activité ; OSM reste sur les aménités.
- **Fait le 24 août**, mesuré contre le distant : `footfall` rend `APUR BDCom 2023 + OpenStreetMap via Overpass`, `asOf = 2023-06` ; `groceries` et `noise` restent sur OpenStreetMap. Tableau complet dans `docs/tickets/w0-provenance.md`. Même chantier que `docs/PLAN.md` §4.1.

#### w1-chantiers — Chantiers de voirie (fait d'exposition)

- Priorité **P0** · vague 1 · Q3 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Un restaurateur signe ou non sur « 40 m d'un chantier perturbant, sept. 2026 → mars 2027 ».
- **Comment.** opendata.paris.fr : historiques 2019–2023 + chantiers-perturbants quotidien, polygones. Distance au local, dates déclarées. measured — acte administratif, pas un modèle.
- **Doctrine.** Jamais une prévision d'impact. La phrase, datée, sourcée. L'association chantier→disparition attend l'étude 5.5.
- **Fait quand.** La fiche d'un local à 40 m d'un polygone perturbant affiche le chantier ; un voisin hors polygone, non.

#### w1-survie — Courbes de survie SIRENE × BDCom

- Priorité **P0** · vague 1 · Q3 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Trois photos (2017/2020/2023) deviennent un rythme continu. Comble les années aveugles et 2024–2026.
- **Comment.** Aucune source nouvelle. Jointure au niveau défendable : un SIRET n'est pas un local. Non rattachable = probable. Taux par métier × tronçon, effectif nommé, période nommée.
- **Doctrine.** « 72 % des cafés tiennent six ans » est une observation. « Votre café a 72 % de chances » est un prévisionnel — interdit.
- **Fait quand.** Un café aux Halles et un café au Mail affichent deux survies, chacune avec n et millésimes, rapportées au métier pas à Paris entier.

#### w1-historique — bdcom20032020 : porter l'historique de six à vingt ans

- Priorité **P0** · vague 1 · Q3 2026
- **Pourquoi.** Sept couches APUR de 2003 à 2020, **vacants inclus**. `PLAN.md` §5.9 : « vraisemblablement le levier le plus élevé de tout le corpus ». Précède `w3-mapillary` dans l'ordre de valeur — celui-ci comble 2023–2026 par de la vision, celui-là ouvre dix-sept ans par une API déjà maîtrisée.
- **Comment.** La licence d'abord : le service porte « Ne pas supprimer », alimente une application interne de l'APUR et n'a **aucune licence explicite**. Vérifier le courrier à `data@apur.org` du 10 août. Si accordé, ingestion par l'API REST paginée, licence portée comme donnée par millésime. Sinon, écrire la note et s'arrêter.
- **Doctrine.** Une licence absente n'est pas une licence permissive. Même règle que `w1-dia`.
- **Fait quand.** Soit les couches sont ingérées et un local des Halles montre une chronologie qui commence avant 2017, soit `docs/BDCOM.md` porte la note de clôture avec la date de la demande et la teneur de la réponse.

#### w1-terrasses — Terrasses et étalages autorisés

- Priorité **P0** · vague 1 · Q3 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Pour un café, c'est binaire : une terrasse est-elle déjà autorisée sur cette façade ?
- **Comment.** opendata.paris.fr/terrasses-autorisations, géolocalisé. Rattacher à l'adresse / au linéaire. Signal de vitalité et réponse d'exploitation.
- **Doctrine.** Fait administratif, measured. Ne pas en déduire un CA terrasse.
- **Fait quand.** La fiche restauration affiche oui/non/inconnu terrasse, avec le type (permanente, estivale) et la source.

#### w1-ppri — PPRI en zonage, pas en booléen

- Priorité **P1** · vague 1 · Q3 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** « Inondation : présent dans 1 km » est vrai presque partout à Paris, donc muet.
- **Comment.** Trois couches côte à côte : zone PPRI transcrite ; ce que le règlement impose au RDC (informatif) ; implication métier en derived (cave vs prêt-à-porter). Remontée de nappe BRGM à part. CatNat commune écartée (uniforme).
- **Doctrine.** Transcrire les classes du régulateur. Ne pas fondre PPRI + nappe + CatNat en un « risque 3/4 ».
- **Fait quand.** Un local berge (zone bleue) et un local du 20e (hors zone) ne reçoivent plus le même verdict.

#### w1-dia — Droit de préemption / DIA — vérifier l'open data

- Priorité **P1** · vague 1 · Q3 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Équivalent ouvert et amont de l'annonce, sur 5e, 6e et partie du 7e depuis août 2024.
- **Comment.** Vérifier si les déclarations d'intention d'aliéner fonds/baux sont publiées. Si oui, les ingérer comme signal « place qui se libère ». Si non, l'écrire et s'arrêter. Ne pas négocier un flux privé.
- **Doctrine.** Si ce n'est pas public, la piste s'arrête. Compass ne devient pas un greffe parallèle.
- **Fait quand.** Soit une couche DIA sourcée sur le périmètre, soit une note publique « non publié, piste close ».

#### w2-idfm — Validations IDFM horaires

- Priorité **P1** · vague 2 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Remplace le proxy piéton par des entrées de station comptées depuis 2015.
- **Comment.** Profil horaire de la station la plus proche, millésime, réserve : ce n'est pas le trottoir de la vitrine. Distingue un pôle de bureau d'un pôle résidentiel.
- **Doctrine.** Mesuré à la station, pas à la porte. Le label le dit.
- **Fait quand.** Deux locaux à 800 m de deux stations au profil midi vs soir reçoivent deux rythmes distincts, étiquetés station.

#### w2-mobiliscope — Mobiliscope — présence heure par heure

- Priorité **P1** · vague 2 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Un quartier de bureaux qui triple à midi n'est pas un quartier d'habitants.
- **Comment.** CNRS, ODbL. Présence par secteur / heure / âge / CSP. Phrase : « population présente à 12h vs 20h, secteur X ».
- **Doctrine.** Présence, pas passage devant la porte. Pas un comptage piéton.
- **Fait quand.** La fiche oppose midi et soir sur le même local, avec le secteur Mobiliscope nommé.

#### w2-filosofi — Filosofi carroyé 200 m

- Priorité **P1** · vague 2 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** L'IRIS est trop large : deux rues du même IRIS peuvent n'avoir rien à voir. Le carreau 200 m passe le test de granularité.
- **Comment.** INSEE, revenus et population. Afficher la maille et l'année. Utile au caviste, muet pour le kebab de flux.
- **Doctrine.** Pas une moyenne d'arrondissement. Pas un score d'aisance.
- **Fait quand.** Deux locaux à 300 m l'un de l'autre, carreaux différents, montrent deux médianes.

#### w2-bpe-marches-velo — BPE, marchés alimentaires, comptages vélo

- Priorité **P2** · vague 2 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Appoint qui fait passer un comptage OSM de probable à corroboré, et donne un rythme mesuré (vélo) ou périodique (marché).
- **Comment.** BPE × OSM = deux sources indépendantes. Marchés : jours et emprises. Vélo : pas des piétons, étiquette honnête, mieux que le proxy route.
- **Doctrine.** Corroboration, pas substitution. Le vélo n'est pas un piéton.
- **Fait quand.** Un commerce de bouche à 80 m d'un marché deux jours par semaine le voit sur la fiche ; BPE et OSM d'une école se recoupent en corroboré.

#### w2-air-bruit — Airparif + Bruitparif à la place des proxys

- Priorité **P1** · vague 2 · Q4 2026
- Dépend de : `w0-provenance`
- **Pourquoi.** Copernicus CAMS et le bruit modelé depuis les routes majeures sont trop lisses pour séparer deux rues.
- **Comment.** Mailles Île-de-France mesurées / modelées par les observatoires locaux. Une dimension par couche, jamais un indice unique air-bruit.
- **Doctrine.** Mesuré vs modelé, le mot exact. Si deux locaux de la rue ont le même niveau, on n'affiche pas la couche comme discriminante.
- **Fait quand.** Une rue canyon et une rue en retrait n'ont plus le même bruit ; la méthode cite Bruitparif, pas « major roads 500 m ».

#### w3-mapillary — Mapillary : rideau, pancarte, vitrine — observation datée

- Priorité **P0** · vague 3 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Trou produit n°1. BDCom 2023 sans vacants, OSM shop=vacant mal tenu, SeLoger interdit. La rue est le seul fait public récent.
- **Comment.** Mapillary (CC-BY) + éventuellement IGN imagerie orientée. Classes fermées : rideau baissé, « à louer / à céder », vitrine vide, graffitis, terrasse. Sortie = observation + date + crop. 50 façades gold dans eval/. Sous le seuil → silence.
- **Doctrine.** « Façade au rideau baissé, cliché du 12 mars 2026 » n'est pas « vacant = true ». derived, jamais établi par le modèle seul.
- **Fait quand.** Gate : précision/rappel sur 50 façades annotées. Affichage uniquement au-dessus du seuil, avec la photo et la date.

#### w3-osm-notes — Notes OSM et fraîcheur du POI

- Priorité **P2** · vague 3 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Signal faible mais public : un shop=* non édité depuis 4 ans, une note « fermé ».
- **Comment.** Date de dernière édition du POI, notes géolocalisées. Niveau indéterminé. Ne jamais en déduire une vacance.
- **Doctrine.** Signal faible = undetermined. Absent n'est pas zéro.
- **Fait quand.** La fiche peut montrer « POI OSM non touché depuis 4 ans » sans changer le statut du local.

#### w4-meubles — Meublés touristiques déclarés

- Priorité **P1** · vague 4 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Grand oublié. Une rue à forte densité Airbnb n'a pas la même soirée, la même boulangerie, le même « calme ».
- **Comment.** opendata.paris.fr registre des autorisations de changement d'usage. Comptage dans 200 m, millésime. Phrase : « n autorisations dans 200 m ».
- **Doctrine.** Densité d'autorisations, pas un taux Airbnb au noir. Ça sépare deux rues.
- **Fait quand.** Le Marais touristique et une rue du 20e résidentiel n'ont pas le même n à 200 m.

#### w4-ecoles — Effectifs scolaires

- Priorité **P2** · vague 4 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** 1 200 élèves à 400 m, c'est la boulangerie du matin — mieux qu'un pin OSM « école ».
- **Comment.** éducation.gouv, ouvert. Effectif × distance. Réserve : rythme scolaire, pas un flux annuel lissé.
- **Doctrine.** Comptage administratif, pas un modèle de demande.
- **Fait quand.** Une fiche alimentaire proche d'un groupe scolaire affiche l'effectif et la distance.

#### w4-abf — ABF, monuments, SPR — façade contrainte

- Priorité **P1** · vague 4 · Q4 2026
- Dépend de : `w0-plu`
- **Pourquoi.** Extraction, enseigne, menuiserie : des mois et des dizaines de k€. Décisif avant de voyager.
- **Comment.** Périmètres ABF / MH / SPR. Phrase : « Façade dans le champ de visibilité d'un MH : enseigne et extraction soumises à l'ABF ». Informatif.
- **Doctrine.** Comme le PLU : signal, pas un avis d'urbanisme opposable.
- **Fait quand.** Un local en abords MH et un local hors périmètre reçoivent deux alertes distinctes.

#### w4-erp-copro-ads — ERP / PMR, copropriétés, permis ADS

- Priorité **P2** · vague 4 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Capacité, accessibilité, copro en difficulté (extraction refusée), changement de destination déjà déposé.
- **Comment.** Registres publics ERP/PMR ; ANCOL copropriétés ; ADS Paris en complément de Sitadel. Chaque couche séparée, n/a si silencieuse.
- **Doctrine.** Ne pas fusionner en un « risque immeuble ».
- **Fait quand.** La fiche restauration peut dire cave/ERP/copro/ADS chacun en measured ou n/a.

#### w4-frequentation — Fréquentation musées, piscines, bibliothèques

- Priorité **P2** · vague 4 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** Rythme réel autour d'un équipement, pas seulement « il y a un musée ».
- **Comment.** Paris Data / établissements. Profil saisonnier si disponible. Label : fréquentation de l'équipement, pas du trottoir.
- **Doctrine.** Proxy de présence, étiqueté comme tel.
- **Fait quand.** Un local à 100 m d'un musée à forte fréquentation le voit, avec la source et l'année.

#### w5-entretien — Agent d'entretien du preneur (8 questions → checklist)

- Priorité **P1** · vague 5 · Q4 2026
- Dépend de : `w0-fiche`, `w6-mcp`
- **Pourquoi.** Le preneur décide 1 à 3 fois dans une vie et ne sait pas quoi demander. C'est le produit humain ; le MCP est déjà le backend.
- **Comment.** Métier, extraction, terrasse, cave, soir, budget fonds, surface, PMR. Puis score_location / trace_premise / compare_locations. Sortie : checklist oui / non / silencieux, chaque ligne sourcée. Pas de score unique.
- **Doctrine.** L'IA au-dessus du cœur. Pondération déclarée par le métier, jamais apprise en secret.
- **Fait quand.** Un scénario restaurateur et un scénario yoga sur la même adresse produisent deux checklists, zéro verdict 0–100.

#### w5-confiance-agent — Auto-évaluation de confiance de l'agent

- Priorité **P1** · vague 5 · Q4 2026
- Dépend de : `w5-entretien`
- **Pourquoi.** Déjà en research dans le README. Un paragraphe fluide noie les trous. L'agent doit les nommer.
- **Comment.** L'agent dit : silencieux sur le loyer, probable sur quel local a été cédé, établi sur l'activité 2020. S'appuie sur les niveaux Measured<T>, ne les réinvente pas.
- **Doctrine.** Quatre niveaux, jamais un pourcentage. L'agent répète la doctrine, il ne la contourne pas.
- **Fait quand.** Chaque réponse MCP/agent porte un bloc « ce que je ne sais pas » non vide dès qu'un axe est n/a.

#### w5-entity — Résolution d'entité BODACC × BDCom

- Priorité **P1** · vague 5 · Q4 2026
- Dépend de : `w0-fiche`
- **Pourquoi.** 36,7 % de probable : BODACC nomme une adresse, BDCom un local, 69 % des locaux partagent un numéro.
- **Comment.** Proposition : « cession boulangerie 42 m² colle au local #3 (42–60 m², boulangerie 2020), pas au #7 (coiffeur) » + pièces. Ne monte jamais tout seul à établi.
- **Doctrine.** Réduire le silence, pas blanchir la jointure. Le niveau reste probable tant qu'aucune source ne nomme le local.
- **Fait quand.** eval/ : golden set de 8 chronologies + cas d'adresses partagées. Pas de promotion automatique de niveau.

#### w5-parse — Extracteur BODACC / INPI (tuyauterie)

- Priorité **P2** · vague 5 · Q4 2026
- Dépend de : `w0-cron`
- **Pourquoi.** Le regex des prix est fragile. Activité, surface, prix, nature de l'acte se prêtent à un extracteur étiqueté derived.
- **Comment.** Modèle ou règles + LLM borné, rejeu possible, golden set dans eval/. Jamais un oracle de valorisation.
- **Doctrine.** IA de tuyauterie. La donnée extraite reste derived jusqu'à validation par champ structuré.
- **Fait quand.** Le gate d'éval couvre un échantillon de cessions ; les échecs restent n/a, pas 0 €.

#### w5-explain-metier — explain_score métier-aware

- Priorité **P2** · vague 5 · Q4 2026
- Dépend de : `w0-provenance`
- **Pourquoi.** Aujourd'hui l'outil explique un axe. Demain il dit ce qui compte pour CE métier.
- **Comment.** Pondération déclarée (cave à vins : calme + revenu 200 m ; kebab : flux midi). Pas de poids appris opaques.
- **Doctrine.** Le métier arbitre. Compass n'apprend pas un « bon emplacement » universel.
- **Fait quand.** explain_score(lat, lng, metric, trade) change l'ordre des phrases, pas les chiffres.

#### w6-liberations — Vue par défaut « ce qui se libère »

- Priorité **P1** · vague 6 · Q4 2026
- Dépend de : `w0-fiche`, `w1-survie`
- **Pourquoi.** La promesse est l'amont de l'annonce. Elle n'est pas encore l'écran d'accueil.
- **Comment.** Sans adresse : cessations SIRENE, procédures BODACC, DIA si ouvertes, rideaux Mapillary. Avec adresse : la fiche. Jamais un stock d'annonces.
- **Doctrine.** Upstream. Absent sur cette couche ≠ rien à saisir — légender la couverture de chaque signal.
- **Fait quand.** L'ouverture de l'app sans requête montre des signaux de libération, chacun avec source et date, et une légende de couverture.

#### w6-modes — Trois modes métier

- Priorité **P1** · vague 6 · Q4 2026
- Dépend de : `w0-fiche`, `w1-terrasses`, `w0-plu`
- **Pourquoi.** Même corpus, phrases différentes. Un dashboard unique moyenne ce que le README refuse.
- **Comment.** Restauration (cuisine, terrasse, PPRI cave, licence). Boutique (linéaire, PLU, rotation prêt-à-porter). Artisanat (PLU artisanat, copro, livraison).
- **Doctrine.** Pas un score par métier. Une checklist par métier.
- **Fait quand.** Le basculement de mode réordonne les axes et les alertes, sans inventer de chiffre.

#### w6-dossier — Dossier exportable d'une adresse

- Priorité **P1** · vague 6 · Q4 2026
- Dépend de : `w0-fiche`, `w0-provenance`
- **Pourquoi.** C'est ce que le banquier et le franchiseur signeront. Déjà en design ; le MCP le produit déjà.
- **Comment.** Un fichier (PDF/JSON) depuis la fiche, pas depuis une liste. Chaque chiffre : source, licence, millésime, méthode. Pas d'export de masse.
- **Doctrine.** Un dossier, une adresse. Pas de bouton « tout exporter ».
- **Fait quand.** Depuis une fiche, télécharger un fichier dont chaque figure est re-dérivable.

#### w6-analyse — Les analyses déjà permises par le schéma

- Priorité **P1** · vague 6 · Q4 2026
- Dépend de : `w0-deploy`
- **Pourquoi.** `PLAN.md` phase 6 : le modèle répond à des questions que rien ne pose. Aucune source nouvelle, seulement une fonction pour chacune. Ce document, qui est un plan de sources, les avait toutes omises.
- **Comment.** Quatre fonctions `compass_*` exécutables par `anon` : §6.1 matrices de transition (`lag()` sur `(location_id, vintage_year)`), §6.3 agrégation par `voie_id`, §6.4 prix médian groupé sur le code d'activité BDCom et jamais sur le texte BODACC, §6.5 ventes contre liquidations. Hors périmètre : §6.7, qui est un audit de colonnes dormantes, et §6.9, à moitié fait et bloqué sur Lovable.
- **Doctrine.** Aucune source nouvelle, donc aucune licence nouvelle. Une durée médiane avant revente n'est pas un taux de rotation.
- **Fait quand.** Les quatre fonctions existent, la porte les couvre, et une adresse des Halles rend les quatre lectures avec leur effectif.

#### w6-mcp — Publier le MCP + llms.txt

- Priorité **P1** · vague 6 · Q4 2026
- Dépend de : `w0-deploy`, `w0-provenance`
- **Pourquoi.** Les collectivités, CCI, SEM branchent leur agent. Pas de second produit « mode mairie ».
- **Comment.** Publier mcp-server (npm ou registre MCP), llms.txt déjà écrit. Prompt d'installation. Rôle anon uniquement.
- **Doctrine.** Même frontière de confiance qu'un visiteur anonyme. Jamais la clé service.
- **Fait quand.** Un agent externe peut score_location / trace_premise / compare_locations / list_sources sur le dépôt documenté.

#### w7-foncier — Fichiers fonciers / MAJIC — partenariat public

- Priorité **P1** · vague 7 · 2027
- Dépend de : `w0-deploy`
- **Pourquoi.** Le local fiscal existe même sans SIRET ni vitrine BDCom. C'est l'équivalent national, plus sale, de BDCom.
- **Comment.** Accès restreint acteurs publics (Cerema / DGALN). Partenariat Ville, APUR ou collectivité. EmpCom open trop grossier pour le tronçon. DVF (murs/m²) en appoint, jamais comme loyer.
- **Doctrine.** Sans ça, hors Paris = radar SIRET. Avec, un kit ville devient défendable. Pas un fetch anonyme.
- **Fait quand.** Soit un flux fichiers fonciers sous convention, soit EmpCom clairement étiqueté trop grossier, sans sur-promesse.

#### w7-inpi — Comptes INPI comme échantillon, jamais comme moyenne de rue

- Priorité **P2** · vague 7 · 2027
- Dépend de : `w5-parse`
- **Pourquoi.** ~45 % confidentiels, biais vers les plus gros. Utile borné, toxique si on en fait un CA de rue.
- **Comment.** « Parmi les 12 commerces du tronçon ayant publié 2024, médiane de CA X. 7 n'ont pas publié. Ce n'est pas une moyenne de rue. »
- **Doctrine.** Observation bornée, effectif nommé. Jamais « votre café fera X ».
- **Fait quand.** La phrase d'affichage refuse de se calculer si n < seuil, et cite toujours les non-publiants.

#### w7-etude-chantiers — Étude rétrospective chantiers × BDCom

- Priorité **P1** · vague 7 · 2027
- Dépend de : `w1-chantiers`
- **Pourquoi.** C'est ce qui donnerait le droit d'afficher une association mesurée plutôt qu'une intuition. Si l'effet n'existe pas, on l'apprend et on ne l'affiche pas.
- **Comment.** Les locaux à moins de N m d'un chantier de plus de M mois ont-ils disparu plus souvent entre 2020 et 2023 que leurs voisins de la même rue et du même métier ? Publiable, falsifiable.
- **Doctrine.** Résultat de méthode, pas une feature. La démarche qui sépare Compass d'un tableau de bord.
- **Fait quand.** Note méthodologique dans le dépôt, avec effet ou absence d'effet, et règle d'affichage qui en découle.

#### w7-kit — Kit ville — même cœur, BDCom substituable, confiance abaissée

- Priorité **P1** · vague 7 · 2027
- Dépend de : `w7-foncier`
- **Pourquoi.** La France entière est un refus. Un kit pour une ville qui a un recensement (CCI, observatoire, inventaire) est de la profondeur ailleurs, pas de la couverture.
- **Comment.** src/core/ inchangé. Swap BDCom → observatoire local, ou à défaut fichiers fonciers + SIRENE + BODACC + OSM. Abaisser les niveaux. Un Compass Lyon établi sur de l'OSM ment.
- **Doctrine.** Depth over breadth. Nommer le produit plus mince (signal, pas Compass complet) s'il n'y a pas de recensement de locaux.
- **Fait quand.** Un README kit : sources minimales, mapping de confiance, ce qui devient n/a hors Paris.

## Catalogue des sources

| Source | Producteur | Statut | Licence | Granularité | Phrase | Piège |
| --- | --- | --- | --- | --- | --- | --- |
| OpenStreetMap (Overpass) | Contributeurs OSM | connectée | ODbL | POI, voirie | Aménités, commerces tagués, parfois shop=vacant. | shop=vacant mal tenu. Ne pas en faire un taux de vacance. |
| Base Adresse Nationale | Etalab / IGN | connectée | Licence Ouverte 2.0 | adresse | Géocodage de l'adresse saisie. | Plusieurs locaux partagent un numéro — 69 % des cas. |
| Encadrement des loyers (OLAP) | Ville de Paris / OLAP | connectée | ODbL | 32 cases / 80 quartiers | Signal d'habitation du bassin, jamais un loyer commercial. | S'en servir comme loyer commercial est la faute fondatrice déjà corrigée. |
| CAMS Europe (Open-Meteo) | Copernicus | connectée | CC BY 4.0 | maille large | AQI, PM2.5, NO₂ mesurés (modèle européen). | Trop lisse pour séparer deux rues. À relayer par Airparif. |
| Géorisques | BRGM / MTE | connectée | Licence Ouverte 2.0 | aujourd'hui rayon 1 km | Risques naturels et technologiques. | Le booléen « inondation présent » est vrai partout à Paris. Passer au zonage PPRI. |
| BDCom 2017 / 2020 / 2023 | APUR | ingérée | 2017–2020 personnalisée (non redistribuable) · 2023 ODbL | local à vitrine, identifiant stable | Fleuriste 2017 → fleuriste 2020 → disparu en 2023. Rotation rapportée au tronçon. | Vacance 2023 non calculable. 2017/2020 withheld à l'anonyme. Ne pas comparer les effectifs bruts (84k → 60k). |
| BODACC | DILA | ingérée | Licence Ouverte | adresse, pas le local | Cession de fonds avec prix, procédure collective — signal que ça se libère, des mois avant l'annonce. | Nomme une adresse. 69 % des locaux partagent le numéro → probable, pas établi. |
| Sirene géolocalisé | INSEE | ingérée | Licence Ouverte 2.0 | établissement, pas le local | Corroboration, dates de création/cessation en continu. | Un SIRET n'est pas une vitrine. Un local peut être vide avec SIRET ouvert. |
| PLU linéaires protégés (plub_protcom) | Ville de Paris | planifiée | Open data Paris | linéaire de façade | Sur ce linéaire, le RDC ne peut pas changer de destination. | Informatif, sans valeur réglementaire. Pas encore ingéré. |
| Chantiers de voirie | Ville de Paris | planifiée | Open data Paris | polygone + dates | 40 m d'un chantier perturbant, sept. 2026 → mars 2027. | Fait d'exposition, jamais une prévision d'impact sur le CA. |
| Terrasses et étalages | Ville de Paris | nouvelle | Open data Paris | autorisation géolocalisée | Une terrasse permanente est déjà autorisée sur cette façade. | Autorisation ≠ terrasse installée aujourd'hui. |
| DIA / droit de préemption commercial | Ville de Paris | nouvelle | à vérifier — peut ne pas être ouverte | fonds ou bail, périmètre 5e–6e–7e | Déclaration d'intention d'aliéner : le local est en train de changer de mains. | Si ce n'est pas publié, la piste s'arrête. Ne pas négocier un flux privé. |
| Validations transport IDFM | Île-de-France Mobilités | planifiée | Open data IDFM | station, horaire, depuis 2015 | Entrées comptées à la station la plus proche, profil horaire. | Ce n'est pas le trottoir de la vitrine. |
| Mobiliscope | CNRS | planifiée | ODbL | secteur, heure, âge, CSP | Population réellement présente à 12h vs 20h. | Présence de secteur, pas passage devant la porte. |
| Filosofi carroyé 200 m | INSEE | planifiée | Licence Ouverte | carreau 200 m | Revenu et population sur une maille qui sépare deux rues. | L'IRIS est trop large — ne pas s'en contenter. |
| Base permanente des équipements | INSEE | planifiée | Licence Ouverte | équipement | École, santé, sport recensés administrativement — croisés OSM → corroboré. | Ne pas compter deux fois le même équipement. |
| Marchés alimentaires | Ville de Paris | planifiée | Open data Paris | emprise + jours | Marché deux jours par semaine à 80 m — ça change un commerce de bouche. | Flux périodique, pas un pied de caisse. |
| Comptages vélo permanents | Ville de Paris | planifiée | Open data Paris | tronçon, horaire, multi-années | Rythme horaire mesuré au compteur, honnêtement étiqueté vélo. | Pas des piétons. Mieux que le proxy route, ce n'est pas un flux client. |
| Airparif | Airparif | nouvelle | Open data Airparif | maille Île-de-France | Qualité de l'air mesurée / modelée localement. | Si ça ne sépare pas deux rues, ne pas l'afficher comme discriminant. |
| Bruitparif | Bruitparif | planifiée | Open data air-bruit | maille / façade selon couche | Bruit mesuré ou modelé par l'observatoire, à la place du proxy « routes à 500 m ». | Garder mesuré vs modelé. Pas d'indice unique air-bruit. |
| Mapillary (imagerie de rue) | Mapillary / contributeurs | nouvelle | CC-BY (vérifier millésime et attribution) | façade, cliché daté | Façade au rideau baissé / mention « à louer » sur cliché du 12 mars 2026. | Ce n'est pas vacant=true. Google Street View : ToS hostile, à écarter. |
| Meublés touristiques (changement d'usage) | Ville de Paris | nouvelle | Open data Paris | adresse / autorisation | n autorisations de changement d'usage dans 200 m. | Déclaré ≠ stock Airbnb réel. Suffit à séparer deux rues. |
| Effectifs scolaires | Ministère de l'Éducation | nouvelle | Licence Ouverte | établissement | 1 200 élèves à 400 m. | Rythme scolaire, vacances, pas une demande annuelle lissée. |
| ABF / monuments / SPR | État / Ville | nouvelle | Open data (périmètres MH, SPR) | périmètre | Façade dans le champ de visibilité d'un MH : enseigne et extraction soumises à l'ABF. | Informatif, pas un avis d'architecte. |
| ERP / accessibilité PMR | Registres publics | nouvelle | selon registre | établissement | Capacité ERP, accessibilité déclarée. | Couverture inégale. n/a si silencieux. |
| Registre des copropriétés (ANCOL) | ANCOL / ANAH | nouvelle | selon API | immeuble | Copropriété identifiée ; alerte si immeuble en difficulté connue. | Ne pas inférer un refus d'extraction. Signal, pas un verdict de syndic. |
| Autorisations d'urbanisme (ADS Paris) | Ville de Paris | planifiée | Open data Paris | permis, parcelle | Changement de destination ou permis déjà déposé sur l'immeuble. | Complète Sitadel, ne le remplace pas. Futur, pas présent. |
| Fréquentation équipements | Paris Musées / Ville de Paris | nouvelle | Open data Paris | équipement, année | Fréquentation annuelle du musée / de la piscine à 100 m. | Fréquentation de l'équipement, pas du trottoir. |
| Sitadel | SDES | planifiée | Licence Ouverte | permis | Futurs habitants et futurs concurrents, deux ans devant. | Permis ≠ livraison. Ne pas compter un concurrent qui n'existera pas. |
| DVF | DGFiP | planifiée | Licence Ouverte | mutation, m² | Prix des murs au m². | Ce n'est pas un loyer, ce n'est pas un fonds. |
| GTFS IDFM | Île-de-France Mobilités | planifiée | Open data IDFM | arrêt, horaire | Temps de trajet et fréquences réels. | Accessibilité, pas un flux de clients. |
| Comptes RNE / INPI | INPI | nouvelle | Licence Ouverte 2.0 (comptes non confidentiels) | entreprise | Parmi n commerces du tronçon ayant publié, médiane de CA X. Les autres : confidentialité. | ~45 % confidentiels, biais grandes structures. Jamais une moyenne de rue. Jamais un prévisionnel. |
| Fichiers fonciers / MAJIC | DGFiP / Cerema | partenariat | Accès restreint acteurs publics · EmpCom open trop grossier | local fiscal (nature, surface, étage) | Ce local est commercial au cadastre, surface S, même sans SIRET. | Pas un fetch anonyme. Convention Ville / APUR / Cerema. |
| Portails d'annonces (SeLoger, Appear Here, LeBonCoin) | Privé | refusée | CGU, réutilisation interdite | annonce | — | Aval du marché, fausse absence, ToS. Compass perd dès qu'il concurrence un stock. |
| Telco / cartes bancaires / trajectoires | Privé | refusée | Propriétaire, GDPR lourd | flux | — | Ferait de Compass un vendeur de flux comme les autres. Hors doctrine. |

## IA

L'IA ne doit pas entrer dans src/core/. Le cœur reste déterministe, testé, rejouable. L'IA vit au-dessus. Chaque sortie d'IA est derived ou probable.

| Sujet | Couche | Faire | Ne pas faire |
| --- | --- | --- | --- |
| Entretien du preneur | au-dessus du cœur | Huit questions, puis appels MCP. Checklist oui / non / silencieux, chaque ligne sourcée. Pondération déclarée par le métier. | Un score 0–100 « even with AI ». Un verdict « ouvrez ici ». |
| Auto-évaluation de confiance | au-dessus du cœur | Nommer les trous : silencieux sur le loyer, probable sur le local cédé, établi sur l'activité 2020. | Un paragraphe fluide qui noie les n/a. |
| Résolution d'entité | au-dessus du cœur | Proposer quel local d'une adresse partagée colle à une cession, avec les pièces. Rester probable. | Promouvoir automatiquement à établi. |
| Parse BODACC / INPI | tuyauterie | Extraire activité, surface, prix, nature d'acte. Golden set dans eval/. Échec = n/a. | Un oracle de valorisation ou un CA estimé. |
| Vision Mapillary | tuyauterie | Classes fermées (rideau, pancarte, vitrine). Observation + date + crop. Gate 50 façades. Sous le seuil : silence. | « 87 % de chances que ce soit vide ». |
| explain_score métier-aware | au-dessus du cœur | Réordonner les phrases selon le métier. Les chiffres ne bougent pas. | Des poids appris opaques, un « bon emplacement » universel. |
| Cœur de scoring | interdit dans src/core | Garder Measured<T>, les quatre niveaux, le gate (18 invariants, 24 baselines, 8 chronologies). | Faire écrire scoring.ts par un LLM. RAG sur forums, Google reviews, SeLoger. |

**Interdits IA**

- Score unique 0–100, même « expliqué par l'IA ».
- Loyer ou CA générés.
- RAG sur forums, avis Google, portails d'annonces.
- LLM dans src/core/ ou dans les formules Measured<T>.
- Transformer une fréquence observée en probabilité de réussite.

## Produit

**Couche « ce qui se libère »**

Vue par défaut sans adresse. Cessations, procédures, DIA, rideaux. Légender la couverture de chaque signal pour ne pas recréer la fausse absence.

**Trois modes métier**

Restauration, boutique, artisanat. Même corpus, phrases et alertes différentes. Checklist, pas score.

**Dossier d'une adresse**

PDF/JSON opposable : chaque chiffre, licence, millésime. Un dossier, une adresse. Le MCP le produit déjà.

**Collectivités via MCP, pas via une seconde carte**

Manager de centre-ville, SEM, CCI branchent leur agent. Servir le broker et le preneur dans la même carte a déjà été refusé à raison.

## Hors Paris

Sources nationales déjà branchables :

- SIRENE — établissements, cessations
- BODACC — cessions et procédures
- BAN — géocodage
- OSM — tissu, aménités
- DVF, Sitadel, Filosofi, Géorisques, CAMS

**Ce qui manque.** Un équivalent BDCom : recensement de locaux (vitrines), pas d'entreprises (SIRET).

Même src/core/. On substitue BDCom par un observatoire local (CCI, Codata, inventaire communal) ou, à défaut, fichiers fonciers + SIRENE + BODACC. On abaisse les niveaux de confiance. Un Compass Lyon « établi » sur de l'OSM ment. Nommer le produit plus mince s'il n'y a pas de recensement de locaux.

## Ne pas faire

- Couverture France entière dans la même carte.
- Partenariat Appear Here / SeLoger / LeBonCoin.
- Telco, cartes bancaires, trajectoires.
- Jumeau numérique de chaque rue (trop de synthèse, trop peu de phrase).
- Verdict automatisé « ouvrez ici ».
- LLM dans le cœur de scoring.
- Afficher une date de fraîcheur sans cron réel.
- Inférer la vacance 2023 par absence au recensement.
- Un score unique, même par métier.
- Transformer 72 % observés en 72 % de chances.

## Ordre de bataille

```
Q3 2026  →  deploy corpus + fiche/timeline UI + cron + PLU + provenance par champ
Q3 2026  →  chantiers + terrasses + SIRENE×BDCom (survie)
Q4 2026  →  agent d'entretien MCP (8 questions → checklist sourcée)
Q4 2026  →  Mapillary : rideau / « à louer », 50 façades gold, sinon silence
Q4 2026  →  meublés + ABF/SPR + PPRI zonage + vue « ce qui se libère »
2027     →  DIA si open ; fichiers fonciers si partenariat public
         →  étude chantiers×BDCom (le droit d'afficher une association)
         →  kit ville (swap BDCom, confiance abaissée)
```

## Tickets GitHub

**Les 43 issues sont ouvertes** sur [IvandeMurard/paris-compass](https://github.com/IvandeMurard/paris-compass/issues) le 23 aout 2026, et les 13 labels crees. Le corps de chaque issue vit aussi dans [`tickets/`](./tickets/) : les deux doivent bouger ensemble, ou aucun des deux.

> Les versions anterieures de cette page portaient 43 liens *creer une issue* preremplis. Ils ont ete retires : les issues existent, les rouvrir en creerait des doublons.

### Epics

| Issue | Vague |
| --- | --- |
| #41 | vague 0 |
| #42 | vague 1 |
| #43 | vague 2 |
| #44 | vague 3 |
| #45 | vague 4 |
| #46 | vague 5 |
| #47 | vague 6 |
| #48 | vague 7 |

### Tickets

| Issue | ID | Prio | Action |
| --- | --- | --- | --- |
| #6 | `w0-cron` | P0 | Ingestion planifiée + date de fraîcheur par source |
| #7 | `w0-deploy` | P0 | Déployer le corpus sur la base hébergée — **fait le 24 août** |
| #8 | `w0-fiche` | P0 | Fiche locale + timeline dans l'interface |
| #51 | `w0-history` | P0 | `compass_premise_history` : une retenue de licence rendue comme un fait |
| #9 | `w0-plu` | P0 | Ingérer le PLU plub_protcom |
| #10 | `w0-provenance` | P0 | Provenance par champ, pas un Origin unique OSM |
| #11 | `w1-chantiers` | P0 | Chantiers de voirie (fait d'exposition) |
| #12 | `w1-dia` | P1 | Droit de préemption / DIA — vérifier l'open data |
| #49 | `w1-historique` | P0 | bdcom20032020 : porter l'historique de six à vingt ans |
| #13 | `w1-ppri` | P1 | PPRI en zonage, pas en booléen |
| #14 | `w1-survie` | P0 | Courbes de survie SIRENE × BDCom |
| #15 | `w1-terrasses` | P0 | Terrasses et étalages autorisés |
| #16 | `w2-air-bruit` | P1 | Airparif + Bruitparif à la place des proxys |
| #17 | `w2-bpe-marches-velo` | P2 | BPE, marchés alimentaires, comptages vélo |
| #18 | `w2-filosofi` | P1 | Filosofi carroyé 200 m |
| #19 | `w2-idfm` | P1 | Validations IDFM horaires |
| #20 | `w2-mobiliscope` | P1 | Mobiliscope — présence heure par heure |
| #21 | `w3-mapillary` | P0 | Mapillary : rideau, pancarte, vitrine — observation datée |
| #22 | `w3-osm-notes` | P2 | Notes OSM et fraîcheur du POI |
| #23 | `w4-abf` | P1 | ABF, monuments, SPR — façade contrainte |
| #24 | `w4-ecoles` | P2 | Effectifs scolaires |
| #25 | `w4-erp-copro-ads` | P2 | ERP / PMR, copropriétés, permis ADS |
| #26 | `w4-frequentation` | P2 | Fréquentation musées, piscines, bibliothèques |
| #27 | `w4-meubles` | P1 | Meublés touristiques déclarés |
| #28 | `w5-confiance-agent` | P1 | Auto-évaluation de confiance de l'agent |
| #29 | `w5-entity` | P1 | Résolution d'entité BODACC × BDCom |
| #30 | `w5-entretien` | P1 | Agent d'entretien du preneur (8 questions → checklist) |
| #31 | `w5-explain-metier` | P2 | explain_score métier-aware |
| #32 | `w5-parse` | P2 | Extracteur BODACC / INPI (tuyauterie) |
| #50 | `w6-analyse` | P1 | Les analyses déjà permises par le schéma |
| #33 | `w6-dossier` | P1 | Dossier exportable d'une adresse |
| #34 | `w6-liberations` | P1 | Vue par défaut « ce qui se libère » |
| #35 | `w6-mcp` | P1 | Publier le MCP + llms.txt |
| #36 | `w6-modes` | P1 | Trois modes métier |
| #37 | `w7-etude-chantiers` | P1 | Étude rétrospective chantiers × BDCom |
| #38 | `w7-foncier` | P1 | Fichiers fonciers / MAJIC — partenariat public |
| #39 | `w7-inpi` | P2 | Comptes INPI comme échantillon, jamais comme moyenne de rue |
| #40 | `w7-kit` | P1 | Kit ville — même cœur, BDCom substituable, confiance abaissée |
