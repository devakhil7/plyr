-- Create enum for training category types
CREATE TYPE public.training_category_type AS ENUM ('position', 'skill');

-- Create enum for difficulty levels
CREATE TYPE public.training_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create training_categories table
CREATE TABLE public.training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type training_category_type NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Football',
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create training_lessons table
CREATE TABLE public.training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.training_categories(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  key_responsibilities TEXT[],
  common_mistakes TEXT[],
  drills JSONB DEFAULT '[]',
  video_url TEXT,
  difficulty training_difficulty DEFAULT 'beginner',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Categories viewable by everyone
CREATE POLICY "Training categories viewable by everyone"
ON public.training_categories FOR SELECT
USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage training categories"
ON public.training_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies - Lessons viewable by everyone
CREATE POLICY "Training lessons viewable by everyone"
ON public.training_lessons FOR SELECT
USING (true);

-- Admins can manage lessons
CREATE POLICY "Admins can manage training lessons"
ON public.training_lessons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_training_categories_updated_at
BEFORE UPDATE ON public.training_categories
FOR EACH ROW EXECUTE FUNCTION public.update_training_updated_at();

CREATE TRIGGER update_training_lessons_updated_at
BEFORE UPDATE ON public.training_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_training_updated_at();

-- Insert default position categories for Football
INSERT INTO public.training_categories (name, type, sport, description, icon, display_order) VALUES
('Goalkeeper', 'position', 'Football', 'The last line of defense, responsible for preventing goals', 'shield', 1),
('Center Back', 'position', 'Football', 'Central defender focused on stopping attacks and aerial duels', 'shield-check', 2),
('Full Back', 'position', 'Football', 'Wide defender combining defensive duties with attacking support', 'arrow-left-right', 3),
('Defensive Midfielder', 'position', 'Football', 'The anchor in midfield, breaking up play and distributing', 'anchor', 4),
('Central Midfielder', 'position', 'Football', 'The engine room, controlling tempo and linking defense to attack', 'settings', 5),
('Attacking Midfielder', 'position', 'Football', 'Creative playmaker operating between midfield and attack', 'sparkles', 6),
('Winger', 'position', 'Football', 'Wide attacker providing pace, crosses, and cutting inside', 'zap', 7),
('Striker', 'position', 'Football', 'The main goal scorer, leading the line and finishing chances', 'target', 8);

-- Insert default skill categories for Football
INSERT INTO public.training_categories (name, type, sport, description, icon, display_order) VALUES
('Passing', 'skill', 'Football', 'Master the art of accurate ball distribution', 'send', 1),
('Shooting', 'skill', 'Football', 'Improve your finishing and goal-scoring ability', 'crosshair', 2),
('Dribbling', 'skill', 'Football', 'Beat defenders with close ball control and skill moves', 'wind', 3),
('First Touch', 'skill', 'Football', 'Control the ball instantly under pressure', 'hand', 4),
('Defending', 'skill', 'Football', 'Stop opponents and win the ball back', 'shield', 5),
('Heading', 'skill', 'Football', 'Win aerial duels and score from crosses', 'arrow-up', 6),
('Fitness & Conditioning', 'skill', 'Football', 'Build stamina, speed, and strength for match performance', 'heart-pulse', 7),
('Game Intelligence', 'skill', 'Football', 'Read the game and make smart decisions', 'brain', 8);

-- Insert sample lessons for Striker position
INSERT INTO public.training_lessons (category_id, title, overview, key_responsibilities, common_mistakes, drills, difficulty, display_order)
SELECT 
  id,
  'Striker Fundamentals',
  'As a striker, you are the focal point of your team''s attack. Your primary job is to score goals, but modern strikers must also contribute to build-up play, press defenders, and create space for teammates.',
  ARRAY['Score goals from various positions and situations', 'Make intelligent runs to stretch defenses', 'Hold up play and bring teammates into attack', 'Press opposition defenders to win possession high up the pitch', 'Be the first line of defense when out of possession'],
  ARRAY['Making runs too early and getting caught offside', 'Dropping too deep and vacating the box', 'Taking too many touches instead of shooting early', 'Not checking shoulders before receiving the ball', 'Poor movement when the team has possession'],
  '[{"name": "Finishing Drill", "description": "Practice shooting from various angles with 10 shots from each position", "duration": "15 mins"}, {"name": "Movement Patterns", "description": "Work on check runs, diagonal runs, and spins off the shoulder", "duration": "20 mins"}, {"name": "Hold-up Play", "description": "Receive with back to goal, shield ball, and lay off to supporting player", "duration": "15 mins"}]'::jsonb,
  'beginner',
  1
FROM public.training_categories WHERE name = 'Striker' AND type = 'position';

-- Insert sample lesson for Passing skill
INSERT INTO public.training_lessons (category_id, title, overview, key_responsibilities, common_mistakes, drills, difficulty, display_order)
SELECT 
  id,
  'Passing Mastery',
  'Passing is the foundation of football. Great passing allows your team to control possession, create chances, and break down defenses. Master short passes, long balls, through balls, and switches of play.',
  ARRAY['Keep possession under pressure', 'Play progressive passes that advance the team', 'Switch play to exploit space', 'Execute accurate crosses and through balls', 'Vary pass weight and trajectory based on situation'],
  ARRAY['Telegraphing passes by looking at the target too early', 'Using the wrong surface of the foot', 'Poor body positioning when receiving', 'Not adjusting pass weight for conditions', 'Playing safe passes when progressive options are available'],
  '[{"name": "Wall Passing", "description": "One-touch passing against a wall or rebounder to improve speed and accuracy", "duration": "10 mins"}, {"name": "Passing Triangles", "description": "Three players forming triangles, working on quick combinations", "duration": "15 mins"}, {"name": "Long Ball Practice", "description": "Hit targets at 30-40 yards with both feet", "duration": "15 mins"}]'::jsonb,
  'beginner',
  1
FROM public.training_categories WHERE name = 'Passing' AND type = 'skill';