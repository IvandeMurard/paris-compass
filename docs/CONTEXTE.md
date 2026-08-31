# Compass — contexte produit et décisions

Document de référence. À lire avant de toucher au périmètre, aux sources de données ou au
noyau de scoring. Pas nécessaire pour un correctif d'interface isolé.

Voir aussi `DIAGNOSTIC.md` à la racine — défauts identifiés, dont certains encore ouverts.

---

## Ce qu'est le produit

Compass ne liste pas ce qui est à louer. L'utilisateur apporte une adresse — celle qu'un agent
lui a envoyée, celle du panneau vu hier — et Compass la replace dans son environnement à partir
de données publiques ouvertes, chaque chiffre traçable jusqu'à sa source et sa licence.

Quand il n'a pas d'adresse, Compass montre celles qui **se libèrent** : cessations
d'établissement, fonds en liquidation, locaux recensés vacants. En amont de l'annonce, jamais
en concurrence avec elle.

**Persona : le preneur.** Commerçant, restaurateur, artisan, franchisé, qui décide *où* ouvrir.
Une à trois fois dans sa vie professionnelle, sur un bail 3/6/9.

**Second ICP : l'agent.** Un LLM instruisant la même question via MCP. Même noyau, sortie JSON
avec chaîne de raisonnement.

**Pas le courtier.** Refus structurant. Portefeuille, comparaison en masse, couverture
nationale : tout cela alourdit le produit du preneur. Un courtier qui veut Compass prend l'API.

Une nuance sur l'export, parce que le mot recouvre deux gestes opposés. Sortir cinquante adresses
pour les trier est le geste du courtier, et il reste refusé. Sortir **une** adresse avec, pour
chaque chiffre, sa source, sa licence, son millésime et sa méthode, c'est la promesse de
traçabilité rendue transportable — et un bail 3/6/9 ne se décide pas seul : il passe par un
banquier, un comptable, un réseau de franchise. Ce dossier-là est au backlog (`docs/PLAN.md`
§2.6). La ligne se tient dans la structure : l'export part d'une fiche, jamais de la liste de
résultats, et il n'existe pas de bouton « exporter tout ».

## Les deux contraintes fondatrices

1. **Si un chiffre ne peut pas être re-dérivé depuis une source publique citée, il ne s'affiche
   pas.** Rendue mécanique par le type `Measured<T>` (`src/core/provenance.ts`) : un chiffre
   incapable de déclarer source, licence, date et méthode ne compile pas.
2. **Si deux locaux de la même rue obtiennent le même verdict, Compass n'a rien dit.** La maille
   utile est le tronçon de rue, pas l'arrondissement.

## Ce que le produit refuse

Pas un portail d'annonces. Pas un CRM. Pas d'estimation de loyer commercial. Pas de prévisionnel
de chiffre d'affaires. Pas de note globale sur 100 (les pondérations dépendent du métier). Pas de
couverture nationale — Paris intra-muros, puis Île-de-France. Pas de compte pour explorer.

Détail et contrepartie de chaque refus : section « What it does not do » du README.

---

## Un compte n'ouvre aucune donnée — tranché le 26 août 2026

