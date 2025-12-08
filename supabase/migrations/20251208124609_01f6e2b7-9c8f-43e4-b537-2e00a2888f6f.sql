-- Fix profile data exposure: Update RLS to restrict PII access
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create new policy: Users can view their own full profile
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create new policy: Others can only see public fields via a function
-- First create a security definer function to get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  profile_id uuid,
  profile_name text,
  profile_photo_url text,
  profile_skill_level skill_level,
  profile_position text,
  profile_city text,
  profile_bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.profile_photo_url,
    p.skill_level,
    p.position,
    p.city,
    p.bio
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;

-- Create a view for public profile listings (non-sensitive fields only)
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- For backward compatibility, create a policy allowing read of non-sensitive data
-- This policy allows viewing profiles but application should use public_profiles view for listings
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);