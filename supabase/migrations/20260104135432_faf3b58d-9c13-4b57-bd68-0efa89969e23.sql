-- Allow anyone (including anonymous users) to view basic profile information for public display
-- This is needed for displaying player names in matches, tournaments, etc.
CREATE POLICY "Anyone can view public profile info" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Drop the restrictive authenticated-only policy since we now have a more permissive one
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;