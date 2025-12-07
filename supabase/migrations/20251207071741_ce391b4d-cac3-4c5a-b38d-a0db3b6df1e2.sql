-- Make user_id nullable and add offline_player_name for offline players
ALTER TABLE public.match_players 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add offline player name field
ALTER TABLE public.match_players 
  ADD COLUMN IF NOT EXISTS offline_player_name text;

-- Add constraint: either user_id or offline_player_name must be set
ALTER TABLE public.match_players 
  ADD CONSTRAINT match_players_user_or_offline 
  CHECK (user_id IS NOT NULL OR offline_player_name IS NOT NULL);

-- Update RLS to allow hosts to manage offline players
CREATE POLICY "Hosts can manage offline players"
ON public.match_players
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM matches m 
    WHERE m.id = match_players.match_id 
    AND m.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches m 
    WHERE m.id = match_players.match_id 
    AND m.host_id = auth.uid()
  )
);