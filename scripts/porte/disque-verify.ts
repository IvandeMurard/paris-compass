// Le bras du disque — w1-chargeurs-gonflement (#239).
//
//   npm.cmd run disque
//
// The half that MEASURES: the size of the base, the size of every table a bulk load rewrites,
// BODACC's pace over 28 days, and each table's on-disk / useful ratio. The rule is in
// scripts/porte/disque.ts; the thresholds and the loads, with their reasons, in disque.json.
// Read-only: one connection, catalogue queries and counts, nothing written.
//
// ── The exit codes — the convention of report.ts ─────────────────────────────────────────
//
//   0  the base, every scheduled load and the measured growth stay under the threshold.
//   3  something to watch, no decision yet: a load that will cross the threshold more than
//      `horizon_rouge_jours` away, growth that reaches it within `horizon_signal_jours`, a
//      bloated table — or the remote did not answer, which is an upstream outage, not a defect.
//   1  the base is over the threshold, or a load / the growth crosses it within
//      `horizon_rouge_jours`. Decision required: make room, or the base turns read-only.
//   2  the arm could not measure.

import type { Client } from "pg"

import { readWorkflows, scheduledSources } from "./cadences"
import { ajoutDuBloc, etatGlobal, jugerDisque, lireConfig, prochaineExecution, seuilMo, type Mesure } from "./disque"
import { buildReport, EXIT, type ArmOutcome } from "./report"
import { connect, connectionTarget } from "../ingest/lib/db"
import { isUnreachable, unreachableCode } from "../eval/upstream"

const MO = 1024 * 1024

const DECISION =
  "faire de la place avant la date imprimée, ou la base passera en lecture seule et les " +
  "chargements échoueront (DIAGNOSTIC-CORRIGES.md §62). Dans l'ordre : vérifier qu'aucun chargeur " +
  "n'a régressé (une ligne « gonflement » le dit) ; récupérer le gonflement par VACUUM FULL après " +
  "une sauvegarde vérifiée (la procédure du §62) ; sinon réduire une source — décision d'Ivan, " +
  "qui a écarté le plan payant le 6 octobre 2026. Jamais monter le seuil ni le plafond de " +
  "scripts/porte/disque.json pour éteindre ce rouge : le plafond est celui de Supabase."

async function tailles(client: Client, tables: string[]): Promise<Map<string, number>> {
  const { rows } = await client.query<{ t: string; o: string }>(
    `select c.relname as t, pg_total_relation_size(c.oid)::text as o
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any($1::text[])`,
    [tables],
  )
  return new Map(rows.map((r) => [r.t, Number(r.o) / MO]))
}

