-- w4-meubles (#27): compass_meubles_within did not resolve against compass_record_question.
--
-- MEASURED 10 September 2026, running `npm.cmd run eval` against the remote for the first
-- time since 20260908000002 was posed: arm A stopped with `function
-- public.compass_record_question(unknown, unknown, text, double precision, double precision,
-- double precision, unknown, unknown) does not exist`. The third positional argument — the
-- `case when v_rows = 0 then 'vide' else 'repondu' end` expression — resolves to plain `text`
-- once both branches are string literals, and `text` does not implicitly cast to the
-- `question_outcome` enum `p_issue` expects. Exactly the same class of bug DIAGNOSTIC.md
-- already names for `integer -> smallint` on `compass_station_profile` (see
-- eval/invariants.sql, I54's header) — an enum or a narrower numeric type is never reached by
-- an implicit cast in Postgres, and every other caller of compass_record_question in this
-- schema already casts explicitly. This one did not.
--
-- WHY A NEW MIGRATION RATHER THAN EDITING 20260908000002. That file is POSED — `npm.cmd run
-- ledger` sees it — and #82/#83's rule is that a posed migration is never rewritten, even
-- without touching the SQL. Same fix, same shape as 20260907000003_idfm_lecture_publique.sql,
-- which corrected compass_station_profile's own casting bug in a third file rather than
-- reopening 20260907000002.
--
-- The only change from 20260908000002's version: the case expression now carries an explicit
-- `::public.question_outcome` cast. Everything else — signature, body, grants, comment — is
-- unchanged, so this `create or replace` is additive to the ledger's body hash rather than a
-- divergence needing a `corps-admis` entry: the function did not exist in a working state
-- before this migration ran.
create or replace function public.compass_meubles_within(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m double precision default 200,
  p_limit    integer          default 200
)
returns table (
  decision_number  integer,
  decision_date    date,
  adresse          text,
  arrondissement   smallint,
  nb_logements     integer,
  distance_m       double precision,
  total_matched    bigint
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_rows  bigint;
  v_point geography;
  v_limit integer;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;
  v_limit := greatest(coalesce(p_limit, 200), 1);

  return query
  -- The counted set: every decision in the radius, and the sum that answers "n autorisations
  -- dans <rayon> m" — summed over nb_decisions, never counted as rows (see the column
  -- comment on nb_decisions).
  with hit as (
    select m.decision_number, m.decision_date, m.adresse, m.arrondissement, m.nb_logements,
           m.nb_decisions,
           ST_Distance(m.geom, v_point) as distance_m
    from public.meuble_autorisation m
    where ST_DWithin(m.geom, v_point, p_radius_m)
  ),
  top as (
    select h.decision_number, h.decision_date, h.adresse, h.arrondissement, h.nb_logements,
           h.distance_m
    from hit h
    -- Total order: two decisions can share a distance and a date, never the same
    -- decision_number.
    order by h.distance_m, h.decision_number
    limit v_limit
  )
  select
    t.decision_number, t.decision_date, t.adresse, t.arrondissement, t.nb_logements,
    t.distance_m,
    (select coalesce(sum(h.nb_decisions), 0) from hit h) as total_matched
  from top t
  order by t.distance_m, t.decision_number;

  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_meubles_within',
    (case when v_rows = 0 then 'vide' else 'repondu' end)::public.question_outcome,
    p_lat, p_lng, p_radius_m, null, 'meubles');
end;
$$;

comment on function public.compass_meubles_within is
  'Densité d''autorisations DÉCLARÉES de changement d''usage en meublé touristique dans un '
  'rayon (défaut 200 m, w4-meubles #27) — jamais un taux Airbnb réel : le registre ne connaît '
  'que ce qui a été autorisé, un meublé loué sans autorisation n''y figure pas et ne peut pas '
  'en être déduit d''ici. `total_matched` est la SOMME de nb_decisions des décisions dans le '
  'rayon (toujours égale au nombre de lignes aujourd''hui, voir la colonne source), donnant '
  'exactement la phrase servable « n autorisations dans <rayon> m » — jamais « n meublés '
  'touristiques » (le registre ne dit pas si le bien est encore loué) et jamais un pourcentage '
  'du parc (aucune donnée de parc total ici). Aucun vintage, aucune retenue de licence : le '
  'registre est ODbL et ouvert en totalité, sans lien avec bdcom_vintage. Zéro ligne veut dire '
  'zéro autorisation dans le rayon — une vraie réponse, jamais un indicateur d''absence de '
  'données.';
