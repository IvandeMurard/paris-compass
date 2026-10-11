# [P1] w6-peinture — La refonte visuelle, exécutée par Lovable, en parallèle des sessions

**ID** `w6-peinture` · **vague 6** · **P1** · **EXÉCUTÉ PAR LOVABLE, pas par une session**
**Dépend de** — *rien, et c'est tout l'intérêt*
**Sources** — *aucune*

> **Scindé de `w6-accueil` (#148) le 17 septembre 2026, décidé par Ivan** : *« Je ne veux plus
> attendre pour le design. Attendre davantage ne sert pas mes intérêts ni ma recherche d'emploi. »*
>
> **Le ticket d'origine prévoyait exactement ce découpage** : *« si cet argument redevient
> prioritaire, la bonne réponse est de scinder ce ticket — ce qui ne dépend d'aucune structure
> (typographie, palette, respiration) d'un côté, l'accueil et /travaux de l'autre. »* Ce fichier
> est ce côté-là.

## Pourquoi maintenant, alors que #148 disait d'attendre

L'argument d'attente était juste et reste juste **pour les murs** : `w2-rythme` (#208) et
`w6-appuis` (#206) vont encore déplacer ce que la fiche montre, et décider où va un bloc avant eux
c'est le décider deux fois.

**Il ne vaut rien pour la peinture.** Une palette, une typographie et une respiration ne dépendent
d'aucun bloc. Le produit compose un verdict et a l'air plus brut qu'il n'est — ce qui le dessert,
et `#148` le reconnaissait déjà.

## Le vrai risque, mesuré le 17 septembre 2026

**Ce travail a déjà été fait, et il s'est évaporé.** Lovable a exécuté le plan de refonte les 7 et
8 septembre 2026. Dix jours plus tard, la page publiée charge toujours **Inter** ; ni `Space
Grotesk` ni `DM Sans` n'apparaissent dans `index.html`, et aucun n'est au dépôt. Les témoins
répondent — donc la mesure fonctionne et l'absence est réelle.

**Le risque de ce ticket n'est pas le conflit avec une session. C'est la disparition.** Les
critères ci-dessous sont écrits pour ça et pour rien d'autre.

## La frontière qui rend le parallèle sûr

Le produit est en shadcn + Tailwind : **55 jetons** dans `src/index.css`, `tailwind.config.ts`, et
49 primitives dans `src/components/ui/`. La fiche n'écrit aucune couleur en dur — elle nomme
`text-muted-foreground`, `bg-muted/40`. **Changer les jetons change tout le produit sans toucher
une page.**

| Dans le périmètre | Hors périmètre, réécrit par les sessions |
| --- | --- |
| `src/index.css` — palette, rayons, typographie | `src/pages/Context.tsx` |
| `tailwind.config.ts` | `src/components/context/` |
| `src/components/ui/` — les 49 primitives | `src/core/`, `src/i18n/`, `src/services/`, `scripts/` |
| `index.html` — les polices | `.lovable/`, que personne ne touche |

**Toucher la colonne de droite est le seul moyen de faire échouer ce ticket par collision**, et
c'est aussi ce qui ferait perdre des crédits : une session réécrira ces fichiers.

## Fait quand

1. **Les fichiers sont DANS LE DÉPÔT**, pas seulement dans un aperçu Lovable. C'est le défaut
   fondateur de `#148` et le seul critère qui ne se négocie pas. Contrôle :
   `git pull && grep -rc "Space Grotesk" index.html src/index.css` — zéro veut dire que le travail
   n'existe pas.
2. **La page publiée le porte**, vérifié par un témoin dans le bundle servi et non par une capture.
   Le dépôt et la production sont deux questions, et `#148` le disait déjà.
3. **Aucune couleur en dur** — recensée par un test, pas relue. Une couleur écrite hors des jetons
   échappe au thème et ne se corrige jamais deux fois au même endroit.
4. **`prefers-reduced-motion` respecté.**
5. **`npm.cmd run build` ET `npm.cmd run build:dev` passent.** `lovable-tagger` n'est monté qu'en
   mode development : une panne du lien Lovable serait sinon invisible jusqu'à la prochaine session.
6. **La fiche d'adresse reste lisible** — les trois blocs livrés par `#197` et suivants gardent leur
   hiérarchie : un statut avant sa raison, une réserve jamais au survol.
7. **Aucun fichier de la colonne de droite n'est modifié.** Un diff qui en touche un se corrige
   avant fusion, quel que soit le reste.

**Ce que ça ne rattrape pas.** La peinture ne répare pas une structure : si la fiche est longue et
que l'ordre des blocs se discute, ce ticket la rendra belle et longue. C'est `w6-accueil` (#148)
qui porte les murs, et il attend toujours `#208` et `#206`.

## Hors périmètre

Pas de déplacement de bloc, pas de suppression de contenu, pas de route nouvelle, pas de retour de
la carte sur l'accueil — `w6-contexte` a tranché l'inverse. Aucun chiffre touché : un chiffre porte
sa source, et la peinture n'en est pas une.

Voir [`w6-accueil.md`](./w6-accueil.md) pour les volets structurels et
[`#148`](https://github.com/IvandeMurard/paris-compass/issues/148) pour les relevés d'origine.
