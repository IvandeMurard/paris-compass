import React from 'react';
import PropertyCard from './PropertyCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePremises, useAreaEnvironment } from '@/hooks/useOpenData';
import { useFiltersContext } from '@/providers/FiltersProvider';
import { useLocale } from '@/i18n/locale';

const PropertyList = () => {
  const { t, locale } = useLocale();
  const { matches, bbox } = useFiltersContext();
  const { data, isLoading, isError, error } = usePremises(bbox);
  const center = {
    lat: (bbox.south + bbox.north) / 2,
    lng: (bbox.west + bbox.east) / 2,
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
          <AlertTitle>{t('list.errorTitle')}</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message ?? t('list.errorBody')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const premises = (data?.premises ?? []).filter(matches);

  if (!premises.length) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('list.empty')}
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        {premises.length} {t('list.countPrefix')} · {t('list.updatedAt')}{' '}
        {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString(locale === 'en' ? 'en-GB' : 'fr-FR') : ''}
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
