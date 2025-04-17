
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { SavedSearch, SavedProperty } from '@/types/supabase';

interface PropertyMatch {
  id: string;
  name: string;
  searchId: string;
  searchName: string;
  timestamp: string;
}

export function usePropertyNotifications() {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved searches
  useEffect(() => {
    if (!user) return;

    const fetchSavedSearches = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('saved_searches')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        setSavedSearches(data || []);
      } catch (error) {
        console.error('Error fetching saved searches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedSearches();

    // Subscribe to real-time updates on new property matches
    const subscription = supabase
      .channel('saved_properties_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'saved_properties', filter: `user_id=eq.${user.id}` }, 
        (payload: { new: SavedProperty }) => {
          const newProperty = payload.new;
          
          // Display a toast notification
          toast({
            title: 'New Property Match!',
            description: `A new property matching your search criteria is available.`,
            duration: 5000,
          });
          
          // Add to our matches state
          setMatches(prev => [...prev, {
            id: newProperty.id,
            name: newProperty.property_data.name || 'New Property',
            searchId: 'auto',
            searchName: 'Automatic Match',
            timestamp: new Date().toISOString()
          }]);
        })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    savedSearches,
    matches,
    loading
  };
}
