# Reprise — état au 9 août 2026, fin de session

À lire en premier après `CLAUDE.md`. Décrit ce qui tourne, ce qui bloque, et ce
qui n'est écrit nulle part ailleurs. Le reste du contexte est dans `docs/PLAN.md`
(backlog, décisions produit), `docs/BDCOM.md` (pièges de la source) et
`eval/FAILURE_MODES.md` (le contrat d'évaluation).

---

## Ce qui existe et fonctionne — en local uniquement

Vingt-et-une migrations appliquées sur une base locale (`npx.cmd supabase start`),
quatre sources chargées, la porte d'évaluation au vert.

| | Volume |
| --- | --- |
| Relevés BDCom 2017 / 2020 / 2023 | 84 031 / 83 399 / 60 845 |
| Locaux distincts | 85 418 |
| Quartiers / tronçons de voie | 80 / 25 094 |
| Avis BODACC (cessions + procédures) | 43 057 + 120 285 |
| Établissements SIRENE géolocalisés | 68 672 |

```powershell
npm.cmd run eval      # 10 invariants, 24 baselines, 8 cas dorés — environ 2 min
```

Les fonctions exposées : `compass_premises_within`, `compass_scoring_context_within`,
`compass_premise_history`, `compass_street_rotation`, `compass_bodacc_within`,
`compass_address_timeline`, `compass_vintages`. Toutes prennent **un point et un
rayon**, jamais une bbox.

---

## Le point bloquant, unique

**Rien n'a jamais été poussé ni chargé sur une instance distante.**

Il manque `.env.local` à la racine, contenant `DATABASE_URL`. Le fichier a été
demandé plusieurs fois et n'est jamais arrivé sur le disque. Sans lui, les
scripts retombent silencieusement sur la base locale — `connectionTarget()` dans
`scripts/ingest/lib/db.ts` affiche la cible sans jamais montrer le mot de passe,
**s'en servir avant tout chargement**.

### Le nœud Supabase, à ne pas redécouvrir

Trois références ont circulé. Deux sont mortes.

| Référence | Ce que c'est | Accès |
| --- | --- | --- |
| `nwnhhvogwrzstslxtxca` | Backend **Lovable Cloud**, provisionné dans l'organisation de Lovable. Porte l'auth, les comptes, les tables utilisateur. C'est ce que `config.toml` contient. | **aucun** — absent du compte Supabase d'Ivan |
| `dbefhvmyfmmhjeetdddu` | Projet *paris-compass* créé à la main par Ivan. Actif, **totalement vide** — zéro table, zéro migration. | complet |
| `pulfdlztjbkgydmyrkfy` | Projet *ComparaCourse*, **sans rapport**. `config.toml` pointait dessus jusqu'au 9 août. | — |

**Décision prise : viser Lovable Cloud.** Les données et l'authentification
doivent vivre dans le même projet, parce que le front appellera les fonctions
avec la clé anonyme et que la règle de licence dépend du rôle porté par le jeton.

Donc : récupérer la chaîne de connexion côté Lovable, vérifier qu'elle contient
bien `nwnhhvogwrzstslxtxca` et non `dbefhvmyfmmhjeetdddu`, port **5432** et non
6543 — le pooler en mode transaction casse les tables temporaires dont les
chargeurs se servent.

---

## Décisions qui ne se déduisent pas du code

**Quatre niveaux de fiabilité, calculés et jamais saisis** : `etabli`,
`corrobore`, `probable`, `indetermine`. Pas de score sur 100 — un pourcentage de
confiance serait le chiffre invérifiable que le produit refuse. La règle est dans
`docs/PLAN.md` §2.5.

**La composition de fiabilité est la métrique de qualité.** 51,6 % établi,
5,9 % corroboré, 36,5 % probable, 6,0 % indéterminé. S'améliorer veut dire
déplacer ces quatre nombres vers la gauche ; chaque source branchée se juge à ça.
Le résidu de 36,5 % est **structurel** : BODACC nomme une adresse, BDCom un
local, et 69 % des locaux partagent leur numéro. Aucune donnée publique ne dira
laquelle des huit vitrines a été vendue.

**Le récit se génère, il ne se rédige pas.** `compass_address_timeline` existe
parce que deux erreurs ont été commises **dans la prose et non dans la base** :
une année sans relevé rendue par « pas un commerce », et un prix d'exemple pris
sur un autre local. Un appelant qui affiche cette table ne peut plus affirmer ce
que la donnée ne dit pas. Ne jamais retaper une chronologie à la main.

**Exposition publique limitée au millésime ODbL.** 2017 et 2020 portent une
licence non lue ; un appelant anonyme reçoit `withheld = true`, jamais le contenu
et jamais l'absence. Une ligne de `bdcom_vintage.publicly_redistributable`
bascule quand l'APUR répond.

---

## Pièges qui ont coûté du temps aujourd'hui

**Une politique RLS n'est pas un `GRANT`.** Toutes les migrations ont d'abord été
écrites sans droit de lecture : les fonctions échouaient pour un visiteur avant
qu'aucune politique ne soit consultée. Corrigé en `20260809000009`.

**Dans une fonction `SECURITY DEFINER`, `current_user` est le propriétaire.**
Tester le privilège avec lui conclut toujours « privilégié ». Il faut lire le
rôle que PostgREST met dans `request.jwt.claims`.

**Le chemin privilégié réussit toujours.** Les trois défauts d'exposition n'ont
été trouvés qu'en jouant le chemin **anonyme**. Le lanceur d'évaluation sait le
faire : marqueur `-- @as anon` dans `eval/invariants.sql`.

**`TRUNCATE ... CASCADE` sur une table de référence vide la table qui la
référence.** Le chargeur de géographie a effacé les 85 418 locaux avant d'être
corrigé ; seule la transaction a sauvé le chargement.

**Docker Desktop qui se coince** laisse le port ouvert mais tue la poignée de
main. `docker restart` du seul conteneur de base recrée la liaison sans toucher
au volume — ne pas faire `supabase stop`, plus risqué pour les données. Si le
démon lui-même ne répond plus : `wsl --shutdown`, puis relancer Docker Desktop.

**Le terminal d'Ivan est PowerShell 5.1**, pas 7 : ni `&&`, ni `grep`, ni `ls -l`.
Et `npm.ps1` est bloqué — toujours `npm.cmd` et `npx.cmd`.

---

## La suite, par ordre

1. **`.env.local`**, puis migrations et chargement sur Lovable Cloud, puis la
   porte contre l'instance distante. Une vingtaine de minutes.
2. **Message à l'APUR** — rédigé, à envoyer le lundi 10 août. Il décide si 2017 et
   2020 sortent publiquement, et si le service `bdcom20032020` (sept couches de
   2003 à 2020, vacants compris) est utilisable — ce qui porterait l'historique de
   six à vingt ans.
3. **Corriger `?? 0`** dans `src/services/opendata/scoring.ts` lignes 75-82 et 89.
   Un score absent y devient zéro, ce que `src/core/provenance.ts` interdit
   explicitement. Défaut ouvert depuis la phase 1.
4. **Remonter la provenance dans l'interface**, côté Lovable. Débloque le dossier
   exportable (§2.6) et le serveur MCP (§4.1).

---

## Ce qu'il ne faut pas faire

Ne pas appliquer de migration sur une instance distante **sans avoir vérifié la
référence du projet visé** — deux heures ont été perdues à cause d'un
`config.toml` qui pointait vers un projet sans rapport.

Ne pas publier un chiffre par métier groupé sur le champ texte de BODACC : c'est
du texte libre où « Restauration rapide » et « Restauration rapide. » sont deux
catégories. Le code BDCom à 224 postes fait foi.

Ne pas committer de sauvegarde de base : le dépôt est **public**. Le `.gitignore`
couvre désormais `*.backup*`, `*.dump`, `db_cluster-*`.
