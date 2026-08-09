import { supabase as rawSupabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// The auto-generated Lovable Cloud client uses a minimal Database type while
// the app defines its own tables in src/types/database.ts. This wrapper re-exports
// the same singleton client with the full application schema so query calls are typed.
export const supabase = rawSupabase as unknown as SupabaseClient<Database>;
