-- Tournament Module: Comprehensive schema for tournament management with partial payments

-- 1. Add new columns to tournaments table for enhanced functionality
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS allow_part_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS advance_type text CHECK (advance_type IN ('percentage', 'flat')),
ADD COLUMN IF NOT EXISTS advance_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_players_per_team integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_players_per_team integer DEFAULT 11,
ADD COLUMN IF NOT EXISTS registration_open boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_deadline timestamp with time zone DEFAULT NULL;

-- 2. Modify tournament_teams table to support payment tracking
ALTER TABLE public.tournament_teams
ADD COLUMN IF NOT EXISTS total_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
ADD COLUMN IF NOT EXISTS registration_status text DEFAULT 'pending' CHECK (registration_status IN ('pending', 'confirmed', 'cancelled'));

-- 3. Create tournament_team_players table for player registration
CREATE TABLE IF NOT EXISTS public.tournament_team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_contact text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Add tournament-related columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS tournament_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_purpose text DEFAULT 'turf_booking',
ADD COLUMN IF NOT EXISTS is_advance boolean DEFAULT false;

-- Update tournament_id in payments to reference tournaments if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'tournament_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Enable RLS on new table
ALTER TABLE public.tournament_team_players ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for tournament_team_players
CREATE POLICY "Tournament team players are viewable by everyone"
ON public.tournament_team_players
FOR SELECT
USING (true);

CREATE POLICY "Team captains can manage their team players"
ON public.tournament_team_players
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_teams tt
    WHERE tt.id = tournament_team_players.tournament_team_id
    AND tt.captain_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Update tournament_teams policies for registration
DROP POLICY IF EXISTS "Admins can manage tournament teams" ON public.tournament_teams;
DROP POLICY IF EXISTS "Captains can update their teams" ON public.tournament_teams;
DROP POLICY IF EXISTS "Tournament teams viewable by everyone" ON public.tournament_teams;

CREATE POLICY "Tournament teams viewable by everyone"
ON public.tournament_teams
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can register teams"
ON public.tournament_teams
FOR INSERT
WITH CHECK (auth.uid() = captain_user_id);

CREATE POLICY "Team captains can update their teams"
ON public.tournament_teams
FOR UPDATE
USING (captain_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage tournament teams"
ON public.tournament_teams
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Update tournaments policies for better access control
DROP POLICY IF EXISTS "Admins can manage tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments viewable by everyone" ON public.tournaments;

CREATE POLICY "Tournaments viewable by everyone"
ON public.tournaments
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tournaments"
ON public.tournaments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Index for performance
CREATE INDEX IF NOT EXISTS idx_tournament_team_players_team_id ON public.tournament_team_players(tournament_team_id);
CREATE INDEX IF NOT EXISTS idx_payments_tournament_team_id ON public.payments(tournament_team_id);
CREATE INDEX IF NOT EXISTS idx_payments_tournament_id ON public.payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_payment_status ON public.tournament_teams(payment_status);
CREATE INDEX IF NOT EXISTS idx_tournaments_registration_open ON public.tournaments(registration_open);