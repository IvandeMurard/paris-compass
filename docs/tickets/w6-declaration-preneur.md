# [P1] w6-declaration-preneur — Ce qu'un preneur sait et qu'aucune donnée ouverte ne porte

**ID** `w6-declaration-preneur` · **vague 6** · **P1** · **BLOQUÉ — décision de périmètre**
**Dépend de** `w6-dossier`
**Sources** — *une source nouvelle, et c'est tout le sujet : les visiteurs eux-mêmes*

> **Ce ticket n'est pas un ordre de travail.** C'est une décision de périmètre, posée par Ivan le
> 16 septembre 2026 pour être discutée. Aucune session ne doit l'ouvrir : ce qu'il faut trancher
> est en bas, et la moitié des réponses déplacerait `docs/PERIMETRE.md` et `docs/CONTEXTE.md`.

## Pourquoi la question se pose

Trois lignes de la checklist métier n'ont **aucune source** et le code le dit honnêtement :
extraction de cuisine, licence de débit, accès livraison. Elles ne sont pas un oubli — elles sont
invisibles en données ouvertes. Une extraction est une propriété du bâtiment, connue du bail et
du syndic, de personne d'autre.

**Un preneur qui visite le local, lui, le sait.** Il sait aussi si la cave est humide, si le
trottoir est large, si le voisin se plaint du bruit. Rien de tout cela n'est public, et tout cela
décide.

C'est la seule façon d'obtenir ces faits. C'est aussi la première fois que Compass **produirait**
de la donnée au lieu d'en lire.

## Ce que ça change à ce qu'est Compass

**Aujourd'hui** : un lecteur de données publiques, qui ne possède rien et dont chaque chiffre se
refait sans lui.

**Après** : un lecteur **et** un collecteur, qui possède un corpus que personne ne peut vérifier
à sa place.

Ce n'est pas une fonctionnalité de plus. C'est un déplacement du périmètre, et il touche la
propriété qui différencie le produit — *l'interprétation vérifiable*. Un fait déclaré **ne se
re-dérive pas** : le lecteur du dossier ne peut pas le recalculer, il ne peut que faire confiance.

## Ce que le produit dit aujourd'hui, et qui se retourne contre l'idée

La fiche affiche, à propos de BDCom :

> *« Un relevé de terrain, pas un marquage bénévole. »*

**Le produit revendique à haute voix de ne pas reposer sur des contributions volontaires.**
Ajouter du déclaratif sans traiter cette phrase ferait se contredire la page avec elle-même. Soit
la phrase change, soit le déclaratif est si clairement séparé qu'elle reste vraie de ce qu'elle
décrit. C'est la première chose à trancher, et elle n'est pas cosmétique.

## Les décisions à prendre, et aucune n'est technique

1. **Quel niveau de confiance.** Les quatre niveaux existent — *établi, corroboré, probable,
   indéterminé*. Une déclaration non vérifiée est **`probable` au mieux**, avec sa provenance
   propre : « déclaré par un visiteur, non vérifié ». Jamais `établi`, jamais confondue avec
   BDCom. Est-ce suffisant, ou faut-il un cinquième niveau qui dise *déclaré* plutôt que *probable* ?

2. **Ce que devient le dossier téléchargeable.** Chaque figure y porte sa formule et ses
   opérandes, et se recalcule. Un fait déclaré n'a ni l'une ni les autres. Le dossier doit-il le
   porter dans une section à part, visiblement d'une autre nature ? Le porter mêlé aux autres
   détruirait la propriété qui fait sa valeur.

3. **La personne.** `#72` a tranché *classer les requêtes, jamais les gens*, et le journal résout
   le point en quartier puis le jette. Une déclaration est **attachée à une adresse**, donc elle
   ne peut pas être jetée de la même façon. Garde-t-on qui a déclaré ? Si oui, le produit détient
   des données personnelles qu'il n'a jamais eues, avec tout ce que ça entraîne.

4. **La licence.** BDCom est `ODbL-1.0`, et le produit cite sa licence sous chaque chiffre. Sous
   quelle licence une déclaration est-elle recueillie, et Compass peut-il la redistribuer ? Sans
   réponse, le dossier porterait un chiffre sans licence — ce que `Measured<T>` existe pour
   empêcher.

5. **La mauvaise foi.** Le refus structurant du produit est le courtier. Un bailleur qui déclare
   que son local a une extraction est exactement la partie intéressée que la doctrine écarte.
   Qu'est-ce qui distingue un preneur qui visite d'un vendeur qui embellit ? Si rien, le corpus
   déclaratif est manipulable par ceux qui ont le plus à y gagner.

6. **Et la question qui précède les cinq autres** : y a-t-il seulement des visiteurs ? Le produit
   n'a aucun compte, aucune traction mesurée, et un corpus déclaratif sans contributeurs est du
   travail pour personne. Ça se mesure avant de se construire — `w1-questions-lues` (#199) est le
   premier instrument qui le dirait.

## Fait quand

**Rien n'est « fait » ici tant que les six points ci-dessus n'ont pas de réponse écrite.** Le
livrable de ce ticket, à ce stade, est une décision consignée dans `docs/PERIMETRE.md` — pas du
code.

Si la décision est oui, le ticket sera **réécrit** avec ses critères ; si elle est non, il sera
fermé avec sa raison, comme `w1-dia` l'a été — *clos par un refus, pas par une ingestion*.

**Ce que ça ne rattrape pas.** Même décidé et construit, le déclaratif ne dira jamais si une
information est vraie : il dira qui l'a dite et quand. C'est un déplacement de la confiance, pas
une vérification — et c'est précisément ce que le reste du produit refuse de faire ailleurs.

## Hors périmètre tant que la décision n'est pas prise

Pas de schéma, pas de formulaire, pas de compte utilisateur, pas de modération. Écrire l'un
d'eux avant la décision reviendrait à la prendre en silence.

Voir `docs/PERIMETRE.md` §1 et §10, `docs/CONTEXTE.md`, et
[`w1-questions-lues.md`](./w1-questions-lues.md).
