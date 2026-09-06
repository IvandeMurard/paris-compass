-- Une coordonnée absente cesse d'être une coordonnée — #68.
--
-- L'état mesuré le 5 septembre 2026 sur dbefhvmyfmmhjeetdddu, avant ce fichier :
-- quinze lignes de `premise_location` portent POINT(NaN NaN), `ordre` 98108 à
-- 98123 sans le 98117, toutes au 18e, toutes issues du millésime 2020.
--
-- D'OÙ ELLES VIENNENT. Pas d'un calcul : la source les livre ainsi. Le service
-- ArcGIS de l'APUR répond `{"x":"NaN","y":"NaN"}` pour ces quinze relevés — c'est
-- l'orthographe Esri d'une géométrie absente, et le même appel en `f=geojson`
-- répond `"coordinates":[]`. Vérifié directement sur le service le 5 septembre
-- 2026. Les cinq voies concernées — Cheminots, Lydia Becker, Eva Kotchever,
-- Pierre Mauroy, Léon Bronchart — sont les rues neuves de Chapelle
-- International : l'APUR a relevé les locaux avant d'avoir un point d'adresse à
-- leur donner. La source dit « je n'ai pas de point », correctement.
--
-- Ce que le chargeur en a fait est le défaut : `feature.geometry?.x ?? null` ne
-- voit pas la chaîne "NaN", Postgres la coule en `double precision` NaN, et le
-- garde-fou de la promotion — `where s.x is not null` — la lit comme une
-- coordonnée présente. Trois lectures d'affilée d'une absence comme une mesure.
-- Corrigé à l'entrée dans `scripts/ingest/lib/arcgis.ts` (`featurePoint`) et
-- `scripts/ingest/bdcom.ts` : c'est là qu'est le défaut, et ce fichier n'est que
-- le rattrapage de ce que ce chargeur-là aurait écrit.
--
-- LA DÉCISION : rendu avec son absence nommée, jamais exclu.
--
-- Trois issues étaient possibles — refuser la ligne à l'ingestion, rendre `geom`
-- nullable, ou garder ces locaux dans une table à part. Refuser la ligne serait
-- DIAGNOSTIC.md §9 et §11 dans l'autre sens : ces locaux EXISTENT, l'enquête les
-- a relevés, on connaît leur adresse, leur activité et leur millésime, et les
-- effacer fabriquerait une absence de local là où il n'y a qu'une absence de
-- point. Une table à part cache la même chose derrière une jointure que personne
-- n'écrira. `geom` nullable est la seule des trois où l'absence reste lisible :
-- `null` est le mot que le type porte déjà pour « on ne sait pas », et
-- `ST_DWithin(null, ...)` rend `null`, donc le comportement d'aujourd'hui — ces
-- locaux ne sortent d'aucune requête de rayon — cesse d'être un accident de la
-- forme du prédicat pour devenir la règle du schéma.
--
-- Le schéma répondait d'ailleurs déjà à cette question ailleurs :
-- `bodacc_establishment.geom` est nullable, parce qu'un établissement BODACC sans
-- point est gardé sans point. `premise_location` est mise en accord avec sa
-- voisine, elle n'invente pas une doctrine.
--
-- ET L'ABSENCE NE L'EMPORTE PAS SUR UNE MESURE. Sept des quinze locaux ont un
-- point dans le millésime 2023, fini, à l'adresse appariée, qui dormait en
-- staging : la règle « le point canonique vient de 2020 » n'avait pas de branche
-- pour « 2020 n'en a pas ». Elle en a une maintenant (`GEOM_WINS` dans
-- `bdcom.ts`), et ces sept-là reçoivent leur point de 2023 avec
-- `geom_vintage_id = 2023` qui le dit. Ce n'est pas une décision nouvelle sur le
-- millésime à croire : le commentaire de 20260808000004 justifie 2020 par la
-- COUVERTURE — 2023 est retail-only — jamais par la précision.
--
-- CE QUE CE FICHIER NE FAIT PAS SURVIVRE. La correction de données ci-dessous ne
-- survit pas à un rechargement de BDCom : un `update` est défait par le prochain
-- `bdcom.ts`. C'est le chargeur corrigé qui la fait tenir, et la contrainte
-- ci-dessous qui rend la question sans objet — un rechargement qui réintroduirait
-- un NaN ÉCHOUERAIT bruyamment au lieu de réécrire les quinze lignes en silence.
-- C'est toute la différence entre réparer une donnée et poser une règle
-- (DIAGNOSTIC.md §20).

-- ---------------------------------------------------------------------------
-- 1. `geom` peut être absente, et `geom_vintage_id` avec elle
-- ---------------------------------------------------------------------------

-- `geom_vintage_id` porte « quel millésime a fourni ce point ». Le laisser à 2020
-- sur une ligne sans point ferait dire au schéma que 2020 en a fourni un. Les
-- deux colonnes tombent ensemble ou pas du tout, et la contrainte le dit.
alter table public.premise_location alter column geom            drop not null;
alter table public.premise_location alter column geom_vintage_id drop not null;

alter table public.premise_location
  add constraint premise_location_geom_vintage_apparie
  check ((geom is null) = (geom_vintage_id is null));

comment on column public.premise_location.geom is
  'Point du local, ou null quand aucun millesime charge n''en fournit un (#68). '
  'Null signifie « la source n''a pas donne de coordonnee », jamais « ce local '
  'n''est nulle part » : le local existe, son adresse et ses releves sont la. '
  'Une geometrie non finie est refusee par premise_location_geom_fini ; une '
  'absence ne s''ecrit jamais autrement que par null.';

-- ---------------------------------------------------------------------------
-- 2. Rattrapage des quinze lignes, à l'identique de ce que le chargeur corrigé
--    écrirait
-- ---------------------------------------------------------------------------

