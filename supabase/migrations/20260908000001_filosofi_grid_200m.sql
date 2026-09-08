-- Filosofi carroyé 200 m — w2-filosofi (issue #18). PLAN-ACTION-VACANCE.md's "Filosofi carroyé
-- 200 m" moves from planifiée to ingérée, and the endpoint the catalogue left unpinned
-- ("Planifiée, aucun endpoint épinglé — même famille que Sirene sur data.gouv") is chosen here.
--
-- WHY THIS DATASET, ON data.gouv.fr, RESOLVED RATHER THAN PINNED — the endpoint choice the
-- ticket asked for first. Measured 8 September 2026: INSEE's own site (insee.fr/statistiques)
-- publishes the human-readable documentation but no stable machine endpoint; data.gouv.fr
-- carries the actual files. The dataset page
-- "revenus-pauvrete-et-niveau-de-vie-donnees-carroyees-2019-et-2021-dispositif-fichier-localise-social-et-fiscal-filosofi"
-- (licence `lov2`, Licence Ouverte 2.0) is the CURRENT one — an OLDER dataset page exists for
-- the 2015/2017 generations, which INSEE did not update in place but replaced with a new page,
-- the same failure mode #56 already measured on SIRENE. scripts/ingest/filosofi.ts therefore
-- reads the dataset's API resource list rather than a pinned file URL, exactly like
-- scripts/ingest/sirene.ts — "même famille que Sirene sur data.gouv" made concrete. If INSEE
-- repeats the replace-the-page move for the next generation, this dataset URL will start
-- answering 404 and the loader throws rather than silently keeping last quarter's page; it is
-- not designed to survive that, only to fail loudly when it happens.
--
-- TWO VINTAGES COEXIST ON ONE PAGE, AND THE LOADER PICKS THE NEWER ONE, ALWAYS — the
-- DIAGNOSTIC.md §45 lesson applied before it could repeat. The dataset currently publishes BOTH
-- `carreaux-200m-met-3035_2019.parquet` and `carreaux-200m-met-3035_2021.parquet` at once
-- (measured 8 September 2026). Unlike IDFM's four quarterly dataset PAGES (§45's actual defect:
-- a page id that rotates, so a pinned id freezes on an old edition while the loader moves on),
-- here the catalogue probe and the loader read the SAME dataset URL — they cannot diverge on
-- vintage the way IDFM's probe and loader did. scripts/ingest/filosofi.ts picks the resource
-- whose filename carries the HIGHEST year, never a hardcoded "2021": the day INSEE adds a 2023
-- parquet to this same page, the next reload picks it up on its own, and `source_as_of` (the
-- chosen year) becomes visible via `compass_source_freshness()` — a vintage that regresses
-- (2021 removed, only 2019 left) is therefore visible there too, not silent.
--
-- NO MEDIAN EXISTS AT THIS GRAIN, AND THE TICKET'S "FAIT QUAND" SAYS ONE DOES — read this
-- before trusting "deux médianes" anywhere else in this project's documentation.
-- docs/tickets/w2-filosofi.md's acceptance line asks for two grid cells "300 m apart" to "show
-- two medians". Measured 8 September 2026, against the parquet's own schema AND against
-- INSEE's own dictionary (documentation_donnees-carroyees_filosofi2019.pdf, "II.2 Les variables
-- présentes dans les fichiers"): the file carries exactly ONE income variable, `ind_snv`,
-- defined as "Somme des niveaux de vie winsorisés des individus" — a SUM, never a median, and no
-- other income field exists at 200 m, 1 km or "niveau naturel". INSEE does not publish a
-- per-cell median at all at this grain: a median needs an ordered distribution, which is a
-- larger disclosure risk at 11-household confidentiality thresholds than a sum, so the
-- dispositif was designed without one. What this migration and scripts/ingest/filosofi.ts
-- compute and expose is therefore `niveau_vie_somme_winsorisee_eur / individus` — an ESTIMATED
-- MEAN standard of living per person, winsorised at the department's 5th/95th percentile before
-- summation (INSEE's own precaution, not this project's) — at 200 m, which is what actually
-- separates two streets of the same IRIS (the ticket's real "pourquoi"), even though it is a
-- mean and not a median. The doctrine "pas une moyenne d'arrondissement" is honoured on the
-- axis it was written for — no arrondissement-wide average — but the number IS a mean, and
-- every column and comment below says so rather than call it a median it is not.
--
-- WHAT THIS FILE DOES NOT CARRY, AND WHY IT MATTERS: `i_est_200m`. INSEE's own documentation
-- (§I.5, §III) says 79 % of 200 m cells nationally fall under the 11-fiscal-household
-- confidentiality threshold and are IMPUTED — spread across a merged group of neighbouring
-- cells rather than measured directly — and that this must be read from an indicator column,
-- `i_est_200`, before trusting a cell's own figure. Measured 8 September 2026: this data.gouv.fr
-- parquet republish (a GeoParquet conversion, not INSEE's own CSV/shapefile distribution)
-- carries only the "variables communes aux trois grilles" from INSEE's dictionary
-- (idcar_200m, ind, men, men_pauv, ind_snv, and the age/housing breakdowns) and NONE of the
-- "variables complémentaires de la grille de 200 m" — no `i_est_200`, no `idcar_1km`, no
-- `lcog_geo`. A cell loaded here cannot be told apart, mechanically, from one whose figures are
-- imputed from a wider group. INSEE's own precaution reads: "en zone urbaine, du fait des
-- fortes densités, on peut considérer que les données sont fiables" — Paris is exactly that
-- case, which is why this is not treated as blocking — but it is a real gap against a real
-- documented risk, not a theoretical one, and DIAGNOSTIC.md records it rather than let it be
-- discovered again.
--
-- NOT EXERCISED AGAINST A DATABASE IN THIS SESSION. Unlike w2-idfm and w6-analyse, this
-- worktree carried no DATABASE_URL at all (an isolated worktree, no `.env.local`) — every prior
-- ticket that touched supabase/migrations/ could run its migration in a rolled-back transaction
-- against the hosted project before asking for review; this one could not. What WAS verified,
-- against the real remote parquet via DuckDB (scripts/tmp-filosofi-*.ts, not committed): the
-- dataset resolves, both vintages are visible, the Paris bbox filter returns a plausible count
-- (3 671 cells strictly inside a tight Paris envelope, 7 783 in the wider candidate envelope
-- scripts/ingest/filosofi.ts actually reads), the `bbox` struct column matches the cell's own
-- geometry envelope exactly (so the geometry/spatial DuckDB extension is not needed at all —
-- four numbers per cell are enough), and `ind_snv` is in euros, not thousands (a first cell:
-- ind 4 713,5, ind_snv 122 842 708,5 € → ~26 063 €/an per person, a plausible Paris figure).
-- This SQL was written by close analogy to `20260907000002_idfm_station_profile.sql`, itself
-- reviewed and corrected once (`20260907000003`) — the RLS-policy and geometry-finiteness
-- mistakes that migration made are folded in below from the start rather than repeated, but
-- the statements themselves have not been run. Ivan or a review pass with database access must
-- exercise this in a transaction before `supabase db push`, exactly the discipline #97 used.

create table public.filosofi_grid_200m (
  idcar_200m                       text primary key,  -- INSEE's own grid-cell identifier, e.g. CRS3035RES200mN2885600E3761400
  annee                            smallint not null, -- the vintage YEAR this load chose (highest available on the dataset page)
  geom                             extensions.geography(Polygon, 4326) not null,
  individus                        double precision not null, -- `ind`: population. Fractional values are real — imputation redistributes population proportionally across a merged group, never rounds it to a whole person.
  menages                          double precision not null, -- `men`
  menages_pauvres                  double precision,           -- `men_pauv`, possibly truncated by INSEE at 80% of `menages` per their own documentation — never used to derive a poverty rate here
  niveau_vie_somme_winsorisee_eur  double precision not null,  -- `ind_snv`: SUM, in euros, of every individual's winsorised standard of living. Never a median — see this migration's header.

  constraint filosofi_grid_200m_geom_fini
    check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)')
);

comment on table public.filosofi_grid_200m is
  'INSEE''s Filosofi 200 m income/population grid, restricted at ingestion to cells intersecting '
  'Paris (scripts/ingest/filosofi.ts). Licence Ouverte 2.0, read on the data.gouv.fr dataset '
  'page 8 September 2026. One vintage year loaded at a time, chosen as the HIGHEST year the '
  'dataset page publishes — see the migration header for why this cannot silently freeze on an '
  'old edition the way w2-idfm''s catalogue probe could. Carries no i_est_200 imputation flag: '
  'this data.gouv.fr republish omits it (migration header). No median exists in this dataset at '
  'any grid size — only a winsorised SUM of standard of living (ind_snv), from which a MEAN per '
  'person is computed at query time, never stored pre-divided so the numerator and denominator '
  'both stay inspectable.';

comment on column public.filosofi_grid_200m.niveau_vie_somme_winsorisee_eur is
  'Sum, in euros, of every individual''s standard of living in this cell, each winsorised '
  '(capped at the department''s own 5th/95th percentile — INSEE''s precaution, applied before '
  'this project ever sees the figure) — never an unwinsorised sum, and never a median: no '
  'median exists in this dataset at any grid size (migration header). Divide by `individus` to '
  'get an ESTIMATED MEAN per person; compass_premises_within does exactly that and names the '
  'result accordingly, never "médiane".';

create index filosofi_grid_200m_geom_idx on public.filosofi_grid_200m using gist (geom);

alter table public.filosofi_grid_200m enable row level security;

create policy "filosofi_grid_200m is publicly readable"
  on public.filosofi_grid_200m for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- Denormalised onto premise_location, the same discipline as chantier_perturbant,
-- terrasse_autorisation and nearest_idfm_station_id: a radius query never pays for a spatial
-- join to filosofi_grid_200m, and the attachment is recomputed wholesale at ingestion.
--
-- UNLIKE the nearest-station search (w2-idfm, no cutoff — every premise gets a distance because
-- there is no natural cutoff for "nearest station"), a Filosofi grid TILES the territory with
-- no gaps: the correct cell for a point is the one whose polygon COVERS it, which is exact,
-- never approximate. scripts/ingest/filosofi.ts's attach() prefers ST_Covers and falls back to
-- nearest-by-centroid only for a premise whose covering cell was trimmed at the Paris-quartier
-- boundary (a grid cell can straddle that boundary and get dropped on the far side) — see that
-- file's header for the measured extent of that fallback.
-- ---------------------------------------------------------------------------

alter table public.premise_location
  add column filosofi_idcar_200m text references public.filosofi_grid_200m(idcar_200m) on delete set null;

create index premise_location_filosofi_idx on public.premise_location (filosofi_idcar_200m)
  where filosofi_idcar_200m is not null;


-- ---------------------------------------------------------------------------
-- compass_premises_within gains five columns, the same treatment idfm_station_name and
-- idfm_station_distance_m got in 20260907000002: inline in the map's main radius query, because
-- five scalars per row is cheap, unlike IDFM's ~46-row hourly profile which earned its own
-- function. No withholding: Filosofi's Licence Ouverte 2.0 is fully open, tied to no BDCom
-- vintage, exactly like IDFM's ODbL and Licence Ouverte 2.0 above it — these five columns are
-- null only when a premise has no covering or nearest cell (not expected inside Paris, but
-- possible for a premise right at the edge of the loaded extent), never because of a licence.
--
-- Return-type change, so drop first (20260825000005, …008, …010 and 20260907000002 already
-- carry this lesson: `create or replace` cannot add a column).
-- ---------------------------------------------------------------------------

drop function if exists public.compass_premises_within(
  double precision, double precision, double precision, smallint, integer
);

create function public.compass_premises_within(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 800,
  p_vintage_year smallint         default 2023,
  p_limit        integer          default 500
)
returns table (
  location_id       bigint,
  ordre             integer,
  lat               double precision,
  lng               double precision,
  distance_m        double precision,
  address           text,
  arrondissement    smallint,
  quartier_name     text,
  street_segment_id bigint,
  activity_code     text,
  activity_label    text,
  activity_niv18    smallint,
  activity_group    text,
  is_vacant         boolean,
  size_band         smallint,
  size_label        text,
  situation_label   text,
  sign_name         text,
  plu_protected            boolean,
  plu_commerce_artisanat   boolean,
  plu_commerce_proximite   boolean,
  plu_commerce_culturel    boolean,
  chantier_exposed         boolean,
  chantier_distance_m      double precision,
  chantier_objet           text,
  chantier_description     text,
  chantier_date_debut      date,
  chantier_date_fin        date,
  chantier_statut_label    text,
  terrasse_status          text,
  terrasse_permanente      boolean,
  terrasse_estivale        boolean,
  terrasse_etalage         boolean,
  idfm_station_name        text,
  idfm_station_distance_m  double precision,
  filosofi_idcar_200m               text,
  filosofi_annee                    smallint,
  filosofi_individus                double precision,
  filosofi_menages                  double precision,
  filosofi_niveau_vie_moyen_estime_eur double precision,
  total_matched     bigint,
  withheld          boolean
)
language plpgsql volatile parallel unsafe security definer
set search_path = public, extensions
as $$
declare
  v_debut    timestamptz := clock_timestamp();
  v_rows     bigint;
  v_point    geography;
  v_vintage  smallint;
  v_withheld boolean;
  v_limit    integer;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id,
         -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
         not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_vintage, v_withheld
  from public.bdcom_vintage v
  where v.year = p_vintage_year;

  if v_vintage is null then
    raise exception 'unknown vintage year % (known: 2017, 2020, 2023)', p_vintage_year
      using errcode = '22023';
  end if;

  if v_withheld then
    perform public.compass_record_question(
      'rpc', 'compass_premises_within', 'retenue_licence',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises',
      (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer);
    return query select
      null::bigint, null::integer, null::double precision, null::double precision,
      null::double precision, null::text, null::smallint, null::text, null::bigint,
      null::text, null::text, null::smallint, null::text, null::boolean,
      null::smallint, null::text, null::text, null::text,
      null::boolean, null::boolean, null::boolean, null::boolean,
      null::boolean, null::double precision, null::text, null::text, null::date, null::date, null::text,
      null::text, null::boolean, null::boolean, null::boolean,
      null::text, null::double precision,
      null::text, null::smallint, null::double precision, null::double precision, null::double precision,
      null::bigint, true;
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;
  v_limit := greatest(coalesce(p_limit, 500), 1);

  return query
  -- The counted set. Two identities and a distance: no label is fetched here, because
  -- `total_matched` does not depend on one and the caller never sees the rows beyond `top`.
  with hit as (
    select l.id  as location_id,
           o.id  as observation_id,
           ST_Distance(l.geom, v_point) as distance_m
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    where ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  top as (
    select h.location_id, h.observation_id, h.distance_m
    from hit h
    -- Total order: distance ties are the rule here, not the exception. See the header.
    order by h.distance_m, h.location_id
    limit v_limit
  )
  select
    l.id                                              as location_id,
    l.ordre                                           as ordre,
    ST_Y(l.geom::geometry)                            as lat,
    ST_X(l.geom::geometry)                            as lng,
    t.distance_m                                      as distance_m,
    trim(concat_ws(' ', l.num::text, nullif(l.let, ''), l.typ_voie, l.lib_voie)) as address,
    l.arrondissement                                  as arrondissement,
    q.name                                            as quartier_name,
    l.street_segment_id                               as street_segment_id,
    o.activity_code                                   as activity_code,
    a.label                                           as activity_label,
    a.niv18                                           as activity_niv18,
    a.label_18                                        as activity_group,
    coalesce(a.is_vacant, false)                      as is_vacant,
    o.size_band                                       as size_band,
    sb.label                                          as size_label,
    st.label                                          as situation_label,
    o.sign_name                                       as sign_name,
    l.plu_protected                                   as plu_protected,
    l.plu_commerce_artisanat                          as plu_commerce_artisanat,
    l.plu_commerce_proximite                          as plu_commerce_proximite,
    l.plu_commerce_culturel                           as plu_commerce_culturel,
    l.chantier_exposed                                as chantier_exposed,
    l.chantier_distance_m                             as chantier_distance_m,
    c.objet                                           as chantier_objet,
    c.description                                     as chantier_description,
    c.date_debut                                      as chantier_date_debut,
    c.date_fin                                        as chantier_date_fin,
    c.statut_label                                    as chantier_statut_label,
    l.terrasse_status                                 as terrasse_status,
    l.terrasse_permanente                             as terrasse_permanente,
    l.terrasse_estivale                               as terrasse_estivale,
    l.terrasse_etalage                                as terrasse_etalage,
    ist.libelle                                       as idfm_station_name,
    l.idfm_station_distance_m                         as idfm_station_distance_m,
    fg.idcar_200m                                     as filosofi_idcar_200m,
    fg.annee                                          as filosofi_annee,
    fg.individus                                      as filosofi_individus,
    fg.menages                                        as filosofi_menages,
    (fg.niveau_vie_somme_winsorisee_eur / nullif(fg.individus, 0)) as filosofi_niveau_vie_moyen_estime_eur,
    (select count(*) from hit)                        as total_matched,
    false                                             as withheld
  from top t
  join public.premise_location    l  on l.id = t.location_id
  join public.premise_observation o  on o.id = t.observation_id
  left join public.bdcom_activity      a  on a.code = o.activity_code
  left join public.bdcom_size_band     sb on sb.code = o.size_band
  left join public.bdcom_situation     st on st.code = o.situation_code
  left join public.quartier            q  on q.id = l.quartier_id
  left join public.chantier_perturbant c  on c.id = l.nearest_chantier_id
  left join public.idfm_station        ist on ist.id_zdc = l.nearest_idfm_station_id
  left join public.filosofi_grid_200m  fg on fg.idcar_200m = l.filosofi_idcar_200m
  order by t.distance_m, t.location_id;

  -- Cette fonction n'a jamais porte de marqueur out_of_corpus : seule
  -- compass_scoring_context_within en a recu un (20260825000003). Un point hors des 80
  -- quartiers y rend donc zero ligne, indistinguable d'un rayon vide. Le journal, lui, les
  -- distingue : compass_record_question resout deja le quartier du point, donc il sait. La
  -- correction cote APPELANT reste ouverte — DIAGNOSTIC.md §36.
  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_premises_within',
    (case when v_rows = 0 then 'vide' else 'repondu' end)::public.question_outcome,
    p_lat, p_lng, p_radius_m, p_vintage_year, 'premises',
      (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer);
end;
$$;

comment on function public.compass_premises_within is
  'Premises within a radius at one vintage. `total_matched` is the count before '
  'the limit, so the interface can say "340 of 1 200" instead of implying it is '
  'showing everything — and it is counted over the joined set alone, never over '
  'the labels, which are fetched only for the rows the limit keeps (issue #62). '
  '`plu_protected` and its three components are a binary, '
  'mapped constraint (PLAN.md §2.4) — informational only, no regulatory value. '
  '`chantier_exposed` is a fait d''exposition (PLAN.md §5.1): true when a '
  'disruptive worksite sits within 40 m, dated by chantier_date_debut/fin, never a '
  'prediction of impact on turnover. `terrasse_status` is ''oui'' only when exactly '
  'one premise sits at the matched street+number — a shared address with several '
  'premises comes back ''inconnu'' rather than guessing which one holds the '
  'authorisation (PLAN-ACTION-VACANCE.md — w1-terrasses); an authorisation is never '
  'proof a terrace is installed today. `idfm_station_name` and `idfm_station_distance_m` '
  'name the nearest IDFM station regardless of distance (w2-idfm). `filosofi_idcar_200m` '
  'and `filosofi_annee` name the INSEE 200 m grid cell covering (or, at the loaded extent''s '
  'edge, nearest to) this premise and the vintage YEAR loaded — a number without either is '
  'exactly what Measured<T> forbids on the front end. `filosofi_niveau_vie_moyen_estime_eur` '
  'is an ESTIMATED MEAN standard of living per person in that cell, winsorised by INSEE at '
  'the department''s 5th/95th percentile — never a median: no median exists in this dataset '
  'at any grid size (w2-filosofi, issue #18; see the migration header of 20260908000001 for '
  'the measured evidence). Never a comfort score, never averaged up to the arrondissement — '
  'the whole point of the 200 m grid is that it does not agree with its neighbour. All facts '
  'from PLU, chantier, terrasse, idfm and filosofi are independent of the BDCom vintage or '
  'its licence. A vintage the caller may not receive comes back as a single row with '
  'withheld = true and every other column null — zero rows means the radius is genuinely '
  'empty, and the caller must not conflate the two.';


-- ---------------------------------------------------------------------------
-- Registered as a tenth ingestion source (#70's rule: a source insertion into ingestion_run
-- must carry a cadence, checked by scripts/porte/cadence.json and the `sources` a cron in
-- .github/workflows/ingestion.yml declares).
--
-- `triennial`, reused rather than a new enum value — no announced calendar exists to name the
-- way IDFM's own banner did ("semiannual"). INSEE's actual rhythm has been irregular in
-- practice (2015, 2017, then 2019-and-2021 together, each generation several years after the
-- income year it describes) and this reload is a VERIFICATION cadence, the same class as
-- BDCom, PLU and terrasses: it checks the dataset page still serves what this migration
-- describes, it does not promise a fresh millésime on any fixed schedule.
-- ---------------------------------------------------------------------------

insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('filosofi', 'Filosofi carroyé 200 m (INSEE, via data.gouv.fr)', 'triennial',
   'INSEE republie ce dispositif de façon irrégulière — 2015, 2017, puis 2019 et 2021 sur une '
   'même page, chaque génération publiée plusieurs années après l''année de revenu qu''elle '
   'décrit. Aucun calendrier annoncé à suivre, contrairement à IDFM (w2-idfm) : un '
   'rechargement vérifie que la page sert toujours ce que cette migration décrit, il ne '
   'rajeunit rien. NON CHARGÉ dans la foulée de cette migration — aucune base n''était '
   'joignable depuis cette session (voir l''en-tête de cette migration) ; à charger dès que '
   'la migration est posée, avant que le cron ci-dessous ne la recharge sans que personne '
   'n''ait vu le premier chargement.');
