# Compass

Carte des locaux commerciaux parisiens replacés dans leur environnement, à partir de données
publiques ouvertes. React 18 + TypeScript + Vite, Leaflet, TanStack Query, Supabase.

## Documents à lire selon le sujet

Volontairement **non importés** ici : ce fichier est chargé à chaque session, eux non. Les lire
à la demande.

| Fichier | Quand le lire |
| --- | --- |
| `docs/SESSIONS.md` | **Avant de lancer une session de développement.** L'ordre des tickets, le prompt commun, les consignes propres à chacun, et quel modèle pour quelle classe de travail. |
| `docs/JOURNAL.md` | Le récit des sessions passées. **Ne se lit pas en début de session** : sans autorité sur l'état courant, il ne sert qu'à retrouver *pourquoi* une décision a été prise. Jamais en entier. |
| `docs/REPRISE.md` | **À lire en premier en début de session.** Où en est le travail, ce qui bloque, ce qui ne tourne pas sur ce poste, et ce qui reste à faire. Notamment : quel projet Supabase viser, et pourquoi il y en a eu trois. Une seule section d'état, la plus récente — tout état plus ancien est à l'archive. |
| `docs/REGLES-INCIDENTS.md` | La **preuve datée** des règles ci-dessous : les incidents qui les ont écrites, leurs mesures, ce que chacune a coûté. **Ne se lit jamais en entier** — y venir au `grep` depuis la règle qui y renvoie, et seulement pour contester ou comprendre une règle, pas pour l'appliquer. |
| `docs/REPRISE-PIEGES.md` | Les pièges qui ont déjà coûté du temps, datés. **Ne se lit pas en début de session** : se consulte au moment de faire la chose risquée, ou après s'être cogné. Repérer au `grep`, lire le paragraphe. |
| `docs/REPRISE-ARCHIVE.md` | Les entrées closes de la page de reprise — tickets terminés, états mesurés remplacés, points de « La suite » rayés. Gardés pour leurs mesures datées. Quand une mesure d'ici contredit `REPRISE.md`, c'est celle d'ici qui a tort. |
| `docs/CONTEXTE.md` | Périmètre, persona, refus assumés, décisions d'architecture, état d'avancement. Avant toute modification du périmètre, des sources de données ou du noyau. |
| `docs/PLAN.md` | Backlog ordonné : ce qui est fait, les phases 2 à 4 en détail, les sources à brancher et pourquoi. Avant de commencer un chantier. |
| `docs/PLAN-ACTION-VACANCE.md` | Doctrine non négociable, backlog priorisé P0/P1/P2 en 8 vagues, catalogue des sources avec leurs pièges, ce que l'IA a le droit de faire. Complète `PLAN.md` sans le remplacer : celui-ci dit *quoi faire ensuite et dans quel ordre*, l'autre porte l'exécution technique. |
| `docs/PERIMETRE.md` | Le raisonnement long : les questions auxquelles Compass peut répondre, celles qui sont partielles, celles qui sont bloquées, et les contournements. Avant d'ajouter une source ou de discuter du positionnement. |
| `docs/BDCOM.md` | Pièges vérifiés de la source BDCom : coordonnées empilées, identifiant de local stable entre millésimes mais réattribué dans moins de 0,1 % des cas, périmètres et licences qui diffèrent selon le millésime. **Obligatoire avant toute migration touchant BDCom.** |
| `DIAGNOSTIC.md` | **Avant de corriger un bug.** Les défauts encore ouverts, et surtout **l'index des trente** : il dit, pour chaque numéro de section, son état et dans lequel des deux fichiers elle vit. Un renvoi « `DIAGNOSTIC.md` §N » écrit ailleurs se résout là. |
| `DIAGNOSTIC-CORRIGES.md` | Les défauts clos, numérotation d'origine conservée. **Ne se lit pas en entier** : l'index de `DIAGNOSTIC.md` dit quelle section ouvrir. Chaque section porte la mesure du défaut et celle du correctif — c'est ce qui permet de recouper une régression plus tard. |
| `mcp-server/PUBLISHING.md` | **Avant de publier le serveur MCP**, sur npm ou au registre. La suite exacte en PowerShell, les deux registres et pourquoi cet ordre, et le tableau des messages d'erreur avec leur cause réelle. |
| `README.md` | Ce que le produit fait, refuse de faire, et ne peut pas savoir. |

