-- Make match_id nullable in match_video_events to support standalone video analysis
ALTER TABLE public.match_video_events ALTER COLUMN match_id DROP NOT NULL;

-- Add video_analysis_job_id to link events to video analysis jobs
ALTER TABLE public.match_video_events ADD COLUMN video_analysis_job_id uuid REFERENCES public.video_analysis_jobs(id) ON DELETE CASCADE;

-- Add index for video_analysis_job_id
CREATE INDEX idx_match_video_events_job_id ON public.match_video_events(video_analysis_job_id);

-- Add constraint: must have either match_id or video_analysis_job_id
ALTER TABLE public.match_video_events ADD CONSTRAINT match_or_job_required 
CHECK (match_id IS NOT NULL OR video_analysis_job_id IS NOT NULL);

-- Add admin_notes field to video_analysis_jobs for admin feedback
ALTER TABLE public.video_analysis_jobs ADD COLUMN admin_notes text;

-- Add title field for user-submitted videos
ALTER TABLE public.video_analysis_jobs ADD COLUMN title text;