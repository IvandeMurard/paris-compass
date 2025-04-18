
import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

interface SidebarSearchProps {
  query: string;
  setQuery: (query: string) => void;
}

const SidebarSearch = ({ query, setQuery }: SidebarSearchProps) => {
  return (
    <div className="mb-6">
      <div className="relative">
        <Input
          placeholder="Find a commercial space..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10"
        />
        <Search className="absolute top-2.5 right-3 h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Try: "Find a 50m² space in the 10th arrondissement near a park"
      </p>
    </div>
  );
};

export default SidebarSearch;
