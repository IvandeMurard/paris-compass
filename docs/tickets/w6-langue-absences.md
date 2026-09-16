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

---

## Livré — 16 septembre 2026

**Le noyau ne produit plus de phrase, il produit un motif.** `src/core/motif.ts` porte
`FigureMotif`, une union discriminée de **six genres** — `couche_absente` (paramétrée par la
couche), `reponse_plafonnee` (paramétrée par la couche, les deux comptes et le rayon),
`couverture_tronquee`, `aucun_arret_dans_rayon`, `mandataire_passage`, `bruit_modelise` — et
`motifText(motif, locale)` qui l'écrit en français ou en anglais. `Measured<T>` gagne `missing`
et `caveats` **à côté de** `missingReason` et `note`, qui restent et sont désormais **dérivés**
du motif dans sa colonne anglaise : une seule source pour une phrase, deux langues en sortie.

**Et le type est l'application de la règle.** `unavailable(origin, motif)` ne prend plus de
`string` : une absence sans motif ne compile pas. C'est ce qui répond à la deuxième question de
« Corriger une donnée n'est pas corriger un défaut » — le livrable n'est pas la ligne traduite,
c'est l'impossibilité d'en écrire une qui ne le soit pas, y compris pour un axe qui n'existe
pas encore.

**Les deux langues vivent dans `src/core/` et non dans `src/i18n/`, contre la lettre du
ticket.** Raison écrite en tête de `motif.ts` : `src/i18n` est le module du navigateur, et le
serveur MCP compile `src/core` et rien d'autre de `src/` — l'anglais dans le noyau et le
français dans `i18n` aurait fait **deux foyers pour une phrase**, ce que `verdict.ts` a déjà
tranché pour `CLAUSES`, `WHY` et `withholdingText`, en ces termes. L'intention du ticket est
tenue entière : la traduction part du motif, jamais d'un `includes()`.

**Le défaut avait un symétrique, non consigné, et il est corrigé aussi** : `truncatedNote` de
`useAddressContext.ts` était écrite **en français** et arrivait telle quelle sur
`/en/context/`, pendant que le serveur MCP écrivait sa propre version anglaise de la même
mise en garde. Deux textes pour un fait ; il n'en reste qu'un, paramétré.

### Ce qui est démontré, et par quoi

1. **Aucune raison d'absence en anglais sur la fiche française — recensé, pas relu.** Population
   dérivée de `LAYERS` et de `MOTIF_KINDS`, jamais listée. `src/core/motif.test.ts` visite les
   **six genres** — les deux paramétrés déclinés sur les **cinq couches**, soit 14 motifs — et
   exige pour chacun deux phrases non vides et **différentes** ; `contextGaps.test.ts` compose le
   bloc des trous dans les deux langues pour chaque couche et exige que chaque moitié porte la
   phrase de SA langue **et pas celle de l'autre**.
2. **La contre-preuve est jouée dans les deux sens.** `figureText.test.ts` rend le même
   `Measured<T>` en `fr` et en `en`, sur une absence et sur une réserve chiffrée, et vérifie que
   les trois nombres survivent à la traduction. Le sens inverse compte autant : c'est celui que
   `truncatedNote` cassait.
3. **Le serveur MCP rend le motif à côté de la phrase, et c'est mesuré.** `score_location` et
   `explain_score` sérialisent `missing` et `caveats` avec le reste de `Measured<T>` ;
   `explain_score` nomme aussi le genre dans sa ligne de résumé. Contrôle neuf **`E8b`** dans
   `verify:mcp` : **48 contrôles, 48 au vert, 0 en échec, 0 suspendu**, le 16 septembre 2026
   contre le distant — `motif=couche_absente/premises` à côté de sa phrase anglaise.
   **Démontré rouge** : motif retiré de `unavailable()`, phrase gardée, `E8b` sort en **ÉCHEC**
   et le bras en **1**.
4. **Aucun classement sur le texte.** `motif.test.ts` falsifie `missingReason` — on y écrit une
   phrase qui nomme la MAUVAISE couche — et vérifie que l'écran rend quand même la bonne, dans
   les deux langues. Un `includes()` quelque part sur le chemin ferait rougir ce contrôle.

**Portes, le 16 septembre 2026** : `typecheck` ✓ · `test` **798 sur 56 fichiers** (`main` en
portait 785 sur 55 ; +13, dont 11 dans `src/core/motif.test.ts`) · `build` ✓ ·
`verify:mcp` **48/48**.

### Ce que ça ne rattrape pas

- **Rien ici ne dit rien des phrases écrites en SQL.** Les `evidence` de la base sont produites
  hors de TypeScript et `I21` les garde séparément — c'était déjà écrit au ticket, c'est
  toujours vrai, et `I21` ne juge pas leur langue.
- **Ces contrôles jugent qu'il y a deux langues, jamais que chacune dit vrai.** Un motif dont la
  colonne française serait une traduction fausse les passerait tous.
- **Aucun bras n'ouvre la page anglaise.** `page` ouvre `/contexte/` et rien d'autre : une
  régression propre à `/en/context/` passerait au vert chaque matin.
- **Une chaîne écrite en dur dans un composant reste invisible d'ici.** La règle porte sur ce qui
  traverse `Measured<T>`, pas sur tout ce qui s'affiche.