**Ces documents se lisent par section, pas en entier.** Repérer au `grep -n '^#'` ou sur un mot-clé,
puis lire la plage au `sed -n 'a,bp'`. Quatre dépassent encore 70 Ko — `DIAGNOSTIC-CORRIGES.md` 165,
`JOURNAL.md` 147, `PLAN-ACTION-VACANCE.md` 75, `PLAN.md` 74, mesurés le 31 août 2026 : une lecture
intégrale de l'un d'eux coûte plus que tout le reste d'une session. Le titre de section est l'unité
utile, et **les quatre plus gros ne se lisent jamais en entier** — deux d'entre eux ont un index ou
une table qui dit quelle section ouvrir.

Les deux fichiers lus à chaque session ont été découpés le 31 août : `REPRISE.md` de 89 à 35 Ko,
`DIAGNOSTIC.md` de 175 à 16 Ko. Ce qui en est sorti n'a pas disparu — voir les lignes ci-dessus.

## Environnement

Windows + PowerShell. La politique d'exécution bloque `npm.ps1` : **toujours écrire `npm.cmd`**.

```powershell
# Le code, à chaque session
npm.cmd install
npm.cmd run typecheck       # tsc --build, `scripts/` compris
npm.cmd run test            # vitest — inclut la règle des bras : un script npm neuf et non classé passe au rouge
npm.cmd run dev             # serveur de développement
npm.cmd run build           # production ; `prebuild` refuse de bâtir sans la configuration du front
npm.cmd run build:dev       # mode development — seul chemin qui charge lovable-tagger

# Les bras qui interrogent le distant. Lents, et c'est normal : ils attendent des miroirs publics.
npm.cmd run eval            # invariants, baselines, jeu doré, budget anon — ~5 min
npm.cmd run eval:anon       # ce qu'un visiteur sans clé atteint vraiment — ~5 s
npm.cmd run verify:mcp      # les six outils MCP contre le distant — 2 à 4 min
npm.cmd run freshness       # les huit sources et leurs cadences
npm.cmd run catalogue       # les 35 sources du catalogue : l'endpoint repond-il, la licence tient-elle
npm.cmd run porte:publie    # la page publiée porte-t-elle sa configuration
npm.cmd run ledger          # le ledger de migrations contre les migrations suivies par git
npm.cmd run avis            # les avis de securite npm contre leurs verdicts d'atteignabilite
npm.cmd run porte:sabotage  # demontre la porte : bras non planifie, rouge, panne amont

# Le serveur MCP publié — voir mcp-server/PUBLISHING.md pour la suite complète
npm.cmd run mcp:paquet              # empaquette, installe hors du dépôt, parle MCP au binaire installé
npm.cmd run mcp:paquet -- --registre  # la même chose, sur ce que npm sert vraiment

# La file des sessions
npm.cmd run porte:etat      # les rouges ouverts et leur age, sans ouvrir GitHub — 0 aucun, 3 ouvert du jour, 1 en retard
npm.cmd run brief <ticket>  # assemble le prompt d'une session et ce qu'elle doit lire ; joue porte:etat tout seul
npm.cmd run sessions        # regenere le tableau d'ordre de docs/SESSIONS.md depuis GitHub
npm.cmd run sessions:check  # recoupe la table committee a l'etat GitHub, sort en 1 si elle a derive
```

