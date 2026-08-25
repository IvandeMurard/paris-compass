# [P0] w1-survie — Courbes de survie SIRENE × BDCom

**ID** `w1-survie` · **vague 1** · **Q3 2026** · **P0**
**Dépend de** `w0-fiche`
**Sources** `bdcom`, `sirene`, **`sirene_stock` (nouvelle — voir plus bas)**

## Pourquoi
Trois photos (2017/2020/2023) deviennent un rythme continu. Comble les années aveugles et 2024–2026.

## Comment
~~Aucune source nouvelle.~~ **Faux, mesuré le 25 août 2026 — voir « Quatre chiffres du ticket
étaient faux ».** Jointure au niveau défendable : un SIRET n'est pas un local. Non rattachable
= probable. Taux par métier × ~~tronçon~~ **quartier**, effectif nommé, période nommée.

## Doctrine
« 72 % des cafés tiennent six ans » est une observation. « Votre café a 72 % de chances » est un prévisionnel — interdit.

## Fait quand
Un café aux Halles et un café au Mail affichent deux survies, chacune avec n et millésimes, rapportées au métier pas à Paris entier.

---

# Fait le 25 août 2026 — session 10

**Ce ticket redit `docs/PLAN.md` §5.2 *et* §6.2** (`PLAN-ACTION-VACANCE.md`, « Ce que ce
document ne couvre pas »). Les trois sont clos ensemble.

## Le critère, démontré par appel anonyme réel

`compass_survival_by_trade` sur le centroïde de chaque quartier, métier **111 « Café et
Restaurant »**, par HTTP avec la **clé publiable seule** — donc appelant `anon` :

| Quartier | Volet | n | Survivants | Taux | Période |
| --- | --- | --- | --- | --- | --- |
| **Halles** | local (BDCom) | — | — | **retenu** | 2017 → 2023 |
| **Halles** | exploitant (SIRENE) | **185** | 102 | **55,1 %** | 2017-01 → 2020-08, 6 ans |
| **Mail** | local (BDCom) | — | — | **retenu** | 2017 → 2023 |
| **Mail** | exploitant (SIRENE) | **124** | 71 | **57,3 %** | 2017-01 → 2020-08, 6 ans |

Chaque ligne porte son effectif, sa période et sa licence. Le volet BDCom est **retenu** à
l'anonyme et le dit, avec sa raison — jamais un silence, jamais un zéro.

**Contre-test privilégié**, la moitié qui compte : sans lui, une retenue peut cacher une erreur
de calcul au lieu d'une licence.

| Quartier | Local (BDCom) | Exploitant (SIRENE) |
| --- | --- | --- |
| Halles | **86,5 %** (268/310) | 55,1 % (102/185) |
| Mail | **86,7 %** (137/158) | 57,3 % (71/124) |
| Belleville | **77,2 %** (115/149) | **38,9 %** (49/126) |
| Bel-Air | **96,1 %** (98/102) | **63,6 %** (35/55) |

Les valeurs privilégiées sont exactement celles mesurées *avant* d'écrire la fonction : la
retenue ne masque donc pas un défaut de calcul.

## Le fait produit : le local persiste, l'exploitant tourne

**86,5 % contre 52,5 %** à Paris entier sur six ans. Le local reste un café ou un restaurant
dans près de neuf cas sur dix ; l'entreprise qui l'exploitait ne tient six ans qu'une fois sur
deux. **Aucune des deux sources ne peut le dire seule** — c'est exactement le croisement que
`PLAN.md` §3.4 appelait « le croisement le plus important du produit ».

Et les deux dimensions **concordent sans être redondantes** : Belleville est le plus dur sur les
deux mesures (77,2 % / 38,9 %), Bel-Air le plus sûr sur les deux (96,1 % / 63,6 %). Deux
sources indépendantes, deux méthodes, même classement.

## Quatre chiffres du ticket étaient faux — remesurés avant d'écrire une ligne

| Le ticket écrivait | Mesuré le 25 août 2026 | Contre quoi |
| --- | --- | --- |
| « Aucune source nouvelle », titre « SIRENE × BDCom » | `sirene_establishment` porte **4 colonnes** — siret, siren, geom, geocoding_quality. **Aucune date, aucun état administratif.** | `information_schema.columns` sur le distant |
| « Taux par métier × **tronçon** » | Sur **6 338** tronçons portant un café/restaurant en 2017, **1 seul** atteint n≥30 ; 95 atteignent n≥10. **80 quartiers sur 80** l'atteignent. | `premise_observation` × `premise_location` |
| « un café » | CH402+CH403 stricts : **n=36** aux Halles, **n=18** au Mail — trop petit. Le grain publiable est niv18=111 : **310** et **158**. | `bdcom_activity` |
| Halles vs Mail « affichent deux survies » | **86,5 % vs 86,7 %**, et Paris entier à **86,5 %**. Indiscernables l'un de l'autre *et* de la moyenne. | mesuré ci-dessus |

