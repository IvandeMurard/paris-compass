# Règles — les incidents qui les ont écrites

Ce fichier porte la **preuve datée** des règles de `CLAUDE.md`, pas les règles elles-mêmes.
Il a été séparé le 7 septembre 2026 pour une raison mesurée : `CLAUDE.md` est chargé à chaque
session et était passé de 4 Ko le 23 août à 20 Ko le 7 septembre — cinq fois, en quinze jours.
La consigne doit se charger toute seule ; la preuve se lit quand on la conteste.

**Ne pas lire en entier.** Chaque section porte le titre de sa règle : y venir par `grep`
depuis la ligne de `CLAUDE.md` qui renvoie ici.

---

## Ne jamais `git add -A` dans ce dépôt : stager par nom.** Des sessions parallèles et

- **Ne jamais `git add -A` dans ce dépôt : stager par nom.** Des sessions parallèles et
  Lovable écrivent dans le même arbre, donc un balayage revendique du travail qui n'est pas le
  sien. C'est arrivé deux fois — `c861bac` le 26 août a emporté `.fn-dump/` et quatre
  `scripts/eval/_*.ts`, `ffe217c` le 5 septembre a emporté `scripts/tmp-nan.ts`, le brouillon
  d'une session en cours.

  **Mesuré après coup** : tous les chemins emportés étaient en statut `A`, l'ajout d'un fichier
  jusque-là non suivi, quand un commit ordinaire d'ici porte des `M`. Et un seuil de volume
  n'aurait rien vu — le second balayage faisait six fichiers, une taille banale.

  `.githooks/pre-commit` refuse donc un commit qui **ajoute** des fichiers, sauf accord
  explicite : `COMPASS_AJOUTS=1 git commit …`. `npm install` pose `core.hooksPath` par le
  script `prepare`, pour qu'un clone neuf hérite de la garde. **Ce que ça ne rattrape pas** :
  la *modification* d'un fichier suivi faite par une autre session — git enregistre ce qui a
  changé, jamais qui travaillait. Le stage par nom reste la règle ; le crochet ne retire que
  l'accident qui s'est produit deux fois.

  Symétrique et vérifié le 5 septembre : `be63054` annonçait dans son message une règle
  `.gitignore` restée **non stagée**. Un commit dit ce qu'il porte, pas ce qu'on voulait y
  mettre — relire `git diff --cached --name-only` avant de valider.

---

## `main` refuse la poussée directe : une session, une branche, une proposition.** Décidé par

- **`main` refuse la poussée directe : une session, une branche, une proposition.** Décidé par
  Ivan le 6 septembre 2026, et c'est l'inverse de ce qui valait depuis le 27 août. `git switch -c
  ticket/<ID>`, puis `gh pr create` et `gh pr merge --squash --delete-branch` — **aucune
  approbation n'est requise** (`required_approving_review_count: 0`), donc la session fusionne
  elle-même : c'est la trace qui est exigée, pas un goulot humain. `enforce_admins` est activé,
  sans quoi la règle ne s'appliquerait à personne — le seul compte du dépôt est administrateur,
  et la protection criait à chaque poussée sans jamais rien bloquer.

  `.github/workflows/pr.yml` rejoue `typecheck` et `test` sur chaque proposition. **Pas le reste,
  et pas par oubli** : `porte.yml` détient la chaîne privilégiée et son en-tête interdit
  `pull_request` parce que le dépôt est public. Les six autres bras restent sur `main`, chaque
  matin — une proposition qui les casserait serait vue le lendemain, et c'est le prix assumé de
  ne pas exposer la clé.

  **La revue est distincte de la proposition**, et elle ne vaut que pour les tickets qui la
  méritent — migration, `src/core/`, invariant ou bras, `P0`. Ses cinq questions et son prompt
  sont dans `docs/SESSIONS.md`.

---

## Une migration posée est comparée à celle que le dépôt suit, et c'est encore la même règle** —

