-- `run_by` tells three triggers apart, not two.
--
-- 20260825000001 wrote `run_by in ('manual', 'github-actions')`, and that was one notch too
-- coarse. A job started by hand from the Actions tab runs on a runner: GITHUB_ACTIONS=true, so
-- it would have recorded itself as `github-actions`, and list_sources would have answered
-- "Refreshed by a scheduled job" — to a button press.
--
-- That is exactly the failure this table exists to prevent, one level up: no longer "a date
-- with no refresh behind it", but "a manual refresh presented as an automatic one". w0-cron's
-- criterion asks for a cron that ran **without manual intervention**; without this column,
-- nothing in the database could say whether the criterion had been met.
--
--   manual             someone at a terminal
--   workflow-dispatch  someone on the "Run workflow" button — automated, but not scheduled
--   schedule           the cron fired on its own. The only one that demonstrates a cadence.

alter table public.ingestion_run
  drop constraint if exists ingestion_run_run_by_known;

alter table public.ingestion_run
  add constraint ingestion_run_run_by_known
  check (run_by is null or run_by in ('manual', 'workflow-dispatch', 'schedule'));

comment on column public.ingestion_run.run_by is
  'manual | workflow-dispatch | schedule. Only `schedule` demonstrates that a cadence is kept: '
  'the other two are human actions, one from a terminal and one from a button. Conflating them '
  'would present a manual refresh as an automatic one.';

-- Nothing to convert: the three rows written on 25 August already carry `manual`, and no run
-- had yet happened on a runner. Checked before writing this migration.