**La ligne « aucune source nouvelle » était fausse depuis sa rédaction.** La migration
`20260809000006` le disait déjà en toutes lettres en chargeant la tranche géolocalisée :
« Establishment cessation dates — PLAN §3.4 — are a different file and a different chantier. »
Personne n'a recoupé le ticket contre la base. Même mode de défaillance que le « chantiers
quotidien » de la session 8 et le ledger à 24 de la session 1.

**Le couple Halles / Mail ne discriminait pas.** Le critère est tenu à la lettre, et il aurait
été muet : deux verdicts identiques, ce que la règle fondatrice du projet appelle « n'avoir rien
dit ». La dispersion existe pourtant — **Belleville 77,2 % à Bel-Air 96,1 %** — et le second
couple est démontré à côté du premier plutôt que substitué à lui. Sur le volet SIRENE, en
revanche, Halles et Mail se séparent enfin (55,1 % / 57,3 %) et Belleville décroche vraiment
(38,9 %).

## La source nouvelle : `StockEtablissement`

data.gouv.fr, **parquet 2,20 Go**, millésime **2026-08-01**, **Licence Ouverte v2**. Mesuré sur
le fichier avant chargement, Paris (`751xx`) : 3 759 919 établissements, 1 335 566 actifs,
2 424 353 fermés dont **97,9 % avec date de fermeture**.

Chargé après filtre — Paris, diffusible, adresse exploitable, NAF de pied de rue
(45/47/56/95/96) : **371 511 lignes, dont 282 583 (76,1 %) rattachées à un quartier**.

**Le piège du fichier** : `dateDebut` est la date de **fermeture** quand
`etatAdministratifEtablissement = 'F'`. Le nom de la colonne dit l'inverse de ce que vaut la
valeur, et la lire comme « date de début » daterait chaque fermeture au mauvais bout de la vie
de l'établissement. Une colonne générée, `date_fermeture`, fait cette lecture une fois.

**La licence renverse la contrainte habituelle** : SIRENE est redistribuable là où BDCom 2017 et
2020 ne le sont pas. C'est **la première fois de ce corpus qu'un appelant anonyme reçoit un
vrai taux**, et pas seulement un marqueur de retenue.

## Trois décisions de conception

**1. Deux survies, deux lignes — jamais fusionnées.** `PLAN.md` §3.4 l'exigeait déjà (« un
`Measured<T>` par source »). La fonction rend **deux lignes** plutôt que deux colonnes : la
forme de la réponse porte la doctrine. C'est aussi ce qui tue la lecture prévisionnelle mieux
qu'un avertissement — un lecteur à qui l'on montre 86,5 % de locaux *et* 52,5 % d'exploitants ne
peut plus lire « ce local a 86,5 % de chances ».

**2. Le rattachement s'arrête au quartier.** Un SIRET n'est pas un local, et 69 % des locaux
partagent leur numéro. Une adresse détermine son quartier sans ambiguïté même quand vingt locaux
s'y tiennent : `quartier_id` est un fait, `location_id` serait une supposition. C'est la ligne de
`w1-terrasses` poussée d'un cran — et une courbe de survie n'a de toute façon aucun usage d'un
local isolé.

**3. La censure, qu'une requête naïve rate en silence.** Une entreprise créée en 2022 ne peut pas
avoir survécu six ans au 1ᵉʳ août 2026. Laissée au dénominateur elle compte comme un échec, et le
taux s'effondre pour une raison qui n'a rien à voir avec le métier. La fenêtre se ferme donc à
(date du stock − N années), et **c'est la fenêtre réellement utilisée qui est rendue**, pas celle
demandée. Les fermetures sans date sont retirées de la cohorte, jamais comptées comme
survivantes : inconnu n'est pas réussi.

## Les deux cohortes ne sont pas comparables terme à terme

BDCom part d'un **stock** — tout local exerçant au millésime de départ, y compris installé depuis
trente ans. SIRENE part d'un **flux** — les immatriculations de la fenêtre, donc des entreprises
jeunes par construction, et une entreprise jeune échoue bien plus souvent. Une part de l'écart
86,5 / 52,5 tient à cette différence de composition, pas seulement à la distinction
local / exploitant. **Écrit dans l'`evidence` de chaque ligne SIRENE**, pas laissé à la sagacité
du lecteur.

## Comment l'écran empêche la seconde lecture

Le ticket pose l'interdit et s'arrête là. `src/core/observational.ts` en fait un mécanisme,
`survivalText.test.ts` le tient par **14 tests**, et l'invariant **`I21`** l'applique en base :

