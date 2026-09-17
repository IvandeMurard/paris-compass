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

