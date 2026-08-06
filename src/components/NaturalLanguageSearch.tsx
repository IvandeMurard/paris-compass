import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mic } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

interface NLSearchProps {
  onSearch: (query: string) => void;
  className?: string;
}

const NaturalLanguageSearch = ({ onSearch, className = '' }: NLSearchProps) => {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const searchSuggestions = [
    t('search.suggestion1'),
    t('search.suggestion2'),
    t('search.suggestion3'),
    t('search.suggestion4'),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  const toggleVoiceRecognition = () => setIsListening((v) => !v);

  return (
    <div className={`${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('search.voice')}
          className={`absolute right-1 top-1 ${isListening ? 'text-primary' : ''}`}
          onClick={toggleVoiceRecognition}
        >
          <Mic size={18} />
        </Button>
      </form>

      {query === '' && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-1">{t('search.trySearching')}</p>
          <div className="flex flex-wrap gap-2">
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded-md"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NaturalLanguageSearch;
