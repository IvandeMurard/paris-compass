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
