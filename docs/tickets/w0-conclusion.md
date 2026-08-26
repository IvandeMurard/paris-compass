# [P1] w0-conclusion — Une conclusion tirée par-dessus une retenue

**ID** `w0-conclusion` · **vague 0** · **P1**
**Dépend de** `w0-retenue` (#57), fait — c'est son recensement qui rend démontrable que ce cas n'y est pas
**Bloque** la fermeture de l'épic vague 0 (#41), avec `w0-appelant` (#58)
**Sources** — *aucune source nouvelle*

## Pourquoi

**Le mécanisme de divulgation est juste ; c'est la prose qui va plus loin que ce qu'elle laisse
voir.** Sur un millésime au périmètre `retail_only` — 2023 — une ligne `observed = false` de
`compass_address_timeline` portait cette justification, écrite le 9 août dans `20260809000004` et
recopiée sans changement par six migrations :

> Millésime restreint aux commerces : une absence signifie « plus un commerce », pas « vacant ».

« Plus un commerce » affirme une **transition**, donc un état antérieur. Or pour un appelant
anonyme, 2017 et 2020 reviennent `withheld = true`, `observed = null`, « ni son contenu ni son
existence » — **dans la même réponse**. La ligne conclut à partir de millésimes dont la fonction
vient de dire qu'elle ne dirait rien. Famille des points 9 à 12 de `DIAGNOSTIC.md`, variante
nouvelle : non plus une retenue rendue comme un fait, mais une conclusion posée par-dessus une
retenue. `DIAGNOSTIC.md` §15.

## Comment

1. Vérifier d'abord si le recensement de `w0-retenue` couvre le cas, et le **démontrer**.
2. Trancher : la phrase dépend-elle du privilège de l'appelant, ou faut-il la réduire à ce qu'un
   lecteur peut recouper dans les deux cas ?
3. Corriger le SQL **et** la doctrine. La même affirmation est dans `docs/PLAN.md` et
   `docs/CONTEXTE.md` ; corriger l'un sans l'autre laisserait la doctrine contredire la base.
4. Un invariant de la porte, sans quoi rien n'empêche la phrase de revenir.

## Doctrine

**Une ligne est un millésime, et un millésime n'atteste aucun changement.** Le changement se
compare ailleurs — `compass_premise_history.changed_from_previous`, qui s'annule quand la
comparaison est impossible.

## Fait quand

Un appel anonyme sur un local absent du millésime 2023 ne reçoit plus de justification qui suppose
un état antérieur retenu ; `PLAN.md` dit la même chose que la base ; et un invariant de la porte le
vérifie.

---

# Fait le 26 août 2026 — session 12

**`20260826000001_timeline_scope_evidence.sql` est posée**, ledger distant remesuré à **42**.
Trois invariants ajoutés, **`I29` à `I31`**, la porte passe de 28 à **31**. Le bras D compte
**12 contrôles** au lieu de 11.

## Le point 1 : non, le recensement ne couvre pas ce cas — démontré, pas supposé

Joué le 26 août depuis `eval/invariants.sql` lui-même, avec la couverture de
`scripts/eval/census.ts` — le code de la porte, pas une copie :

| Contrôle | Verdict, défaut encore vivant |
| --- | --- |
| `I23` | **0 ligne** — la fonction est `SECURITY DEFINER` et porte `withheld` |
| `I24` | **6 fonctions, toutes couvertes**, dont `compass_address_timeline` par `I9`/`I10` |

Et ce n'est pas un trou du recensement, c'est sa **définition** : `I23` vérifie qu'une fonction
**peut** annoncer sa retenue, `I24` qu'un test anonyme **existe**. Ni l'un ni l'autre ne lit une
phrase, et `I9`/`I10` ne regardent que les lignes retenues et la retenue excessive — jamais
l'`evidence` d'une ligne divulguée.

> **La leçon, dans la lignée des points 20 et 23 :** une règle structurelle vérifie qu'une
> fonction **peut** dire la vérité, jamais qu'elle la dit. Le ticket ne se réduisait donc pas à la
> correction seule — c'eût été une bonne nouvelle, elle n'était pas vraie.

## Le point 2 : la décision est venue d'une mesure, pas d'un goût

L'issue posait le choix — phrase dépendante du privilège, ou réduction uniforme — et penchait pour
la seconde parce qu'elle est « la plus simple ». La mesure a rendu la première **impossible**.

Les **24 573** locaux absents du millésime 2023 (sur 85 418), classés par leur dernier relevé
connu, mesuré le 26 août sur `dbefhvmyfmmhjeetdddu` :

| Dernier état observé | `niv8` | Dans le périmètre commerce | n |
| --- | --- | --- | --- |
| Autre local | 7 | non | **12 367** |
| Local vacant | 6 | non | **6 280** |
| Non Alimentaire | 3 | oui | 2 281 |
| Service commercial | 4 | oui | 1 739 |
| Restauration | 5 | oui | 1 247 |
| Alimentaire | 2 | oui | 542 |
| Hôtel | 8 | oui | 115 |
| Grand magasin | 1 | oui | 2 |

**18 647 sur 24 573, soit 75,9 %.** Un local relevé vacant en 2020 **n'a jamais été un commerce** :
il ne peut pas avoir cessé de l'être. La phrase n'était donc pas seulement trop forte pour
l'anonyme — elle était fausse pour **trois lignes sur quatre même quand les trois millésimes sont
visibles**. Une phrase dépendante du privilège aurait laissé cette affirmation en place sur le
chemin privilégié, c'est-à-dire exactement pour ceux qui peuvent republier.

> **Et la base le disait déjà, dans la colonne d'à côté.** `bdcom_vintage.licence_note` du
> millésime 2023, posée le 8 août : « Vacant premises (7 853 in 2017, 8 764 in 2020) and
> non-commercial ground-floor premises are absent ». Rien n'avait recoupé la phrase contre elle.
> Même mode de défaillance que le §21 — un raisonnement écrit que rien ne **pouvait** relire,
> parce que c'était de la prose.

## La phrase rendue, identique pour les trois appelants

> Millésime restreint aux commerces : le local n'y figure pas. Cette couche ne publie que les
> commerces — ni locaux vacants, ni locaux non commerciaux — donc l'absence ne permet aucune
> conclusion sur l'état du local.

Elle ne nomme **ni** « vacant » **ni** « plus un commerce », et ce n'est pas de l'élégance :
`I29`/`I30` interdisent les formes d'antériorité dans cette colonne, et une phrase corrective qui
citerait la conclusion qu'elle interdit déclencherait sa propre règle — ou forcerait à écrire la
règle assez lâche pour être inutile. La garde nommée pour le lecteur vit dans
`src/pages/Methodology.tsx`, qui l'énonçait déjà correctement.

Vérifié le 26 août, local **54653**, les trois appelants, `set local role` pour que RLS s'applique
vraiment :

| Appelant | 2017 | 2020 | 2023 |
| --- | --- | --- | --- |
| Privilégié | relevé de terrain | relevé de terrain | non relevé, périmètre nommé |
| **Anonyme** | **retenu** | **retenu** | non relevé, périmètre nommé |
| Authentifié | relevé de terrain | relevé de terrain | non relevé, périmètre nommé |

`create or replace` plutôt que `drop` + `create` : ni la signature ni les colonnes ne bougent, et
remplacer en place conserve les droits. **Une seule ligne du corps diffère** de `20260815000001` —
vérifié par `diff`, pas affirmé.

## Le point 4 : trois invariants, et pourquoi trois

- **`I29`** (`@as anon`) — le défaut du ticket. Pour cet appelant, aucune antériorité n'est
  recoupable **par construction**.
- **`I30`** (privilégié) — pas un doublon, et c'est la mesure des 75,9 % qui le justifie. Il tient
  aussi la ligne si quelqu'un rendait un jour cette prose dépendante de l'appelant : `I29` seul
  passerait alors au vert sur une base fausse.
- **`I31`** (`@as anon`) — le miroir, sur le patron de `I10`/`I13`/`I15`/`I17`/`I26` : la phrase
  doit continuer à **nommer ce que la couche ne publie pas**. Vider la phrase satisferait les deux
  premiers et ferait perdre au lecteur le seul fait qui rend l'absence inexploitable.

**Éprouvés contre la vraie base avant la poussée**, comme `I23` en son temps :

| | Avant `20260826000001` | Après |
| --- | --- | --- |
| `I29` (anon) | **échec**, 20 lignes (plafond de la requête) | 0 ligne |
| `I30` (privilégié) | **échec**, 20 lignes | 0 ligne |
| `I31` (anon) | 0 ligne | 0 ligne |

La population n'est pas 400 locaux au hasard : ce sont 400 locaux **tirés de ceux absents du
millésime 2023**, donc 400 qui exercent réellement la branche. Un tirage aveugle l'aurait manquée
la plupart du temps.

## Ce que la porte épinglait, et qu'il a fallu défaire

**Le cas doré `gold-perimetre-001` exigeait `evidence_contains: "plus un commerce"`**, joué sur le
chemin privilégié. La porte ne se contentait donc pas de ne pas voir le défaut : elle le
**tenait**. C'est là que la doctrine du 9 août avait été gelée, et c'est ce qui la rendait
invisible — un cas doré ressemble à une garantie, pas à une opinion.

Réécrit avec son `why`. `eval/FAILURE_MODES.md` suit, catégorie `perimetre_2023` comprise, et la
fixture de `src/i18n/timelineText.test.ts` aussi — **aucun code de `src/` ne change** :
`timelineText.ts` relaie `evidence` sans la lire, ce qui était déjà le bon choix.

## La doctrine, remise d'accord avec la base

Deux endroits portaient la **même affirmation**, pas une simple mention :

- `docs/PLAN.md` §« Changement d'activité n'est pas changement de propriétaire » — « Une
  disparition en 2023 signifie « ce n'est plus un commerce », jamais « c'est vacant » ».
- `docs/CONTEXTE.md` — « un local qui en disparaît n'est pas « vacant », il n'est « plus un
  commerce » ».

Deux autres n'ont **pas** bougé, et la distinction est le sujet : `docs/PLAN.md` §2.5 et
`docs/PLAN-ACTION-VACANCE.md` énoncent des **interdits d'affichage** — « non observé n'est ni
vacant ni plus un commerce » — qui étaient justes depuis le début. Ce sont les deux
**affirmations** qui étaient fausses, pas les deux interdits.

## Portes

`typecheck` ✓ · **122 tests** ✓ (inchangé — la fixture change, pas le nombre de cas) · `build` et
`build:dev` ✓ · **`eval` 31/31 invariants** et **8/8 cas dorés**, dix écarts de baseline en
avertissement (code de sortie 3, dérive BODACC/SIRENE déjà connue, la plus large à 0,70 %) ·
**`eval:anon` PASS, 12 contrôles** · **`eval:sabotage` PASS**. `verify:mcp` non relancée : ce
ticket ne touche ni `src/core/` ni `mcp-server/`.

## Ce qui reste, et qui n'appartient pas à ce ticket

- **Pas de recensement sur `evidence`.** Mesuré au catalogue le 26 août : **deux** fonctions
  exposent la colonne — celle-ci et `compass_survival_by_trade`, déjà tenue par `I21`. Écrire
  l'énumération à la deuxième occurrence, quand `w0-retenue` l'a écrite à la cinquième, serait de
  l'outillage sans population. **À rouvrir dès qu'une troisième fonction expose `evidence`** — et
  c'est écrit ici pour que ce soit une décision et non un oubli.
- **Les trois invariants lisent une liste de formes.** Une antériorité tournée autrement leur
  échappe — limite de `I21`, dont ils reprennent le patron. Et `I31` vérifie que la phrase nomme la
  vacance, pas qu'elle la nomme bien.
- **`#41` reste ouverte** : `#58` `w0-appelant` porte le libellé `vague-0` et n'est ni traitée ni
  reportée.
