# [P0] w1-terrasses — Terrasses et étalages autorisés

**ID** `w1-terrasses` · **vague 1** · **Q3 2026** · **P0**
**Dépend de** `w0-fiche`
**Sources** `terrasses`

## Pourquoi
Pour un café, c'est binaire : une terrasse est-elle déjà autorisée sur cette façade ?

## Comment
opendata.paris.fr/terrasses-autorisations, géolocalisé. Rattacher à l'adresse / au linéaire. Signal de vitalité et réponse d'exploitation.

## Doctrine
Fait administratif, measured. Ne pas en déduire un CA terrasse.

## Fait quand
La fiche restauration affiche oui/non/inconnu terrasse, avec le type (permanente, estivale) et la source.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Fait le 25 août 2026 — le critère est démontré par un appel anonyme réel, sur les trois états

**Issue [#15](https://github.com/IvandeMurard/paris-compass/issues/15)**, session 9. `PLAN-ACTION-VACANCE.md`
notait une contradiction assumée avant ce ticket : `PLAN.md` §5.4 classe les sources d'appoint
« à vérifier avant engagement, aucune n'a été confirmée », alors que ce ticket était en P0 avec
un critère définitif — « la vérification reste un préalable non écrit du ticket ». C'est par là
que la session a commencé.

### La source, vérifiée avant tout engagement

`terrasses-autorisations`, Direction de l'Urbanisme, ODbL. Mesuré le 25 août : **24 204 lignes**,
10 sans `typologie` du tout (ignorées, rien à classer). Le jeu ne publie **aucune cadence de mise
à jour** dans sa description (contrairement à `chantiers-perturbants`) et **aucun champ de date
ou de statut** — une autorisation qui a expiré n'est distinguable d'une autorisation active nulle
part dans le schéma. C'est un manque déclaré, pas une mesure : consigné dans la cadence `rare` et
sa note, plutôt que passé sous silence.

**Le type (permanente/estivale) n'a pas de table de codes**, contrairement à
`chantiers-perturbants`. La page réglementaire de paris.fr liée par le jeu tranche : « Les
terrasses estivales sont autorisées pour 7 mois chaque année, du 1er avril au 31 octobre »,
contre la « terrasse annuelle » pour le reste — l'« annuelle » du texte officiel est le
« permanente » du ticket. `categorie` est dérivée du texte `typologie` lui-même (`ESTIVALE`,
`(É)TALAGE`, sinon `permanente`), jamais inventée.

### Le rattachement par proximité a été mesuré, puis rejeté

Mesuré avant d'écrire l'attache : sur un échantillon aléatoire de 2 000 points, le local BDCom
le plus proche d'une terrasse est à une médiane de **4,4 m** (p90 10,7 m, p99 22 m) — assez
serré pour donner confiance dans un rattachement par proximité, à la manière de `w0-plu` et
`w1-chantiers`. **Un contrôle sur 12 terrasses nommées a dit l'inverse** : « LE MANDARIN DE
CHOISY » a pour local BDCom le plus proche, à 9 m, l'enseigne « PICARD » (un surgelé) ; « LEON DE
BRUXELLES » à 9,5 m pointe sur « MAN COCO ». Un tiers de l'échantillon pointait sur le mauvais
commerce — exactement le piège déjà documenté dans
[`src/services/compass/premiseHistory.ts`](../../src/services/compass/premiseHistory.ts) pour le
rattachement OpenStreetMap ↔ BDCom : le plus proche n'est pas la même vitrine dès que plusieurs
locaux se partagent une adresse ou un pas de porte.

**Le rattachement se fait donc par adresse**, en réutilisant la clé de rue déjà posée pour
BODACC (`compass_bodacc_street_key`, `20260809000002_bodacc_address_matching.sql`) plutôt qu'en
la réinventant : les deux sources écrivent le même vocabulaire de voie en toutes lettres et
accentué (« AVENUE DE CHOISY »), là où BDCom écrit « AV CHOISY ». L'adresse brute du jeu
(« 125 AVENUE DE CHOISY ») est parsée en numéro + type de voie + nom
(`scripts/ingest/terrasses.ts`, `parseAddress`) — mesuré sur l'export complet : **24 145 des
24 204 adresses se parsent (99,8 %)**, le reste étant sans numéro du tout ou franchement corrompu
(une adresse électronique trouvée dans le champ adresse).

**Trois états, pas deux — la question posée au lecteur plutôt qu'une réponse calculée pour
lui.** Mesuré sur les 24 145 adresses parsées : **4 295 adresses distinctes** rattachent à
**exactement un** local BDCom, **7 500** à **plusieurs** (69 % des locaux partagent un numéro de
rue, `PLAN.md` §3.3, et ce jeu ne fait pas exception), **2 625** à aucun. Une adresse partagée ne
dit pas *lequel* des locaux colocalisés porte l'autorisation — `terrasse_status` répond
`'inconnu'` plutôt que d'en tirer un au hasard, le même principe que `premiseHistory.ts` applique
déjà au rattachement OSM ↔ BDCom.

### Le critère, joué contre le distant, clé publiable seule, aucune chaîne `DATABASE_URL`

`compass_premises_within`, étendue de quatre colonnes
(`20260825000010_premises_within_terrasses.sql`), sur les trois états :

| Appel | `terrasse_status` | Détail |
| --- | --- | --- |
| `p_lat=48.8383872, p_lng=2.2982311` — **86 RUE ABBE GROULT** | **`oui`** | adresse non partagée, `terrasse_permanente: true` |
| `p_lat=48.8431196, p_lng=2.3419733` — **7 RUE ABBE DE L'EPEE** | **`inconnu`** | adresse partagée entre plusieurs locaux, `terrasse_estivale: true` |
| `p_lat=48.8539344, p_lng=2.3359628` — **1 RUE ABBAYE** | **`non`** | aucune autorisation sur cette adresse |

Chargé : **24 194** lignes (10 ignorées), rattachées à **4 295** locaux `oui` et **19 311**
locaux `inconnu` (des locaux, pas des adresses — 7 500 adresses partagées se répartissent sur
~2,6 locaux chacune en moyenne).

### Ce qui n'est pas fait, et pourquoi c'est le bon arrêt

**Aucun test unitaire n'a été ajouté** pour `parseAddress`/`categorie`, alors que ce sont les
premières fonctions de parsing de texte de tout `scripts/ingest/` — délibéré : aucun autre
chargeur (`bdcom.ts`, `geography.ts`, `plu.ts`, `chantiers.ts`) n'a de test unitaire, la
discipline établie est la mesure ad hoc (comptage, contrôle manuel sur échantillon) plus la porte
`eval`. Introduire un test unitaire pour ce seul fichier aurait rompu la cohérence du dossier
sans que le ticket ne le demande. La mesure elle-même (99,8 % parsé, contrôle manuel de
12 échantillons) est consignée ci-dessus et rejouable depuis les commentaires du code source.

**SIRET n'a pas servi au rattachement**, bien que présent sur 96 % des lignes. Croiser un SIRET
de ce jeu à un local BDCom demanderait de passer par SIRENE, exactement l'inférence que
`docs/SESSIONS.md` qualifie de « plus difficile du backlog » pour `w1-survie` — hors du
périmètre d'une ingestion droite. Le champ est conservé dans `terrasse_autorisation.siret` pour
qu'un chantier futur n'ait pas à retélécharger la source.

**Le front-end ne consomme aucun des nouveaux champs**, même arbitrage que PLU et chantiers :
`premiseHistory.ts` ne les mappe pas sur `PremiseCandidate`, et Lovable est indisponible jusqu'au
1ᵉʳ septembre.

**Le chargeur n'est pas câblé sur le cron**, comme PLU et chantiers avant lui — cadence `rare`
dans `ingestion_run`, chargeable seulement à la main.

### Portes

`typecheck` ✓ · **108 tests** ✓ (inchangé, voir « aucun test unitaire ajouté » ci-dessus) ·
`build` et `build:dev` ✓ · `eval` — 20/20 invariants, 8/8 cas dorés, composition de fiabilité
stable à 57,26 %. Sort avec le code 3 (`AVERTISSEMENT`), pas 0 : dix écarts de baseline sous le
seuil bloquant, la même dérive naturelle BODACC/SIRENE déjà notée aux clôtures précédentes —
`scripts/eval/run.ts` distingue `ÉCHEC` (code 1, `failures > 0`) d'`AVERTISSEMENT` (code 3,
`warnings > 0` seul) ; c'est le second, pas le premier. `verify:mcp` non relancée : ce ticket ne
touche ni `src/core/` ni `mcp-server/`.

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260825000009_terrasse_autorisation.sql` | Table `terrasse_autorisation`, rattachement dénormalisé sur `premise_location`, septième ligne `ingestion_run` |
| `supabase/migrations/20260825000010_premises_within_terrasses.sql` | `compass_premises_within` étendue de quatre colonnes terrasse |
| `scripts/ingest/terrasses.ts` | Chargement, parsing d'adresse, rattachement à trois états |
| `scripts/ingest/lib/db.ts` | `IngestionSource` gagne `'terrasses'` |
| `src/types/database.ts` | Signature de `compass_premises_within` à jour |
| `docs/PLAN-ACTION-VACANCE.md` §5.4 | Contradiction résolue, fait le 25 août consigné |

---

## Fait le 26 août 2026 — la fiche affiche les trois états, et la source est remesurée

**Issue [#15](https://github.com/IvandeMurard/paris-compass/issues/15)**, session 13. La section
précédente décrit une ingestion **posée le 25 août** — table, chargeur, quatre colonnes sur
`compass_premises_within` — et le dit elle-même : « le front-end ne consomme aucun des nouveaux
champs ». Or le « Fait quand » du ticket porte sur la fiche. C'est pour cela que `#15` est restée
ouverte quand `#11` et `#14` se fermaient, et c'est ce qui se termine ici.

