-- Create a dedicated bucket for turf photos and videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('turf-media', 'turf-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for turf-media bucket

-- Anyone can view turf media (public bucket)
CREATE POLICY "Anyone can view turf media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'turf-media');

-- Turf owners can upload to their turf folders
CREATE POLICY "Turf owners can upload turf media" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'turf-media' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- Turf owners can update their turf media
CREATE POLICY "Turf owners can update turf media" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'turf-media' 
  AND EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- Turf owners can delete their turf media
CREATE POLICY "Turf owners can delete turf media" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'turf-media' 
  AND EXISTS (
    SELECT 1 FROM public.turf_owners 
    WHERE turf_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);