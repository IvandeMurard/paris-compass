
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://pulfdlztjbkgydmyrkfy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bGZkbHp0amJrZ3lkbXlya2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDg5MTgsImV4cCI6MjA2MDI4NDkxOH0.jQr0zRewcfgagulvHU7PEWVFLrhPaefSf7-zdzY3Vt8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// We're creating the client with the Database type for better type checking,
// but we may need to use type assertions for tables not defined in the schema
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
