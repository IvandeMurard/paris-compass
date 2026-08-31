# [P1] w1-catalogue — Vérifier le catalogue des sources au lieu de le croire, et tester que la donnée veut encore dire la même chose

**ID** `w1-catalogue` · **vague 1** · **P1**
**Dépend de** —
**Sources** — *aucune source nouvelle*

## Pourquoi

**Trente sources décrites en prose, aucune vérifiée.** `PLAN-ACTION-VACANCE.md` porte un
catalogue avec, pour chacune, son producteur, son statut, sa licence, sa granularité et son
piège. `src/services/opendata/sources.ts` en publie une partie sur `/sources`. Les deux sont
tenus à la main : ils **affirment** qu'une source est connectée sous telle licence, et rien ne
le recoupe.

Le mode de panne est déjà documenté, pas supposé. `#56`, le 25 août : l'INSEE **remplace** sa
ressource au lieu de l'archiver, l'URL épinglée a rendu 404, et le chargeur ne pouvait plus
tourner. Personne ne l'a su avant de le lancer.

**Deux choses manquent, et elles ne sont pas la même.**

| | Ce qui existe | Ce qui manque |
| --- | --- | --- |
| **Vérification** — la source répond-elle encore, et déclare-t-elle encore ce qu'on a noté | rien entre deux chargements | endpoint, licence annoncée, millésime publié, statut du catalogue |
| **Test** — ce qu'on reçoit veut-il encore dire ce qu'on en a mappé | les neuf chargeurs valident leur entrée **au chargement** ; les 24 baselines mesurent des **effectifs** | domaine des nomenclatures, jeu de colonnes, unités, valeurs hors domaine |

Les baselines couvrent le volume : un effondrement se voit. Elles ne voient pas un code qui
change de sens à volume constant — et c'est exactement ce qui est arrivé le 25 août avec le pont
NAF (`DIAGNOSTIC.md` §20) : `101` lu comme *Alimentaire* quand la nomenclature dit *Grand
magasin*, et `114` qui n'existe pas. Volume inchangé, sens faux.

`I4` vérifie qu'un millésime **porte** une licence et une date. Il ne vérifie pas que cette
licence soit encore celle que l'APUR déclare.

## Comment

**Deux protocoles distincts, une seule cadence, un seul compte rendu.**

1. **Vérification, par source.** L'endpoint répond ; la licence annoncée est celle qu'on a
   consignée ; un millésime plus récent existe-t-il ; le statut du catalogue (`connectée`,
   `ingérée`, `planifiée`, `refusée`) correspond à la réalité. Une source `refusée` n'est pas
   interrogée — le refus est une décision, pas une panne à surveiller.

2. **Test, par source.** Ce qu'on reçoit correspond-il encore au mappage : jeu de colonnes,
   domaine des codes de nomenclature, valeurs hors domaine, unités. **`I22` est le prototype** —
   tout `niv18` du pont doit exister dans `bdcom_activity` — et ce ticket généralise le geste
   aux autres nomenclatures plutôt que d'attendre la prochaine.

3. **La règle derrière.** Un contrôle qui échoue si une source du catalogue n'a ni vérification
   ni raison écrite de ne pas en avoir. Même forme que `#70` pour la cadence et `I23`/`I24` pour
   la retenue : **énumérer, pas lister**. Le catalogue est la population ; la couverture se
   dérive de lui.

4. **Le compte rendu.** Voir plus bas — il est le livrable autant que les contrôles.

## Le compte rendu, et pourquoi il décide de l'utilité du ticket

Un protocole qui produit trois cents lignes ne sera pas lu, et un contrôle qu'on ne lit plus est
un contrôle mort. Le dépôt le sait déjà : « le bruit, c'est comme ça qu'un contrôle finit
désactivé » (`scripts/sessions.ts`).

Le compte rendu se lit en trente secondes et **trie par ce qu'il attend de l'humain** :

- **Rien à faire** — vérifié, conforme. Une ligne pour l'ensemble, pas une par source.
- **Changé, sans décision requise** — un millésime plus récent est paru, l'endpoint a bougé de
  redirection. Nommé, daté, sans détail.
- **Décision requise** — une licence a changé, un code est hors domaine, une source ne répond
  plus. **Chaque item porte : ce qui a été mesuré, quand, et quelle décision est attendue.**

Ce dernier bloc est le seul qui a le droit d'être long. S'il est vide, le compte rendu tient en
trois lignes.

## Doctrine

Une documentation n'est pas une mesure : citer la base, l'endpoint, le fichier — jamais la page
qui en parle. Ce ticket applique cette règle au catalogue lui-même, qui est précisément une page
qui parle de trente sources.

Le protocole **détecte et signale**. Il ne décide pas qu'une licence changée est acceptable, ne
remappe pas un code hors domaine, ne met pas à jour le catalogue tout seul. La direction du
31 août le dit : l'amélioration continue porte sur ce qui est détecté, jamais sur ce qui est
toléré.

## Fait quand

1. Chaque source non refusée du catalogue est vérifiée, ou porte une raison écrite de ne pas
   l'être — jamais un silence.
2. Au moins une nomenclature autre que le pont NAF est testée sur son domaine, sur le patron
   de `I22`.
3. **Un contrôle échoue si l'on ajoute une source au catalogue sans vérification.** Démontré en
   en ajoutant une pour de faux, comme `eval:sabotage` le fait pour `I23`/`I24`.
4. Le compte rendu tient en trois lignes quand tout va bien, et nomme la décision attendue quand
   ce n'est pas le cas. Démontré dans les deux états — dont un provoqué.

**Dire ce que ça ne rattrape pas** : une source qui répond, sous la bonne licence, avec les
bonnes colonnes, et dont le contenu est faux. La vérification porte sur la forme et la
déclaration ; la justesse du contenu reste affaire de mesure et de jugement.

Voir `DIAGNOSTIC.md` §20 pour le pont NAF, `#56` pour la ressource remplacée, `#70` et `#71`
pour la même forme appliquée à la cadence et à la porte, et la direction du 31 août dans
`docs/REPRISE.md`.