**Rien n'a été rechargé.** Le prompt de session demandait d'écrire le chargeur ; il existait déjà,
mesuré et posé. Le rejouer pour « démontrer » aurait réécrit les quatre colonnes terrasse des
85 418 locaux sans rien apprendre. La vérification demandée a donc été faite **contre la source et
contre la base**, pas contre une page qui en parle.

### La source, revérifiée avant d'y toucher

Mesuré le **26 août 2026** sur `opendata.paris.fr/api/explore/v2.1`, entrée de catalogue puis
export `geojson` complet — pas sur la section du 25 août, qui est de la prose.

| Ce que le ticket suppose | Mesuré le 26 août 2026 |
| --- | --- |
| Le jeu existe | `terrasses-autorisations`, « Terrasses et étalages : Autorisations », Direction de l'Urbanisme — Ville de Paris |
| Licence redistribuable | **ODbL**, `metas.default.license` |
| Géolocalisé | **24 199 entités, 24 199 géométries `Point`, aucune nulle** |
| Type permanente / estivale / étalage | Dérivable : **14 252 permanente, 4 988 estivale, 4 949 étalage**, 10 lignes sans `typologie` du tout |
| Rattachable à une adresse | **24 140 adresses parsées sur 24 199 (99,8 %)** |
| SIRET présent | 23 275 sur 24 199 (96,2 %) |
| Date de dernière modification | `metas.default.modified` = **2026-08-26T05:01:26Z**, le jour même |

