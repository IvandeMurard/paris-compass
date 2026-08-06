# Carte en premier + version bilingue FR/EN

## 1. Remettre la carte au premier plan

Aujourd'hui la page d'accueil empile la carte et tout le contenu éditorial dans la même page, et sur la capture la zone carte apparaît vide/écrasée pendant que la présentation prend tout l'écran.

- La page d'accueil `/` devient uniquement l'application : en-tête, filtres, onglets Carte/Liste, recherche. Plus de bloc éditorial ni de pied de page éditorial en dessous.
- Le contenu de présentation actuel (H1, « Chercher par besoin », données publiques, guides, arrondissements, FAQ) est conservé tel quel et déplacé sur une page dédiée `/presentation`, construite avec la mise en page éditoriale existante et liée depuis l'en-tête et le pied de page.
- Le JSON-LD FAQ et la description longue suivent sur cette page ; la home garde son titre, sa description et le schéma WebApplication.
- Diagnostic carte : vérifier dans le navigateur pourquoi le conteneur Leaflet ne s'affiche pas (hauteur du conteneur, `invalidateSize` après montage dans un onglet) et corriger. Le rendu carte plein écran sera vérifié en aperçu avant de conclure.

## 2. Bilingue FR/EN avec sélecteur

- Ajout d'un contexte de langue avec deux locales, `fr` (par défaut) et `en`, mémorisées et exposées via des routes préfixées `/en/...` pour que les deux versions soient indexables. Le français reste sur les URLs actuelles.
- Un sélecteur FR/EN dans l'en-tête (et dans l'en-tête des pages éditoriales) bascule vers l'URL équivalente dans l'autre langue.
- Traduction complète de l'interface aujourd'hui mixte : sidebar et filtres, onglets « Map View / List View », recherche en langage naturel et ses suggestions, panneaux de la carte, cartes de résultats, menu utilisateur, pages Sign in / Sign up / Profil.
- Traduction des contenus éditoriaux : FAQ, guides, glossaire, arrondissements, sources, méthodologie, à propos, pied de page.
- SEO : balises `title`/`description` par langue, `lang` correct sur `<html>`, balises `hreflang` réciproques FR/EN, canonique auto-référente par langue, sitemap régénéré avec les deux arborescences.

## Détails techniques

- `src/providers/LocaleProvider.tsx` : locale dérivée du préfixe d'URL, helper `t()` et helper de bascule d'URL.
- `src/i18n/ui.ts` : dictionnaire des libellés d'interface, clés typées.
- Contenus : les fichiers de `src/content/` (`faq`, `guides`, `glossary`, `arrondissements`, `site`) passent à une forme `{ fr, en }` et les pages lisent la locale courante.
- `src/App.tsx` : chaque route existante est déclarée aussi sous `/en/*` avec les slugs anglais correspondants.
- `src/components/Seo.tsx` : ajout des `<link rel="alternate" hreflang>` et du `lang` de document.
- `scripts/generate-sitemap.ts` : génération des URLs des deux langues.
- `src/pages/Index.tsx` : suppression de `HomeContent` et `SiteFooter` ; nouvelle page `src/pages/Presentation.tsx` réutilisant `HomeContent` dans `PageLayout`.
