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

`.env.local` existe, et **tout y est juste sauf le mot de passe**.
`connectionTarget()` dans `scripts/ingest/lib/db.ts` affiche la cible sans jamais
montrer le secret : **s'en servir avant tout chargement**.

La région est `eu-north-1` (Stockholm), donnée par Lovable et **vérifiée** le
10 août. L'hôte du fichier a été corrigé en conséquence.

| Cible | Réponse |
| --- | --- |
| `aws-0-eu-west-3.pooler.supabase.com:5432` (hôte d'origine) | `XX000 tenant/user postgres.nwnhhvogwrzstslxtxca not found` |
| `aws-1-eu-west-3.pooler.supabase.com:5432` | même refus |
| `db.nwnhhvogwrzstslxtxca.supabase.co:5432` (direct) | enregistrement **AAAA seul**, machine sans IPv6 → `ENOTFOUND` |
| `https://nwnhhvogwrzstslxtxca.supabase.co/rest/v1/` | 401 avec `sb-project-ref` renvoyé — **le projet est vivant** |
| **`aws-0-eu-north-1.pooler.supabase.com:5432`** | **`28P01 password authentication failed`** |

Ce dernier changement d'erreur est le résultat utile : passer de `XX000` à
`28P01` prouve que **le tenant est trouvé**. Hôte, port, rôle et chemin IPv4
sont donc validés. Le pooler eu-north-1 répond en IPv4 : ni option payante, ni
`db.<ref>.supabase.co`, ni IPv6 nécessaires.

**Il ne reste qu'une inconnue : le mot de passe.** Celui du fichier vient d'un
autre projet et n'a jamais été bon — il n'avait simplement jamais pu être
testé, le refus de tenant arrivant avant l'authentification.

Lovable ne peut pas *lire* le mot de passe : sur Lovable Cloud ni l'agent ni
l'interface n'y ont accès. Mais il peut le **réinitialiser** — c'est une action
de propriétaire, et Lovable est propriétaire du projet. Ne pas redemander « le
mot de passe » (question sans réponse possible), demander **une rotation**.

Le balayage de plusieurs régions à la suite avec le mot de passe **est bloqué par
la politique d'exécution** — cela ressemble à un essai de connexions en série.
Tester une cible à la fois.

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

Donc : la chaîne visée est
`postgres.nwnhhvogwrzstslxtxca@aws-0-eu-north-1.pooler.supabase.com:5432`, port
**5432** et non 6543 — le pooler en mode transaction casse les tables
temporaires dont les chargeurs se servent. Elle est déjà dans `.env.local` ;
seul le mot de passe reste à y remplacer.

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

1. **L'hôte de connexion** (voir le tableau plus haut), puis migrations et
   chargement sur Lovable Cloud, puis la porte contre l'instance distante. Une
   vingtaine de minutes une fois la chaîne en main.
2. **Message à l'APUR** — rédigé, à envoyer le lundi 10 août. Il décide si 2017 et
   2020 sortent publiquement, et si le service `bdcom20032020` (sept couches de
   2003 à 2020, vacants compris) est utilisable — ce qui porterait l'historique de
   six à vingt ans.
3. ~~**Corriger `?? 0`** dans `src/services/opendata/scoring.ts`.~~ **Fait le
   9 août.** L'absence remonte maintenant jusqu'à l'interface : `AreaScores` et
   `NoiseEstimate` sont nullables, la carte affiche « n/d » et un point gris
   plutôt qu'un rouge qui se lirait comme une mauvaise note, et un score inconnu
   n'exclut plus un local du filtre — l'exclure reviendrait à affirmer qu'il est
   hors bornes. Couvert par `src/services/opendata/scoring.test.ts`.

   **Suite, le même jour, un cran plus bas.** Le chemin nul câblé jusqu'à
   l'interface était correct mais inatteignable : le noyau n'émettait jamais de
   valeur nulle, et un `saturating(0, n)` valait 0 — donc une couche absente
   produisait un zéro *mesuré*. Deux correctifs :

   - `NeighbourhoodContext.loaded` (obligatoire) déclare les couches réellement
     chargées. Un tableau vide ne tranche pas entre « rien ici » et « rien reçu » ;
     seul l'appelant le sait, et le noyau reste pur en refusant de deviner.
     `scoreLocation` rend `unavailable()` par couche manquante, y compris pour les
     composites qui lisent deux couches.
   - **Le défaut réellement atteignable en production était ailleurs** : Overpass
     répond **HTTP 200** avec `elements: []` et un `remark` quand sa requête expire.
     Le `validate` l'acceptait. Tous les scores tombaient à 0 et le bruit devenait
     « très faible » — une rue calme affirmée à partir d'une panne. Voir
     `DIAGNOSTIC.md` §3.e.

   `src/pages/Methodology.tsx` publie désormais la règle, section « Quand une
   source manque » (règle de `CLAUDE.md` : formule modifiée, page mise à jour).
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
