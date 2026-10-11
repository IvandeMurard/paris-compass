import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import SidebarSearch from './sidebar/SidebarSearch';
import BasicFilters from './sidebar/BasicFilters';
import AccessibilityMetrics from './sidebar/AccessibilityMetrics';
import DataSourcesPanel from './DataSourcesPanel';
import { useFiltersContext } from '@/providers/FiltersProvider';
import { useLocale } from '@/i18n/locale';

interface FiltersSheetProps {
  children?: React.ReactNode;
}

const FiltersSheet = ({ children }: FiltersSheetProps) => {
  const [open, setOpen] = React.useState(false);
  const {
    filters,
    vacantOnly,
    setVacantOnly,
    updateQuery,
    updateSizeRange,
    updateWalkabilityScore,
    updateAmenityScores,
    toggleArrondissement,
    reset,
  } = useFiltersContext();
  const { t } = useLocale();

  const activeCount =
    (filters.sizeRange[0] > 0 || filters.sizeRange[1] < 500 ? 1 : 0) +
    (filters.walkabilityScore[0] > 0 || filters.walkabilityScore[1] < 100 ? 1 : 0) +
    Object.values(filters.amenityScores).filter((s) => s > 0).length +
    filters.arrondissements.length +
    (vacantOnly ? 1 : 0) +
    (filters.query ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter size={16} />
            {t('filters.title')}
            {activeCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-0">
        <SheetHeader className="border-b px-4 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter size={18} />
              {t('filters.title')}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
              {t('filters.reset')}
            </Button>
          </div>
        </SheetHeader>

        <div className="p-4">
          <SidebarSearch query={filters.query} setQuery={updateQuery} />

          <div className="my-5 rounded-lg border bg-muted/40 p-3">
            <label className="flex items-center justify-between text-sm font-medium">
              {t('filters.vacantOnly')}
              <input
                type="checkbox"
                checked={vacantOnly}
                onChange={(e) => setVacantOnly(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </div>

          <BasicFilters
            sizeRange={filters.sizeRange}
            setSizeRange={updateSizeRange}
            selectedArrondissements={filters.arrondissements}
            onArrondissementToggle={toggleArrondissement}
          />

          <div className="mt-6 border-t pt-6">
            <AccessibilityMetrics
              walkabilityScore={filters.walkabilityScore}
              setWalkabilityScore={updateWalkabilityScore}
              amenityScores={filters.amenityScores}
              setAmenityScores={updateAmenityScores}
            />
          </div>

          <p className="mt-6 text-xs text-muted-foreground">{t('filters.live')}</p>
          <DataSourcesPanel className="mt-3 w-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FiltersSheet;