**`authenticated` n'est pas un appelant privilégié.** Décidé par Ivan le 26 août 2026, sur
`w0-appelant` ([#58](https://github.com/IvandeMurard/paris-compass/issues/58)). Le privilège
reste au **rôle de service** et aux **connexions directes** — ceux qui *exploitent* Compass —
jamais à un compte créé sur le site.

La raison tient en une phrase : **créer un compte n'est pas une lecture de licence.** Les
millésimes BDCom 2017 et 2020 portent `publicly_redistributable = false` parce que la licence
APUR n'a pas été lue ; elle ne l'a pas été davantage pour un inscrit. Un partenaire sous accord
n'est pas un inscrit, et le jour où il y en aura un, ce sera une autre décision, écrite comme
celle-ci.

Décidée pendant qu'elle était gratuite : `auth.users` comptait **0 utilisateur**, mesuré le
26 août 2026 sur `dbefhvmyfmmhjeetdddu`. Le produit porte déjà `saved_properties` et
`saved_searches`, donc l'inscription est l'intention ; une fois ouverte, la même décision
retirerait des données à des gens qui les avaient.

**Révisable sur un seul événement** : une réponse de l'APUR autorisant la redistribution
([#49](https://github.com/IvandeMurard/paris-compass/issues/49)). Rien d'autre ne la rouvre.

Appliquée le 26 août par la migration `20260826000002`, qui est aussi la seule expression du
test : `public.compass_caller_is_privileged()`, appelée par les six fonctions qui retiennent.
Gardée par trois invariants — `I32` (le test n'existe qu'une fois), `I33` (un compte du site
n'est pas privilégié), `I34` (le rôle de service ne cesse pas de l'être) — et démontrée par
sabotage, `npm.cmd run eval:sabotage`. Le test est un **laissez-passer nominatif** et non une
liste noire : `= 'service_role'`, jamais `<> 'anon'`, pour que le prochain rôle de claim soit
retenu par défaut plutôt que privilégié par oubli.

Un futur palier MCP payant (`PERIMETRE.md` §10, réflexion non décidée) suivra le même patron :
une clé d'API n'est ni `anon` ni un compte site, et sa portée est **commerciale** (quota),
jamais **licence** — elle n'accorde pas ce que `compass_caller_is_privileged()` retient.

---

## Le piège à ne jamais refaire

L'encadrement des loyers parisien **ne concerne que le logement** et exclut explicitement les
locaux commerciaux et professionnels. Le code multipliait autrefois ce loyer de référence par la
surface d'un local pour produire un « loyer commercial estimé », qui filtrait ensuite les
résultats. Corrigé (voir `DIAGNOSTIC.md` §1).

La donnée reste utilisée, sous son vrai nom, dans `src/services/opendata/neighbourhood.ts` :
un signal de niveau de vie résidentiel, donc de zone de chalandise. **Jamais multipliée par une
surface. Jamais dans un contexte de prix. Ne filtre rien.**

Deux règles héritées de cette correction :

- La grille préfectorale découpe chaque quartier en **32 cases** (4 époques × 4 tailles ×
  meublé ou non), pour 80 quartiers. On en fait la **moyenne**, on n'en épingle jamais une
  seule : la composition est identique partout, donc la comparaison entre quartiers tient.
- Le **millésime est résolu à l'exécution** et affiché à côté du chiffre. Le jeu ouvert accuse
  un retard sur l'arrêté en vigueur — 2019 à 2025 disponibles en août 2026. On affiche l'écart,
  on ne le masque pas.

Il n'existe aucune donnée ouverte de loyers commerciaux en France. Les observatoires locaux des
loyers portent sur l'habitation ; l'ILC de l'INSEE est un indice de révision, pas un niveau.

---

## Architecture

### Règle de partage avec Lovable

> Lovable touche à ce qui se voit. Le local touche à ce qui se calcule.

Lovable : composants, mise en page, responsive, déploiement.
Local : ingestion, schéma et migrations, noyau de scoring, types, tests, MCP, docs.

Synchro GitHub bidirectionnelle. Ne jamais éditer les mêmes fichiers des deux côtés dans une
même session. `git pull` avant de commencer, pousser avant de rouvrir Lovable. Ne pas toucher
`.lovable/`.

### `src/core/` — le noyau

Pur : aucune dépendance à React, au DOM, à Leaflet ou à `fetch`. Consommé par le navigateur,
le test runner, et à terme le serveur MCP.

- `geo.ts` — géométrie et `GridIndex`. Toutes les constantes dérivent de `EARTH_RADIUS_M` :
  ne pas réintroduire de constante ellipsoïdale à côté d'une formule sphérique.
- `provenance.ts` — `Measured<T>`, méthodes `measured | modelled | derived | estimated`.
- `scoring.ts` — formules, rayons, pondérations. **Doivent rester synchronisées avec la page
  Méthodologie** (`src/pages/Methodology.tsx`).

`src/services/opendata/scoring.ts` n'est qu'un adaptateur : il traduit le snapshot Overpass vers
le noyau et déballe la provenance pour l'UI actuelle, qui attend encore des nombres nus.

### Contraintes de données

- Requête Overpass bornée par surface (`isBboxTooLarge` dans `useOpenData.ts`). Au-delà, on
  refuse et on le dit plutôt que de laisser pendre.
- L'index de scoring se construit **une fois par snapshot**, jamais par local.
- Quatre états distincts sur la carte : vue trop large, panne, lecture en cours, résultat vide.
  Un chargement ne doit jamais ressembler à un résultat.

---

## Où en est le travail

**Fait** — correction du loyer fabriqué, puis passage à la moyenne des 32 cases avec millésime
affiché ; déblocage de la carte et distinction des quatre états ; noyau pur avec provenance,
index spatial et 21 tests ; dépendances assainies (`react-leaflet` retiré car jamais importé,
`tsx`, `@types/leaflet`, `vitest` ajoutés).

**Suite (phase 2, socle de données)** — décision prise : **Supabase + PostGIS**.

1. Activer PostGIS, écrire les migrations, indexer en GiST, exposer des RPC prenant un point et
   un rayon (et non une bbox : c'est ce qui corrige le bug des scores dépendants du cadrage,
   `DIAGNOSTIC.md` §2). C'est aussi ce qui remplacera le rattachement au quartier par centroïde
   le plus proche par un vrai test d'appartenance au polygone.
2. `scripts/` devient un pipeline d'ingestion, un script par source, idempotent, versionné par
   millésime.
3. **BDCom (APUR)** en premier — 2017, 2020, 2023. Recensement de terrain de tous les locaux
   parisiens en rez-de-chaussée avec vitrine, nomenclature d'activité à 224 postes, tranches de
   surface. L'identifiant de local est stable d'un millésime à l'autre, donc trois millésimes
   donnent le **taux de rotation d'un local rapporté à celui de son tronçon de rue**, avec ses
   vies antérieures comme pièce justificative. C'est le différenciateur.

   Deux réserves qui font partie de la promesse, pas de ses notes de bas de page. La **vacance
   n'est mesurable que sur 2017 et 2020** — 7 853 puis 8 764 locaux vides ; le millésime 2023
   publié ne contient que les commerces, donc un local qui en disparaît n'est ni « vacant » ni
   « plus un commerce » : les deux sont des conclusions, et la couche n'en porte aucune — 75,9 %
   de ces locaux n'étaient déjà pas un commerce à leur dernier relevé, mesuré le 26 août 2026
   (`DIAGNOSTIC.md` §15). Et les **licences diffèrent** : ODbL pour 2023, licence
   personnalisée à lire pour 2017 et 2020, ce qui interdit d'annoncer ODbL pour BDCom en bloc.
4. Puis **Mobiliscope** (CNRS, ODbL) — population présente heure par heure par secteur ;
   **BODACC** (DILA, API libre) — prix des fonds de commerce et procédures collectives ;
   **PLU protections du commerce** (Ville de Paris) — contrainte binaire ; **validations IDFM**.

**Ensuite** — remonter la provenance dans l'UI, puis serveur MCP (`score_location`,
`compare_locations`, `explain_score`, `list_sources`), `llms.txt`, prompt d'installation.
