// Temporary generator for 20260826000002. Not committed.
//
// The six bodies are lifted from the migration files that last defined them —
// verified byte-identical to the deployed prosrc first, except the one comment
// noted in the migration header — and rewritten by exact-string substitution so
// nothing but the caller test can change.

import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")
const read = (f) => readFileSync(resolve(ROOT, "supabase/migrations", f), "utf8").replace(/\r/g, "")

const CALL_NOTE = "-- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58)."

const CTE_TIMELINE = `  with caller as (
    -- Inside SECURITY DEFINER, \`current_user\` is the function owner, not the
    -- caller — testing it always answers "privileged" and hides nothing. The
    -- caller's identity is the role PostgREST puts in a per-request setting.
    -- A direct database connection carries none, and is privileged by
    -- definition: it already holds the credentials.
    select coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon' as privileged
  ),`

const CTE_HISTORY = `  with caller as (
    -- Copied verbatim from 20260809000011, 20260816000001 and 20260817000001 so
    -- the four functions cannot drift apart. Inside SECURITY DEFINER,
    -- \`current_user\` is the function owner rather than the caller — testing it
    -- always answers "privileged" and hides nothing, which is the defect
    -- 20260809000010 had to correct. A direct database connection carries no
    -- claim and is privileged by definition: it already holds the credentials.
    select coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon' as privileged
  ),`

const CTE_NEW = `  with caller as (
    ${CALL_NOTE}
    select public.compass_caller_is_privileged() as privileged
  ),`

const WITHIN_PLAIN = `  select v.id,
         not (
           coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon'
           or v.publicly_redistributable
         )
    into v_vintage, v_withheld`

const WITHIN_COMMENTED = `  select v.id,
         not (
           -- Same caller test as 20260809000011. A direct database connection
           -- carries no PostgREST claim and is privileged by definition: it
           -- already holds the credentials.
           coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon'
           or v.publicly_redistributable
         )
    into v_vintage, v_withheld`

const WITHIN_NEW = `  select v.id,
         ${CALL_NOTE}
         not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_vintage, v_withheld`

const ROTATION_OLD = `  -- Copied verbatim from 20260809000011, 20260816000001, 20260817000001 and
  -- 20260824000002 so the functions cannot drift apart. Inside SECURITY DEFINER
  -- \`current_user\` is the owner rather than the caller — testing it always
  -- answers "privileged", the defect 20260809000010 had to correct. A direct
  -- database connection carries no claim and is privileged by definition: it
  -- already holds the credentials.
  select coalesce(
           nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
           nullif(current_setting('request.jwt.claim.role', true), ''),
           'service_role'
         ) <> 'anon' into v_privileged;`

const SURVIVAL_OLD = `  -- Same caller test as 20260809000011, copied verbatim so the five functions that
  -- withhold cannot drift apart. A direct database connection carries no PostgREST
  -- claim and is privileged by definition: it already holds the credentials.
  v_privileged := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
    nullif(current_setting('request.jwt.claim.role', true), ''),
    'service_role'
  ) <> 'anon';`

const ASSIGN_NEW = `  ${CALL_NOTE}
  v_privileged := public.compass_caller_is_privileged();`

/** The `create … function public.<name>( … ) … $tag$;` statement, alone. */
function statement(file, name) {
  const text = read(file)
  const start = text.search(new RegExp(`create (or replace )?function public\\.${name}\\b`))
  if (start < 0) throw new Error(`${name} absente de ${file}`)
  const rest = text.slice(start)
  const tag = /\bas\s+(\$[a-zA-Z_]*\$)/i.exec(rest)[1]
  const open = rest.indexOf(tag, rest.search(/\bas\s+\$/i))
  const close = rest.indexOf(tag, open + tag.length)
  const end = rest.indexOf(";", close + tag.length)
  return rest.slice(0, end + 1).replace(/^create function/, "create or replace function")
}

function substitute(sql, name, from, to) {
  const parts = sql.split(from)
  if (parts.length !== 2) throw new Error(`substitution introuvable ou ambiguë dans ${name} (${parts.length - 1})`)
  return parts.join(to)
}

const pieces = []

// 1 — compass_address_timeline
{
  let s = statement("20260826000001_timeline_scope_evidence.sql", "compass_address_timeline")
  s = substitute(s, "compass_address_timeline", CTE_TIMELINE, CTE_NEW)
  pieces.push(s)
}
// 2 — compass_premise_history
{
  let s = statement("20260824000002_premise_history_definer.sql", "compass_premise_history")
  s = substitute(s, "compass_premise_history", CTE_HISTORY, CTE_NEW)
  pieces.push(s)
}
// 3 — compass_premises_within (declared invoker in its file, ALTERed definer by 20260825000014)
{
  let s = statement("20260825000010_premises_within_terrasses.sql", "compass_premises_within")
  s = substitute(s, "compass_premises_within", WITHIN_PLAIN, WITHIN_NEW)
  s = substitute(s, "compass_premises_within", "security invoker", "security definer")
  pieces.push(s)
}
// 4 — compass_scoring_context_within (same)
{
  let s = statement("20260825000003_scoring_context_out_of_corpus.sql", "compass_scoring_context_within")
  s = substitute(s, "compass_scoring_context_within", WITHIN_COMMENTED, WITHIN_NEW)
  s = substitute(s, "compass_scoring_context_within", "security invoker", "security definer")
  pieces.push(s)
}
// 5 — compass_street_rotation
{
  let s = statement("20260825000014_licence_withholding_rule.sql", "compass_street_rotation")
  s = substitute(s, "compass_street_rotation", ROTATION_OLD, ASSIGN_NEW)
  pieces.push(s)
}
// 6 — compass_survival_by_trade
{
  let s = statement("20260825000012_survival_by_trade.sql", "compass_survival_by_trade")
  s = substitute(s, "compass_survival_by_trade", SURVIVAL_OLD, ASSIGN_NEW)
  pieces.push(s)
}

for (const p of pieces) {
  if (/request\.jwt\.claim/.test(p)) throw new Error("un corps lit encore request.jwt.claims")
  if (!/compass_caller_is_privileged/.test(p)) throw new Error("un corps n'appelle pas l'aide")
}

writeFileSync(resolve(ROOT, ".fn-dump/bodies.sql"), pieces.join("\n\n\n"), "utf8")
process.stdout.write(`${pieces.length} fonctions, ${pieces.join("").length} octets\n`)
