# Écran blanc sur l'URL publiée — cause et correctif

## Ce que la mesure confirme

Ton diagnostic est exact, et j'ai vérifié la cause côté dépôt :

- `.env` existe bien dans l'espace de travail et porte `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Mais `.gitignore` ligne 20 ignore `.env` (et `.env.*`), et `git ls-files` confirme qu'il n'est **pas suivi**.

Conséquence mécanique : le build de la preview tourne dans cet espace de travail, où `.env` est présent — il marche. Le build publié part du dépôt, où `.env` n'existe pas : Vite remplace les deux `import.meta.env.*` par `undefined`, et `createClient(undefined, undefined)` lève « supabaseUrl is required » à l'évaluation du module, avant tout rendu. D'où l'absence de `#root` et l'inefficacité des correctifs Leaflet, qui ne s'exécutent jamais.

## Correctif proposé

1. **Cesser d'ignorer `.env`.** Retirer la ligne `.env` de `.gitignore` (garder `.env.*` et `*.local` ignorés) et laisser Lovable versionner le fichier. Les trois valeurs sont l'URL du projet et la clé **publiable** — celle que le navigateur expose déjà dans chaque requête. Aucune n'est un secret ; la clé de service et le mot de passe de la base restent hors dépôt et hors code.

2. **Ne plus tomber en écran blanc si une variable manque.** Le client Supabase est généré et ne doit pas être modifié. J'ajoute donc en amont, dans `src/main.tsx`, une vérification de `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` : si l'une manque, on rend un message lisible dans `#root` (bilingue, court, nommant la variable absente) au lieu de laisser l'import lever et d'obtenir une page muette. Un défaut de configuration doit se lire, comme une source injoignable.

3. **Republier**, puis contrôler `https://paris-compass.lovable.app` en navigateur : présence de `#root`, montage de l'en-tête, et soit la carte, soit le bandeau OpenStreetMap.

## Réserve

La règle du projet est de ne pas mettre de clé en dur dans le dépôt public. Le point 1 versionne un fichier de configuration avec une clé publiable, pas un secret — c'est le fonctionnement standard d'un projet Vite + Lovable Cloud, et c'est la seule manière pour le build publié de connaître ces valeurs. Si tu préfères ne rien versionner, l'alternative est de garder l'app cassée en production ou de router tous les accès données par une fonction backend, ce qui est un autre chantier.

## Détails techniques

- `.gitignore` : suppression de la seule ligne `.env` ; `.env.*` et `!.env.example` inchangés.
- `src/main.tsx` : garde de configuration avant `createRoot(...).render(<App/>)`, sans importer le client Supabase.
- Aucune modification de `src/integrations/supabase/client.ts` (généré).
