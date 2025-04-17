
import { Database } from '@/integrations/supabase/types';

// Custom type definitions for tables we need
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, any>;
  created_at?: string;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  property_data: {
    name?: string;
    [key: string]: any;
  };
  created_at?: string;
}

// Type-safe client wrapper functions
export const typedSupabaseQuery = <T>(tableName: string) => {
  // This works around the type constraints while maintaining the same API
  return {
    table: tableName,
    queryType: null as unknown as T
  };
};