- **Une migration posée est comparée à celle que le dépôt suit, et c'est encore la même règle** —
  `#82`, le 6 septembre 2026. `supabase_migrations.schema_migrations` contre les fichiers de
  `supabase/migrations/` **suivis par git** — pas ceux du disque : le 5 septembre le fichier était
  là, non suivi, et le distant a porté vingt-quatre heures un schéma que le dépôt ignorait sans
  qu'un seul des onze bras puisse le voir. `npm.cmd run ledger` les compare dans les deux sens et
  ils ne veulent pas dire la même chose : posée et non suivie est un schéma que personne ne peut
  reconstruire, donc un rouge ; suivie et non posée est du travail en vol, donc un simple signal.
  Il compare aussi les **corps** — le ledger garde `statements text[]` — et une divergence non
  consignée dans `corps-diverge` de `scripts/porte/ledger.json`, avec sa raison et l'empreinte de
  chaque côté, est un rouge. **Corollaire** : ne jamais réécrire une migration déjà posée, même
  sans toucher au SQL ; le ledger garde le texte du jour où elle est passée et la réécriture
  diverge de lui pour toujours — c'est arrivé deux fois le 25 août (`DIAGNOSTIC.md` §39). **Ce que
  ça ne rattrape pas** : un schéma modifié à la main sur le distant ne laisse aucune trace au
  ledger, et ce bras ne le verra jamais.

---

## Un appelant de PostgREST déclare l'échappement d'observabilité, et c'est encore la même

- **Un appelant de PostgREST déclare l'échappement d'observabilité, et c'est encore la même
  règle** — `#81`, le 6 septembre 2026. Tout fichier du dépôt qui construit un client Supabase ou
  nomme `/rest/v1/` doit poser `x-compass-observabilite: off` (ou `COMPASS_OBSERVABILITE=off`
  pour un processus fils), ou porter une raison écrite dans `sans-echappement` de
  `scripts/porte/observabilite.json` ; sinon `test` échoue. Pourquoi : `#72` a mesuré la porte se
  comptant elle-même — dix seaux sur un produit sans trafic, tous au même point — et un journal
  pollué par la porte ne se lit pas comme une panne, il se lit comme du trafic. **Les brouillons
  ignorés comptent** : la règle balaie aussi `scripts/tmp-*.ts`, parce qu'un brouillon qui pollue
  `question_tally` la pollue que git le suive ou non. **Ce que ça ne rattrape pas** : elle vérifie
  qu'un fichier *déclare* l'échappement, jamais qu'il l'*applique* à chaque appel, et un `curl`
  lancé hors du dépôt n'est vu par rien.

---

## Un rouge de la porte se lit au démarrage d'une session, pas dans une notification** — `#77`,

- **Un rouge de la porte se lit au démarrage d'une session, pas dans une notification** — `#77`,
  le 5 septembre 2026. Mesuré ce jour-là : la notification GitHub n'est pas absente — le dépôt
  est `subscribed` depuis le 27 juin et le fil d'inbox de `#74` existe — elle est **reçue et
  non lue**. `#74` a attendu 27 h ; le fil de `#78` était encore `unread` **après** que l'issue
  eut été trouvée et fermée. Ce qui déclenche une lecture, c'est une session. Donc
  `npm.cmd run porte:etat` dit les rouges ouverts et leur âge, et `npm.cmd run brief` le joue
  tout seul : au-delà d'un jour le rouge entre dans le prompt collé, en deçà il reste sur
  stderr. L'escalade par le titre est aux paliers **2 et 7 jours**, jamais quotidienne — une
  alerte qui prévient chaque matin du même défaut est celle qu'on finit par filtrer, et c'est
  déjà la règle de `scripts/porte/signal.ts`. **Ce que ça ne rattrape pas** : une semaine sans
  session reste une semaine sans lecteur, et rien ici ne fait lire un dépôt que personne
  n'ouvre.

---

## Un correctif consigné porte sa source, comme un chiffre affiché.** Écrire « vite 8 » dans une

