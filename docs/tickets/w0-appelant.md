# [P1] w0-appelant — `authenticated` est-il privilégié ? Trancher pendant que c'est gratuit

**ID** `w0-appelant` · **vague 0** · **P1**
**Dépend de** `w0-retenue` (#57), fait
**Bloque** rien, et c'est ce qui le rend dangereux à repousser
**Sources** — *aucune source nouvelle*

## Pourquoi

**Deux règles écrites le même jour ne disent pas la même chose, et personne n'a tranché.**

| | Qui est restreint |
| --- | --- |
| La politique RLS de `20260809000008` | `to anon, authenticated` |
| Le test d'appelant de `20260809000010` | tout ce qui n'est pas `anon` est **privilégié** |

Tant que les fonctions étaient `SECURITY INVOKER`, le désaccord produisait un défaut — RLS
retirait les lignes sous une fonction qui avait déjà conclu « rien n'est retenu »
(`DIAGNOSTIC.md` §12, puis §21). `w0-retenue` a corrigé le défaut en passant les six fonctions
en `SECURITY DEFINER`. **RLS ne protège donc plus rien : le test de claim est désormais la seule
porte**, et il dit qu'un appelant `authenticated` voit tout.

**Ce que ça donne aujourd'hui, mesuré le 25 août 2026 sur `dbefhvmyfmmhjeetdddu`** — local 54652,
millésime 2017, `set local role authenticated` :

| Fonction | Réponse à `authenticated` |
| --- | --- |
| `compass_premise_history` | `observed = true`, `is_vacant = true`, `Locaux Vacants` |
| `compass_address_timeline` | idem |
| `compass_survival_by_trade` | 310 / 268 / **86,5 %**, `withheld = false` |
| `compass_premises_within` (Halles, 800 m) | **4 773 locaux** |
| `compass_scoring_context_within` | **4 773**, `withheld = false` |

2017 et 2020 portent `publicly_redistributable = false` **parce que la licence APUR n'a pas été
lue**. Elle n'a pas été lue pour `authenticated` non plus. **Créer un compte n'est pas une lecture
de licence.**

### Ce que `w0-retenue` a changé, et qu'il faut dire précisément

Avant, `compass_premises_within(…, 2017)` rendait **0 ligne** à un appelant `authenticated` — RLS
les retirait, silencieusement et sans marqueur : c'était le défaut §21. Après, elle en rend
**4 773**.

Les **faits** accessibles n'ont pas changé : le même appelant les obtenait déjà local par local
via `compass_premise_history`. La **facilité d'extraction**, si — de 85 418 appels à un seul. Sur
une licence non lue, c'est une différence de nature, pas de degré. La correction a rendu
l'exposition explicite et intentionnelle là où elle était accidentelle et restrictive ; il faut
maintenant décider si elle est voulue.

### Pourquoi maintenant, et pas plus tard

**`auth.users` compte 0 utilisateur**, mesuré le 25 août 2026. La correction ne retire rien à
personne. Le jour où l'inscription s'ouvre — le produit porte déjà `saved_properties` et
`saved_searches`, donc c'est l'intention — la même correction retire des données à des gens qui
les avaient, et ça ne se fait plus sans discussion.

## Comment

1. **Trancher, et écrire la décision.** La recommandation est `authenticated` **non privilégié**
   jusqu'à réponse de l'APUR : le privilège reste au rôle de service et à toute connexion directe,
   c'est-à-dire à ceux qui exploitent Compass. Si la décision inverse est prise, elle doit être
   écrite avec sa raison — un partenaire sous accord n'est pas un inscrit.

2. **Une seule expression du test, et non six copies.** Le test de claim est aujourd'hui **recopié
   à l'identique dans les six fonctions**, sous un commentaire qui dit « copié verbatim pour
   qu'elles ne divergent pas ». C'est le défaut de `DIAGNOSTIC.md` §20 en miniature : une intention
   au lieu d'une garantie. Extraire `compass_caller_is_privileged()`, `stable`, et la faire appeler
   par les six.

3. **La règle derrière**, sur le patron de `I23` : un invariant qui échoue si une fonction
   `compass_*` autre que celle-là lit `request.jwt.claims` dans son corps. La septième fonction ne
   pourra plus recopier le test.

## Doctrine

Une licence non lue n'est pas lue pour tout le monde. La retenue ne se négocie pas contre une
inscription.

Et : deux règles qui se contredisent ne sont pas deux règles, c'est un défaut en attente. Celle-ci
a produit `DIAGNOSTIC.md` §12 puis §21 ; elle en produira une troisième.

## Fait quand

1. La décision est écrite dans `docs/CONTEXTE.md` avec sa raison et sa date, pas seulement dans une
   migration.
2. Un appelant `authenticated`, joué avec `set local role` pour que ce soit réel, reçoit des six
   fonctions exactement ce que la décision dit — mesuré sur les mêmes points que le tableau
   ci-dessus, avant et après.
3. Le test de claim n'existe **qu'une fois** dans le schéma, et un invariant le garantit.

Et, comme pour `I22` et `I23` : **dire ce que la règle ne rattrape pas.**

Voir `DIAGNOSTIC.md` §21 pour la mesure, §12 pour l'occurrence précédente du même désaccord,
et `docs/tickets/w0-retenue.md` pour ce qui a rendu le sujet visible.
