-- Correction to 20260808000003, forced by checking coverage before writing the
-- loader instead of assuming it.
--
-- Two things were wrong, both because the earlier design leaned on the published
-- nomenclature workbook. The pipeline now reads the APUR services only — one
-- source family, no binary artefact to keep in the repository, and every gap
-- visible instead of quietly filled.

-- ---------------------------------------------------------------------------
-- 1. Vacancy is a level-8 grouping, not a premise type
-- ---------------------------------------------------------------------------
-- `is_vacant` was derived from type_code = 'V'. The premise type is only
-- resolvable for codes that appear in the 2023 layer, and vacant premises are
-- precisely what that layer omits — so the flag would have been false for every
-- vacant premise in 2017 and 2020, silently, with no error anywhere.
--
-- Level 8 code 6 is "Local vacant", it is published on all three vintages
-- (`niv8` in 2023, `REGROUPEMENT_8_POSTES` in 2017/2020), and it is the
-- definition the APUR uses for its own published vacancy rates. It also matches
-- how `in_retail_scope` is already computed, so both flags now read the same
-- column and cannot drift apart.
alter table public.bdcom_activity drop column is_vacant;
alter table public.bdcom_activity
  add column is_vacant boolean generated always as (niv8 = 6) stored;

comment on column public.bdcom_activity.is_vacant is
  'Level-8 grouping 6. Derived from niv8 rather than the premise type: the type '
  'is unresolvable for exactly the codes the 2023 layer omits, which are the '
  'vacant ones. Same source column as in_retail_scope, so the two cannot drift.';

-- ---------------------------------------------------------------------------
-- 2. Intermediate levels are genuinely absent for some codes
-- ---------------------------------------------------------------------------
-- Across 2017 and 2020, 221 distinct activity codes are in use once casing is
-- normalised — the source mixes `AF102` with `af102` and `AA101` with `aa101`,
-- which makes 228 apparent codes out of 221 real ones. Twenty-eight of them
-- never appear in 2023, so their level-47, level-18 and premise-type values
-- cannot be read from the 2023 data or its domains, and one of them (`CA305`) is
-- documented in no published source at all.
--
-- Three ways out. Drop the premises carrying those codes — that deletes real
-- observations to protect a constraint. Fill the gap with a guess — that is a
-- fabricated figure, the one thing this project refuses. Or let the column be
-- null so a query that needs level 47 can see that it is missing. Only the third
-- is honest, so the constraint was wrong rather than the data.
alter table public.bdcom_activity alter column niv47      drop not null;
alter table public.bdcom_activity alter column label_47   drop not null;
alter table public.bdcom_activity alter column niv18      drop not null;
alter table public.bdcom_activity alter column label_18   drop not null;
alter table public.bdcom_activity alter column niv2       drop not null;
alter table public.bdcom_activity alter column label_2    drop not null;
alter table public.bdcom_activity alter column type_code  drop not null;
alter table public.bdcom_activity alter column type_label drop not null;

comment on column public.bdcom_activity.niv47 is
  'Null for codes absent from the 2023 layer, whose intermediate groupings no '
  'published source documents. Absent means unknown — never zero, never "other".';

-- Which source filled this row, so a wrong label can be traced instead of
-- re-derived by hand.
alter table public.bdcom_activity
  add column source text not null default 'service_2023'
    check (source in ('service_2023', 'observed_2017_2020'));

comment on column public.bdcom_activity.source is
  '`service_2023` — code present in the 2023 layer, full hierarchy and labels '
  'from its coded domains. `observed_2017_2020` — code seen only in the older '
  'censuses, label and level-8 grouping reconstructed from the rows themselves, '
  'intermediate levels null.';

comment on table public.bdcom_activity is
  'Activity nomenclature, keyed on the upper-cased 224-post code. The source '
  'mixes cases, so promotion upper-cases before resolving this key — otherwise a '
  'casing slip would create a second activity or break the load. Loaded from the '
  'APUR services only; the published workbook''s level-8 label column maps '
  'several conflicting labels onto one code and is not used.';
