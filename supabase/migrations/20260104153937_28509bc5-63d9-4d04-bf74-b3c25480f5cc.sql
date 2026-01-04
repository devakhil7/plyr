-- Add assist columns to match_video_events
ALTER TABLE public.match_video_events 
ADD COLUMN assist_player_id uuid REFERENCES public.profiles(id),
ADD COLUMN assist_player_name text;