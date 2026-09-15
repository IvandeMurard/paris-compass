# [P1] w6-accueil — L'accueil, la refonte visuelle et la page `/travaux`

**ID** `w6-accueil` · **vague 6** · **P1**
**Dépend de** `w6-dossier`, `w6-modes`, `w6-liberations`
**Sources** — *aucune source de données nouvelle ; l'API publique GitHub pour `/travaux`*

> **Ce fichier est écrit le 15 septembre 2026**, et son absence était le défaut. `#119`
> renvoyait à `docs/tickets/w6-accueil.md` — **un fichier qui n'a jamais existé**, vérifié sur
> tout l'historique. Le plan vivait donc dans un corps d'issue et nulle part ailleurs, ce qui
> est exactement ce que ce plan se reprochait à lui-même : *ce qui n'est pas commité n'existe
> pas.* Les mesures complètes, leurs témoins et les quatre volets sont dans
> [`#148`](https://github.com/IvandeMurard/paris-compass/issues/148) et ne se recopient pas ici.

## Pourquoi

Plan validé par Ivan le 8 septembre 2026, exécuté par Lovable les 7 et 8, **jamais arrivé dans
le dépôt ni sur le site publié**. Remesuré le 13 septembre : aucune des chaînes du plan n'est
servie, la page charge toujours **Inter**, et aucun des fichiers annoncés n'est au dépôt. Les
témoins du relevé répondent — `Inter` 57 fois dans le JS, `/methodologie` 3 fois — donc la
mesure fonctionne et l'absence est réelle.

Quatre volets : l'accueil, l'allègement de l'outil, la refonte visuelle (palette en jetons HSL,
Space Grotesk / DM Sans, `prefers-reduced-motion`), et la page `/travaux`.

## Doctrine

**Les trois piliers de confiance sont des chiffres affichés, donc ils portent leur source.**
Écrits à la main dans un composant, ils seraient faux à la prochaine source branchée et personne
ne le saurait. Ils se dérivent — `ingestion_run` pour la fraîcheur et le compte de sources, le
corpus pour les arrondissements — ou ils ne s'affichent pas. C'est le seul endroit du plan qui
met `Measured<T>` en jeu.

## Ce qui contraint ce ticket, et qui a changé depuis le 8 septembre

**Le volet 1 ne part plus de l'accueil du 8 septembre.** `w6-contexte` a livré le 11, puis
`w6-fiche-robuste`, `w6-fiche-corpus` et `w6-amenites-corpus` les 14 et 15 : l'accueil est déjà
dégarni, la carte est sur `/carte`, et la fiche compose un verdict. **Une partie du volet 1 est
peut-être faite, une autre peut-être en conflit** — c'est la première chose à mesurer, jamais à
supposer. En particulier : ne pas ramener la carte sur l'accueil, `w6-contexte` a tranché
l'inverse.

## Pourquoi il passe ici et pas plus tôt — décidé par Ivan le 15 septembre 2026

**Après `w6-dossier`, `w6-modes` et `w6-liberations`.** Le design se pose sur une structure
tranchée, et ces trois-là vont encore déplacer ce que la fiche montre : peindre avant eux, c'est
peindre deux fois.

**L'argument inverse a été pesé et écarté, pas ignoré** : le produit compose désormais un verdict
et a l'air plus brut qu'il n'est, ce qui le dessert. Si cet argument redevient prioritaire, la
bonne réponse est de **scinder** ce ticket — ce qui ne dépend d'aucune structure (typographie,
palette, respiration) d'un côté, l'accueil et `/travaux` de l'autre — plutôt que de le remonter
entier.

## Fait quand

1. Les fichiers annoncés sont **dans le dépôt**, pas seulement dans un aperçu Lovable. C'est le
   défaut fondateur, et le seul critère qui ne se négocie pas.
2. Les trois piliers sont **dérivés**, démontré par recensement dans `test` : aucun littéral
   chiffré dans le composant.
3. `npm.cmd run build` **et** `build:dev` passent — `lovable-tagger` n'est monté qu'en mode
   development, et une panne du lien Lovable serait sinon invisible.
4. `npm.cmd run servi` voit `/travaux` servie, ou dit qu'elle ne l'est pas. Un vert obtenu en
   retirant la route ne compte pas.
5. `prefers-reduced-motion` respecté, **aucune couleur en dur** — recensée, pas relue.

**Ce que ça ne rattrape pas.** Livrer ce ticket met la refonte dans le dépôt ; l'y voir en
production est une autre question, et le déploiement appartient à Lovable. Depuis `#142` un
retard se voit le lendemain matin au lieu de ne se voir jamais — mais le bras dit qu'il n'a pas
eu lieu, jamais pourquoi.

Voir [`#148`](https://github.com/IvandeMurard/paris-compass/issues/148) pour les relevés,
[`w6-contexte.md`](./w6-contexte.md) pour la structure sur laquelle ce plan se pose.
