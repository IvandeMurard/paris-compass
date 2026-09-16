# [P1] w1-questions-lues — Le journal des questions ne voit qu'une surface, et personne ne le lit

**ID** `w1-questions-lues` · **vague 1** · **P1**
**Dépend de** `w1-observabilite`
**Sources** — *aucune source nouvelle : ce que le produit écrit déjà sur lui-même*

## Pourquoi

**Mesuré le 16 septembre 2026.** `compass_record_question` enregistre chaque question avec son
issue, et `compass_question_summary()` l'agrège par quartier. Le substrat existe depuis `#72`,
avec sa doctrine — *classer les requêtes, jamais les gens* : le point est résolu en quartier par
la base **qui le jette ensuite**, et le rayon est rangé en tranche.

**Deux défauts, et le second est le plus coûteux.**

**1. Le journal ne voit qu'une surface.** `recordQuestion` n'est appelé que depuis
`mcp-server/src/scorePoint.ts`, avec `p_surface: "outil_mcp"` écrit en dur. **L'écran
n'enregistre rien** — aucune occurrence dans `src/`. Le journal mesure donc la surface qui n'a
presque pas de trafic et il est **aveugle à celle qui a des visiteurs**.

Que `p_surface` soit un *paramètre* dit que le schéma a été conçu pour plusieurs surfaces. Une
seule a été branchée.

**2. Personne ne le relit.** Les seuls consommateurs de `compass_question_summary()` sont
`scripts/eval/budget.ts` — un contrôle de coût — et `scripts/eval/census-sabotage.ts`, un test.
**Aucun lecteur produit.** Le substrat s'écrit depuis onze jours et n'a jamais rien dit à
personne.

## Ce que ça vaut

**C'est la seule question que Compass ne peut pas se poser autrement : qu'est-ce qu'on lui
demande qu'il ne sait pas répondre.** L'énumération `public.question_outcome` enregistre déjà les
silences. Un décompte des questions restées sans réponse est de la **demande mesurée** — pas une
intuition sur ce qu'un preneur voudrait, ce qu'il a effectivement cherché.

Aucun autre instrument du dépôt ne dit ça. Les quinze bras disent si le produit ment ; celui-ci
dirait ce qu'il lui manque.

## Doctrine — et la limite est stricte

**Le journal oriente le backlog. Il ne règle jamais la réponse.**

`docs/PLAN-ACTION-VACANCE.md` est explicite : *« Pondération déclarée par métier, jamais apprise
en secret. »* Une boucle qui ajusterait `LEAD_AXES`, un seuil ou une formule d'après l'usage
détruirait la propriété centrale du produit — un chiffre dont la formule vient de l'usage n'est
plus re-dérivable par le lecteur, et le dossier téléchargeable cesse d'être vérifiable.

**Ce qui est légitime** : apprendre **quelles questions** on nous pose, et donc quoi construire.
**Ce qui ne l'est pas** : apprendre **quelle réponse** donner.

**Et la vie privée est déjà tranchée par `#72`** — ce ticket ne la rouvre pas. Brancher l'écran
signifie enregistrer *ce qui a été demandé et ce qui a été rendu*, au quartier, jamais qui l'a
demandé. Une session qui aurait besoin d'élargir ça doit s'arrêter et le dire.

## Comment

Deux moitiés, et la première est petite parce que le paramètre existe déjà.

1. **L'écran journalise**, avec sa propre valeur de `p_surface`, distincte de `outil_mcp` — sans
   quoi le décompte mélangerait deux populations dont l'une a mille fois le trafic de l'autre.
2. **Quelque chose relit le journal** et le rend lisible : par issue, par quartier, par surface.
   Où le lire est à trancher dans le ticket — un bras de la porte le dirait chaque matin, une
   page le dirait publiquement, et les deux n'ont pas le même public.

## Fait quand

1. **Une visite de `/contexte/<adresse>` laisse une ligne** dans le journal, avec sa surface
   propre, et une contre-preuve le démontre : avant, rien ; après, une ligne et une seule.
2. **Les deux surfaces sont distinguables** dans le décompte, et un test l'exige — les mélanger
   rendrait le chiffre inutilisable sans que personne ne le voie.
3. **Le décompte est lisible par un humain**, avec au minimum : combien de questions, combien
   sans réponse, et lesquelles.
4. **Rien de ce qui est enregistré n'identifie une personne** — la règle de `#72` est reconduite
   et vérifiée, pas supposée.
5. **Aucun réglage du produit ne lit ce journal.** Un test l'exige : `src/core/` ne l'importe
   pas, et ne le peut pas.

**Ce que ça ne rattrape pas.** Un décompte dit ce qu'on a demandé, jamais **pourquoi** ni si la
réponse a servi. Deux personnes qui posent la même question pour des raisons opposées comptent
pareil. Et il ne verra jamais les questions que personne ne pose **parce que le produit ne laisse
pas les poser** — c'est le trou que seul un entretien comble, et `w5-entretien` (#30) en est la
version produit.

## Hors périmètre

Pas d'apprentissage, pas de pondération, pas de personnalisation. Pas de compte utilisateur. Pas
d'élargissement de ce qui est enregistré au-delà de ce que `#72` a tranché.

Voir [`w1-observabilite.md`](./w1-observabilite.md) et `docs/REGLES-INCIDENTS.md` pour ce que
`#72` avait mesuré.
