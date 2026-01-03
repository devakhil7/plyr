import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, useEventBookmark } from "@/hooks/useFeed";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { PlayerHighlightCard } from "@/components/feed/PlayerHighlightCard";
import { MatchHighlightCard } from "@/components/feed/MatchHighlightCard";
import { EventCard } from "@/components/feed/EventCard";
import { CommentsDialog } from "@/components/feed/CommentsDialog";
import { CreatePostDialog } from "@/components/feed/CreatePostDialog";
import { Trophy, Sparkles, Users, Calendar, Crown, Medal, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FeedTab = "for-you" | "following" | "nearby" | "events";
type FilterChip = "all" | "player" | "match" | "events" | "trending";
type LeaderboardPeriod = "all" | "week" | "month";

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [mainTab, setMainTab] = useState<"feed" | "leaderboards">("feed");
  
  // Feed state
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  
  // Leaderboard state
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("all");

  const userCity = profile?.city || null;

  const { 
    posts, 
    events, 
    isLoading, 
    userLikes, 
    likeMutation, 
    shareMutation 
  } = useFeed({
    tab: activeTab,
    filter: activeFilter,
    userId: user?.id || null,
    userCity,
  });

  const { bookmarks, toggleBookmark } = useEventBookmark(user?.id || null);

  // Leaderboard data
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["community-leaderboard", leaderboardPeriod],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_ratings")
        .select(`
          rated_user_id,
          rating,
          created_at,
          profiles!player_ratings_rated_user_id_fkey(id, name, profile_photo_url, city)
        `)
        .eq("moderation_status", "approved");

      if (!data) return [];

      // Filter by period if needed
      let filteredData = data;
      if (leaderboardPeriod !== "all") {
        const now = new Date();
        const cutoff = new Date();
        if (leaderboardPeriod === "week") {
          cutoff.setDate(now.getDate() - 7);
        } else if (leaderboardPeriod === "month") {
          cutoff.setMonth(now.getMonth() - 1);
        }
        filteredData = data.filter((r: any) => new Date(r.created_at) >= cutoff);
      }

      // Aggregate ratings by player
      const playerRatings: Record<string, { total: number; count: number; profile: any }> = {};
      filteredData.forEach((r: any) => {
        if (!r.profiles) return;
        const id = r.rated_user_id;
        if (!playerRatings[id]) {
          playerRatings[id] = { total: 0, count: 0, profile: r.profiles };
        }
        playerRatings[id].total += r.rating;
        playerRatings[id].count += 1;
      });

      return Object.entries(playerRatings)
        .map(([id, data]) => ({
          id,
          name: data.profile.name,
          city: data.profile.city,
          profile_photo_url: data.profile.profile_photo_url,
          avgRating: data.total / data.count,
          ratingCount: data.count,
        }))
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 20);
    },
    enabled: mainTab === "leaderboards",
  });

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    if (tab === "events") {
      setActiveFilter("events");
    } else if (activeFilter === "events") {
      setActiveFilter("all");
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const renderEmptyState = () => {
    const emptyStates = {
      "for-you": {
        icon: Sparkles,
        title: "Your personalized feed is empty",
        description: "Follow players and turfs to see highlights here.",
      },
      following: {
        icon: Users,
        title: "Not following anyone yet",
        description: "Follow players and turfs to see their highlights.",
      },
      nearby: {
        icon: Trophy,
        title: "No nearby highlights",
        description: "No recent highlights from your area.",
      },
      events: {
        icon: Calendar,
        title: "No upcoming events",
        description: "Check back later for sports events.",
      },
    };

    const state = emptyStates[activeTab];
    const Icon = state.icon;

    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Icon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-semibold mb-1">{state.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{state.description}</p>
          <Link to="/matches">
            <Button size="sm">Browse Matches</Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  const renderPosts = () => {
    if (!posts || posts.length === 0) {
      if (activeTab !== "events" && activeFilter !== "events") {
        return renderEmptyState();
      }
      return null;
    }

    return posts.map((post: any) => {
      const isLiked = userLikes.includes(post.id);
      const highlightType = post.highlight_type || "other";

      if (highlightType === "player") {
        return (
          <PlayerHighlightCard
            key={post.id}
            post={{
              ...post,
              profiles: post.player || post.profiles,
            }}
            isLiked={isLiked}
            onLike={() => likeMutation.mutate(post.id)}
            onComment={() => setCommentsPostId(post.id)}
            onShare={() => shareMutation.mutate(post.id)}
            userId={user?.id || null}
          />
        );
      }

      return (
        <MatchHighlightCard
          key={post.id}
          post={post}
          isLiked={isLiked}
          onLike={() => likeMutation.mutate(post.id)}
          onComment={() => setCommentsPostId(post.id)}
          onShare={() => shareMutation.mutate(post.id)}
          userId={user?.id || null}
        />
      );
    });
  };

  const renderEvents = () => {
    if (!events || events.length === 0) {
      if (activeTab === "events" || activeFilter === "events") {
        return renderEmptyState();
      }
      return null;
    }

    return events.map((event: any) => (
      <EventCard
        key={event.id}
        event={event}
        isBookmarked={bookmarks.includes(event.id)}
        onBookmark={() => toggleBookmark.mutate(event.id)}
        userId={user?.id || null}
      />
    ));
  };

  const showEvents = activeTab === "events" || activeFilter === "events";
  const showPosts = !showEvents;

  return (
    <AppLayout>
      <div className="container-app py-3 md:py-4">
        {/* Header with Create Post */}
        <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
          <h1 className="text-xl md:text-2xl font-bold">Community</h1>
          <CreatePostDialog />
        </div>

        {/* Main Tabs: Feed | Leaderboards */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "feed" | "leaderboards")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 md:mb-4 h-9 md:h-10">
            <TabsTrigger value="feed" className="text-xs md:text-sm">Feed</TabsTrigger>
            <TabsTrigger value="leaderboards" className="text-xs md:text-sm">Leaderboards</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-0 space-y-4">
            {/* Feed Tabs */}
            <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />
            
            {/* Filters */}
            {activeTab !== "events" && (
              <FeedFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            )}

            {/* Content */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-3 bg-muted rounded w-1/3 mb-1" />
                          <div className="h-2 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                      <div className="h-32 bg-muted rounded mb-3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {showPosts && renderPosts()}
                {showEvents && renderEvents()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboards" className="mt-0 space-y-4">
            {/* Period Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-semibold">Top Players</span>
              </div>
              <Select value={leaderboardPeriod} onValueChange={(v) => setLeaderboardPeriod(v as LeaderboardPeriod)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Full Leaderboards Link */}
            <Link to="/leaderboards">
              <Card className="border-dashed hover:bg-muted/50 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">View full leaderboards with filters</span>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            {/* Leaderboard List */}
            {leaderboardLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-6 h-6 bg-muted rounded" />
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded w-1/3 mb-1" />
                      <div className="h-2 bg-muted rounded w-1/4" />
                    </div>
                    <div className="h-4 bg-muted rounded w-8" />
                  </div>
                ))}
              </div>
            ) : leaderboardData && leaderboardData.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  {leaderboardData.map((player, index) => (
                    <Link
                      key={player.id}
                      to={`/players/${player.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center justify-center w-6">
                        {getRankIcon(index)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {player.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{player.city || "India"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{player.avgRating.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">{player.ratingCount} ratings</p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-1">No rankings yet</h3>
                  <p className="text-sm text-muted-foreground">Play matches and get rated!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Comments Dialog */}
      {commentsPostId && (
        <CommentsDialog
          postId={commentsPostId}
          isOpen={!!commentsPostId}
          onClose={() => setCommentsPostId(null)}
          userId={user?.id || null}
        />
      )}
    </AppLayout>
  );
}
