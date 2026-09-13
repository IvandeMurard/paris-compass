import { fetchJson } from './http';
import type { AirQuality, Reading, RiskInfo } from './types';

/**
 * Both lookups used to answer `T | null`, and `null` carried two unrelated meanings — #145.
 *
 * On 13 September 2026 the Géorisques call failed on the published site (`TypeError: Failed to
 * fetch`, logged to the console and nowhere else) while the screen rendered `n/d`, which is the
 * same thing it renders when a point genuinely has no registered risk. A visitor could not tell
 * an outage from an answer, and neither could anything downstream.
 *
 * `Reading<T>` makes the two states different values, so the distinction survives as far as the
 * screen instead of being lost at the `catch`.
 */
const withheld = <T>(): Reading<T> => ({ state: 'withheld', because: 'source_injoignable' });

/** European Air Quality Index bands (EEA). */
function aqiLabel(aqi: number): string {
  if (aqi <= 20) return 'Excellent';
  if (aqi <= 40) return 'Good';
  if (aqi <= 60) return 'Moderate';
  if (aqi <= 80) return 'Poor';
  return 'Very poor';
}

/** Real-time air quality from the CAMS European model (Open-Meteo, no key required). */
export async function fetchAirQuality(lat: number, lng: number): Promise<Reading<AirQuality>> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(3)}` +
    `&longitude=${lng.toFixed(3)}&current=european_aqi,pm2_5,nitrogen_dioxide`;

  try {
    const data = await fetchJson<{
      current?: { european_aqi?: number; pm2_5?: number; nitrogen_dioxide?: number };
    }>(url, { cacheKey: `air:${lat.toFixed(2)},${lng.toFixed(2)}`, maxAgeMs: 60 * 60 * 1000 });

    const aqi = data.current?.european_aqi;
    // The model answered without an index for this point. That IS an answer, and it is not the
    // same thing as the model not answering — hence `empty` rather than `withheld`.
    if (typeof aqi !== 'number') return { state: 'empty' };
    return {
      state: 'read',
      value: {
        aqi,
        pm25: data.current?.pm2_5 ?? null,
        no2: data.current?.nitrogen_dioxide ?? null,
        label: aqiLabel(aqi),
      },
    };
  } catch (error) {
    console.error('Air quality lookup failed', error);
    return withheld();
  }
}

interface GeorisquesResponse {
  commune?: { libelle?: string };
  risquesNaturels?: Record<string, { present?: boolean; libelle?: string }>;
  risquesTechnologiques?: Record<string, { present?: boolean; libelle?: string }>;
}

/** Natural and technological risks registered by Géorisques (BRGM / Ministère). */
export async function fetchRisks(lat: number, lng: number): Promise<Reading<RiskInfo>> {
  const url =
    `https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${lng.toFixed(5)},` +
    `${lat.toFixed(5)}&rayon=1000`;

  try {
    const data = await fetchJson<GeorisquesResponse>(url, {
      cacheKey: `risks:${lat.toFixed(3)},${lng.toFixed(3)}`,
      maxAgeMs: 24 * 60 * 60 * 1000,
    });

    const labels: string[] = [];
    for (const group of [data.risquesNaturels, data.risquesTechnologiques]) {
      for (const entry of Object.values(group ?? {})) {
        if (entry?.present && entry.libelle) labels.push(entry.libelle);
      }
    }
    // No registered risk within a kilometre is a real, reassuring answer. Reporting it as an
    // outage would be as wrong as the reverse, so `empty` carries it and `withheld` never does.
    if (labels.length === 0 && !data.commune?.libelle) return { state: 'empty' };
    return { state: 'read', value: { labels, commune: data.commune?.libelle } };
  } catch (error) {
    console.error('Géorisques lookup failed', error);
    return withheld();
  }
}
