import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeedTab = "for-you" | "following" | "nearby" | "events";
type FilterChip = "all" | "player" | "match" | "events" | "trending";

interface UseFeedOptions {
  tab: FeedTab;
  filter: FilterChip;
  userId: string | null;
  userCity: string | null;
}

export function useFeed({ tab, filter, userId, userCity }: UseFeedOptions) {
  const queryClient = useQueryClient();

  // Fetch user's follows
  const { data: follows } = useQuery({
    queryKey: ["user-follows", userId],
    queryFn: async () => {
      if (!userId) return { playerIds: [], turfIds: [] };
      const { data } = await supabase
        .from("follows")
        .select("followed_player_id, followed_turf_id")
        .eq("follower_id", userId);
      
      return {
        playerIds: data?.filter(f => f.followed_player_id).map(f => f.followed_player_id) || [],
        turfIds: data?.filter(f => f.followed_turf_id).map(f => f.followed_turf_id) || [],
      };
    },
    enabled: !!userId,
  });

  // Fetch user's likes
  const { data: userLikes } = useQuery({
    queryKey: ["user-likes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("likes")
        .select("feed_post_id")
        .eq("user_id", userId);
      return data?.map(l => l.feed_post_id) || [];
    },
    enabled: !!userId,
  });

  // Fetch feed posts with top comments
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["feed-posts", tab, filter, userId, userCity],
    queryFn: async () => {
      let query = supabase
        .from("feed_posts")
        .select(`
          *,
          profiles:user_id(name, profile_photo_url, position, city),
          player:player_id(name, profile_photo_url, position, city),
          matches(match_name, team_a_score, team_b_score, match_date, turf_id, turfs(name, city)),
          comments(id, text, created_at, user_id, profiles(name, profile_photo_url))
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      // Apply filter chips
      if (filter === "player") {
        query = query.eq("highlight_type", "player");
      } else if (filter === "match") {
        query = query.eq("highlight_type", "match");
      } else if (filter === "trending") {
        query = query
          .eq("is_trending", true)
          .gte("created_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
          .order("trending_score", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Apply tab filtering
      if (tab === "following" && follows) {
        filteredData = filteredData.filter((post: any) => {
          const isFollowedPlayer = post.player_id && follows.playerIds.includes(post.player_id);
          const isFollowedTurf = post.matches?.turf_id && follows.turfIds.includes(post.matches.turf_id);
          return isFollowedPlayer || isFollowedTurf;
        });
      } else if (tab === "nearby" && userCity) {
        filteredData = filteredData.filter((post: any) => {
          const postCity = post.matches?.turfs?.city || post.profiles?.city || post.player?.city;
          return postCity?.toLowerCase() === userCity.toLowerCase();
        });
      }

      return filteredData;
    },
  });

  // Fetch events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["feed-events", tab, filter, userCity],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          turfs(name, location, city),
          profiles:created_by(name)
        `)
        .in("status", ["upcoming", "live"])
        .order("start_datetime", { ascending: true })
        .limit(20);

      if (tab === "nearby" && userCity) {
        query = query.ilike("city", userCity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: tab === "events" || filter === "events",
  });

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) throw new Error("Must be logged in");
      
      // Check current like status from the server to avoid stale data
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", userId)
        .eq("feed_post_id", postId)
        .maybeSingle();
      
      const isLiked = !!existingLike;
      
      if (isLiked) {
        // Unlike: delete the like
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", userId)
          .eq("feed_post_id", postId);
        if (error) throw error;
        
        // Decrement likes count on post
        const post = posts?.find((p: any) => p.id === postId);
        if (post) {
          await supabase
            .from("feed_posts")
            .update({ likes: Math.max(0, (post.likes || 1) - 1) })
            .eq("id", postId);
        }
      } else {
        // Like: insert new like
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: userId, feed_post_id: postId });
        if (error) throw error;
        
        // Increment likes count on post
        const post = posts?.find((p: any) => p.id === postId);
        if (post) {
          await supabase
            .from("feed_posts")
            .update({ likes: (post.likes || 0) + 1 })
            .eq("id", postId);
        }
      }
      
      return { postId, isLiked };
    },
    onMutate: async (postId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user-likes", userId] });
      await queryClient.cancelQueries({ queryKey: ["feed-posts"] });
      
      // Snapshot previous value
      const previousLikes = queryClient.getQueryData<string[]>(["user-likes", userId]);
      
      // Optimistically update likes
      const isCurrentlyLiked = previousLikes?.includes(postId);
      queryClient.setQueryData<string[]>(["user-likes", userId], (old) => {
        if (!old) return isCurrentlyLiked ? [] : [postId];
        return isCurrentlyLiked 
          ? old.filter(id => id !== postId)
          : [...old, postId];
      });
      
      return { previousLikes };
    },
    onError: (err, postId, context) => {
      // Rollback on error
      if (context?.previousLikes) {
        queryClient.setQueryData(["user-likes", userId], context.previousLikes);
      }
      toast.error("Failed to update like");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-likes", userId] });
    },
  });

  // Share mutation (increment shares count)
  const shareMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Update shares count
      const post = posts?.find((p: any) => p.id === postId);
      if (!post) return;
      
      const { error } = await supabase
        .from("feed_posts")
        .update({ shares: (post.shares || 0) + 1 })
        .eq("id", postId);
      if (error) throw error;

      // Copy link to clipboard
      const url = `${window.location.origin}/feed?post=${postId}`;
      await navigator.clipboard.writeText(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast.success("Link copied to clipboard");
    },
    onError: () => {
      toast.error("Failed to share");
    },
  });

  // View increment (call when post enters viewport)
  const incrementView = async (postId: string) => {
    const post = posts?.find((p: any) => p.id === postId);
    if (!post) return;
    
    await supabase
      .from("feed_posts")
      .update({ views: (post.views || 0) + 1 })
      .eq("id", postId);
  };

  return {
    posts,
    events,
    isLoading: postsLoading || eventsLoading,
    userLikes: userLikes || [],
    follows,
    likeMutation,
    shareMutation,
    incrementView,
  };
}

export function useEventBookmark(userId: string | null) {
  const queryClient = useQueryClient();

  const { data: bookmarks } = useQuery({
    queryKey: ["user-event-bookmarks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("bookmarks")
        .select("event_id")
        .eq("user_id", userId)
        .not("event_id", "is", null);
      return data?.map(b => b.event_id) || [];
    },
    enabled: !!userId,
  });

  const toggleBookmark = useMutation({
    mutationFn: async (eventId: string) => {
      if (!userId) throw new Error("Must be logged in");
      
      const isBookmarked = bookmarks?.includes(eventId);
      
      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("event_id", eventId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: userId, event_id: eventId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-event-bookmarks"] });
      toast.success("Bookmark updated");
    },
    onError: () => {
      toast.error("Failed to update bookmark");
    },
  });

  return { bookmarks: bookmarks || [], toggleBookmark };
}
