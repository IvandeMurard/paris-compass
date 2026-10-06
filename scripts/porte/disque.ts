// Le bras du disque — w1-chargeurs-gonflement (#239). The half that DECIDES: no database, no
// network. scripts/porte/disque-verify.ts measures and hands the numbers here, and
// scripts/porte/disque.test.ts plays this same function against the cases that must go red —
// the rule that ships, never a copy of it.
//
// Why the arm exists, and why it looks ahead rather than at today: DIAGNOSTIC-CORRIGES.md §62
// and the `_lisez-moi` of scripts/porte/disque.json. Ivan asked for « le temps de se
// retourner » — a red on the day the base turns read-only comes after the damage.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")

export interface Bloc {
  nom: string
  source: string
  tables: string[]
  /** A GROUP BY expression over the first table: the load replaces one group at a time. */
  partition?: string
  facteur: number
  ajout_mo: number
  raison: string
}

/** What a bulk load writes before it commits, in MB: its share of its tables, times its factor. */
export function ajoutDuBloc(bloc: Bloc, tailleMo: number, plusGrossePart: number): number {
  const part = bloc.partition ? plusGrossePart : 1
  return tailleMo * part * bloc.facteur + bloc.ajout_mo
}

export interface Config {
  plafond_mo_tableau_de_bord: number
  part_du_plafond: number
  rapport_tableau_de_bord: { valeur: number }
  horizon_rouge_jours: number
  horizon_signal_jours: number
  ratio_gonflement: number
  table_minimale_mo: number
  blocs: Bloc[]
  croissance: { table: string; date: string; tables: string[]; jours: number }
}

export function lireConfig(path = resolve(ROOT, "scripts/porte/disque.json")): Config {
  return JSON.parse(readFileSync(path, "utf8")) as Config
}

// ---------------------------------------------------------------------------
// The next run of a cron — the five-field forms the workflows use: numbers, `*`, lists.
// ---------------------------------------------------------------------------

function champ(spec: string, min: number, max: number): Set<number> | null {
  if (spec === "*") return null
  const values = new Set<number>()
  for (const part of spec.split(",")) {
    const n = Number(part)
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new Error(`cron : « ${spec} » n'est pas une forme que ce bras sait lire`)
    }
    values.add(n)
  }
  return values
}

/**
 * The first moment strictly after `from` at which `cron` fires, in UTC — as GitHub reads it.
 * Day-of-month and day-of-week follow the cron rule: when both are restricted, EITHER matches.
 * Returns null past a year and a half, which no schedule here can reach.
 */
