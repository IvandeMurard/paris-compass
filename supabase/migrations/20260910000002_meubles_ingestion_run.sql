-- Registered as a tenth ingestion source (#70's rule: a source insertion into
-- ingestion_run must carry a cadence, checked by scripts/porte/cadences.ts, and a cron in
-- .github/workflows/ingestion.yml declares it — checked the same way, in the same run of
-- `npm.cmd run test`).
--
-- WHY THIS WAITED FOR A SEPARATE MIGRATION, RATHER THAN RIDING 20260908000002. That migration's
-- own header says so: declaring a cadence with no cron and no first load would be exactly the
-- "cadence before the first load" trap #70 closed (docs/REPRISE-PIEGES.md) — the enum value,
-- this row, the cron entry below, and scripts/ingest/meubles.ts's first run belong in the SAME
-- window, never staggered. This migration, the ingestion.yml edit, and the first load are that
-- window.
insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('meubles', 'Autorisations de changement d''usage en meublé touristique (Ville de Paris)',
   'annual',
   'metas.dcat.accrualperiodicity du jeu lui-même, lu le 8 septembre 2026 : "Annuelle". '
   'Chargé une fois dans la foulée de cette migration — poser une cadence ne recharge rien '
   '(REPRISE-PIEGES.md, incident #70 du 5 septembre) — puis rechargé à ce rythme par le cron '
   'ci-dessous.');
