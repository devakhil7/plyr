-- Create skill level enum
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create match status enum
CREATE TYPE public.match_status AS ENUM ('open', 'full', 'in_progress', 'completed', 'cancelled');

-- Create join status enum
CREATE TYPE public.join_status AS ENUM ('requested', 'confirmed', 'rejected', 'cancelled');

-- Create player role enum
CREATE TYPE public.player_role AS ENUM ('host', 'player', 'substitute');

-- Create team enum
CREATE TYPE public.team_type AS ENUM ('A', 'B', 'unassigned');

-- Create post type enum
CREATE TYPE public.post_type AS ENUM ('highlight', 'announcement', 'stat');

-- Create analytics status enum
CREATE TYPE public.analytics_status AS ENUM ('none', 'processing', 'completed', 'failed');

-- Create visibility enum
CREATE TYPE public.visibility_type AS ENUM ('public', 'private');

-- Create team assignment mode enum
CREATE TYPE public.team_assignment_mode AS ENUM ('auto', 'manual');

-- Users/Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  profile_photo_url TEXT,
  location TEXT,
  city TEXT,
  sport_preference TEXT DEFAULT 'Football',
  position TEXT,
  skill_level skill_level DEFAULT 'intermediate',
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turfs table
CREATE TABLE public.turfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  price_per_hour NUMERIC DEFAULT 0,
  sport_type TEXT DEFAULT 'Football',
  description TEXT,
  photos TEXT[] DEFAULT '{}',
  owner_contact TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_name TEXT NOT NULL,
  sport TEXT DEFAULT 'Football',
  turf_id UUID REFERENCES public.turfs(id) ON DELETE SET NULL,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  visibility visibility_type DEFAULT 'public',
  required_skill_min skill_level DEFAULT 'beginner',
  required_skill_max skill_level DEFAULT 'advanced',
  total_slots INTEGER DEFAULT 10,
  status match_status DEFAULT 'open',
  team_assignment_mode team_assignment_mode DEFAULT 'auto',
  notes TEXT,
  team_a_score INTEGER,
  team_b_score INTEGER,
  video_url TEXT,
  analytics_status analytics_status DEFAULT 'none',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match players table
CREATE TABLE public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team team_type DEFAULT 'unassigned',
  role player_role DEFAULT 'player',
  join_status join_status DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Analytics table
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL UNIQUE,
  goals_team_a INTEGER DEFAULT 0,
  goals_team_b INTEGER DEFAULT 0,
  assists_team_a INTEGER DEFAULT 0,
  assists_team_b INTEGER DEFAULT 0,
  shots_on_target_a INTEGER DEFAULT 0,
  shots_on_target_b INTEGER DEFAULT 0,
  possession_team_a INTEGER DEFAULT 50,
  possession_team_b INTEGER DEFAULT 50,
  heatmap_url TEXT,
  highlights_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed posts table
CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type post_type DEFAULT 'highlight',
  caption TEXT,
  media_url TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Turfs policies (public read, admin write)
CREATE POLICY "Turfs are viewable by everyone"
ON public.turfs FOR SELECT
USING (true);

CREATE POLICY "Admins can manage turfs"
ON public.turfs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Matches policies
CREATE POLICY "Public matches are viewable by everyone"
ON public.matches FOR SELECT
USING (visibility = 'public' OR host_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.match_players mp WHERE mp.match_id = id AND mp.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can create matches"
ON public.matches FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their matches"
ON public.matches FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their matches"
ON public.matches FOR DELETE
USING (auth.uid() = host_id);

-- Match players policies
CREATE POLICY "Match players are viewable by everyone"
ON public.match_players FOR SELECT
USING (true);

CREATE POLICY "Users can join matches"
ON public.match_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.match_players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave matches"
ON public.match_players FOR DELETE
USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Analytics are viewable by everyone"
ON public.analytics FOR SELECT
USING (true);

CREATE POLICY "Match hosts can manage analytics"
ON public.analytics FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.host_id = auth.uid()
  )
);

-- Feed posts policies
CREATE POLICY "Feed posts are viewable by everyone"
ON public.feed_posts FOR SELECT
USING (true);

CREATE POLICY "Users can create feed posts"
ON public.feed_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.feed_posts FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_turfs_updated_at
  BEFORE UPDATE ON public.turfs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample turfs for MVP
INSERT INTO public.turfs (name, location, city, price_per_hour, sport_type, description, is_featured) VALUES
('Arena Sports Hub', 'Koramangala, Bangalore', 'Bangalore', 1500, 'Football', 'Premium 5-a-side artificial turf with floodlights and changing rooms.', true),
('Victory Ground', 'Andheri West, Mumbai', 'Mumbai', 1200, 'Football', 'Professional grade turf with night lighting and covered seating.', true),
('Champions Field', 'Gurgaon Sector 45', 'Gurgaon', 1800, 'Football', 'FIFA-quality artificial grass, 7-a-side ground with AC lounge.', true),
('Galaxy Sports Arena', 'Whitefield, Bangalore', 'Bangalore', 1000, 'Football', 'Budget-friendly turf perfect for weekend games.', false),
('Thunder Sports Complex', 'Powai, Mumbai', 'Mumbai', 1400, 'Football', 'Multi-sport facility with dedicated football grounds.', false);