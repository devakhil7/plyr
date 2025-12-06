-- Create a security definer function to check if user is in a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Drop the problematic policy on conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- Create new policy using the security definer function
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- Fix messages policies that also reference conversation_participants
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update message read status" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Users can update message read status"
ON public.messages
FOR UPDATE
USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- Fix conversations SELECT policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));