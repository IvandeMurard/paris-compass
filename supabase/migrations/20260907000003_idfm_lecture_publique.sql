-- Ce que 20260907000002 a fait pour une table sur deux — revue de #97, le 7 septembre 2026.
--
-- POURQUOI UNE MIGRATION NEUVE ET NON UNE CORRECTION DE 20260907000002. Les deux fichiers
-- `20260907*` sont au ledger depuis le 7 septembre — `supabase_migrations.schema_migrations`
-- garde le TEXTE du jour où ils ont été posés. Les rouvrir, même pour une seule instruction,
-- ferait diverger le corps suivi par git de celui que la base a enregistré, pour toujours :
-- c'est exactement le geste que `#83` a mesuré deux fois le 25 août 2026, et la règle de
-- `CLAUDE.md` qui en est sortie. Deux instructions additives coûtent moins qu'une divergence
-- consignée à vie dans `corps-diverge` de `scripts/porte/ledger.json`.
--
-- CE QUE LA PORTE MESURAIT AVANT CE FICHIER : `npm.cmd run eval` sort en 1, quatre
-- défaillances — I23, I24 et I32 sur `compass_station_profile`, et I42 sur `idfm_station.geom`.
-- Les trois premières sont UNE seule cause, corrigée par le §1 ci-dessous ; la quatrième par
-- le §2.

-- ---------------------------------------------------------------------------
-- 1. `idfm_validation_profile` se lit publiquement, comme `idfm_station`
-- ---------------------------------------------------------------------------

-- 20260907000002 a activé RLS et posé une politique de lecture sur `idfm_station`, et n'a fait
-- ni l'un ni l'autre pour `idfm_validation_profile`. RLS y était pourtant active — le projet
-- l'active par défaut — donc la table tombait dans la branche (b) de la population
-- `restricted` que I23, I24 et I32 partagent : « RLS est active et AUCUNE politique SELECT
-- n'existe : la table est vide pour tout rôle non privilégié » (DIAGNOSTIC.md §37).
--
-- MESURÉ le 7 septembre 2026 sur dbefhvmyfmmhjeetdddu, `set local role anon` en transaction
-- annulée : `idfm_station` 258 lignes vues, `idfm_validation_profile` **0** sur les 29 489
-- qu'elle porte, `pg_policy` confirmant zéro politique. Le privilège SELECT de `anon` était
-- bien accordé : c'est RLS, pas le GRANT, qui vidait la table.
--
-- ET CE N'EST PAS QU'UN ROUGE DE BRAS. `compass_station_profile` est `security definer`, donc
-- le chemin de l'écran répondait correctement — 120 lignes à Châtelet. C'est l'appelant qui
-- lit la table EN DIRECT par PostgREST qui recevait zéro ligne, en silence, sans rien qui le
-- distingue d'un vide réel. La phrase de `CLAUDE.md` prise à l'envers : « une garde sur le
-- chemin de l'écran laisse passer l'agent qui appelle PostgREST en direct ». Les deux jeux
-- sont ouverts (ODbL et Licence Ouverte 2.0), donc il n'y a ici aucune retenue de licence à
-- exprimer — le prédicat est `true`, et c'est ce qui sort aussi la table de la branche (a).
--
-- `enable row level security` est réémis plutôt que supposé : il est idempotent, et le
-- supposer ferait reposer la politique sur un défaut de projet que rien dans ce dépôt ne
-- vérifie.
alter table public.idfm_validation_profile enable row level security;

create policy "idfm_validation_profile is publicly readable"
  on public.idfm_validation_profile for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. `idfm_station.geom` ne porte pas de coordonnée non finie
-- ---------------------------------------------------------------------------

