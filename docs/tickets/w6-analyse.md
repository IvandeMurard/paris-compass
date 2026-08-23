# [P1] w6-analyse — Les analyses déjà permises par le schéma

**ID** `w6-analyse` · **vague 6** · **Q4 2026** · **P1**
**Dépend de** `w0-deploy`
**Sources** — *aucune source nouvelle*

## Pourquoi
`docs/PLAN.md` phase 6 s'intitule « la capacité d'analyse **déjà dans le schéma** » : le modèle
répond à des questions que rien ne pose. Aucune n'exige de source nouvelle — seulement une
fonction pour chacune. Le plan d'action, qui est un plan de sources, les avait toutes omises.

## Comment
Quatre analyses, une fonction `compass_*` chacune, exécutable par `anon` comme les autres.

- **§6.1 — Matrices de transition d'activité.** « Que devient une boulangerie ? »
  `premise_observation.activity_code` × trois millésimes par local, par un `lag()` sur
  `(location_id, vintage_year)`. Aujourd'hui l'information n'existe que comme booléen
  `changed_from_previous` : on sait qu'il y a eu changement, jamais vers quoi.
- **§6.3 — Agrégation par rue entière.** `street_segment.voie_id` regroupe les tronçons d'une
  même voie et rien ne l'utilise. Au passage : `compass_street_rotation`, seule fonction qui
  descend au tronçon, n'est appelée par personne — pas même par la porte.
- **§6.4 — Exposer les prix par activité.** Le prix médian par métier n'existe que comme
  baseline d'évaluation figée. Grouper sur le code d'activité BDCom, **jamais** sur le champ
  texte libre de BODACC.
- **§6.5 — Ventes contre liquidations, par quartier et par activité.** Entièrement joignable,
  jamais posé. C'est la lecture qui distingue une rue qui se renouvelle d'une rue qui meurt.

**Hors périmètre, et pourquoi.** §6.7 (colonnes chargées que rien ne lit — `is_bio`,
`situation`, les bandes de surface, et `bodacc_judgment.judged_on` chargée et jamais utilisée)
est un audit, pas une fonction : il se sert ou se documente comme dormant, ticket à part.
§6.9 (rendre vérifiable l'invariant « aucun chiffre ne peut exister uniquement dans l'UI ») est
à moitié fait — `I11` couvre le versant backend depuis le 15 août — et l'autre moitié touche
`src/`, donc Lovable. Les deux restent sans ticket : c'est délibéré, pas un oubli.

## Doctrine
Aucune source nouvelle, donc aucune licence nouvelle et aucun niveau de fiabilité à revoir.
Une durée médiane avant revente n'est **pas** un taux de rotation — la prudence portée par la
migration BODACC s'applique ici. Chaque fonction reste exécutable par `anon`, sans quoi `I11`
la refuse.

## Fait quand
Les quatre fonctions existent, sont couvertes par la porte, et une adresse des Halles rend :
vers quoi son activité a basculé entre deux millésimes, le chiffre de sa voie entière et non
du seul tronçon, un prix médian groupé sur le code d'activité, et la part de ventes contre
liquidations de son quartier — chacun avec son effectif.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md) et `docs/PLAN.md` phase 6.
