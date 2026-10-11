# [P1] w6-appuis — Ce que le calcul sait déjà et que la fiche jette

**ID** `w6-appuis` · **vague 6** · **P1**
**Dépend de** `w6-fiche-corpus` (#157), `w6-mode-raison` (#197)
**Sources** — *aucune source nouvelle : trois chiffres calculés à chaque ouverture de fiche et
jamais affichés*

> **Demandé par Ivan le 17 septembre 2026** : *« Une école à cent mètres, c'est une clientèle du
> midi ; un parc, c'est un week-end — ces informations doivent faire partie du livrable final, de
> l'aide à la décision. »*

## Ce qui a été mesuré le 17 septembre 2026

`AreaScores` (`src/core/scoring.ts:375`) porte **douze** axes. La fiche d'adresse en affiche
**six**. Les six autres sont calculés à chaque ouverture — la couche `amenities` est déjà
interrogée par `useAddressContext`, au même titre que `roads` — puis jetés.

**Mais ces six ne sont pas six informations nouvelles**, et le dire d'emblée évite d'en promettre
plus qu'il n'y en a :

| Axe jeté | Ce qu'il est vraiment |
| --- | --- |
| `schools` | **nouveau** — écoles dans 800 m, OpenStreetMap |
| `healthcare` | **nouveau** — santé dans 800 m, OpenStreetMap |
| `parks` | **nouveau** — espaces verts dans 800 m, OpenStreetMap |
| `groceries` | doublon d'`alimentaire`, autre source et autre rayon |
| `transit` | doublon de `rail`, autre source |
| `walkability` | **composite pondéré des cinq** — interdit, voir plus bas |

**Trois sont un gain. Deux sont une confusion. Un est un refus.**

## Les trois refus qui bornent ce ticket

**1. `walkability` ne revient pas.** C'est une moyenne pondérée des cinq familles, rendue sur 100.
Le refus n° 4 de la doctrine interdit exactement cette forme : un score agrégé qui ne dit plus
quelle famille le fait monter. Ce qui revient, ce sont les familles ; jamais leur somme.

**2. Les doublons ne reviennent pas non plus.** Afficher `groceries` à côté d'`alimentaire`
donnerait deux chiffres de commerces alimentaires, de deux sources, à deux rayons, sans qu'un
lecteur puisse dire lequel croire. Même chose pour `transit` et `rail`. Si l'une de ces deux
lectures est meilleure que celle qui est affichée, c'est un ticket de re-sourcing, pas celui-ci.

**3. Aucun de ces constats n'entre dans la composition du verdict.** C'est le refus le plus
important, et il est payé. `#157` a sorti la couche `amenities` des axes porteurs parce qu'elle a
**un seul miroir** — Overpass, public et gratuit : quand il se taisait, il emportait trois axes
porteurs sur quatre et la fiche ne disait plus rien. Le produit est passé de 11 secondes et un
écran vide à 3,6 secondes et un verdict en l'en sortant. **Y remettre ces constats rendrait la
fiche à nouveau otage de ce miroir.**

La place existe déjà et elle a un nom à l'écran : *« En appui »*, où `alimentaire` se tient — un
constat affiché, sourcé, daté, qui ne compose pas le verdict. C'est là que ces trois vont.

## Ce qu'Ivan demande en plus du chiffre, et c'est le cœur du ticket

*« Une école à cent mètres, c'est une clientèle du midi. »* **Ça, ce n'est pas le chiffre — c'est
la lecture du chiffre**, et c'est elle qui aide à décider. Un preneur qui lit « 6 écoles dans
800 m » n'apprend rien ; « six écoles : une clientèle du midi régulière, absente en vacances
scolaires » lui dit quoi en faire.

**Et cette lecture porte son statut, exactement comme `#197` l'a exigé des raisons de métier.**
Les trois mêmes cas, la même énumération, la même honnêteté :

- *mesuré* — une lecture qui cite sa mesure ;
- *mesurable, non mesuré à ce jour* — elle nomme ce qui la trancherait ;
- *arbitrage* — elle le dit.

« Une école, c'est une clientèle du midi » est, à ce jour, un **arbitrage**. Il n'est pas honteux ;
le maquiller en fait le serait. Réutiliser `LeadReasonStatus` plutôt que d'en créer un second jeu
est la première chose à vérifier en écrivant.

## Et le dossier, parce qu'Ivan dit « livrable final »

Le dossier téléchargeable porte chaque figure avec sa formule et ses opérandes, de quoi la refaire
sans nous croire. **Un constat d'appui y descend sous la même règle** : sa source, sa licence, son
millésime, sa méthode. Sa lecture y descend aussi, **avec son statut**, et un arbitrage marqué
comme tel ne dégrade pas le dossier — un dossier où l'on ne distingue plus la mesure de l'avis, si.

## Fait quand

1. **Les trois constats d'appui sont à l'écran** — écoles, santé, espaces verts — chacun avec sa
   source, sa licence, son millésime, comme tout chiffre affiché.
2. **Chacun porte sa lecture et le statut de cette lecture**, pris de l'énumération existante, et
   la population est dérivée : un constat d'appui sans lecture fait rougir `test`.
3. **Aucun n'entre dans la composition du verdict.** Un test l'exige contre `VERDICT_AXES` :
   ajouter l'un d'eux aux axes porteurs rougit.
4. **Overpass muet ne casse rien.** Contre-preuve jouée : la couche `amenities` refusée, la fiche
   rend toujours son verdict et ses six constats, et les trois appuis disent leur absence par son
   motif plutôt que par un zéro.
5. **Le dossier les porte**, lecture et statut compris, et une vérification à la main le montre sur
   une adresse réelle.
6. **Aucune moyenne, aucun total, aucun score d'appui.** Trois constats, trois lectures, pas de
   septième chiffre qui les résume.

**Ce que ça ne rattrape pas.** Ces trois chiffres comptent des objets OpenStreetMap, pas des
élèves, des patients ni des promeneurs. Une école fermée y figure encore, un parc privé peut y
manquer. La lecture qui les accompagne est un arbitrage tant que personne n'a recoupé la survie
d'un commerce avec ce qui l'entoure — et c'est le même recoupement que `#197` attend déjà.

## Hors périmètre

Pas de re-sourcing d'`alimentaire` ni de `rail`. Pas de retour de `walkability`. Pas de nouvelle
famille d'aménités. Pas de mode métier qui pondérerait ces appuis : le métier permute, il ne pèse
pas.

Voir [`w6-mode-raison.md`](./w6-mode-raison.md) pour l'énumération de statuts, et
`DIAGNOSTIC.md` pour ce que `#157` avait mesuré.
