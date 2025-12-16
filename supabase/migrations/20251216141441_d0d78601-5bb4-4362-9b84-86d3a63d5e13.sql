-- Add team column to match_video_events for team-wise stats
ALTER TABLE public.match_video_events 
ADD COLUMN team text CHECK (team IN ('A', 'B'));