- **Un correctif consigné porte sa source, comme un chiffre affiché.** Écrire « vite 8 » dans une
  documentation en fait la vérité du projet pour toutes les sessions suivantes, qui n'ont aucun
  moyen de la recouper. Écrire d'où vient le numéro rend l'erreur repérable. Même exigence que
  `Measured<T>`, appliquée à la documentation. Deux clauses, ajoutées le 24 août parce que la
  règle seule n'a pas suffi :
  - **Une documentation n'est pas une mesure.** Citer la base, le ledger, le fichier — jamais la
    page qui en parle. Le tableau « Écarts corrigés » de `docs/PLAN-ACTION-VACANCE.md` *citait*
    sa source, `docs/REPRISE.md`, et se trompait quand même : il recoupait une page contre une
    autre page. Une source qui est elle-même de la prose ne recoupe rien.
  - **Un chiffre mesuré porte sa date.** « Le ledger distant est à 24 migrations » était vrai le
    17 août, mesuré avant une poussée, et faux le 24 sans que rien ne l'annonce. Sans sa date, un
    chiffre juste devient faux en silence — et c'est un ticket entier qui part sur une prémisse
    périmée. **Remesurer avant de recopier.**


---

## Un avis de sécurité se juge sur son atteignabilité, jamais sur son score.

Deux incidents, à deux ans d'écart de méthode mais de la même famille : **l'outil a été cru sur
parole**.

**Le premier, « correctif = vite 8 ».** `npm audit fix --force` propose toujours la dernière
majeure publiée, jamais la plus petite version qui suffit. Une documentation a écrit que le
correctif d'un avis de vite était vite 8, donc hors de portée, donc à reporter. Il était vite
6.4.3, **trois majeures plus bas**. Quatre jours perdus. La leçon n'a pas tenu par la prose :
elle est désormais imprimée par le bras, à chaque passage, à côté de ce que npm propose.

**Le second, les six alertes du 9 septembre 2026.** Six alertes Dependabot sont tombées à la
même minute, sur trois paquets et deux manifestes :

| Alerte | Paquet | Score | Portée | Atteignable ? |
| --- | --- | --- | --- | --- |
| `#90` | js-yaml 4.3.1 | **High**, CVSS 7.5 | développement | non — YAML hostile, or `@eslint/eslintrc` ne lit que notre configuration |
| `#88` `#89` | vitest 3.2.7 | moderate, 5.9 | développement | non — serveur de développement, et le chemin non authentifié passe par `mockerPlugin` que ce dépôt n'utilise pas |
| `#85` `#86` `#87` | hono 4.13.2 | moderate, 5.3 à 6.5 | **exécution** | non — les trois visent le transport HTTP ; le serveur ne parle que `StdioServerTransport` |

**Ce que ce tableau démontre, et c'est la règle :** la seule notée **High** était la moins
inquiétante des six, et la seule de portée **exécution** — celle qui voyage, `hono` étant une
`dependencies` dure de `@modelcontextprotocol/sdk`, donc installée chez qui installe le paquet
publié — était notée *moderate*. **Un CVSS est calculé sans rien savoir du produit.** Il dit ce
que la faille fait au pire quelque part, jamais ce qu'elle atteint ici. Trier par score aurait
donné le mauvais ordre dans les deux sens.

**Et npm rejouait le premier incident dans le même écran.** Pour `#89`, `npm audit` annonçait
« *Will install vitest@5.0.0, which is a breaking change* » alors que la plage vulnérable disait
`>=2.1.0 <4.1.11` : le correctif réel était **4.1.11**, une majeure plus bas. Mesuré avant d'être
posé — 422/422 tests avant et après, `typecheck` propre, `vite` inchangé, build identique.

