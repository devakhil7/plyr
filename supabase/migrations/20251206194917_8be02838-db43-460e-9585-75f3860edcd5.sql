-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create simpler INSERT policy - just require authenticated user and they set themselves as creator
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);