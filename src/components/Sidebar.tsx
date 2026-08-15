import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import SidebarSearch from './sidebar/SidebarSearch';
import BasicFilters from './sidebar/BasicFilters';
import AccessibilityMetrics from './sidebar/AccessibilityMetrics';
import DataSourcesPanel from './DataSourcesPanel';
import { useFiltersContext } from '@/providers/FiltersProvider';
import { useLocale } from '@/i18n/locale';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar = ({ isOpen }: SidebarProps) => {
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

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white shadow-lg w-80 transition-transform duration-300 z-10 overflow-y-auto 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <div className="p-4">
        <SidebarSearch query={filters.query} setQuery={updateQuery} />

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center">
              <Filter size={16} className="mr-2" />
              {t('filters.title')}
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={reset}>
              {t('filters.reset')}
            </Button>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="vacant-only" className="text-sm">
              {t('filters.vacantOnly')}
            </Label>
            <Switch id="vacant-only" checked={vacantOnly} onCheckedChange={setVacantOnly} />
          </div>

          <BasicFilters
            sizeRange={filters.sizeRange}
            setSizeRange={updateSizeRange}
            selectedArrondissements={filters.arrondissements}
            onArrondissementToggle={toggleArrondissement}
          />

          <AccessibilityMetrics
            walkabilityScore={filters.walkabilityScore}
            setWalkabilityScore={updateWalkabilityScore}
            amenityScores={filters.amenityScores}
            setAmenityScores={updateAmenityScores}
          />

          <p className="mt-6 text-xs text-muted-foreground">
            {t('filters.live')}
          </p>
          <DataSourcesPanel className="mt-3 w-full" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
