import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Trophy, Sparkles, Users, Calendar } from "lucide-react";

type FeedTab = "for-you" | "following" | "nearby" | "events";
type FilterChip = "all" | "player" | "match" | "events" | "trending";

export default function Feed() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

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

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    // Reset filter when switching tabs
    if (tab === "events") {
      setActiveFilter("events");
    } else if (activeFilter === "events") {
      setActiveFilter("all");
    }
  };

  const renderEmptyState = () => {
    const emptyStates = {
      "for-you": {
        icon: Sparkles,
        title: "Your personalized feed is empty",
        description: "Follow players and turfs to see highlights here, or explore trending content.",
      },
      following: {
        icon: Users,
        title: "Not following anyone yet",
        description: "Follow players and turfs to see their highlights in your feed.",
      },
      nearby: {
        icon: Trophy,
        title: "No nearby highlights",
        description: "There are no recent highlights from your area. Update your city in your profile.",
      },
      events: {
        icon: Calendar,
        title: "No upcoming events",
        description: "Check back later for sports events in your area.",
      },
    };

    const state = emptyStates[activeTab];
    const Icon = state.icon;

    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
          <p className="text-muted-foreground mb-6">{state.description}</p>
          <Link to="/matches">
            <Button>Browse Matches</Button>
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

      if (highlightType === "match") {
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
      }

      // Default card for "other" types
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
      <div className="container-app py-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Community Feed</h1>
              <p className="text-muted-foreground">
                Highlights, matches, and events from the SPORTIQ community
              </p>
            </div>
            <CreatePostDialog />
          </div>

          {/* Tabs */}
          <div className="mb-4">
            <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          {/* Filters */}
          {activeTab !== "events" && (
            <div className="mb-6">
              <FeedFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                    <div className="h-48 bg-muted rounded mb-4" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {showPosts && renderPosts()}
              {showEvents && renderEvents()}
            </div>
          )}
        </div>
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