**Le défaut de fond n'était aucune des six.** Il n'y avait pas de `.github/dependabot.yml` : le
dépôt recevait des **alertes** et ne recevait jamais de **proposition**. Elles s'empilaient
jusqu'à arriver en paquet, ce qui est la forme que prend une alerte au moment où elle va être
ignorée — la même mécanique que `#71` refuse pour les bras de la porte.

**Pourquoi un bras et pas une consigne.** Corriger les six versions n'était pas corriger le
défaut : rien n'empêchait que le prochain lot arrive de la même façon et reparte non jugé. Le
livrable est donc l'invariant — `npm.cmd run avis`, treizième bras de `porte.yml` — qui exige un
**verdict écrit** par avis : sa raison, sa date, et la condition qui l'annulerait. Un verdict
sans condition est une opinion, et une opinion ne se recoupe pas six mois plus tard.

**Ce que ça ne rattrape pas**, et il faut le dire comme partout ailleurs ici :

- Le bras vérifie qu'un verdict **existe**, jamais qu'il est **vrai**. Même limite que la règle
  d'observabilité (`#81`), même raison : un registre tient de la prose. Le champ `invalideSi`
  réduit l'écart là où la raison repose sur un fait que le dépôt porte — le jour où
  `mcp-server/src/` monte un transport HTTP, les trois verdicts `hono` passent au rouge tout
  seuls — mais il ne le ferme pas.
- Il ne voit que ce que **npm publie**. Une faille sans avis publié lui est invisible, et un
  paquet compromis que personne n'a encore signalé aussi.
- Il ne dit rien du **délai**. Dependabot propose désormais chaque lundi ; personne ne garantit
  qu'une session lise le lundi. C'est la limite déjà écrite pour `#77` : une semaine sans session
  reste une semaine sans lecteur.

---

## Un bras qui COMPTE porte un témoin — corollaire de « un rouge se corrige dans le bras ».

`#142`, 13 septembre 2026. La règle mère dit qu'un bras décide et que le rapport n'interprète
pas. Ce corollaire dit ce qu'un bras doit prouver **avant** d'avoir le droit de décider.

**L'incident.** `w6-contexte` (`#119`) était sur `main` depuis le 11 septembre — deux
propositions, une revue, six étapes. Le 13, aucune de ses quatre routes n'était servie :
`/contexte/`, `/carte`, `/en/context/` et `/en/map` rendaient **zéro** occurrence dans 770 756
octets de JavaScript publié, pendant que `/methodologie` en rendait 6 et `/presentation` 4.
Treize bras étaient au vert, `porte:publie` compris — vert le 11 à 12:19, après les deux fusions.

**Ce n'était le défaut d'aucun bras.** `porte:publie` cherche une **configuration**, et son
en-tête l'écrit. Un bundle vieux de trois semaines porte la même référence Supabase qu'un bundle
d'aujourd'hui : il passe, légitimement. Le défaut est que **rien ne couvrait ce qu'il laisse** —
aucun bras ne recoupait le code servi au code fusionné. `DIAGNOSTIC.md` §32 avait déjà fait vivre
le produit dans cet angle mort ; l'angle était toujours là, une porte plus loin.

**Le témoin, et pourquoi il n'est pas une politesse.** Les **deux premières passes** du relevé
rendaient zéro sur les huit chaînes, **témoins compris**, parce qu'elles ne suivaient pas le
morceau à la demande. Publiées telles quelles, elles auraient dit « le site est vide » alors que
c'était la mesure qui l'était. Un chiffre seul ne distingue pas une **absence** d'un **instrument
cassé** — et les deux se ressemblent d'autant plus que le résultat est spectaculaire.

D'où la forme retenue : quand aucun jeton connu n'est trouvé, le verdict est `mesure cassée`,
**sortie 2 et non 1**. Démontré le 13 septembre contre un bouchon dont le morceau à la demande
répond 503 : le bras refuse de juger au lieu de crier que trente routes ont disparu.

