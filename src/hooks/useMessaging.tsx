import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createNotification } from '@/hooks/useNotifications';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'match_invite';
  match_id: string | null;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    profile_photo_url: string | null;
  };
}

interface Conversation {
  id: string;
  created_at: string;
  participants: Array<{
    user_id: string;
    profile: {
      id: string;
      name: string;
      profile_photo_url: string | null;
    };
  }>;
  last_message?: Message;
  unread_count: number;
}

export function useConversations(userId: string | null) {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (!participations || participations.length === 0) return [];

      const conversationIds = participations.map(p => p.conversation_id);

      const { data: convos } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('created_at', { ascending: false });

      if (!convos) return [];

      // Fetch participants and last messages for each conversation
      const enrichedConvos = await Promise.all(
        convos.map(async (convo) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              profiles:user_id (id, name, profile_photo_url)
            `)
            .eq('conversation_id', convo.id);

          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .eq('is_read', false)
            .neq('sender_id', userId);

          return {
            ...convo,
            participants: participants?.map(p => ({
              user_id: p.user_id,
              profile: p.profiles as any
            })) || [],
            last_message: messages?.[0] || null,
            unread_count: count || 0
          };
        })
      );

      return enrichedConvos as Conversation[];
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return { conversations, isLoading, refetch };
}

export function useMessages(conversationId: string | null, userId: string | null) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (id, name, profile_photo_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !userId || messages.length === 0) return;

    const unreadMessages = messages.filter(
      m => !m.is_read && m.sender_id !== userId
    );

    if (unreadMessages.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessages.map(m => m.id))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
        });
    }
  }, [messages, conversationId, userId, queryClient]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      messageType = 'text',
      matchId
    }: {
      content: string;
      messageType?: 'text' | 'system' | 'match_invite';
      matchId?: string;
    }) => {
      if (!conversationId || !userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: messageType,
        match_id: matchId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send message');
    },
  });

  return { messages, isLoading, sendMessage, refetch };
}

export function useCreateConversation(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!userId) throw new Error('Not authenticated');

      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (existingParticipations && existingParticipations.length > 0) {
        const conversationIds = existingParticipations.map(p => p.conversation_id);
        
        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', conversationIds);

        if (otherParticipations && otherParticipations.length > 0) {
          // Conversation exists, return it
          return otherParticipations[0].conversation_id;
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ created_by: userId })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: userId },
          { conversation_id: conversation.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      return conversation.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create conversation');
    },
  });
}

export function useSendMatchInvite(userId: string | null) {
  const createConversation = useCreateConversation(userId);

  return useMutation({
    mutationFn: async ({
      recipientIds,
      matchId,
      matchDetails
    }: {
      recipientIds: string[];
      matchId: string;
      matchDetails: { name: string; date: string; time: string; turf: string };
    }) => {
      if (!userId) throw new Error('Not authenticated');

      for (const recipientId of recipientIds) {
        // 1. Send a chat message
        const conversationId = await createConversation.mutateAsync(recipientId);

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: `🎮 Match Invite: ${matchDetails.name}\n📅 ${matchDetails.date} at ${matchDetails.time}\n📍 ${matchDetails.turf}\n\nJoin the match: /matches/${matchId}`,
          message_type: 'match_invite',
          match_id: matchId,
        });

        // 2. Add them to match_players with 'invited' status (if not already in the match)
        const { data: existingPlayer } = await supabase
          .from('match_players')
          .select('id')
          .eq('match_id', matchId)
          .eq('user_id', recipientId)
          .maybeSingle();

        if (!existingPlayer) {
          await supabase.from('match_players').insert({
            match_id: matchId,
            user_id: recipientId,
            join_status: 'invited' as any, // Enum will be updated after types regenerate
            role: 'player',
            team: 'unassigned',
          });
        }

        // 3. Create a notification for the recipient
        try {
          await createNotification({
            userId: recipientId,
            type: 'match_invite',
            title: 'Match Invite',
            message: `You've been invited to ${matchDetails.name} on ${matchDetails.date}. Tap to respond.`,
            link: `/invitations`,
            metadata: {
              matchId,
              invitedBy: userId,
            },
          });
        } catch (err) {
          console.error('Failed to create notification:', err);
        }
      }
    },
    onSuccess: () => {
      toast.success('Invites sent successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send invites');
    },
  });
}
