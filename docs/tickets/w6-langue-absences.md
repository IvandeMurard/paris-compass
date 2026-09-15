# [P1] w6-langue-absences — Les raisons d'absence s'affichent en anglais sur une page française

**ID** `w6-langue-absences` · **vague 6** · **P1**
**Dépend de** `w6-amenites-corpus`
**Sources** — *aucune source nouvelle*

> **Défaut consigné dans `DIAGNOSTIC.md` §49** depuis le 10 septembre 2026, **classé P2 à
> l'époque**. Remonté en P1 le 15 septembre, et la raison est mesurable : le 10 septembre la
> fiche n'affichait presque rien, elle affiche aujourd'hui **cinq constats et un bloc de trous**.
> Le défaut n'a pas changé ; sa surface d'exposition a été multipliée.

## Pourquoi

Les chaînes `MISSING` et les `note` de `src/core/scoring.ts` sont **écrites en anglais** — les
messages du noyau le sont par convention (`CLAUDE.md`, « Style »). Mais elles ne restent pas dans
le noyau : `Measured.missingReason` et `Measured.note` sont **rendus tels quels** à l'écran.

Relevé en production le 15 septembre, sur une page entièrement en français :

> **Passage** — *« No open pedestrian count exists for Île-de-France. This is a proxy from
> active-business density and rail access… »*
>
> **Bruit routier** — *« The road layer did not load for this area, so exposure could not be
> modelled. This is not a quiet location, it is an unmeasured one. »*

Ces deux phrases sont **les meilleures du produit** : l'une avoue qu'un chiffre est un proxy,
l'autre qu'une absence n'est pas un calme. Elles portent la doctrine, et un visiteur français ne
les lit pas.

## Ce que le défaut n'est pas

**Ce n'est pas un défaut de la page.** La page a raison de préférer `missingReason` à une
formule générique : c'est la seule phrase qui sait **quelle** couche manquait, et la remplacer
par « donnée indisponible » perdrait l'information.

Le défaut est un cran plus bas : **le noyau produit de la prose destinée à l'affichage, et de la
prose affichée a une langue.** Deux consommateurs la lisent — l'écran et le serveur MCP — et ils
n'ont pas la même.

## Comment

Faire porter à `Measured<T>` un **motif structuré** à côté de sa phrase, puis traduire le motif
dans `src/i18n/`. C'est la distinction que `mcp-server/src/context.ts` a déjà tranchée pour
`QuestionOutcome`.

**Le contournement bon marché est interdit** : traduire au `includes()` sur la phrase anglaise
est exactement ce que `#61` a refusé — classer sur du texte libre, c'est reconstruire une
énumération à partir de sa prose.

Le chantier touche `src/core/scoring.ts`, `src/i18n/figureText.ts` et la réponse du serveur MCP.
**Une revue est due** : il touche `src/core/`.

## Doctrine

**Un chiffre affiché porte sa source ; une phrase affichée porte sa langue.** C'est la même
exigence, appliquée au support au lieu du contenu. Et le motif structuré vaut mieux que la
traduction pour une seconde raison : un agent qui lit la réponse MCP peut **brancher** sur un
motif, jamais sur une phrase.

## Fait quand

1. **Sur `/contexte/<adresse>`, aucune raison d'absence n'est en anglais** — recensé, pas relu.
2. **La page anglaise `/en/context/<adresse>` les rend en anglais**, et la contre-preuve est
   jouée dans les deux sens.
3. **Le serveur MCP rend le motif structuré** à côté de la phrase, et `verify:mcp` reste au vert.
4. **Aucun classement sur le texte** : la traduction part du motif, jamais d'un `includes()` sur
   la prose.

**Ce que ça ne rattrape pas.** Rien ici ne dira rien des phrases écrites en SQL : les `evidence`
de la base sont produites hors de TypeScript, et `I21` les garde séparément.

## Hors périmètre

Pas de reprise des formules, pas de changement des axes. Le sujet est la langue des raisons
d'absence, pas leur contenu.

Voir `DIAGNOSTIC.md` §49.
