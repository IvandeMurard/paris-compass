# Accueil plus lisible, plus moderne + page « Travail en cours »

## 1. Un accueil « carte en fond, accroche par-dessus »

La carte reste l'accueil, mais elle sert d'abord de décor vivant. Le bloc central doit faire comprendre en moins de 3 secondes ce que Compass fait et pour qui :

- **Promesse en une ligne** au-dessus de la barre de recherche : « Trouvez un local commercial à Paris en regardant autour, pas seulement dedans. »
- **Sous-promesse de deux lignes** qui nomme concrètement la valeur : des sources ouvertes (transports, écoles, passage piéton, bruit, qualité de l'air), des scores calculés pour chaque emplacement, et une carte qui les rend visibles.
- **Grande barre de recherche** avec trois exemples cliquables (« un local de 50 m² dans le 10e près d'un parc », « un bureau calme dans le 16e avec un bon air », « une boutique près d'une station de métro avec parking »).
- **Trois piliers de confiance** juste en dessous : nombre de sources ouvertes, arrondissements couverts, fréquence de mise à jour. Chacun avec un libellé court, pas un chiffre nu.
- **Bouton d'action secondaire** « Comment ça marche » qui amène sur `/presentation`, et un bouton « Explorer la carte » pour effacer le voile.
- Dès la première interaction (recherche lancée, exemple cliqué, déplacement de la carte, clic sur « Explorer la carte »), le voile et l'accroche s'effacent en fondu et l'outil complet apparaît. Un petit bouton permet de la faire revenir.

## 2. Alléger l'outil derrière

- Les filtres quittent la colonne toujours ouverte : un bouton « Filtres » ouvre un panneau, avec un compteur des filtres actifs et un bouton « Réinitialiser ». Les deux filtres les plus utilisés (arrondissement, surface) restent accessibles en barre haute.
- Les cinq curseurs « scores d'aménités minimum » sont repliés par défaut sous « Critères avancés ».
- Les panneaux qui flottent sur la carte (couches, indicateurs environnementaux) deviennent des cartes compactes, repliables, avec la même apparence.
- Bascule Carte / Liste en un seul commutateur discret plutôt qu'en gros onglets.
- En mobile : accroche plus courte, filtres en tiroir bas.

## 3. Refonte visuelle

- Palette vert forêt : `#1a3c2a`, `#2d5a3d`, `#5a8a5c`, `#a0c49d`, sur fond clair très neutre, appliquée comme jeu de couleurs global (pas de couleurs écrites au cas par cas).
- Typographie : titres en Space Grotesk, textes en DM Sans.
- Coins plus doux, ombres légères, plus d'air entre les blocs, transitions courtes sur les survols et l'apparition de l'accroche. Les animations respectent le réglage « animations réduites » du système.
- L'en-tête est resserré : logo + sous-titre, navigation regroupée, sélecteur FR/EN et compte à droite ; le crédit « Conçu par Ivan de Murard » passe en pied de page et dans l'accroche.

## 4. Onglet « Travail en cours »

Nouvelle page `/travaux` (`/en/progress`), ajoutée à la navigation :

- Liste des dernières évolutions fusionnées, lues automatiquement depuis le dépôt public GitHub, affichées comme : date, une phrase, et une étiquette de catégorie (Données, Carte, Fiabilité, Interface).
- Les titres techniques sont nettoyés à l'affichage (préfixes de ticket retirés, texte tronqué proprement) ; les entrées purement internes sont écartées.
- Un bloc « Prochainement » alimenté par les tickets ouverts.
- Si GitHub ne répond pas, un message court et un lien vers le dépôt, jamais une page vide.

## Détails techniques

- `src/pages/Index.tsx` : ajout d'un état « accroche visible » (persisté en `sessionStorage`) et d'un composant `HeroOverlay` en couche au-dessus de la carte ; la carte reste montée en une seule instance comme aujourd'hui.
- Nouveaux composants : `src/components/home/HeroOverlay.tsx`, `src/components/FiltersSheet.tsx` (réutilise `Sidebar`/`BasicFilters` dans un `Sheet` shadcn), `src/components/MapPanelCard.tsx`.
- Design system : jetons HSL revus dans `src/index.css` (`--primary`, `--secondary`, `--accent`, surfaces, `--radius`) et `tailwind.config.ts` ; suppression des couleurs codées en dur `#2B6CB0`/`customBg` au profit des jetons. Polices ajoutées dans `index.html` et `fontFamily` (`sans`, `display`).
- `src/pages/Progress.tsx` + `src/services/github/activity.ts` : appel non authentifié à l'API publique GitHub (`/repos/{owner}/{repo}/pulls?state=closed` et `issues?state=open`), via TanStack Query, `retry: false`, cache session comme les autres sources. Le couple owner/repo est déclaré dans `src/content/site.ts` — **il me faut son nom exact** (le dépôt distant n'est pas visible depuis ici).
- Traductions FR/EN ajoutées dans `src/i18n/ui.ts` ; routes déclarées dans `src/App.tsx` et `MAIN_NAV` ; sitemap régénéré.
- Aucune modification de `src/core/`, du scoring, ni des sources de données.
