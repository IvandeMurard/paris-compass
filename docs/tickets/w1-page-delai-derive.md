# [P1] w1-page-delai-derive — Le bras peut perdre son délai sur un simple reformatage, sans rien dire

**ID** `w1-page-delai-derive` · **vague 1** · **P1**
**Dépend de** `w1-porte-page`
**Sources** — *aucune source nouvelle*

> Trouvé le 15 septembre 2026 par la **revue** de [`PR #165`](https://github.com/IvandeMurard/paris-compass/pull/165),
> due parce que la proposition porte `P0` et ajoute un bras. Vérifié ensuite sur la source.

## Pourquoi

`scripts/porte/page.ts` dérive son délai du budget que l'écran déclare — c'est le bon geste, et
c'est ce que le ticket demandait. Mais il le lit **par expression régulière** :

```
export const CONTEXT_BUDGET_MS\s*=\s*(\d+)
```

`(\d+)` ne capture qu'une suite de chiffres **collés**. Aujourd'hui `src/hooks/useAddressContext.ts`
écrit `10000`, et la lecture est juste.

**Le jour où quelqu'un écrit `10_000`, la lecture rend `10`.** Le séparateur `_` est une habitude
de ce dépôt — `240_000` dans `mcp-server/src/verify.ts`, `999_999`, `18_100` et `103_000` dans
`scripts/porte/`. Le délai du bras tomberait alors de 14 000 à environ **4 010 ms**, et il
**rougirait chaque matin sur une page saine**.

**Le défaut échoue ouvert** : pas d'erreur, pas de refus, juste un chiffre faux. Et les quatre
tests du délai ne le voient pas — ils comparent deux bornes **issues de la même lecture**, donc
ils restent cohérents avec une valeur fausse.

## Doctrine

**Une dérivation qui peut lire faux sans le dire est pire qu'une valeur recopiée.** Une valeur
recopiée rouille visiblement ; celle-ci se dégrade en silence et accuse la page. C'est la
quatrième forme de la même faute cette semaine : un contrôle qui reste vert des deux côtés d'une
alternative.

`page.ts` refuse déjà de tourner si la constante est **introuvable** — la moitié de la garde
existe. Il manque le cas où elle est trouvée et **mal lue**.

## Comment

Trois directions, non exclusives, à trancher sur pièce :

1. **Lire ce que TypeScript lit** — importer la constante au lieu de la chercher dans le texte.
   L'en-tête de `page.ts` explique pourquoi elle ne l'est pas ; la revue a relevé que cet en-tête
   affirme deux fois le contraire de son propre code, **c'est à vérifier avant de s'y fier**.
2. **Accepter les séparateurs** et refuser tout ce qui n'est pas un littéral entier reconnu.
3. **Refuser une valeur invraisemblable** — un budget de 10 ms n'est pas un budget.

## Fait quand

1. **Contre-preuve jouée** : `CONTEXT_BUDGET_MS = 10_000` dans la source, le bras lit **10 000**
   ou **refuse de tourner** — jamais 10.
2. **Le test du délai ne peut plus être satisfait par une valeur fausse** : il compare à quelque
   chose d'indépendant de la lecture, pas à une seconde borne dérivée d'elle.
3. **L'en-tête de `page.ts` dit ce que le code fait.** La revue a trouvé deux affirmations
   contredites par le fichier lui-même quatre-vingts lignes plus haut ; elles partent ou elles
   deviennent vraies.
4. `npm.cmd run page` reste au vert sur une page saine.

**Ce que ça ne rattrape pas.** La garde porte sur **cette** lecture. Tout autre emprunt du bras à
la source de l'écran a le même risque et n'est pas couvert ici — la revue en a compté deux.

## Hors périmètre

Pas de reprise du bras au-delà de ses emprunts, pas de changement du budget de l'écran.
