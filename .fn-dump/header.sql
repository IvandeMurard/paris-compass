-- w0-appelant (#58) — the caller test stops being six copies, and stops treating
-- a website account as a licence.
--
-- ---------------------------------------------------------------------------
-- 1. The decision, and it is not this migration's to take
-- ---------------------------------------------------------------------------
-- `authenticated` is NOT a privileged caller. Decided by Ivan on 2026-08-26.
-- Privilege stays with the service role and with direct database connections —
-- whoever OPERATES Compass — and never with an account created on the site.
--
-- The reason, in one sentence: creating an account is not a reading of a
-- licence. Vintages 2017 and 2020 carry `publicly_redistributable = false`
-- because the APUR licence has not been read; it has not been read for a
-- registered user either. A partner under agreement is not a registrant, and
-- the day there is one, that will be another decision, written like this one.
--
-- Revisable on one event only: an APUR answer allowing redistribution (#49).
-- Nothing else reopens it. The full statement lives in docs/CONTEXTE.md and
-- docs/REPRISE.md, "Décisions qui ne se déduisent pas du code" — a migration is
-- where a rule is applied, not where it is kept.
--
-- Decided while it was free: `auth.users` held 0 rows on 25 August. Once
-- registration opens — the product already carries saved_properties and
-- saved_searches, so that is the intention — the same decision would take data
-- away from people who had it.
--
-- ---------------------------------------------------------------------------
-- 2. Why the test is an allowlist and not a denylist
-- ---------------------------------------------------------------------------
-- `role = 'service_role'` rather than `role not in ('anon', 'authenticated')`.
-- The two agree on every role that exists today and disagree on every role that
-- does not yet: a denylist grants privilege to the NEXT claim value by default —
-- a Supabase role added by a future release, a custom claim this product
-- invents for a partner — and grants it silently, which is how the disagreement
-- of 20260809000008 with 20260809000010 produced DIAGNOSTIC.md §12 then §21.
-- An allowlist fails closed: the next role is withheld until somebody writes it
-- here on purpose. Withholding does not get negotiated against a registration.
--
-- A direct database connection carries no PostgREST claim at all, so the
-- coalesce falls through to 'service_role' and it stays privileged. That path is
-- unchanged, and it is the one every ingester and every gate uses.
--
-- ---------------------------------------------------------------------------
-- 3. One expression, six callers — the actual deliverable
-- ---------------------------------------------------------------------------
-- The test was written out six times, under a comment reading "copied verbatim
-- so the functions cannot drift apart". That is DIAGNOSTIC.md §20 in miniature:
-- an intention where a guarantee belongs. Six copies also mean the decision
-- above would have had to be applied six times, correctly, by hand — and a
-- seventh function would have inherited the old test by copy-paste, which is
-- exactly how compass_street_rotation was born wrong (§19).
--
-- So: public.compass_caller_is_privileged(), stable, called by the six. The rule
-- behind it is I32 in eval/invariants.sql — no other compass_* function may read
-- request.jwt.claims, and every function reading a restricted table must call
-- this one. Proved by sabotage, `npm.cmd run eval:sabotage`.
--
-- ---------------------------------------------------------------------------
-- 4. Measured on the remote before this migration, 2026-08-26
-- ---------------------------------------------------------------------------
-- dbefhvmyfmmhjeetdddu, premise 54652 (60 QU ORFEVRES) on vintage 2017, and the
-- two _within functions at Halles (48.86229 / 2.34490), 800 m, vintage 2017.
-- `authenticated` played with the claim AND `set local role` so RLS really
-- applies, as DIAGNOSTIC.md §21 did.
--
--   function                          anon          authenticated   privileged
--   compass_premise_history           withheld      observed=true   observed=true
--   compass_address_timeline          withheld      observed=true   observed=true
--   compass_survival_by_trade         withheld      310/268/86.5%   310/268/86.5%
--   compass_premises_within           1 marker      4773 rows       4773 rows
--   compass_scoring_context_within    1 marker      4773 rows       4773 rows
--   compass_street_rotation (300 m)   2 markers     98 seg × 3      98 seg × 3
--
-- After this migration the `authenticated` column must equal the `anon` column,
-- and the `privileged` column must not have moved. Fixing one caller by breaking
-- the other two would be worse than the defect.
--
-- ---------------------------------------------------------------------------
-- 5. Procedure notes
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE rather than drop-and-create: Postgres has no way to alter a
-- function body, so the six bodies have to be restated in full — but replacing
-- keeps the ACL and the COMMENT, which dropping would silently discard. The six
-- bodies below were lifted from the migration files that last defined them,
-- after checking each against the deployed `prosrc` (CRLF normalised, the trap
-- REPRISE.md records). Five were byte-identical. The sixth was not, and the
-- difference is recorded rather than papered over:
--
--   compass_scoring_context_within carried, IN THE DATABASE, a French comment
--   where the versioned file carries its English translation — a body pushed
--   from a draft before the comment was rewritten to the CLAUDE.md convention.
--   No behaviour attached to it, and no invariant could have seen it: prosrc
--   comparison is not run by any gate. This migration resynchronises the two.
--
-- Two of the six are declared `security invoker` in their own files and were
-- ALTERed to `security definer` by 20260825000014. Restating a body would have
-- silently reverted that — the statements below say `security definer`, and the
-- deployed mode was re-read from pg_proc rather than assumed.

-- ---------------------------------------------------------------------------
-- The single expression
-- ---------------------------------------------------------------------------

create function public.compass_caller_is_privileged()
returns boolean
language sql stable parallel safe
set search_path = public, extensions
as $$
  -- Inside SECURITY DEFINER, `current_user` is the function owner rather than
  -- the caller — testing it always answers "privileged" and hides nothing, the
  -- defect 20260809000010 had to correct. The caller's identity is the role
  -- PostgREST puts in a per-request setting. A direct database connection
  -- carries none, and is privileged by definition: it already holds the
  -- credentials.
  select coalesce(
           nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
           nullif(current_setting('request.jwt.claim.role', true), ''),
           'service_role'
         ) = 'service_role';
$$;

comment on function public.compass_caller_is_privileged is
  'The one place that decides whether a caller may see a vintage whose licence '
  'has not been read. True for the service role and for direct database '
  'connections — whoever operates Compass. False for anon, false for '
  'authenticated, and false for any claim role nobody has explicitly added '
  'here: creating an account on the site is not a reading of a licence '
  '(w0-appelant #58, decided 2026-08-26, revisable only on an APUR answer). '
  'No other compass_* function may read request.jwt.claims — invariant I32.';

grant execute on function public.compass_caller_is_privileged() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- The six callers, bodies unchanged but for the test
-- ---------------------------------------------------------------------------

