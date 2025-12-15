-- Add tournament format and team count columns
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS format text DEFAULT 'knockout',
ADD COLUMN IF NOT EXISTS num_teams integer DEFAULT 8;

-- Add constraint for valid formats
ALTER TABLE public.tournaments 
ADD CONSTRAINT tournaments_format_check 
CHECK (format IN ('knockout', 'league', 'group_knockout'));

-- Add constraint for valid team counts (2-64, powers of 2 for knockout)
ALTER TABLE public.tournaments 
ADD CONSTRAINT tournaments_num_teams_check 
CHECK (num_teams >= 2 AND num_teams <= 64);

-- Add columns to tournament_matches for slot tracking
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS slot_a text,
ADD COLUMN IF NOT EXISTS slot_b text,
ADD COLUMN IF NOT EXISTS team_a_id uuid REFERENCES tournament_teams(id),
ADD COLUMN IF NOT EXISTS team_b_id uuid REFERENCES tournament_teams(id),
ADD COLUMN IF NOT EXISTS match_order integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS group_name text;