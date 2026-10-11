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

---

## Livré — 15 septembre 2026

**La fiche ne passe plus par Overpass pour répondre.** `fetchAddressContext` était un seul
`Promise.allSettled` tenant les sept appels ensemble ; il est coupé en deux — `fetchCorpusContext`
(six appels, le corpus) et l'instantané Overpass, chacun sa requête React Query. `composeContext`
assemble les deux, et il prend un troisième état que la fiche n'avait pas : `en_cours`. C'est la
direction 1 du ticket ; aucun budget n'a été ajouté.

`CONTEXT_BUDGET_MS` **n'a pas bougé** — 10 000 ms. Ce qu'il borne a changé : il ne borne plus la
réponse de la page, seulement la couche non porteuse. Aucun chiffre neuf n'est donc à tenir juste.

### Ce qui est démontré, et comment

Toutes les mesures : Chrome sans tête, build local servi en statique depuis le disque, adresse
`rue de Bretagne` (`/contexte/rue-de-bretagne-paris?lat=48.863100&lng=2.362100`), Supabase distant
réel. Le « avant » est `main` à `2dabf49`, bâti et mesuré **le même jour, dans la même minute, par
le même script** — pas un chiffre recopié.

**Le critère 1 tel qu'il est écrit ne prouvait rien, et c'est la première chose mesurée.** Il dit
« miroirs Overpass injoignables ». Coupés au résolveur — la recette de `docs/REPRISE-PIEGES.md` —
la résolution échoue en une milliseconde et **`main` rendait déjà son verdict en 480, 584 et
915 ms**, sans une ligne de ce ticket. Le défaut de production n'est pas un miroir *injoignable*,
c'est un miroir qui *pend* : c'est la distinction que `docs/REPRISE-PIEGES.md` porte depuis le
15 septembre, et le critère l'ignorait. La démonstration est donc faite sous la condition PLUS
DURE — les trois hôtes Overpass pointés sur un puits local qui accepte la connexion et ne répond
jamais, donc une poignée de main TLS qui n'aboutit pas.

| Miroirs qui PENDENT | verdict + les cinq constats du corpus à l'écran |
| --- | ---: |
| `main` (2dabf49), trois passages | **10 178 · 10 188 · 10 201 ms** |
| après, trois passages | **573 · 584 · 1 115 ms** |

Le « avant » recoupe la mesure de production du ticket — 10 976 ms — et les 10 901 ms relevés le
même jour sur `paris-compass.lovable.app` par `npm.cmd run page`.

1. **Critère 1 — moins de trois secondes : OUI, 573 à 1 115 ms.** Verdict composé, « Tissu
   commercial dense, passage soutenu, desserte ferrée moyenne, services marchands à pied
   moyennement présents. », et **les cinq constats du corpus portant leur chiffre** — 100, 81, 45,
   59, 58 sur 100. Miroirs coupés au résolveur plutôt que pendus, la même mesure donne **1 447 ms**.
2. **Critère 2 — `bruit routier` reste nommé : OUI, dans les trois états.** Pendant l'attente il
   est à l'écran avec son nom, sa provenance et « Mesure en cours — la source n'a pas encore
   répondu. » ; à l'expiration du budget, relevé à **10 153, 10 184 et 10 190 ms**, il passe à
   « n/d » et « source injoignable ». Il n'est jamais retiré de la page.
3. **Critère 3 — contre-preuve, miroirs debout : OUI.** Les miroirs publics ne répondent pas dans
   le budget (mesuré : le seul qui ait jamais répondu met 10 587 ms, et `overpass-api.de` refuse en
   0,2 s), donc la contre-preuve est jouée contre un **miroir local debout** — certificat
   auto-signé, les trois hôtes pointés dessus, réponse Overpass valide après 4 s. Verdict à
   **584 ms**, puis à **4 207 ms** le constat porte sa valeur, `Très faible`, et sa source,
   `OpenStreetMap via Overpass`. La phrase du verdict est identique avant et après : les axes
   porteurs ne lisent pas cette couche, et un test l'exige.
4. **Critère 4 — `npm.cmd run page` vert, et son nombre baisse : OUI.** Même bras, même adresse,
   même minute, miroirs réels : **avant 8 316 · 10 145 · 10 197 ms**, **après 788 · 547 · 805 ms**.
   PASS, sortie 0, dans les six cas. Contre la production, le même bras rend **PASS en 10 901 ms** —
   c'est le comportement d'avant ce ticket, puisque la production ne le porte pas encore.

### Ce que ça ne rattrape pas

- **Le corpus reste sur le chemin critique**, comme le ticket l'annonçait : les 573 à 1 115 ms
  ci-dessus sont ceux de Supabase. Un premier appel à froid a été mesuré à **2 974 ms** sur `main`
  et rien ici ne borne ce cas — ce ticket enlève une attente inutile, il n'assure pas celle qui reste.
- **Le miroir qui répond en 10 587 ms est toujours abandonné 587 ms trop tôt.** Le budget n'a pas
  bougé, donc ce constat-là est toujours perdu ; ce qui a changé est son prix — un constat non
  porteur, au lieu de neuf secondes de page muette pour tout le monde.
- **La mesure porte sur une adresse.** C'est la limite que `scripts/porte/page.ts` déclare déjà
  pour lui-même, et elle vaut ici pour la même raison.
- **Le miroir local n'est pas un miroir public.** Il démontre que la couche arrivée est affichée,
  jamais qu'`overpass-api.de` répondra un jour dans le budget.
