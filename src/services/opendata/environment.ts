import { fetchJson } from './http';
import type { AirQuality, RiskInfo } from './types';

/** European Air Quality Index bands (EEA). */
function aqiLabel(aqi: number): string {
  if (aqi <= 20) return 'Excellent';
  if (aqi <= 40) return 'Good';
  if (aqi <= 60) return 'Moderate';
  if (aqi <= 80) return 'Poor';
  return 'Very poor';
}

/** Real-time air quality from the CAMS European model (Open-Meteo, no key required). */
export async function fetchAirQuality(lat: number, lng: number): Promise<AirQuality | null> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(3)}` +
    `&longitude=${lng.toFixed(3)}&current=european_aqi,pm2_5,nitrogen_dioxide`;

  try {
    const data = await fetchJson<{
      current?: { european_aqi?: number; pm2_5?: number; nitrogen_dioxide?: number };
    }>(url, { cacheKey: `air:${lat.toFixed(2)},${lng.toFixed(2)}`, maxAgeMs: 60 * 60 * 1000 });

    const aqi = data.current?.european_aqi;
    if (typeof aqi !== 'number') return null;
    return {
      aqi,
      pm25: data.current?.pm2_5 ?? null,
      no2: data.current?.nitrogen_dioxide ?? null,
      label: aqiLabel(aqi),
    };
  } catch (error) {
    console.error('Air quality lookup failed', error);
    return null;
  }
}

interface GeorisquesResponse {
  commune?: { libelle?: string };
  risquesNaturels?: Record<string, { present?: boolean; libelle?: string }>;
  risquesTechnologiques?: Record<string, { present?: boolean; libelle?: string }>;
}

/** Natural and technological risks registered by Géorisques (BRGM / Ministère). */
export async function fetchRisks(lat: number, lng: number): Promise<RiskInfo | null> {
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
    return { labels, commune: data.commune?.libelle };
  } catch (error) {
    console.error('Géorisques lookup failed', error);
    return null;
  }
}
