# Compass — plan de travail

> **Plan d'action vacance (août 2026).** Doctrine, backlog priorisé et tickets :
> [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).
> Ce fichier reste le backlog d'exécution technique (phases 0–6 déjà faites ou en cours).
> L'autre dit *quoi faire ensuite*, *dans quel ordre*, et *ce que la doctrine interdit*.
> Il porte des horizons (Q3 2026, Q4 2026, 2027) que ce fichier-ci s'est toujours refusé —
> les lire comme un ordre de passage, pas comme un engagement de date.

Backlog ordonné par dépendance, sans échéance. Lovable reste dans la boucle pour l'UI et le
déploiement. Contexte et décisions produit dans `docs/CONTEXTE.md`.

---

## Fait

**Phase 0 — rendre la démo montrable**

- Le loyer commercial fabriqué à partir d'une donnée d'habitation est supprimé, ainsi que le
  filtre de prix qui en dépendait. La donnée subsiste sous son vrai nom, moyennée sur les 32
  cases de la grille préfectorale, avec son millésime affiché.
- La carte distingue quatre états — vue trop large, panne de source, lecture en cours, résultat
  vide — là où un chargement s'affichait « 0 locaux ». Ouverture au zoom 16 sur Montorgueil,
  garde de surface sur la requête Overpass, réponse vide légitime distinguée d'une panne.
- README : promesse reformulée, persona, refus assumés, ce que le produit ne peut pas savoir.
- Dépendances : `react-leaflet` retiré (jamais importé, exigeait React 19 et empêchait
  `npm install`), `tsx`, `@types/leaflet` et `vitest` ajoutés.

**Phase 1 — sortir le calcul du front**

- `src/core/` pur : `geo.ts` (géométrie, `GridIndex`), `provenance.ts` (`Measured<T>`),
  `scoring.ts` (formules). Aucune dépendance à React, au DOM, à Leaflet ou à `fetch`.
- L'index spatial se construit une fois par snapshot au lieu d'une fois par local : le calcul
  quadratique qui figeait l'onglet a disparu.
- 21 tests, dont la cohérence de l'index avec un balayage brut et les deux cas de troncature.

~~**Reste ouvert** — la provenance est portée par les valeurs mais pas encore affichée dans
l'interface.~~ **Fait le 12 août** : l'adaptateur ne déballe plus `Measured<T>`, la décision
d'affichage vit dans `src/components/figureText.ts` (testée sans DOM), et chaque score porte
source, millésime et réserve à l'écran. Ce point était le prérequis commun de §2.6 et §4.1 —
**les deux sont donc débloqués**.

---

## Phase 2 — le socle de données

Décision prise : **Supabase + PostGIS**. Les jeux différenciants sont des fichiers volumineux,
pas des API à interroger depuis le navigateur — 83 000 lignes de BDCom ne se chargent pas côté
client.

**2.1 — Base spatiale.** Activer PostGIS, écrire les migrations, indexer en GiST, exposer des
RPC prenant **un point et un rayon**, pas une bbox. C'est ce changement qui corrige
structurellement le bug des scores dépendants du cadrage (`DIAGNOSTIC.md` §2) : on interroge un
voisinage, plus un rectangle d'affichage. Et c'est aussi ce qui remplace le rattachement d'un
local à son quartier par centroïde le plus proche par un vrai test d'appartenance au polygone.

> **Fait en local le 8 août 2026.** Six migrations dans `supabase/migrations/` : PostGIS isolé
> dans son schéma ; géographie de référence (quartiers en polygones, tronçons de voie) ;
> référentiel BDCom, où **chaque millésime porte sa licence et son périmètre comme donnée**, pas
> comme commentaire ; locaux et relevés, la géométrie stockée une seule fois ; cinq RPC, toutes
> point + rayon.
>
> Deux garanties mécaniques plutôt que documentaires : la comparaison à périmètre commun est le
> **comportement par défaut** — il faut demander explicitement la version trompeuse — et un local
> absent d'un millésime renvoie « je ne sais pas », jamais « il a changé », parce que la donnée ne
> distingue pas une fermeture d'une sortie de périmètre.
>
> **Rien n'est appliqué sur l'instance Lovable.** L'activation de PostGIS là-bas est un « oui plus
> tard » explicite, à demander avant de l'exécuter.
>
> **Clos le 8 août 2026.** 80 quartiers et 25 094 tronçons de voie chargés, et les 85 418 locaux
> rattachés aux deux : 85 403 ont leur quartier par appartenance au polygone — le centroïde le
> plus proche a disparu — et 84 459 leur tronçon par le nom de rue.
>
> Le rattachement à la rue se fait **par le nom d'abord, la géométrie ensuite**. Le plus proche
> tronçon seul se trompe aux angles : un local du 1 rue de Rivoli est souvent plus près de l'axe
> de la rue perpendiculaire que du sien. Le nom décide donc de la rue, la distance ne décide que
> du tronçon.
>
> 925 locaux (1,1 %) n'ont pas de correspondance par le nom et sont rattachés par proximité, dans
> 40 mètres. Ce ne sont pas des erreurs de saisie : **Paris a renommé ces rues depuis le relevé**,
> en rendant leur prénom aux femmes honorées — « rue de Rochechouart » est devenue « rue Marguerite
> de Rochechouart », « rue Rodier » est devenue « rue Claude Rodier ». Les deux méthodes sont
> distinguées par la colonne `street_match`, jamais confondues. 34 locaux n'ont aucun tronçon et
> 15 aucun quartier : ils restent nuls plutôt que rattachés au hasard.

**2.2 — `scripts/` devient un pipeline d'ingestion.** Un script par source, idempotent, avec
journal de millésime : télécharger, normaliser, charger.

> **Fait pour BDCom le 8 août 2026.** `scripts/ingest/` — un lecteur ArcGIS paginé, un accès
> Postgres, et `bdcom.ts` qui charge les trois millésimes. `npx.cmd tsx scripts/ingest/bdcom.ts`,
> environ trois minutes.
>
> Idempotent : le staging est vidé par millésime, la promotion fait un upsert sur des clés que la
> source garantit, et **le chargement entier tient dans une transaction** — un recensement à
> moitié chargé est pire que pas de recensement, puisque rien en aval ne peut distinguer « absent »
> de « pas encore chargé ». Un contrôle de complétude refuse de valider si le nombre de relevés
> promus diffère du nombre de lignes lues.

