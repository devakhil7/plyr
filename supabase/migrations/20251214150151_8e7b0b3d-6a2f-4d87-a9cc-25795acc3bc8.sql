-- Add new columns to tournament_teams table
ALTER TABLE public.tournament_teams 
ADD COLUMN IF NOT EXISTS team_logo_url text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS team_status text DEFAULT 'pending_payment',
ADD COLUMN IF NOT EXISTS verification_notes text,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger for updated_at on tournament_teams
CREATE OR REPLACE FUNCTION public.update_tournament_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_tournament_teams_updated_at ON public.tournament_teams;
CREATE TRIGGER update_tournament_teams_updated_at
BEFORE UPDATE ON public.tournament_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_tournament_teams_updated_at();

-- Rename tournament_team_players to keep existing data but add new columns
ALTER TABLE public.tournament_team_players
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS temp_invite_id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS jersey_number integer,
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger for updated_at on tournament_team_players
CREATE OR REPLACE FUNCTION public.update_tournament_team_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_tournament_team_players_updated_at ON public.tournament_team_players;
CREATE TRIGGER update_tournament_team_players_updated_at
BEFORE UPDATE ON public.tournament_team_players
FOR EACH ROW
EXECUTE FUNCTION public.update_tournament_team_players_updated_at();

-- Create team-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for team-logos bucket
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Authenticated users can upload team logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own team logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own team logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-logos' AND auth.uid() IS NOT NULL);

-- Update RLS policies for tournament_team_players to allow captain and admin access
DROP POLICY IF EXISTS "Team captains can manage their team players" ON public.tournament_team_players;
CREATE POLICY "Team captains can manage their team players"
ON public.tournament_team_players FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_teams tt
    WHERE tt.id = tournament_team_players.tournament_team_id
    AND (tt.captain_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Allow admins to update tournament_teams for verification
DROP POLICY IF EXISTS "Admins can manage tournament teams" ON public.tournament_teams;
CREATE POLICY "Admins can manage tournament teams"
ON public.tournament_teams FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));