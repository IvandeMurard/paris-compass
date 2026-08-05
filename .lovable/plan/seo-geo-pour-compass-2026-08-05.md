# SEO / GEO pour Compass

Aujourd'hui l'app est une carte plein écran sur `/`, sans texte indexable, avec les métadonnées par défaut du template (« Paris Property Compass », auteur « Lovable », image OG Lovable), pas de sitemap, pas de contenu FAQ. Pour Google comme pour les moteurs génératifs (ChatGPT, Perplexity, AI Overviews), il n'y a presque rien à lire.

Oui, il faut ajouter des pages éditoriales : un outil interactif ne se référence pas seul.

## 1. Fondations techniques

- Réécrire le `<head>` de `index.html` : titre et description réels en français, `og:*` et `twitter:*` cohérents, suppression de l'auteur et de l'image OG Lovable, `<html lang="fr">`, canonical.
- Ajouter `public/sitemap.xml` (généré par script avant dev/build) listant les pages publiques ; garder `/profile` hors sitemap.
- Compléter `public/robots.txt` (directive `Sitemap:`), autoriser explicitement les crawlers IA (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) — c'est le levier GEO de base.
- Ajouter `react-helmet-async` pour des titre/description/canonical/JSON-LD par route.
- JSON-LD : `Organization` + `WebSite` (sitewide), `SoftwareApplication` sur l'accueil, `FAQPage` sur la FAQ, `Article` sur les guides, `BreadcrumbList`.

## 2. Pages éditoriales à créer (en français)

- **`/` — page d'accueil repensée** : la carte reste, mais on ajoute au-dessus/en-dessous un bloc H1 + proposition de valeur, 3-4 blocs « contextualiser, environnement, recherche par besoin, transparence », et des liens vers les autres pages. Un seul H1.
- **`/a-propos` (ou section « Ambition »)** : le pourquoi du produit, la méthode de scoring, l'auteur (Ivan de Murard) — signal E-E-A-T.
- **`/faq`** : 12-15 questions réelles (« Comment trouver un local commercial vacant à Paris ? », « Qu'est-ce qu'un score de marchabilité ? », « D'où viennent les données ? », « Est-ce gratuit ? », « Quel loyer au m² dans le 10e ? »), balisées `FAQPage`. C'est le format le plus repris par les moteurs génératifs.
- **`/sources`** : version publique et indexable du panneau Sources (producteur, usage, licence, date). Page très citable par les LLM.
- **`/methodologie`** : formules et rayons utilisés pour chaque score (marchabilité, transports, bruit estimé, flux piéton), limites assumées. Contenu unique, impossible à copier ailleurs → fort avantage GEO.
- **`/guides/...`** : 3 à 5 guides de fond, ex. « Ouvrir un commerce dans le 11e : ce que disent les données », « Comment évaluer l'emplacement d'un local commercial », « Loyers commerciaux à Paris : comprendre les références ». Chaque guide renvoie vers la carte filtrée.

## 3. Pages programmatiques (phase suivante)

Générer des pages par arrondissement : `/paris/11e-arrondissement` — loyer de référence, densité de commerces, transports, parcs, nombre de locaux vacants détectés, plus un lien vers la carte centrée. 20 pages qui captent des requêtes longue traîne à intention locale, alimentées par les mêmes services open data déjà en place.

## 4. GEO (visibilité dans les moteurs IA)

- Réponses directes en tête de section (la phrase-réponse avant le développement) : c'est ce que les LLM extraient.
- Données chiffrées, sourcées et datées, avec attribution explicite (« source : Ville de Paris, encadrement des loyers, MAJ 2025 ») — les moteurs génératifs citent en priorité le contenu vérifiable.
- Tableaux et listes plutôt que longs paragraphes.
- Une page « glossaire » courte définissant marchabilité, flux piéton, EAQI, ODbL.
- Nommer le produit dans chaque page (« Compass ») pour l'associer à la requête « trouver un local commercial par son environnement ».

## 5. Contraintes à connaître

L'app est une SPA Vite sans rendu serveur : Google exécute le JS et verra les pages, mais les crawlers d'aperçu social et certains crawlers IA ne lisent que le `index.html` statique. Pour que chaque page ait ses propres métadonnées et son contenu visible sans JS, il faudrait passer au rendu serveur — l'app peut migrer vers le template TanStack Start ([ce que l'upgrade apporte](https://lovable.dev/blog/building-apps-using-tanstack-start)). Ce n'est pas bloquant pour démarrer.

## Détails techniques

- Nouveau layout `src/components/layout/PageLayout.tsx` (header + footer + nav + `<main>`) pour les pages éditoriales ; la carte garde son layout plein écran.
- `src/components/seo/Seo.tsx` : wrapper `<Helmet>` (title, description, canonical, og, JSON-LD).
- Contenu FAQ/guides en modules TypeScript sous `src/content/` (pas de CMS), typés, réutilisés pour le rendu et pour le JSON-LD.
- `scripts/generate-sitemap.ts` + hooks `predev`/`prebuild`.
- Pages arrondissement : route `/paris/:slug`, données statiques par arrondissement + appels open data existants.
- Base URL : `https://paris-compass.lovable.app`.

## Ordre proposé

1. Fondations techniques + head + sitemap + robots (rapide, gros gain).
2. Accueil éditorialisée, FAQ, Sources, Méthodologie, À propos.
3. Guides.
4. Pages par arrondissement.
