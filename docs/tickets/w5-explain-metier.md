# [P1] w5-explain-metier — L'écran a trois métiers, l'agent n'en a aucun

**ID** `w5-explain-metier` · **vague 5** · **P1**
**Dépend de** `w6-modes` (#36), `w6-mode-raison` (#197)
**Sources** — *aucune source nouvelle : ce que le noyau sait déjà et que le serveur ne sert pas*

> **Réécrit le 17 septembre 2026.** La version d'origine venait de `docs/PLAN.md` et proposait
> *« une pondération déclarée par métier — cave à vins : calme + revenu 200 m »*. La doctrine a
> depuis refusé exactement cela : **le métier permute, il ne pondère pas**, et il n'existe aucune
> note par métier (refus n° 4). Le ticket est conservé pour son identifiant et son intention ;
> son contenu est remplacé par ce que `#36` et `#197` ont réellement construit.

## Pourquoi

La fiche d'adresse porte cette phrase, sous le bloc de l'agent :

> *« Le serveur MCP de Compass rend ce verdict à partir de la même fonction de composition que
> cette page. »*

**Depuis `#36`, elle est fausse sur un point.** L'écran laisse choisir un métier ; le métier
réordonne les six constats ; l'agent ne peut pas demander ce métier et reçoit toujours l'ordre du
noyau. `#197` a creusé l'écart : l'écran affiche maintenant, à côté de chaque axe de tête, **la
raison qui l'y met et le statut de cette raison** — mesuré, mesurable, arbitrage. L'agent n'en
reçoit rien.

**La moitié du travail n'est pas à faire** : `modeAxisOrder`, `modeLeadAxes` et
`LEAD_REASON_STATUSES` vivent dans `src/core/`, que le serveur importe déjà. Ce qui manque est de
les exposer et de le prouver.

## Ce qui a été mesuré le 17 septembre 2026, et qui change la forme du travail

**1. `explain_score` ne parle pas la langue du verdict.** Son énumération `METRICS` est
`walkability, schools, healthcare, groceries, parks, transit, footfall, noise` — le vocabulaire de
`AreaScores`. Les axes du verdict, ceux que le métier réordonne, sont `density, footfall, rail,
services, alimentaire, noise`. **Deux seulement se recouvrent.** Ajouter un paramètre `trade` à
`explain_score` reviendrait donc à réordonner un ensemble qui n'est pas celui que le métier
concerne.

C'est le vrai obstacle de ce ticket, et il n'est pas dans son titre. **La première décision de la
session est de dire quel outil porte le métier**, et de l'écrire :

- `score_location` rend déjà le `verdict` composé par `src/core/verdict.ts` — c'est lui qui tient
  les six axes et leur ordre ;
- `explain_score` détaille **un** axe et n'a pas d'ordre à permuter.

La lecture qui tient debout est que **l'ordre appartient à `score_location`**, et que
`explain_score` gagne au plus la raison d'un axe donné pour un métier donné. La session peut
trancher autrement, à condition de l'écrire et de dire ce que ça coûte.

**2. Le vocabulaire d'axes est énuméré à la main dans le serveur.** `METRICS` est une liste écrite,
pas une population dérivée. Toute exposition d'axes de verdict côté agent doit se dériver de
`VERDICT_AXIS_ORDER`, sinon la prochaine divergence entre les deux surfaces s'installera sans
qu'un test la voie — c'est exactement ce qui vient de se produire.

## Doctrine

**Le métier change l'ordre et les raisons. Il ne change aucun chiffre.** C'est la même règle qu'à
l'écran, et c'est ce qui la rend vérifiable : deux appels, l'un avec métier, l'autre sans, doivent
rendre **les mêmes valeurs, les mêmes sources, les mêmes licences, les mêmes millésimes**. Seule la
séquence bouge, et les raisons apparaissent.

**Aucune note par métier, aucune pondération.** Le refus n° 4 de la doctrine tient : il n'existe
pas de score de restauration.

**Et la raison sert son statut avant sa phrase.** `#181` a tranché la forme : le serveur fait
voyager **le motif structuré à côté de la phrase**, pour qu'un consommateur compose dans sa langue
au lieu de relire du français. La même forme s'applique ici — `LeadReasonStatus` est la part
structurée, et elle vit déjà dans `src/core/`. Que la phrase elle-même voyage aussi, et dans
quelle langue, est à trancher dans la session ; le statut, lui, n'est pas négociable.

## Fait quand

1. **Un appel avec métier rend l'ordre de ce métier**, identique à celui que `modeAxisOrder` donne
   à l'écran — et la population est dérivée de `src/core/`, jamais réécrite dans le serveur.
2. **Un appel avec métier rend, pour chaque axe de tête, le statut de sa raison**, pris de
   `LEAD_REASON_STATUSES`. Un statut réécrit en clair dans le serveur fait rougir `test`.
3. **Les chiffres sont identiques avec et sans métier** — valeurs, sources, licences, millésimes —
   et un contrôle l'exige plutôt que de l'espérer.
4. **Un métier inconnu est refusé par son nom**, pas silencieusement ignoré : un agent qui demande
   « bar à vin » doit apprendre que le métier n'existe pas, sinon il croit lire l'ordre d'un métier
   en lisant celui du noyau.
5. **Un bras `PARITE` le démontre contre le serveur publié** — famille `PARITE` de
   `mcp-server/src/verify.ts`, jouée par `npm.cmd run verify:mcp`. Il compare l'ordre rendu par
   l'agent à l'ordre que `src/core/` donne pour le même métier. Sans ce bras, la promesse
   « la même réponse pour un agent » redevient une phrase.
6. **La fiche d'adresse ne ment plus** : si le bloc de l'agent affiche un appel pendant qu'un
   métier est choisi, l'appel affiché porte ce métier.

**Ce que ça ne rattrape pas.** La parité d'ordre n'est pas la parité de lecture : un agent qui
reçoit six axes ordonnés peut les restituer dans n'importe quel ordre à son propre utilisateur, et
rien ici ne l'en empêche. Ce ticket garantit ce que le serveur **dit**, jamais ce qu'un client en
fait.

## Hors périmètre

Pas de pondération, pas de note par métier, pas de nouveau métier. Pas de traduction du serveur :
si la phrase de la raison voyage, elle voyage dans une langue nommée, et le choix se documente.
Pas de réécriture de l'énumération `METRICS` d'`explain_score` — c'est un chantier à part, et s'il
s'avère nécessaire il se pose en ticket plutôt qu'il ne s'attrape en chemin.

Voir [`w6-modes.md`](./w6-modes.md), [`w6-mode-raison.md`](./w6-mode-raison.md), et
`docs/PLAN-ACTION-VACANCE.md` pour le refus n° 4.
