-- Read privileges for the browser roles.
--
-- Every table so far shipped with a row level security policy and no GRANT.
-- Those are two different things: RLS narrows what a role may see, GRANT decides
-- whether it may look at all. Without the second, `compass_premises_within`
-- fails for an anonymous caller with "permission denied for table
-- premise_location" — before any policy is ever consulted.
--
-- Caught by testing the anonymous path rather than the privileged one. The
-- privileged path is the one that always works, which is exactly why it proves
-- nothing about what a visitor sees.
--
-- Staging tables are deliberately excluded: they are pipeline scratch space and
-- carry no policy either.

grant select on
  public.quartier,
  public.street_segment,
  public.bdcom_vintage,
  public.bdcom_activity,
  public.bdcom_size_band,
  public.bdcom_situation,
  public.premise_location,
  public.premise_observation,
  public.bodacc_announcement,
  public.bodacc_establishment,
  public.bodacc_judgment,
  public.sirene_establishment
to anon, authenticated;