**Le second refus : ne pas prouver ce qu'on ne peut pas prouver.** Une route ne prouve sa
présence que si son jeton ne vit pas dans celui d'une autre. `/presentation` est contenu dans
`/en/presentation` : le trouver dit qu'**une** des deux est arrivée, jamais laquelle. Ces routes
restent **témoins** et ne rougissent jamais — quinze des trente le 13 septembre. C'est la même
exigence que `Measured<T>` : dire ce qui a été mesuré, pas ce qui arrangerait.

**Ce que le bras a rendu le jour même, et c'est la meilleure démonstration de son utilité.** À
16:17 il sortait **vert** : les quatre routes étaient servies. Le site avait été republié entre
14:04 et 16:17. **La fenêtre s'est donc ouverte le 11 et refermée le 13, et personne n'aurait su
ni l'un ni l'autre.** Corriger les quatre routes n'aurait rien corrigé — elles s'étaient
corrigées toutes seules. C'est `CLAUDE.md` sur « corriger une donnée n'est pas corriger un
défaut », dans le cas où la donnée se répare pendant qu'on écrit le ticket.

**Un défaut trouvé en construisant, et gardé ici parce qu'il est instructif.** Le bras importait
`entryFrom` et `chunkNames` depuis `publie.ts`, qui joue son arme à l'import : `npm.cmd run
servi` **rejouait le dixième bras**, imprimait son verdict au-dessus du sien, et pouvait hériter
de son `process.exitCode`. Repéré en lisant la sortie, pas le code de sortie — elle était verte.
Les deux fonctions vivent maintenant dans `scripts/porte/bundles.ts`. Un bras qui hérite du
verdict d'un autre rapporte une chose que personne n'a mesurée.

**Ce que ça ne rattrape pas**, et il y a trois limites, pas une :

- Il prouve qu'une **route** est arrivée, jamais qu'un **comportement** est juste. Une route
  servie par du code faux passe au vert.
- Il ne dit pas **pourquoi** le déploiement n'a pas eu lieu. Le déploiement appartient à Lovable ;
  ce dépôt n'en voit que le résultat.
- **Il ne surveille qu'une catégorie de trace — les routes — et rien d'autre.** C'est la limite la
  plus large, et elle a d'abord été écrite trop étroite : « aveugle à ce qui ne laisse aucune
  trace textuelle dans un bundle minifié » se lit comme *tout littéral neuf serait attrapé*. Il ne
  le serait pas.

  **Mesuré le jour même, et c'est pour ça que la correction est ici plutôt que dans un ticket
  futur.** `#145` a ajouté à l'écran la chaîne `source injoignable` — un littéral, résistant à la
  minification, aussi mesurable qu'un chemin. Fusionné, la production a continué de servir
  l'ancien bundle, et le bras est resté **VERT** parce que le changement n'ajoutait aucune route.
  Le site publié affirmait toujours « Aucun dans 1 km » quand Géorisques tombait — donc qu'il n'y
  a aucun risque, alors que rien n'avait été mesuré. Mesure : `source injoignable` **0
  occurrence** dans 623 736 octets servis, contre `Aucun dans 1 km` **1**, témoins `/carte` **4**
  et `/contexte/` **3**.

  L'élargissement est **volontairement remis** à `#152`, et la raison compte autant que la limite :
  une liste de chaînes attendues tenue à la main est exactement ce que `#134` reproche ailleurs
  ici, et elle pourrirait à la première reformulation d'un libellé — un rouge sans défaut, donc un
  bras qu'on désarme. Ce qui mériterait sa place est une population **dérivée** comme les routes
  le sont de `src/App.tsx` : `src/i18n/ui.ts` tient déjà chaque chaîne visible dans une table
  typée. Tant que ce n'est pas conçu, la limite tient et s'écrit, plutôt que de se redécouvrir.
- Il reste par ailleurs aveugle à ce qui ne laisse **aucun** littéral : une correction de logique
  interne, un correctif de style, un changement qui ne crée aucune chaîne. C'était vrai dès le
  premier jet et ça le demeure — ce n'est simplement plus la limite la plus large.