> **La garde a d'abord été écrite au mauvais endroit, et le déplacement est le point.** Elle
> vivait dans `src/i18n/survivalText.ts` — le chemin du navigateur, c'est-à-dire le seul
> consommateur qui n'existe pas encore. Un agent appelant `compass_survival_by_trade` par
> PostgREST reçoit l'`evidence` directement et ne la rencontrait jamais : la règle protégeait le
> lecteur hypothétique et laissait passer l'appelant réel. Déplacée dans `src/core/`, qui est pur
> par contrat (`CLAUDE.md`) et partagé par le navigateur, le serveur MCP et la porte
> d'évaluation. Et doublée en base par `I21`, parce qu'un garde TypeScript ne peut rien contre
> une phrase écrite en SQL.



1. **Le sujet grammatical est la cohorte passée.** « Sur les 310 locaux recensés « Café et
   Restaurant » Halles en 2017, 268 en étaient encore un en 2023. » Le local consulté n'est
   jamais le sujet et n'est jamais compté dans la phrase qui le concerne.
2. **Trois nombres, jamais un pourcentage seul.** `describeSurvival` **refuse** de rendre un taux
   dont il n'a pas aussi l'effectif et la période — il rend la forme absente à la place. Il
   n'existe aucun chemin de code produisant un pourcentage nu.
3. **`assertObservational` s'exécute à la sortie, pas seulement dans le test.** Deuxième
   personne, futur, vocabulaire de probabilité : la fonction lève avant que la phrase n'atteigne
   un écran. **Y compris sur le texte venu de la base** — `evidence` est écrite en SQL, et c'est
   précisément là qu'un « votre » bien intentionné finirait par être tapé.
4. **Les trois absences restent distinctes** — millésime retenu, effectif insuffisant, hors
   corpus. Les confondre est le défaut que ce dépôt a corrigé cinq fois (`DIAGNOSTIC.md`
   §9 à §16).

Vérifié en base : un métier sous le seuil rend `insufficient_n` et pas de taux (Alimentaire aux
Halles, n=17 ; Santé-Beauté à Bel-Air, n=25) ; un métier sans correspondance NAF rend une
troisième réponse encore différente (« Grand magasin ») ; un point à Massy rend
`out_of_corpus`.

## Une erreur commise puis corrigée dans la même session

Le pont BDCom ↔ NAF de `20260825000012` portait **deux codes inventés** : `101` renvoyé vers
l'alimentaire alors que **101 est « Grand magasin »** — celui-là était vivant et faux, il aurait
répondu sur les grands magasins par la survie des épiciers — et `114` pour Santé-Beauté, qui
n'existe pas (c'est `104`). Corrigé par `20260825000013`, contre la nomenclature elle-même.

**`111` était juste, et c'est le seul qui avait été mesuré avant d'être écrit.** Les codes
vérifiés étaient bons, les codes supposés étaient faux, dans la même table et le même commit.
La règle du dépôt s'applique à un identifiant comme à un chiffre.

## Ce qui n'a pas été fait, et pourquoi c'est le bon arrêt

- **`StockEtablissementHistorique` (0,87 Go) n'est pas chargé.** Le stock courant suffit à
  création + fermeture ; l'historique sert les changements d'activité intermédiaires, une
  question que ce ticket ne pose pas.
- **Le rattachement SIRET → local individuel reste refusé.** `docs/SESSIONS.md` l'annonçait comme
  « l'inférence la plus difficile du backlog » ; la réponse mesurée est qu'elle n'est pas
  défendable, et non qu'elle est difficile.
- **Le pont NAF est partiel** — 111, 102, 104. Un métier absent rend « aucune correspondance
  posée », jamais un taux de zéro. L'hôtellerie (niv18 112, 92,6 % de survie du local) n'a pas de
  volet SIRENE : NAF 55 n'est pas une division de pied de rue et n'est pas chargée.
- **Le chargeur n'est pas câblé sur le cron**, comme PLU, chantiers et terrasses avant lui.
- **Front-end laissé à Lovable**, indisponible jusqu'au 1ᵉʳ septembre. `survivalText.ts` et son
  test sont écrits maintenant parce qu'ils ne dépendent pas de l'écran — et parce que le bon
  moment pour écrire la garde est avant que quelqu'un ne rédige la phrase à la main.

## Portes

`typecheck` ✓ · **122 tests** ✓ (108 avant, +14 pour `survivalText`) · `build` ✓ · `build:dev` ✓ ·
`verify:mcp` **41 contrôles, 39 au vert, 0 en échec**, 2 suspendus sur panne Overpass (429/504) ·
`eval` **21/21 invariants** — dont le nouveau `I21` — et 8/8 cas dorés, avec les dix écarts de
baseline déjà connus en avertissement.

**Ledger distant remesuré à la clôture : 40 migrations**, dernière `20260825000013`.
**13 fonctions `compass_*`** (11 avant). **8 sources** dans `ingestion_run`.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
