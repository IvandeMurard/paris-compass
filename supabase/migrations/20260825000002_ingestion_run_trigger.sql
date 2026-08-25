-- `run_by` distingue trois déclenchements, plus deux.
--
-- `20260825000001` posait `run_by in ('manual', 'github-actions')`, et c'était une distinction
-- trop grossière d'un cran. Un job lancé à la main depuis l'onglet Actions tourne sur un
-- runner : `GITHUB_ACTIONS=true`, donc il se serait enregistré `github-actions`, donc
-- `list_sources` aurait répondu « Refreshed by a scheduled job » — d'une pression sur un bouton.
--
-- C'est précisément la faute que cette table existe pour empêcher, à un niveau de plus : non
-- plus « une date sans rafraîchissement », mais « un rafraîchissement manuel présenté comme
-- automatique ». Le « Fait quand » de w0-cron demande un cron qui a tourné **sans intervention
-- manuelle** : sans cette colonne, rien dans la base ne saurait dire si le critère est atteint.
--
--   manual             quelqu'un à un terminal
--   workflow-dispatch  quelqu'un sur le bouton « Run workflow » — automatisé, pas planifié
--   schedule           le cron s'est déclenché seul. C'est le seul qui démontre la cadence.

alter table public.ingestion_run
  drop constraint if exists ingestion_run_run_by_known;

alter table public.ingestion_run
  add constraint ingestion_run_run_by_known
  check (run_by is null or run_by in ('manual', 'workflow-dispatch', 'schedule'));

comment on column public.ingestion_run.run_by is
  'manual | workflow-dispatch | schedule. Seul `schedule` démontre qu''une cadence est tenue : '
  'les deux autres sont des gestes humains, l''un depuis un terminal et l''autre depuis un '
  'bouton. Les confondre reviendrait à présenter une intervention manuelle comme un '
  'rafraîchissement automatique.';

-- Aucune ligne à convertir : les trois lignes écrites le 25 août portent déjà `manual`, et
-- aucune exécution n'a encore eu lieu sur un runner. Vérifié avant d'écrire cette migration.