**Le jeu porte donc bien ce que le ticket suppose.** Deux écarts avec la section du 25 août, tous
deux datés plutôt que réécrits par-dessus.

**1. Le jeu bouge, et il faut le savoir : 24 204 lignes le 25 août, 24 199 le 26.** Cinq de moins
en vingt-quatre heures, et `metas.default.modified` avance au jour le jour. Ce n'est pas une
cadence — deux points n'en font pas une, et 5 lignes sur 24 199 en un jour reste une usure lente,
compatible avec la note `rare` déjà consignée. Mais cela suffit à trancher une question
d'affichage : **la date de la source n'est pas décorative sur cette couche**, et c'est pour cela
que la fiche la porte (voir plus bas). `cadence` et `cadence_note` n'ont **pas** été changées : le
jeu ne publie toujours aucune cadence, et réécrire une note sur deux mesures serait exactement
l'erreur que `CLAUDE.md` interdit.

**2. « Aucun champ de date ou de statut » est faux : `periode_installation` existe.** La section
du 25 août l'écrit ; le catalogue liste bien un champ `periode_installation` (« Période
d'installation »). Ce qu'il porte, mesuré sur l'export complet :

| `periode_installation` | n |
| --- | --- |
| *nul* | **23 474** (97,0 %) |
| `Toute l'année` | 717 |
| une fenêtre datée (`du 01/04 Au 30/09`, `du 11/04 Au 10/10`, …) | 8 |

