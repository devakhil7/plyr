-- Fix security definer view warning by recreating view without security definer
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  profile_photo_url,
  skill_level,
  "position",
  city,
  bio,
  created_at
FROM public.profiles;

-- Grant select on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated, anon;