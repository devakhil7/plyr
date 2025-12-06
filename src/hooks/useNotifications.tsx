import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Notification {
  id: string;
  type: "message" | "match_invite" | "match_join" | "rating";
  title: string;
  description: string;
  created_at: string;
  is_read: boolean;
  link?: string;
}

export function useUnreadMessageCount(userId: string | null) {
  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ["unread-messages", userId],
    queryFn: async () => {
      if (!userId) return 0;

      // Get conversations the user is part of
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (!participations || participations.length === 0) return 0;

      const conversationIds = participations.map((p) => p.conversation_id);

      // Count unread messages not sent by the user
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .eq("is_read", false);

      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime message inserts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("unread-messages-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
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

  return { unreadCount, refetch };
}

export function useMatchNotifications(userId: string | null) {
  return useQuery({
    queryKey: ["match-notifications", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get recent match join requests for matches the user hosts
      const { data: joinRequests } = await supabase
        .from("match_players")
        .select(`
          id,
          created_at,
          join_status,
          user_id,
          match_id,
          matches!inner(host_id, match_name),
          profiles:user_id(name, profile_photo_url)
        `)
        .eq("matches.host_id", userId)
        .eq("join_status", "requested")
        .order("created_at", { ascending: false })
        .limit(10);

      const notifications: Notification[] = (joinRequests || []).map((req: any) => ({
        id: req.id,
        type: "match_join" as const,
        title: "Join Request",
        description: `${req.profiles?.name || "A player"} wants to join ${req.matches?.match_name}`,
        created_at: req.created_at,
        is_read: false,
        link: `/matches/${req.match_id}`,
      }));

      return notifications;
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute
  });
}
