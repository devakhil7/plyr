-- Add updated_at column to feed_posts to track edits
ALTER TABLE public.feed_posts
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Create trigger to automatically update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_feed_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feed_posts_updated_at_trigger
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_feed_posts_updated_at();