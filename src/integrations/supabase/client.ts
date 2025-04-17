
import { createClient } from '@supabase/supabase-js';
import type { Database as GeneratedDatabase } from './types';

const SUPABASE_URL = "https://pulfdlztjbkgydmyrkfy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bGZkbHp0amJrZ3lkbXlya2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDg5MTgsImV4cCI6MjA2MDI4NDkxOH0.jQr0zRewcfgagulvHU7PEWVFLrhPaefSf7-zdzY3Vt8";

// Extend the generated database type with our custom tables
export interface Database extends GeneratedDatabase {
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
      };
    };
    Views: GeneratedDatabase['public']['Views'];
    Functions: GeneratedDatabase['public']['Functions'];
    Enums: GeneratedDatabase['public']['Enums'];
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes'];
  };
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// We're creating the client with our extended Database type for better type checking
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
