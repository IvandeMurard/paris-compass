# [P1] w2-rythme — Les heures auxquelles une adresse sert à quelqu'un

**ID** `w2-rythme` · **vague 2** · **P1**
**Dépend de** `w2-idfm` (#19, fermé), `w6-mode-raison` (#197)
**Sources** — *aucune source nouvelle : 29 489 lignes chargées le 7 septembre 2026 et lues par
personne*

> **Demandé par Ivan le 17 septembre 2026**, sur le témoignage de Baptiste Braux, cofondateur de
> Kafé, rue Martel :
>
> > *« 3 fois par jour, on change totalement de clientèle. 8h30 les parents — il y a une école
> > dans la rue. 12h la pause déj, c'est là qu'on fait la majorité de notre CA. 15h, des
> > freelances. […] Je crois maintenant qu'un lieu se définit surtout par les heures auxquelles
> > il est utile à quelqu'un. »*

## Pourquoi

**Compass n'a aucune notion d'heure.** Les douze axes de `AreaScores` sont des photos fixes : un
comptage dans un rayon, sans moment. La fiche dit « passage soutenu » — le témoignage dit que
« soutenu » à 8h30, à 12h et à 15h désigne trois commerces différents, avec presque aucune
porosité entre eux. Un preneur qui ouvre un café de bureau dans une rue de parents scolaires se
trompe sans qu'aucun de nos six constats ne l'en avertisse.

**Et la moitié de la réponse est déjà payée.** `idfm_validation_profile` a été remplie le
7 septembre 2026 : **29 489 lignes** (chiffre du chargement, `ingestion_run.row_count` — à
remesurer avant de le réafficher), une par station et par tranche horaire, sur 258 stations
parisiennes. **Rien ne la lit.** `fetchCorpusStation` appelle `compass_station_profile` et n'en
retient que deux champs : `distance_m` et `station_name`. La forme de la journée est à côté,
chargée, sous licence redistribuable, et jetée à chaque fiche.

Ce ticket n'ajoute pas une source. Il affiche une source que le produit possède déjà.

## La première chose à mesurer, avant d'écrire une ligne

**Le rapport gain/effort de ce ticket tient à une condition non vérifiée** : que les lignes
horaires sortent jusqu'au visiteur anonyme. `fetchCorpusStation` ne lit aujourd'hui que deux
champs, donc rien ne prouve que les 24 tranches sont servies à `anon`.

**Et le précédent est exactement celui-là.** La revue de `#97` a trouvé `idfm_validation_profile`
muette pour un appelant PostgREST direct — RLS active, zéro politique de lecture : la fonction
`security definer` répondait pendant que la table restait invisible. Corrigé par
`20260907000003_idfm_lecture_publique.sql`.

Donc : **mesurer cet accès en `anon` d'abord, et écrire la mesure.** Si la couche ne sort pas, ce
ticket n'est plus « afficher ce qu'on possède » et son coût change — ce qui est une information à
rendre à Ivan, pas un obstacle à contourner en silence.

## Ce que cette donnée peut dire, et les trois choses qu'elle ne peut pas

**Elle porte une FORME, jamais un VOLUME.** `pct_validations` est la part de la journée d'une
station tombant dans chaque tranche — 24 tranches sommant à 100 %. La source ne publie aucun
compte absolu, la migration `20260907000002` le dit et une mesure l'a confirmé à Oberkampf
(99,99 %). **Aucun chiffre de personnes ne sortira jamais d'ici**, et un test doit l'interdire
plutôt que l'espérer.

Ce n'est pas une privation : le témoignage ne parle pas de combien, il parle de **quand**.

**Elle décrit la journée d'une STATION, pas le trottoir d'une vitrine.** La réserve existe déjà
pour l'axe de distance et elle vaut deux fois ici. Elle voyage avec le chiffre, jamais en note.

**Sa licence n'est pas celle de l'axe voisin, et c'est un piège écrit.** `src/core/provenance.ts`
le dit : `idfm_station` est **Licence Ouverte 2.0 (Etalab)**, `idfm_validation_profile` est
**ODbL**. L'axe « desserte ferrée » affiche Etalab parce qu'il ne lit que le référentiel d'arrêts.
Un chiffre tiré du profil horaire porte ODbL. **Recopier la licence de l'axe voisin lierait un
redistributeur à une obligation fausse, ou l'en libérerait à tort** — c'est exactement l'erreur
que `LayerOrigins` a été créé pour empêcher.

## Ce n'est pas un septième axe, et c'est la décision de conception

Les six constats rendent un **niveau** — fort, moyen, faible — et le verdict compose des bandes.
**Une forme de journée ne se met pas en bande** : « double pic matin-soir » n'est ni fort ni
faible. En faire un axe obligerait à le réduire à un chiffre sur 100, c'est-à-dire à détruire
l'information que ce ticket existe pour montrer.

C'est donc **un constat d'une autre nature**, à côté des six, et **il n'entre pas dans la
composition du verdict**. Même frontière que les appuis de `w6-appuis` (#206), pour une raison
différente : là c'était la fragilité du miroir, ici c'est la nature du chiffre.

## La lecture, et la limite qu'Ivan a demandé de vérifier

Une part horaire n'aide personne seule. Ce qui aide est la lecture : *« double pic matin et soir,
creux à midi — un quartier d'où les gens partent travailler »* contre *« gonflement à midi — un
quartier où les gens viennent travailler »*.

**Et cette lecture porte son statut**, de l'énumération de `#197`. Elle est aujourd'hui un
**arbitrage**, et le ticket dit pourquoi plutôt que de le supposer :

**Compass ne compte aucun emploi.** BDCom recense des commerces en rez-de-chaussée ; la grille
Filosofi 200 m, chargée le 8 septembre, compte les résidents là où ils **dorment**. Rien dans le
corpus ne compte un actif là où il **travaille**. « Rue de bureaux » ne peut donc être qu'une
déduction — forte présence à midi sur la station, faible population résidente au carreau — et
jamais une mesure.

**Ce qui la trancherait** : l'emploi au lieu de travail de l'INSEE, non chargé, publié à l'IRIS —
plus grossier que la rue, ce qui est une limite à écrire et non à taire.

## Fait quand

1. **La fiche montre la forme de la journée de la station la plus proche**, lue de
   `idfm_validation_profile` par `compass_station_profile`, avec son nom de station, son
   millésime et **sa propre licence ODbL** — un test exige que cette licence ne soit pas celle de
   l'axe de distance.
2. **Aucun volume n'est affiché ni dérivé.** Un test l'exige : rien de cette couche ne se
   multiplie, ne s'additionne en nombre de personnes, ni ne se convertit en comptage.
3. **La réserve voyage avec le chiffre** — la journée d'une station, pas le trottoir de la
   vitrine — et jamais au survol.
4. **La lecture porte son statut**, pris de l'énumération existante, et dit ce qui la trancherait
   quand elle est un arbitrage.
5. **Rien de ceci n'entre dans la composition du verdict.** Un test le tient contre
   `VERDICT_AXES`.
6. **Aucune station dans le rayon est une réponse, pas une panne** : la fiche le dit par son
   motif, comme `fetchCorpusStation` distingue déjà zéro ligne d'une base injoignable.
7. **Le dossier téléchargeable le porte**, forme, licence, millésime, réserve et lecture, sous la
   même règle que les autres figures.

**Ce que ça ne rattrape pas.** Une station n'est pas une rue. Deux adresses de part et d'autre du
même arrêt reçoivent la même forme de journée alors que le témoignage porte précisément sur ce
qui les sépare. Le complément est `w2-mobiliscope` (#20) — la présence par secteur, qui dit qui
**est là** quand la station dit qui **transite** — et l'échelle manquante est celle de
`w6-rue`.

## Hors périmètre

Pas de comptage de personnes. Pas de score de rythme, pas de « note de temporalité ». Pas de
chargement de source nouvelle — ni Mobiliscope, ni l'emploi INSEE : ils ont leurs tickets.

Voir [`w6-mode-raison.md`](./w6-mode-raison.md) pour l'énumération de statuts,
[`w6-appuis.md`](./w6-appuis.md) pour la même frontière avec le verdict, et
`src/core/provenance.ts` pour le piège de licence.

---

## Livré — 17 septembre 2026

Proposition sur `ticket/w2-rythme`. **Tout chiffre de cette section est mesuré ce jour-là**, en
`anon` contre `dbefhvmyfmmhjeetdddu` ou dans un Chrome sans tête contre le `dist/` de la branche.

### La première chose à mesurer : la couche sort jusqu'au visiteur anonyme

C'est la condition dont le ticket disait que tout le rapport gain/effort dépendait, et elle est
**vérifiée**. Clé publiable, aucun autre identifiant, en-tête d'échappement d'observabilité posé :

| Point | Réponse de `compass_station_profile` |
| --- | --- |
| Châtelet | **200**, 117 lignes, 5 codes de jour, **24 tranches JOHV sommant à 99,99 %**, 416 ms |
| Oberkampf | **200**, 114 lignes, 24 tranches, 100,01 %, 236 ms |
| Poissonnière (rue Martel) | **200**, 113 lignes, **23 tranches**, 99,99 %, 133 ms |
| Bois de Vincennes | **200**, **0 ligne** — une réponse, pas une panne |

Les deux tables sont lisibles en direct : `idfm_validation_profile` **29 489 lignes**,
`idfm_station` **258**, les deux en `200`. Le précédent de `#97` — table muette derrière une
fonction `security definer` — ne se rejoue pas : `20260907000003` tient.

### Les chiffres de l'énoncé, remesurés plutôt que recopiés

| Chiffre de l'énoncé | Remesuré le 17 septembre 2026 | Verdict |
| --- | --- | --- |
| 29 489 lignes | `ingestion_run.row_count` = **29 489**, `source_as_of` **2026-03-10** | juste |
| 258 stations parisiennes | **258** | juste |
| `fetchCorpusStation` ne retient que deux champs | vrai : `distance_m` et `station_name` sur six colonnes rendues | juste |
| 24 tranches par station | **faux** : 188 stations sur 258 en portent 24, 50 en portent 23, 17 en portent 22, 3 en portent 21 — et les parts somment quand même à 100 % | corrigé |
| « gonflement à midi = quartier de bureaux » | **faux sur toute la population** — voir ci-dessous | corrigé |

### Le ticket s'est trompé de SENS, et c'est la découverte de la session

L'énoncé, le commentaire de colonne de `20260907000002` et celui de `compass_station_profile`
disent tous les trois qu'un pic de midi signe un quartier de bureaux et un pic du soir un
quartier résidentiel. Mesuré sur les 258 stations, 6 099 lignes JOHV :

- la fenêtre **11h-14h est la plus forte des trois à 0 station sur 258** ;
- l'heure de pic est **8h** à 89 stations, **17h** à 90, **18h** à 76, **16h** à 3 ;
- le matin dépasse le soir à **59** stations, l'inverse à **199** ;
- et le signe est **inversé** : Jourdain, résidentiel, fait 29,6 % le matin contre 21,3 % le
  soir ; Opéra, destination, fait 3,6 % contre 37,1 %.

**Une validation se compte à la montée** — pas de validation à la sortie sur le réseau ferré
parisien — donc le profil d'une station est la forme des **départs** depuis ce lieu. On part d'un
quartier résidentiel le matin, d'un quartier de bureaux le soir, et personne ne prend le métro
pour déjeuner.

La lecture livrée est donc construite sur l'asymétrie matin/soir et non sur le midi. Le défaut
du schéma est consigné en `DIAGNOSTIC.md` §57, le geste qui l'a trouvé dans
`docs/REPRISE-PIEGES.md`, et la migration corrective — deux `comment on`, jamais une réécriture —
est suivie en **#213**.

### Les sept critères, et ce qui les démontre

Chrome sans tête, `dist/` de la branche servi en local, cinq adresses, les deux langues :

1. **La forme, avec son nom de station, son millésime et sa propre licence.** Rue Martel : station
   *Poissonnière*, 367 m, code *JOHV*, 23 tranches affichées, `Source IDFM — validations sur le
   réseau ferré, profils horaires · Licence **ODbL** · Millésime 2026-03-10`. Sur **la même
   page**, la carte « desserte ferrée » affiche `Source IDFM — référentiel des arrêts · Licence
   **Licence Ouverte 2.0 (Etalab)** · Millésime 2026-03-10` : même millésime, deux licences, une
   par figure. Trois contrôles le tiennent, et la garde est **structurelle avant d'être testée** —
   `dayShape` prend une DATE et construit son origine, donc aucun appelant ne nomme de licence.
2. **Aucun volume.** Un contrôle **parcourt l'objet produit** au lieu de lister ses champs : tout
   nombre émis est une part dans [0, 100] hors la distance, les tranches somment entre 99,9 et
   100,1 %, et aucune clé ne porte un nom de compte. Un second balaie les phrases des deux
   langues et refuse « voyageurs », « fréquentation », « personnes » hors des phrases qui les
   **refusent**.
3. **La réserve voyage avec le chiffre**, jamais au survol : elle est un `caveats` du
   `Measured<T>`, donc elle est rendue au-dessus du graphique à l'écran, dans le dossier exporté,
   et en anglais sur le chemin de l'agent. Elle dit les deux choses — la journée d'une station et
   non le trottoir de la vitrine, **et** que le profil dit d'où l'on part.
4. **La lecture porte son statut**, lu de `LEAD_REASON_STATUSES` — l'énumération de `#197`, pas
   une quatrième orthographe. L'écran rend « LA LECTURE — ARBITRAGE, PAS UNE MESURE », et
   « Ce qui la trancherait — l'emploi au lieu de travail de l'INSEE, non chargé, publié à l'IRIS,
   plus grossier que la rue ». Aucune lecture ne peut porter `mesure` : un contrôle le refuse.
5. **Rien n'entre dans le verdict.** Le bloc est une `<section>` hors de la liste des constats
   (`dansLaListe: false` à l'écran, cinq adresses sur cinq) ; un contrôle refuse que la moindre
   forme ou fenêtre devienne une clé de `VERDICT_AXES` ; la phrase de verdict est identique au
   caractère près avec et sans les lignes horaires, et le dossier exporté range la forme **à côté**
   de `figures` et non dedans.
6. **Aucune station dans le rayon est une réponse.** Bois de Vincennes : *« Aucune forme de journée
   à lire ici »* suivi du motif `aucun_arret_dans_rayon` — le même que l'axe de distance emploie
   pour ce fait, à trois lignes de là sur la même page. Une base injoignable, elle, retire le bloc
   entier : trois états et non deux.
7. **Le dossier le porte** — forme, licence, millésime, réserve et lecture, avec son échelle
   nommée (`pourcentage-de-la-journee-de-la-station`) pour qu'aucun consommateur ne la pose sur
   celle des constats.

### La contre-preuve, en cinq actes

Les tests rejoués à chaque fois, sur les fichiers concernés :

| Acte | Sabotage | Résultat |
| --- | --- | ---: |
| 1 | `IDFM_PROFILE_ORIGIN` reçoit la Licence Ouverte de l'axe de distance | **7 contrôles rouges, 3 fichiers** |
| 2 | Un champ `totalValidations: 18400` ajouté à `DayShape` | **2 contrôles rouges** |
| 3 | `rythme` ajouté à `VerdictAxis`, `VERDICT_AXES` et `VERDICT_AXIS_ORDER` | **1 contrôle rouge** |
| 4 | La lecture `deux_pointes` retirée de la table des mots | **2 contrôles rouges** |
| 5 | L'absence de station rendue comme `couche_absente` au lieu d'une réponse | **5 contrôles rouges** |

Tout remis : **896 tests sur 61 fichiers, sortie 0**. `main` en portait **852 sur 59**, remesuré
le même jour dans un arbre détaché — le chiffre que `docs/REPRISE.md` écrivait est donc confirmé,
pas recopié.

### Les portes

`typecheck` ✓ · `test` **896/61, sortie 0** · `build` ✓ (`Context-C6K1nOCy.js`, 71,09 kB) ·
`verify:mcp` **48 contrôles, 47 au vert, 0 en échec, 1 suspendu, sortie 0** — le suspendu est
`E12`, Overpass en 429, une panne amont. `build:dev` non rejoué : aucune montée de `vite`.

### Une source à l'écran entre dans la page des sources

`src/services/opendata/sources.ts` gagne une ligne pour `idfm_validation_profile`, ODbL, distincte
de celle du référentiel d'arrêts — dont la phrase *« les profils horaires […] ne servent aucun
chiffre »* est devenue fausse ce jour-là et est corrigée. **L'URL est une RECHERCHE et non un
identifiant de jeu** : mesuré le 17 septembre 2026, l'identifiant qu'un lecteur devinerait répond
**404**, parce que IDFM republie cette famille chaque trimestre sous un nom qui ne se fixe pas
(`20260907000002`, et `scripts/ingest/lib/idfmOpendata.ts` qui le résout par titre à chaque
exécution). La recherche répond **200** et liste les huit éditions.

### Ce qui n'est PAS fait

- **Les deux `comment on` du distant** disent toujours l'inverse de la donnée. Un agent qui lit le
  schéma reçoit encore la phrase de 2026-09-07. **#213**, et il demande un `supabase db push`.
- **Le serveur MCP ne sert pas la forme de la journée.** `mcp-server/src/context.ts` appelle
  `compass_station_profile` et n'en retient toujours que la distance : le bloc existe pour un
  lecteur d'écran et pas pour un agent, ce qui est le même trou que `#197` a laissé pour la raison
  d'un axe de tête. Il se referme avec `w5-explain-metier` (#31).
- **Aucun bras n'ouvre la page sur ce bloc.** Le bras `page` juge qu'un verdict arrive ; il ne
  regarde pas la section `#rythme`. Une régression propre à ce bloc passerait au vert chaque
  matin — même trou que pour `mode=`, nommé par `#36` puis par `#197`, et toujours ouvert.
- **Les quatre autres codes de jour** (JOVS, SAHV, SAVS, DIJFP) sont chargés, traversent la
  fonction et ne sont pas affichés. Un week-end n'est pas une semaine et c'est une autre lecture.
- **La marge de 1,15 est un arbitrage écrit une fois**, pas une mesure. Elle range 39 stations en
  « menée par le matin », 43 en « deux pointes » et 176 en « menée par le soir ». Ivan peut la
  déplacer en changeant une ligne.

### Ce que ça ne rattrape pas

- **Une station n'est pas une rue**, et c'est la limite que le témoignage vise exactement : deux
  adresses de part et d'autre du même arrêt reçoivent la même forme. Le complément est
  `w2-mobiliscope` (#20), et l'échelle manquante celle de `w6-rue`.
- **Les contrôles de « aucun volume » jugent ce que ce module PRODUIT.** Une page qui lirait les
  parts et les multiplierait par un chiffre venu d'ailleurs les passerait tous. Ce qui rend ce
  geste difficile est ailleurs et structurel : la source ne publie aucun compte, donc il n'y a
  rien en base à multiplier.
- **« Menée par le soir » ne dit pas « bureaux ».** Bureaux, universités et sorties donnent la
  même forme, et rien dans le corpus ne les sépare — d'où le statut `arbitrage`.
- **Une station desservie par deux lignes voit ses profils MOYENNÉS** et non pondérés, faute de
  volume pour les pondérer. C'est la réserve n° 2 de `20260907000002`, elle est une propriété du
  chiffre, et ce ticket ne la répare pas.
