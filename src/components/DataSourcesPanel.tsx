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

const DataSourcesPanel = ({ className = '' }: { className?: string }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className={className}>
        <Database size={14} className="mr-1" /> Sources
      </Button>
    </SheetTrigger>
    <SheetContent className="overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Sources de données</SheetTitle>
        <SheetDescription>
          Compass n’utilise que des jeux de données publics, interrogés en direct.
        </SheetDescription>
      </SheetHeader>

      <ul className="mt-6 space-y-5">
        {DATA_SOURCES.map((source) => (
          <li key={source.name} className="border-b pb-4 last:border-0">
            <div className="font-medium">{source.name}</div>
            <div className="text-xs text-muted-foreground">{source.provider}</div>
            <p className="mt-1 text-sm">{source.usage}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Licence : {source.licence}</span>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-primary hover:underline"
              >
                Consulter <ExternalLink size={12} className="ml-1" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </SheetContent>
  </Sheet>
);

export default DataSourcesPanel;
