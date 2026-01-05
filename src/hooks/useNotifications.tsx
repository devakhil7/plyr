import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export type NotificationType = 
  | "match_join_request"
  | "match_join_approved"
  | "match_join_rejected"
  | "match_reminder"
  | "match_cancelled"
  | "match_completed"
  | "match_invite"
  | "tournament_team_approved"
  | "tournament_team_rejected"
  | "tournament_reminder"
  | "tournament_match_scheduled"
  | "tournament_invite"
  | "rating_received"
  | "rating_approved"
  | "rating_rejected"
  | "new_message"
  | "new_follower"
  | "turf_booking_request"
  | "turf_booking_approved"
  | "turf_booking_rejected"
  | "turf_booking_cancelled"
  | "turf_payment_received"
  | "turf_booking_lapsed"
  | "system";

export function useNotifications(userId: string | null) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      return data as Notification[];
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
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

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
  };
}

// Helper function to create notifications
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link,
    metadata: metadata || {},
  });

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Helper function to notify turf owners about booking events
export async function notifyTurfOwners(
  turfId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>
) {
  // Get all owners of this turf
  const { data: owners, error: ownersError } = await supabase
    .from("turf_owners")
    .select("user_id")
    .eq("turf_id", turfId);

  if (ownersError) {
    console.error("Error fetching turf owners:", ownersError);
    return;
  }

  if (!owners || owners.length === 0) {
    console.log("No owners found for turf:", turfId);
    return;
  }

  // Create notification for each owner
  for (const owner of owners) {
    try {
      await createNotification({
        userId: owner.user_id,
        type,
        title,
        message,
        link,
        metadata,
      });
    } catch (error) {
      console.error("Error creating notification for owner:", owner.user_id, error);
    }
  }
}

// Legacy hooks for backward compatibility
export function useUnreadMessageCount(userId: string | null) {
  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ["unread-messages", userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (!participations || participations.length === 0) return 0;

      const conversationIds = participations.map((p) => p.conversation_id);

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .eq("is_read", false);

      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

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

      const notifications = (joinRequests || []).map((req: any) => ({
        id: req.id,
        type: "match_join_request" as const,
        title: "Join Request",
        message: `${req.profiles?.name || "A player"} wants to join ${req.matches?.match_name}`,
        created_at: req.created_at,
        is_read: false,
        link: `/matches/${req.match_id}`,
      }));

      return notifications;
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });
}
