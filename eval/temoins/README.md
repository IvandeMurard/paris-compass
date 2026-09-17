# Témoins — des bundles servis, capturés parce qu'ils allaient disparaître

Ce dossier ne contient pas des fixtures inventées. Il contient **ce que la production servait
vraiment, un jour donné**, gardé parce que le cas ne se reproduit pas sur commande.

## `index-2026-09-17.html` et `Context-DazhfY1Z.js`

Capturés le **17 septembre 2026**, depuis `https://paris-compass.lovable.app`.

**Ce qu'ils démontrent** : une production en retard de deux fusions. Ni la correction de
`w6-mode-raison` (#204) ni `w2-rythme` (#208) n'y sont — les témoins `LA LECTURE`,
`forme de journ` et `Poissonni` rendent **0** dans `Context-DazhfY1Z.js`, vérifié le jour même.

**Pourquoi ils sont ici** : `w1-servi-contenu` (#217) élargit `npm.cmd run servi`, qui reste vert
sur cet état-là. Son critère central est que le bras élargi sorte **rouge** contre ce bundle et
**vert** contre un build de `main` du même jour. Dès qu'Ivan republie, ce cas réel disparaît —
d'où la capture, faite le jour où il existait encore.

**Ce qu'ils ne sont pas** : une baseline à comparer. Rien ici ne dit ce que la production
*devrait* servir. Ces fichiers ne valent que comme cas de test daté pour un bras qui doit
apprendre à voir cet état.
