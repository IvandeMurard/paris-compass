# [P1] w6-rue — Compass mesure en cercles, et une rue n'est pas un cercle

**ID** `w6-rue` · **vague 6** · **P1**
**Dépend de** `w0-plu` (#9)
**Placé après** `w2-rythme` (#208) — un ordre voulu par Ivan, **pas une dépendance technique** : compter les locaux d'une voie ne demande aucune heure. Si `w2-rythme` s'enlise, celui-ci n'est pas bloqué.
**Sources** — *aucune source nouvelle : une échelle que le corpus porte déjà et que rien ne
rapporte*

> **Décidé par Ivan le 17 septembre 2026** : *« la rue doit devenir une échelle affichée et
> valorisable par l'utilisateur. »*

## Pourquoi

Le témoignage de Baptiste Braux porte sur **une rue**, nommée : *« Je ne connaissais pas la rue
Martel avant d'y installer un comptoir. Aujourd'hui je sais à quelle heure elle se vide, qui
l'habite vraiment et qui ne fait qu'y passer. »*

**Compass n'a pas cette échelle.** Il mesure au local — le relevé BDCom est porte-à-porte — puis
il rapporte dans des **cercles** : 400 m pour le passage, 800 m pour les services et les
aménités. Un cercle de 400 m autour de la rue Martel avale le boulevard de Magenta, qui n'a rien
à voir avec elle. Le produit calcule au plus fin et restitue au plus large, et **l'échelle
intermédiaire, celle où un commerce vit, n'existe nulle part**.

Ce n'est pas un manque de données. C'est un niveau d'agrégation absent.

## Ce que le corpus porte déjà à l'échelle de la rue

**Mesuré le 17 septembre 2026, et à remesurer avant d'afficher :**

- **Les locaux BDCom portent une adresse**, donc une voie. Compter les locaux *de la rue* plutôt
  que *du cercle* ne demande aucune source nouvelle.
- **Les protections du PLU sont posées par linéaire de rue** — `w0-plu` (#9). C'est déjà une
  donnée de rue, aujourd'hui rendue comme une propriété du point.
- **Les tronçons de voirie** existent dans le corpus — 25 094, chiffre du 16 septembre 2026, à
  remesurer.

**La première tâche de la session est donc de mesurer, et d'écrire, ce qu'une « rue » est
exactement dans ce corpus** : une voie nommée, un tronçon, une suite de tronçons de même nom ?
Rue de Rivoli fait trois kilomètres et n'a pas une vie mais cinq. **Une rue longue n'est pas une
unité de lecture**, et décider où s'arrête « la rue » est la vraie difficulté de ce ticket. La
réponse se documente avant que le premier chiffre s'affiche.

## Ce que « valorisable par l'utilisateur » veut dire, et ce que ça ne veut pas dire

Ivan demande une échelle **affichée et valorisable**. Ce qui la rend utile, c'est qu'elle
**discrimine** : une échelle qui rend le même chiffre que le cercle n'apprend rien et alourdit
la page.

**Donc un critère de ce ticket est une contre-preuve, pas une fonctionnalité** : trouver deux
adresses du même cercle mais de deux rues différentes, et montrer que la lecture de rue les
sépare là où le cercle les confond. Si aucune paire ne les sépare, **le ticket a échoué et doit
le dire** plutôt que d'afficher une échelle décorative.

**Ce que ça ne veut pas dire** : pas de note de rue, pas de classement de rues, pas de « top des
rues commerçantes ». Comparer des rues en masse est le geste du courtier, que le produit refuse
au même titre que le portefeuille d'adresses. La borne est la même qu'ailleurs : **deux, jamais
plus**.

## Fait quand

1. **Ce qu'est une rue ici est écrit et dérivé**, pas supposé : la définition retenue, ce qu'elle
   coupe, et ce qu'elle fait d'une voie de trois kilomètres.
2. **Au moins un constat est rendu à l'échelle de la rue**, avec sa source, sa licence et son
   millésime, et **il est nommé comme étant de la rue** — un chiffre de rue affiché à côté d'un
   chiffre de cercle sans que le lecteur sache lequel est lequel est pire que pas de chiffre.
3. **La contre-preuve est jouée et publiée** : deux adresses du même cercle, deux rues, deux
   lectures. Elle vit dans un test, pas dans une capture.
4. **Les protections du PLU sont rendues comme ce qu'elles sont** — une propriété du linéaire,
   pas du point.
5. **Une rue sans donnée le dit par son motif**, jamais par un zéro.
6. **Aucun classement, aucune note de rue, aucune comparaison au-delà de deux.**

**Ce que ça ne rattrape pas.** Une rue reste une approximation de ce que le témoignage décrit :
Kafé parle d'un trottoir, d'une heure et d'un flux de porte. Une moyenne de rue lisse les deux
extrémités d'une rue qui change de nature en son milieu, et rien ici ne verra ce basculement.
L'échelle de la vitrine n'est atteignable par aucune donnée ouverte connue à ce jour.

## Hors périmètre

Pas de source nouvelle. Pas de classement. Pas de refonte du rayon des six axes : le cercle reste
ce qu'il est, la rue s'ajoute à côté. Pas de carte par rue tant que le premier constat de rue
n'est pas jugé discriminant.

Voir [`w2-rythme.md`](./w2-rythme.md) et `docs/PLAN-ACTION-VACANCE.md` pour le refus du
portefeuille.
