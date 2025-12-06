-- 1. Match Events table for goal/assist tracking
CREATE TABLE public.match_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  minute INTEGER,
  scorer_user_id UUID NOT NULL REFERENCES public.profiles(id),
  assist_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match events viewable by everyone" ON public.match_events
FOR SELECT USING (true);

CREATE POLICY "Match hosts and turf owners can manage events" ON public.match_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM matches m 
    WHERE m.id = match_events.match_id 
    AND (
      m.host_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM turf_owners to2 
        WHERE to2.turf_id = m.turf_id AND to2.user_id = auth.uid()
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- 2. Player Ratings table
CREATE TABLE public.player_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL REFERENCES public.profiles(id),
  rated_user_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_flagged BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, rater_user_id, rated_user_id)
);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved ratings viewable by everyone" ON public.player_ratings
FOR SELECT USING (moderation_status = 'approved' OR rater_user_id = auth.uid() OR rated_user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can rate players they played with" ON public.player_ratings
FOR INSERT WITH CHECK (
  auth.uid() = rater_user_id 
  AND rater_user_id != rated_user_id
  AND EXISTS (
    SELECT 1 FROM match_players mp1 
    WHERE mp1.match_id = player_ratings.match_id AND mp1.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM match_players mp2 
    WHERE mp2.match_id = player_ratings.match_id AND mp2.user_id = rated_user_id
  )
);

CREATE POLICY "Users can update own ratings" ON public.player_ratings
FOR UPDATE USING (rater_user_id = auth.uid());

CREATE POLICY "Admins can manage all ratings" ON public.player_ratings
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 3. Conversations table for DM
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 4. Conversation Participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 5. Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'match_invite')),
  match_id UUID REFERENCES public.matches(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY "Users can view their conversations" ON public.conversations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid())
);

CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (true);

-- Participant policies
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants
FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Users can add participants" ON public.conversation_participants
FOR INSERT WITH CHECK (true);

-- Message policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() 
  AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Users can update message read status" ON public.messages
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
);

-- 6. User Photos
CREATE TABLE public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User photos viewable by everyone" ON public.user_photos FOR SELECT USING (true);
CREATE POLICY "Users can manage own photos" ON public.user_photos FOR ALL USING (user_id = auth.uid());

-- 7. User Videos
CREATE TABLE public.user_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User videos viewable by everyone" ON public.user_videos FOR SELECT USING (true);
CREATE POLICY "Users can manage own videos" ON public.user_videos FOR ALL USING (user_id = auth.uid());

-- 8. Tournaments
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  turf_id UUID REFERENCES public.turfs(id),
  sport TEXT DEFAULT 'Football',
  city TEXT NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_fee NUMERIC DEFAULT 0,
  prize_details TEXT,
  rules TEXT,
  cover_image_url TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournaments" ON public.tournaments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 9. Tournament Teams
CREATE TABLE public.tournament_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  captain_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament teams viewable by everyone" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournament teams" ON public.tournament_teams FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Captains can update their teams" ON public.tournament_teams FOR UPDATE USING (captain_user_id = auth.uid());

-- 10. Tournament Matches linking
CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  round TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id, match_id)
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament matches viewable by everyone" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournament matches" ON public.tournament_matches FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;