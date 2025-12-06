-- Add max playing players and max subs fields to tournaments
ALTER TABLE public.tournaments
ADD COLUMN max_playing_players integer DEFAULT 7,
ADD COLUMN max_subs integer DEFAULT 4;