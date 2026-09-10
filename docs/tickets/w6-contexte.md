# [P1] w6-contexte — La fiche de contexte devient le produit, la carte redevient une illustration

**ID** `w6-contexte` · **vague 6** · **Q4 2026** · **P1**
**Dépend de** `w0-fiche`, `w0-provenance`
**Sources** — *aucune source de données nouvelle*

## Pourquoi

**Compass a instruit le contexte, puis l'a rendu dans un support qui redemande à l'utilisateur de
l'instruire.** C'est le contresens, et il n'est pas cosmétique.

Une carte sert quelqu'un qui cherche *où regarder*. Le preneur arrive avec une adresse et une
question fermée : *est-ce que celle-là tient ?* Une carte ne répond jamais à une question
fermée — elle la renvoie sous forme de points à interpréter. Le produit a passé son temps
d'ingénierie à rendre des chiffres traçables, puis les a posés là où la traçabilité ne se voit
pas.

**Trois symptômes, et le deuxième contredit une doctrine écrite.**

La carte pousse à la **comparaison en masse** — l'œil balaie, compare, classe. C'est le geste que
`docs/PERIMETRE.md` §1 refuse nommément : *« Pas le courtier. C'est le refus structurant. […] il
veut de l'export, du dossier, du portefeuille, de la comparaison en masse. »* L'interface
contredit la page qui définit le périmètre.

Une carte pleine de points **suggère de la couverture**. Compass a des trous assumés — millésimes
2017 et 2020 retenus pour licence, sources à cadences inégales. La carte transforme un trou de
licence en absence de commerce, ce que le scoring passe son temps à empêcher et que l'écran
réintroduit.

Et **la seule nouveauté crédible du produit reste invisible** : `docs/PERIMETRE.md` §1 finit sur
*« Si le courtier a besoin de Compass, il utilisera la même chose que l'agent : l'API. »* Le
serveur MCP est publié, il sert déjà des phrases sourcées. L'écran ne le dit nulle part.

## Comment

**Une seule unité d'interface : la fiche de contexte d'une adresse.**

```
Accueil          un champ, une phrase, trois exemples — rien d'autre au-dessus de la ligne
   ↓             adresse géocodée BAN
/contexte/<slug>  LE produit
   ├─ Verdict en une phrase, lisible en trois secondes
   ├─ Quatre à six constats scannables : un chiffre, une phrase, un chevron de provenance
   ├─ Ce que Compass ne sait pas ICI — bloc dédié, pas une note de bas de page
   ├─ Mini-carte 400 m, en appui, non interactive au premier plan
   └─ La même réponse pour un agent : l'appel MCP correspondant
```

**L'accueil** perd la carte, le voile, et les trois piliers de confiance. Le contenu éditorial
reste sur `/presentation`. L'exploration libre part sur `/carte`, en second rang, pour qui n'a
pas d'adresse.

**La carte** devient un composant `ContextMap` : rayon fixe autour du point, couches liées aux
constats affichés, aucun panneau de filtres.

**Nouveaux composants** : `ContextVerdict`, `ContextFinding` (avec dépliant de provenance),
`ContextGaps`, `ContextMap`. Route `/contexte/:slug` et `/en/context/:slug`, slug dérivé du label
BAN, coordonnées en query pour éviter un re-géocodage.

**Réutilisé sans modification** : `src/core/scoring.ts`, `src/core/provenance.ts`,
`src/services/opendata/*`, `usePremiseHistory`, `PremiseHistorySheet`.

## Doctrine

**Le verdict est le point de rupture de ce ticket, et il a un précédent numéroté.** `#54
w0-conclusion` s'intitulait *« Une conclusion tirée par-dessus une retenue »*. Une phrase de
verdict agrège des constats de confiance inégale, dont certains peuvent être **retenus pour
licence** ou **indéterminés**. Composer « rue passante, desserte forte » alors que la desserte
est indéterminée reproduit ce défaut à l'écran, en plus visible. Donc :

> **Le verdict nomme les constats qu'il a utilisés, et refuse de se composer quand l'un des
> constats porteurs est retenu ou indéterminé.** Il dit alors ce qui manque, à la place.

**Pas de note sur 100, et la raison est écrite** — `docs/PERIMETRE.md` §4 et `docs/CONTEXTE.md` :
les pondérations dépendent du métier, un score unique moyenne ce qui s'oppose. Le verdict est une
phrase composée d'axes nommés, jamais un agrégat chiffré.

**La composition vit dans `src/core/`, donc le MCP la sert aussi.** Sans quoi « la même réponse
pour un agent » est faux — et c'est la seule promesse de nouveauté du produit. La parité se
vérifie, elle ne se déclare pas.

**La règle de composition se publie sur `Methodology.tsx`**, comme les formules de
`src/core/scoring.ts`. `CLAUDE.md` l'exige pour l'une ; une phrase affichée à tous les visiteurs
n'a pas moins besoin de sa méthode.

**La comparaison est bornée à deux adresses**, jamais une liste. Le refus du courtier tient alors
dans la structure et pas dans une intention.

**`src/core/` reste pur** : la composition est une fonction, testable hors React, pas une logique
de composant.

## Fait quand

1. **La composition du verdict est une fonction pure de `src/core/`**, couverte par ses tests, et
   **elle refuse de conclure** quand un constat porteur est retenu ou indéterminé — démontré par
   contre-preuve : le même appel avec un constat retenu rend le refus, pas la phrase.
2. **Le MCP rend le même verdict que l'écran** pour la même adresse, vérifié par
   `npm.cmd run verify:mcp`. Si les deux divergent, la parité annoncée est fausse et le ticket
   n'est pas fini.
3. **Un visiteur lit le verdict et les constats sans faire défiler**, et chaque constat déplie sa
   source, sa licence, son millésime et sa méthode — depuis `Measured<T>`, jamais recopié.
4. **Le bloc des trous nomme ce qui manque ICI**, et pas génériquement : licence non lue, source
   en retard de cadence, champ que la source a cessé de publier.
5. **Aucun chiffre affiché n'est un littéral** dans un composant — recensé, pas relu.
6. `npm.cmd run build` **et** `build:dev` passent ; le sitemap porte `/carte` et les nouvelles
   routes.

**Ce que ça ne rattrape pas** : rien ici ne garantit que le site *publié* porte cette refonte. Le
déploiement appartient à Lovable, et `porte:publie` a mesuré deux jours durant un bundle qui ne
venait d'aucun commit.

## Hors périmètre, et c'est délibéré

Aucune source nouvelle, aucun changement de formule de scoring, pas de page « travail en cours »,
pas de rebranding chromatique. La palette et la typographie du plan du 8 septembre attendent :
elles se poseront sur une structure tranchée, pas l'inverse.

## Une décision qui attend Ivan

`/contexte/*` en `noindex` — proposé par le plan, et cohérent pour des pages générées. Mais c'est
**la surface principale du produit qui sort de la recherche**. Les pages arrondissement et les
guides restent indexés et pointent vers l'accueil. À trancher : est-ce le bon échange ?

Voir `docs/PLAN-ACTION-VACANCE.md` vague 6, `docs/PERIMETRE.md` §1 et §4, `docs/PLAN.md` phase 6.
