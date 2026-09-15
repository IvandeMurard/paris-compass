import { fetchJson } from './http';
import { DATA_SOURCES } from './sources';

const BAN = 'https://api-adresse.data.gouv.fr';

/** The published entry for the Base Adresse Nationale, in the `/sources` list. */
const BAN_ENTRY = 'https://adresse.data.gouv.fr';

/**
 * What a dossier says about an address BAN has not resolved — w6-dossier (#33).
 *
 * **Measured, not foreseen.** The first browser run of the ticket's demonstration, 15 September
 * 2026, produced a file whose address read « rue de bretagne paris » — the de-slugified URL text
 * the sheet shows while BAN is still answering — with « Base Adresse Nationale » cited beside it.
 * The coordinates were the URL's and the label was nobody's. A provenance that names a producer
 * which produced neither half is the exact defect `Measured<T>` exists to prevent, at the one
 * place where it would be signed.
 */
const FROM_URL = {
  fr: {
    source: 'Libellé et coordonnées lus dans l’URL — la Base Adresse Nationale n’avait pas répondu',
    licence: 'indéterminée',
  },
  en: {
    source: 'Label and coordinates read from the URL — the Base Adresse Nationale had not answered',
    licence: 'undetermined',
  },
} as const;

/**
 * Provenance of the address itself — w6-dossier (#33).
 *
 * A dossier cites the label and the coordinates like any other figure, and BAN is where they
 * came from WHEN IT ANSWERED. It is **looked up in `DATA_SOURCES`** rather than typed here so
 * that the page which answers « d'où vient tout ceci ? » and the file a banker is handed cannot
 * name the same dataset or the same licence differently. Throwing when the entry is gone is the
 * point: a dossier quietly citing an empty licence would be worse than a build that stops.
 */
export function banSource(
  locale: 'fr' | 'en',
  /** Whether BAN actually returned this label. `false` hands back the URL's own provenance. */
  resolved: boolean,
): { source: string; licence: string } {
  if (!resolved) return { ...FROM_URL[locale] };
  const entry = DATA_SOURCES.find((s) => s.url === BAN_ENTRY);
  if (!entry) {
    throw new Error(
      `${BAN_ENTRY} n'est plus dans DATA_SOURCES : le dossier d'une adresse y lit la provenance ` +
        'du libellé et des coordonnées, et ne peut pas la réinventer ici.',
    );
  }
  return locale === 'en'
    ? { source: entry.nameEn, licence: entry.licenceEn }
    : { source: entry.name, licence: entry.licence };
}

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

