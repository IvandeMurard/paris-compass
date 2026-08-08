# Compass

Carte des locaux commerciaux parisiens replacés dans leur environnement, à partir de données
publiques ouvertes. React 18 + TypeScript + Vite, Leaflet, TanStack Query, Supabase.

## Documents à lire selon le sujet

Volontairement **non importés** ici : ce fichier est chargé à chaque session, eux non. Les lire
à la demande.

| Fichier | Quand le lire |
| --- | --- |
| `docs/CONTEXTE.md` | Périmètre, persona, refus assumés, décisions d'architecture, état d'avancement. Avant toute modification du périmètre, des sources de données ou du noyau. |
| `docs/PLAN.md` | Backlog ordonné : ce qui est fait, les phases 2 à 4 en détail, les sources à brancher et pourquoi. Avant de commencer un chantier. |
| `docs/PERIMETRE.md` | Le raisonnement long : les questions auxquelles Compass peut répondre, celles qui sont partielles, celles qui sont bloquées, et les contournements. Avant d'ajouter une source ou de discuter du positionnement. |
| `docs/BDCOM.md` | Pièges vérifiés de la source BDCom : coordonnées empilées, identifiant de local stable entre millésimes mais réattribué dans moins de 0,1 % des cas, périmètres et licences qui diffèrent selon le millésime. **Obligatoire avant toute migration touchant BDCom.** |
| `DIAGNOSTIC.md` | Défauts identifiés dans le code, dont certains encore ouverts. Avant de corriger un bug. |
| `README.md` | Ce que le produit fait, refuse de faire, et ne peut pas savoir. |

## Environnement

Windows + PowerShell. La politique d'exécution bloque `npm.ps1` : **toujours écrire `npm.cmd`**.

```powershell
npm.cmd install
npm.cmd run typecheck   # tsc --noEmit
npm.cmd run test        # vitest
npm.cmd run dev
```

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
  le build.

## Style

Commentaires en anglais dans le code, documentation produit en français. Un commentaire explique
*pourquoi*, pas *quoi*.
