# [P0] w1-porte-page — Quatorze bras, et aucun n'ouvre la page

**ID** `w1-porte-page` · **vague 1** · **P0**
**Dépend de** `w6-fiche-robuste`
**Sources** — *aucune source de données nouvelle*

## Pourquoi

**Le 13 septembre 2026 à 16 h 30, la porte était entièrement au vert et le produit était en panne.**

`npm.cmd run porte:etat` rendait « aucun rouge ouvert ». Au même moment, `/contexte/<adresse>`
affichait une ligne de chargement pendant 2 min 20 puis un écran d'erreur, sur deux adresses
testées (`w6-fiche-robuste`).

Les quatorze bras vérifient la base, le ledger, le catalogue, les cadences, les avis de sécurité,
l'échappement d'observabilité, le sitemap dans les deux sens, la parité agent/écran du verdict, et
depuis le 13 septembre ce que le site sert contre ce que `main` suit. **Aucun n'ouvre la page.**

Deux d'entre eux passent tout près, et la distance se mesure :

- **`verify:mcp`** prouve que le serveur MCP rend la bonne phrase. Il ne lance aucun navigateur et
  ne le fera jamais — c'est écrit dans l'en-tête de `scripts/porte/verdict.ts` et c'est un choix
  assumé.
- **`servi`** (#142, posé le 13 septembre) prouve que les routes servies correspondent à celles que
  `main` déclare. Il a bien vu que `/contexte/` était servi. **Il ne pouvait pas voir que la page
  plante** : une route servie n'est pas une page qui répond.

Le recensement statique de `scripts/porte/verdict.ts` connaît d'ailleurs sa propre limite, écrite
dès son origine :

> *« Ça voit qu'un fichier APPELLE le noyau, jamais qu'il AFFICHE ce que le noyau a rendu. »*

C'est exactement le trou par lequel ce défaut est passé.

## Le point de doctrine qui décide

**Le seul consommateur jamais vérifié est le navigateur, c'est-à-dire le preneur.**

`CLAUDE.md` porte la règle dans un sens : *« une garde sur le chemin de l'écran laisse passer
l'agent qui appelle PostgREST en direct »*. Le symétrique n'avait jamais été écrit, et il vient de
coûter une journée de produit invisible : **une garde sur le chemin de l'agent laisse passer l'écran
qui plante.**

**Ce ticket n'est pas le backlog d'instruments** que `#146` demande de ne pas rouvrir. Ce backlog
affine des instruments qui existent. Celui-ci ajoute le seul contrôle dont l'absence a produit un
défaut mesuré : la page produit, ouverte pour de vrai.

## Comment

**Un quinzième bras, et une seule affirmation.**

Le bras charge `/contexte/<adresse>` dans un navigateur sans tête et échoue si la page ne rend **ni
verdict ni refus nommé** dans un délai borné. Rien d'autre : il ne juge pas le contenu du verdict —
`verify:mcp` et le recensement de verdict le font déjà — il juge que **quelque chose de décidable
arrive à l'écran**.

**Trois exigences que les incidents du dépôt imposent d'avance.**

1. **Le bras porte sa contre-preuve**, et elle est déjà écrite : la panne Overpass du 13 septembre
   doit le faire rougir. Un bras qui reste vert sur l'état d'aujourd'hui ne garde rien — c'est la
   leçon de `#132` et `#133`, où une mutation traversait deux bras au vert.
2. **Il vise le site publié, pas un serveur de développement.** Un `vite dev` local ne prouve rien
   du bundle servi, et la distinction a déjà coûté : `porte:publie` existe pour ça.
3. **Il est planifié, ou `test` rougit.** Un script neuf dans `package.json` doit avoir son entrée
   dans `scripts/porte/cadence.json` — corollaire mécanique de la règle des bras.

**Ce qu'il ne faut pas faire.** Ne pas assouplir le rapport pour absorber un miroir amont
intermittent. Si Overpass tombe et que la fiche rend son refus nommé, le bras doit être **vert** :
c'est le comportement correct. Il ne rougit que si la page ne dit **rien**. La place légitime pour
décider qu'une panne amont cesse d'être un échec est le bras lui-même, jamais le rapport.

## Fait quand

1. **Le bras ouvre `/contexte/<adresse>` sur le site publié** et sort en 0 quand la page rend un
   verdict, en 0 quand elle rend un refus nommé, et en **1** quand elle ne rend ni l'un ni l'autre
   dans le délai.
2. **Contre-preuve jouée et écrite** : sur l'état du 13 septembre 2026 — fiche bloquée puis plantée —
   le bras sort en 1. Mesure reportée dans le ticket de clôture avec sa date.
3. **Le délai est un nombre choisi et justifié**, pas hérité d'un client HTTP.
4. **Il est dans `porte.yml` et dans `cadence.json`**, et `npm.cmd run test` passe.

**Ce que ça ne rattrape pas.** Une page qui rend un verdict **faux** reste verte ici : ce bras juge
qu'il y a une réponse, jamais qu'elle est juste. La justesse appartient à `verify:mcp`, au
recensement de verdict et aux invariants. Il ne teste qu'une adresse, ou quelques-unes : une fiche
cassée pour une adresse particulière peut passer. Et il ne voit pas ce qu'un humain comprend — un
verdict rendu et illisible est vert.

## Hors périmètre

Pas de test de bout en bout du parcours complet, pas de capture d'écran comparée, pas de mesure de
performance. Une affirmation, un bras.

Voir [`w6-fiche-robuste.md`](./w6-fiche-robuste.md), [`w1-porte-publiee.md`](./w1-porte-publiee.md),
[`w1-porte-planifiee.md`](./w1-porte-planifiee.md).