**Si `vite` refuse de démarrer sur « Failed to load native binding ».** Le 26 août 2026, Windows
Smart App Control bloquait le binaire natif de `@swc/core` sur cette machine, et il n'a **ni
liste d'autorisation ni exception par fichier** : on ne peut pas lui faire accepter ce
fichier-là, et le désactiver est irréversible sans réinstaller Windows. **Depuis, le blocage a
disparu** — remesuré quatre fois, le 28 août, le 31 août et deux fois le 2 septembre 2026 :
`require('@swc/core').transformSync` rend du code, et `npm.cmd run build` / `npm.cmd run
build:dev` vont au bout en produisant des hashes identiques à `build:local`. **Ce qui se
remesure ici est l'identité des trois chemins, pas les hashes eux-mêmes** : ceux-ci bougent dès
qu'une dépendance ou une source bouge, et les recopier sans les redater est le piège que ce
fichier interdit ailleurs. Aux trois premières mesures : `index-DKJzmj15.js`,
`MapView-8C8F8Ymz.js`, `index-C7sT89I7.css`. À la quatrième, le 2 septembre après la montée
de `browserslist` en 4.28.8 et de `postcss-selector-parser` en 6.1.4 :
`index-z86I-NBQ.js`, `MapView-CcIGsnA-.js`, `index-CXVx5M-3.css` — les trois chemins
toujours d'accord entre eux. L'écart n'est pas attribuable à la seule montée : le dépôt a aussi
reçu entre-temps le correctif de l'écran blanc (`2aaab7e`), qui touche l'environnement de
build. Rien
n'explique la disparition — pas de changement connu de la politique Smart App Control entre
les dates — donc le blocage peut revenir.
Un second chemin de build reste en place pour ce cas, sans SWC :

```powershell
npm.cmd run dev:local        # serveur de dev
npm.cmd run build:local      # production
npm.cmd run build:dev:local  # mode development
```

Ils lisent `vite.config.local.ts`, volontairement séparé de `vite.config.ts` que Lovable
réécrit — même raison que `vitest.config.ts`. Le 26 août, ils ne remplaçaient pas les portes
d'origine à l'identique : le bundle produit divergeait de celui de SWC. Depuis le 28 et le 31
août, les deux chemins rendent le même bundle — mais si Smart App Control se remet à bloquer
SWC, cette divergence peut revenir sans préavis. Les deux fichiers doivent rester en phase — un
plugin ajouté à l'un appartient à l'autre.

Après toute montée de `vite`, lancer **les deux** builds : `build` construit en mode production,
où `lovable-tagger` n'est pas monté, et laisserait donc une panne du lien Lovable invisible.

## Règles qui coûtent cher si on les ignore

- **Le loyer de l'encadrement parisien ne concerne que le logement.** Ne jamais le multiplier
  par une surface, ne jamais le présenter comme un loyer commercial, ne jamais filtrer dessus.
  Contexte complet dans `docs/CONTEXTE.md`.
- **`src/core/` reste pur** : aucun `fetch`, aucun React, aucun DOM, aucun Leaflet. C'est ce qui
  permet de le tester et de l'exposer plus tard en MCP.
- **Un chiffre affiché porte sa source.** Le type `Measured<T>` rend la règle mécanique.
- **Les formules de `src/core/scoring.ts` sont publiées** sur `src/pages/Methodology.tsx`. Toute
  modification de l'une exige la mise à jour de l'autre.
- **Lovable synchronise ce dépôt dans les deux sens.** Ne pas éditer les mêmes fichiers des deux
  côtés dans une même session. `git pull` avant de commencer, fusionner sa proposition avant de
  rouvrir Lovable.
  Ne pas toucher `.lovable/`.
