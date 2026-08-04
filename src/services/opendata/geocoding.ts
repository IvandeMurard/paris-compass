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

/** Reverse geocode a point to the nearest official address. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = `${BAN}/reverse/?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&limit=1`;
  try {
    const data = await fetchJson<{ features: BanFeature[] }>(url, {
      cacheKey: `ban-rev:${lat.toFixed(5)},${lng.toFixed(5)}`,
      maxAgeMs: 24 * 60 * 60 * 1000,
    });
    const feature = data.features?.[0];
    if (!feature) return null;
    return {
      label: feature.properties.label,
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      postcode: feature.properties.postcode,
      city: feature.properties.city,
    };
  } catch (error) {
    console.error('Reverse geocoding failed', error);
    return null;
  }
}
