# [P1] w6-fiche-delai — La fiche attend onze secondes une couche qui ne décide rien

**ID** `w6-fiche-delai` · **vague 6** · **P1**
**Dépend de** `w6-amenites-corpus`
**Sources** — *aucune source nouvelle*

## Pourquoi

**Mesuré en production le 15 septembre 2026, rue de Bretagne :** la fiche rend son verdict en
**10 976 ms**. La session de `w6-amenites-corpus` a mesuré la même composition en **1 316 à
2 411 ms** miroirs coupés. L'écart est l'attente d'Overpass.

**Et Overpass n'est plus nécessaire au verdict.** Depuis `#169`, `VERDICT_AXES` donne les quatre
axes porteurs au corpus :

| Axe | Porteur | Couche |
| --- | :---: | --- |
| `density`, `footfall`, `rail`, `services` | **oui** | corpus |
| `alimentaire` | non | corpus |
| **`noise`** | **non** | **`roads` — Overpass** |

Une seule couche non porteuse tient donc la page neuf secondes. Le visiteur attend onze secondes
une donnée qui, par construction, **ne peut pas changer le verdict** : c'est écrit dans
`VERDICT_AXES` que son absence ne bloque pas une conclusion.

**C'est le seul défaut que l'utilisateur ressent.** Tout le reste de ce qui reste ouvert est
invisible pour lui.

## Comment

Le verdict est composable dès que les axes porteurs sont là. Deux directions, à trancher sur
pièce :

1. **Rendre dès les porteurs, compléter ensuite** — la page affiche son verdict et ses cinq
   constats, `bruit routier` arrivant quand il arrive, ou se déclarant absent à l'expiration.
2. **Donner à la couche non porteuse son propre budget**, plus court que celui du verdict.

La première est préférable : elle ne suppose aucun réglage et elle survit au prochain axe non
porteur. La seconde est un chiffre de plus à tenir juste.

**Ce qu'il ne faut pas faire** : retirer `noise`. Un constat absent doit rester nommé — c'est ce
que `w6-fiche-robuste` a construit, et une page plus rapide parce qu'elle en dit moins n'est pas
une page plus rapide.

## Doctrine

**Un budget d'attente se règle sur ce que la réponse exige, pas sur ce que la source met à
répondre.** `w6-fiche-robuste` l'a écrit pour le refus ; la même phrase vaut pour la composition.
Et l'absence garde sa règle : `noise` manquant s'affiche « source injoignable », jamais un vide.

## Fait quand

1. **Sur une adresse du corpus, miroirs Overpass injoignables, le verdict et les cinq constats
   du corpus sont à l'écran en moins de trois secondes** — mesuré, et le nombre écrit à la
   clôture avec sa méthode.
2. **`bruit routier` reste nommé** : il s'affiche, plus tard ou en « source injoignable », jamais
   retiré de la page.
3. **Contre-preuve** : miroirs debout, `bruit routier` finit par porter sa valeur et sa source.
4. `npm.cmd run page` reste au vert, et le nombre qu'il mesure baisse.

**Ce que ça ne rattrape pas.** Le corpus reste sur le chemin critique : si Supabase est lent, la
page l'est. Ce ticket enlève une attente inutile, il n'en crée pas d'assurance sur celle qui
reste.

## Hors périmètre

Pas de cache, pas de rendu serveur, pas de changement des axes ni des formules. Le seul sujet est
**quand** la page rend ce qu'elle a déjà.
