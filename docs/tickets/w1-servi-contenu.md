# [P1] w1-servi-contenu — Le bras qui doit voir les fusions en soute ne regarde qu'un fichier sur cinq

**ID** `w1-servi-contenu` · **vague 1** · **P1**
**Dépend de** — *rien*
**Sources** — *aucune : ce que le dépôt déclare, contre ce que le site sert*

> **Demandé par Ivan le 17 septembre 2026**, après la **septième** fusion restée en soute.

## Pourquoi

`npm.cmd run servi` existe pour dire qu'une fusion n'est pas arrivée en production. Il l'a déjà
fait — `#142`, le 13 septembre, a vu quatre routes rendre zéro le matin et être servies l'après-midi.

**Mais il reste vert pendant qu'une livraison dort.** Aujourd'hui 17 septembre, la production sert
`index-BBCkdSb9.js`, **le même bundle qu'avant `#204`** : ni la correction du bruit ni `w2-rythme`
(#208) n'y sont, et les trois témoins de `ContextRythme` rendent 0 dans le `Context-DazhfY1Z.js`
servi. `servi`, lui, ne dit rien.

**Ce n'est pas une panne du bras : c'est sa population.** Son en-tête le déclare déjà —
*« It only knows what `src/App.tsx` and `src/i18n/ui.ts` declare »*. Un bloc neuf sur une page
existante n'ajoute ni route ni libellé de `UI`, donc il est invisible. Or c'est exactement la
forme qu'ont pris les sept dernières livraisons.

## Ce qui a été mesuré le 17 septembre 2026

Approximation par `grep -oE "'[^']{12,}'" <fichier> | wc -l` — **des littéraux, pas des chaînes
affichées** : la vraie population se dérive des tables, et ce comptage sert à dimensionner, pas à
être recopié.

| Module | Littéraux de 12 caractères ou plus | Dans la population de `servi` |
| --- | --- | --- |
| `src/i18n/ui.ts` | ~~288~~ **360**, remesuré le 17 septembre 2026 | **oui** |
| `src/i18n/modeText.ts` | 112 | non |
| `src/i18n/contextText.ts` | 101 | non |
| `src/core/verdict.ts` | 62 | non |
| `src/i18n/rythmeText.ts` | 32 | non |

**Environ 307 chaînes affichées hors de la population, contre 288 dedans.** Il y a plus de texte
servi au visiteur en dehors du champ du bras qu'à l'intérieur.

## Ce que le ticket ne doit pas faire

**Ne pas tenir une liste de fichiers.** Écrire « et aussi `modeText.ts`, `rythmeText.ts` » créerait
la sixième population tenue à la main, et le sixième oubli. `#152` a déjà tranché : la population
se **dérive**. La question du ticket est *de quoi*, pas *de quels fichiers*.

**Ne pas baisser `LONGUEUR_MINIMALE`.** Les 12 caractères sont un nombre mesuré : « Map » apparaît
91 fois dans le bundle servi, « Data » 92. Descendre échangerait un manque contre un faux rouge,
et **un faux rouge est celui qu'une session éteint**.

**Ne pas élargir au point de rougir sur une republication normale.** Un bras qui rougit souvent ne
sera plus lu, ce qui est pire que l'état actuel.

## La contre-preuve est disponible AUJOURD'HUI, et elle ne le sera plus après

La production est en retard de deux fusions **en ce moment**. C'est un cas réel, daté, non
fabriqué : le bras élargi **doit** sortir en rouge contre `index-BBCkdSb9.js`, et l'actuel sort
vert.

**Dès qu'Ivan republie, ce cas disparaît.** La session doit donc commencer par **capturer le
bundle servi aujourd'hui** — l'enregistrer comme témoin de test — avant toute autre chose. Un
élargissement qui ne rattrape pas ce cas-là n'a rien élargi.

## Fait quand

1. **La population est dérivée d'une règle, pas d'une liste de fichiers**, et la règle est écrite :
   ce qui la fait entrer, ce qui l'en exclut.
2. **Le bras sort en ROUGE contre le bundle du 17 septembre 2026**, capturé comme témoin, et en
   **vert** contre un build de `main` du même jour. Les deux sens, pas un seul.
3. **Il ne rougit pas sur une production à jour** — démontré, pas supposé.
4. **`LONGUEUR_MINIMALE` est inchangé**, ou son changement porte son propre comptage.
5. **Le bras dit ce qu'il ne rattrape pas**, en le remesurant : un correctif de logique, un
   changement de style et une chaîne écrite en dur hors des tables lui resteront invisibles.
   Il ne doit pas laisser croire qu'il couvre une livraison entière.
6. **Aucun seuil n'est monté pour faire passer quoi que ce soit.** La règle du dépôt tient : un
   rouge se corrige dans le bras, jamais dans le rapport.

**Ce que ça ne rattrape pas.** Même élargi, ce bras ne verra jamais une livraison qui ne laisse
aucun littéral — un correctif de logique, une optimisation, un style. **Et il ne dira jamais
POURQUOI** un déploiement n'a pas eu lieu : le déploiement appartient à Lovable, et le dépôt n'en
voit que le résultat. Le tenir pour un contrôle de livraison complet serait remplacer un angle mort
par une fausse assurance.

## Hors périmètre

Pas de déclenchement de déploiement. Pas de changement de `src/i18n/ui.ts` pour y rapatrier les
autres tables — ce serait déplacer le problème dans un fichier que sa taille rend ingérable.
Pas de nouvelle route, pas de nouveau libellé pour se rendre visible.

Voir `scripts/porte/servi.ts` pour l'en-tête qui déclare déjà cette limite, et
`DIAGNOSTIC.md` pour ce que `#142` et `#152` ont mesuré.

---

## Ce que la session du 17 septembre 2026 a mesuré contre ce ticket

Écrit par `w1-servi-contenu` en le livrant. Les chiffres du ticket ont été rédigés sans accès en
lecture au dépôt ; voici ceux qui ont tenu et ceux qui n'ont pas tenu.

**Ce qui a tenu.** `modeText.ts` 112, `contextText.ts` 101, `verdict.ts` 62, `rythmeText.ts` 32 —
les quatre comptes au `grep -oE "'[^']{12,}'"` sont exacts. Le diagnostic aussi : la population
du bras laissait dehors la prose qu'un bloc neuf apporte, et c'est la forme qu'ont prise les
dernières livraisons.

**Ce qui n'a pas tenu, et qu'il faut lire avant de citer ce ticket.**

1. **`src/i18n/ui.ts` porte 360 littéraux, pas 288** — corrigé dans le tableau ci-dessus. Le
   rapport n'est donc pas « 307 dehors contre 288 dedans » mais 307 contre 360. La conclusion ne
   change pas de sens, sa force si.
2. **Le bundle servi n'est pas `index-BBCkdSb9.js`, mais `index-DAmk8dIZ.js`**, et il n'existe
   aucun `Context-DazhfY1Z.js` en production : la production ne sert **aucun** morceau `Context`.
3. **« L'actuel sort vert » est faux.** Le bras d'avant élargissement sortait déjà en **1**
   contre cette production, avec 27 jetons absents. La contre-preuve n'est donc pas
   « vert contre rouge » mais « 27 jetons contre 358 » — et surtout, le bras d'avant ne nommait
   aucun des modules de prose restés en soute.
4. **La cause est plus grave que le retard annoncé.** La production sert un bundle **antérieur à
   `w6-contexte` (#119)** : ni `/carte` ni `/contexte/:slug` n'y sont déclarés, et la fiche rend
   une 404. `DIAGNOSTIC.md` §60, recoupé par `npm.cmd run page`.

**Un défaut trouvé en route, qui commandait la règle** : `src/i18n/survivalText.ts` n'est importé
par personne, et sa prose n'est dans aucun bundle. Sans le filtre d'atteignabilité, le bras
élargi serait sorti rouge dès son premier matin sur du texte que le produit ne rend pas.
`DIAGNOSTIC.md` §58.

**Et un défaut de mesure dans le bras lui-même** : il ne suivait les morceaux que sur un niveau,
donc il lisait 611 440 des 1 247 018 octets d'un build. `DIAGNOSTIC.md` §59.
