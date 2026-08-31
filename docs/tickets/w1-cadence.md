# [P1] w1-cadence — Quatre sources sur huit n'ont pas de cadence, et rien n'obligeait à leur en donner une

**ID** `w1-cadence` · **vague 1** · **P1**
**Dépend de** —
**Sources** — *aucune source nouvelle*

## Pourquoi

**Ce ticket n'est pas « ajouter quatre entrées `cron` ». C'est « faire en sorte que la
cinquième source ne puisse pas naître sans cadence ».** Ajouter les quatre à la main
reproduirait exactement le geste qui a créé le trou.

`w0-cron` (#6) a posé la cadence le 25 août pour **les quatre sources qui existaient alors** —
`bodacc`, `sirene`, `bdcom`, `geography`, déclarées dans `.github/workflows/ingestion.yml`.
Les quatre suivantes sont arrivées dans les jours d'après et **aucune ne s'y est inscrite** :

| Source | Cadence déclarée | Dans le workflow | Chargée par |
| --- | --- | --- | --- |
| `bodacc` | continue | **oui** — `17 3 * * *` | `schedule` |
| `sirene` | mensuelle | **oui** — `43 4 3 * *` | pas encore déclenché |
| `bdcom` | triennale | **oui** — trimestriel, vérification | pas encore déclenché |
| `geography` | rare | **oui** — `37 6 7 1,7 *` | `workflow-dispatch` |
| **`chantiers`** | **hebdomadaire** | **non** | `manual` |
| **`sirene_stock`** | **mensuelle, le 1ᵉʳ** | **non** | `manual` |
| **`plu`** | rare | **non** | `manual` |
| **`terrasses`** | rare | **non** | `manual` |

*Mesuré le 31 août 2026 : `compass_source_freshness()` sur le distant, croisé avec la liste
`options: [bodacc, sirene, bdcom, geography]` du workflow.*

**`chantiers` est celle qui saigne.** Sa cadence déclarée est hebdomadaire — le jeu le dit
lui-même — et elle est rechargée à la main. Elle dérive d'une semaine sur l'autre,
structurellement, et rien ne le signale.

`sirene_stock` vient juste après : l'INSEE republie le stock **le 1ᵉʳ de chaque mois**, et la
ressource est *remplacée, pas archivée* — c'est ce qui a rendu une URL épinglée 404 le 25 août
(#56). Une source qui se remplace et qu'on ne relit pas est une source qui se périme en silence.

## Comment

**Dans cet ordre, et le point 2 est le livrable.**

1. **Donner leur cadence aux quatre manquantes**, sur le patron déjà écrit : une entrée `cron`
   par source, pas une cadence commune — « le pas de temps est une propriété de la source, pas
   du pipeline », dit l'en-tête du workflow, et c'est juste. `chantiers` hebdomadaire,
   `sirene_stock` après le 1ᵉʳ, `plu` et `terrasses` à une fréquence de vérification, puisque
   recharger ne rajeunit pas un vote ni une autorisation.

2. **Rendre la règle mécanique.** Un contrôle qui **énumère** les sources connues de
   `compass_source_freshness()` et échoue si l'une porte une cadence déclarée sans déclencheur
   planifié. Alors la neuvième source ne peut plus arriver sans cadence — c'est ce que
   `I23`/`I24` ont fait pour la retenue de licence, transposé à la fraîcheur.

   La difficulté est que le déclencheur vit dans un fichier YAML et la cadence en base : le
   contrôle doit croiser les deux, comme `I24` croise le catalogue avec `eval/invariants.sql`.
   Le patron existe donc déjà, dans `scripts/eval/census.ts`.

3. **Décider ce qui se passe quand une source dépasse sa cadence.** Aujourd'hui rien ne le dit.
   Une source hebdomadaire vieille de trois semaines devrait se voir — au minimum dans la porte,
   et la question de l'écran est distincte et hors périmètre ici.

## Doctrine

Afficher une date de fraîcheur n'est honnête que si le rafraîchissement est réel ou déclaré —
c'est la doctrine de `w0-cron`, et elle vaut pour les huit sources, pas pour quatre.

Une cadence posée à la main sur les sources d'un jour donné n'est pas une règle : c'est un
inventaire, et un inventaire ne se met pas à jour tout seul.

## Fait quand

1. Les huit sources de `compass_source_freshness()` ont un déclencheur planifié, ou une raison
   écrite de ne pas en avoir — jamais un silence.
2. **Un contrôle échoue si l'on ajoute une source avec une cadence et sans déclencheur.**
   Démontré en en ajoutant une pour de faux, comme `eval:sabotage` le fait pour `I23`/`I24` :
   le contrôle doit passer au rouge, puis revenir au vert une fois la sonde retirée.
3. Le dépassement de cadence a un comportement décidé et écrit.

Et, comme pour `I22` et `I23` : **dire ce que la règle ne rattrape pas.** Elle vérifie qu'un
déclencheur existe, pas qu'il a réussi — c'est une limite, et elle doit être nommée.

Voir `.github/workflows/ingestion.yml`, `docs/PLAN.md` §2.2bis et §2.2ter, et la direction du
31 août dans `docs/REPRISE.md`.
