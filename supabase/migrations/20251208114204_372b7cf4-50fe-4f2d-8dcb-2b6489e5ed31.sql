-- Create connected_providers table for wearable connections
CREATE TABLE public.connected_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('strava', 'fitbit', 'apple_health', 'ultrahuman')),
  external_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scopes JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create fitness_sessions table for workouts/activities
CREATE TABLE public.fitness_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_activity_id TEXT,
  type TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  distance_meters INTEGER,
  calories INTEGER,
  avg_hr INTEGER,
  max_hr INTEGER,
  raw_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_metrics table for daily summaries
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  provider TEXT NOT NULL,
  steps INTEGER,
  active_minutes INTEGER,
  calories_burned INTEGER,
  sleep_hours NUMERIC(4,2),
  recovery_score NUMERIC(4,2),
  resting_hr INTEGER,
  hrv INTEGER,
  raw_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, provider)
);

-- Enable RLS on all tables
ALTER TABLE public.connected_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for connected_providers
CREATE POLICY "Users can view their own connected providers"
ON public.connected_providers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can connect providers"
ON public.connected_providers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
ON public.connected_providers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can disconnect providers"
ON public.connected_providers FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for fitness_sessions
CREATE POLICY "Users can view their own fitness sessions"
ON public.fitness_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness sessions"
ON public.fitness_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness sessions"
ON public.fitness_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness sessions"
ON public.fitness_sessions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for daily_metrics
CREATE POLICY "Users can view their own daily metrics"
ON public.daily_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily metrics"
ON public.daily_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily metrics"
ON public.daily_metrics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily metrics"
ON public.daily_metrics FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_connected_providers_user ON public.connected_providers(user_id);
CREATE INDEX idx_fitness_sessions_user ON public.fitness_sessions(user_id);
CREATE INDEX idx_fitness_sessions_start_time ON public.fitness_sessions(start_time);
CREATE INDEX idx_daily_metrics_user_date ON public.daily_metrics(user_id, date);

-- Trigger to update updated_at
CREATE TRIGGER update_connected_providers_updated_at
BEFORE UPDATE ON public.connected_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();