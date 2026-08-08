-- BDCom reference tables: vintages, activity nomenclature, and the two coded
-- domains whose encoding changes between millesimes.

-- ---------------------------------------------------------------------------
-- Vintages
-- ---------------------------------------------------------------------------
-- `scope` and `licence` are not documentation, they are guards.
--
-- scope: the 2023 open layer publishes 60 845 *commerces*; 2017 and 2020 publish
-- ~83 000 *premises*, vacant ones included. Comparing raw counts across a scope
-- boundary reads as a 27% collapse of Parisian retail when it is a change in what
-- gets published. Every evolution query must filter to the common scope, and
-- carrying `scope` on the row is what lets a query be written wrongly *visibly*.
--
-- licence: 2023 is ODbL-1.0; 2017 and 2020 carry a custom licence whose terms
-- have not been read. One column per vintage, because they genuinely differ.

create type public.bdcom_scope as enum ('all_premises', 'retail_only');

create table public.bdcom_vintage (
  id            smallint primary key,
  year          smallint not null unique,
  scope         public.bdcom_scope not null,
  licence       text     not null,
  licence_note  text,
  source_url    text     not null,
  -- ISO-ish, as consumed by Measured<T>.asOf in src/core/provenance.ts.
  as_of         text     not null,
  -- What the service says it publishes, verified against the live layer.
  published_record_count integer,
  -- What the pipeline actually loaded, plus the bytes that produced it. A
  -- divergence between the two is a pipeline bug, not a source change, and
  -- keeping both columns is what makes that difference visible.
  file_sha256   text,
  record_count  integer,
  ingested_at   timestamptz
);

comment on table public.bdcom_vintage is
  'One row per BDCom survey. Feeds source/licence/asOf of Measured<T> and the '
  'list_sources MCP tool. Never hard-code a licence anywhere else.';

insert into public.bdcom_vintage
  (id, year, scope, licence, licence_note, source_url, as_of, published_record_count) values
  (2017, 2017, 'all_premises', 'custom',
   'Custom APUR licence, terms not yet read. Do not redistribute before checking.',
   'https://carto2.apur.org/apur/rest/services/OPENDATA/BDCOM_OD/MapServer/0', '2017', 84031),
  (2020, 2020, 'all_premises', 'custom',
   'Custom APUR licence, terms not yet read. Do not redistribute before checking.',
   'https://carto2.apur.org/apur/rest/services/OPENDATA/BDCOM_OD/MapServer/1', '2020', 83399),
  (2023, 2023, 'retail_only', 'ODbL-1.0',
   'Retail and commercial services only. Vacant premises (7 853 in 2017, 8 764 in '
   '2020) and non-commercial ground-floor premises are absent, so no 2023 vacancy '
   'rate is derivable. Vacancy is computable on 2017 and 2020 only.',
   'https://carto2.apur.org/apur/rest/services/BDCOM/bdcom2023/MapServer/0', '2023-06', 60845);


-- ---------------------------------------------------------------------------
-- Activity nomenclature
-- ---------------------------------------------------------------------------
-- Rows are loaded by the ingestion pipeline, not seeded here: 224 posts are data.
--
-- One trap, and it decides where the level-8 label comes from. In the published
-- nomenclature workbook (BDCOM_2023_OD.xlsx) seven of the eight level-8 codes
-- carry more than one label — code 3 alone carries six, including "Alimentaire",
-- "Hotel" and "Restauration". That column is unusable.
--
-- The codes themselves are sound: across the 60 845 rows of 2023,
-- code -> niv47 -> niv18 -> niv8 holds without a single contradiction. And the
-- OPENDATA service publishes its own level-8 labels, which are one-to-one and
-- consistent across 2017 and 2020. So the label is loaded from the service, never
-- from the workbook. Anything read out of that workbook's level-8 column is wrong.

