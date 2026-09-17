import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mic, ArrowRight } from 'lucide-react';
import { useLocale } from '@/i18n/locale';

interface NLSearchProps {
  onSearch: (query: string) => void;
  className?: string;
  size?: 'default' | 'hero';
}

const NaturalLanguageSearch = ({ onSearch, className = '', size = 'default' }: NLSearchProps) => {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const suggestions = [
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

  const isHero = size === 'hero';

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isHero ? 'h-5 w-5 left-4' : 'h-4 w-4'}`} />
        <Input
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`pr-20 ${isHero ? 'h-14 pl-12 text-base' : 'pl-9'}`}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('search.voice')}
            onClick={toggleVoiceRecognition}
            className={`${isListening ? 'text-primary' : 'text-muted-foreground'} ${isHero ? 'h-10 w-10' : 'h-7 w-7'}`}
          >
            <Mic size={isHero ? 18 : 16} />
          </Button>
          <Button
            type="submit"
            size={isHero ? 'default' : 'sm'}
            className={`${isHero ? 'h-11 px-4 gap-1' : 'h-7 px-2'}`}
          >
            {isHero && <ArrowRight size={16} />}
            {!isHero && <Search size={14} />}
          </Button>
        </div>
      </form>

      {query === '' && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1.5">{t('search.trySearching')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-muted hover:bg-accent hover:text-accent-foreground text-muted-foreground px-2.5 py-1 rounded-full transition-colors"
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