-- Sur le patron de `20260905000006_geometrie_finie.sql` (#68), qui a posé la même contrainte
-- sur les huit colonnes `geography` que le schéma portait alors. `idfm_station.geom` est la
-- neuvième, ajoutée deux jours plus tard, et I42 existe précisément pour attraper la colonne
-- géographique SUIVANTE : elle l'a attrapée.
--
-- Le risque n'est pas théorique ici. `buildParisStations` construit `geom` par une MOYENNE des
-- coordonnées Lambert-93 de chaque zdaid d'une zdc (`scripts/ingest/idfm.ts`, `avg`) : une
-- seule coordonnée non finie dans le lot contaminerait la moyenne entière, et une zdc dont le
-- référentiel ne livrerait aucune coordonnée numérique produirait `0/0` = NaN. Le filtre
-- `zdaxepsg2154 == null` du chargeur écarte l'absence, jamais un NaN déjà numérique — même
-- lecture d'une absence comme une mesure que `#68` a mesurée sur l'APUR.
--
-- L'expression teste le WKT et non ST_X/ST_Y, pour la raison écrite dans 20260905000006 : en
-- Postgres `NaN = NaN` est VRAI, donc le test IEEE ne rend aucune ligne sur une table qui en
-- porte. `~*` attrape `NaN` comme `Infinity`, et aucun nom de type WKT ne contient « nan » ni
-- « inf ».
alter table public.idfm_station add constraint idfm_station_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');

-- ---------------------------------------------------------------------------
-- 3. Ce que `idfm_station_distance_m` ne dit pas — la conséquence de l'exclusion
-- ---------------------------------------------------------------------------

-- LE FAIT SALE EST LE PROFIL DE PORTE DE CLICHY, PAS SA POSITION, et le chargeur écarte les
-- deux. `aggregateProfiles` refuse la zdc 71545 parce que la source publie jusqu'à quatre
-- lignes pour un même (code, jour, tranche) sans discriminant — décision juste, et elle ne
-- porte que sur le RYTHME. Mais `scripts/ingest/idfm.ts` ne charge dans `idfm_station` que les
-- zdc qu'un profil nomme, donc la station disparaît aussi de la recherche du plus proche, et
-- ses voisins sont renvoyés vers une station plus lointaine.
--
-- MESURÉ le 7 septembre 2026, en transaction annulée : la zdc 71545 réinsérée avec le
-- centroïde que `buildParisStations` lui donnerait (4 zdaid, Lambert-93 x=649699,5
-- y=6866273,5, lus sur `zones-d-arrets` ce jour-là), **156 locaux** sur les 85 410 rattachés
-- reçoivent aujourd'hui une station qui n'est pas la plus proche, avec une surestimation de
-- distance allant jusqu'à **603 m**. Le pire cas : `10 AV PORTE DE CLICHY` se voit attribuer
-- Brochant, et `idfm_station_distance_m` annonce **877 m** quand la station écartée est à
-- **274 m**.
--
-- POURQUOI CE COMMENTAIRE ET PAS UN CORRECTIF. Charger la station sans son profil rendrait le
-- rattachement honnête, mais changerait la sémantique de `compass_station_profile` — dont le
-- commentaire dit aujourd'hui que zéro ligne signifie « aucune station à profil dans le
-- rayon » — et celle de `idfm_station_name`, qui nommerait une station muette. C'est une
-- décision de périmètre, pas une correction de revue : DIAGNOSTIC.md §44 la porte, ouverte.
-- Ce qui est corrigé ici est le SILENCE : la surestimation était mesurable et n'était écrite
-- nulle part qu'un appelant lise.
comment on column public.premise_location.idfm_station_distance_m is
  'Distance en metres a `nearest_idfm_station_id`, calculee a l''ingestion sur les stations '
  'CHARGEES — jamais sur toutes les stations parisiennes. Une station dont la source publie '
  'un profil indepartageable est ecartee du chargement en entier, position comprise '
  '(scripts/ingest/idfm.ts, aggregateProfiles), et ses voisins recoivent alors une station '
  'plus lointaine sans que cette colonne le dise. Mesure le 7 septembre 2026 sur la seule '
  'station concernee (zdc 71545, Porte de Clichy) : 156 locaux sur 85 410 portent une '
  'distance surestimee, jusqu''a 603 m de trop, au pire 877 m annonces pour 274 m reels. '
  'Cette colonne est donc une borne SUPERIEURE de la distance a une station reelle, jamais '
  'une distance a la station reellement la plus proche. DIAGNOSTIC.md §44.';
