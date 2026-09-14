# [P1] w1-overpass-ordre — L'ordre des miroirs Overpass n'est mesuré par rien, et le seul qui répond est troisième

**ID** `w1-overpass-ordre` · **vague 1** · **P1**
**Dépend de** `w6-fiche-robuste`
**Sources** — *aucune source nouvelle : la santé de celles qu'on interroge déjà*

## Pourquoi

`OVERPASS_ENDPOINTS` (`src/services/opendata/overpass.ts`) est **une liste écrite à la main**, et
rien ne dit si elle est encore dans le bon ordre — aucun bras, aucun test, aucune sonde de
catalogue.

Mesuré le 13 septembre 2026 sur cinq adresses parisiennes, avec la requête réelle de la fiche :
le premier miroir rend **406 en 0,2 s**, le deuxième met **35 à 43 s** à expirer, et **le seul
qui répond 200 est le troisième**. Le tableau complet — les trois miroirs, les sept marches, les
délais adresse par adresse — est dans
[`#163`](https://github.com/IvandeMurard/paris-compass/issues/163), et il ne se recopie pas ici :
ce sont des mesures d'un jour depuis une seule adresse IP.

**Ce qui rend le ticket utile plutôt qu'anecdotique.** Depuis `w6-fiche-robuste` la fiche pose un
budget d'attente de dix secondes. Sous ce budget — sous **n'importe quel** budget d'échelle
humaine — le premier échoue en 0,2 s, le deuxième consomme tout le reste, et le troisième n'est
**jamais interrogé**. Monter le budget n'achèterait donc pas une réponse, seulement une attente
plus longue avant le même refus : un budget borne ce qu'on dépense, il ne réordonne pas ce qu'on
interroge.

**Et `w6-fiche-corpus` ne le fait pas disparaître, il le rétrécit.** La fiche cessera de dépendre
d'Overpass ; `/carte` continuera de l'interroger, avec la même liste et sans budget.

## Comment — trois directions, aucune imposée

1. **Réordonner la liste** — le moins cher et le plus périssable : juste le jour où on l'écrit,
   faux le mois suivant. Ce dépôt refuse ailleurs les listes tenues à la main.
2. **Dériver l'ordre d'une mesure** — une sonde par miroir, l'ordre venant de ce qu'elle observe.
   C'est « énumérer, pas lister » appliqué aux miroirs, et ça a un coût d'entretien réel.
3. **Cesser d'en dépendre là où c'est possible** — déjà fait pour la fiche par `w6-fiche-corpus`.

## Doctrine

**Une liste tenue à la main porte sa justification, ou elle se dérive.** C'est la règle que `#73`
a posée pour le catalogue et `#70` pour les cadences, appliquée à une liste qui y a échappé parce
qu'elle vit dans `src/` et non dans un fichier de configuration.

**Et le 406 du premier miroir n'est pas expliqué.** `docs/REPRISE-PIEGES.md` attribue un 406
Overpass à l'absence de `User-Agent` ; ici il persiste **avec** un `User-Agent` de navigateur et
sur une requête triviale. C'est donc autre chose — réputation d'IP, règle amont — et **personne
n'a mesuré le chemin navigateur et le chemin agent le même jour**. Conclure sur l'un vaudrait
pour l'autre est précisément ce que ce ticket ne doit pas faire.

## Fait quand

1. L'ordre des miroirs est **soit mesuré, soit justifié par écrit**, et la justification dit **ce
   qui la rendrait fausse**.
2. La mesure est refaite **des deux côtés le même jour** — chemin agent et chemin navigateur —
   parce que c'est le navigateur qui décide de l'expérience et l'agent qui décide de
   `verify:mcp`.
3. **Ce que la règle ne rattrape pas est écrit.** Au minimum : un miroir en bonne santé le matin
   et saturé l'après-midi reste invisible d'une sonde quotidienne, et `docs/REPRISE.md` en porte
   déjà la trace au 5 septembre.

## Hors périmètre

Pas de miroir privé, pas de cache côté base, et **pas de changement du budget de
`w6-fiche-robuste`** — le monter est exactement ce que la mesure ci-dessus dit inutile.

Voir [`#163`](https://github.com/IvandeMurard/paris-compass/issues/163) pour les mesures
complètes, [`w6-fiche-robuste.md`](./w6-fiche-robuste.md) et
[`w6-fiche-corpus.md`](./w6-fiche-corpus.md).
