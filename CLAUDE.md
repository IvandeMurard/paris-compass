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
| `docs/REPRISE.md` | **À lire en premier en début de session.** Où en est le travail, ce qui bloque, et les pièges qui ont déjà coûté du temps. Notamment : quel projet Supabase viser, et pourquoi il y en a eu trois. |
| `docs/CONTEXTE.md` | Périmètre, persona, refus assumés, décisions d'architecture, état d'avancement. Avant toute modification du périmètre, des sources de données ou du noyau. |
| `docs/PLAN.md` | Backlog ordonné : ce qui est fait, les phases 2 à 4 en détail, les sources à brancher et pourquoi. Avant de commencer un chantier. |
| `docs/PLAN-ACTION-VACANCE.md` | Doctrine non négociable, backlog priorisé P0/P1/P2 en 8 vagues, catalogue des sources avec leurs pièges, ce que l'IA a le droit de faire. Complète `PLAN.md` sans le remplacer : celui-ci dit *quoi faire ensuite et dans quel ordre*, l'autre porte l'exécution technique. |
| `docs/PERIMETRE.md` | Le raisonnement long : les questions auxquelles Compass peut répondre, celles qui sont partielles, celles qui sont bloquées, et les contournements. Avant d'ajouter une source ou de discuter du positionnement. |
| `docs/BDCOM.md` | Pièges vérifiés de la source BDCom : coordonnées empilées, identifiant de local stable entre millésimes mais réattribué dans moins de 0,1 % des cas, périmètres et licences qui diffèrent selon le millésime. **Obligatoire avant toute migration touchant BDCom.** |
| `DIAGNOSTIC.md` | Défauts identifiés dans le code, dont certains encore ouverts. Avant de corriger un bug. |
| `README.md` | Ce que le produit fait, refuse de faire, et ne peut pas savoir. |

## Environnement

Windows + PowerShell. La politique d'exécution bloque `npm.ps1` : **toujours écrire `npm.cmd`**.

```powershell
npm.cmd install
npm.cmd run typecheck   # tsc --build
npm.cmd run test        # vitest
npm.cmd run dev
npm.cmd run build       # production
npm.cmd run brief <ticket>  # assemble le prompt d'une session et ce qu'elle doit lire
npm.cmd run sessions    # regenere le tableau d'ordre de docs/SESSIONS.md depuis GitHub
npm.cmd run sessions:check  # recoupe la table committee a l'etat GitHub, sort en 1 si elle a derive
npm.cmd run build:dev   # mode development — seul chemin qui charge lovable-tagger
```

**Si `vite` refuse de démarrer sur « Failed to load native binding ».** Windows Smart App Control
bloque le binaire natif de `@swc/core` — mesuré le 26 août 2026, et il n'a **ni liste
d'autorisation ni exception par fichier** : on ne peut pas lui faire accepter ce fichier-là, et
le désactiver est irréversible sans réinstaller Windows. Un second chemin de build existe pour
ça, sans SWC :

```powershell
npm.cmd run dev:local        # serveur de dev
npm.cmd run build:local      # production
npm.cmd run build:dev:local  # mode development
```

Ils lisent `vite.config.local.ts`, volontairement séparé de `vite.config.ts` que Lovable
réécrit — même raison que `vitest.config.ts`. **Ils ne remplacent pas les portes d'origine** :
le bundle diffère de celui produit par SWC, et `build:dev:local` ne couvre pas ce pour quoi
`build:dev` existe (mesuré : `componentTagger()` ne change rien sur ce chemin). Les deux
fichiers doivent rester en phase — un plugin ajouté à l'un appartient à l'autre.

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
  côtés dans une même session. `git pull` avant de commencer, pousser avant de rouvrir Lovable.
  Ne pas toucher `.lovable/`.
- **Ne pas lancer `npm audit fix --force`** : cela remonterait des versions majeures et casserait
  le build. Et ne pas confondre ce que l'outil **propose** avec ce qui **corrige** : `audit fix
  --force` vise toujours la dernière majeure publiée, jamais la plus petite version qui suffit.
  Chercher celle-là — l'avis GitHub et les exports Socket la donnent — avant de conclure qu'une
  montée est hors de portée. Quatre jours ont été perdus sur un « correctif = vite 8 » qui était
  en réalité vite 6.4.3, trois majeures plus bas.
- **Vérifier les avis avant d'ajouter une dépendance**, et ne pas s'en remettre à ce que le
  modèle croit savoir : sa connaissance des vulnérabilités s'arrête à une date, les avis
  paraissent en continu. Une vulnérabilité ne disqualifie pas une bibliothèque à elle seule —
  juger d'abord si elle est **atteignable** dans ce produit, qui est un site statique sans
  serveur joignable. Les cinq avis de vite et vitest ne visaient que le serveur de développement.
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

## Style

Commentaires en anglais dans le code, documentation produit en français. Un commentaire explique
*pourquoi*, pas *quoi*.
