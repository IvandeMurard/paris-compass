-- Create table for user preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create table for saved searches
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for saved properties
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL, -- External property ID
  property_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, property_id)
);

-- Create table for notification settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  notification_frequency TEXT NOT NULL CHECK (notification_frequency IN ('immediate', 'daily', 'weekly', 'off')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, saved_search_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
--
-- This file duplicates 20250417000001 exactly: same four tables, same fourteen policy
-- names. `CREATE TABLE IF NOT EXISTS` made the tables survive that, but Postgres has no
-- `CREATE POLICY IF NOT EXISTS`, so replaying the whole set against a fresh database
-- failed here. It had never been caught because the two files have never both run: the
-- local database carries 20250417000001 only, and this one was applied on its own by
-- Lovable. A rehearsal on a virgin database found it before the switch did.
--
-- Each policy is dropped first, which makes the file idempotent and order-independent
-- without changing what it grants.
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" 
ON public.user_preferences
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" 
ON public.user_preferences
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" 
ON public.user_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved searches policies
DROP POLICY IF EXISTS "Users can view own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view own saved searches" 
ON public.saved_searches
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own saved searches" ON public.saved_searches;
CREATE POLICY "Users can create own saved searches" 
ON public.saved_searches
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update own saved searches" 
ON public.saved_searches
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete own saved searches" 
ON public.saved_searches
FOR DELETE USING (auth.uid() = user_id);

-- Saved properties policies
DROP POLICY IF EXISTS "Users can view own saved properties" ON public.saved_properties;
CREATE POLICY "Users can view own saved properties" 
ON public.saved_properties
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own saved properties" ON public.saved_properties;
CREATE POLICY "Users can create own saved properties" 
ON public.saved_properties
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved properties" ON public.saved_properties;
CREATE POLICY "Users can delete own saved properties" 
ON public.saved_properties
FOR DELETE USING (auth.uid() = user_id);

-- Notification settings policies
DROP POLICY IF EXISTS "Users can view own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view own notification settings" 
ON public.notification_settings
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own notification settings" ON public.notification_settings;
CREATE POLICY "Users can create own notification settings" 
ON public.notification_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update own notification settings" 
ON public.notification_settings
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notification settings" ON public.notification_settings;
CREATE POLICY "Users can delete own notification settings" 
ON public.notification_settings
FOR DELETE USING (auth.uid() = user_id);