-- Create tournament_individual_registrations table for solo player registrations
CREATE TABLE IF NOT EXISTS public.tournament_individual_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_reference text,
  amount_paid numeric DEFAULT 0,
  registration_status text NOT NULL DEFAULT 'pending',
  assigned_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone,
  assigned_by uuid REFERENCES auth.users(id),
  preferred_position text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tournament_individual_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own registrations
CREATE POLICY "Users can view own individual registrations"
ON public.tournament_individual_registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all individual registrations
CREATE POLICY "Admins can view all individual registrations"
ON public.tournament_individual_registrations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own registrations
CREATE POLICY "Users can create individual registrations"
ON public.tournament_individual_registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own registrations (before assignment)
CREATE POLICY "Users can update own individual registrations"
ON public.tournament_individual_registrations
FOR UPDATE
USING (auth.uid() = user_id AND assigned_team_id IS NULL);

-- Admins can manage all registrations (for assignment)
CREATE POLICY "Admins can manage individual registrations"
ON public.tournament_individual_registrations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can delete their own registrations (before assignment)
CREATE POLICY "Users can delete own individual registrations"
ON public.tournament_individual_registrations
FOR DELETE
USING (auth.uid() = user_id AND assigned_team_id IS NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_tournament_individual_registrations_updated_at
BEFORE UPDATE ON public.tournament_individual_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();