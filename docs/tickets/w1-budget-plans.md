# [P1] w1-budget-plans — Cinq fonctions dépassent leur plafond de pages, et leurs temps baissent

**ID** `w1-budget-plans` · **vague 1** · **P1**
**Dépend de** — *rien*
**Sources** — *aucune*

## Pourquoi

`DIAGNOSTIC.md` §64. Le bras E d'`eval`, mesuré le 6 octobre 2026 après le `VACUUM FULL` du §62 :
`compass_street_rotation` +80,8 % au-dessus de son plafond de pages, `compass_price_by_activity`
+57,0 %, `compass_voie_rotation` +32,0 %, `compass_scoring_context_within` +29,2 %,
`compass_premises_within` +26,8 %. Les temps, eux, restent tous sous 510 ms pour un plafond de
1 020 ms.

Le gonflement des tables n'en est **pas** la cause : le `VACUUM` a fait *monter* ces nombres.
Le bras compte les pages touchées, une page relue comptant à chaque fois ; c'est la signature d'un
changement de plan sur des statistiques neuves. `scripts/eval/budget.ts` prévoit ce cas : plus de
pages est une régression, moins de pages n'est pas une preuve d'amélioration.

## Comment

1. Pour chacune des cinq, `EXPLAIN (ANALYZE, BUFFERS)` au rayon maximal sur Châtelet, comme le bras.
2. Comparer au plan d'origine — `DIAGNOSTIC.md` §29 et `eval/FAILURE_MODES.md` en portent les
   mesures — et dire ce qui a basculé.
3. Pour chaque fonction, trancher : le nouveau plan est-il meilleur (temps, pire cas, rayon par
   défaut de 800 m) ? Si oui, regeler son plafond **avec le plan qui le justifie**, écrit à côté. Si
   non, contraindre le plan ou l'index.

## Fait quand

1. `eval` ne rougit plus sur le bras E, et chaque plafond regelé porte sa raison et sa date.
2. **Aucun plafond remonté sans plan comparé.**

## Ce que ça ne rattrapera pas

Le bras ne mesure qu'une cellule — Châtelet au rayon maximal. Un plan qui bascule seulement au
rayon par défaut lui échappe toujours.
