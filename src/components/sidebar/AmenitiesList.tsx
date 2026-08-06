import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, TreePine, ShoppingCart, Baby, Tag } from 'lucide-react';
import { useLocale } from '@/i18n/locale';
import type { UiKey } from '@/i18n/ui';

interface AmenitiesListProps {
  selectedAmenities: string[];
  onAmenityToggle: (amenity: string) => void;
}

/** `name` is the stable filter value; the label is translated for display. */
const AMENITIES: { name: string; labelKey: UiKey; icon: JSX.Element }[] = [
  { name: 'Metro Station', labelKey: 'amenity.metro', icon: <MapPin size={14} className="mr-2" /> },
  { name: 'Park', labelKey: 'amenity.park', icon: <TreePine size={14} className="mr-2" /> },
  { name: 'Shopping Center', labelKey: 'amenity.mall', icon: <ShoppingCart size={14} className="mr-2" /> },
  { name: 'Restaurant Area', labelKey: 'amenity.restaurants', icon: <MapPin size={14} className="mr-2" /> },
  { name: 'Parking Available', labelKey: 'amenity.parking', icon: <MapPin size={14} className="mr-2" /> },
  { name: 'Daycare', labelKey: 'amenity.daycare', icon: <Baby size={14} className="mr-2" /> },
  { name: 'Markets', labelKey: 'amenity.markets', icon: <ShoppingCart size={14} className="mr-2" /> },
];

const AmenitiesList = ({ selectedAmenities, onAmenityToggle }: AmenitiesListProps) => {
  const { t } = useLocale();

  return (
    <div className="mb-4">
      <Label className="flex items-center mb-2">
        <Tag size={16} className="mr-2" />
        {t('filters.amenities')}
      </Label>
      <div className="space-y-2">
        {AMENITIES.map((amenity) => (
          <div key={amenity.name} className="flex items-center space-x-2">
            <Checkbox
              id={`amenity-${amenity.name}`}
              checked={selectedAmenities.includes(amenity.name)}
              onCheckedChange={() => onAmenityToggle(amenity.name)}
            />
            <label
              htmlFor={`amenity-${amenity.name}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
            >
              {amenity.icon} {t(amenity.labelKey)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AmenitiesList;
