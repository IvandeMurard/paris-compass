import { fetchJson } from './http';

const API = 'https://recherche-entreprises.api.gouv.fr';

export interface Establishment {
  siret: string;
  name: string;
  activity?: string;
  address?: string;
  lat: number;
  lng: number;
  createdAt?: string;
}

interface SearchResponse {
  results: {
    nom_complet?: string;
    matching_etablissements?: {
      siret?: string;
      adresse?: string;
      latitude?: string;
      longitude?: string;
      activite_principale?: string;
      libelle_activite_principale?: string;
      date_creation?: string;
      etat_administratif?: string;
    }[];
  }[];
}

/**
 * Active establishments around a point (Sirene / INSEE via the
 * recherche-entreprises API — open access, no key required).
 * Used as a proxy for local commercial dynamism.
 */
export async function fetchEstablishmentsNear(
  lat: number,
  lng: number,
  radiusKm = 0.5,
  limit = 25,
): Promise<Establishment[]> {
  const url =
    `${API}/near_point?lat=${lat.toFixed(5)}&long=${lng.toFixed(5)}` +
    `&radius=${radiusKm}&per_page=${limit}&page=1`;

  try {
    const data = await fetchJson<SearchResponse>(url, {
      cacheKey: `sirene:${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm}`,
      maxAgeMs: 12 * 60 * 60 * 1000,
    });

    const establishments: Establishment[] = [];
    for (const company of data.results ?? []) {
      for (const et of company.matching_etablissements ?? []) {
        if (et.etat_administratif && et.etat_administratif !== 'A') continue;
        const etLat = Number(et.latitude);
        const etLng = Number(et.longitude);
        if (!Number.isFinite(etLat) || !Number.isFinite(etLng)) continue;
        establishments.push({
          siret: et.siret ?? `${etLat}-${etLng}`,
          name: company.nom_complet ?? 'Établissement',
          activity: et.libelle_activite_principale ?? et.activite_principale,
          address: et.adresse,
          lat: etLat,
          lng: etLng,
          createdAt: et.date_creation,
        });
      }
    }
    return establishments;
  } catch (error) {
    console.error('Sirene lookup failed', error);
    return [];
  }
}