> **Traité le 25 août par `w0-cron` (#6), et les deux points ci-dessous sont un seul chantier
> avec lui** — le ticket les redisait mot pour mot. Ce qui est posé : la table générique
> `ingestion_run`, la fonction `compass_source_freshness()`, les quatre chargeurs qui
> l'écrivent, et `.github/workflows/ingestion.yml` avec **quatre cadences distinctes**. Ce qui
> ne l'est pas : aucun cron n'a encore tourné, le secret de dépôt restant à poser. Détail et
> mesures dans `docs/tickets/w0-cron.md`.
>
> Deux choses trouvées en rejouant les chargeurs, qui ne se déduisaient d'aucune lecture :
> `bdcom.ts` **ne pouvait tourner qu'une fois** (`DIAGNOSTIC.md` §17, corrigé), et l'URL du
> parquet SIRENE épinglée **rend 404** depuis que data.gouv.fr l'a remplacée
> ([#56](https://github.com/IvandeMurard/paris-compass/issues/56), ouverte).

**2.2bis — Rien ne se recharge tout seul. Constat du 15 août, vérifié et pas supposé.**
`bdcom.ts`, `geography.ts`, `bodacc.ts`, `sirene.ts` sont idempotents et rejouables — mais
rien ne les rejoue. Vérifié : aucun `.github/workflows`, aucun `cron.schedule` dans les
migrations, aucune Edge Function d'ingestion (la seule qui existe,
`send-property-notification`, sert les notifications utilisateur, pas le chargement de
données). Chaque exécution à ce jour a été déclenchée à la main.

Une ancienne intention existe : `.lovable/plan/brancher-des-sources-de-données-réelles-…md`
(4 août) prévoyait des « Edge functions d'ingestion (cron) ». Le pipeline réellement construit
a pris une autre forme — Node + DuckDB + connexion Postgres à privilèges élevés, jamais la clé
anon — qui ne se transpose pas telle quelle dans une Edge Function Supabase (runtime Deno, pas
de DuckDB, limite de temps d'exécution). L'automatisation reste donc à concevoir, pas à
retrouver.

Les sources n'ont pas le même rythme naturel : SIRENE se republie **mensuellement**
(commentaire de `sirene.ts`), BODACC en continu, BDCom tous les trois ans sans calendrier
fixe, la géographie (quartiers, voies) rarement. Une seule cadence pour les quatre serait
fausse pour au moins trois d'entre elles.

> **Les huit sources ont leur cadence depuis le 1er septembre 2026 — `w1-cadence` ([#70]).**
> Et ce ticket **redit cette section** : ce qui est écrit ici et ce qui est écrit là-bas sont
> un seul chantier, pas deux backlogs. L'état, mesuré ce jour-là sur
> `compass_source_freshness()` : les quatre crons de `#6` couvraient les quatre sources du
> 25 août ; `chantiers`, `sirene_stock`, `plu` et `terrasses` sont arrivées après et ne
> s'étaient inscrites nulle part. Elles portent maintenant chacune leur entrée `cron` dans
> `.github/workflows/ingestion.yml` — hebdomadaire pour `chantiers`, le 2 du mois pour
> `sirene_stock`, deux fois l'an pour `plu` et `terrasses`, **en cadence de vérification** :
> recharger ne rajeunit ni un vote du Conseil de Paris ni une autorisation de terrasse.
>
> **Mais les quatre lignes ne sont pas le livrable.** Une cadence posée à la main sur les
> sources d'un jour donné est un inventaire, et un inventaire ne se met pas à jour tout seul —
> c'est le geste qui a créé le trou. La règle est `scripts/porte/cadences.ts` : elle
> **énumère** les sources que les migrations insèrent dans `ingestion_run`, les croise avec la
> table `cron -> source` des workflows planifiés, et rougit sur toute source portant une
> cadence déclarée que rien ne tient. Jouée à chaque `npm.cmd run test`, démontrée par le
> quatrième acte de `npm.cmd run porte:sabotage`.
>
> [#70]: https://github.com/IvandeMurard/paris-compass/issues/70

~~À trancher avant d'automatiser, pas après : où tourne un job planifié qui a besoin d'une
connexion à privilèges élevés.~~ **Tranché le 24 août : GitHub Actions, avec `DATABASE_URL` en
secret de dépôt**, déclencheurs réduits à `schedule` et `workflow_dispatch`, et
`permissions: contents: read`. Écartés, avec leur raison : les Edge Functions Supabase (runtime
Deno, pas de DuckDB, limite de temps), et `pg_cron` — **disponible mais non installé** sur le
distant, mesuré le 24 août — qui ne saurait qu'appeler un webhook et exigerait de stocker un
jeton GitHub *dans la base même* que le job protège, soit deux secrets au lieu d'un.

*Exemple donné le 15 août : le PLU.* Le jeu `plub_protcom` (§2.4) répond justement à ce
scénario — mais il n'est **pas encore ingéré du tout**, indépendamment de toute question
d'automatisation. §2.4 reste un item ouvert, pas encore construit une première fois.

**2.2ter — Date de dernière mise à jour par jeu de données, demandé le 15 août.**
L'infrastructure existe déjà, à moitié : `bdcom_vintage.ingested_at` est posé et exposé par
`compass_vintages` — mais seul `bdcom.ts` l'écrit
(`scripts/ingest/bdcom.ts:385`). Géographie, BODACC et SIRENE n'ont **aucune** colonne ni
table équivalente : impossible aujourd'hui de répondre « quand cette table a-t-elle été
chargée pour la dernière fois » pour trois sources sur quatre.

~~À construire : une table générique (source, dernière exécution réussie, nombre de lignes).~~
**Posée le 25 août** — `public.ingestion_run`, migration `20260825000001`, exposée par
`compass_source_freshness()`. Elle porte trois colonnes de plus que demandé, chacune pour une
raison mesurée :

| Colonne | Pourquoi elle existe |
| --- | --- |
| `source_as_of` | La date de la **donnée**, lue sur la source. Distincte de la date de chargement : BDCom rechargé le 25 août rend toujours `2023-06`. Sans elle, une seule date aurait répondu à deux questions. |
| `cadence` | Le rythme de publication de la source, déclaré. Les quatre diffèrent de trois ordres de grandeur. |
| `run_by` | `manual` ou `github-actions`. C'est ce qui rend « réel ou déclaré » **vérifiable** : sans cette colonne, la table serait identique selon que le cron marche ou que quelqu'un a rechargé à la main en août. |

**Un couplage à ne pas rater avec 2.2bis** : afficher une date de dernière mise à jour n'est
honnête que si le rythme de rafraîchissement est soit réel, soit déclaré. Poser la date sans
l'automatisation ferait la même faute que le loyer fabriqué (`DIAGNOSTIC.md` §1) sous une autre
forme — un chiffre qui a l'air à jour et ne l'est pas forcément.

> **Le dépassement de cadence a un comportement, depuis le 1er septembre 2026** — `#70`,
> point 3. Jusque-là, rien ne le disait : `freshness.ts` imprimait « EN RETARD » et sortait en
> 0. Il rend maintenant un verdict sur la convention de la porte — 0 tout dans sa tolérance,
> 3 une source jamais chargée ou dont l'entretien n'est pas encore démontré par un cron,
> 1 une source au-delà de sa tolérance ou un écart entre la liste du distant et celle des
> migrations — et il est **un bras de `.github/workflows/porte.yml`**, joué chaque matin. Le
> `--releve-seul` que passe `ingestion.yml` est le seul endroit qui le désarme, et pour une
> raison : un verdict rendu là ferait échouer un chargement à cause d'**une autre** source.
>
> Les tolérances sont dans `scripts/ingest/lib/cadence.ts`, et ce sont des tolérances **du
> contrôle**, jamais de la donnée : `age_days` mesure depuis quand nous n'avons pas vérifié,
> pas depuis quand la couche est vieille.
>
> **Trois cadences portent un seuil, deux n'en portent pas — et l'absence est écrite.**
> `continuous` 3 jours, `weekly` 10, `monthly` 45 ; `rare` et `triennial` aucun, décidé par
> Ivan le 1er septembre 2026. Un seuil qui aurait du sens sur une cadence de vérification
> serait au-delà d'un an, c'est-à-dire bien après le moment où l'on pouvait encore agir. Ce
> qui surveille réellement ces couches est `bodacc` : **les huit crons sont dans un seul
> fichier de workflow**, le risque qu'elles courent est que GitHub le désactive après 60 jours
> calmes, et il le désactive en entier — donc les trois jours de `bodacc` répondent pour les
> huit. Une source sans seuil est rendue `sans seuil (vérification)`, **jamais « à jour »**.
>
> La distinction entre un `null` **écrit** et une clé **absente** est le correctif de
> `DIAGNOSTIC.md` §31 : `weekly`, ajoutée à l'énumération le 25 août, n'y avait jamais été
> inscrite, et le `?? null` d'alors l'a lue comme « rien à dire » — donc `chantiers` était
> rendue « à jour » à n'importe quel âge. Une clé absente lève maintenant.

> **Tenu, et de façon lisible.** `compass_source_freshness()` rend `run_by` à côté de chaque
> date, `npm.cmd run freshness` écrit noir sur blanc « cadence déclarée, pas tenue » tant
> qu'aucune exécution planifiée n'a eu lieu, et `list_sources` qualifie l'entretien de chaque
> jeu — « Refreshed by a scheduled job » ou « Last refresh was run by hand. The cadence above
> is declared, not demonstrated. » Le contrôle `F4` de `mcp-server/src/verify.ts` échoue si un
> jeu cesse de qualifier le sien.

**2.3 — BDCom (APUR), les trois millésimes.** Recensement de terrain porte-à-porte de tous les
locaux parisiens en rez-de-chaussée avec vitrine et accès sur rue. Chaque local porte sa
localisation fine, son type, son activité sur une nomenclature à 224 postes et une tranche de
surface.

Il n'y a rien à télécharger à la main : l'APUR expose des services ArcGIS paginés. **2017 et 2020**
sont deux couches du même service `OPENDATA/BDCOM_OD` — 84 031 et 83 399 locaux, périmètre
complet, licence personnalisée. **2023** est publié à part, sous un schéma de colonnes entièrement
différent — 60 845 commerces, ODbL, 95 concentrations commerciales. Les coordonnées sont demandées
explicitement en Lambert 93 et converties par PostGIS à la promotion : la projection devient une
propriété du pipeline plutôt que de ce que le service sert ce jour-là.

> **Chargé le 8 août 2026** : 228 275 relevés, 85 418 locaux distincts, 222 codes d'activité.
> Tous les chiffres annoncés plus haut sont vérifiés sur la base et non plus sur échantillon —
> vacance 7 853 (9,3 %) en 2017 et 8 764 (10,5 %) en 2020, zéro en 2023 ; série à périmètre commun
> 62 705 → 61 541 → 60 845. Aucun code d'activité, aucune tranche de surface, aucune situation non
> résolue. 28 codes utilisés en 2017/2020 n'ont pas de niveau 47/18 : ils n'existent dans aucune
> source publiée, et la colonne reste nulle plutôt que devinée.

Deux gains. La nomenclature et les tranches de surface écrasent le tagging OSM sur lequel le
produit repose aujourd'hui. Et surtout, trois millésimes d'un recensement exhaustif dont
l'identifiant de local est stable donnent le **taux de rotation d'un local rapporté à celui de son
tronçon de rue**, et l'historique qui le justifie. Aucun outil grand public n'expose ça. C'est le
différenciateur.

> ⚠️ **Lire `docs/BDCOM.md` avant toute reprise du schéma.** Quatre points, tous vérifiés sur les
> fichiers et sur le service :
>
> - **L'identifiant de local est stable d'un millésime à l'autre** — `ORDRE` en 2017 et 2020,
>   `c_ord` en 2023. Sur 300 locaux de 2023 tirés au hasard, 297 retrouvés en 2020, dont 99,7 % à
>   la même adresse. Retracer l'histoire d'un local est donc une jointure exacte, pas un
>   appariement probabiliste. *(Corrige une version antérieure de cet encadré qui donnait
>   l'identifiant pour absent.)* Mesuré au chargement : **74 identifiants sur 85 344** sont
>   réattribués à un autre local, soit moins de 0,1 %. On apparie sur l'identifiant, on **vérifie
>   sur l'adresse**, et on marque la divergence au lieu de la lisser.
> - Les commerces d'une même adresse partagent une coordonnée — jusqu'à 120 sur un seul point. La
>   coordonnée « bis » est un artefact d'affichage, jamais une position : elle n'est pas chargée.
> - **La vacance 2023 n'est pas calculable.** Le millésime publié ne contient que les 60 845
>   commerces ; les locaux vacants et non commerciaux en sont absents. Elle se mesure sur 2017 et
>   2020 seulement, où elle vaut 7 853 puis 8 764 locaux vides.
> - **Les comptages bruts ne sont pas comparables** — 84 031 → 83 399 → 60 845 se lit comme un
>   effondrement de 27 %. Restreinte au périmètre commun aux trois millésimes, la série vaut
>   62 705 → 61 541 → 60 845, soit environ −3 % en six ans. Les licences diffèrent aussi : ODbL
>   pour 2023, licence personnalisée à lire pour 2017 et 2020.

**2.4 — PLU, protections du commerce et de l'artisanat.** Jeu `plub_protcom` sur
opendata.paris.fr, version votée le 20 novembre 2024. Contrainte binaire et cartographiée : sur
un linéaire protégé, un local en rez-de-chaussée ne peut pas changer de destination. C'est la
première chose qui peut faire capoter un projet. **Fourni pour information, sans valeur
réglementaire** — à afficher comme signal, avec renvoi au Portail des Règles d'Urbanisme.

> **Fait le 25 août** (`w0-plu`, [#9](https://github.com/IvandeMurard/paris-compass/issues/9)).
> 5 107 linéaires chargés dans `plu_linear_protection`, rattachés aux 25 174 tronçons de rue par
> proximité — mesuré avant de choisir le seuil : les deux réseaux sont dessinés sur la même
> ligne centrale (p50 = 0 m, p99 = 0,0003 m sur les 5 107 linéaires), avec des écarts jusqu'à
> 10 m ; 15 m capture les 5 107. 4 340 tronçons et 29 624 locaux `premise_location` en ressortent
> protégés sur au moins une des trois protections (générale, proximité, culturelle). Démontré
> par un appel anonyme réel à `compass_premises_within` : **1 RUE MONTORGUEIL** rend
> `plu_protected: false`, **25 RUE MONTORGUEIL** rend `plu_protected: true`. Détail dans
> `docs/tickets/w0-plu.md`.

**2.5 — L'affichage.** Une fois les RPC en place, la fiche et le bandeau d'alerte PLU se font
plus vite côté Lovable.

La formulation de référence est le **taux de rotation du local rapporté à celui de sa rue**, pas
la trajectoire de rotation seule. Un local qui a changé deux fois d'activité en six ans ne dit
rien ; le même local dans un tronçon qui n'a pas bougé dit quelque chose. C'est la seconde
contrainte fondatrice appliquée telle quelle : la comparaison au tronçon, jamais la valeur
absolue. L'historique du local — ses vies antérieures, relevé par relevé — est la pièce
justificative sous le taux, pas l'inverse.

**L'historique reste accessible local par local**, partout où la donnée existe : trois relevés
pour un local vu trois fois, et pour un local vu deux fois les deux relevés **plus une mention
« non observé »** au troisième, avec sa raison. Le taux rapporté à la rue donne son sens à
l'historique, il ne le remplace pas.

> **Règle d'affichage, apprise en s'y trompant.** Un libellé d'activité absent ne doit jamais être
> remplacé par un texte de substitution. Il faut brancher sur la colonne `observed` :
> `observed = false` signifie « ce local n'a pas été recensé cette année-là », ce qui n'est ni
> « vacant » ni « plus un commerce ». Rendre l'un de ces deux textes à la place transforme un
> « je ne sais pas » en affirmation — la faute exacte que le produit existe pour empêcher, et
> qu'un `coalesce` sur le libellé suffit à commettre.
>
> Dans un millésime au périmètre complet (2017, 2020), une absence signifie que le local n'existait
> pas comme rez-de-chaussée avec vitrine : créé plus tard, transformé, ou manqué par l'enquête. La
> donnée ne tranche pas entre les trois, et l'affichage non plus.

### Trois règles de lecture, sans lesquelles le taux ment

**1. La référence est le métier, pas la ville.** Les activités ne tournent pas au même rythme.
Part des locaux exerçant encore la même activité six ans plus tard, mesurée sur les 62 705 locaux
de 2017 : hôtel 78 %, santé-beauté 77 %, alimentaire 77 %, café et restaurant 72 %, culture et
loisirs 63 %, équipement de la maison 60 %, **équipement de la personne 53 %**. Le prêt-à-porter
tourne deux fois plus vite que l'hôtellerie. Donc 50 % de rotation dans une rue de mode est banal,
et alarmant dans une rue d'hôtels. Comparer à la moyenne parisienne toutes activités confondues —
15,5 % entre 2020 et 2023 — est un mauvais étalon.

**2. La fréquence nationale n'a de valeur que rapportée au lieu.** Savoir que 72 % des
cafés-restaurants parisiens tiennent six ans n'apprend rien à quelqu'un qui a déjà décidé d'ouvrir
un restaurant : il ne choisit pas entre un restaurant et une boutique. Ce qui l'informe, c'est
l'écart local. Cafés-restaurants de 2017 encore en activité en 2023 : quartier du Mail **56 %**
(158 locaux), Bonne-Nouvelle 58 %, Paris entier 72 %, quartier des Halles **77 %** (310 locaux).

Le taux par métier n'est donc pas le produit — c'est le **dénominateur** qui rend le chiffre local
lisible. Et il faut une échelle : local → tronçon → quartier → ville, en montant d'un cran tant
que l'effectif est trop faible pour être lu, et **en affichant toujours à quelle maille et sur
quel effectif** le chiffre a été calculé.

**3. Une fréquence observée n'est pas une probabilité de réussite.** « Sur 14 587 cafés-restaurants
recensés en 2017, 72 % exerçaient encore la même activité six ans plus tard » est une observation
sur le passé, avec son effectif nommé. « Votre restaurant a 72 % de chances de tenir six ans » est
un prévisionnel, donc le même refus que le chiffre d'affaires estimé. La règle d'écriture qui tient
la frontière : **jamais un pourcentage nu, toujours l'effectif et la période.**

### Changement d'activité n'est pas changement de propriétaire

BDCom voit qu'un local est passé de boulangerie à coiffeur. Il ne voit **pas** un boulanger qui
vend son fonds à un autre boulanger : le code d'activité ne bouge pas. Les deux événements sont
distincts et leurs fréquences ne sont pas comparables — une durée de détention de fonds, telle
qu'on la cite couramment pour la boulangerie, ne se compare pas à un taux de changement
d'activité. La cession de fonds se mesure avec BODACC (§3.3), avec sa date et son prix.

Quatre réserves à afficher, pas à documenter. Elles bornent ce qu'on peut **affirmer**, pas ce
qui est **disponible** — et à ce jour la liste est complète, pas illustrative :

- **Le pas est de trois ans.** Un local devenu boulangerie → vacant → kebab → coiffeur entre deux
  enquêtes s'affiche « boulangerie → coiffeur ». Un local peut donc paraître stable en ayant
  tourné trois fois. C'est la réserve qui va le plus à l'encontre de l'usage qu'un preneur voudra
  en faire.
- **L'enseigne n'existe qu'en 2023.** Les couches publiées de 2017 et 2020 ne portent aucun champ
  de nom. On peut dire « c'était un fleuriste », jamais « c'était Au Nom de la Rose ».
- **Une disparition en 2023 ne signifie rien par elle-même** — ni « c'est vacant », ni « ce n'est
  plus un commerce ». Cette seconde lecture a été écrite ici le 9 août et **mesurée fausse le
  26 août** : sur les 24 573 locaux absents du millésime 2023, **18 647 — 75,9 %** — n'étaient déjà
  pas un commerce à leur dernier relevé (12 367 « Autre local », 6 280 « Local vacant »). Un local
  relevé vacant en 2020 n'a jamais été un commerce : il ne peut pas avoir cessé de l'être. La
  couche 2023 ne publie ni les vacants ni les locaux non commerciaux, donc son silence recouvre
  trois cas — fermé, transformé, ou jamais commercial — et la base répond « je ne sais pas »
  plutôt que d'en choisir un. `DIAGNOSTIC.md` §15, ticket `w0-conclusion` (#54), invariants I29
  à I31.
- **74 identifiants sur 85 344 sont réattribués** à un autre local d'un millésime à l'autre,
  soit moins de 0,1 % — chiffre mesuré au chargement, pas estimé. L'`ordre` 4231 est au 13 rue
  Vivienne dans le 2ᵉ en 2017 et 2020, et au 88 avenue Kléber dans le 16ᵉ en 2023.

### Le niveau de fiabilité, et pourquoi il est calculé et non écrit

Décidé le 9 août 2026, après deux erreurs commises **dans la prose et non dans la base** en
présentant un même local : une absence de relevé rendue par « pas un commerce » alors que la
donnée disait seulement « non observé », et un prix d'exemple pris sur un autre local qui se
lisait comme celui du local discuté. La base était juste les deux fois. Le récit ne l'était pas.

**Chaque fait affiché porte un niveau, et ce niveau est dérivé de colonnes existantes** — jamais
saisi, jamais estimé. Pas de score sur 100 : un pourcentage de confiance serait exactement le
genre de chiffre fabriqué que le produit refuse. **Quatre niveaux** — le quatrième,
`corrobore`, est arrivé avec SIRENE (§3.3) et cette table ne l'avait pas suivi — dont la
règle est publiée sur la page Méthodologie au même titre que les formules de score.

| Niveau | Ce que ça veut dire | Ce qui le déclenche |
| --- | --- | --- |
| **Établi** | La source nomme directement ce local, et la pièce est jointe | `observed = true` et `match_method` ∈ {`ordre`, `new`} ; pour un prix : `price_source` renseigné **et** `address_source = 'etablissement'` **et** un seul local à l'adresse |
| **Corroboré** | Deux sources publiques indépendantes placent l'entreprise ici, aucune ne nomme le local | `address_source = 'siege_social'` **et** `operator_confirmed` (SIRENE place un établissement de la même entreprise à moins de 50 m) — et jamais quand plusieurs locaux partagent l'adresse |
| **Probable** | Le fait est documenté, mais son rattachement à *ce* local est déduit | `address_source = 'siege_social'` sans confirmation ; plusieurs locaux à l'adresse (ce cas **gagne sur tout**, corroboration comprise) ; `street_match = 'spatial'` ; `match_method = 'ordre_address_conflict'` |
| **Indéterminé** | La source est muette, et on le dit | `observed = false` ; `origin_raw` présent sans prix lu ; millésime retenu pour licence |

Le niveau accompagne la valeur, il ne la remplace pas : un fait « probable » s'affiche, avec ce
qui manque pour qu'il soit établi. C'est l'inverse de le masquer.

### Le récit se génère, il ne se rédige pas

La leçon de fond des deux erreurs ci-dessus : **le problème n'était pas la donnée, c'était le
passage par une main humaine.** Recharger un champ de plus aurait corrigé un cas ; ce qu'il faut,
c'est qu'aucune affirmation ne puisse circuler sans sa pièce.

Trois procédés, par ordre d'importance :

1. **Une fonction unique produit la chronologie d'une adresse** — relevés BDCom, événements
   BODACC, avec pour chaque ligne sa source, sa date, son niveau de fiabilité et ce qui le
   justifie. Personne ne retape une chronologie à la main, donc personne ne peut rendre un
   « non observé » en « plus un commerce », ni emprunter un chiffre à un autre local. Une
   définition, trois consommateurs : l'interface, le dossier exportable (§2.6) et le serveur MCP
   (§4.1).
2. **Chaque RPC renvoie la pièce à côté du fait**, jamais le fait seul. Déjà vrai pour le prix
   (`origin_raw`), l'origine de l'adresse et la méthode d'appariement ; à tenir pour tout ce qui
   s'ajoutera.
3. **Le pipeline refuse de valider un fait sans sa pièce.** Le contrôle de complétude de BDCom est
   le premier du genre ; il en faut un par invariant — pas de prix sans phrase source, pas de
   relevé sans licence de millésime, pas de rattachement spatial sans distance enregistrée.

### À quoi sert la suite des activités

La valeur d'un enchaînement — prêt-à-porter → restaurant → coiffeur → café — n'est pas le récit.
Elle est **technique**, et elle se lit avant même la visite.

Un local qui a déjà hébergé un restaurant a, selon toute vraisemblance, une extraction, un bac à
graisses et la puissance électrique qui vont avec. Un local qui n'a jamais accueilli que des
boutiques n'a rien de tout ça : créer une extraction coûte des dizaines de milliers d'euros et
suppose l'accord de la copropriété, qui le refuse souvent. Pour quelqu'un qui cherche un local de
restauration, **« un restaurant a-t-il déjà été ici ? » est la question la plus chère à laquelle
cette donnée réponde**, et Compass y répond avant le déplacement.

Deux usages secondaires en négociation. Un local qui a changé plusieurs fois de destination
indique que le bail l'a déjà permis, ce qui pèse dans une demande de déspécialisation. Et une
période de vacance dans la suite est un argument sur le loyer : le bailleur a eu du mal à relouer.

Ce que la suite ne dit **pas** : pourquoi chacun est parti. Vente réussie, dépôt de bilan,
départ en retraite, immeuble repris — tout cela s'affiche à l'identique. Une suite d'activités
n'est pas un verdict, et la fiche ne doit pas la présenter comme tel.

Une réserve technique à afficher avec : Compass peut dire « un restaurant était ici en 2020 », pas
« l'extraction y est encore ». C'est une indication qui change ce qu'on va vérifier sur place, pas
une garantie.
  Sans garde-fou, l'historique recollerait deux commerces différents. L'appariement vérifie donc
  l'adresse en plus de l'identifiant et marque la divergence au lieu de la lisser : un historique
  ainsi marqué est une preuve plus faible, et l'interface doit pouvoir le dire.

**2.6 — Le dossier d'une adresse.** Un fichier téléchargeable pour **une** adresse : une ligne par
indicateur, et à côté sa source, sa licence, son millésime, sa méthode et sa réserve. Un fichier
où la moitié de la largeur sert à dire d'où vient l'autre moitié.

Ce n'est pas l'export refusé dans `docs/CONTEXTE.md`. Ce qui est refusé, c'est le **portefeuille** :
sortir cinquante adresses pour les trier, le geste du courtier. Le dossier d'une adresse est
l'inverse — la promesse de traçabilité rendue transportable. Et il répond à un fait concret : un
bail 3/6/9 ne se décide pas seul, il passe par un banquier, un comptable, un réseau de franchise.

La ligne se tient dans la structure, pas dans la discipline : **l'export part d'une fiche, jamais
de la liste de résultats.** Pas de bouton « exporter tout ». Un utilisateur qui empile lui-même
ses deux ou trois candidats fait son travail ; Compass ne le fait pas à sa place.

~~Prérequis : la remontée de la provenance dans l'interface, le point resté ouvert de la
phase 1.~~ **Prérequis levé le 12 août** — la provenance est affichée, l'adaptateur ne
déballe plus. Ce chantier n'attend plus que le déploiement. Partage :
le contenu — la fonction qui transforme une adresse évaluée en lignes portant leur provenance —
est du noyau ; le bouton, sa place et la génération du fichier sont de Lovable. Une définition,
deux sorties : **c'est le même contenu que renverra le serveur MCP** (4.1) à un agent.

Google Sheets en direct demanderait une connexion de compte pour peu de gain : un fichier
téléchargé se colle dans Sheets en deux secondes.

### 2.7 — La fiche locale : le consommateur qui manque — **branchée le 24 août**

> **Fait le 24 août 2026**, par le ticket `w0-fiche` (#8), qui redisait cette section : la
> fiche consomme `compass_address_timeline` et `compass_premises_within` depuis le navigateur.
> Le critère est démontré en direct sur **3 rue du Jour, quartier Halles** — 2017 retenu,
> 2020 retenu, 2023 « Prêt-à-porter Homme / AGNES B », plus quatre annonces BODACC de 2015 à
> 2018. Tableau complet, mesures de rattachement et limites dans
> [`docs/tickets/w0-fiche.md`](tickets/w0-fiche.md). **Les quatre chantiers « à faire dans la
> foulée » listés plus bas restent ouverts** : ils n'étaient pas dans le critère.

**Constat du 12 août, et c'est le plus structurant du projet.** Le front et la base sont deux
produits agrafés sans pont : `compass_*` et `.rpc(` avaient **zéro occurrence dans `src/`**
— remesuré le 24 août avant le chantier, toujours exact, et corrigé le jour même.
Supabase n'y sert qu'à l'authentification et aux quatre tables utilisateur ; toutes les
données affichées viennent d'appels directs à Overpass, opendata.paris.fr, Open-Meteo, BAN et
Géorisques.

Autrement dit : **dix fonctions `compass_*`, la machinerie de confiance à quatre niveaux et
les 85 418 locaux n'ont aucun consommateur** en dehors de la porte d'évaluation. Le récit
généré — la feature qui distingue réellement Compass — est construit, testé par huit cas
dorés, et invisible.

La fiche locale est la page qui consomme `compass_address_timeline` : une chronologie par
adresse, chaque ligne portant son fait, sa pièce, son niveau et sa raison. §2.5 la décrit
comme ayant « trois consommateurs » sans jamais lui donner d'entrée de backlog.

**Ce que le branchement a appris, et que cette section n'avait pas prévu.** OpenStreetMap et
la BDCom **ne partagent aucun identifiant**, donc rattacher une carte à un local relevé est
une déduction spatiale — et une déduction faible. Mesuré le 24 août sur 658 locaux autour des
Halles : le local BDCom le plus proche est à 5 m pour la moitié d'entre eux mais à 58 m au
neuvième décile, et un rayon de 25 m contient une **médiane de 5 candidats**, jusqu'à 125 dans
une galerie. Choisir le plus proche aurait attribué l'histoire d'un local à un autre — la
seconde erreur de §2.5, refaite. **La fiche liste donc les candidats et laisse le lecteur
trancher**, et la mesure est publiée sur la page Méthodologie.

**Débloquée par le déploiement, comme tout ce qui touche la base.** À faire dans la foulée —
**aucun des quatre n'est fait au 24 août** :

- **Le dénominateur par couche** (le vol assumé à Aino) : afficher « 12 commerces alimentaires
  dans 800 m » et pas seulement « 64/100 ». Un décompte est refaisable par le lecteur, un
  score ne l'est pas. `compass_premises_within` renvoie déjà `total_matched`.
- **Les cinq scores par catégorie**, calculés pour chaque local et jamais affichés — la carte
  montre trois chiffres sur huit.
- **La troncature à 120 locaux**, à afficher plutôt qu'à taire (voir `DIAGNOSTIC.md`).
- **L'air par local et non par vue** : `useAreaEnvironment` calcule un indice au centre de la
  carte, qui est ensuite présenté sur chaque fiche comme s'il lui appartenait.

---

## Phase 3 — présence et libération

**3.1 — Mobiliscope (CNRS).** Population effectivement présente dans chaque secteur, pour
chacune des 24 heures d'un jour de semaine moyen, ventilée par âge et catégorie
socio-professionnelle. 49 aires urbaines françaises, ODbL, CSV + GeoJSON.

C'est le plus gros écart entre ce que Compass affiche et ce qu'un preneur veut savoir : la
donnée distingue un quartier de bureaux qui triple à midi d'un quartier résidentiel au profil
inverse, deux emplacements que la population résidentielle INSEE décrit à l'identique. Réserves à
afficher : jour de semaine moyen, enquêtes de 2009 à 2019 selon les villes, maille secteur.

**3.2 — Validations IDFM.** Par station, par jour, par titre, historique depuis 2015 avec profils
horaires. Remplace le passage estimé par un nombre compté.

**3.3 — BODACC (DILA).** API ouverte et gratuite, sans clé. Deux usages distincts : les **ventes
et cessions de fonds de commerce avec leur prix**, qui est la donnée de prix la plus proche de ce
qu'un preneur paiera réellement ; et les **procédures collectives**, signal public qu'un local va
se libérer, souvent des mois avant qu'une annonce paraisse.

> **Chargé le 9 août 2026**, Paris depuis 2015 : 43 057 cessions et 120 285 procédures
> collectives, 156 468 établissements dont **107 499 situés sur une adresse BDCom**. Prix lu sur
> 25 496 cessions — le prix médian d'un fonds parisien est de **126 000 €** (quartiles 48 000 et
> 290 000), et par activité déclarée : officine de pharmacie 950 000 €, restaurant 230 000 €,
> restauration rapide 100 000 €.
>
> **Deux médianes circulent, et les deux sont justes — sur des dénominateurs différents.**
> 126 000 € porte sur les 25 496 cessions dont le prix a été lu, où qu'elles soient. Le README
> et la baseline `prix_median_local_identifiable` disent **160 000 €** : c'est la médiane des
> **5 934 cessions rattachables à une vitrine unique** — le sous-ensemble où l'on sait *quel*
> local a été vendu. Toujours citer le dénominateur avec la médiane ; l'écart entre les deux
> est lui-même une information (les cessions bien localisées valent plus cher).
>
> Ce que le croisement donne, et qu'aucune des deux sources ne dit seule — 26 avenue de la Porte
> d'Ivry : BDCom voit « pas un commerce » en 2017, restaurant français en 2020, restaurant
> asiatique en 2023 ; BODACC ajoute l'ouverture d'une sauvegarde en mars 2023, le plan arrêté en
> mai 2024, et la vente du fonds pour 700 000 € en mars 2025.
>
> **Trois réserves, portées par le schéma et pas seulement par ce document.**
>
> - Le prix est publié à l'intérieur d'une phrase — « Fonds acquis par achat au prix stipulé de
>   170 000,00 euros » — donc extrait par expression régulière. La phrase est conservée telle
>   quelle à côté du nombre : un chiffre produit par une regex doit rester vérifiable contre sa
>   source. 96 % des cessions se lisent ; les autres gardent la phrase sans nombre.
> - **Un avis de procédure collective ne donne pas l'adresse du commerce, mais celle du siège
>   social.** Pour un petit commerçant c'est le même lieu, pour une société ce ne l'est pas — une
>   liquidation déposée à un siège ne dit rien de la boutique du rez-de-chaussée. La colonne
>   `address_source` distingue les deux et l'interface doit l'afficher.
> - BODACC identifie une **adresse**, BDCom un **local**, et jusqu'à 120 locaux partagent une
>   adresse. La fonction ne désigne donc un local que lorsqu'il est seul à son adresse ; sinon elle
>   renvoie le nombre de locaux concernés, pour qu'on écrive « l'un des 6 locaux de cette adresse »
>   au lieu de laisser croire qu'on sait lequel.
>
> Une limite à garder en tête pour l'analyse : l'activité déclarée dans BODACC est du texte libre
> — « Restaurant », « Restaurant. », « Restauration traditionnelle », « restauration » coexistent.
> Pour tout regroupement par activité, c'est le code BDCom à 224 postes qui fait foi, pas cette
> chaîne. C'est une raison de plus de croiser plutôt que de choisir.

> **Volet géolocalisation chargé le 9 août 2026.** L'INSEE publie un fichier des
> établissements géolocalisés — SIRET et coordonnées, sans dates ni état. Filtré à
> Paris et aux 38 122 entreprises que BODACC nomme : 68 672 établissements, 37 974
> entreprises couvertes. Il répond à une seule question, « cette entreprise
> a-t-elle un établissement ici », et c'est celle qui bloquait.
>
> Résultat : sur 84 026 avis déposés à un siège social, **82 144 sont confirmés
> sur place et 1 882 infirmés** — des entreprises qui déposent là et opèrent
> ailleurs. Ce second nombre est la raison de vérifier plutôt que de supposer.
>
> D'où un quatrième niveau de fiabilité, `corrobore`, entre `etabli` et
> `probable` : deux sources publiques indépendantes placent l'entreprise à
> l'adresse, et **aucune des deux ne nomme le local**. SIRENE dit « cette
> entreprise a un établissement ici », jamais « cette entreprise est la boutique
> du rez-de-chaussée » — l'établissement peut être un bureau à l'étage.
>
> **Et la mesure a corrigé ma prédiction.** J'annonçais l'ambiguïté du siège
> social comme le premier levier de qualité. Elle l'était, mais plus petite que
> prévu : une fois résolue, **plus une seule ligne ne reste `probable` pour cette
> raison**, et le résidu — 36,7 % — vient entièrement d'ailleurs. BODACC nomme une
> adresse, BDCom un local, et **69 % des locaux partagent leur numéro**. Aucune
> corroboration ne peut désigner la vitrine, et aucune donnée publique ne le dira.
>
> Le levier suivant n'est donc pas une source de plus mais un **rétrécissement du
> champ des possibles** : si trois locaux partagent une adresse et qu'un seul est
> un restaurant, un avis mentionnant la restauration désigne probablement
> celui-là. Ça ne rendrait pas le fait `etabli` — ça réduirait le nombre de
> candidats, et c'est déjà beaucoup.

**3.4 — Cessations SIRENE.** L'API `recherche-entreprises` est déjà interrogée et porte les dates
de cessation d'établissement. Croisée avec BDCom, une cessation à une adresse recensée comme
commerce, c'est un local qui vient de se vider.

**Et surtout : elle comble le pas de trois ans.** C'est le croisement le plus important du
produit, parce qu'il répare la principale réserve de l'historique. BDCom dit « boulangerie en
2020, téléphonie en 2023 » ; SIRENE dit « la boulangerie a cessé en mars 2021, la téléphonie
s'est immatriculée en septembre 2022 » — donc **dix-huit mois de vide**, que le relevé triennal
avait effacés. Aucune des deux sources ne peut le dire seule.

Les deux histoires ne sont pas de même nature et il ne faut pas les confondre à l'affichage.
BDCom est l'histoire du **local** : relevée à pied, physique, tous les trois ans. SIRENE est
l'histoire des **entreprises** : déclarative, continue, et rattachée à une adresse
d'immatriculation qui n'est pas forcément une vitrine. Un `Measured<T>` par source, jamais un
chiffre fusionné qui masquerait laquelle des deux l'a produit.

**3.6 — Sirene au front.** ~~Brancher ou dépublier.~~ **Dépubliée le 15 août.**
`fetchEstablishmentsNear` et `useNearbyEstablishments` existent, mais aucun composant ne les
appelle : l'interface n'affiche rien qui vienne de l'INSEE. Elle était pourtant annoncée
comme source active dans `DATA_SOURCES`, sur la page Sources, dans le README — et dans une
réponse de FAQ affirmant que Sirene est **lue à chaque déplacement de carte**, ce qui était
faux.

Dépubliée plutôt que branchée, parce que la brancher n'est pas cheap : il n'existe pas
d'écran de fiche locale, et interroger l'API pour chacun des 120 locaux d'une vue est
exclu. Elle rejoint donc le tableau des sources **à venir**, avec la raison écrite. Le vrai
branchement viendra avec la fiche locale (§2.7), qui interroge une adresse à la fois.

**3.5 — La vue « ce qui se libère ».** Une seconde entrée dans le produit, à côté de « j'ai une
adresse ».

---

## Phase 4 — l'agent, et le récit

**4.1 — Serveur MCP.** Un paquet séparé au-dessus du noyau : `score_location`,
`compare_locations`, `explain_score`, `list_sources`. Chaque réponse embarque sa chaîne de
raisonnement, construite à partir du type `Measured`. Prérequis : remonter la provenance dans
l'UI, ou au moins cesser de la déballer dans l'adaptateur.

> **Fait le 15 août 2026.** `mcp-server/`, paquet indépendant (son propre `package.json`,
> aucun workspace npm root touché — zéro risque sur la chaîne de build Vite/Lovable). Les
> quatre outils, tous branchés sur `../src/core` et le rôle `anon` de Supabase, jamais une
> clé de service. Pas de REST maison à côté : chaque fonction `compass_*` est déjà exposée en
> REST par PostgREST, en construire une seconde aurait dupliqué ce qui existe déjà.
>
> Vérifié : les quatre outils s'enregistrent et répondent via un vrai client MCP
> (`src/smoke-test.ts`, `@modelcontextprotocol/sdk`). ~~Quatre~~ — **six depuis le 17 août**,
> `find_premises` et `trace_premise` ayant rejoint le lot, voir le second manque ci-dessous.
> Et cette vérification-là était **ponctuelle** : le smoke test imprime et n'assène rien, il
> n'était câblé à aucun script, et le typecheck du paquet n'était appelé par personne. Comblé
> le 24 août par `w0-mcp-verif` (#53) — `npm.cmd run verify:mcp`, 36 contrôles sur les six
> outils, détail dans `docs/tickets/w0-mcp-verif.md`. `list_sources` et la couche BDCom de
> `score_location` vérifiés en direct contre `dbefhvmyfmmhjeetdddu`. La construction de
> requête Overpass et le parsing des amenités vérifiés — l'un en direct, l'autre en rejouant
> hors-ligne une réponse réelle capturée — après que les miroirs publics ont commencé à
> répondre 429 sous le rythme des tests successifs, un comportement déjà documenté
> (`DIAGNOSTIC.md` §3a), pas un défaut du serveur.
>
> **Deux manques restants, délibérément non comblés maintenant :**
> - ~~`scoreLocation` (`src/core/scoring.ts`) prend une seule `Origin` pour tout le résultat —
>   chaque axe affiche « OpenStreetMap via Overpass » même quand les locaux viennent de BDCom.~~
>   **Fait le 24 août** par `w0-provenance` (#10), qui est le même chantier que ce paragraphe :
>   le ticket redisait ce manque sans le savoir, et les deux backlogs sont recousus ici. Le
>   troisième paramètre est désormais un `Origin` **par couche** (`LayerOrigins`), la licence et
>   la date du millésime BDCom se lisent dans `compass_vintages`, et le flux piéton — qui mélange
>   65 % de locaux et 35 % de transports — nomme ses deux sources, cumule les licences et porte
>   la plus ancienne des deux dates. Mesuré contre le distant : `explain_score` rend
>   `APUR BDCom 2023 + OpenStreetMap via Overpass`, `asOf = 2023-06`, là où il annonçait
>   OpenStreetMap et la date du jour. Détail et tableau dans `docs/tickets/w0-provenance.md`,
>   défaut dans `DIAGNOSTIC.md` §13.
> - ~~Aucun outil n'expose `compass_address_timeline`~~ **Fait le 17 août**, et en **deux**
>   outils plutôt qu'un : `trace_premise` rend la chronologie, `find_premises` rend les
>   `location_id` sans lesquels elle est inappelable. La forme qui restait à décider tenait
>   dans ce découpage. Un seul outil prenant un point aurait dû choisir un local — or jusqu'à
>   120 locaux partagent une coordonnée et 69 % un numéro de rue : « le plus proche » aurait
>   désigné une vitrine dans une pile et l'aurait présentée comme *la* réponse. Les candidats
>   sont donc rendus, et l'arbitrage revient à l'appelant, qui le voit.
>
> **Piste de monétisation, non décidée** : `PERIMETRE.md` §10. Si un palier payant se construit,
> c'est un quota de volume sur les six outils actuels — jamais un outil retiré du gratuit,
> `compare_locations` compris (il compare deux points, pas un portefeuille).
>
>   `find_premises` est **épinglé au millésime 2023, sans paramètre**. Ce n'est pas un défaut
>   de couverture : `20260809000011` retient de 2017 et 2020 non seulement le contenu mais
>   **l'existence** d'un relevé, et un annuaire qui énumérerait leurs locaux divulguerait
>   exactement cette existence. Les deux millésimes restent rendus par `trace_premise`, en
>   lignes `withheld`.
>
>   `list_sources` gagne BODACC et SIRENE en conséquence — SIRENE n'est jamais rendue en
>   lignes, mais c'est elle qui décide du niveau `corrobore`, donc une source dont l'appelant
>   dépend. La règle du fichier tient : on ne nomme que ce qu'un appel touche réellement.
>
> - ~~**Défaut trouvé en chemin : `compass_premises_within` porte l'absence silencieuse.**~~
>   **Corrigé le 17 août** par `20260817000001`, sur le modèle de `20260816000001`, et couvert
>   par I14 et I15. C'est l'écriture de `find_premises` qui l'a fait remonter : la fonction est
>   `SECURITY INVOKER`, la politique RLS de `20260809000008` filtre `premise_observation`, et
>   elle rendait zéro ligne sans marqueur — indiscernable d'un rayon réellement vide.
>
>   **Mesuré des deux côtés du correctif**, en appelant anonyme réel via PostgREST et non en
>   simulation de claim, à Châtelet sur 800 m :
>
>   | | 2017 | 2020 | 2023 | 2023 à 1 m |
>   | --- | --- | --- | --- | --- |
>   | avant | 0 ligne | 0 ligne | 3 059 | 0 ligne |
>   | après | 1 ligne `withheld` | 1 ligne `withheld` | 3 059 | 0 ligne |
>
>   La dernière colonne est la moitié qu'on saute : un vide réel se lit toujours comme un vide,
>   donc le correctif n'a pas remplacé un défaut par son symétrique. Les chiffres privilégiés
>   relevés au passage — 3 855 en 2017, 3 825 en 2020 — recoupent ceux de `20260816000001` et
>   du tableau de `REPRISE-ARCHIVE.md` « La suite » §8.
>
>   **Les trois fonctions qui portent la règle de licence sont désormais couvertes** : I9/I10
>   pour `compass_address_timeline`, I12/I13 pour `compass_scoring_context_within`, I14/I15
>   pour celle-ci. L'épinglage de `find_premises` à 2023 n'était pas le correctif et ne devient
>   pas inutile : il tient sur la règle de licence, pas sur ce défaut.
>
>   *Vrai au 17 août, et « trois » n'est plus le compte.* Elles sont **six**, énumérées depuis
>   `pg_proc` par `I23`/`I24` depuis le 25 août — c'est précisément parce que ce nombre était
>   tenu à la main qu'une cinquième fonction est née fausse (`DIAGNOSTIC.md` §19 et §23).

**4.2 — `llms.txt`** à la racine du site.

> **Fait le 15 août 2026.** `public/llms.txt` — ce que Compass répond, les deux contraintes
> fondatrices, les refus assumés, comment lire `method` et le niveau de fiabilité, et le
> serveur MCP décrit honnêtement : pas encore publié ni référencé sur un registre, cloner le
> dépôt. Repéré en creusant §4.2/4.3 : `robots.txt` autorisait déjà GPTBot/ClaudeBot/
> PerplexityBot — le crawl était couvert, la découverte agentique (MCP) ne l'était pas. Deux
> canaux distincts, comblés séparément. Tableau *Status* du README mis à jour en même temps
> (`MCP server for agents` : Design → Built).

**4.3 — Prompt d'installation** à coller dans un agent de code, qui installe et lance Compass en
une fois.

**4.4 — Case study.** Trois angles à tenir ensemble :

- **L'ouverture conjoncturelle.** 71 100 défaillances d'entreprises sur douze mois glissants,
  niveau inédit depuis 2009 ; 29 766 cessions de fonds de commerce en 2025, en recul de 6,1 % ;
  une entreprise sur deux ne trouve pas de repreneur, au point que l'État a présenté un plan
  « Objectif Reprises » en avril 2026. La valeur d'un outil de jugement monte quand le marché
  descend.
- **La thèse.** L'agrégation n'est pas le produit, l'interprétation l'est. À positionner face
  aux 96 sources nationales d'un côté et aux trois sources assumées de Towncenter de l'autre.
- **Le fil rouge.** Troisième preuve de la conviction portée par Sonor et Tacet, dans un
  troisième secteur. À énoncer explicitement, sinon le lecteur y verra une redite.

---

## Phase 5 — l'exposition : ce qui se passe autour et pendant

Les phases 2 à 4 répondent à « qu'est-ce qui a été là » et « qu'est-ce qu'il y a autour ».
Il manque une dimension : **ce qui va arriver pendant le bail**. Un preneur signe neuf ans ;
l'environnement est autant temporel que spatial.

Ordre de priorité. Le premier point est de loin le meilleur rapport valeur/effort du backlog.

**5.1 — Chantiers de voirie.** ✅ *Fait le 25 août 2026 — `w1-chantiers` (issue #11), même
chantier que ce paragraphe, clos ensemble. Détail complet dans
[`docs/tickets/w1-chantiers.md`](tickets/w1-chantiers.md).*

`opendata.paris.fr` publie l'historique géolocalisé année par année — `chantiers-a-paris-copie`
(2019) à `chantiers-a-paris-copie3` (2023, 20 073 à 32 201 lignes chacun, mesuré le 25 août,
non chargés par ce ticket : voir plus bas) — plus `chantiers-perturbants`, « travaux perturbant
la circulation », en polygones, **mis à jour chaque semaine** — mesuré le 25 août 2026 sur la
description du jeu lui-même (« Mise à jour hebdomadaire ») : ce paragraphe disait
« quotidiennement » avant cette session, et c'était faux, jamais remesuré depuis sa rédaction.

C'est peut-être l'information la plus rentable du produit entier. Dix-huit mois de travaux
devant une vitrine décident d'un commerce, et personne ne le dit au preneur avant la
signature. La forme est un **fait d'exposition, jamais une prévision** :

> Ce local est à 40 m d'un chantier déclaré perturbant, prévu de septembre 2026 à mars 2027.
> Source : Ville de Paris.

Daté, sourcé, décisif, et sans un mot de prédiction. Entre directement dans `Measured<T>` en
`measured` — c'est un acte administratif, pas un modèle.

**Fait pour `chantiers-perturbants` seul.** `compass_premises_within` rend `chantier_exposed`,
`chantier_distance_m` et les champs du chantier (objet, dates, statut) pour tout local à 40 m
d'un polygone. Les cinq millésimes historiques (`chantiers-a-paris-copie` à `-copie3`) restent
non chargés : ils ne servent à rien pour le fait d'exposition d'aujourd'hui, et
`w7-etude-chantiers` §5.5, qui en aura besoin pour son étude rétrospective 2020→2023, les
chargera quand ce chantier-là démarrera plutôt que par anticipation.

**5.2 — Croiser SIRENE et BDCom. Fait le 25 août 2026** — `w1-survie` (#14), qui redit cette
section et §6.2 ; les trois sont clos ensemble.

~~Aucune source nouvelle, aucune licence nouvelle : les deux sont déjà ingérées.~~ **Faux, et
remesuré le 25 août contre la base :** `sirene_establishment` ne porte que siret, siren, geom et
qualité de géocodage — **aucune date, aucun état administratif**. La migration `20260809000006`
le disait déjà en le chargeant (« a different file and a different chantier ») ; cette ligne ne
l'avait jamais recoupé. Le volet continu exige donc le fichier **StockEtablissement** de l'INSEE
(parquet 2,20 Go, millésime 2026-08-01, **Licence Ouverte v2**), chargé par
`scripts/ingest/sirene-stock.ts` — 371 511 établissements parisiens de pied de rue, dont 282 583
rattachés à un quartier.

**Le résultat, mesuré :** 86,5 % des locaux « Café et Restaurant » de 2017 en étaient encore un en
2023 ; seules **52,5 %** des entreprises du même métier immatriculées entre 2017 et 2020 tenaient
six ans. **Le local persiste, l'exploitant tourne** — et aucune des deux sources ne peut le dire
seule. Les deux survies sont rendues comme **deux lignes** par `compass_survival_by_trade`, jamais
fusionnées (§3.4). Le volet BDCom est retenu à l'anonyme, le volet SIRENE servi : c'est la
première fois de ce corpus qu'un appelant anonyme reçoit un vrai taux.

**Le grain est le quartier, pas le tronçon.** Mesuré : sur 6 338 tronçons portant un café ou un
restaurant en 2017, **un seul** atteint un effectif de 30 ; les 80 quartiers l'atteignent tous.
Détail complet dans `docs/tickets/w1-survie.md`.

BDCom donne trois photos (2017, 2020, 2023). SIRENE porte les **dates de création et de
cessation en continu**. Le croisement comble les années aveugles entre recensements et
transforme la rotation triennale en **courbe de survie par activité et par tronçon**.

Attention au piège déjà documenté en §3.3 : un établissement SIRENE n'est pas un local. La
jointure doit rester au niveau où elle est défendable, et un résultat non rattachable à un
local reste `probable`.

**5.3 — Inondation : passer du booléen au zonage.**

`fetchRisks` (`src/services/opendata/environment.ts:45`) appelle déjà Géorisques en point +
rayon 1 km, sans clé. Mais il ne remonte que des booléens libellés : `{ present: true,
libelle: "Inondation" }`. À Paris, sur 1 km, c'est vrai presque partout.

**Cet affichage tombe donc sous la règle fondatrice** : si deux locaux de la même rue reçoivent
le même verdict, Compass n'a rien dit. Le booléen actuel décore, il ne discrimine pas.

| Donnée | Granularité | Pourquoi elle décide |
| --- | --- | --- |
| Zonage **PPRI** | polygone, varie rue par rue le long de la Seine | Assurabilité, travaux imposés, parfois interdiction d'usage en rez-de-chaussée |
| **Remontée de nappe** (BRGM) | maille fine | C'est elle qui inonde une réserve en sous-sol, loin du fleuve |
| Arrêtés **CatNat** | commune | **À écarter** : uniforme sur Paris entier, donc muet |

#### Des niveaux, oui — mais transcrits, jamais synthétisés

La ligne de partage n'est pas *score contre niveaux*. Des niveaux nommés sont la bonne forme,
et la doctrine les emploie déjà : la fiabilité tient en quatre niveaux **précisément parce
qu'**un pourcentage serait invérifiable (§2.5). La ligne est ailleurs.

**Transcrit — légitime.** Le PPRI est *déjà* catégoriel : l'autorité publie des zones
réglementaires et des classes d'aléa, et le BRGM publie la remontée de nappe en classes. Ces
niveaux ne sont pas une invention de Compass, ce sont ceux du régulateur, et ils portent une
valeur juridique. Les afficher relève de la transcription, donc de `measured`.

**Synthétisé — interdit.** Fondre PPRI + remontée de nappe + CatNat en un « risque
inondation : 3/4 ». Les pondérations seraient inventées, et deux locaux aux expositions
réellement différentes s'écraseraient sur le même niveau. C'est mot pour mot l'argument du
README contre le score unique sur 100 : un score moyenne ce qui tire en sens contraire.

**Donc un niveau par dimension, côte à côte**, comme les scores d'aménités qui sont affichés
par catégorie et jamais moyennés. Le métier arbitre : une chambre froide en cave n'a pas la
même exposition que le prêt-à-porter du même immeuble.

#### Transcrire ne suffit pas

Un preneur ne sait pas ce que « zone bleue » veut dire. La thèse du produit étant la distance
entre la donnée brute et une phrase sur laquelle on peut décider, il faut trois couches :

1. **La zone** — transcrite, `measured`.
2. **Ce que le règlement dit de cette zone** — transcrit aussi : ce qu'il interdit, impose ou
   conditionne. Avec la précaution déjà retenue pour le PLU : *informatif, sans valeur
   réglementaire*.
3. **Ce que ça implique pour ce métier** — `derived`, et énoncé comme tel.

#### Le test de granularité, avant de s'engager

La question n'est pas « est-ce que ça varie » mais « est-ce que ça sépare ». Nuance qui joue
en notre faveur : *« hors zone PPRI »* dans le 20ᵉ est une **vraie réponse discriminante**,
elle sépare les berges du reste de la ville. L'actuel *« inondation : présent »* dans un rayon
d'un kilomètre est vrai partout et ne sépare rien. C'est la différence entre un négatif vrai
et un non-dit.

Le périmètre parisien est un avantage ici : les classes de PPRI diffèrent d'un document à
l'autre en France, et une échelle nationale uniforme exigerait une normalisation — donc une
invention. Paris n'a qu'un PPRI, dont les classes se reprennent **telles quelles**.

**5.4 — Sources d'appoint.** À vérifier avant engagement ; **terrasses vérifiée et ingérée le
25 août 2026, affichée sur la fiche le 26** (`w1-terrasses`, issue #15, même chantier que ce
paragraphe), les trois autres restent non confirmées.

| Source | Producteur | Apport |
| --- | --- | --- |
| Terrasses et étalages ✅ | Ville de Paris | Signal de vitalité **et** réponse directe à « puis-je avoir une terrasse ici ? », décisive pour un restaurateur. `terrasse_status` ('oui'/'non'/'inconnu') exposé par `compass_premises_within` — 'inconnu' quand l'adresse est partagée par plusieurs locaux et que l'autorisation ne dit pas lequel. La fiche du local rend les trois états depuis le 26 août, avec le type, la réserve « une autorisation n'est pas une terrasse installée aujourd'hui » et la date de la source. Détail dans `docs/tickets/w1-terrasses.md`. |
| Filosofi **carroyé 200 m** | INSEE | Revenus et population sur une maille de 200 m — satisfait la règle de granularité, contrairement à l'IRIS |
| **BPE** | INSEE | Équipements recensés administrativement. Croisé avec OSM, il fait passer un comptage de *probable* à **corroboré** : deux sources indépendantes, la mécanique de §2.5 exactement |
| Comptages vélo permanents | Ville de Paris | Pas des piétons, mais un rythme horaire **mesuré**, au tronçon, sur plusieurs années. Honnêtement étiqueté, meilleur que le proxy actuel |
| Marchés alimentaires | Ville de Paris | Jours et emprises : un flux périodique qui change tout pour un commerce de bouche |

**5.5 — L'étude rétrospective chantiers × BDCom.** Un résultat de méthode, pas une
fonctionnalité.

Une fois 5.1 branché, le corpus permet une question testable : *les locaux à moins de N mètres
d'un chantier de plus de M mois ont-ils disparu plus souvent entre les recensements 2020 et
2023 que leurs voisins de la même rue et du même métier ?*

Publiable sur la page méthodologie, falsifiable, et **c'est ce qui donnerait le droit**
d'afficher plus tard une association *mesurée* plutôt qu'une intuition. Si l'effet n'existe
pas, on l'apprend aussi et on ne l'affiche pas. C'est la démarche qui sépare Compass d'un
tableau de bord.

**5.6 — Droit de préemption commercial.** Remonté du différé le 12 août, parce que c'est
l'équivalent **ouvert et amont** de l'annonce commerciale (voir le refus d'Appear Here
ci-dessous).

Les déclarations d'intention d'aliéner un fonds ou un bail commercial sont obligatoires dans
les périmètres de sauvegarde du commerce — 5ᵉ, 6ᵉ et une partie du 7ᵉ depuis le 7 août 2024.
C'est une **déclaration administrative d'intention de céder** : exactement le signal qu'une
place de marché vend, mais dans une forme sourçable, gratuite et sans dépendance commerciale.

Préalable, non tranché : vérifier si ces déclarations sont publiées en open data. Si elles ne
le sont pas, la piste s'arrête là et il faut le dire.

**5.7 — Tester avant de signer.** Une page de méthode, aucune donnée, aucune dépendance.

Le pop-up n'est pas un concurrent du produit : c'est un **instrument de dérisquage de la
décision que Compass instruit**. Avant de s'engager neuf ans sur une rue, on peut la louer un
mois. Bail dérogatoire contre bail 3/6/9 : ce que chacun engage, ce qu'il coûte, quand tester
vaut mieux que signer.

C'est de l'interprétation — ce que le produit dit vendre — et ça se livre sans lire une seule
ligne de qui que ce soit.

**5.8 — Les sources articulées dans `PERIMETRE.md` et sans maison dans ce plan.** Relevé le
12 août : elles sont raisonnées, sourcées, parfois annoncées « Planned » dans le README, mais
n'ont **aucune entrée de backlog** — donc personne ne les prend jamais.

| Source | Ce qu'elle répond | Réserve déjà écrite |
| --- | --- | --- |
| **DVF** (DGFiP) | €/m² des **murs** commerciaux vendus dans la rue sur 5 ans | Exclut les fonds et les cessions de parts |
| **GTFS IDFM** | Temps de trajet **réels** et fréquences — « combien de temps met-on vraiment pour venir ici », en isochrones | — |
| **Comptes RNE / INPI** | Les commerces voisins gagnent-ils de l'argent | **~45 % déposés avec déclaration de confidentialité**, biais structurel vers les grandes structures : un échantillon, jamais une moyenne de rue |
| **Bruitparif** + BD TOPO | Remplace le proxy routier de 500 m | Bon à l'échelle du quartier, insuffisant au trottoir — **l'idée transposable de Tacet** : ray-tracing sur la volumétrie bâtie. La doctrine §5.3 (transcrit / synthétisé) s'y applique telle quelle |
| **Série IRIS historique — la *pente*** | La gentrification et le déclin sont des **tendances, pas des états** : la pente du revenu médian sur 15 ans en dit plus qu'un instantané | Filosofi carroyé 200 m (§5.4) est un instantané — l'idée de pente n'avait aucune maison |
| **Logements autorisés et commencés** | Série mensuelle communale : les futurs habitants, deux ans à l'avance | Distincte de Sitadel, restée au différé |

**5.9 — `bdcom20032020` : porter l'historique de six à vingt ans.** Le service APUR expose
**sept couches datées de 2003 à 2020, vacants inclus** — dix-sept ans d'évolution déjà
calculés à la source. C'est vraisemblablement **le levier le plus élevé de tout le corpus**,
et il n'avait aucune entrée de backlog malgré une section entière dans `BDCOM.md`.

Deux réserves qui commandent : le service **ne porte aucune licence explicite** — techniquement
joignable n'est pas juridiquement réutilisable — et il alimente une application interne de
l'APUR. **Suspendu à la réponse au courrier envoyé le 10 août**, qui demande aussi si une
couche 2023 complète (avec les vacants) est distribuable.

---

## Phase 6 — la capacité d'analyse déjà dans le schéma

Relevé le 12 août : le modèle répond à des questions que **rien ne pose**. Aucune de ces
analyses n'exige de source nouvelle — seulement le déploiement, et une fonction pour chacune.

**6.1 — Matrices de transition d'activité.** « Que devient une boulangerie ? »
`premise_observation.activity_code` × trois millésimes par local donne la matrice complète,
par un `lag()` sur `(location_id, vintage_year)`. Aujourd'hui cette information n'existe que
sous forme de **booléen** (`changed_from_previous`) : on sait qu'il y a eu changement, jamais
vers quoi.

**6.2 — Analyse de survie. Fait le 25 août 2026**, avec §5.2 et `w1-survie` (#14) — voir §5.2
pour la mesure et `docs/tickets/w1-survie.md` pour le détail. Ce qui suit reste vrai de la piste
*par local*, que ce chantier n'a pas prise : il agrège par quartier et par métier, jamais par
local, parce qu'un SIRET ne nomme pas un local.

`first_seen_vintage_id` / `last_seen_vintage_id` plus les avis
BODACC datés donnent une durée de tenure par local. L'ingrédient manquant — les **dates de
cessation SIRENE** — est déjà identifié en §3.4. Rappel de prudence porté par la migration
BODACC : une durée médiane avant revente n'est **pas** un taux de rotation.

**6.3 — Agrégation par rue entière.** `street_segment.voie_id` regroupe les tronçons d'une
même voie ; rien ne l'utilise. Et `compass_street_rotation`, seule fonction qui descend au
tronçon, n'a toujours aucun appelant produit — ni front ni MCP. ~~Pas même la porte.~~ **La porte
l'appelle depuis le 25 août** : `I25`/`I26` et le bras D, ajoutés par `w0-retenue` (#57) après
qu'elle a été trouvée en train d'affirmer `changed_since_previous = 0` à un appelant anonyme
(`DIAGNOSTIC.md` §19). Une fonction que personne n'appelle répond quand même par PostgREST.

**6.4 — Exposer les prix par activité.** Le prix médian par métier n'existe aujourd'hui que
comme **baseline d'évaluation figée** ; aucune fonction ne le sert. Règle rappelée : grouper
sur le code d'activité BDCom, **jamais** sur le champ texte libre de BODACC.

**6.5 — Ventes contre liquidations, par quartier et par activité.** Entièrement joignable,
jamais posé. C'est la lecture qui distingue une rue qui se renouvelle d'une rue qui meurt.

**6.6 — Resserrer les candidats par activité.** Le levier nommé en §3.3 contre le résidu
structurel de 36,7 % `probable` : quand trois locaux partagent une adresse et qu'un seul est
un restaurant, un avis visant un restaurant se rattache mieux. **Cela ne rendra jamais un
fait `etabli`** — la source ne nomme toujours pas le local — mais peut faire passer de
`probable` à `corrobore`.

**6.7 — Colonnes chargées que rien ne lit.** À servir ou à documenter comme volontairement
dormantes : `is_bio` (densité bio par quartier, à une requête), `situation` (angle, cour
d'immeuble, concentration commerciale — la survie comparée par exposition n'a jamais été
posée), les bandes de surface, et surtout **`bodacc_judgment.judged_on`** : la date de
jugement est chargée et jamais utilisée, la chronologie plaçant les procédures à leur date de
**publication**, qui n'est pas la date de décision.

**6.8 — L'agent qui s'évalue** (repris de `REPRISE.md`, qui n'avait pas d'écho ici). Trois
manques concrets plutôt qu'une intention : `confidence_reason` est du **texte libre**
concaténé en SQL, qu'aucune machine ne peut relire — il faut la règle déclenchée et les
valeurs en colonnes ; la **composition de fiabilité n'est pas historisée**, donc aucun progrès
n'est démontrable, seulement la dérive ; et la porte sait dire si la qualité a dérivé, jamais
de combien elle a avancé.

> **Fait le 15 août 2026, sur `dbefhvmyfmmhjeetdddu`.**
>
> Les trois manques, dans l'ordre où ils sont listés ci-dessus :
>
> 1. `compass_address_timeline` gagne une colonne `confidence_rule`
>    (`20260815000001_confidence_rule.sql`) — un type enum de dix codes stables, un par
>    branche des `CASE` qui produisaient déjà `confidence_reason`. Rien n'est redécidé :
>    même branche, un code à côté de la phrase plutôt qu'à sa place. Le jeu doré vérifie
>    désormais `rule` en égalité stricte sur les quatre cas qui testaient une sous-chaîne de
>    prose française (`reason_contains`, conservé pour la lisibilité, mais plus seul juge).
> 2. `eval/confidence_history.jsonl`, un point par (cible, jour), écrit par
>    `scripts/eval/run.ts` après le bras B. Choix délibéré : un fichier suivi par git dans
>    `eval/`, pas une table dans le schéma produit — c'est de la comptabilité d'éval, pas une
>    donnée du domaine.
> 3. La porte rapporte désormais le delta des quatre nombres contre le point précédent et la
>    tendance établi+corroboré en points de pourcentage — « s'améliore » / « recule » /
>    « stable » — en plus de l'écart contre la baseline gelée du 9 août. Les deux mécaniques
>    restent distinctes : la baseline dit si on s'est écarté d'un instantané fixe, l'historique
>    dit si on avance.
>
> Premier point posé le jour même, rien à comparer encore — la tendance apparaîtra à la
> prochaine exécution.

**6.9 — Rendre vérifiable l'invariant de `PERIMETRE.md` §8** : *aucun chiffre ne peut exister
uniquement dans l'UI*. La règle est écrite, la porte d'évaluation existe, et rien ne relie les
deux. `FAILURE_MODES.md` reconnaît d'ailleurs que le rendu n'est pas couvert — « une interface
peut toujours montrer une colonne en en cachant une autre ».

> **Moitié faite le 15 août 2026 — l'autre moitié attend `src/`, donc Lovable.**
>
> L'invariant a deux sens, et un seul est backend. Celui qui l'est : rien ne doit exister
> *uniquement côté privilégié*, c'est-à-dire aucune fonction `compass_*` qui ne serait pas
> exécutable par `anon`. **I11** (`eval/invariants.sql`) le vérifie désormais sur les dix
> fonctions à chaque exécution. Il a trouvé, en le posant, exactement le genre de défaut qu'il
> existe pour attraper : `compass_street_key` et `compass_bodacc_street_key` n'avaient **aucun
> `GRANT EXECUTE` explicite** et ne fonctionnaient que par le défaut `PUBLIC` de Postgres —
> jamais vérifié jusqu'ici, le même angle mort que l'incident RLS-sans-GRANT de
> `20260809000009`, sous une autre forme. Corrigé dans
> `20260815000002_grant_execute_completeness.sql`.
>
> L'autre sens — rien ne doit exister *uniquement dans un composant React*, la formulation
> réellement écrite dans `PERIMETRE.md` §8 — ne se vérifie pas sans lire `src/`. Delibérément
> pas fait maintenant : consigne du 15 août de laisser `src/` de côté jusqu'au 1ᵉʳ septembre.
> Un audit en lecture seule (aucune édition, juste repérer tout calcul d'affichage qui
> n'aurait pas d'équivalent `compass_*`) resterait possible sans rouvrir de chantier front —
> à la demande, pas par défaut.

---

## Refusé — les places de marché de locaux (Appear Here et assimilées)

Examiné le 12 août à propos d'`appearhere.fr` : pop-up, boutiques et *showrooms* louables au
jour, à la semaine ou au mois, concentrés sur le Marais, République et Saint-Germain.

**Trois refus déjà écrits s'appliquent.** Le produit ne détient aucun stock et ne moissonne
aucun portail ; les annonces d'une plateforme privée ne sont pas de la donnée ouverte, et leurs
conditions d'utilisation en interdisent la reprise ; et la position de Compass est **en amont
de l'annonce**, seul endroit où il possède un avantage que personne d'autre n'a. En aval il
affronte des portails avec du stock, des contrats et de la fraîcheur, et il perd.

**Mais l'argument décisif est ailleurs, et il est interne au produit.** Ces plateformes
couvrent quelques centaines d'emplacements en quartiers prime. Le corpus en couvre 85 418.
Superposer les deux fabriquerait une **fausse absence** : « pas d'annonce ici » se lirait
« rien à saisir ici », alors que la vérité est « cette plateforme ne couvre pas ce quartier ».

C'est le défaut corrigé le 12 août dans tout le chemin de scoring — absent n'est pas zéro. Le
réintroduire par la porte d'un partenariat serait incohérent.

Un lien d'affiliation, lui, ne casserait aucune règle de traçabilité — ce n'est pas un chiffre.
Mais il casse le positionnement, crée une dépendance commerciale et se périme sans prévenir.
**Non maintenant, et vraisemblablement jamais dans l'interface.** Ce qui reste de l'idée est
en 5.6 et 5.7.

---

## Concurrence — Aino

« AI infrastructure for the built environment », couche de décision au-dessus du SIG :
opérations spatiales en langage naturel (*« Draw a 1 km buffer », « Show me the foot traffic »*),
couches OSM avec décompte, export CSV/PNG, format éditorial « Daily Agent #N » et webinaires
gratuits.

**Ce qu'ils font mieux : le discours.** Leur phrase — *« Every figure is traceable to its
dataset. This is not a mood board, it's evidence for a submission »* — est mot pour mot la
thèse de Compass. Nous avons la version plus forte de cet engagement (niveaux calculés,
licences bloquantes, `Measured<T>` qui rend la règle mécanique) et l'énonçons dans un README
quand eux en font une accroche. **Produit supérieur, discours inférieur.** À corriger.

**À voler.** Le décompte par couche : ils écrivent « Parks: 43 features, OpenStreetMap ». Ils
affichent le **dénominateur**. Compass affiche `source · millésime · méthode` mais pas
*combien d'éléments ont été comptés*. « 12 commerces alimentaires dans 800 m » est refaisable
par le lecteur ; « alimentation 64/100 » ne l'est pas. Peu de travail, très aligné.

**À voler aussi.** Le format sériel numéroté, un cas d'usage par publication.

**À ne pas copier.** Leur généralité horizontale : un outil pour des professionnels qui savent
déjà faire du SIG et veulent aller plus vite. Compass est vertical — une décision, une
personne, un avis argumenté. Notre équivalent existe et s'appelle §4.1.

**À refuser franchement.** Ils revendiquent le « foot traffic ». Or aucun comptage piéton
ouvert ne couvre l'Île-de-France, c'est documenté en §3. Ils utilisent donc un proxy tu, ou une
source commerciale. **Notre refus explicite est un actif concurrentiel, pas un manque** : ils
promettent le chiffre que tout le monde veut, nous expliquons pourquoi personne ne peut le
donner honnêtement. C'est le terrain où nous gagnons contre eux, et il vaut d'être tenu
explicitement dans la case study (§4.4).

Ne pas copier non plus leur export libre : le refus d'exporter une liste est structurant
(§2.6), pas un retard.

---

## Différé, à garder en vue

- **Vélib' en GBFS** — API sans clé, ~1 400 stations, rafraîchie chaque minute. Le cycle de
  remplissage d'une station porte la direction et l'horaire du flux de la rue. Usage détourné que
  personne ne fait.
- **Sitadel** (SDES) et **observatoire des quartiers de gare du Grand Paris Express** (APUR) pour
  la projection : un bail engage sur neuf ans, l'environnement est autant temporel que spatial.
- **Protocole de comptage piéton manuel**, publié comme outil autonome — vingt minutes sur le
  trottoir, méthode d'extrapolation incluse. Transforme un trou de données en méthode.
- ~~Vérifier si les déclarations de cession du droit de préemption commercial parisien sont
  publiées en open data.~~ **Remonté en §5.6 le 12 août** : c'est l'équivalent ouvert et amont
  de l'annonce commerciale, donc mieux qu'un différé.
- ~~Trancher entre `bun.lockb` et `package-lock.json`~~ **Fait le 12 août** : les deux sont
  conservés et **alignés**, vérifiés paquet par paquet. Bun ne tourne pas sur cette machine
  (Windows ARM64, aucun binaire publié) — la régénération passe par l'image `oven/bun` en
  conteneur, avec un répertoire ne contenant que `package.json`. Procédure dans `REPRISE.md`.
- **Les deux dernières lignes d'hygiène sont écartées le 15 août, avec leurs raisons.**

  `sortir public/sitemap.xml du suivi git` — le hook `prebuild` le régénère bien, donc
  l'idée tient *si* la chaîne de déploiement passe par `run build`. Impossible à vérifier :
  Lovable construit avec bun et son pipeline exact n'est pas lisible d'ici. Si elle appelle
  `vite build` directement, le sitemap disparaît du site publié — silencieusement, sur un
  produit qui a investi dans le SEO (guides, données structurées, routes bilingues).
  **Risque invérifiable contre bénéfice cosmétique : on garde le fichier suivi.**

  `ajouter un .gitattributes (* text=auto eol=lf)` — renormaliserait les fins de ligne du
  dépôt entier, donc un diff massif touchant tous les fichiers, en pleine synchronisation
  bidirectionnelle avec Lovable. Les avertissements CRLF sont bruyants mais inoffensifs :
  `core.autocrlf` fait déjà le travail. **Le remède est plus risqué que le symptôme.**
- ~~Regarder les vulnérabilités `npm audit` à froid~~ **Fait le 12 août**, sans `--force` :
  50 → 8 côté GitHub. Le tri s'est fait sur la **portée**, pas la gravité — les seules failles
  atteignant un visiteur (XSS React Router, `nanoid`) sont corrigées. Les huit restantes
  exigent une majeure et ne sont pas atteignables : l'avis critique de `vitest` vise son
  serveur d'interface, jamais lancé ; ceux de `vite` et `esbuild` visent le serveur de
  développement, alors que le produit est statique. Seule candidate discutable à terme :
  React Router 7, la seule des huit qui touche le code livré.
