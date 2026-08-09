
import { createClient } from '@supabase/supabase-js';
import type { Database as GeneratedDatabase } from './types';

const SUPABASE_URL = "https://dbefhvmyfmmhjeetdddu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JbcXM8Z_k6ND5jyaiWU3kQ_wVGzamwD";

// Extend the generated database type with our custom tables
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: {
    Tables: {
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: Record<string, any>;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filters?: Record<string, any>;
          created_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_notifications: boolean;
          push_notifications: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications: boolean;
          push_notifications: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_notifications?: boolean;
          push_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_properties: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          property_data: {
            name?: string;
            [key: string]: any;
          };
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          property_data: {
            name?: string;
            [key: string]: any;
          };
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          property_data?: {
            name?: string;
            [key: string]: any;
          };
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: GeneratedDatabase['public']['Views'];
    Functions: GeneratedDatabase['public']['Functions'];
    Enums: GeneratedDatabase['public']['Enums'];
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes'];
  };
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// We're creating the client with our extended Database type for better type checking
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
