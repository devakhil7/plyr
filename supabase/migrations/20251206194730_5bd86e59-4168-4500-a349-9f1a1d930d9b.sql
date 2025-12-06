-- Add created_by column to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Create INSERT policy - user must be the creator
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Create SELECT policy - user is creator OR is a participant
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  created_by = auth.uid() 
  OR public.is_conversation_participant(id, auth.uid())
);