async function mesurer(client: Client, maintenant: Date): Promise<Mesure> {
  const config = lireConfig()
  const base = await client.query<{ o: string }>("select pg_database_size(current_database())::text as o")
  const baseMo = Number(base.rows[0].o) / MO

  const crons = new Map(
    [...scheduledSources(readWorkflows())].map(([source, where]) => [source, where.split(" — ")[1]]),
  )
  const prochain = (source: string) => {
    const cron = crons.get(source)
    return cron ? prochaineExecution(cron, maintenant) : null
  }

  const toutes = [...new Set([...config.blocs.flatMap((b) => b.tables), ...config.croissance.tables])]
  const taille = await tailles(client, toutes)
  const sommeMo = (tables: string[]) => tables.reduce((s, t) => s + (taille.get(t) ?? 0), 0)

  // The expressions and table names come from disque.json, which lives in the repository and is
  // reviewed like code — the same footing as eval/baselines/ingestion.json's SQL.
  const pics: Mesure["pics"] = []
  for (const b of config.blocs) {
    let part = 1
    if (b.partition) {
      const r = await client.query<{ part: string | null }>(
        `select (select max(n) from (select count(*) n from public.${b.tables[0]} group by ${b.partition}) g)::float8
                / greatest((select count(*) from public.${b.tables[0]}), 1) as part`,
      )
      part = Number(r.rows[0]?.part ?? 1)
    }
    pics.push({ nom: b.nom, ajoutMo: ajoutDuBloc(b, sommeMo(b.tables), part), prochain: prochain(b.source) })
  }

  // The one source that ADDS rows every day; every other is replaced. Its pace over the window,
  // in MB, at its current bytes per row.
  const c = config.croissance
  const g = await client.query<{ recent: string; total: string }>(
    `select (select count(*) from public.${c.table} where ${c.date} > current_date - ${Number(c.jours)})::text as recent,
            (select count(*) from public.${c.table})::text as total`,
  )
  const croissanceMoParJour =
    (sommeMo(c.tables) / Math.max(Number(g.rows[0].total), 1)) * (Number(g.rows[0].recent) / c.jours)

  // On-disk against useful, as DIAGNOSTIC-CORRIGES.md §62 measured it: the sum of the planner's
  // average column widths plus a tuple header, times the row estimate.
  const ratios = await client.query<{ t: string; total: string; ratio: string }>(`
    with w as (
      select tablename, sum(avg_width) + 28 as row_bytes
        from pg_stats where schemaname = 'public' group by tablename
    )
    select c.relname as t, pg_total_relation_size(c.oid)::text as total,
           (pg_relation_size(c.oid) / nullif(c.reltuples * w.row_bytes, 0))::text as ratio
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join w on w.tablename = c.relname
     where n.nspname = 'public' and c.relkind = 'r' and c.reltuples > 0
  `)
  const tables = ratios.rows
    .filter((r) => r.ratio !== null)
    .map((r) => ({ table: r.t, totalMo: Number(r.total) / MO, ratio: Number(r.ratio) }))

  return { baseMo, pics, croissanceMoParJour, tables }
}

async function main(): Promise<void> {
  process.stdout.write(`CIBLE — ${connectionTarget()}\n`)
  const config = lireConfig()
  const maintenant = new Date()

  let mesure: Mesure
  try {
    const client = await connect()
    try {
      mesure = await mesurer(client, maintenant)
    } finally {
      await client.end()
    }
  } catch (error) {
    if (isUnreachable(error)) {
      process.stdout.write(
        `\nINDÉTERMINÉ — le distant n'a pas répondu (${unreachableCode(error)}) : ` +
          "rien n'est affirmé sur le disque.\n",
      )
      process.exitCode = EXIT.unsettled
      return
    }
    process.stdout.write(`\nERREUR — ${String(error).slice(0, 300)}\n`)
    process.exitCode = EXIT.error
    return
  }

  const constats = jugerDisque(mesure, config, maintenant)
  for (const c of constats) {
    const marque = c.etat === "rouge" ? "FAIL " : c.etat === "signal" ? "susp " : "ok   "
    process.stdout.write(`  ${marque} ${c.quoi} — ${c.detail}\n`)
  }

  const outcomes: ArmOutcome[] = constats
    .filter((c) => c.etat !== "vert")
    .map((c) => ({
      name: `disque ${c.quoi}`,
      exitCode: c.etat === "rouge" ? EXIT.fail : EXIT.unsettled,
      output: `${c.etat === "rouge" ? "FAIL" : "susp"}  ${c.quoi} — ${c.detail}`,
      ...(c.etat === "rouge" ? { expected: DECISION } : {}),
    }))
  if (outcomes.length === 0) {
    outcomes.push({ name: "disque", exitCode: EXIT.pass, output: "Base, chargements et croissance sous le seuil." })
  }
  process.stdout.write("\n" + buildReport(outcomes, maintenant, "Disque").markdown + "\n")

  const etat = etatGlobal(constats)
  const resume = `seuil ${Math.round(seuilMo(config))} Mo sur ${config.plafond_mo_tableau_de_bord} — ${constats.filter((c) => c.etat === "rouge").length} rouge(s), ${constats.filter((c) => c.etat === "signal").length} signal(aux)`
  if (etat === "rouge") {
    process.stdout.write(`\nÉCHEC — ${resume}\n`)
    process.exitCode = EXIT.fail
  } else if (etat === "signal") {
    process.stdout.write(`\nINDÉTERMINÉ — ${resume}\n`)
    process.exitCode = EXIT.unsettled
  } else {
    process.stdout.write(`\nPASS — ${resume}\n`)
  }
}

await main()
