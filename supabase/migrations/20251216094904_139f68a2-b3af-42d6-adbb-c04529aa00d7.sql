-- Create table for manually tagged match video events
CREATE TABLE public.match_video_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('goal', 'assist', 'key-pass', 'dribble')),
  timestamp_seconds integer NOT NULL,
  player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_name text,
  jersey_number integer,
  generate_highlight boolean DEFAULT false,
  clip_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_video_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Match video events viewable by everyone"
ON public.match_video_events
FOR SELECT
USING (true);

CREATE POLICY "Admins and match hosts can manage video events"
ON public.match_video_events
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM matches m WHERE m.id = match_video_events.match_id AND m.host_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM matches m
    JOIN turf_owners to2 ON to2.turf_id = m.turf_id
    WHERE m.id = match_video_events.match_id AND to2.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_match_video_events_match_id ON public.match_video_events(match_id);
CREATE INDEX idx_match_video_events_type ON public.match_video_events(event_type);

-- Update trigger
CREATE TRIGGER update_match_video_events_updated_at
BEFORE UPDATE ON public.match_video_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();