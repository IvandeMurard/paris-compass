import React from 'react';
import PropertyCard from './PropertyCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePremises, useAreaEnvironment, PARIS_BBOX } from '@/hooks/useOpenData';
import { useFiltersContext } from '@/providers/FiltersProvider';

const PropertyList = () => {
  const { data, isLoading, isError, error } = usePremises(PARIS_BBOX);
  const { matches } = useFiltersContext();
  const center = {
    lat: (PARIS_BBOX.south + PARIS_BBOX.north) / 2,
    lng: (PARIS_BBOX.west + PARIS_BBOX.east) / 2,
  };
  const { data: environment } = useAreaEnvironment(center.lat, center.lng);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Données ouvertes indisponibles</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message ?? 'Les services publics interrogés n’ont pas répondu.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const premises = (data?.premises ?? []).filter(matches);

  if (!premises.length) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Aucun local ne correspond aux filtres dans les données ouvertes de cette zone.
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        {premises.length} locaux issus de données publiques réelles · mis à jour{' '}
        {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('fr-FR') : ''}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {premises.map((premise) => (
          <PropertyCard key={premise.id} premise={premise} airLabel={environment?.air?.label} />
        ))}
      </div>
    </div>
  );
};

export default PropertyList;
