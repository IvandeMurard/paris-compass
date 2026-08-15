// Custom type definitions for tables used by the application.
import type { Database } from '@/types/database';

export type SavedSearch = Database['public']['Tables']['saved_searches']['Row'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type SavedProperty = Database['public']['Tables']['saved_properties']['Row'];
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];
