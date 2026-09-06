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

---

## Ce que la pose a mesuré — 6 septembre 2026

**Ce ticket ET `docs/PLAN.md` phase 6 sont un seul chantier, pas deux.** Le ticket reprend §6.1,
§6.3, §6.4 et §6.5 presque mot pour mot. Les deux ont été mis à jour ensemble : laisser l'un
dire « à faire » pendant que l'autre dit « fait » est exactement le « deux backlogs qui
divergent » que ce dépôt combat depuis le 23 août.

### Une prémisse du ticket était fausse, une autre inexacte

**« `compass_street_rotation` n'est appelée par personne — pas même par la porte » est faux**, et
l'était déjà à la rédaction. Mesuré le 6 septembre : `eval/invariants.sql` l'appelle dans `I25`
et `I26`, et `scripts/eval/anon-http.ts` l'appelle par PostgREST dans le bras D — depuis le
25 août, par `w0-retenue` (#57). `docs/PLAN.md` §6.3 avait rayé la phrase ; le ticket a repris le
texte d'avant. Ce qui reste vrai, et qui est la partie utile : elle n'a **aucun appelant
produit**, ni front ni MCP.

**« Le prix médian par métier n'existe que comme baseline d'évaluation figée » est inexact.**
Les deux baselines gelées couvrent la médiane *toutes activités confondues* (160 868 €) et sa
population. Les quatre prix par métier vivent dans le `README` et **aucune requête du dépôt ne
les produit** — `DIAGNOSTIC.md` §41.

### Les quatre fonctions, et ce que chacune a coûté

| Analyse | Fonction | Portée |
| --- | --- | --- |
| §6.1 | `compass_activity_transitions` | point + rayon + deux millésimes |
| §6.3 | `compass_voie_rotation` | point + rayon |
| §6.4 | `compass_price_by_activity` | point + rayon |
| §6.5 | `compass_sales_vs_collective` | point → quartier, **sans rayon** |

Les trois premières entrent dans le bras E et portent leur budget mesuré à 2 000 m
(`eval/baselines/anon-budget.json`). La quatrième n'en prend pas : « son quartier » est la
question posée, et un rayon y répondrait par un autre chiffre sous le même nom — même raison que
`compass_survival_by_trade`.

Les quatre lisent `premise_observation`, **seule table restreinte** parmi celles qu'elles
touchent (mesuré : toutes les autres politiques `select` ont pour qual `true`). Elles sont donc
`SECURITY DEFINER` avec une colonne `withheld`, et couvertes par `I43` à `I46`.

### Ce que §6.1 ne peut pas servir aujourd'hui, et ce n'est pas un défaut

Une transition dérive de **deux** millésimes ; seul 2023 est redistribuable. Les trois couples
possibles contiennent donc tous un millésime retenu : **un appelant anonyme ne reçoit aucune
matrice**, seulement une ligne marquée qui explique pourquoi. Cela se débloque le jour où l'APUR
répond, pas par du code.

### La démonstration du « Fait quand »

41 rue Berger, quartier des Halles (48,8619711 / 2,3430585) — une adresse dont le métier a
basculé « Equipement de la maison » → « Equipement de la personne » entre 2020 et 2023. Les
quatre réponses, chacune avec son effectif, sont en commentaire de fermeture de
[#50](https://github.com/IvandeMurard/paris-compass/issues/50).

### Laissé de côté, délibérément

- **§6.7 et §6.9** restent hors périmètre, comme le ticket le disait.
- **Le `README` n'est pas corrigé** : quel millésime fait foi pour le métier d'un local vendu
  est une décision d'Ivan, pas un effet de bord de migration — #89.
- **Le coût de `compass_voie_rotation`** — 2,6 fois son voisin, décomposition inconnue — #87.
- **L'encodage BODACC** — #88.
- **`changed_since_previous = 0` sur le PREMIER millésime**, où il n'y a pas de précédent :
  `compass_voie_rotation` le rend comme `compass_street_rotation`, par cohérence assumée entre
  deux fonctions qui répondent à la même question à deux grains. C'est un zéro fabriqué de la
  même famille que §19, et il vaut pour les deux — #90.
