-- PostGIS lives in its own schema, not in `public`.
--
-- Supabase's own linter flags extensions installed in `public`, and keeping the
-- ~1000 PostGIS symbols out of the application schema means a future `\d public.*`
-- still shows only Compass tables. Every function below therefore declares
-- `search_path = public, extensions` explicitly: without it, `ST_DWithin` is not
-- resolvable from inside a SECURITY INVOKER function.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;

grant usage on schema extensions to anon, authenticated, service_role;
