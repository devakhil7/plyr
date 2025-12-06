import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Play, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feed_posts")
        .select(`
          *,
          profiles(name, profile_photo_url),
          matches(match_name, team_a_score, team_b_score, turfs(name))
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const post = posts?.find((p: any) => p.id === postId);
      if (!post) return;
      
      const { error } = await supabase
        .from("feed_posts")
        .update({ likes: (post.likes || 0) + 1 })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: () => {
      toast.error("Failed to like post");
    },
  });

  return (
    <Layout>
      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Community Feed</h1>
            <p className="text-muted-foreground">Match highlights and updates from the SPORTIQ community</p>
          </div>

          {/* Posts */}
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-40 bg-muted rounded mb-4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post: any) => (
                <Card key={post.id} className="overflow-hidden">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {post.profiles?.name?.charAt(0) || "S"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{post.profiles?.name || "SPORTIQ"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {post.post_type === "highlight" && (
                      <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                        <Trophy className="h-3 w-3" />
                        Highlight
                      </div>
                    )}
                  </div>

                  {/* Media Preview */}
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                    {post.matches && post.matches.team_a_score !== null && (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Final Score</p>
                        <div className="flex items-center gap-4 text-4xl font-bold">
                          <span>{post.matches.team_a_score}</span>
                          <span className="text-muted-foreground text-2xl">-</span>
                          <span>{post.matches.team_b_score}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {post.matches.match_name}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="glass"
                      size="icon"
                      className="absolute bottom-4 right-4 rounded-full"
                    >
                      <Play className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Caption */}
                  <CardContent className="p-4">
                    <p className="text-sm mb-3">{post.caption}</p>
                    
                    {post.matches?.turfs?.name && (
                      <p className="text-xs text-muted-foreground mb-3">
                        📍 {post.matches.turfs.name}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => user && likeMutation.mutate(post.id)}
                        disabled={!user || likeMutation.isPending}
                      >
                        <Heart className={`h-4 w-4 ${post.likes > 0 ? "fill-destructive text-destructive" : ""}`} />
                        <span>{post.likes || 0}</span>
                      </Button>
                      {post.match_id && (
                        <Link to={`/matches/${post.match_id}`}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <MessageCircle className="h-4 w-4" />
                            View Match
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-6">
                  Match highlights will appear here when games are completed with analytics
                </p>
                <Link to="/matches">
                  <Button>Browse Matches</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