- **Un rouge de la porte se corrige dans le bras, jamais dans le rapport.** Depuis le 31 août
  2026 les bras de `.github/workflows/porte.yml` tournent seuls chaque matin et un rouge
  ouvre une issue. **Le nombre n'est pas écrit ici volontairement** : il disait « dix » le
  5 septembre alors que `#73` en avait ajouté un onzième, et il aurait rouillé de nouveau au
  douzième. Le fichier le dit, et lui ne se trompe pas. Le rapport ne lit que le code de sortie — 0, 3, 1, 2 — et jamais le texte :
  la seule place légitime pour décider qu'une chose cesse d'être un échec est
  `scripts/eval/upstream.ts`, dans le bras qui tient l'erreur et son `code`. Assouplir le
  rapport éteindrait les alertes là où personne ne le verrait. Corollaire mécanique : un script
  ajouté à `package.json` fait échouer `test` tant qu'il n'est ni planifié ni justifié dans
  `scripts/porte/cadence.json`.
- **Une source du catalogue porte sa vérification, et c'est encore la même règle** — `#73`,
  le 5 septembre 2026. Toute ligne du tableau « Catalogue des sources » de
  `docs/PLAN-ACTION-VACANCE.md` doit avoir une sonde dans `scripts/porte/catalogue.json`, ou
  une raison écrite de ne pas en avoir ; sinon `test` échoue. Les statuts `refusée` et
  `écartée` sortent de la population : un refus est une décision, pas une panne à surveiller.
  Et **une sonde épingle un endpoint, jamais la page du portail qui en parle** — recouper une
  page par une autre page ne recoupe rien.
- **Un appelant de PostgREST déclare l'échappement d'observabilité** — `#81`. Tout fichier qui
  construit un client Supabase ou nomme `/rest/v1/` doit poser `x-compass-observabilite: off`
  (ou `COMPASS_OBSERVABILITE=off` pour un processus fils), ou porter sa raison dans
  `sans-echappement` de `scripts/porte/observabilite.json` ; sinon `test` échoue. **Les
  brouillons ignorés comptent** — la règle balaie aussi `scripts/tmp-*.ts`. **Ce que ça ne
  rattrape pas** : elle vérifie qu'un fichier *déclare* l'échappement, jamais qu'il l'*applique*.
  Pourquoi, et ce que `#72` avait mesuré : `docs/REGLES-INCIDENTS.md`.

- **Une migration posée est comparée à celle que le dépôt suit** — `#82`. `npm.cmd run ledger`
  compare `supabase_migrations.schema_migrations` aux fichiers **suivis par git**, dans les deux
  sens et **corps compris** : posée et non suivie est un rouge, suivie et non posée un simple
  signal. Une divergence non consignée dans `corps-diverge` de `scripts/porte/ledger.json`, avec
  sa raison, ses deux empreintes et **le commit qui a réécrit le fichier**, est un rouge.
  **Corollaire** : ne jamais réécrire une migration déjà posée, même sans toucher au SQL.
  **Ce que ça ne rattrape pas** : un schéma modifié à la main sur le distant.
  Les incidents fondateurs : `docs/REGLES-INCIDENTS.md`.

- **Une source d'ingestion aussi porte sa cadence, et c'est la même règle** — `#70`, le
  1er septembre 2026. Une source insérée dans `ingestion_run` par une migration doit avoir son
  entrée `cron` dans un workflow planifié, ou sa raison écrite dans le bloc `sources` de
  `scripts/porte/cadence.json` ; sinon `test` échoue. Et une tolérance de
  `scripts/ingest/lib/cadence.ts` ne se monte **jamais** pour éteindre un « EN RETARD » : le
  seuil dit depuis quand on n'a pas vérifié, le monter ne rafraîchit rien.
- **Un rouge de la porte se lit au démarrage d'une session, pas dans une notification** — `#77`.
  `npm.cmd run porte:etat` dit les rouges ouverts et leur âge, et `npm.cmd run brief` le joue
  tout seul. L'escalade par le titre est aux paliers **2 et 7 jours**, jamais quotidienne.
  **Ce que ça ne rattrape pas** : une semaine sans session reste une semaine sans lecteur.
  La mesure qui l'a établi : `docs/REGLES-INCIDENTS.md`.

