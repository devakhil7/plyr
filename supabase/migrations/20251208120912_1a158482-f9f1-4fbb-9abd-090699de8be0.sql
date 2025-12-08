-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.update_feed_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;