-- Vide sur une base neuve : les migrations tournent avant l'ingestion, donc ni
-- les quinze lignes ni le staging n'existent, et tout ce bloc est un no-op.
create temp table _geom_nan as
select id from public.premise_location
 where geom is not null
   and extensions.ST_AsText(geom) like '%NaN%';

-- (a) Le point d'un autre millésime, quand il y en a un.
--
-- L'appariement passe par `premise_observation` et non par une réécriture de
-- l'expression d'adresse : le relevé 2023 de ce local EST la preuve que le
-- pipeline a apparié cette ligne de staging à cette localisation, identifiant et
-- adresse compris (docs/BDCOM.md §5). Recopier `address_key` ici aurait fait une
-- troisième expression à tenir en phase.
update public.premise_location l
   set geom = extensions.ST_Transform(
                extensions.ST_SetSRID(extensions.ST_MakePoint(s.x, s.y), 2154),
                4326)::extensions.geography,
       geom_vintage_id = 2023
  from public.premise_observation o
  join public.stg_bdcom_2023 s on s.c_ord = o.source_ordre
 where o.location_id = l.id
   and o.vintage_id = 2023
   and s.x is not null
   and l.id in (select id from _geom_nan);

-- (b) Le reste : l'absence, écrite comme une absence.
update public.premise_location
   set geom = null, geom_vintage_id = null
 where id in (select id from _geom_nan)
   and geom is not null
   and extensions.ST_AsText(geom) like '%NaN%';

-- (c) Les rattachements fondés sur ces points-là sont retirés, tous.
--
-- Ceux des sept qui gardent un point sont recalculés juste après ; ceux des huit
-- qui n'en ont pas ne peuvent pas l'être. Dix des quinze portaient un
-- `street_segment_id` choisi par un `order by l.geom <-> s.geom` dont la distance
-- valait NaN — sept d'entre eux le même tronçon, sur les six de la rue des
-- Cheminots. Ce n'est pas la proximité qui avait choisi : la même sous-requête
-- lancée sur une géométrie NULL rend ce même tronçon. C'est le seul endroit où
-- ces quinze lignes ont déjà produit une réponse fausse, et il n'est pas dans une
-- requête de rayon.
update public.premise_location
   set quartier_id = null, street_segment_id = null, street_match = null
 where id in (select id from _geom_nan);

-- (d) Rattachement des sept, avec les expressions de `scripts/ingest/geography.ts`.
--
-- Duplication assumée et bornée à ces lignes-là, comme `ADDRESS_KEY` l'est dans
-- `bdcom.ts` : l'autorité reste `npx.cmd tsx scripts/ingest/geography.ts`, qui
-- rattache la population entière. Ce bloc met la base dans l'état où ce script la
-- mettrait, pour que la mesure prise aujourd'hui soit celle d'après rechargement.
update public.premise_location l
   set quartier_id = q.id
  from public.quartier q
 where l.id in (select id from _geom_nan)
   and l.geom is not null
   and extensions.ST_Intersects(l.geom, q.geom);

update public.premise_location l
   set street_segment_id = (
         select s.id from public.street_segment s
          where s.street_key = l.street_key
          order by l.geom <-> s.geom
          limit 1
       ),
       street_match = 'name'
 where l.id in (select id from _geom_nan)
   and l.geom is not null
   and l.street_key is not null
   and exists (select 1 from public.street_segment s where s.street_key = l.street_key);

update public.premise_location l
   set street_segment_id = (
         select s.id from public.street_segment s
          where extensions.ST_DWithin(l.geom, s.geom, 40)
          order by l.geom <-> s.geom
          limit 1
       ),
       street_match = 'spatial'
 where l.id in (select id from _geom_nan)
   and l.geom is not null
   and l.street_segment_id is null
   and exists (
     select 1 from public.street_segment s where extensions.ST_DWithin(l.geom, s.geom, 40)
   );

drop table _geom_nan;

-- ---------------------------------------------------------------------------
-- 3. La règle : aucune colonne géographique ne porte de coordonnée non finie
-- ---------------------------------------------------------------------------

-- Une contrainte par colonne `geography` du schéma — les huit du catalogue au
-- 5 septembre 2026 — et non la seule qui portait le défaut. C'est la leçon de
-- §20 : un correctif qui ne vise que les lignes fautives laisse la seizième
-- ligne et la table suivante libres de recommencer. `I42` vérifie chaque matin
-- que cette liste n'a pas pris de retard sur le catalogue.
--
-- L'expression teste le WKT plutôt que ST_X/ST_Y : elle vaut pour un point comme
-- pour une ligne ou un polygone, où le NaN peut être sur n'importe quel sommet,
-- et `~*` attrape aussi bien `NaN` que `Infinity`. Le piège qu'elle évite est
-- écrit dans docs/REPRISE-PIEGES.md : en Postgres `NaN = NaN` est VRAI, donc le
-- test IEEE `not (ST_X(g) = ST_X(g))` rend zéro ligne sur une table qui en porte
-- quinze. Aucun nom de type WKT ne contient « nan » ni « inf ».
--
-- ST_AsText est IMMUTABLE — relevé dans `pg_proc` le 5 septembre 2026 —, sans
-- quoi une contrainte ne pourrait pas la porter.

alter table public.bodacc_establishment  add constraint bodacc_establishment_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.chantier_perturbant   add constraint chantier_perturbant_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.plu_linear_protection add constraint plu_linear_protection_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.premise_location      add constraint premise_location_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.quartier              add constraint quartier_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.sirene_establishment  add constraint sirene_establishment_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.street_segment        add constraint street_segment_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
alter table public.terrasse_autorisation add constraint terrasse_autorisation_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');
