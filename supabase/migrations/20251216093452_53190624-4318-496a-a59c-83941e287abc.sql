-- Add event metrics columns to video_analysis_jobs
ALTER TABLE public.video_analysis_jobs
ADD COLUMN IF NOT EXISTS goals_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS passes_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS analysis_metadata jsonb DEFAULT '{}';

-- Create table for detected video events with timestamps
CREATE TABLE IF NOT EXISTS public.video_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_analysis_job_id uuid NOT NULL REFERENCES public.video_analysis_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'goal', 'shot', 'pass'
  timestamp_seconds integer NOT NULL,
  confidence numeric DEFAULT 0.8,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_events
CREATE POLICY "Users can view their own video events"
ON public.video_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.video_analysis_jobs vaj
    WHERE vaj.id = video_events.video_analysis_job_id
    AND vaj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own video events"
ON public.video_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.video_analysis_jobs vaj
    WHERE vaj.id = video_events.video_analysis_job_id
    AND vaj.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_events_job_id ON public.video_events(video_analysis_job_id);
CREATE INDEX IF NOT EXISTS idx_video_events_type ON public.video_events(event_type);