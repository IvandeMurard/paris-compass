-- Meublés touristiques déclarés — w4-meubles (issue #27). "Grand oublié" du backlog :
-- PLAN-ACTION-VACANCE.md's "Meublés touristiques (changement d'usage)" moves from planifiée
-- to endpoint choisi / migration préparée.
--
-- THE ENDPOINT CHOSEN, AND WHY. opendata.paris.fr's "Registre des autorisations de changement
-- d'usage pour les meublés touristiques" (dataset_id
-- registre-des-autorisations-de-changement-dusage-pour-les-meubles), the same Opendatasoft
-- product as chantiers/terrasses/plu. Measured 8 September 2026: 200 responds, 265 records,
-- ODbL ("Open Database License (ODbL)", metas.default.license). Its own description confirms
-- the doctrine's boundary in the source's own words: "des locations de meublés touristiques
-- peuvent aussi être réalisées légalement sur des locaux non référencés dans cette liste comme
-- meublés" — the registry is what was AUTHORISED, never a census of what is actually rented.
--
-- WHAT "n autorisations dans 200 m" COUNTS, MEASURED RATHER THAN ASSUMED. `nb_de_decisions`
-- is ALWAYS 1 — checked against the full 265 rows (three paginated reads, `where=nb_de_
-- decisions > 1` also returns zero) on 8 September 2026 — so today a row and a decision are
-- the same thing. It is kept as a real column rather than dropped, because nothing here
-- guarantees the source keeps publishing 1 in every future reload; compass_meubles_within
-- below sums it rather than counting rows, so a future edition that groups several decisions
-- per row would not silently undercount.
--
-- THE ROW IDENTITY IS PARSED, NOT INVENTED. The dataset carries no primary key of its own;
-- `commentaire` packs one anyway — "n°NNNNNN - JJ/MM/AAAA", verified against a regular
-- expression on all 265 rows (three paginated reads) on 8 September 2026, zero mismatches.
-- `decision_number` is that file number (Direction du Logement et de l'Habitat), unique by
-- construction; `decision_date` is the day parsed from the same field, which is more precise
-- than the source's own `annee` (kept verbatim, as `annee`, for cross-checking rather than
-- discarded).
--
-- WHAT "MILLÉSIME" MEANS HERE, AND WHY IT IS NOT A COEXISTING-EDITION PROBLEM. DIAGNOSTIC.md
-- §45 found IDFM pinning a catalogue id that kept answering 200 on a FROZEN quarterly edition
-- while the loader had already moved to a newer one — several editions of the same family
-- coexist under similar ids. This registry is a DIFFERENT shape: measured 8 September 2026,
-- searching the opendata.paris.fr catalogue for every dataset whose title contains "meubl"
-- returns exactly ONE dataset_id. There is no sibling edition to drift behind. Its own
-- freshness is instead a single continuously-updated file (metas.default.modified =
-- 2026-06-05 at read time, accrualperiodicity "Annuelle") — the catalogue probe in
-- scripts/porte/catalogue.json therefore cannot go stale the way IDFM's did. What IS a real
-- limit, and unrattrapable here: the registry can be revised RETROACTIVELY — a decision from
-- an old year added late to the file — so a reload some months from now could raise the count
-- for a year already reported. No invariant in this migration catches that, because a later,
-- larger count for the same past year is not a contradiction to detect; it is simply the
-- registry catching up with itself.
--
-- NO PREMISE ATTACHMENT, AND THIS IS A DOCTRINE CHOICE, NOT AN OVERSIGHT. Unlike chantiers,
-- terrasses, PLU or IDFM, nothing here writes to premise_location: this is a DENSITY measured
-- around a point, in the same shape as compass_bodacc_within (issue #62) — no single premise
-- "is" a meublé authorisation, and forcing a nearest-premise pointer here would manufacture
-- the exact "n meublés touristiques [at this shop]" reading the doctrine refuses. A caller
-- asks "how many authorisations sit within my radius", never "does this premise have one".
--
-- THE DOCTRINE LIMIT IS WRITTEN WHERE A DIRECT POSTGREST CALLER READS IT, not only in this
-- ticket: see `comment on function public.compass_meubles_within` below, which PostgREST
-- serves as the operation's own description — the channel every function in this schema
-- already uses for exactly this reason (compass_station_profile, compass_bodacc_within).
--
-- NOT REGISTERED IN ingestion_run YET, AND THAT IS DELIBERATE. #70's rule (scripts/porte/
-- cadences.ts) reads every `insert into public.ingestion_run` straight from the migration
-- files on disk, whether or not the migration has been posed — so declaring the row here,
-- with no cron in .github/workflows/ingestion.yml and no loader run yet, would be exactly the
-- "cadence before the first load" trap #70 closed (docs/REPRISE-PIEGES.md), and
-- scripts/ingest/workflow.test.ts holds the stronger invariant that every declared source has
-- its own cron, no exceptions carried in scripts/porte/cadence.json's excuse list. The
-- `ingestion_cadence` enum value ('annual', matching metas.dcat.accrualperiodicity), the
-- `insert into ingestion_run`, the cron entry, and the first run of
-- scripts/ingest/meubles.ts belong in ONE follow-up migration plus workflow edit, posed and
-- run together by Ivan — never staggered, per this session's own instruction.
--
-- MIGRATION PREPARED, NOT POSED. Per this session's explicit instruction: two sessions running
-- in parallel worktrees must not both write to the one live database. This file is complete
-- and reviewed against the live catalogue endpoint, but not applied — `npm.cmd run ledger`
-- will not see it until Ivan runs `supabase db push` (or equivalent) himself. The invariants
-- this ticket also adds (eval/invariants.sql, I55/I56) could therefore not be measured in a
-- rolled-back transaction against the remote the way w6-analyse and w2-idfm's own invariants
-- were — there is no DATABASE_URL in this worktree, by design (docs/REPRISE.md,
-- "Environnement"). They are written and reviewed against the schema below, but their
-- "mesuré" line is the one thing this session could not produce; that is the line left for
-- Ivan.

