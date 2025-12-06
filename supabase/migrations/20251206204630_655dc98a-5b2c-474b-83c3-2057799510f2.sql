-- Add attribute-based rating columns to player_ratings table
ALTER TABLE public.player_ratings
ADD COLUMN passing INTEGER CHECK (passing >= 1 AND passing <= 5),
ADD COLUMN shooting INTEGER CHECK (shooting >= 1 AND shooting <= 5),
ADD COLUMN dribbling INTEGER CHECK (dribbling >= 1 AND dribbling <= 5),
ADD COLUMN ball_control INTEGER CHECK (ball_control >= 1 AND ball_control <= 5),
ADD COLUMN finishing INTEGER CHECK (finishing >= 1 AND finishing <= 5),
ADD COLUMN defending INTEGER CHECK (defending >= 1 AND defending <= 5),
ADD COLUMN pace INTEGER CHECK (pace >= 1 AND pace <= 5);

-- Add comment for clarity
COMMENT ON COLUMN public.player_ratings.rating IS 'Overall rating (1-5 stars)';
COMMENT ON COLUMN public.player_ratings.passing IS 'Passing skill rating (1-5)';
COMMENT ON COLUMN public.player_ratings.shooting IS 'Shooting skill rating (1-5)';
COMMENT ON COLUMN public.player_ratings.dribbling IS 'Dribbling skill rating (1-5)';
COMMENT ON COLUMN public.player_ratings.ball_control IS 'Ball control skill rating (1-5)';
COMMENT ON COLUMN public.player_ratings.finishing IS 'Finishing skill rating (1-5)';
COMMENT ON COLUMN public.player_ratings.defending IS 'Defending skill rating (1-5)';
COMMENT ON COLUMN public.player_ratings.pace IS 'Pace/speed rating (1-5)';