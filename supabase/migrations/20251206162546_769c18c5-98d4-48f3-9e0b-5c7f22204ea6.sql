-- Extend feed_posts table with new columns
ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS highlight_type text DEFAULT 'other',
ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS event_id uuid,
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;

-- Create events table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  turf_id uuid REFERENCES public.turfs(id) ON DELETE SET NULL,
  start_datetime timestamp with time zone NOT NULL,
  end_datetime timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  sport text DEFAULT 'Football',
  city text NOT NULL,
  cover_image_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key for event_id in feed_posts
ALTER TABLE public.feed_posts 
ADD CONSTRAINT feed_posts_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- Create follows table (users can follow players or turfs)
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_turf_id uuid REFERENCES public.turfs(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT follows_must_follow_something CHECK (
    (followed_player_id IS NOT NULL AND followed_turf_id IS NULL) OR
    (followed_player_id IS NULL AND followed_turf_id IS NOT NULL)
  ),
  UNIQUE(follower_id, followed_player_id),
  UNIQUE(follower_id, followed_turf_id)
);

-- Create likes table
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feed_post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, feed_post_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feed_post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feed_post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookmarks_must_bookmark_something CHECK (
    (feed_post_id IS NOT NULL AND event_id IS NULL) OR
    (feed_post_id IS NULL AND event_id IS NOT NULL)
  ),
  UNIQUE(user_id, feed_post_id),
  UNIQUE(user_id, event_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Event creators can update their events" ON public.events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Event creators can delete their events" ON public.events FOR DELETE USING (auth.uid() = created_by);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Update feed_posts RLS to allow updating likes/views/shares counters
CREATE POLICY "Anyone can update post counters" ON public.feed_posts FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_feed_posts_highlight_type ON public.feed_posts(highlight_type);
CREATE INDEX idx_feed_posts_trending ON public.feed_posts(is_trending, trending_score DESC);
CREATE INDEX idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_start_datetime ON public.events(start_datetime);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_likes_post ON public.likes(feed_post_id);
CREATE INDEX idx_comments_post ON public.comments(feed_post_id);

-- Function to update trending score
CREATE OR REPLACE FUNCTION public.update_trending_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_likes integer;
  post_comments integer;
  post_views integer;
  post_shares integer;
  new_score numeric;
  post_created_at timestamp with time zone;
BEGIN
  -- Get the post's current stats and created_at
  SELECT likes, comments_count, views, shares, created_at 
  INTO post_likes, post_comments, post_views, post_shares, post_created_at
  FROM feed_posts 
  WHERE id = COALESCE(NEW.feed_post_id, OLD.feed_post_id);
  
  -- Only calculate trending for posts in the last 72 hours
  IF post_created_at > now() - interval '72 hours' THEN
    new_score := (COALESCE(post_likes, 0) * 3) + 
                 (COALESCE(post_comments, 0) * 4) + 
                 (COALESCE(post_shares, 0) * 5) + 
                 (COALESCE(post_views, 0) * 0.1);
    
    UPDATE feed_posts 
    SET trending_score = new_score,
        is_trending = (new_score >= 50)
    WHERE id = COALESCE(NEW.feed_post_id, OLD.feed_post_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on likes to update feed_posts.likes count and trending
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET likes = COALESCE(likes, 0) + 1 WHERE id = NEW.feed_post_id;
    PERFORM update_trending_score();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = OLD.feed_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();

-- Trigger on comments to update feed_posts.comments_count
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.feed_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.feed_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_comments_count();