
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic } from 'lucide-react';

interface NLSearchProps {
  onSearch: (query: string) => void;
  className?: string;
}

const NaturalLanguageSearch = ({ onSearch, className = '' }: NLSearchProps) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Sample search suggestions (would be dynamically generated in a full implementation)
  const searchSuggestions = [
    "Find a 50m² space in the 10th near a park",
    "Commercial space with high footfall under €2000",
    "Quiet office in 16th with good air quality",
    "Shop near metro station with parking"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  // Voice recognition simulation (would be implemented with Web Speech API)
  const toggleVoiceRecognition = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setQuery("Find commercial space near Opera with good air quality");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <div className={`${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search in natural language..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`absolute right-1 top-1 ${isListening ? 'text-primary' : ''}`}
          onClick={toggleVoiceRecognition}
        >
          <Mic size={18} />
        </Button>
      </form>
      
      {query === '' && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-1">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={index}
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
