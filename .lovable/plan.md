# Écran blanc en preview — diagnostic et correctifs

## Ce que les mesures disent (1er septembre 2026, 16:00–16:05 UTC)

- Chargée en navigateur headless sur `localhost:8080`, l'application **s'affiche entièrement** : en-tête, filtres, carte Leaflet avec tuiles et marqueurs, panneaux. Aucune erreur JS bloquante — uniquement des avertissements React « Function components cannot be given refs », qui sont du bruit et n'empêchent rien.
- Dans **ton** navigateur, React monte aussi : les journaux console remontent une pile qui va jusqu'à `MapView`, et les requêtes réseau partent depuis `…lovableproject.com`.
- Côté réseau depuis ton poste, deux comportements très différents :
  - `opendata.paris.fr`, `open-meteo.com`, `georisques.gouv.fr` répondent **200**.
  - **Tous** les miroirs Overpass (`overpass-api.de`, `overpass.kumi.systems`, `overpass.private.coffee`) échouent en `Failed to fetch`, en boucle, sur chaque tentative.

Donc l'application n'est pas « morte » : c'est la **surface carte** qui reste vide chez toi, et elle occupe la quasi-totalité de l'écran — d'où la perception d'écran blanc. La cause exacte du blocage Overpass (réseau d'entreprise, bloqueur de publicités, DNS) n'est pas encore établie côté navigateur et reste à confirmer.

Un deuxième facteur aggravant est visible dans le code, indépendamment du réseau : la feuille de style Leaflet est chargée depuis **unpkg.com** dans `index.html`, avec un attribut `integrity`. Si unpkg est injoignable ou si la vérification d'intégrité échoue, Leaflet perd tout son positionnement et la zone carte devient un rectangle **blanc** — exactement le symptôme décrit, sans aucune erreur JS.

## Ce que je propose de corriger

1. **Supprimer la dépendance CDN de Leaflet.** Importer `leaflet/dist/leaflet.css` depuis le paquet npm déjà installé, et retirer la balise `<link>` unpkg de `index.html`. La carte ne dépend plus d'un tiers pour son rendu.
2. **Rendre l'échec visible au lieu de blanc.** Quand toutes les tentatives Overpass échouent, afficher dans la zone carte un bandeau explicite (« données OpenStreetMap injoignables depuis ce réseau », avec le nom des hôtes concernés et un bouton Réessayer) plutôt qu'une surface vide. Même traitement pour la vue liste.
3. **Arrêter la boucle de réessais.** Les journaux montrent des relances répétées sur les trois miroirs. Borner le nombre de tentatives et espacer les relances, pour ne pas saturer l'onglet.
4. **Filet de sécurité global.** Ajouter une frontière d'erreur React au-dessus des routes, qui affiche un message lisible et un bouton de rechargement si un composant lève — aujourd'hui, un tel cas donnerait une page blanche muette.
5. **Vérification.** Après correction, contrôle en navigateur à ta taille d'écran (880×775) que l'en-tête, les filtres et soit la carte, soit le bandeau d'erreur, sont visibles.

## Ce que ça ne corrige pas

Si ton réseau bloque réellement Overpass et les tuiles OpenStreetMap, les correctifs 1 à 4 rendront la panne **lisible** et l'interface utilisable, mais ne rétabliront pas les données OSM. Le cas échéant, le chantier suivant serait de router ces appels via une fonction backend (le blocage porte alors sur ton navigateur, pas sur le serveur).

## Détails techniques

- `index.html` : retrait du `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/…">` et de son `integrity`.
- `src/main.tsx` (ou `src/components/MapView.tsx`) : `import 'leaflet/dist/leaflet.css'`.
- `src/services/opendata/overpass.ts` : plafonner les tentatives par miroir, remonter une erreur typée au lieu d'un tableau vide silencieux.
- `src/hooks/useOpenData.ts` / `useMapLayers.ts` : exposer `isError` et le message au composant appelant.
- `src/components/MapView.tsx` et `src/components/PropertyList.tsx` : état d'erreur affiché, bouton Réessayer branché sur `refetch`.
- `src/App.tsx` : nouveau composant `ErrorBoundary` enveloppant `AppRoutes`.
