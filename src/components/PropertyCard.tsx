import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Ruler, MapPin, Users, Wind, Volume2, Footprints, ExternalLink } from 'lucide-react';
import type { Premise } from '@/services/opendata/types';
import { noiseLabel, scoreLabel } from '@/services/opendata/scoring';
import { MeasuredOrigin, MeasuredScore } from '@/components/MeasuredFigure';
import { useLocale } from '@/i18n/locale';
import { translateLabel } from '@/i18n/labels';

const COPY = {
  fr: {
    available: 'Disponible', occupied: 'Occupé', arr: 'e arrondissement',
    residential: 'Loyer résidentiel du quartier',
    residentialUnit: '€/m²',
    residentialHint: 'niveau de vie du quartier — pas un loyer commercial',
    noResidential: 'Quartier non renseigné',
    noSize: 'Surface non renseignée', walkability: 'Marchabilité', footfall: 'Flux', air: 'Air',
    noise: 'Bruit', sources: 'Sources : OpenStreetMap, Ville de Paris, Copernicus', detail: 'Détail', na: 'n/d',
  },
  en: {
    available: 'Available', occupied: 'Occupied', arr: 'th arrondissement',
    residential: 'Neighbourhood residential rent',
    residentialUnit: '€/m²',
    residentialHint: 'standard of living — not a commercial rent',
    noResidential: 'Neighbourhood not available',
    noSize: 'Size not specified', walkability: 'Walkability', footfall: 'Footfall', air: 'Air',
    noise: 'Noise', sources: 'Sources: OpenStreetMap, Ville de Paris, Copernicus', detail: 'Details', na: 'n/a',
  },
} as const;

interface PropertyCardProps {
  premise: Premise;
  airLabel?: string;
}

const toneFor = (label: string) => {
  switch (label.toLowerCase()) {
    case 'excellent':
      return 'bg-green-100 text-green-800';
    case 'good':
    case 'very low':
    case 'low':
      return 'bg-emerald-100 text-emerald-800';
    case 'moderate':
      return 'bg-amber-100 text-amber-800';
    case 'high':
    case 'poor':
    case 'very poor':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const PropertyCard = ({ premise, airLabel }: PropertyCardProps) => {
  const osmUrl = `https://www.openstreetmap.org/${premise.id}`;

  const { locale } = useLocale();
  const c = COPY[locale];

  // Labels are derived here rather than in the score component: turning a number into a
  // word is a presentation choice, whereas showing the caveat is not optional.
  const walk = premise.scores.walkability;
  const walkLabel = walk.value === null ? undefined : translateLabel(scoreLabel(walk.value), locale);
  const noise = premise.scores.noise;
  const noiseLabelText =
    noise.value === null ? undefined : translateLabel(noiseLabel(noise.value), locale);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-medium text-lg leading-tight">{premise.title}</h3>
          <Badge variant={premise.status === 'vacant' ? 'default' : 'secondary'} className="shrink-0">
            {premise.status === 'vacant' ? c.available : c.occupied}
          </Badge>
        </div>

        {premise.arrondissement && (
          <Badge variant="outline" className="text-xs mb-2">
            {premise.arrondissement}{c.arr}
          </Badge>
        )}

        <div className="space-y-2">
          {/* Catchment-area signal, deliberately not a price. Commercial rents are not
              published as open data in France. See DIAGNOSTIC.md §1. */}
          <div className="flex items-start text-sm">
            <Home size={16} className="mr-2 mt-0.5 text-primary shrink-0" />
            {premise.residentialRentEurM2 !== null ? (
              <span>
                {c.residential} : {premise.residentialRentEurM2} {c.residentialUnit}
                {premise.quartier ? ` · ${premise.quartier}` : ''}
                {premise.residentialRentYear ? ` · ${premise.residentialRentYear}` : ''}
                <span className="block text-xs text-muted-foreground">{c.residentialHint}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{c.noResidential}</span>
            )}
          </div>

          <div className="flex items-center text-sm">
            <Ruler size={16} className="mr-2 text-primary shrink-0" />
            <span>{premise.sizeM2 ? `${premise.sizeM2} m²` : c.noSize}</span>
          </div>

          <div className="flex items-start text-sm">
            <MapPin size={16} className="mr-2 mt-0.5 text-primary shrink-0" />
            <span>{premise.address}</span>
          </div>

          <div className="flex items-start text-sm">
            <Footprints size={16} className="mr-2 mt-0.5 text-primary shrink-0" />
            <span>
              {c.walkability} <MeasuredScore measured={premise.scores.walkability} />
              {walkLabel ? ` · ${walkLabel}` : ''}
              <span className="mt-0.5 block">
                <MeasuredOrigin measured={premise.scores.walkability} />
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center">
            <Users size={14} className="mb-1" />
            <Badge variant="secondary" className="font-normal">
              {c.footfall} <MeasuredScore measured={premise.scores.footfall} />
            </Badge>
          </div>
          <div className="flex flex-col items-center">
            <Wind size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${toneFor(airLabel ?? '')}`}>
              {c.air} {translateLabel(airLabel, locale) ?? c.na}
            </Badge>
          </div>
          <div className="flex flex-col items-center">
            <Volume2 size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${toneFor(noiseLabelText ?? '')}`}>
              {c.noise} <MeasuredScore measured={premise.scores.noise} display={noiseLabelText} />
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t bg-muted/30 px-4 py-3">
        <span className="text-[11px] text-muted-foreground">
          {c.sources}
        </span>
        <Button variant="ghost" size="sm" asChild>
          <a href={osmUrl} target="_blank" rel="noreferrer">
            {c.detail} <ExternalLink size={14} className="ml-1" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
