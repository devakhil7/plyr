-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Hosts can manage offline players" ON public.match_players;

-- Create a security definer function to check if user is match host
CREATE OR REPLACE FUNCTION public.is_match_host(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches
    WHERE id = _match_id
      AND host_id = _user_id
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Hosts can manage offline players"
ON public.match_players
FOR ALL
USING (
  is_match_host(match_id, auth.uid())
)
WITH CHECK (
  is_match_host(match_id, auth.uid())
);