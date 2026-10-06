// The SIRENE confirmation of BODACC registered offices, shared by the two loaders that need it:
// sirene.ts after it reloads SIRENE, and bodacc.ts inside each year it replaces — #239.

import type { Client } from "pg"

/**
 * How close a SIRENE point must be to count as "the same address". The BODACC
 * point is borrowed from the BDCom premises at that number, and both sides are
 * geocoded to the number, so the gap is geocoding noise rather than distance.
 */
export const SAME_ADDRESS_M = 50

/**
 * Marks a notice as operator-confirmed when its company has an establishment
 * within reach. False is a real finding — the company files here but operates
 * elsewhere — while null stays null: absence from the slice we loaded is not
 * evidence of absence from Paris.
 *
 * Only rows whose verdict CHANGES are written: an unchanged rewrite is pure disk churn under a
 * 500 MB ceiling (DIAGNOSTIC-CORRIGES.md §62). `noticeIds` scopes it to the notices bodacc.ts
 * has just written, inside the same transaction: a year then commits WITH its verdicts, instead
 * of standing without them until a later step — and a run that breaks halfway leaves no year
 * stripped of what it had.
 */
export async function confirmOperators(client: Client, noticeIds?: string[]): Promise<number> {
  const scope = noticeIds ? "and e.announcement_id = any($2::text[])" : ""
  const result = await client.query(
    `
    with verdict as (
      select e.id,
             exists (
               select 1 from public.sirene_establishment s
               where s.siren = a.siren
                 and ST_DWithin(s.geom, e.geom, $1)
             ) as confirmed
        from public.bodacc_establishment e
        join public.bodacc_announcement a on a.id = e.announcement_id
       where e.address_source = 'siege_social'
         and e.geom is not null
         and a.siren is not null
         and exists (select 1 from public.sirene_establishment s where s.siren = a.siren)
         ${scope}
    )
    update public.bodacc_establishment e
       set operator_confirmed = v.confirmed
      from verdict v
     where v.id = e.id
       and e.operator_confirmed is distinct from v.confirmed
    `,
    noticeIds ? [SAME_ADDRESS_M, noticeIds] : [SAME_ADDRESS_M],
  )
  return result.rowCount ?? 0
}
