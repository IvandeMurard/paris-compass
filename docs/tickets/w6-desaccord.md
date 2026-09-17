# [P1] w6-desaccord — Deux constats qui se contredisent, et personne ne le dit

**ID** `w6-desaccord` · **vague 6** · **P1** · **À DISCUTER — pas d'ordre de travail**
**Dépend de** `w2-rythme` (#208), `w6-appuis` (#206)
**Sources** — *aucune*

> **Soulevé par Ivan le 17 septembre 2026** : *« Que se passe-t-il si des données s'opposent ? Si
> l'une crie "très bon emplacement pour ce type de commerce" et l'autre l'inverse ? Compass ne vend
> pas de décision toute faite, mais cela reste un point important à traiter, car pouvant influencer
> l'interprétation et la contextualisation proposées. »*
>
> **Noté pour plus tard, à sa demande.** Aucune session ne l'ouvre avant que la question de fond
> soit tranchée.

## Ce qui se passe aujourd'hui, mesuré le 17 septembre 2026

`composeVerdict` (`src/core/verdict.ts:416`) **juxtapose**. Il assemble une clause par axe porteur
dans l'ordre de lecture, et la phrase rendue est une énumération : *« passage soutenu, desserte
ferrée moyenne, tissu commercial dense, services marchands moyennement présents »*.

**Il refuse de composer quand un constat porteur MANQUE** — retenu ou indéterminé. Il ne remarque
rien quand deux constats **se contredisent**. La contradiction est affichée, jamais nommée.

## Pourquoi ça tenait, et pourquoi ça cesse de tenir

**Tant que le produit comptait, la juxtaposition était le bon comportement.** Deux chiffres ne se
contredisent pas : une densité forte et un passage faible sont deux faits simultanés et vrais, et
les résoudre aurait été inventer un arbitrage — exactement le refus n° 4.

**Depuis `#197`, le produit ne fait plus que compter : il lit.** Et deux lectures peuvent
s'opposer pour de bon :

- *« beaucoup d'écoles à moins de 800 m — une clientèle du midi régulière »* (`w6-appuis`, #206)
- *« double pic matin-soir sur la station — un quartier d'où les gens partent travailler »*
  (`w2-rythme`, #208)

Les deux peuvent être vraies et pointer vers deux commerces différents. **Rien ne le remarquerait,
et le lecteur reçoit deux phrases confiantes qui se neutralisent** sans qu'on lui dise qu'elles le
font.

## Ce que le produit ne doit PAS faire, et c'est la moitié de la décision

**Ne pas trancher.** Une règle qui dirait « en cas de désaccord, le rythme l'emporte sur les
aménités » serait une pondération déguisée, c'est-à-dire le refus n° 4 réintroduit par la porte de
derrière.

**Ne pas moyenner.** Additionner deux lectures opposées pour rendre un « plutôt favorable » détruit
l'information et rend un score agrégé, qui est le premier refus du produit.

**Ne pas masquer.** Retirer la lecture la plus faible parce qu'elle gêne est le geste le plus
tentant et le plus malhonnête.

## Ce qu'il pourrait faire, et c'est ce qui reste à trancher

**L'hypothèse à discuter : nommer le désaccord est une information, pas une panne.** *« Ces deux
constats pointent dans des directions opposées »* est une phrase utile à un preneur — elle lui dit
où sa propre visite du local vaudra plus que n'importe quel chiffre.

C'est cohérent avec ce que le produit fait déjà des trous : `docs/PERIMETRE.md` et le bloc « ce que
Compass ne sait pas ici » traitent une absence comme un argument plutôt que comme une honte. Un
désaccord est de la même famille.

## Les questions à trancher, et aucune n'est technique

1. **Qu'est-ce qu'un désaccord, mécaniquement ?** Deux lectures opposées n'ont aucune définition
   dans le code. Un désaccord déclaré à la main entre deux lectures est un arbitrage de plus ;
   un désaccord dérivé demande que chaque lecture porte une direction, ce qui est un champ nouveau
   et une décision de fond.
2. **Combien de désaccords avant que la page devienne illisible ?** Six constats et trois appuis
   font beaucoup de paires. Si tout se contredit un peu, nommer chaque paire noie le lecteur.
3. **Est-ce que le verdict change de forme quand il y a désaccord**, ou est-ce que le désaccord
   vit à côté de lui ?
4. **Est-ce que l'agent le reçoit ?** Si oui, sous quelle forme — la même question que `#181` a
   tranchée pour les motifs : une structure, pas une phrase.
5. **Est-ce que le dossier téléchargeable le porte ?** Un dossier qui tairait un désaccord serait
   moins vérifiable que la page.

## Fait quand

**Rien n'est « fait » ici tant que les cinq questions n'ont pas de réponse écrite.** Le livrable de
ce ticket, à ce stade, est une décision consignée — pas du code. Si la décision est oui, le ticket
sera réécrit avec ses critères ; si elle est non, il sera fermé avec sa raison.

**Ce que ça ne rattrape pas.** Même nommé, un désaccord ne dit pas laquelle des deux lectures est
juste. Il dit qu'il faut aller voir. C'est un déplacement honnête de la décision vers le preneur,
pas une réponse.

## Hors périmètre tant que la décision n'est pas prise

Pas de règle de priorité entre constats. Pas de moyenne. Pas de champ « direction » posé sur les
lectures : l'écrire avant la décision reviendrait à la prendre en silence.

Voir [`w6-mode-raison.md`](./w6-mode-raison.md), [`w6-appuis.md`](./w6-appuis.md),
[`w2-rythme.md`](./w2-rythme.md), et `docs/PLAN-ACTION-VACANCE.md` pour les refus n° 1 et n° 4.
