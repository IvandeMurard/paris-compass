import React from 'react';
import { DATA_SOURCES } from '@/services/opendata/sources';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Database, ExternalLink } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

const COPY = {
  fr: {
    description: 'Compass n’utilise que des jeux de données publics, interrogés en direct.',
    licence: 'Licence',
    open: 'Consulter',
  },
  en: {
    description: 'Compass only uses public datasets, queried live.',
    licence: 'Licence',
    open: 'View',
  },
} as const;

const DataSourcesPanel = ({ className = '' }: { className?: string }) => {
  const { t, locale } = useLocale();
  const c = COPY[locale];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Database size={14} className="mr-1" /> {t('sources.title')}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('sources.title')}</SheetTitle>
          <SheetDescription>{c.description}</SheetDescription>
        </SheetHeader>

        <ul className="mt-6 space-y-5">
          {DATA_SOURCES.map((source) => (
            <li key={source.name} className="border-b pb-4 last:border-0">
              <div className="font-medium">{locale === 'en' ? source.nameEn : source.name}</div>
              <div className="text-xs text-muted-foreground">
                {locale === 'en' ? source.providerEn : source.provider}
              </div>
              <p className="mt-1 text-sm">{locale === 'en' ? source.usageEn : source.usage}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {c.licence} : {locale === 'en' ? source.licenceEn : source.licence}
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-primary hover:underline"
                >
                  {c.open} <ExternalLink size={12} className="ml-1" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
};

export default DataSourcesPanel;
