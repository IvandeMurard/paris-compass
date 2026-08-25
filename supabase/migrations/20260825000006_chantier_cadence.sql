-- Adds the cadence chantiers-perturbants actually publishes on.
--
-- docs/tickets/w1-chantiers.md and docs/PLAN-ACTION-VACANCE.md §5.1 both say
-- "chantiers-perturbants quotidien" (daily). Measured 25 August 2026 against the
-- catalogue API (metas.default.description of the dataset itself): "Initialisation de
-- la donnée, Décembre 2016 - Mise à jour hebdomadaire" — weekly, not daily. Both
-- documents are wrong and are corrected alongside this migration (docs/REPRISE.md).
--
-- None of the four existing cadences fit a weekly rhythm without lying about it —
-- PLAN.md §2.2bis made exactly this argument for why one label cannot serve four
-- sources publishing at three orders of magnitude apart. A fifth cadence for a fifth
-- rhythm, same discipline applied again.
--
-- Split into its own migration, ahead of the one that uses the new label: Postgres
-- will not let a transaction reference an enum value it just added in the same
-- transaction, and supabase db push commits one migration file at a time.

alter type public.ingestion_cadence add value 'weekly';
