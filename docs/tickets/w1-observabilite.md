# [P1] w1-observabilite — Classer les requêtes, jamais les gens : ce que le produit ne sait pas répondre et qu'on lui demande

**ID** `w1-observabilite` · **vague 1** · **P1**
**Dépend de** —
**Sources** — *aucune source nouvelle*

## Pourquoi

**Compass ne sait pas quelles questions il ne sait pas répondre.** Chaque axe qui revient `n/a`
est une demande à laquelle le corpus n'a pas répondu, et aucune trace n'en subsiste. La liste
des sources à brancher est donc classée par jugement — celui de `PLAN-ACTION-VACANCE.md`, écrit
d'avance — et jamais par ce que l'usage réclame réellement.

C'est aussi la moitié manquante du maintien en condition opérationnelle : quel outil MCP coûte,
lequel échoue, à quel rayon, contre quelle source. `verify:mcp` dit que les six outils
fonctionnent **au moment où on le lance**. Il ne dit rien de ce qu'ils font le reste du temps.

## La ligne à ne pas franchir, et elle est doctrinale

**Classer les requêtes, jamais les gens.** « Compte pour explorer » est un refus assumé
(`PLAN-ACTION-VACANCE.md`), `auth.users` portait 0 compte au 25 août, et `authenticated` n'est
pas un appelant privilégié depuis le 26. Profiler par utilisateur exigerait soit un compte, soit
un pistage — et le produit refuse déjà les données de flux propriétaires pour une raison
voisine.

**Ce qui est enregistré** : l'outil ou la fonction appelée, les paramètres qui décrivent la
*question* — rayon, millésime, métier, métrique — la latence, l'issue, et **quels axes sont
revenus `n/a` et pourquoi**.

**Ce qui ne l'est pas** : aucune identité, aucun compte, aucune adresse IP, aucun identifiant de
session qui permettrait de recoudre deux requêtes en un parcours. Ce n'est pas une précaution,
c'est la définition du ticket : un journal qui permettrait de reconstituer un parcours a changé
de nature.

**La coordonnée est une question, pas une personne** — mais c'est la donnée la plus proche de la
limite. À trancher explicitement dans la session : au tronçon, au quartier, ou brute. Le
quartier suffit à répondre « quels quartiers sont demandés et mal servis », et c'est le choix
que je recommande d'écrire avec sa raison.

## Comment

1. **Une table d'observabilité**, sur le patron de ce que le dépôt sait déjà faire — la table de
   fraîcheur qui alimente `compass_source_freshness()` en est l'exemple.

2. **L'écriture se fait là où la valeur est produite**, pas dans le front ni dans le MCP. Une
   garde sur le chemin de l'écran laisse passer l'agent qui appelle PostgREST en direct : c'est
   la leçon de `DIAGNOSTIC.md` §9 à §12, et elle s'applique identiquement ici.

3. **Une fonction de lecture** qui rend l'agrégat, jamais les lignes : quels axes reviennent
   `n/a` le plus souvent, quels rayons, quels métiers. Soumise à la même règle de retenue que
   ses voisines — `I23` la recensera d'office si elle traverse une table restreinte.

4. **Et la rétention.** Un journal sans date de purge devient un stock. Écrire la durée et la
   raison.

## Ce qu'il faut savoir avant de commencer

**Il n'y a pas de trafic aujourd'hui.** Ce ticket construit le tuyau ; il ne produira aucun
signal tant que personne n'utilise le produit. C'est assumé — le tuyau doit exister avant
l'usage, sinon les premières semaines d'usage sont perdues — mais **ne pas construire l'analyse
par-dessus** : tableaux de bord, seuils, classements attendront d'avoir de quoi les nourrir.
Livrer la collecte et l'agrégat, rien de plus.

## Doctrine

Un journal d'usage est une donnée comme une autre : il porte sa source, sa date, et ce qu'il ne
dit pas. Il ne devient pas un prévisionnel — « trois personnes ont demandé le 11ᵉ » n'est pas
« le 11ᵉ est demandé », et l'effectif s'affiche avec la fréquence.

Et il ne sert pas à personnaliser. Compass refuse le score unique et la pondération apprise en
secret ; savoir ce qu'on demande sert à **choisir la prochaine source**, pas à réordonner ce
qu'un visiteur voit.

## Fait quand

1. Une requête laisse une trace qui décrit **la question**, et aucune qui décrive le demandeur.
   Démontré : sur un échantillon de lignes, montrer qu'aucune combinaison ne permet de recoudre
   deux requêtes en un parcours.
2. Un axe revenu `n/a` est comptabilisé **avec sa raison** — retenue de licence, hors corpus,
   source injoignable ne sont pas la même chose et ne mènent pas à la même action.
3. La fonction de lecture rend un agrégat et jamais une ligne brute, et passe le recensement de
   `I23`/`I24`.
4. La rétention est écrite, avec sa raison.

**Dire ce que ça ne rattrape pas** : un axe jamais demandé parce que le produit ne le propose
pas ne laissera aucune trace. Le journal mesure la demande exprimée, pas la demande empêchée.

Voir la direction du 31 août dans `docs/REPRISE.md`, et `PLAN-ACTION-VACANCE.md` pour les refus
qui bornent ce ticket.
