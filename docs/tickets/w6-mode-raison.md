# [P1] w6-mode-raison — Le mode réordonne sans dire pourquoi : un arbitrage caché dans un produit qui n'en veut pas

**ID** `w6-mode-raison` · **vague 6** · **P1**
**Dépend de** `w6-modes`
**Sources** — *aucune source nouvelle*

## Pourquoi

`w6-modes` (#36) a livré trois modes métier. Le basculement réordonne les axes, et l'ordre de
tête vit dans `LEAD_AXES` (`src/core/modes.ts`) :

| Mode | Ordre de tête |
| --- | --- |
| Restauration | `footfall` · `rail` · `noise` |
| Boutique | `density` · `footfall` · `services` |
| Artisanat | `services` · `density` · `rail` |

**La session qui l'a écrit a refusé de dériver cet ordre, et elle a eu raison** : le dériver
aurait été inventer une pondération en la déguisant en propriété de la donnée. Elle l'a donc
laissé comme un arbitrage assumé, en attente d'une décision.

**Objection d'Ivan, le 16 septembre 2026** : *« L'entrepreneur veut une vision holistique, c'est
ce que doit offrir Compass… Laisser le choix entre 3 critères et contraindre à une lecture
pré-définie me semble trop restrictif. Néanmoins, aiguiller avec ces recommandations me semble
pertinent. »*

**Une moitié de l'objection est déjà satisfaite par la conception**, et il faut le dire pour ne
pas la refaire : le mode est **une permutation, jamais un filtre**. Les six constats restent à
l'écran, et la queue est calculée depuis `VERDICT_AXIS_ORDER`. Rien n'est caché, donc la vision
holistique tient.

**L'autre moitié est juste, et c'est ce ticket.** L'ordre *affirme* une hiérarchie, et cette
affirmation n'a aucune source à l'écran. Un produit dont toute la thèse est qu'un chiffre porte
sa provenance affiche ici un classement qui ne porte rien.

## Doctrine

**Un chiffre affiché porte sa source ; un ordre affiché porte sa raison.** C'est la même
exigence, appliquée à l'arrangement au lieu de la valeur. Et elle a la même conséquence :
l'arbitrage devient **falsifiable**. Un lecteur qui lit *« le passage d'abord : un restaurant vit
du flux devant sa porte »* peut le refuser ; un lecteur qui voit seulement le passage en
première ligne ne peut que le subir.

**C'est la différence exacte entre aiguiller et contraindre**, rendue mécanique plutôt que
promise.

**Et la raison doit être honnête sur son propre statut.** Trois cas, à distinguer à l'écran :

1. **Mesurable et mesuré** — alors la raison cite sa mesure.
2. **Mesurable et non mesuré** — alors elle le dit, et ouvre la porte à qui voudra le faire.
3. **Un arbitrage** — alors elle le dit aussi. « Nous pensons que » n'est pas honteux ; le
   maquiller en fait l'est.

**Un exemple payé le jour même.** J'ai recommandé de descendre `noise` pour la restauration, en
affirmant que « le bruit est corrélé au passage ». Ivan a demandé si c'était vrai à Paris. Je
n'avais rien mesuré — l'affirmation est retirée. Elle est pourtant **mesurable ici** : `noise`
vient des voies, `footfall` de la densité et du rail, sur 25 094 tronçons du même corpus.
C'est le cas 2, et personne ne l'a fait.

> **Corrigé le 16 septembre 2026, à la livraison : « du même corpus » est faux.** `footfall` vient
> bien du corpus (65 % densité de locaux APUR, 35 % desserte ferrée IDFM), mais `noise` lit les
> voies d'**OpenStreetMap à la demande** : `OVERPASS_LAYERS` ne contient plus que `amenities` et
> `roads`, et **aucun fichier de `src/` ne lit `street_segment`**, la table des 25 094 tronçons.
> Le cas 2 tient — la mesure reste à portée — mais elle passe par le miroir qui tombe et non par
> une requête SQL. Remesuré le 16 septembre 2026 ; le détail est dans `docs/REPRISE-PIEGES.md`.

## Comment

Une raison courte par axe de tête, par mode, affichée à côté de lui — pas en note de bas de page,
pas au survol, pour la raison que le marqueur de réserve porte déjà : une réserve au survol
n'existe pas sur écran tactile et ne survit pas à une lecture à voix haute.

**Ce qu'il ne faut pas faire** : écrire les raisons dans le composant. Elles appartiennent à
`src/core/`, à côté de `LEAD_AXES` — le serveur MCP sert le même ordre, il doit servir la même
raison. C'est `w5-explain-metier` (#31) qui le consommera.

## Fait quand

1. **Chaque axe de tête porte sa raison à l'écran**, dans les deux langues, et la population est
   dérivée de `LEAD_AXES` — un mode qui gagnerait un axe de tête sans raison fait **rougir**
   `test`, plutôt que de s'afficher nu.
2. **Chaque raison déclare son statut** — mesurée, mesurable, ou arbitrage — et le libellé de
   statut vient d'une énumération, jamais d'une phrase à relire.
3. **Contre-preuve jouée** : retirer une raison de `LEAD_AXES` fait rougir ; la remettre rend le
   vert.
4. **Aucune raison n'affirme une corrélation non mesurée.** Celles du cas 2 disent « non mesuré à
   ce jour » et nomment ce qui la trancherait.

**Ce que ça ne rattrape pas.** Une raison écrite n'est pas une raison mesurée : ce ticket rend
l'arbitrage visible et discutable, il ne le rend pas vrai. **Ce qui trancherait `LEAD_AXES`, ce
sont trois conversations avec des restaurateurs**, et aucune session ne peut les tenir. C'est la
seule chose de tout ce backlog qui sorte du dépôt.

## Hors périmètre

Pas de changement de `LEAD_AXES` lui-même — l'ordre reste celui de `#36` tant qu'une mesure ou
une décision ne le déplace pas. Pas de pondération, pas de score par métier : le refus n° 4 de la
doctrine tient.

Voir [`w6-modes.md`](./w6-modes.md) et [`w5-explain-metier.md`](./w5-explain-metier.md).


## Livré — 16 septembre 2026

**Un ordre affiché porte sa raison, exactement comme un chiffre affiché porte sa source.** Les
neuf axes de tête des trois modes portent désormais, sur leur carte de constat, une raison courte
et le **statut** de cette raison. `LEAD_AXES` n'a pas bougé d'un axe : c'est le hors-périmètre du
ticket, et il tient.

### Où vivent les trois morceaux, et pourquoi pas ailleurs

| morceau | où | pourquoi là |
| --- | --- | --- |
| la population et le **statut** | `LEAD_AXES`, `src/core/modes.ts` | le serveur MCP sert le même ordre et devra servir la même raison — `w5-explain-metier` (#31) |
| la **phrase**, dans les deux langues | `LEAD_REASON_COPY`, `src/i18n/modeText.ts` | `w6-langue-absences` (#181) : un producteur ne choisit pas la langue d'un lecteur qu'il ne connaît pas |
| **où ça s'affiche** | `ContextFinding.tsx` | le composant reçoit une raison déjà écrite et ne décide que de la place |

Le statut vient d'une énumération de trois valeurs — `mesure`, `mesurable`, `arbitrage` — et son
libellé est lu depuis elle : « non mesuré à ce jour » n'est pas une phrase qu'on relit, c'est une
propriété de la table. **Aucun axe ne porte `mesure`**, parce que personne n'a mesuré ; un
contrôle rougit le jour où quelqu'un l'écrit sans dire où est la mesure.

### Le critère 1, démontré dans un navigateur

Chrome sans tête, `dist/` de la branche servi depuis le disque, **huit lectures** : les quatre
de `/contexte/` et les quatre de `/en/context/`, sur
`rue-de-bretagne-paris?lat=48.863100&lng=2.362100`, l'adresse du bras `page`. Verdict composé
entre 531 et 1 860 ms.

| lecture | cartes portant une raison | cartes sans |
| --- | --- | --- |
| sans métier, fr et en | **0** | 6 |
| restauration, fr et en | **3** — passage, desserte ferrée, bruit routier | 3 |
| boutique, fr et en | **3** — tissu, passage, services | 3 |
| artisanat, fr et en | **3** — services, tissu, desserte ferrée | 3 |

Ce que la page rend, mot pour mot, sur la première carte de `restauration` :

> **En tête pour ce métier — Mesurable, non mesuré à ce jour**
> Le passage d’abord : un restaurant vit du flux devant sa porte aux heures où il sert.
> *Ce qui la trancherait — Recouper, sur les millésimes du corpus, les locaux disparus entre deux
> relevés avec le passage calculé à leur point.*

et la même carte en anglais :

> **Leads for this trade — Measurable, not measured to date**
> Footfall first: a restaurant lives on the flow past its door at the hours it serves.

**À côté de l'axe, jamais au survol** : la raison est un bloc de la carte, lisible à voix haute et
sur un écran tactile, pour la raison exacte que le marqueur de réserve porte déjà.

### Les critères 2, 3 et 4, tenus par des contrôles

La correspondance entre `LEAD_AXES` et `LEAD_REASON_COPY` est vérifiée **dans les deux sens**, ce
qui donne les deux contre-preuves en un seul contrôle. Jouées, `npm.cmd run test` à chaque acte :

| acte | ce qui est saboté | code | ce qui rougit |
| --- | --- | ---: | --- |
| 1 | la raison de `restauration/noise` retirée de `LEAD_AXES` | **1** | 1 contrôle : « raison orpheline » |
| 2 | `walkability` ajouté en tête de `boutique`, sans raison | **1** | **12** contrôles sur 3 fichiers |
| 3 | la phrase française de `restauration/noise` retirée | **1** | 6 contrôles |
| 4 | tout remis | **0** | — 852 sur 852 |

Le critère 4 est tenu en deux moitiés. « Non mesuré à ce jour » appartient au **libellé du
statut** et non à la phrase, donc une réécriture de la phrase ne peut pas l'emporter. Et aucune
raison ne peut employer le vocabulaire de la corrélation tant que son statut n'est pas `mesure` ;
la contre-preuve de ce contrôle est **la phrase retirée elle-même**, « le bruit est corrélé au
passage », qui doit être reconnue par la règle pour qu'on sache que la règle regarde quelque
chose.

**Trois des neuf raisons sont `mesurable`** — `restauration/footfall`, `restauration/noise` et
`boutique/density` — et chacune nomme le recoupement qui la trancherait. Les six autres disent
« arbitrage, pas une mesure ».

### Un chiffre de l'énoncé était faux

« `noise` … sur 25 094 tronçons du même corpus » : les deux axes ne lisent pas la même source, et
la mesure « mesurable » du bruit passe par Overpass et non par le corpus. Corrigé plus haut dans
ce ticket, consigné dans `docs/REPRISE-PIEGES.md`, et **écrit dans la raison elle-même** — un
lecteur à qui l'on dit « mesurable » a droit à ce que ça coûte.

### Ce que ça ne rattrape pas

- **Une raison écrite n'est pas une raison mesurée.** Le ticket le disait et rien ici ne le
  change : `LEAD_AXES` attend toujours une décision d'Ivan, et ce qui la trancherait est trois
  conversations avec des restaurateurs.
- **Aucun bras n'ouvre la page avec une clé `mode=`.** La présence de ces raisons à l'écran est
  tenue par `modeText.test.ts` et par une sonde jetable ; une régression propre à un mode
  passerait encore au vert chaque matin. C'est le trou que `#36` avait déjà nommé, inchangé.
- **Les contrôles jugent qu'une raison existe et de quelle espèce elle est**, jamais qu'elle dit
  vrai — la même limite que `modeText.test.ts` nomme déjà pour lui-même.
- **Le serveur MCP ne sert toujours pas les modes.** La raison est prête à côté de l'ordre, dans
  `src/core/`, et c'est `w5-explain-metier` (#31) qui la consommera.
