import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

interface MapPanelCardProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const MapPanelCard = ({ title, children, defaultOpen = true, className = '' }: MapPanelCardProps) => {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border bg-card/95 p-3 shadow-md backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-sm font-semibold text-card-foreground">{title}</div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t('aria.collapse') : t('aria.expand')}
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
};

export default MapPanelCard;
