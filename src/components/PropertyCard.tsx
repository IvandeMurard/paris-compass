import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Euro, Ruler, MapPin, Users, Wind, Volume2, Footprints, ExternalLink } from 'lucide-react';
import type { Premise } from '@/services/opendata/types';
import { scoreLabel } from '@/services/opendata/scoring';

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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-medium text-lg leading-tight">{premise.title}</h3>
          <Badge variant={premise.status === 'vacant' ? 'default' : 'secondary'} className="shrink-0">
            {premise.status === 'vacant' ? 'Disponible' : 'Occupé'}
          </Badge>
        </div>

        {premise.arrondissement && (
          <Badge variant="outline" className="text-xs mb-2">
            {premise.arrondissement}e arrondissement
          </Badge>
        )}

        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Euro size={16} className="mr-2 text-primary shrink-0" />
            {premise.estimatedMonthlyRent !== null ? (
              <span className="font-medium">
                ~{premise.estimatedMonthlyRent.toLocaleString('fr-FR')} €/mois{' '}
                <span className="text-xs font-normal text-muted-foreground">(estimation)</span>
              </span>
            ) : premise.rentReferenceEurM2 !== null ? (
              <span>
                {premise.rentReferenceEurM2} €/m² de référence
                {premise.rentQuartier ? ` · ${premise.rentQuartier}` : ''}
              </span>
            ) : (
              <span className="text-muted-foreground">Loyer non disponible</span>
            )}
          </div>

          <div className="flex items-center text-sm">
            <Ruler size={16} className="mr-2 text-primary shrink-0" />
            <span>{premise.sizeM2 ? `${premise.sizeM2} m²` : 'Surface non renseignée'}</span>
          </div>

          <div className="flex items-start text-sm">
            <MapPin size={16} className="mr-2 mt-0.5 text-primary shrink-0" />
            <span>{premise.address}</span>
          </div>

          <div className="flex items-center text-sm">
            <Footprints size={16} className="mr-2 text-primary shrink-0" />
            <span>
              Marchabilité {premise.scores.walkability}/100 ·{' '}
              {scoreLabel(premise.scores.walkability)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center">
            <Users size={14} className="mb-1" />
            <Badge variant="secondary" className="font-normal">
              Flux {premise.scores.footfall}/100
            </Badge>
          </div>
          <div className="flex flex-col items-center">
            <Wind size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${toneFor(airLabel ?? '')}`}>
              Air {airLabel ?? 'n/d'}
            </Badge>
          </div>
          <div className="flex flex-col items-center">
            <Volume2 size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${toneFor(premise.noise.label)}`}>
              Bruit {premise.noise.label}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t bg-muted/30 px-4 py-3">
        <span className="text-[11px] text-muted-foreground">
          Sources : OpenStreetMap, Ville de Paris, Copernicus
        </span>
        <Button variant="ghost" size="sm" asChild>
          <a href={osmUrl} target="_blank" rel="noreferrer">
            Détail <ExternalLink size={14} className="ml-1" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
