-- Making BODACC addresses joinable to BDCom, and saying which address they are.
--
-- Measured on the first load: only 7 153 of 26 491 establishments attached. Both
-- causes are systematic, and neither is a typo.

-- ---------------------------------------------------------------------------
-- 1. The two sources write the same street differently
-- ---------------------------------------------------------------------------
-- BODACC: "BOULEVARD VOLTAIRE", "RUE DE VAUGIRARD", "RUE DES PYRÉNÉES"
-- BDCom:  "BD VOLTAIRE",        "RUE VAUGIRARD",    "RUE PYRENEES"
--
-- Three differences: the way type is spelled out rather than abbreviated, the
-- linking word is kept rather than dropped, and accents are present.
--
-- This is a *vocabulary* difference, not a formatting one, so it belongs in a
-- source-specific function rather than in compass_street_key — which stays the
-- single definition of the shared format and is left untouched.
--
-- Note this contradicts a comment in 20260808000007 claiming accent folding
-- would be dead code. That was true of BDCom against the city street register,
-- where both sides publish unaccented labels. It is false of BODACC.
create or replace function public.compass_bodacc_street_key(p_way_type text, p_name text)
returns text
language sql immutable parallel safe
as $$
  with folded as (
    select
      translate(upper(coalesce(p_way_type, '')),
                'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
                'AAAAAACEEEEIIIINOOOOOUUUUY') as way_type,
      translate(upper(coalesce(p_name, '')),
                'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
                'AAAAAACEEEEIIIINOOOOOUUUUY') as name
  )
  select public.compass_street_key(
    case f.way_type
      when 'AVENUE'     then 'AV'   when 'BOULEVARD' then 'BD'
      when 'PLACE'      then 'PL'   when 'PASSAGE'   then 'PAS'
      when 'QUAI'       then 'QU'   when 'COURS'     then 'CRS'
      when 'SQUARE'     then 'SQ'   when 'IMPASSE'   then 'IMP'
      when 'VILLA'      then 'VLA'  when 'ALLEE'     then 'ALL'
      when 'GALERIE'    then 'GAL'  when 'ROUTE'     then 'RTE'
      when 'CHAUSSEE'   then 'CHAU' when 'ROND-POINT' then 'RPT'
      when 'PORT'       then 'PRT'
      else f.way_type
    end,
    -- Only the unambiguous linking words are stripped. `LA`, `LE` and `LES` are
    -- deliberately left alone: rue Le Vau and rue La Fayette carry them as part
    -- of a surname, and stripping those would silently invent two new streets.
    regexp_replace(f.name, '^(DE\s+LA|DE\s+L''|DES|DU|DE|D'')\s*', '', 'i')
  )
  from folded f
$$;

comment on function public.compass_bodacc_street_key is
  'BODACC street vocabulary mapped onto BDCom''s, then through the shared key '
  'function. Spelled-out way types, linking words and accents are the three '
  'differences; compass_street_key handles only the format common to both.';

alter table public.bodacc_establishment drop column street_key;
alter table public.bodacc_establishment
  add column street_key text generated always as (
    public.compass_bodacc_street_key(way_type, way_name)
  ) stored;

create index bodacc_establishment_address_idx
  on public.bodacc_establishment (street_key, house_number);


-- ---------------------------------------------------------------------------
-- 2. An insolvency notice gives a registered office, not a shopfront
-- ---------------------------------------------------------------------------
-- Sale notices carry `listeetablissements`, an actual establishment with the
-- address of the business being sold. Insolvency notices carry none — their
-- address sits in `listepersonnes` and is the company's *registered office*.
--
-- For a small trader the two are usually the same address. For anything larger
-- they are not, and an insolvency filed at a head office says nothing about the
-- shop downstairs. Recording which of the two produced the address is what keeps
-- the interface from claiming a closure it cannot see.
alter table public.bodacc_establishment
  add column address_source text not null default 'etablissement'
    check (address_source in ('etablissement', 'siege_social'));

comment on column public.bodacc_establishment.address_source is
  '`etablissement` — the address of the business actually sold, published on the '
  'sale notice. `siege_social` — the company''s registered office, the only '
  'address an insolvency notice carries. The second is weaker evidence about a '
  'given shopfront and must be labelled as such wherever it is shown.';
