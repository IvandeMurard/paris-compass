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

---

## Fait le 5 septembre 2026

### 1. La cause, mesurée — pas déduite

Les deux visages du ticket appellent des correctifs opposés, et une question à Ivan n'a pas été
nécessaire : l'API de GitHub porte la réponse. Mesuré le 5 septembre 2026.

| Ce qu'on demande | Ce que GitHub répond |
| --- | --- |
| `repos/IvandeMurard/paris-compass/subscription` | `subscribed: true`, `ignored: false`, **depuis le 27 juin 2026** |
| Fil d'inbox de `#74` | **existe**, `reason: subscribed` — la notification a bien été produite |
| `#74` ouverte / premier geste humain | 1er sept. 12:49 UTC → 2 sept. **15:58 UTC** : **27 h 09** |
| Fil d'inbox de `#78` | `unread: true` — **encore non lu** alors que l'issue avait été trouvée **et fermée** (5 sept., 11:33 → 13:15) |

**Verdict : la notification arrive, et elle n'est pas ce qui déclenche la lecture.** La ligne
`#78` est la démonstration décisive : l'issue a été traitée en 1 h 42 par un chemin qui n'est
jamais passé par la notification, et la notification est restée non lue **après** la fermeture.
La piste 3 du ticket — un second canal — est donc écartée sur mesure et non sur intuition :
elle multiplierait l'endroit où personne ne lit.

**Où Ivan se tient déjà**, mesuré de la même façon : les deux rouges ont été traités **pendant
une session**, et une session commence par `npm.cmd run brief <ticket>`, dont la sortie est le
prompt collé tel quel. C'est le seul point du dispositif que personne ne peut sauter.

### 2. Ce qui a été écrit

- **`npm.cmd run porte:etat`** (`scripts/porte/etat.ts` + `etat-dire.ts`) — les issues
  `porte-rouge` ouvertes et leur âge, un appel `gh`, aucune base, aucun secret. Codes de sortie
  dans la grammaire de `report.ts` : **0** aucun rouge · **3** un rouge du jour même · **1** un
  rouge de plus d'un jour. Un `gh` absent ou non authentifié rend « INDÉTERMINÉ » et **jamais**
  un vert : un silence pris pour un vert est exactement le défaut visé.
- **`scripts/brief.ts` le joue tout seul.** Au-delà du seuil, le rouge entre **dans le prompt
  collé**, avant le ticket ; en deçà, il reste sur `stderr`, comme la note du prompt commun.
  Aucune discipline requise : la seule façon de ne pas le voir est de ne pas ouvrir de session.
- **`scripts/porte/signal.ts` porte l'âge dans le titre**, aux paliers **2 et 7 jours**.
  `titreEscalade` est idempotent et remplace le palier au lieu de l'empiler : **deux écritures
  de titre sur la vie entière d'une issue**, jamais une par matin. Les paliers sont déclarés une
  fois dans `etat.ts` et lus par les deux côtés — `etat.test.ts` refuse une seconde copie.
- **`CLAUDE.md`** nomme `porte:etat` à côté de `brief`, et porte la règle et sa mesure.
- **`scripts/porte/cadence.json`** classe `porte:etat` dans `unscheduled` avec sa raison : le
  planifier serait circulaire — la porte de 07:29 relirait ses propres rouges devant personne.

### 3. Démontré, pas supposé

**Critère 2 — un rouge de plus d'un jour est visible sans ouvrir GitHub.** `#74` (ouverte le
1er septembre, donc 4 j 1 h) rouverte deux minutes, chemin de démarrage joué :

```
$ npm.cmd run porte:etat
[porte] 1 rouge(s) ouvert(s) depuis plus de 1 jour — DÉCISION REQUISE
        #74   4 j  1 h  Porte planifiée — décision requise
        gh issue view 74 --comments
$ echo $LASTEXITCODE
1

$ npm.cmd run brief w1-porte-lue      # ligne 91 du prompt À COLLER, avant le ticket
AVANT LE TICKET — la porte a un rouge ouvert depuis plus d'un jour :

[porte] 1 rouge(s) ouvert(s) depuis plus de 1 jour — DÉCISION REQUISE
        #74   4 j  1 h  Porte planifiée — décision requise
        gh issue view 74 --comments

Lis-le. S'il relève de ton ticket, traite-le ; sinon dis-le dans ton résumé et laisse
l'issue ouverte — mais ne commence pas comme s'il n'existait pas.
```

et la même chose en dernière ligne de `stderr`, après la note du prompt commun.

**Critère 3 — pas une notification par jour pour le même défaut.** `signal.ts` joué deux fois
de suite sur `#74`, même issue, même âge :

```
1er passage : Commenté sur l'issue #74 — un rouge ouvert le reste.
              Titre porté à « … — ouverte depuis 2 jours » — paliers 2 et 7 jours, jamais quotidien.
2e passage  : Commenté sur l'issue #74 — un rouge ouvert le reste.
              (aucune ligne de titre — rien n'a été réécrit)
```

Les deux commentaires de démonstration et le titre restauré sont sur `#74`, qui a été refermée.
Les quinze tests de `scripts/porte/etat.test.ts` jouent le reste : la bascule 3 → 1 à l'heure
exacte du seuil, l'idempotence, le remplacement du palier au lieu de l'empilement, et le fait
qu'un titre ne prend que **trois formes en soixante matins**.

**Critère 4 — les deux rouges qui ont motivé le ticket.** Tous deux déjà traités et consignés
avant cette session, vérifié : `#74` était le §33 (`verify:mcp` lançait esbuild par `node`),
clos le 2 septembre et **prouvé sur le runner le 3** ; le FAIL
`prix_median_local_identifiable` du 2 septembre est le §34, clos le même jour — la tolérance de
comptage appliquée à un quantile — et `docs/REPRISE.md` porte le rejeu du 5 septembre : passé à
1,69 % d'écart brut, **en avertissement**, chiffre publié inchangé à 160 000.

### Ce que la règle ne rattrape pas

C'est la limite annoncée dans « Comment », et elle est entière :

- **Une semaine sans session reste une semaine sans lecteur.** `porte:etat` ne sert que
  quelqu'un qui ouvre une session. Rien ici ne fait lire un dépôt que personne n'ouvre — et
  GitHub désactive de toute façon les workflows planifiés d'un dépôt public après 60 jours sans
  activité, ce que `porte.yml` note déjà.
- **L'escalade par le titre ne tourne que les matins où la porte est rouge.** Une issue laissée
  ouverte pendant que la porte repasse au vert ne vieillit jamais dans son propre titre. Le
  lecteur, lui, calcule l'âge en direct : le titre est une commodité pour la liste d'issues, pas
  la mesure.
- **Une session lancée sans `brief`** — `claude --resume`, ou le prompt recollé de mémoire — ne
  voit rien. `CLAUDE.md`, chargé tout seul, nomme `porte:etat` pour ce cas, mais c'est de la
  vigilance et non une porte : la même chose que `porte:etat` est là pour remplacer.
- **`porte:etat` ne juge rien.** Il dit qu'une issue est ouverte et depuis quand, pas si le
  défaut derrière est encore réel. Une issue oubliée ouverte sur un défaut corrigé produira un
  rouge de lecture parfaitement fidèle et parfaitement inutile — la fermer est un geste humain.
