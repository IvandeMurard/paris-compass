import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Building, MapPin } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

interface BasicFiltersProps {
  sizeRange: number[];
  setSizeRange: (value: number[]) => void;
}

// There is deliberately no rent filter: commercial rents are not published as open data
// in France, so Compass has no figure to filter on. See DIAGNOSTIC.md §1.
const BasicFilters = ({ sizeRange, setSizeRange }: BasicFiltersProps) => {
  const { t } = useLocale();

  return (
    <>
      <div className="mb-4">
        <Label htmlFor="size" className="flex items-center mb-2">
          <Building size={16} className="mr-2" />
          {t('filters.size')}
        </Label>
        <Slider
          id="size"
          min={0}
          max={500}
          step={10}
          value={sizeRange}
          onValueChange={setSizeRange}
          className="mb-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{sizeRange[0]} m²</span>
          <span>{sizeRange[1]} m²</span>
        </div>
      </div>

      <div className="mb-4">
        <Label className="flex items-center mb-2">
          <MapPin size={16} className="mr-2" />
          {t('filters.arrondissement')}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="flex items-center space-x-1">
              <Checkbox id={`arr-${i + 1}`} />
              <label
                htmlFor={`arr-${i + 1}`}
                className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {i + 1}
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default BasicFilters;