- **Corriger une donnée n'est pas corriger un défaut.** Avant de déclarer un défaut réglé,
  répondre à deux questions et **écrire les réponses** : est-ce que ça survit à un
  rechargement — si un chargeur, une migration ou un import peut réintroduire l'état fautif,
  le correctif est provisoire ; et est-ce que ça protège un consommateur qui n'existe pas
  encore — une garde sur le chemin de l'écran laisse passer l'agent qui appelle PostgREST en
  direct. Si les deux réponses ne sont pas oui, il reste un invariant, une contrainte ou un
  test à écrire, et **c'est lui le livrable, pas la ligne réparée**. Dire aussi ce que la règle
  ne rattrape pas : elle a toujours une limite. Née du pont NAF (`DIAGNOSTIC.md` §20), réparé
  dans ses lignes le 25 août sans que rien n'empêche qu'il redevienne faux ; déplacée ici
  depuis le prompt commun le 6 septembre, parce qu'une doctrine se charge à chaque session
  quand une procédure se colle.
- **`main` refuse la poussée directe : une session, une branche, une proposition.** Décidé par
  Ivan le 6 septembre 2026. `git switch -c ticket/<ID>`, puis `gh pr create` et `gh pr merge
  --squash --delete-branch` — **aucune approbation n'est requise**, la session fusionne
  elle-même : c'est la trace qui est exigée. `.github/workflows/pr.yml` rejoue `typecheck` et
  `test`, et pas le reste : `porte.yml` détient la chaîne privilégiée et le dépôt est public.
  **La revue est distincte de la proposition** et ne vaut que pour les tickets qui la méritent —
  ses signes et son prompt sont dans `docs/SESSIONS.md`. Pourquoi ce renversement :
  `docs/REGLES-INCIDENTS.md`.

- **Ne jamais `git add -A` dans ce dépôt : stager par nom.** Des sessions parallèles et
  Lovable écrivent dans le même arbre, donc un balayage revendique du travail qui n'est pas le
  sien. C'est arrivé deux fois. `.githooks/pre-commit` refuse un commit qui **ajoute** des
  fichiers, sauf `COMPASS_AJOUTS=1`. **Ce que ça ne rattrape pas** : la *modification* d'un
  fichier suivi faite par une autre session. Les deux incidents, leurs mesures et le symétrique
  du commit qui annonçait une règle non stagée : `docs/REGLES-INCIDENTS.md`.

- **Un avis de sécurité se juge sur son atteignabilité, jamais sur son score** — `#105`.
  `npm.cmd run avis` refuse tout avis que npm rapporte sans verdict écrit dans
  `scripts/porte/avis.json` : sa raison, sa date, et **la condition qui l'annulerait**. Un CVSS
  est calculé sans rien savoir d'ici. **Ne jamais lancer `npm audit fix --force`** : il vise la
  dernière majeure, jamais la plus petite version qui suffit — celle-là est la **borne haute de
  la plage vulnérable**, et le bras imprime les deux. Même exigence avant d'ajouter une
  dépendance, sans s'en remettre au modèle : sa connaissance s'arrête à une date. **Ce que ça ne
  rattrape pas** : le registre dit qu'un verdict *existe*, jamais qu'il est *vrai*, et il ne
  voit que ce que npm publie. Les incidents : `docs/REGLES-INCIDENTS.md`.
- **Un correctif consigné porte sa source, comme un chiffre affiché.** Écrire d'où vient un
  numéro rend l'erreur repérable — même exigence que `Measured<T>`, appliquée à la
  documentation. Deux clauses : **une documentation n'est pas une mesure** — citer la base, le
  ledger, le fichier, jamais la page qui en parle ; et **un chiffre mesuré porte sa date**,
  donc **remesurer avant de recopier**. Ce que chacune a coûté : `docs/REGLES-INCIDENTS.md`.

## Style

Commentaires en anglais dans le code, documentation produit en français. Un commentaire explique
*pourquoi*, pas *quoi*.
