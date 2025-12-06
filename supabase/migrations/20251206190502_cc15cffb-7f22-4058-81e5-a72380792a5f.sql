-- Create video_analysis_jobs table
CREATE TABLE public.video_analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  match_id UUID REFERENCES public.matches(id),
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'analyzing', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create highlight_clips table
CREATE TABLE public.highlight_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_analysis_job_id UUID NOT NULL REFERENCES public.video_analysis_jobs(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  goal_timestamp_seconds INTEGER NOT NULL,
  start_time_seconds INTEGER NOT NULL,
  end_time_seconds INTEGER NOT NULL,
  clip_video_url TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_clips ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_analysis_jobs
CREATE POLICY "Users can view their own analysis jobs"
ON public.video_analysis_jobs
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own analysis jobs"
ON public.video_analysis_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis jobs"
ON public.video_analysis_jobs
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own analysis jobs"
ON public.video_analysis_jobs
FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for highlight_clips
CREATE POLICY "Users can view clips for their jobs"
ON public.highlight_clips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.video_analysis_jobs vaj
    WHERE vaj.id = highlight_clips.video_analysis_job_id
    AND (vaj.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can create clips for their jobs"
ON public.highlight_clips
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.video_analysis_jobs vaj
    WHERE vaj.id = highlight_clips.video_analysis_job_id
    AND vaj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update clips for their jobs"
ON public.highlight_clips
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.video_analysis_jobs vaj
    WHERE vaj.id = highlight_clips.video_analysis_job_id
    AND (vaj.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can delete clips for their jobs"
ON public.highlight_clips
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.video_analysis_jobs vaj
    WHERE vaj.id = highlight_clips.video_analysis_job_id
    AND (vaj.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create storage bucket for match videos
INSERT INTO storage.buckets (id, name, public) VALUES ('match-videos', 'match-videos', true);

-- Storage policies for match-videos bucket
CREATE POLICY "Anyone can view match videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'match-videos');

CREATE POLICY "Authenticated users can upload match videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'match-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'match-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'match-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at
CREATE TRIGGER update_video_analysis_jobs_updated_at
BEFORE UPDATE ON public.video_analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();