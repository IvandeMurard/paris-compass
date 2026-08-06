import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

interface SidebarSearchProps {
  query: string;
  setQuery: (query: string) => void;
}

const SidebarSearch = ({ query, setQuery }: SidebarSearchProps) => {
  const { t } = useLocale();

  return (
    <div className="mb-6">
      <div className="relative">
        <Input
          placeholder={t('search.sidebarPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10"
        />
        <Search className="absolute top-2.5 right-3 h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{t('search.hint')}</p>
    </div>
  );
};

export default SidebarSearch;
