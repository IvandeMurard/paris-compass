import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OverpassUnreachableError, OVERPASS_HOSTS } from '@/services/opendata/overpass';
import { useLocale } from '@/i18n/locale';

interface OpenDataErrorNoticeProps {
  error: unknown;
  onRetry: () => void;
  className?: string;
}

/**
 * The failure the map cannot show by itself.
 *
 * When Overpass is unreachable the base tiles still paint, so the screen looks like a normal
 * map over an empty neighbourhood — the most misleading state this product has. Naming the
 * hosts that failed is what lets a user tell "no premises here" from "my network blocks this".
 */
const OpenDataErrorNotice = ({ error, onRetry, className = '' }: OpenDataErrorNoticeProps) => {
  const { t } = useLocale();
  const blocked = error instanceof OverpassUnreachableError && error.blocked;

  return (
    <div
      role="alert"
      className={`rounded-md border border-destructive/40 bg-background/95 p-4 shadow-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {blocked ? t('map.blocked.title') : t('map.unavailable')}
          </p>
          {blocked && (
            <>
              <p className="text-xs text-muted-foreground">{t('map.blocked.body')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('map.blocked.hosts')} {OVERPASS_HOSTS.join(', ')}
              </p>
            </>
          )}
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpenDataErrorNotice;
