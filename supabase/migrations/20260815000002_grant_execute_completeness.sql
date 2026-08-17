-- `compass_street_key` and `compass_bodacc_street_key` are the only two `compass_*`
-- functions with no explicit `grant execute`. They work today — Postgres grants
-- EXECUTE to PUBLIC by default when a function is created, and nothing on this
-- project has revoked that default — but every other function in this schema
-- states its grant explicitly rather than relying on it.
--
-- Found while adding I11 (eval/invariants.sql), which checks every `compass_*`
-- function for `anon` execute privilege: it passed today only because of the
-- implicit default, the same kind of blind spot as the GRANT-vs-RLS incident in
-- 20260809000009 — a rule that happens to hold, undeclared, until something
-- changes the default out from under it (a hardening pass, a project setting).
-- Made explicit so it no longer depends on that default.

grant execute on function public.compass_street_key(text, text) to anon, authenticated;
grant execute on function public.compass_bodacc_street_key(text, text) to anon, authenticated;