create table public.bdcom_activity (
  code        text primary key,              -- 224-post code, e.g. 'CA103'
  label       text     not null,
  niv47       smallint not null,
  label_47    text     not null,
  niv18       smallint not null,
  label_18    text     not null,
  niv8        smallint not null,
  label_8     text     not null,             -- from the service, NOT the workbook
  niv2        smallint not null,
  label_2     text     not null,
  type_code   text     not null,             -- C, K, D, V, T, X, Y, Z, A, B, E, S, DP, DS, DK
  type_label  text     not null,
  is_vacant   boolean generated always as (type_code = 'V') stored,
  -- The subset published in the retail-only vintages. Level 8 codes 6 (Local
  -- vacant) and 7 (Autre local) are exactly what 2023 omits, which is why it has
  -- 60 845 rows against 83 399.
  --
  -- This is the column that makes a cross-vintage comparison honest. Restricted
  -- to it, the series reads 62 705 (2017) -> 61 541 (2020) -> 60 845 (2023):
  -- a slow erosion of about 3% over six years. Compared on raw counts instead,
  -- the same data appears to show Parisian retail collapsing by 27% — an artefact
  -- of what gets published. Making the common scope a column rather than a
  -- convention is what stops that query from being written by accident.
  in_retail_scope boolean generated always as (niv8 not in (6, 7)) stored
);

comment on column public.bdcom_activity.label_8 is
  'Level-8 label as published by the OPENDATA service, where the mapping is '
  'one-to-one: 1 Grand magasin, 2 Alimentaire, 3 Non Alimentaire, 4 Service '
  'commercial, 5 Restauration, 6 Local vacant, 7 Autre local, 8 Hotel. Do not '
  'source this from BDCOM_2023_OD.xlsx — that column is scrambled.';

comment on column public.bdcom_activity.is_vacant is
  'Derived from the premise type, not from a separate status column: in BDCom a '
  'vacant premise IS a post of the nomenclature (AA101 / AA102, type V). Keeps '
  'the vacancy rule in one place instead of scattered across queries.';

create index bdcom_activity_niv18_idx on public.bdcom_activity (niv18);
create index bdcom_activity_niv8_idx on public.bdcom_activity (niv8);
create index bdcom_activity_vacant_idx on public.bdcom_activity (is_vacant) where is_vacant;
create index bdcom_activity_retail_idx on public.bdcom_activity (in_retail_scope) where in_retail_scope;


-- ---------------------------------------------------------------------------
-- Coded domains that change encoding between millesimes
-- ---------------------------------------------------------------------------
-- 2017 and 2020 publish these as free text; 2023 publishes codes. Rather than
-- normalising in the pipeline (where the mapping would be invisible), both
-- forms live here: `label_source` is the exact 2017/2020 string, so ingestion
-- resolves it with a join and the correspondence is auditable as data.
--
-- Counts observed on 2020 / 2023 confirm the ordering is the same on both sides:
--   1  moins de 300 m²      79 880 / 57 565
--   2  de 300 a 1.000 m²     2 239 /  2 126
--   3  1.000 m² ou plus      1 280 /  1 154

create table public.bdcom_size_band (
  code         smallint primary key,
  label_source text not null unique,
  label        text not null,
  min_m2       integer,
  max_m2       integer
);

insert into public.bdcom_size_band (code, label_source, label, min_m2, max_m2) values
  (1, 'moins de 300 m²',   'Moins de 300 m²',     null,  300),
  (2, 'de 300 à 1.000 m²', 'De 300 à 1 000 m²',    300, 1000),
  (3, '1.000 m² ou plus',  '1 000 m² ou plus',    1000, null);


create table public.bdcom_situation (
  code         text primary key,
  label_source text not null unique,
  label        text not null
);

insert into public.bdcom_situation (code, label_source, label) values
  ('R',  'sur rue',                  'Sur rue'),
  ('A',  'angle de deux rues',       'Angle de deux rues'),
  ('CI', 'cour d''immeuble',         'Cour d''immeuble'),
  ('CC', 'concentration commerciale','Concentration commerciale');


alter table public.bdcom_vintage    enable row level security;
alter table public.bdcom_activity   enable row level security;
alter table public.bdcom_size_band  enable row level security;
alter table public.bdcom_situation  enable row level security;

create policy "bdcom_vintage is publicly readable"
  on public.bdcom_vintage for select to anon, authenticated using (true);
create policy "bdcom_activity is publicly readable"
  on public.bdcom_activity for select to anon, authenticated using (true);
create policy "bdcom_size_band is publicly readable"
  on public.bdcom_size_band for select to anon, authenticated using (true);
create policy "bdcom_situation is publicly readable"
  on public.bdcom_situation for select to anon, authenticated using (true);
