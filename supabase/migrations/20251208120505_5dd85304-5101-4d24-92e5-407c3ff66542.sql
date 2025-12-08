-- Add DELETE policy for feed_posts so users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON public.feed_posts
FOR DELETE
USING (auth.uid() = user_id);