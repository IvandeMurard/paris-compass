# [P1] w1-porte-lue — L'alerte est écrite, elle part, et personne ne la lit

**ID** `w1-porte-lue` · **vague 1** · **P1**
**Dépend de** — `w1-porte-planifiee` (#71)
**Sources** — *aucune source nouvelle*

## Pourquoi

**Ce ticket ne dit pas que la porte n'alerte pas. Elle alerte, correctement, et c'est mesuré.**
Il dit que l'alerte tombe là où personne ne se tient.

Ce qui s'est passé, daté :

| Quand | Ce que la porte a fait |
| --- | --- |
| 1er sept., 12:41 UTC | Passage rouge → **issue [`#74`](https://github.com/IvandeMurard/paris-compass/issues/74) ouverte** |
| 2 sept., 12:14 UTC | Passage rouge à nouveau, **2 bras** → **commentaire sur `#74` à 12:22 UTC**, exactement comme `signal.ts` le prévoit |
| 2 sept., ~17:00 UTC | Découvert **par hasard**, en cherchant autre chose |

*Mesuré le 2 septembre 2026 : `gh run list --workflow=porte.yml` et les commentaires de `#74`.*

`scripts/porte/signal.ts` fait ce qu'il annonce — une issue ouverte à la fois par étiquette, un
second rouge devient un commentaire, jamais une seconde issue. Le raisonnement écrit là-bas est
juste : *« une alerte qui produit une notification par jour pour le même défaut est une alerte
que quelqu'un filtrera »*. **Le défaut n'est donc pas dans l'écriture. Il est dans la lecture.**

**Ce que ça a coûté, et ce n'est pas hypothétique.** Pendant deux jours :

- `verify:mcp` était rouge — la surface MCP, ses six outils, la frontière `I11` et le chemin
  anonyme n'étaient plus gardés (`DIAGNOSTIC.md` §33) ;
- `eval` est passé **en sortie 1** le 2 septembre —
  `prix_median_local_identifiable — attendu 160868, mesuré 163000 (1.33%)` — et **personne ne
  l'a vu**. Ce rouge-là touche un chiffre publié : le `README` annonce 160 000 € comme médiane
  du fonds parisien. Une alerte non lue laisse vieillir une affirmation à l'écran.

Deux jours est un chiffre de chance, pas une borne : rien dans le dispositif ne l'aurait rendu
plus court. Le lecteur était de passage.

## Comment

**Mesurer avant de choisir.** La cause a deux visages et ils appellent des correctifs opposés :
soit la notification GitHub n'arrive pas (surveillance du dépôt, filtre de courrier), soit elle
arrive et rien n'en déclenche la lecture. Une question à Ivan tranche, et coûte moins que
n'importe quelle mécanique bâtie sur une supposition.

Ensuite, par ordre de solidité :

1. **Rendre une session incapable de démarrer sans voir un rouge ouvert.** C'est le précédent de
   `sessions:check` : il existe parce qu'une table dérive *sans que personne ne pousse*, et il
   est joué par une porte plutôt que confié à la vigilance. L'équivalent ici est un
   `porte:etat` — un `gh issue list --label porte-rouge --state open`, avec l'âge de chaque
   issue, sans base ni secret — nommé dans `CLAUDE.md` à côté de `docs/REPRISE.md`.
   **Sa limite, à écrire dans le ticket qui l'implémentera :** il ne sert que quelqu'un qui
   ouvre une session. Une semaine sans session reste une semaine sans lecteur.

2. **Faire porter l'âge à l'alerte elle-même.** `signal.ts` commente mais ne retitre jamais :
   « Porte planifiée — décision requise » se lit pareil au premier et au cinquième jour, et la
   liste des issues ne dit rien. Un titre qui porte l'âge le dit sans qu'on ouvre quoi que ce
   soit. L'escalade doit rester **rare** — au franchissement de seuils, deux jours puis sept,
   jamais quotidienne : c'est la règle que `signal.ts` s'est déjà donnée, et la contredire
   fabriquerait le filtre qu'il évite.

3. **Un second canal — courrier, Slack, webhook — n'est pas le premier geste**, et probablement
   pas le bon. Il ajoute une dépendance et un secret, et il ne répond pas à « personne ne lit » :
   il multiplie l'endroit où personne ne lit. À reconsidérer seulement si la mesure ci-dessus
   dit que la notification n'arrive jamais.

## Fait quand

1. La cause est **mesurée** et écrite : notification absente, ou notification reçue et sans
   effet. Pas déduite.
2. Un rouge vieux de plus d'un jour est visible **sans ouvrir GitHub** par quelqu'un qui commence
   une session — démontré en laissant une issue ouverte et en jouant le chemin de démarrage.
3. Le dispositif ne produit **pas** une notification par jour pour le même défaut : la règle de
   `signal.ts` tient, et le ticket dit explicitement à quels seuils il escalade.
4. Les deux rouges qui ont motivé ce ticket sont traités ou consignés — `#74` (§33, preuve au
   prochain passage) et le FAIL `prix_median_local_identifiable` du 2 septembre.

Et, comme pour `#70` et `#71` : **dire ce que la règle ne rattrape pas.** Aucune des pistes
ci-dessus ne fait lire un dépôt qui n'a plus de session pendant un mois — et GitHub désactive de
toute façon les workflows planifiés d'un dépôt public après 60 jours sans activité, ce que
`porte.yml` note déjà. Une porte ne peut pas voir sa propre absence, et elle ne peut pas non
plus se faire lire.
