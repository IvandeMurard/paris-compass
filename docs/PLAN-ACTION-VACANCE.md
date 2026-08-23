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
| « rejouer les 21 migrations » | 25 dans `supabase/migrations/`, 24 au ledger distant | `ls supabase/migrations` · `docs/REPRISE.md` |
| « le gate (10 invariants…) » | 15 — `I1` à `I15` | `eval/invariants.sql` |
| Établi / probable 51,6 % / 36,5 % | 51,4 % / 36,7 % | `eval/baselines/ingestion.json`, gel du 17 août |
| `w0-deploy` présenté comme entièrement à faire | Chargement fait le 15 août ; reste le retrait à l'anonyme | `docs/REPRISE.md`, « La suite, par ordre » n° 1 et 8 |

Deux diagnostics du document ont en revanche été **vérifiés exacts** :

- `w0-provenance` — `scoreLocation(point, index, origin)` prend bien un `Origin` unique pour
  toutes les métriques (`src/core/scoring.ts`), et `OSM_ORIGIN` est le seul constructeur exporté
  de `src/core/provenance.ts`. La provenance par champ est bien à écrire.
- `w0-fiche` — aucune occurrence de `timeline` ni de `trace_premise` dans `src/`. Le MCP expose
  `compass_address_timeline` depuis le 17 août, le navigateur non.

Les autres chiffres du corpus sont conformes aux baselines : 85 418 locaux, 228 275 relevés,
vacance 2017 à 9,3 %, 2020 à 10,5 %, médiane des fonds à 160 868 €.

