import { fetchJson } from './http';

const BAN = 'https://api-adresse.data.gouv.fr';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  postcode?: string;
  city?: string;
}

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { label: string; postcode?: string; city?: string };
}

/** Geocode a free-text address with the Base Adresse Nationale (Etalab). */
export async function geocode(query: string, limit = 5): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  const url = `${BAN}/search/?q=${encodeURIComponent(query)}&limit=${limit}&lat=48.8566&lon=2.3522`;
  try {
    const data = await fetchJson<{ features: BanFeature[] }>(url, {
      cacheKey: `ban:${query.toLowerCase()}:${limit}`,
      maxAgeMs: 24 * 60 * 60 * 1000,
    });
    return (data.features ?? []).map((f) => ({
      label: f.properties.label,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      postcode: f.properties.postcode,
      city: f.properties.city,
    }));
  } catch (error) {
    console.error('Geocoding failed', error);
    return [];
  }
}

