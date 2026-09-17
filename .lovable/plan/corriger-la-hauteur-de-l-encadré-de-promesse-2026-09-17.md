# Corriger la hauteur de l’encadré de promesse

## Périmètre verrouillé

- Refonte visuelle uniquement.
- Ne modifier que `src/index.css` pour cette correction.
- Ne déplacer aucun bloc, ne supprimer aucun contenu, ne modifier aucune logique et n’ajouter aucune page.
- Conserver toutes les couleurs via les jetons HSL existants.
- Respecter `prefers-reduced-motion`.
- Ne toucher à aucun fichier métier, page, traduction, service ou script.

## Correction prévue

1. Cibler uniquement l’encadré de bienvenue déjà affiché au-dessus de la carte.
2. Sur les écrans peu hauts, réduire ses espacements verticaux et ses écarts internes sans changer l’ordre ni le contenu.
3. Borner sa hauteur à l’espace réellement disponible et permettre un défilement interne en dernier recours, afin que les actions restent toujours accessibles.
4. Ne modifier aucun composant partagé pour éviter tout effet visuel ailleurs dans l’application.
5. Vérifier l’affichage à la hauteur actuellement observée, puis sur un grand écran et un mobile, avec contrôle du mode de mouvement réduit.

## Synchronisation et retour arrière

La synchronisation GitHub, lorsqu’elle est connectée, reste bidirectionnelle et ne distingue pas les changements visuels des autres changements : elle synchronise les commits. Le dépôt local de Lovable utilise actuellement son relais interne, donc cette lecture seule ne permet pas de confirmer l’état du branchement GitHub lui-même.

Pour garantir un retour arrière uniquement visuel, cette intervention restera isolée à `src/index.css`. Revenir sur ce changement ne touchera alors ni aux données, ni aux calculs, ni aux pages, ni aux services.
