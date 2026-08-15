import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { scoreLabel, type Measured } from '@/core';
import type { Poi, Premise } from '@/services/opendata/types';
import { useLocale, type Locale } from '@/i18n/locale';
import { describeFigure } from '@/i18n/figureText';
import { premiseAddressLabel, premiseTitle } from '@/i18n/premiseName';

const CATEGORY_COLORS: Record<string, string> = {
  schools: '#3b82f6',
  healthcare: '#ef4444',
  groceries: '#10b981',
  parks: '#22c55e',
  transit: '#8b5cf6',
  commerce: '#94a3b8',
};

/**
 * Popups are built as raw HTML strings, so anything coming from OpenStreetMap — a business
 * name, a neighbourhood — has to be escaped by hand. React does this for us everywhere else.
 */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

/**
 * A score as it appears in a Leaflet popup.
 *
 * These popups are raw HTML rather than React, so they cannot render `MeasuredScore` — but
 * they must not restate its rules either. This function used to reimplement them, badly: it
 * knew that an absent value reads "n/d" and that an estimate is flagged, but not that a
 * `note` outranks the generic wording, nor what to say about the absence. Two renderers,
 * two behaviours, one of them quietly poorer.
 *
 * `describeFigure` now decides for both; only the markup differs. The caveat becomes a
 * `title` rather than a link, a popup being no place to navigate away from.
 */
const figureHtml = (m: Measured<number>, locale: Locale) => {
  const { text, absent, caveat, marker } = describeFigure(m, locale);
  const body = escapeHtml(text);
  const title = caveat ? ` title="${escapeHtml(caveat)}"` : '';
  if (absent) return `<span class="opacity-70"${title}>${body}</span>`;
  if (!marker) return body;
  return `${body} <span class="text-[11px] opacity-70"${title}>(${escapeHtml(marker)})</span>`;
};

/**
 * Disc colour, keyed on the core's own bands.
 *
 * It used to carry its own five thresholds — 80/60/40/20 — while `scoreLabel` publishes
 * four, 80/60/40. The map and the card therefore disagreed: a score of 30 and a score of 10
 * were one label on the card and two colours on the map, and the 20 cut-off appeared in no
 * methodology. Reading the band from `scoreLabel` keeps a single scale, the published one.
 *
 * Grey, not red, for an unknown score: an absent figure must not read as a bad one.
 */
const BAND_COLOURS: Record<ReturnType<typeof scoreLabel>, string> = {
  Excellent: '#16a34a',
  Good: '#4ade80',
  Moderate: '#facc15',
  Low: '#ef4444',
};

function walkabilityColor(score: number | null) {
  return score === null ? '#94a3b8' : BAND_COLOURS[scoreLabel(score)];
}

/** Renders real premises, walkability and amenity layers computed from open data. */
export const useMapLayers = (map: L.Map | null, premises: Premise[], pois: Poi[]) => {
  const { locale, t } = useLocale();
  const [layers, setLayers] = useState<{
    markersLayer: L.LayerGroup | null;
    walkabilityLayer: L.LayerGroup | null;
    accessibilityLayer: L.LayerGroup | null;
  }>({ markersLayer: null, walkabilityLayer: null, accessibilityLayer: null });
  const layersRef = useRef(layers);

  useEffect(() => {
    if (!map) return;

    const markersLayer = L.layerGroup().addTo(map);
    const walkabilityLayer = L.layerGroup();
    const accessibilityLayer = L.layerGroup();

    premises.forEach((premise) => {
      const marker = L.circleMarker([premise.lat, premise.lng], {
        radius: premise.status === 'vacant' ? 8 : 5,
        color: premise.status === 'vacant' ? '#0f766e' : '#64748b',
        fillColor: premise.status === 'vacant' ? '#14b8a6' : '#cbd5e1',
        fillOpacity: 0.9,
        weight: 2,
      }).bindPopup(`
        <div class="p-1">
          <strong>${escapeHtml(premiseTitle(premise.naming, premise.status, locale))}</strong><br/>
          <span>${escapeHtml(premiseAddressLabel(premise.address, locale))}</span><br/>
          <span>${t('map.popup.walkability')} ${figureHtml(premise.scores.walkability, locale)} · ${t('map.popup.footfall')} ${figureHtml(premise.scores.footfall, locale)}</span><br/>
          <span>${
            premise.residentialRentEurM2 !== null
              ? `${t('map.popup.residentialRent')} ${premise.residentialRentEurM2} €/m²${
                  premise.quartier ? ` · ${escapeHtml(premise.quartier)}` : ''
                }${premise.residentialRentYear ? ` · ${premise.residentialRentYear}` : ''}`
              : t('map.popup.noQuartier')
          }</span><br/>
          <span class="text-[11px] opacity-70">${escapeHtml(premise.scores.walkability.source)} · ${premise.scores.walkability.asOf}</span>
        </div>
      `);
      markersLayer.addLayer(marker);

      // One disc per premise, so the radius has to stay well under the spacing between
      // premises. At 220 m in a street as dense as Montorgueil the discs merged into an
      // opaque sheet that hid the map. 30 m reads as a score dot and keeps the streets legible.
      const circle = L.circle([premise.lat, premise.lng], {
        radius: 30,
        color: '#ffffff',
        fillColor: walkabilityColor(premise.scores.walkability.value),
        fillOpacity: 0.85,
        weight: 1,
      }).bindTooltip(
        `${t('map.popup.walkability')} : ${figureHtml(premise.scores.walkability, locale)}`,
      );
      walkabilityLayer.addLayer(circle);
    });

    pois.forEach((poi) => {
      const dot = L.circleMarker([poi.lat, poi.lng], {
        radius: 4,
        color: CATEGORY_COLORS[poi.category] ?? '#64748b',
        fillColor: CATEGORY_COLORS[poi.category] ?? '#64748b',
        fillOpacity: 0.8,
        weight: 1,
      }).bindTooltip(`${poi.name ?? poi.category} · OpenStreetMap`);
      accessibilityLayer.addLayer(dot);
    });

    layersRef.current = { markersLayer, walkabilityLayer, accessibilityLayer };
    setLayers(layersRef.current);

    return () => {
      markersLayer.remove();
      walkabilityLayer.remove();
      accessibilityLayer.remove();
    };
    // `locale` is a dependency: popup HTML is built once here, so switching language has to
    // rebuild the layers or the popups keep the previous language.
  }, [map, premises, pois, locale, t]);

  return layers;
};