create table public.meuble_autorisation (
  decision_number  integer primary key,
  decision_date    date not null,
  -- Kept verbatim from the source's own `annee` field, for cross-checking against
  -- decision_date — never used on its own to compute an age, since decision_date is exact.
  annee            smallint not null,
  adresse          text not null,
  -- Same derivation as chantiers.ts/terrasses.ts: the source's "750NN" becomes NN.
  arrondissement   smallint,
  -- Always 1 today (see migration header) — kept as a real column, summed rather than
  -- counted, so a future edition that changes shape does not silently undercount.
  nb_decisions     integer not null,
  nb_logements     integer,
  geom             extensions.geography(Point, 4326) not null
);

comment on table public.meuble_autorisation is
  'Une ligne par autorisation de changement d''usage en meublé touristique délivrée par la '
  'Ville de Paris (Direction du Logement et de l''Habitat) — jamais un stock de meublés en '
  'activité. Le registre garde une autorisation même si le bien a cessé d''être loué, et un '
  'meublé loué sans autorisation n''y figure pas et ne peut pas en être déduit : w4-meubles '
  '(#27) sépare deux rues sur la densité d''autorisations DÉCLARÉES, jamais sur un taux '
  'Airbnb réel. `decision_number` est parsé de `commentaire` ("n°NNNNNN - JJ/MM/AAAA"), '
  'vérifié stable et unique sur les 265 lignes du registre le 8 septembre 2026. '
  '`nb_decisions` est toujours 1 sur ce même relevé — voir l''en-tête de cette migration. '
  'Le registre est un jeu UNIQUE et continu, sans édition figée coexistante (contrairement '
  'aux profils IDFM, DIAGNOSTIC.md §45) : rechargé, il reflète l''état courant, jamais une '
  'édition dépassée. Sa seule dérive possible est rétroactive — une décision ancienne ajoutée '
  'tardivement au registre — ce qu''aucun invariant ici ne détecte, écrit plutôt que supposé.';

comment on column public.meuble_autorisation.nb_decisions is
  'Toujours 1, mesuré sur les 265 lignes du registre le 8 septembre 2026 (aucune ligne à '
  'nb_de_decisions > 1). compass_meubles_within le SOMME plutôt que de compter les lignes, '
  'pour ne pas dépendre silencieusement de cette régularité si une édition future en portait '
  'plusieurs pour une même adresse-année.';

create index meuble_autorisation_geom_idx on public.meuble_autorisation using gist (geom);

alter table public.meuble_autorisation enable row level security;

-- ODbL, jeu ouvert dans sa totalité — aucune retenue de licence, contrairement à BDCom : ce
-- n'est pas un millésime dérivé de bdcom_vintage, donc rien ici ne dépend de
-- compass_caller_is_privileged().
create policy "meuble_autorisation is publicly readable"
  on public.meuble_autorisation for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- compass_meubles_within — la densité, jamais un local unique. Même forme que
-- compass_bodacc_within (20260828000002) : un `hit` qui porte tout ce qui compte pour le
-- comptage, un `total_matched` calculé sur `hit` et non sur la page rendue, un `top` limité
-- pour l'affichage. Pas de vintage, pas de `withheld` : aucune donnée BDCom ici.
-- ---------------------------------------------------------------------------

create function public.compass_meubles_within(
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
    case when v_rows = 0 then 'vide' else 'repondu' end,
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

grant execute on function public.compass_meubles_within(
  double precision, double precision, double precision, integer
) to anon, authenticated;