**La conclusion opératoire du ticket tient — pas sa description du schéma.** Un champ renseigné
sur 3 % des lignes ne distingue toujours pas une autorisation expirée d'une autorisation active,
et il n'existe ailleurs dans le schéma ni date de délivrance ni statut. Mais la phrase « aucun
champ de date » était trop forte, et il fallait le mesurer plutôt que la recopier.

**Et ce champ corrobore la dérivation `categorie`, ce qui n'était pas acquis.** Croisé sur les
725 lignes renseignées : les **717** « Toute l'année » se répartissent en 435 `permanente` et
282 `etalage` — **zéro `estivale`**. Deux signaux indépendants — le texte libre `typologie` d'un
côté, `periode_installation` de l'autre — ne se contredisent sur aucune de ces lignes. Les **8**
fenêtres datées tombent toutes sur des lignes que la dérivation appelle `permanente` ou `etalage`
alors que la fenêtre, elle, est saisonnière : un désaccord réel, borné à **8 lignes sur 24 199
(0,03 %)**, dont une (`du 31/12 Au 30/12`) est incohérente à la source.

**La citation réglementaire tient, relue à la source.**
[paris.fr](https://www.paris.fr/pages/terrasses-et-etalages-3516), 26 août : « Les terrasses
estivales sont autorisées pour 7 mois chaque année, du 1er avril au 31 octobre », contre
« terrasse annuelle » pour l'autre sorte. C'est cette phrase que la fiche affiche désormais, avec
le lien. La page a changé d'URL depuis celle que la description du jeu donne encore
(`/professionnels/l-entreprise-au-quotidien/…`) ; les deux répondent.

**Les 59 adresses non parsées, ventilées.** La section du 25 août les décrit comme « sans numéro
du tout ou franchement corrompu (une adresse électronique trouvée dans le champ adresse) ». Au
26 août : 8 adresses nulles, **36 sans numéro en tête** (« RUE FERDINAND DUVAL », « BOULEVARD
FLANDRIN NORD ») et **15 avec un numéro que le motif refuse**, dont 13 portent un suffixe
alphanumérique que `[A-Z]?` n'absorbe pas — `32BV RUE DES PLANTES`, `1P2 PLACE JEAN PRONTEAU`,
`14U2 AVENUE PIERRE MENDES FRANCE` — et une porte une plage de trois numéros (`1/3/5 PLACE JEAN
MARAIS`) là où le motif n'en acceptait qu'une. **L'adresse électronique, elle, est toujours là**
(`GOUROLMDA@YAHOO.FR`) : ce paragraphe a d'abord écrit le contraire, sur un échantillon de douze
lignes pris pour l'ensemble, et c'est corrigé ici — voir la section suivante.

### Les suffixes collés au numéro sont corrigés, et la mesure dit ce que ça change

Le motif d'origine acceptait une lettre unique (`22B AVENUE RAPP`), `BIS`/`TER`/`QUATER` et une
plage à deux numéros. Il ne connaissait pas les suffixes que la source colle au numéro — `32BV`,
`1P2`, `14U2`, `1Z1`, `183P41` — ni les plages à trois numéros.

**Le piège, et c'est lui qui dicte la forme du correctif : le suffixe doit être collé.** Autoriser
une espace avant un suffixe de plusieurs caractères laisserait la correspondance gloutonne avaler
un type de voie de trois lettres, et `12 RUE DES PLANTES` se lirait « numéro 12, type de voie DES,
nom PLANTES ». La lettre écrite à part (`10 B RUE DE LA PAIX`) reste donc traitée séparément, et
bornée à un caractère par un `\b` qui l'empêche de mordre sur le `R` de `RUE`.

**Mesuré sur l'export complet du 26 août 2026, ancien motif contre nouveau, adresse par adresse :**

| | Ancien | Nouveau |
| --- | --- | --- |
| Adresses parsées sur 24 199 | 24 140 (99,76 %) | **24 154 (99,81 %)** |
| Gagnées | — | **14** |
| Perdues | — | **0** |
| Parse différent | — | **0** |

Zéro perdue et zéro parse changé : c'est la moitié de la mesure qui compte. Élargir un motif est
la façon habituelle de cesser silencieusement de lire ce qui marchait, et le piège ci-dessus en
est un exemple vivant.

**Ce qui reste non parsé, et délibérément : 8 adresses nulles et 37 chaînes** — une trentaine de
voies sans aucun numéro, quatre portant une lettre de lot **avant** le numéro (`A - 26 RUE
CUSTINE` : le numéro est-il 26, ou « A » en fait-il partie ? la source ne le dit pas), une adresse
électronique, un `SSSS` et un SIRET nu. Deviner ici attacherait une autorisation à un local qui ne
la porte pas.

**`parseAddress` a déménagé dans `scripts/ingest/lib/terrasseAddress.ts`, et pour une raison
mécanique** : tout chargeur de ce dossier appelle `main()` au niveau du module, donc l'importer
lance une ingestion. Un test qui aurait importé `terrasses.ts` pour atteindre la fonction aurait
ouvert une connexion et rechargé la couche. `lib/` est la moitié importable du dossier.

**Et cette fois le test se justifie**, là où la section du 25 août avait décidé le contraire : à
l'époque, rien ne lisait le résultat — les quatre colonnes terrasse n'avaient aucun consommateur.
Depuis aujourd'hui la fiche les affiche, et une adresse qui ne se parse pas ne s'attache à aucun
local, ce qui se lit à l'écran « aucune autorisation enregistrée à cette adresse ». Un échec de
parsing silencieux est devenu une réponse fausse à un lecteur. 23 cas, tirés de vraies chaînes de
l'export ; remettre l'ancien motif en fait passer **10 au rouge**.

**Le correctif ne change rien en base tant que la couche n'est pas rechargée** — `scripts/ingest/
terrasses.ts` n'est pas câblé sur le cron. Les 14 adresses restent non rattachées jusqu'au
prochain chargement manuel.

### L'état en base, remesuré le 26 août

Aucun rechargement : ces chiffres sont ceux du 25 août, relus, pas recopiés.

| Mesure | Valeur |
| --- | --- |
| `terrasse_autorisation` | **24 194** lignes, dont 24 135 adressables (`street_key` et `house_number` non nuls) |
| `premise_location` | **4 295** `oui`, **19 311** `inconnu`, **61 812** `non` |
| Types sur les `oui` | 2 777 permanente · 1 240 estivale · 908 étalage |
| Types sur les `inconnu` | 12 045 permanente · 5 478 estivale · 6 685 étalage |
| `ingestion_run` `terrasses` | cadence `rare`, `row_count` 24 194, `source_as_of` **2026-08-25**, `last_success_at` 2026-08-25T10:04:48Z, `run_by` `manual` |
| Ledger distant `dbefhvmyfmmhjeetdddu` | **42** migrations, dernière `20260826000001` — inchangé, ce ticket n'en pose aucune |

### Le recensement de `#57` : `compass_premises_within` y est, et elle passe

C'était la question explicite du prompt, et elle est légitime — `compass_premises_within` lit
`premise_observation`, la seule table de contenu dont une politique RLS retire des lignes en
silence, et c'est ce ticket qui l'a étendue de quatre colonnes le 25 août, **avant** que
`w0-retenue` ne pose `I23`/`I24` le 26.

Joué le 26 août contre le distant, **depuis `eval/invariants.sql` lui-même** plutôt que retapé :

- **`I23` — 0 ligne.** `compass_premises_within` est `SECURITY DEFINER` et porte une colonne
  `withheld`. Elle ne l'était pas quand ce ticket l'a écrite : `20260825000010` la déclarait
  `security invoker`, et c'est `20260825000014_licence_withholding_rule.sql`, posée par
  `w0-retenue`, qui l'a corrigée. Le recensement a donc bien attrapé cette fonction-là.
- **`I24` — 6 fonctions recensées**, dont `compass_premises_within`, **toutes couvertes** par un
  invariant `@as anon` : `I14` et `I15` l'appellent.

> Un piège de méthode, et il a coûté un aller-retour. La première exécution du recensement, écrite
> à la main dans un script temporaire, rendait **0 fonction** au lieu de 6 — ce qui ressemble
> exactement à un recensement cassé. La cause n'était pas le SQL : le heredoc du shell avait mangé
> un antislash, `'\\y'` devenant `'\y'` puis, dans un gabarit JavaScript, un simple `y`. La
> jointure cherchait `ypremise_observationy`. **Rejouer un invariant depuis le fichier committé
> plutôt que de le retaper** n'est pas une élégance : c'est ce qui sépare un verdict d'une
> coquille.

### Ce qui a été écrit ici

| Fichier | Rôle |
| --- | --- |
| `src/i18n/terrasseText.ts` | **Nouveau.** `describeTerrasse` — les quatre états, leurs phrases, la réserve et la ligne de source. Pur, testé, aucun DOM |
| `src/i18n/terrasseText.test.ts` | **Nouveau.** 21 tests : les trois états restent trois, la réserve accompagne toute réponse positive, la source porte sa date, aucune phrase de prévision |
| `src/services/compass/premiseHistory.ts` | Les quatre colonnes arrivent sur `PremiseCandidate` ; `fetchSourceAsOf` lit `compass_source_freshness` |
| `src/hooks/usePremiseHistory.ts` | `useSourceAsOf` — requête séparée, pour qu'un échec de fraîcheur ne fasse pas tomber la fiche |
| `src/components/PremiseHistorySheet.tsx` | `TerrasseSection`, entre l'en-tête du local et la chronologie |
| `src/types/database.ts` | Signature de `compass_source_freshness`, qui a maintenant un consommateur |
| `scripts/ingest/lib/terrasseAddress.ts` | **Nouveau.** `parseAddress`, déplacé hors du chargeur pour être importable, avec le motif corrigé des suffixes collés |
| `scripts/ingest/lib/terrasseAddress.test.ts` | **Nouveau.** 23 cas, tirés de l'export : ce qui marchait, les quatorze gagnées, ce qui doit rester non parsé |
| `scripts/ingest/terrasses.ts` | Importe `parseAddress` au lieu de le définir |

**Trois choix qui sont des mécanismes, pas des intentions.**

1. **La réserve est un champ obligatoire du type de retour**, pas une option. Il n'existe aucun
   chemin de code qui rende « oui » sans la phrase « une autorisation n'est pas une terrasse
   installée aujourd'hui : la source ne publie ni date de délivrance, ni date d'expiration, ni
   statut ». Même exigence que `Measured<T>` : la précaution voyage avec le fait, ou le fait ne
   part pas.
2. **Le CA terrasse est hors d'atteinte par construction.** `longueur` et `largeur` restent dans
   `terrasse_autorisation` ; `compass_premises_within` n'expose que quatre drapeaux. Le module
   d'affichage ne reçoit **aucun nombre**, donc aucun écran ne peut multiplier une longueur par
   une largeur. C'est structurel, pas une promesse — et c'est pour cela qu'aucun invariant n'a été
   ajouté : il garderait une porte que la forme du schéma ferme déjà.
3. **La quatrième valeur existe.** La colonne ne peut porter que trois états, mais le réseau peut
   rendre `null` — rendu `indisponible`, jamais `non`. `terrasseStatus: row.terrasse_status` sans
   `?? 'non'` : le défaut vit dans la table, où il veut dire quelque chose.

**La règle éprouvée plutôt que supposée.** Les 21 tests ont été joués contre une version sabotée
du module — `'inconnu'` replié sur `'non'`, exactement le défaut que `DIAGNOSTIC.md` §9 à §16
recense cinq fois : **8 tests sur 21 passent au rouge**, puis reviennent au vert après annulation
du sabotage.

### La démonstration, dans le navigateur, en appelant anonyme

`npm.cmd run dev`, clé publiable seule, aucune chaîne `DATABASE_URL` — l'appelant que le
navigateur sait être. Fiche ouverte depuis une carte OpenStreetMap du quartier Bonne-Nouvelle
(2ᵉ), les trois états sur trois locaux voisins :

| Local | Badge | Ce que la fiche affiche |
| --- | --- | --- |
| **59 RUE GRENETA** (BDCom 82457) | **Oui** | « Terrasse ou étalage autorisé à cette adresse » · « Un seul local recensé porte ce numéro de rue » · **Type autorisé : terrasse permanente** |
| **72 RUE MONTORGUEIL** (BDCom 5812, POKAWA, restauration rapide assise) | **Inconnu** | « Autorisation à cette adresse, titulaire non publié » · « La source ne dit pas lequel détient l'autorisation, et Compass n'en désigne aucun » · **Types autorisés à cette adresse : étalage** |
| **71 RUE GRENETA** (BDCom 5802, CLOVE BAKERY) | **Non** | « Aucune autorisation enregistrée à cette adresse » · réserve propre au `non` : le rattachement se fait par numéro de rue, une adresse écrite autrement se lit comme une absence |

Les trois portent la même ligne de source : « Terrasses et étalages autorisés · Ville de Paris,
Direction de l'Urbanisme · ODbL · **état de la source au 25 août 2026** ». C'est
`ingestion_run.source_as_of`, la fraîcheur de la **source**, jamais la date de chargement — deux
faits différents, et `compass_source_freshness` existe précisément pour les tenir séparés.

**Le badge `inconnu` est ambre et non gris.** Le mettre en gris à côté de `non` laisserait l'œil
lire deux non-réponses là où il y a une trouvaille et un titulaire non publié : l'aplatissement
que ce panneau existe pour empêcher, refait en CSS.

**Ce qui n'a pas pu être montré dans le navigateur, et pourquoi.** La note estivale — « une
terrasse estivale est autorisée sept mois par an, du 1er avril au 31 octobre », avec le lien vers
le règlement — n'apparaît que sur une autorisation estivale, et aucune n'était atteignable depuis
les points OpenStreetMap de la vue par défaut. **La carte n'a pas pu être déplacée** : le volet
navigateur de cette session ne compose pas d'images, donc les animations CSS de Leaflet ne
s'achèvent jamais et `moveend` — le seul endroit d'où `MapView` recalcule sa fenêtre — ne se
déclenche pas. Limite de l'environnement, pas du produit. Le chemin est le même que celui des deux
types démontrés (`permanente`, `étalage`), et il est couvert par les tests.

### Ce qui n'est pas fait, et pourquoi c'est le bon arrêt

- **Le bloc s'affiche pour tous les locaux, pas seulement pour la restauration.** Le critère dit
  « la fiche restauration » ; un étalage est aussi le fait d'un poissonnier et d'un fleuriste, et
  restreindre l'affichage au code d'activité aurait masqué un fait administratif vrai à ceux qu'il
  concerne. La fiche restauration l'affiche donc *a fortiori*.
- **Aucun invariant nouveau.** Voir le point 2 ci-dessus : la seule règle que ce ticket pourrait
  vouloir mécaniser — pas de CA terrasse — est déjà tenue par la forme du schéma. L'écrire serait
  de l'outillage sans population, la décision déjà prise pour `evidence` dans
  `docs/tickets/w0-conclusion.md`.
- **`periode_installation` n'est pas chargé.** 97 % de nuls ; une colonne de plus et un
  rechargement complet pour 725 lignes exploitables. À reprendre le jour où la source la remplit,
  ou par la session qui rechargera cette couche pour une autre raison.
- **Le chargeur n'est toujours pas câblé sur le cron**, comme PLU et chantiers avant lui.
- **L'éligibilité réglementaire n'est pas transcrite.** paris.fr restreint la terrasse annuelle à
  une liste de métiers (« débits de boissons, restaurants, glaciers et salons de thé, théâtres,
  musées, hôtels, librairie, disquaires »). C'est la couche 2 du raisonnement de `PLAN.md` §5.3 —
  transcrire ce que le règlement dit — et elle mérite son propre ticket, pas un paragraphe glissé
  dans une ingestion.

### Portes

Toutes jouées le 26 août 2026 contre `dbefhvmyfmmhjeetdddu` :

`typecheck` ✓ · **166 tests** ✓ (122 avant, +21 pour `terrasseText`, +23 pour `terrasseAddress`) ·
`build` et `build:dev` ✓ ·
`eval` — **31/31 invariants**, `I24` recense 6 fonctions toutes couvertes, **8/8 cas dorés**,
composition de fiabilité stable à 57,27 %. Sort en code 3 (`AVERTISSEMENT`) : dix écarts de
baseline sous le seuil bloquant, la dérive BODACC/SIRENE déjà connue, la plus large à 0,70 % ·
**`eval:anon` PASS, 12 contrôles** · **`eval:sabotage` PASS** · `verify:mcp` non relancée : ni
`src/core/` ni `mcp-server/` ne sont touchés.
