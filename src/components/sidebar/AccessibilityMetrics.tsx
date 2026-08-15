import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MapPin, School, Hospital, Store, TreePine } from 'lucide-react';
import { useLocale } from '@/i18n/locale';
import type { UiKey } from '@/i18n/ui';
import type { AmenityScore } from '@/types/filters';

interface AccessibilityMetricsProps {
  walkabilityScore: number[];
  setWalkabilityScore: (value: number[]) => void;
  amenityScores: AmenityScore;
  /**
   * Takes a patch, never an updater function. Typing this `any` is what let the sliders
   * ship inert: the call site passed `(prev) => ({...})`, the provider spread it into
   * state, and spreading a function yields no enumerable properties — so nothing changed
   * and nothing complained.
   */
  setAmenityScores: (scores: Partial<AmenityScore>) => void;
}

const AMENITIES: { name: keyof AccessibilityMetricsProps['amenityScores']; icon: JSX.Element; labelKey: UiKey }[] = [
  { name: 'schools', icon: <School size={14} />, labelKey: 'amenity.schools' },
  { name: 'healthcare', icon: <Hospital size={14} />, labelKey: 'amenity.healthcare' },
  { name: 'groceries', icon: <Store size={14} />, labelKey: 'amenity.groceries' },
  { name: 'transit', icon: <MapPin size={14} />, labelKey: 'amenity.transit' },
  { name: 'parks', icon: <TreePine size={14} />, labelKey: 'amenity.parks' },
];

const AccessibilityMetrics = ({
  walkabilityScore,
  setWalkabilityScore,
  amenityScores,
  setAmenityScores,
}: AccessibilityMetricsProps) => {
  const { t } = useLocale();

  return (
    <>
      <div className="mb-4">
        <Label htmlFor="walkability" className="flex items-center mb-2">
          <MapPin size={16} className="mr-2" />
          {t('filters.walkability')}
        </Label>
        <Slider
          id="walkability"
          min={0}
          max={100}
          step={1}
          value={walkabilityScore}
          onValueChange={setWalkabilityScore}
          className="mb-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{walkabilityScore[0]}</span>
          <span>{walkabilityScore[1]}</span>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="flex items-center mb-2">{t('filters.minAmenityScores')}</Label>
        <div className="grid gap-4">
          {AMENITIES.map((a) => (
            <div key={a.name}>
              <Label htmlFor={`amenity-score-${a.name}`} className="flex items-center mb-1 text-xs">
                <span className="mr-2">{a.icon}</span>
                {t(a.labelKey)}
              </Label>
              <Slider
                id={`amenity-score-${a.name}`}
                min={0}
                max={100}
                step={1}
                value={[amenityScores[a.name]]}
                onValueChange={(value) => setAmenityScores({ [a.name]: value[0] })}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AccessibilityMetrics;