export function prochaineExecution(cron: string, from: Date): Date | null {
  const fields = cron.trim().split(/\s+/)
  if (fields.length !== 5) throw new Error(`cron : « ${cron} » n'a pas cinq champs`)
  const [mi, h, dom, mon, dow] = fields
  const minutes = champ(mi, 0, 59)
  const hours = champ(h, 0, 23)
  const days = champ(dom, 1, 31)
  const months = champ(mon, 1, 12)
  const weekdays = champ(dow, 0, 7)
  if (weekdays?.has(7)) weekdays.add(0)

  const sortedHours = hours ? [...hours].sort((a, b) => a - b) : [...Array(24).keys()]
  const sortedMinutes = minutes ? [...minutes].sort((a, b) => a - b) : [...Array(60).keys()]

  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  for (let i = 0; i < 550; i += 1) {
    const d = new Date(day.getTime() + i * 86_400_000)
    const monthOk = !months || months.has(d.getUTCMonth() + 1)
    const domOk = !days || days.has(d.getUTCDate())
    const dowOk = !weekdays || weekdays.has(d.getUTCDay())
    const dayOk = days && weekdays ? domOk || dowOk : domOk && dowOk
    if (!monthOk || !dayOk) continue
    for (const hh of sortedHours) {
      for (const mm of sortedMinutes) {
        const t = new Date(d.getTime() + (hh * 60 + mm) * 60_000)
        if (t > from) return t
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// The judgement
// ---------------------------------------------------------------------------

export interface Mesure {
  /** pg_database_size, in MB as pg_size_pretty prints them. */
  baseMo: number
  /** Each bulk load: what it writes on top of the base before its commit, and when it next runs. */
  pics: { nom: string; ajoutMo: number; prochain: Date | null }[]
  /** BODACC's measured growth, MB per day, over the last 28 days. */
  croissanceMoParJour: number
  /** Tables above the minimum size, with their on-disk / useful ratio. */
  tables: { table: string; totalMo: number; ratio: number }[]
}

export type Etat = "vert" | "signal" | "rouge"

export interface Constat {
  etat: Etat
  quoi: string
  detail: string
}

const jours = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 86_400_000

/** Postgres MB -> the dashboard's MB, the unit the ceiling is given in. */
export const versTableau = (mo: number, config: Config) => mo * config.rapport_tableau_de_bord.valeur

export function seuilMo(config: Config): number {
  return config.plafond_mo_tableau_de_bord * config.part_du_plafond
}

export function jugerDisque(mesure: Mesure, config: Config, maintenant: Date): Constat[] {
  const seuil = seuilMo(config)
  const plafond = config.plafond_mo_tableau_de_bord
  const constats: Constat[] = []
  const fmt = (n: number) => `${Math.round(n)} Mo`
  // A load over the threshold is red when it runs soon enough to act on — and a signal further
  // out, never green: a load that WILL cross is news however far away it is. An unknown date is
  // red, because the load could be tomorrow.
  const echeance = (d: Date | null): Etat =>
    !d || jours(maintenant, d) <= config.horizon_rouge_jours ? "rouge" : "signal"

  // 1. Today. Above the threshold now is red whatever comes next.
  const base = versTableau(mesure.baseMo, config)
  constats.push({
    etat: base >= seuil ? "rouge" : "vert",
    quoi: "base",
    detail: `${fmt(base)} au tableau de bord (${fmt(mesure.baseMo)} Postgres) — seuil ${fmt(seuil)}, plafond ${fmt(plafond)}`,
  })

  // 2. Each bulk load, at its next run. Over the threshold is a red only when that run is near
  //    enough to act on; further out it is the signal that buys the time to act.
  for (const pic of mesure.pics) {
    const total = versTableau(mesure.baseMo + pic.ajoutMo, config)
    const quand = pic.prochain ? pic.prochain.toISOString().slice(0, 10) : "date inconnue"
    const dans = pic.prochain ? `${Math.ceil(jours(maintenant, pic.prochain))} j` : "?"
    const etat: Etat = total >= seuil ? echeance(pic.prochain) : "vert"
    constats.push({
      etat,
      quoi: `pic ${pic.nom}`,
      detail: `${fmt(total)} au prochain chargement, le ${quand} (dans ${dans}) — base + ${fmt(versTableau(pic.ajoutMo, config))}, seuil ${fmt(seuil)}`,
    })
  }

  // 3. Growth: when does the base itself reach the threshold, at BODACC's measured pace?
  const parJour = versTableau(mesure.croissanceMoParJour, config)
  if (parJour > 0 && base < seuil) {
    const j = (seuil - base) / parJour
    const etat: Etat =
      j <= config.horizon_rouge_jours ? "rouge" : j <= config.horizon_signal_jours ? "signal" : "vert"
    constats.push({
      etat,
      quoi: "croissance",
      detail: `${parJour.toFixed(2)} Mo par jour (BODACC, 28 j) — seuil atteint dans ${Math.round(j)} j au rythme mesuré`,
    })
  }

  // 4. Bloat, table by table: the early sign that a loader went back to rewriting everything.
  for (const t of mesure.tables) {
    if (t.totalMo < config.table_minimale_mo) continue
    if (t.ratio > config.ratio_gonflement) {
      constats.push({
        etat: "signal",
        quoi: `gonflement ${t.table}`,
        detail: `${fmt(t.totalMo)} sur disque pour ×${t.ratio.toFixed(1)} son volume utile — un chargeur réécrit-il tout ? (§62)`,
      })
    }
  }
  return constats
}

/** The worst state among the findings decides the exit code. */
export function etatGlobal(constats: Constat[]): Etat {
  if (constats.some((c) => c.etat === "rouge")) return "rouge"
  if (constats.some((c) => c.etat === "signal")) return "signal"
  return "vert"
}