Les mêmes corrections ont été portées dans `docs/tickets/` — `w0-deploy.md` et `w5-entity.md`
répétaient les chiffres périmés. L'index `00-INDEX.md` du pack n'a pas été repris : il dupliquait
à l'identique les 43 liens de la section « Tickets GitHub » ci-dessous.

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
| `w0-fiche` | 0 | Q3 2026 | Fiche locale + timeline dans l'interface | Un local des Halles affiche 2017 → 2020 → 2023 (ou withheld) + événements BODACC, sans coalesce sur le libellé. |
| `w0-cron` | 0 | Q3 2026 | Ingestion planifiée + date de fraîcheur par source | compass_* expose ingested_at pour BDCom, géographie, BODACC et SIRENE. Un cron a tourné au moins une fois sans intervention manuelle. |
| `w0-plu` | 0 | Q3 2026 | Ingérer le PLU plub_protcom | Deux adresses de la même rue, l'une sur linéaire protégé, l'autre non, reçoivent deux verdicts distincts. |
| `w0-provenance` | 0 | Q3 2026 | Provenance par champ, pas un Origin unique OSM | explain_score sur un local BDCom cite APUR, pas OSM, pour l'activité ; OSM reste sur les aménités. |
| `w1-chantiers` | 1 | Q3 2026 | Chantiers de voirie (fait d'exposition) | La fiche d'un local à 40 m d'un polygone perturbant affiche le chantier ; un voisin hors polygone, non. |
| `w1-survie` | 1 | Q3 2026 | Courbes de survie SIRENE × BDCom | Un café aux Halles et un café au Mail affichent deux survies, chacune avec n et millésimes, rapportées au métier pas à Paris entier. |
| `w1-terrasses` | 1 | Q3 2026 | Terrasses et étalages autorisés | La fiche restauration affiche oui/non/inconnu terrasse, avec le type (permanente, estivale) et la source. |
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
- **Comment.** Poser `20260817000001_premises_within_withholding.sql` sur le distant — le ledger distant est à 24 migrations, `supabase/migrations/` en compte 25 — puis rejouer la porte en anonyme. Le reste (PostGIS, BDCom ×3, BODACC, SIRENE, géographie) est déjà en place.
- **Doctrine.** Rien n'est annoncé comme live s'il n'est pas interrogeable par un visiteur anonyme.
- **Fait quand.** Un appel anon PostgREST sur un point intra-muros renvoie des locaux 2023, et withheld (pas zéro) pour 2017/2020.

#### w0-fiche — Fiche locale + timeline dans l'interface

- Priorité **P0** · vague 0 · Q3 2026
- Dépend de : `w0-deploy`
- **Pourquoi.** Le MCP a trace_premise ; le navigateur non. L'historique du local est le produit, pas un accessoire.
- **Comment.** Brancher compass_address_timeline sur la fiche. Chaque ligne : source, date, niveau, justification. observed=false → « non observé », jamais vacant ni « plus un commerce ».
- **Doctrine.** L'historique justifie le taux de rotation rapporté à la rue ; il ne le remplace pas.
- **Fait quand.** Un local des Halles affiche 2017 → 2020 → 2023 (ou withheld) + événements BODACC, sans coalesce sur le libellé.

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
| Cœur de scoring | interdit dans src/core | Garder Measured<T>, les quatre niveaux, le gate (15 invariants, 24 baselines, 8 chronologies). | Faire écrire scoring.ts par un LLM. RAG sur forums, Google reviews, SeLoger. |

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

# Tickets — plan d'action vacance

À ouvrir sur [IvandeMurard/paris-compass](https://github.com/IvandeMurard/paris-compass/issues).
Doc parente : [`../PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md).

Créé le 23 août 2026. 8 épics (vagues) + 35 tickets.

## Labels à créer une fois

| Label | Couleur | Usage |
| --- | --- | --- |
| `plan-action` | `#0F5C56` | Backlog du plan d'action vacance |
| `epic` | `#1C1917` | Vague / enveloppe |
| `P0` | `#8F2D2D` | Bloque le produit |
| `P1` | `#0F5C56` | Change une décision |
| `P2` | `#8A8178` | Appoint |
| `vague-0` | `#6B635B` | Socle — ce qui débloque le produit |
| `vague-1` | `#6B635B` | Décision cette semaine |
| `vague-2` | `#6B635B` | Flux et présence mesurés |
| `vague-3` | `#6B635B` | Voir la vitrine maintenant |
| `vague-4` | `#6B635B` | Ce qui habite la rue |
| `vague-5` | `#6B635B` | IA au-dessus du cœur |
| `vague-6` | `#6B635B` | Produit — l'interprétation à l'écran |
| `vague-7` | `#6B635B` | Partenariats et kit hors Paris |

## Épics — une issue par vague (recommandé d'abord)

- [ ] [[épic] Vague 0 — Socle — ce qui débloque le produit](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+0+%E2%80%94+Socle+%E2%80%94+ce+qui+d%C3%A9bloque+le+produit&body=**Vague+0**+%C2%B7+Q3+2026%0A%0ASans+%C3%A7a%2C+le+reste+ne+se+voit+pas.+D%C3%A9ployer+le+corpus%2C+montrer+la+timeline%2C+dire+la+fra%C3%AEcheur%2C+ing%C3%A9rer+le+PLU%2C+scinder+la+provenance.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w0-deploy%60+**P0**+%E2%80%94+D%C3%A9ployer+le+corpus+sur+la+base+h%C3%A9berg%C3%A9e%0A-+%5B+%5D+%60w0-fiche%60+**P0**+%E2%80%94+Fiche+locale+%2B+timeline+dans+l%27interface%0A-+%5B+%5D+%60w0-cron%60+**P0**+%E2%80%94+Ingestion+planifi%C3%A9e+%2B+date+de+fra%C3%AEcheur+par+source%0A-+%5B+%5D+%60w0-plu%60+**P0**+%E2%80%94+Ing%C3%A9rer+le+PLU+plub_protcom%0A-+%5B+%5D+%60w0-provenance%60+**P0**+%E2%80%94+Provenance+par+champ%2C+pas+un+Origin+unique+OSM%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-0)
- [ ] [[épic] Vague 1 — Décision cette semaine](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+1+%E2%80%94+D%C3%A9cision+cette+semaine&body=**Vague+1**+%C2%B7+Q3+2026%0A%0ASources+d%C3%A9j%C3%A0+identifi%C3%A9es+dans+PLAN.md%2C+r%C3%A9ordonn%C3%A9es+%3A+chantiers%2C+survie+SIRENE%C3%97BDCom%2C+terrasses%2C+PPRI+zon%C3%A9%2C+DIA+si+ouverte.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w1-chantiers%60+**P0**+%E2%80%94+Chantiers+de+voirie+%28fait+d%27exposition%29%0A-+%5B+%5D+%60w1-survie%60+**P0**+%E2%80%94+Courbes+de+survie+SIRENE+%C3%97+BDCom%0A-+%5B+%5D+%60w1-terrasses%60+**P0**+%E2%80%94+Terrasses+et+%C3%A9talages+autoris%C3%A9s%0A-+%5B+%5D+%60w1-ppri%60+**P1**+%E2%80%94+PPRI+en+zonage%2C+pas+en+bool%C3%A9en%0A-+%5B+%5D+%60w1-dia%60+**P1**+%E2%80%94+Droit+de+pr%C3%A9emption+%2F+DIA+%E2%80%94+v%C3%A9rifier+l%27open+data%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-1)
- [ ] [[épic] Vague 2 — Flux et présence mesurés](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+2+%E2%80%94+Flux+et+pr%C3%A9sence+mesur%C3%A9s&body=**Vague+2**+%C2%B7+Q4+2026%0A%0ARemplacer+les+proxys+%28pi%C3%A9ton%2C+bruit%2C+air%29+par+des+mesures+qui+s%C3%A9parent+deux+locaux+de+la+m%C3%AAme+rue.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w2-idfm%60+**P1**+%E2%80%94+Validations+IDFM+horaires%0A-+%5B+%5D+%60w2-mobiliscope%60+**P1**+%E2%80%94+Mobiliscope+%E2%80%94+pr%C3%A9sence+heure+par+heure%0A-+%5B+%5D+%60w2-filosofi%60+**P1**+%E2%80%94+Filosofi+carroy%C3%A9+200+m%0A-+%5B+%5D+%60w2-bpe-marches-velo%60+**P2**+%E2%80%94+BPE%2C+march%C3%A9s+alimentaires%2C+comptages+v%C3%A9lo%0A-+%5B+%5D+%60w2-air-bruit%60+**P1**+%E2%80%94+Airparif+%2B+Bruitparif+%C3%A0+la+place+des+proxys%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-2)
- [ ] [[épic] Vague 3 — Voir la vitrine maintenant](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+3+%E2%80%94+Voir+la+vitrine+maintenant&body=**Vague+3**+%C2%B7+Q4+2026%0A%0ACombler+le+trou+2023%E2%80%932026.+BDCom+2023+n%27a+plus+les+vacants.+Observation+visuelle+dat%C3%A9e%2C+jamais+un+taux+invent%C3%A9.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w3-mapillary%60+**P0**+%E2%80%94+Mapillary+%3A+rideau%2C+pancarte%2C+vitrine+%E2%80%94+observation+dat%C3%A9e%0A-+%5B+%5D+%60w3-osm-notes%60+**P2**+%E2%80%94+Notes+OSM+et+fra%C3%AEcheur+du+POI%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-3)
- [ ] [[épic] Vague 4 — Ce qui habite la rue](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+4+%E2%80%94+Ce+qui+habite+la+rue&body=**Vague+4**+%C2%B7+Q4+2026%0A%0AMeubl%C3%A9s%2C+%C3%A9coles%2C+ABF%2C+ERP%2C+copro+%3A+le+preneur+se+trompe+souvent+sur+qui+passe+et+sur+ce+que+le+b%C3%A2timent+autorise.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w4-meubles%60+**P1**+%E2%80%94+Meubl%C3%A9s+touristiques+d%C3%A9clar%C3%A9s%0A-+%5B+%5D+%60w4-ecoles%60+**P2**+%E2%80%94+Effectifs+scolaires%0A-+%5B+%5D+%60w4-abf%60+**P1**+%E2%80%94+ABF%2C+monuments%2C+SPR+%E2%80%94+fa%C3%A7ade+contrainte%0A-+%5B+%5D+%60w4-erp-copro-ads%60+**P2**+%E2%80%94+ERP+%2F+PMR%2C+copropri%C3%A9t%C3%A9s%2C+permis+ADS%0A-+%5B+%5D+%60w4-frequentation%60+**P2**+%E2%80%94+Fr%C3%A9quentation+mus%C3%A9es%2C+piscines%2C+biblioth%C3%A8ques%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-4)
- [ ] [[épic] Vague 5 — IA au-dessus du cœur](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+5+%E2%80%94+IA+au-dessus+du+c%C5%93ur&body=**Vague+5**+%C2%B7+Q4+2026%0A%0AL%27IA+n%27entre+pas+dans+src%2Fcore%2F.+Elle+interroge%2C+apparie%2C+parse%2C+explique.+Chaque+sortie+est+derived+ou+probable.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w5-entretien%60+**P1**+%E2%80%94+Agent+d%27entretien+du+preneur+%288+questions+%E2%86%92+checklist%29%0A-+%5B+%5D+%60w5-confiance-agent%60+**P1**+%E2%80%94+Auto-%C3%A9valuation+de+confiance+de+l%27agent%0A-+%5B+%5D+%60w5-entity%60+**P1**+%E2%80%94+R%C3%A9solution+d%27entit%C3%A9+BODACC+%C3%97+BDCom%0A-+%5B+%5D+%60w5-parse%60+**P2**+%E2%80%94+Extracteur+BODACC+%2F+INPI+%28tuyauterie%29%0A-+%5B+%5D+%60w5-explain-metier%60+**P2**+%E2%80%94+explain_score+m%C3%A9tier-aware%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-5)
- [ ] [[épic] Vague 6 — Produit — l'interprétation à l'écran](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+6+%E2%80%94+Produit+%E2%80%94+l%27interpr%C3%A9tation+%C3%A0+l%27%C3%A9cran&body=**Vague+6**+%C2%B7+Q4+2026%0A%0ACouche+%C2%AB+ce+qui+se+lib%C3%A8re+%C2%BB%2C+modes+m%C3%A9tier%2C+dossier+d%27une+adresse%2C+MCP+publi%C3%A9.+Compass+vend+des+phrases%2C+pas+des+couches.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w6-liberations%60+**P1**+%E2%80%94+Vue+par+d%C3%A9faut+%C2%AB+ce+qui+se+lib%C3%A8re+%C2%BB%0A-+%5B+%5D+%60w6-modes%60+**P1**+%E2%80%94+Trois+modes+m%C3%A9tier%0A-+%5B+%5D+%60w6-dossier%60+**P1**+%E2%80%94+Dossier+exportable+d%27une+adresse%0A-+%5B+%5D+%60w6-mcp%60+**P1**+%E2%80%94+Publier+le+MCP+%2B+llms.txt%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-6)
- [ ] [[épic] Vague 7 — Partenariats et kit hors Paris](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5B%C3%A9pic%5D+Vague+7+%E2%80%94+Partenariats+et+kit+hors+Paris&body=**Vague+7**+%C2%B7+2027%0A%0ADIA+si+open%2C+fichiers+fonciers+si+acteur+public%2C+%C3%A9tude+chantiers%C3%97BDCom%2C+kit+ville+avec+confiance+abaiss%C3%A9e.+Pas+de+carte+nationale.%0A%0A%23%23+Tickets%0A-+%5B+%5D+%60w7-foncier%60+**P1**+%E2%80%94+Fichiers+fonciers+%2F+MAJIC+%E2%80%94+partenariat+public%0A-+%5B+%5D+%60w7-inpi%60+**P2**+%E2%80%94+Comptes+INPI+comme+%C3%A9chantillon%2C+jamais+comme+moyenne+de+rue%0A-+%5B+%5D+%60w7-etude-chantiers%60+**P1**+%E2%80%94+%C3%89tude+r%C3%A9trospective+chantiers+%C3%97+BDCom%0A-+%5B+%5D+%60w7-kit%60+**P1**+%E2%80%94+Kit+ville+%E2%80%94+m%C3%AAme+c%C5%93ur%2C+BDCom+substituable%2C+confiance+abaiss%C3%A9e%0A%0A%23%23+Fait+quand%0ATous+les+tickets+de+la+vague+sont+clos%2C+ou+explicitement+report%C3%A9s+avec+une+note+dans+%60docs%2FPLAN-ACTION-VACANCE.md%60.&labels=plan-action%2Cepic%2Cvague-7)

## Tickets atomiques

- [ ] [[P0] w0-deploy — Déployer le corpus sur la base hébergée](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w0-deploy+%E2%80%94+D%C3%A9ployer+le+corpus+sur+la+base+h%C3%A9berg%C3%A9e&body=**ID**+%60w0-deploy%60+%C2%B7+**vague+0**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%E2%80%94%0A**Sources**+%60bdcom%60%2C+%60bodacc%60%2C+%60sirene%60%0A%0A%23%23+Pourquoi%0A85+418+locaux%2C+228+275+observations+et+la+gate+verte+existent+en+local.+La+carte+live+n%27a+pas+encore+le+diff%C3%A9renciateur.%0A%0A%23%23+Comment%0AActiver+PostGIS+sur+l%27instance+h%C3%A9berg%C3%A9e%2C+rejouer+les+21+migrations%2C+charger+BDCom+%C3%973%2C+BODACC%2C+SIRENE%2C+g%C3%A9ographie.+Contr%C3%B4le+de+compl%C3%A9tude+avant+bascule.%0A%0A%23%23+Doctrine%0ARien+n%27est+annonc%C3%A9+comme+live+s%27il+n%27est+pas+interrogeable+par+un+visiteur+anonyme.%0A%0A%23%23+Fait+quand%0AUn+appel+anon+PostgREST+sur+un+point+intra-muros+renvoie+des+locaux+2023%2C+et+withheld+%28pas+z%C3%A9ro%29+pour+2017%2F2020.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-0)
- [ ] [[P0] w0-fiche — Fiche locale + timeline dans l'interface](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w0-fiche+%E2%80%94+Fiche+locale+%2B+timeline+dans+l%27interface&body=**ID**+%60w0-fiche%60+%C2%B7+**vague+0**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-deploy%60%0A**Sources**+%60bdcom%60%2C+%60bodacc%60%0A%0A%23%23+Pourquoi%0ALe+MCP+a+trace_premise+%3B+le+navigateur+non.+L%27historique+du+local+est+le+produit%2C+pas+un+accessoire.%0A%0A%23%23+Comment%0ABrancher+compass_address_timeline+sur+la+fiche.+Chaque+ligne+%3A+source%2C+date%2C+niveau%2C+justification.+observed%3Dfalse+%E2%86%92+%C2%AB+non+observ%C3%A9+%C2%BB%2C+jamais+vacant+ni+%C2%AB+plus+un+commerce+%C2%BB.%0A%0A%23%23+Doctrine%0AL%27historique+justifie+le+taux+de+rotation+rapport%C3%A9+%C3%A0+la+rue+%3B+il+ne+le+remplace+pas.%0A%0A%23%23+Fait+quand%0AUn+local+des+Halles+affiche+2017+%E2%86%92+2020+%E2%86%92+2023+%28ou+withheld%29+%2B+%C3%A9v%C3%A9nements+BODACC%2C+sans+coalesce+sur+le+libell%C3%A9.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-0)
- [ ] [[P0] w0-cron — Ingestion planifiée + date de fraîcheur par source](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w0-cron+%E2%80%94+Ingestion+planifi%C3%A9e+%2B+date+de+fra%C3%AEcheur+par+source&body=**ID**+%60w0-cron%60+%C2%B7+**vague+0**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-deploy%60%0A**Sources**+%60bdcom%60%2C+%60bodacc%60%2C+%60sirene%60%0A%0A%23%23+Pourquoi%0ALes+scripts+sont+idempotents+mais+rien+ne+les+rejoue.+Une+date+affich%C3%A9e+sans+rythme+r%C3%A9el+est+le+loyer+fabriqu%C3%A9+sous+une+autre+forme.%0A%0A%23%23+Comment%0AJob+%C3%A0+privil%C3%A8ges+%C3%A9lev%C3%A9s+%28GitHub+Actions+ou+%C3%A9quivalent+serveur%29%2C+jamais+la+cl%C3%A9+anon.+Table+g%C3%A9n%C3%A9rique+%28source%2C+derni%C3%A8re+ex%C3%A9cution+ok%2C+n+lignes%29.+Cadences+distinctes+%3A+SIRENE+mensuel%2C+BODACC+continu%2C+BDCom+triennal%2C+g%C3%A9ographie+rare.%0A%0A%23%23+Doctrine%0AAfficher+une+date+n%27est+honn%C3%AAte+que+si+le+rafra%C3%AEchissement+est+r%C3%A9el+ou+d%C3%A9clar%C3%A9.%0A%0A%23%23+Fait+quand%0Acompass_*+expose+ingested_at+pour+BDCom%2C+g%C3%A9ographie%2C+BODACC+et+SIRENE.+Un+cron+a+tourn%C3%A9+au+moins+une+fois+sans+intervention+manuelle.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-0)
- [ ] [[P0] w0-plu — Ingérer le PLU plub_protcom](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w0-plu+%E2%80%94+Ing%C3%A9rer+le+PLU+plub_protcom&body=**ID**+%60w0-plu%60+%C2%B7+**vague+0**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-deploy%60%0A**Sources**+%60plu%60%0A%0A%23%23+Pourquoi%0AIdentifi%C3%A9%2C+pas+encore+charg%C3%A9.+Sur+un+lin%C3%A9aire+prot%C3%A9g%C3%A9%2C+le+rez-de-chauss%C3%A9e+ne+peut+pas+changer+de+destination+%E2%80%94+premi%C3%A8re+chose+qui+tue+un+projet.%0A%0A%23%23+Comment%0AJeu+opendata.paris.fr%2C+version+vot%C3%A9e+20+novembre+2024.+Bandeau+d%27alerte+sur+la+fiche.+Informatif%2C+sans+valeur+r%C3%A9glementaire%2C+renvoi+au+Portail+des+R%C3%A8gles+d%27Urbanisme.%0A%0A%23%23+Doctrine%0AContrainte+binaire+cartographi%C3%A9e%2C+pas+un+score+d%27urbanisme.%0A%0A%23%23+Fait+quand%0ADeux+adresses+de+la+m%C3%AAme+rue%2C+l%27une+sur+lin%C3%A9aire+prot%C3%A9g%C3%A9%2C+l%27autre+non%2C+re%C3%A7oivent+deux+verdicts+distincts.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-0)
- [ ] [[P0] w0-provenance — Provenance par champ, pas un Origin unique OSM](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w0-provenance+%E2%80%94+Provenance+par+champ%2C+pas+un+Origin+unique+OSM&body=**ID**+%60w0-provenance%60+%C2%B7+**vague+0**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%E2%80%94%0A**Sources**+%60bdcom%60%2C+%60osm%60%0A%0A%23%23+Pourquoi%0ALe+MCP+l%27avoue+%3A+tout+est+%C3%A9tiquet%C3%A9+Overpass%2C+m%C3%AAme+quand+la+couche+vient+de+BDCom+via+Supabase.%0A%0A%23%23+Comment%0AChanger+la+signature+de+scoreLocation+pour+un+Origin+par+m%C3%A9trique.+Front+et+MCP+bougent+ensemble+%E2%80%94+c%27est+le+c%C5%93ur+partag%C3%A9.%0A%0A%23%23+Doctrine%0AChaque+figure+porte+source%2C+licence%2C+mill%C3%A9sime%2C+m%C3%A9thode%2C+r%C3%A9serve.%0A%0A%23%23+Fait+quand%0Aexplain_score+sur+un+local+BDCom+cite+APUR%2C+pas+OSM%2C+pour+l%27activit%C3%A9+%3B+OSM+reste+sur+les+am%C3%A9nit%C3%A9s.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-0)
- [ ] [[P0] w1-chantiers — Chantiers de voirie (fait d'exposition)](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w1-chantiers+%E2%80%94+Chantiers+de+voirie+%28fait+d%27exposition%29&body=**ID**+%60w1-chantiers%60+%C2%B7+**vague+1**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60chantiers%60%0A%0A%23%23+Pourquoi%0AUn+restaurateur+signe+ou+non+sur+%C2%AB+40+m+d%27un+chantier+perturbant%2C+sept.+2026+%E2%86%92+mars+2027+%C2%BB.%0A%0A%23%23+Comment%0Aopendata.paris.fr+%3A+historiques+2019%E2%80%932023+%2B+chantiers-perturbants+quotidien%2C+polygones.+Distance+au+local%2C+dates+d%C3%A9clar%C3%A9es.+measured+%E2%80%94+acte+administratif%2C+pas+un+mod%C3%A8le.%0A%0A%23%23+Doctrine%0AJamais+une+pr%C3%A9vision+d%27impact.+La+phrase%2C+dat%C3%A9e%2C+sourc%C3%A9e.+L%27association+chantier%E2%86%92disparition+attend+l%27%C3%A9tude+5.5.%0A%0A%23%23+Fait+quand%0ALa+fiche+d%27un+local+%C3%A0+40+m+d%27un+polygone+perturbant+affiche+le+chantier+%3B+un+voisin+hors+polygone%2C+non.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-1)
- [ ] [[P0] w1-survie — Courbes de survie SIRENE × BDCom](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w1-survie+%E2%80%94+Courbes+de+survie+SIRENE+%C3%97+BDCom&body=**ID**+%60w1-survie%60+%C2%B7+**vague+1**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60bdcom%60%2C+%60sirene%60%0A%0A%23%23+Pourquoi%0ATrois+photos+%282017%2F2020%2F2023%29+deviennent+un+rythme+continu.+Comble+les+ann%C3%A9es+aveugles+et+2024%E2%80%932026.%0A%0A%23%23+Comment%0AAucune+source+nouvelle.+Jointure+au+niveau+d%C3%A9fendable+%3A+un+SIRET+n%27est+pas+un+local.+Non+rattachable+%3D+probable.+Taux+par+m%C3%A9tier+%C3%97+tron%C3%A7on%2C+effectif+nomm%C3%A9%2C+p%C3%A9riode+nomm%C3%A9e.%0A%0A%23%23+Doctrine%0A%C2%AB+72+%25+des+caf%C3%A9s+tiennent+six+ans+%C2%BB+est+une+observation.+%C2%AB+Votre+caf%C3%A9+a+72+%25+de+chances+%C2%BB+est+un+pr%C3%A9visionnel+%E2%80%94+interdit.%0A%0A%23%23+Fait+quand%0AUn+caf%C3%A9+aux+Halles+et+un+caf%C3%A9+au+Mail+affichent+deux+survies%2C+chacune+avec+n+et+mill%C3%A9simes%2C+rapport%C3%A9es+au+m%C3%A9tier+pas+%C3%A0+Paris+entier.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-1)
- [ ] [[P0] w1-terrasses — Terrasses et étalages autorisés](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w1-terrasses+%E2%80%94+Terrasses+et+%C3%A9talages+autoris%C3%A9s&body=**ID**+%60w1-terrasses%60+%C2%B7+**vague+1**+%C2%B7+**Q3+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60terrasses%60%0A%0A%23%23+Pourquoi%0APour+un+caf%C3%A9%2C+c%27est+binaire+%3A+une+terrasse+est-elle+d%C3%A9j%C3%A0+autoris%C3%A9e+sur+cette+fa%C3%A7ade+%3F%0A%0A%23%23+Comment%0Aopendata.paris.fr%2Fterrasses-autorisations%2C+g%C3%A9olocalis%C3%A9.+Rattacher+%C3%A0+l%27adresse+%2F+au+lin%C3%A9aire.+Signal+de+vitalit%C3%A9+et+r%C3%A9ponse+d%27exploitation.%0A%0A%23%23+Doctrine%0AFait+administratif%2C+measured.+Ne+pas+en+d%C3%A9duire+un+CA+terrasse.%0A%0A%23%23+Fait+quand%0ALa+fiche+restauration+affiche+oui%2Fnon%2Finconnu+terrasse%2C+avec+le+type+%28permanente%2C+estivale%29+et+la+source.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-1)
- [ ] [[P1] w1-ppri — PPRI en zonage, pas en booléen](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w1-ppri+%E2%80%94+PPRI+en+zonage%2C+pas+en+bool%C3%A9en&body=**ID**+%60w1-ppri%60+%C2%B7+**vague+1**+%C2%B7+**Q3+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60georisques%60%0A%0A%23%23+Pourquoi%0A%C2%AB+Inondation+%3A+pr%C3%A9sent+dans+1+km+%C2%BB+est+vrai+presque+partout+%C3%A0+Paris%2C+donc+muet.%0A%0A%23%23+Comment%0ATrois+couches+c%C3%B4te+%C3%A0+c%C3%B4te+%3A+zone+PPRI+transcrite+%3B+ce+que+le+r%C3%A8glement+impose+au+RDC+%28informatif%29+%3B+implication+m%C3%A9tier+en+derived+%28cave+vs+pr%C3%AAt-%C3%A0-porter%29.+Remont%C3%A9e+de+nappe+BRGM+%C3%A0+part.+CatNat+commune+%C3%A9cart%C3%A9e+%28uniforme%29.%0A%0A%23%23+Doctrine%0ATranscrire+les+classes+du+r%C3%A9gulateur.+Ne+pas+fondre+PPRI+%2B+nappe+%2B+CatNat+en+un+%C2%AB+risque+3%2F4+%C2%BB.%0A%0A%23%23+Fait+quand%0AUn+local+berge+%28zone+bleue%29+et+un+local+du+20e+%28hors+zone%29+ne+re%C3%A7oivent+plus+le+m%C3%AAme+verdict.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-1)
- [ ] [[P1] w1-dia — Droit de préemption / DIA — vérifier l'open data](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w1-dia+%E2%80%94+Droit+de+pr%C3%A9emption+%2F+DIA+%E2%80%94+v%C3%A9rifier+l%27open+data&body=**ID**+%60w1-dia%60+%C2%B7+**vague+1**+%C2%B7+**Q3+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60dia%60%0A%0A%23%23+Pourquoi%0A%C3%89quivalent+ouvert+et+amont+de+l%27annonce%2C+sur+5e%2C+6e+et+partie+du+7e+depuis+ao%C3%BBt+2024.%0A%0A%23%23+Comment%0AV%C3%A9rifier+si+les+d%C3%A9clarations+d%27intention+d%27ali%C3%A9ner+fonds%2Fbaux+sont+publi%C3%A9es.+Si+oui%2C+les+ing%C3%A9rer+comme+signal+%C2%AB+place+qui+se+lib%C3%A8re+%C2%BB.+Si+non%2C+l%27%C3%A9crire+et+s%27arr%C3%AAter.+Ne+pas+n%C3%A9gocier+un+flux+priv%C3%A9.%0A%0A%23%23+Doctrine%0ASi+ce+n%27est+pas+public%2C+la+piste+s%27arr%C3%AAte.+Compass+ne+devient+pas+un+greffe+parall%C3%A8le.%0A%0A%23%23+Fait+quand%0ASoit+une+couche+DIA+sourc%C3%A9e+sur+le+p%C3%A9rim%C3%A8tre%2C+soit+une+note+publique+%C2%AB+non+publi%C3%A9%2C+piste+close+%C2%BB.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-1)
- [ ] [[P1] w2-idfm — Validations IDFM horaires](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w2-idfm+%E2%80%94+Validations+IDFM+horaires&body=**ID**+%60w2-idfm%60+%C2%B7+**vague+2**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60idfm%60%0A%0A%23%23+Pourquoi%0ARemplace+le+proxy+pi%C3%A9ton+par+des+entr%C3%A9es+de+station+compt%C3%A9es+depuis+2015.%0A%0A%23%23+Comment%0AProfil+horaire+de+la+station+la+plus+proche%2C+mill%C3%A9sime%2C+r%C3%A9serve+%3A+ce+n%27est+pas+le+trottoir+de+la+vitrine.+Distingue+un+p%C3%B4le+de+bureau+d%27un+p%C3%B4le+r%C3%A9sidentiel.%0A%0A%23%23+Doctrine%0AMesur%C3%A9+%C3%A0+la+station%2C+pas+%C3%A0+la+porte.+Le+label+le+dit.%0A%0A%23%23+Fait+quand%0ADeux+locaux+%C3%A0+800+m+de+deux+stations+au+profil+midi+vs+soir+re%C3%A7oivent+deux+rythmes+distincts%2C+%C3%A9tiquet%C3%A9s+station.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-2)
- [ ] [[P1] w2-mobiliscope — Mobiliscope — présence heure par heure](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w2-mobiliscope+%E2%80%94+Mobiliscope+%E2%80%94+pr%C3%A9sence+heure+par+heure&body=**ID**+%60w2-mobiliscope%60+%C2%B7+**vague+2**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60mobiliscope%60%0A%0A%23%23+Pourquoi%0AUn+quartier+de+bureaux+qui+triple+%C3%A0+midi+n%27est+pas+un+quartier+d%27habitants.%0A%0A%23%23+Comment%0ACNRS%2C+ODbL.+Pr%C3%A9sence+par+secteur+%2F+heure+%2F+%C3%A2ge+%2F+CSP.+Phrase+%3A+%C2%AB+population+pr%C3%A9sente+%C3%A0+12h+vs+20h%2C+secteur+X+%C2%BB.%0A%0A%23%23+Doctrine%0APr%C3%A9sence%2C+pas+passage+devant+la+porte.+Pas+un+comptage+pi%C3%A9ton.%0A%0A%23%23+Fait+quand%0ALa+fiche+oppose+midi+et+soir+sur+le+m%C3%AAme+local%2C+avec+le+secteur+Mobiliscope+nomm%C3%A9.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-2)
- [ ] [[P1] w2-filosofi — Filosofi carroyé 200 m](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w2-filosofi+%E2%80%94+Filosofi+carroy%C3%A9+200+m&body=**ID**+%60w2-filosofi%60+%C2%B7+**vague+2**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60filosofi%60%0A%0A%23%23+Pourquoi%0AL%27IRIS+est+trop+large+%3A+deux+rues+du+m%C3%AAme+IRIS+peuvent+n%27avoir+rien+%C3%A0+voir.+Le+carreau+200+m+passe+le+test+de+granularit%C3%A9.%0A%0A%23%23+Comment%0AINSEE%2C+revenus+et+population.+Afficher+la+maille+et+l%27ann%C3%A9e.+Utile+au+caviste%2C+muet+pour+le+kebab+de+flux.%0A%0A%23%23+Doctrine%0APas+une+moyenne+d%27arrondissement.+Pas+un+score+d%27aisance.%0A%0A%23%23+Fait+quand%0ADeux+locaux+%C3%A0+300+m+l%27un+de+l%27autre%2C+carreaux+diff%C3%A9rents%2C+montrent+deux+m%C3%A9dianes.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-2)
- [ ] [[P2] w2-bpe-marches-velo — BPE, marchés alimentaires, comptages vélo](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w2-bpe-marches-velo+%E2%80%94+BPE%2C+march%C3%A9s+alimentaires%2C+comptages+v%C3%A9lo&body=**ID**+%60w2-bpe-marches-velo%60+%C2%B7+**vague+2**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60bpe%60%2C+%60marches%60%2C+%60velo%60%0A%0A%23%23+Pourquoi%0AAppoint+qui+fait+passer+un+comptage+OSM+de+probable+%C3%A0+corrobor%C3%A9%2C+et+donne+un+rythme+mesur%C3%A9+%28v%C3%A9lo%29+ou+p%C3%A9riodique+%28march%C3%A9%29.%0A%0A%23%23+Comment%0ABPE+%C3%97+OSM+%3D+deux+sources+ind%C3%A9pendantes.+March%C3%A9s+%3A+jours+et+emprises.+V%C3%A9lo+%3A+pas+des+pi%C3%A9tons%2C+%C3%A9tiquette+honn%C3%AAte%2C+mieux+que+le+proxy+route.%0A%0A%23%23+Doctrine%0ACorroboration%2C+pas+substitution.+Le+v%C3%A9lo+n%27est+pas+un+pi%C3%A9ton.%0A%0A%23%23+Fait+quand%0AUn+commerce+de+bouche+%C3%A0+80+m+d%27un+march%C3%A9+deux+jours+par+semaine+le+voit+sur+la+fiche+%3B+BPE+et+OSM+d%27une+%C3%A9cole+se+recoupent+en+corrobor%C3%A9.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-2)
- [ ] [[P1] w2-air-bruit — Airparif + Bruitparif à la place des proxys](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w2-air-bruit+%E2%80%94+Airparif+%2B+Bruitparif+%C3%A0+la+place+des+proxys&body=**ID**+%60w2-air-bruit%60+%C2%B7+**vague+2**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-provenance%60%0A**Sources**+%60airparif%60%2C+%60bruitparif%60%0A%0A%23%23+Pourquoi%0ACopernicus+CAMS+et+le+bruit+model%C3%A9+depuis+les+routes+majeures+sont+trop+lisses+pour+s%C3%A9parer+deux+rues.%0A%0A%23%23+Comment%0AMailles+%C3%8Ele-de-France+mesur%C3%A9es+%2F+model%C3%A9es+par+les+observatoires+locaux.+Une+dimension+par+couche%2C+jamais+un+indice+unique+air-bruit.%0A%0A%23%23+Doctrine%0AMesur%C3%A9+vs+model%C3%A9%2C+le+mot+exact.+Si+deux+locaux+de+la+rue+ont+le+m%C3%AAme+niveau%2C+on+n%27affiche+pas+la+couche+comme+discriminante.%0A%0A%23%23+Fait+quand%0AUne+rue+canyon+et+une+rue+en+retrait+n%27ont+plus+le+m%C3%AAme+bruit+%3B+la+m%C3%A9thode+cite+Bruitparif%2C+pas+%C2%AB+major+roads+500+m+%C2%BB.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-2)
- [ ] [[P0] w3-mapillary — Mapillary : rideau, pancarte, vitrine — observation datée](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP0%5D+w3-mapillary+%E2%80%94+Mapillary+%3A+rideau%2C+pancarte%2C+vitrine+%E2%80%94+observation+dat%C3%A9e&body=**ID**+%60w3-mapillary%60+%C2%B7+**vague+3**+%C2%B7+**Q4+2026**+%C2%B7+**P0**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60mapillary%60%0A%0A%23%23+Pourquoi%0ATrou+produit+n%C2%B01.+BDCom+2023+sans+vacants%2C+OSM+shop%3Dvacant+mal+tenu%2C+SeLoger+interdit.+La+rue+est+le+seul+fait+public+r%C3%A9cent.%0A%0A%23%23+Comment%0AMapillary+%28CC-BY%29+%2B+%C3%A9ventuellement+IGN+imagerie+orient%C3%A9e.+Classes+ferm%C3%A9es+%3A+rideau+baiss%C3%A9%2C+%C2%AB+%C3%A0+louer+%2F+%C3%A0+c%C3%A9der+%C2%BB%2C+vitrine+vide%2C+graffitis%2C+terrasse.+Sortie+%3D+observation+%2B+date+%2B+crop.+50+fa%C3%A7ades+gold+dans+eval%2F.+Sous+le+seuil+%E2%86%92+silence.%0A%0A%23%23+Doctrine%0A%C2%AB+Fa%C3%A7ade+au+rideau+baiss%C3%A9%2C+clich%C3%A9+du+12+mars+2026+%C2%BB+n%27est+pas+%C2%AB+vacant+%3D+true+%C2%BB.+derived%2C+jamais+%C3%A9tabli+par+le+mod%C3%A8le+seul.%0A%0A%23%23+Fait+quand%0AGate+%3A+pr%C3%A9cision%2Frappel+sur+50+fa%C3%A7ades+annot%C3%A9es.+Affichage+uniquement+au-dessus+du+seuil%2C+avec+la+photo+et+la+date.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP0%2Cvague-3)
- [ ] [[P2] w3-osm-notes — Notes OSM et fraîcheur du POI](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w3-osm-notes+%E2%80%94+Notes+OSM+et+fra%C3%AEcheur+du+POI&body=**ID**+%60w3-osm-notes%60+%C2%B7+**vague+3**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60osm%60%0A%0A%23%23+Pourquoi%0ASignal+faible+mais+public+%3A+un+shop%3D*+non+%C3%A9dit%C3%A9+depuis+4+ans%2C+une+note+%C2%AB+ferm%C3%A9+%C2%BB.%0A%0A%23%23+Comment%0ADate+de+derni%C3%A8re+%C3%A9dition+du+POI%2C+notes+g%C3%A9olocalis%C3%A9es.+Niveau+ind%C3%A9termin%C3%A9.+Ne+jamais+en+d%C3%A9duire+une+vacance.%0A%0A%23%23+Doctrine%0ASignal+faible+%3D+undetermined.+Absent+n%27est+pas+z%C3%A9ro.%0A%0A%23%23+Fait+quand%0ALa+fiche+peut+montrer+%C2%AB+POI+OSM+non+touch%C3%A9+depuis+4+ans+%C2%BB+sans+changer+le+statut+du+local.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-3)
- [ ] [[P1] w4-meubles — Meublés touristiques déclarés](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w4-meubles+%E2%80%94+Meubl%C3%A9s+touristiques+d%C3%A9clar%C3%A9s&body=**ID**+%60w4-meubles%60+%C2%B7+**vague+4**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60meubles%60%0A%0A%23%23+Pourquoi%0AGrand+oubli%C3%A9.+Une+rue+%C3%A0+forte+densit%C3%A9+Airbnb+n%27a+pas+la+m%C3%AAme+soir%C3%A9e%2C+la+m%C3%AAme+boulangerie%2C+le+m%C3%AAme+%C2%AB+calme+%C2%BB.%0A%0A%23%23+Comment%0Aopendata.paris.fr+registre+des+autorisations+de+changement+d%27usage.+Comptage+dans+200+m%2C+mill%C3%A9sime.+Phrase+%3A+%C2%AB+n+autorisations+dans+200+m+%C2%BB.%0A%0A%23%23+Doctrine%0ADensit%C3%A9+d%27autorisations%2C+pas+un+taux+Airbnb+au+noir.+%C3%87a+s%C3%A9pare+deux+rues.%0A%0A%23%23+Fait+quand%0ALe+Marais+touristique+et+une+rue+du+20e+r%C3%A9sidentiel+n%27ont+pas+le+m%C3%AAme+n+%C3%A0+200+m.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-4)
- [ ] [[P2] w4-ecoles — Effectifs scolaires](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w4-ecoles+%E2%80%94+Effectifs+scolaires&body=**ID**+%60w4-ecoles%60+%C2%B7+**vague+4**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60education%60%0A%0A%23%23+Pourquoi%0A1+200+%C3%A9l%C3%A8ves+%C3%A0+400+m%2C+c%27est+la+boulangerie+du+matin+%E2%80%94+mieux+qu%27un+pin+OSM+%C2%AB+%C3%A9cole+%C2%BB.%0A%0A%23%23+Comment%0A%C3%A9ducation.gouv%2C+ouvert.+Effectif+%C3%97+distance.+R%C3%A9serve+%3A+rythme+scolaire%2C+pas+un+flux+annuel+liss%C3%A9.%0A%0A%23%23+Doctrine%0AComptage+administratif%2C+pas+un+mod%C3%A8le+de+demande.%0A%0A%23%23+Fait+quand%0AUne+fiche+alimentaire+proche+d%27un+groupe+scolaire+affiche+l%27effectif+et+la+distance.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-4)
- [ ] [[P1] w4-abf — ABF, monuments, SPR — façade contrainte](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w4-abf+%E2%80%94+ABF%2C+monuments%2C+SPR+%E2%80%94+fa%C3%A7ade+contrainte&body=**ID**+%60w4-abf%60+%C2%B7+**vague+4**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-plu%60%0A**Sources**+%60abf%60%0A%0A%23%23+Pourquoi%0AExtraction%2C+enseigne%2C+menuiserie+%3A+des+mois+et+des+dizaines+de+k%E2%82%AC.+D%C3%A9cisif+avant+de+voyager.%0A%0A%23%23+Comment%0AP%C3%A9rim%C3%A8tres+ABF+%2F+MH+%2F+SPR.+Phrase+%3A+%C2%AB+Fa%C3%A7ade+dans+le+champ+de+visibilit%C3%A9+d%27un+MH+%3A+enseigne+et+extraction+soumises+%C3%A0+l%27ABF+%C2%BB.+Informatif.%0A%0A%23%23+Doctrine%0AComme+le+PLU+%3A+signal%2C+pas+un+avis+d%27urbanisme+opposable.%0A%0A%23%23+Fait+quand%0AUn+local+en+abords+MH+et+un+local+hors+p%C3%A9rim%C3%A8tre+re%C3%A7oivent+deux+alertes+distinctes.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-4)
- [ ] [[P2] w4-erp-copro-ads — ERP / PMR, copropriétés, permis ADS](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w4-erp-copro-ads+%E2%80%94+ERP+%2F+PMR%2C+copropri%C3%A9t%C3%A9s%2C+permis+ADS&body=**ID**+%60w4-erp-copro-ads%60+%C2%B7+**vague+4**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60erp%60%2C+%60copro%60%2C+%60ads%60%0A%0A%23%23+Pourquoi%0ACapacit%C3%A9%2C+accessibilit%C3%A9%2C+copro+en+difficult%C3%A9+%28extraction+refus%C3%A9e%29%2C+changement+de+destination+d%C3%A9j%C3%A0+d%C3%A9pos%C3%A9.%0A%0A%23%23+Comment%0ARegistres+publics+ERP%2FPMR+%3B+ANCOL+copropri%C3%A9t%C3%A9s+%3B+ADS+Paris+en+compl%C3%A9ment+de+Sitadel.+Chaque+couche+s%C3%A9par%C3%A9e%2C+n%2Fa+si+silencieuse.%0A%0A%23%23+Doctrine%0ANe+pas+fusionner+en+un+%C2%AB+risque+immeuble+%C2%BB.%0A%0A%23%23+Fait+quand%0ALa+fiche+restauration+peut+dire+cave%2FERP%2Fcopro%2FADS+chacun+en+measured+ou+n%2Fa.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-4)
- [ ] [[P2] w4-frequentation — Fréquentation musées, piscines, bibliothèques](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w4-frequentation+%E2%80%94+Fr%C3%A9quentation+mus%C3%A9es%2C+piscines%2C+biblioth%C3%A8ques&body=**ID**+%60w4-frequentation%60+%C2%B7+**vague+4**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60frequentation%60%0A%0A%23%23+Pourquoi%0ARythme+r%C3%A9el+autour+d%27un+%C3%A9quipement%2C+pas+seulement+%C2%AB+il+y+a+un+mus%C3%A9e+%C2%BB.%0A%0A%23%23+Comment%0AParis+Data+%2F+%C3%A9tablissements.+Profil+saisonnier+si+disponible.+Label+%3A+fr%C3%A9quentation+de+l%27%C3%A9quipement%2C+pas+du+trottoir.%0A%0A%23%23+Doctrine%0AProxy+de+pr%C3%A9sence%2C+%C3%A9tiquet%C3%A9+comme+tel.%0A%0A%23%23+Fait+quand%0AUn+local+%C3%A0+100+m+d%27un+mus%C3%A9e+%C3%A0+forte+fr%C3%A9quentation+le+voit%2C+avec+la+source+et+l%27ann%C3%A9e.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-4)
- [ ] [[P1] w5-entretien — Agent d'entretien du preneur (8 questions → checklist)](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w5-entretien+%E2%80%94+Agent+d%27entretien+du+preneur+%288+questions+%E2%86%92+checklist%29&body=**ID**+%60w5-entretien%60+%C2%B7+**vague+5**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%2C+%60w6-mcp%60%0A**Sources**+%E2%80%94%0A%0A%23%23+Pourquoi%0ALe+preneur+d%C3%A9cide+1+%C3%A0+3+fois+dans+une+vie+et+ne+sait+pas+quoi+demander.+C%27est+le+produit+humain+%3B+le+MCP+est+d%C3%A9j%C3%A0+le+backend.%0A%0A%23%23+Comment%0AM%C3%A9tier%2C+extraction%2C+terrasse%2C+cave%2C+soir%2C+budget+fonds%2C+surface%2C+PMR.+Puis+score_location+%2F+trace_premise+%2F+compare_locations.+Sortie+%3A+checklist+oui+%2F+non+%2F+silencieux%2C+chaque+ligne+sourc%C3%A9e.+Pas+de+score+unique.%0A%0A%23%23+Doctrine%0AL%27IA+au-dessus+du+c%C5%93ur.+Pond%C3%A9ration+d%C3%A9clar%C3%A9e+par+le+m%C3%A9tier%2C+jamais+apprise+en+secret.%0A%0A%23%23+Fait+quand%0AUn+sc%C3%A9nario+restaurateur+et+un+sc%C3%A9nario+yoga+sur+la+m%C3%AAme+adresse+produisent+deux+checklists%2C+z%C3%A9ro+verdict+0%E2%80%93100.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-5)
- [ ] [[P1] w5-confiance-agent — Auto-évaluation de confiance de l'agent](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w5-confiance-agent+%E2%80%94+Auto-%C3%A9valuation+de+confiance+de+l%27agent&body=**ID**+%60w5-confiance-agent%60+%C2%B7+**vague+5**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w5-entretien%60%0A**Sources**+%E2%80%94%0A%0A%23%23+Pourquoi%0AD%C3%A9j%C3%A0+en+research+dans+le+README.+Un+paragraphe+fluide+noie+les+trous.+L%27agent+doit+les+nommer.%0A%0A%23%23+Comment%0AL%27agent+dit+%3A+silencieux+sur+le+loyer%2C+probable+sur+quel+local+a+%C3%A9t%C3%A9+c%C3%A9d%C3%A9%2C+%C3%A9tabli+sur+l%27activit%C3%A9+2020.+S%27appuie+sur+les+niveaux+Measured%3CT%3E%2C+ne+les+r%C3%A9invente+pas.%0A%0A%23%23+Doctrine%0AQuatre+niveaux%2C+jamais+un+pourcentage.+L%27agent+r%C3%A9p%C3%A8te+la+doctrine%2C+il+ne+la+contourne+pas.%0A%0A%23%23+Fait+quand%0AChaque+r%C3%A9ponse+MCP%2Fagent+porte+un+bloc+%C2%AB+ce+que+je+ne+sais+pas+%C2%BB+non+vide+d%C3%A8s+qu%27un+axe+est+n%2Fa.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-5)
- [ ] [[P1] w5-entity — Résolution d'entité BODACC × BDCom](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w5-entity+%E2%80%94+R%C3%A9solution+d%27entit%C3%A9+BODACC+%C3%97+BDCom&body=**ID**+%60w5-entity%60+%C2%B7+**vague+5**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%0A**Sources**+%60bodacc%60%2C+%60bdcom%60%0A%0A%23%23+Pourquoi%0A36%2C5+%25+de+probable+%3A+BODACC+nomme+une+adresse%2C+BDCom+un+local%2C+69+%25+des+locaux+partagent+un+num%C3%A9ro.%0A%0A%23%23+Comment%0AProposition+%3A+%C2%AB+cession+boulangerie+42+m%C2%B2+colle+au+local+%233+%2842%E2%80%9360+m%C2%B2%2C+boulangerie+2020%29%2C+pas+au+%237+%28coiffeur%29+%C2%BB+%2B+pi%C3%A8ces.+Ne+monte+jamais+tout+seul+%C3%A0+%C3%A9tabli.%0A%0A%23%23+Doctrine%0AR%C3%A9duire+le+silence%2C+pas+blanchir+la+jointure.+Le+niveau+reste+probable+tant+qu%27aucune+source+ne+nomme+le+local.%0A%0A%23%23+Fait+quand%0Aeval%2F+%3A+golden+set+de+8+chronologies+%2B+cas+d%27adresses+partag%C3%A9es.+Pas+de+promotion+automatique+de+niveau.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-5)
- [ ] [[P2] w5-parse — Extracteur BODACC / INPI (tuyauterie)](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w5-parse+%E2%80%94+Extracteur+BODACC+%2F+INPI+%28tuyauterie%29&body=**ID**+%60w5-parse%60+%C2%B7+**vague+5**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-cron%60%0A**Sources**+%60bodacc%60%2C+%60inpi%60%0A%0A%23%23+Pourquoi%0ALe+regex+des+prix+est+fragile.+Activit%C3%A9%2C+surface%2C+prix%2C+nature+de+l%27acte+se+pr%C3%AAtent+%C3%A0+un+extracteur+%C3%A9tiquet%C3%A9+derived.%0A%0A%23%23+Comment%0AMod%C3%A8le+ou+r%C3%A8gles+%2B+LLM+born%C3%A9%2C+rejeu+possible%2C+golden+set+dans+eval%2F.+Jamais+un+oracle+de+valorisation.%0A%0A%23%23+Doctrine%0AIA+de+tuyauterie.+La+donn%C3%A9e+extraite+reste+derived+jusqu%27%C3%A0+validation+par+champ+structur%C3%A9.%0A%0A%23%23+Fait+quand%0ALe+gate+d%27%C3%A9val+couvre+un+%C3%A9chantillon+de+cessions+%3B+les+%C3%A9checs+restent+n%2Fa%2C+pas+0+%E2%82%AC.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-5)
- [ ] [[P2] w5-explain-metier — explain_score métier-aware](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w5-explain-metier+%E2%80%94+explain_score+m%C3%A9tier-aware&body=**ID**+%60w5-explain-metier%60+%C2%B7+**vague+5**+%C2%B7+**Q4+2026**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w0-provenance%60%0A**Sources**+%E2%80%94%0A%0A%23%23+Pourquoi%0AAujourd%27hui+l%27outil+explique+un+axe.+Demain+il+dit+ce+qui+compte+pour+CE+m%C3%A9tier.%0A%0A%23%23+Comment%0APond%C3%A9ration+d%C3%A9clar%C3%A9e+%28cave+%C3%A0+vins+%3A+calme+%2B+revenu+200+m+%3B+kebab+%3A+flux+midi%29.+Pas+de+poids+appris+opaques.%0A%0A%23%23+Doctrine%0ALe+m%C3%A9tier+arbitre.+Compass+n%27apprend+pas+un+%C2%AB+bon+emplacement+%C2%BB+universel.%0A%0A%23%23+Fait+quand%0Aexplain_score%28lat%2C+lng%2C+metric%2C+trade%29+change+l%27ordre+des+phrases%2C+pas+les+chiffres.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-5)
- [ ] [[P1] w6-liberations — Vue par défaut « ce qui se libère »](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w6-liberations+%E2%80%94+Vue+par+d%C3%A9faut+%C2%AB+ce+qui+se+lib%C3%A8re+%C2%BB&body=**ID**+%60w6-liberations%60+%C2%B7+**vague+6**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%2C+%60w1-survie%60%0A**Sources**+%60sirene%60%2C+%60bodacc%60%2C+%60dia%60%2C+%60mapillary%60%0A%0A%23%23+Pourquoi%0ALa+promesse+est+l%27amont+de+l%27annonce.+Elle+n%27est+pas+encore+l%27%C3%A9cran+d%27accueil.%0A%0A%23%23+Comment%0ASans+adresse+%3A+cessations+SIRENE%2C+proc%C3%A9dures+BODACC%2C+DIA+si+ouvertes%2C+rideaux+Mapillary.+Avec+adresse+%3A+la+fiche.+Jamais+un+stock+d%27annonces.%0A%0A%23%23+Doctrine%0AUpstream.+Absent+sur+cette+couche+%E2%89%A0+rien+%C3%A0+saisir+%E2%80%94+l%C3%A9gender+la+couverture+de+chaque+signal.%0A%0A%23%23+Fait+quand%0AL%27ouverture+de+l%27app+sans+requ%C3%AAte+montre+des+signaux+de+lib%C3%A9ration%2C+chacun+avec+source+et+date%2C+et+une+l%C3%A9gende+de+couverture.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-6)
- [ ] [[P1] w6-modes — Trois modes métier](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w6-modes+%E2%80%94+Trois+modes+m%C3%A9tier&body=**ID**+%60w6-modes%60+%C2%B7+**vague+6**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%2C+%60w1-terrasses%60%2C+%60w0-plu%60%0A**Sources**+%E2%80%94%0A%0A%23%23+Pourquoi%0AM%C3%AAme+corpus%2C+phrases+diff%C3%A9rentes.+Un+dashboard+unique+moyenne+ce+que+le+README+refuse.%0A%0A%23%23+Comment%0ARestauration+%28cuisine%2C+terrasse%2C+PPRI+cave%2C+licence%29.+Boutique+%28lin%C3%A9aire%2C+PLU%2C+rotation+pr%C3%AAt-%C3%A0-porter%29.+Artisanat+%28PLU+artisanat%2C+copro%2C+livraison%29.%0A%0A%23%23+Doctrine%0APas+un+score+par+m%C3%A9tier.+Une+checklist+par+m%C3%A9tier.%0A%0A%23%23+Fait+quand%0ALe+basculement+de+mode+r%C3%A9ordonne+les+axes+et+les+alertes%2C+sans+inventer+de+chiffre.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-6)
- [ ] [[P1] w6-dossier — Dossier exportable d'une adresse](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w6-dossier+%E2%80%94+Dossier+exportable+d%27une+adresse&body=**ID**+%60w6-dossier%60+%C2%B7+**vague+6**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-fiche%60%2C+%60w0-provenance%60%0A**Sources**+%E2%80%94%0A%0A%23%23+Pourquoi%0AC%27est+ce+que+le+banquier+et+le+franchiseur+signeront.+D%C3%A9j%C3%A0+en+design+%3B+le+MCP+le+produit+d%C3%A9j%C3%A0.%0A%0A%23%23+Comment%0AUn+fichier+%28PDF%2FJSON%29+depuis+la+fiche%2C+pas+depuis+une+liste.+Chaque+chiffre+%3A+source%2C+licence%2C+mill%C3%A9sime%2C+m%C3%A9thode.+Pas+d%27export+de+masse.%0A%0A%23%23+Doctrine%0AUn+dossier%2C+une+adresse.+Pas+de+bouton+%C2%AB+tout+exporter+%C2%BB.%0A%0A%23%23+Fait+quand%0ADepuis+une+fiche%2C+t%C3%A9l%C3%A9charger+un+fichier+dont+chaque+figure+est+re-d%C3%A9rivable.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-6)
- [ ] [[P1] w6-mcp — Publier le MCP + llms.txt](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w6-mcp+%E2%80%94+Publier+le+MCP+%2B+llms.txt&body=**ID**+%60w6-mcp%60+%C2%B7+**vague+6**+%C2%B7+**Q4+2026**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-deploy%60%2C+%60w0-provenance%60%0A**Sources**+%E2%80%94%0A%0A%23%23+Pourquoi%0ALes+collectivit%C3%A9s%2C+CCI%2C+SEM+branchent+leur+agent.+Pas+de+second+produit+%C2%AB+mode+mairie+%C2%BB.%0A%0A%23%23+Comment%0APublier+mcp-server+%28npm+ou+registre+MCP%29%2C+llms.txt+d%C3%A9j%C3%A0+%C3%A9crit.+Prompt+d%27installation.+R%C3%B4le+anon+uniquement.%0A%0A%23%23+Doctrine%0AM%C3%AAme+fronti%C3%A8re+de+confiance+qu%27un+visiteur+anonyme.+Jamais+la+cl%C3%A9+service.%0A%0A%23%23+Fait+quand%0AUn+agent+externe+peut+score_location+%2F+trace_premise+%2F+compare_locations+%2F+list_sources+sur+le+d%C3%A9p%C3%B4t+document%C3%A9.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-6)
- [ ] [[P1] w7-foncier — Fichiers fonciers / MAJIC — partenariat public](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w7-foncier+%E2%80%94+Fichiers+fonciers+%2F+MAJIC+%E2%80%94+partenariat+public&body=**ID**+%60w7-foncier%60+%C2%B7+**vague+7**+%C2%B7+**2027**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w0-deploy%60%0A**Sources**+%60foncier%60%2C+%60dvf%60%0A%0A%23%23+Pourquoi%0ALe+local+fiscal+existe+m%C3%AAme+sans+SIRET+ni+vitrine+BDCom.+C%27est+l%27%C3%A9quivalent+national%2C+plus+sale%2C+de+BDCom.%0A%0A%23%23+Comment%0AAcc%C3%A8s+restreint+acteurs+publics+%28Cerema+%2F+DGALN%29.+Partenariat+Ville%2C+APUR+ou+collectivit%C3%A9.+EmpCom+open+trop+grossier+pour+le+tron%C3%A7on.+DVF+%28murs%2Fm%C2%B2%29+en+appoint%2C+jamais+comme+loyer.%0A%0A%23%23+Doctrine%0ASans+%C3%A7a%2C+hors+Paris+%3D+radar+SIRET.+Avec%2C+un+kit+ville+devient+d%C3%A9fendable.+Pas+un+fetch+anonyme.%0A%0A%23%23+Fait+quand%0ASoit+un+flux+fichiers+fonciers+sous+convention%2C+soit+EmpCom+clairement+%C3%A9tiquet%C3%A9+trop+grossier%2C+sans+sur-promesse.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-7)
- [ ] [[P2] w7-inpi — Comptes INPI comme échantillon, jamais comme moyenne de rue](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP2%5D+w7-inpi+%E2%80%94+Comptes+INPI+comme+%C3%A9chantillon%2C+jamais+comme+moyenne+de+rue&body=**ID**+%60w7-inpi%60+%C2%B7+**vague+7**+%C2%B7+**2027**+%C2%B7+**P2**%0A**D%C3%A9pend+de**+%60w5-parse%60%0A**Sources**+%60inpi%60%0A%0A%23%23+Pourquoi%0A%7E45+%25+confidentiels%2C+biais+vers+les+plus+gros.+Utile+born%C3%A9%2C+toxique+si+on+en+fait+un+CA+de+rue.%0A%0A%23%23+Comment%0A%C2%AB+Parmi+les+12+commerces+du+tron%C3%A7on+ayant+publi%C3%A9+2024%2C+m%C3%A9diane+de+CA+X.+7+n%27ont+pas+publi%C3%A9.+Ce+n%27est+pas+une+moyenne+de+rue.+%C2%BB%0A%0A%23%23+Doctrine%0AObservation+born%C3%A9e%2C+effectif+nomm%C3%A9.+Jamais+%C2%AB+votre+caf%C3%A9+fera+X+%C2%BB.%0A%0A%23%23+Fait+quand%0ALa+phrase+d%27affichage+refuse+de+se+calculer+si+n+%3C+seuil%2C+et+cite+toujours+les+non-publiants.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP2%2Cvague-7)
- [ ] [[P1] w7-etude-chantiers — Étude rétrospective chantiers × BDCom](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w7-etude-chantiers+%E2%80%94+%C3%89tude+r%C3%A9trospective+chantiers+%C3%97+BDCom&body=**ID**+%60w7-etude-chantiers%60+%C2%B7+**vague+7**+%C2%B7+**2027**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w1-chantiers%60%0A**Sources**+%60chantiers%60%2C+%60bdcom%60%0A%0A%23%23+Pourquoi%0AC%27est+ce+qui+donnerait+le+droit+d%27afficher+une+association+mesur%C3%A9e+plut%C3%B4t+qu%27une+intuition.+Si+l%27effet+n%27existe+pas%2C+on+l%27apprend+et+on+ne+l%27affiche+pas.%0A%0A%23%23+Comment%0ALes+locaux+%C3%A0+moins+de+N+m+d%27un+chantier+de+plus+de+M+mois+ont-ils+disparu+plus+souvent+entre+2020+et+2023+que+leurs+voisins+de+la+m%C3%AAme+rue+et+du+m%C3%AAme+m%C3%A9tier+%3F+Publiable%2C+falsifiable.%0A%0A%23%23+Doctrine%0AR%C3%A9sultat+de+m%C3%A9thode%2C+pas+une+feature.+La+d%C3%A9marche+qui+s%C3%A9pare+Compass+d%27un+tableau+de+bord.%0A%0A%23%23+Fait+quand%0ANote+m%C3%A9thodologique+dans+le+d%C3%A9p%C3%B4t%2C+avec+effet+ou+absence+d%27effet%2C+et+r%C3%A8gle+d%27affichage+qui+en+d%C3%A9coule.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-7)
- [ ] [[P1] w7-kit — Kit ville — même cœur, BDCom substituable, confiance abaissée](https://github.com/IvandeMurard/paris-compass/issues/new?title=%5BP1%5D+w7-kit+%E2%80%94+Kit+ville+%E2%80%94+m%C3%AAme+c%C5%93ur%2C+BDCom+substituable%2C+confiance+abaiss%C3%A9e&body=**ID**+%60w7-kit%60+%C2%B7+**vague+7**+%C2%B7+**2027**+%C2%B7+**P1**%0A**D%C3%A9pend+de**+%60w7-foncier%60%0A**Sources**+%60sirene%60%2C+%60bodacc%60%2C+%60osm%60%2C+%60foncier%60%0A%0A%23%23+Pourquoi%0ALa+France+enti%C3%A8re+est+un+refus.+Un+kit+pour+une+ville+qui+a+un+recensement+%28CCI%2C+observatoire%2C+inventaire%29+est+de+la+profondeur+ailleurs%2C+pas+de+la+couverture.%0A%0A%23%23+Comment%0Asrc%2Fcore%2F+inchang%C3%A9.+Swap+BDCom+%E2%86%92+observatoire+local%2C+ou+%C3%A0+d%C3%A9faut+fichiers+fonciers+%2B+SIRENE+%2B+BODACC+%2B+OSM.+Abaisser+les+niveaux.+Un+Compass+Lyon+%C3%A9tabli+sur+de+l%27OSM+ment.%0A%0A%23%23+Doctrine%0ADepth+over+breadth.+Nommer+le+produit+plus+mince+%28signal%2C+pas+Compass+complet%29+s%27il+n%27y+a+pas+de+recensement+de+locaux.%0A%0A%23%23+Fait+quand%0AUn+README+kit+%3A+sources+minimales%2C+mapping+de+confiance%2C+ce+qui+devient+n%2Fa+hors+Paris.%0A%0A_Doc+%3A+%60docs%2FPLAN-ACTION-VACANCE.md%60_&labels=plan-action%2CP1%2Cvague-7)


---

*Document de construction Compass. Code Apache-2.0 ; les jeux de données gardent leurs licences. Fait pour être versionné dans le dépôt, pas pour décorer un slide.*
