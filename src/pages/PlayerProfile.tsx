import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateConversation } from "@/hooks/useMessaging";
import { Layout } from "@/components/layout/Layout";
import { toast } from "sonner";
import { 
  ArrowLeft, User, MapPin, Trophy, Star, MessageSquare, 
  UserPlus, UserMinus, Camera, Video, Edit 
} from "lucide-react";

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createConversation = useCreateConversation(user?.id || null);

  const isOwnProfile = user?.id === id;

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-profile", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, id],
    queryFn: async () => {
      if (!user?.id || !id) return false;
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("followed_player_id", id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && !!id && !isOwnProfile,
  });

  const { data: stats } = useQuery({
    queryKey: ["player-stats", id],
    queryFn: async () => {
      // Get followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_player_id", id);

      // Get matches played
      const { count: matchesCount } = await supabase
        .from("match_players")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id);

      // Get average rating
      const { data: ratings } = await supabase
        .from("player_ratings")
        .select("rating")
        .eq("rated_user_id", id)
        .eq("moderation_status", "approved");

      const avgRating = ratings?.length
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : null;

      return {
        followers: followersCount || 0,
        matches: matchesCount || 0,
        avgRating,
        ratingsCount: ratings?.length || 0,
      };
    },
    enabled: !!id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["player-photos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_photos")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["player-videos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_videos")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["player-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_ratings")
        .select(`
          *,
          rater:rater_user_id (id, name, profile_photo_url)
        `)
        .eq("rated_user_id", id)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !id) throw new Error("Not authenticated");

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followed_player_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, followed_player_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ["player-stats", id] });
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update follow status");
    },
  });

  const handleMessage = async () => {
    if (!user?.id || !id) return;
    const conversationId = await createConversation.mutateAsync(id);
    navigate(`/messages?conversation=${conversationId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading profile...</div>
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Player not found</h2>
          <Link to="/matches">
            <Button>Browse Matches</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-app py-8">
        <Link to="/feed" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={player.profile_photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {player.name?.charAt(0) || <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{player.name || "Player"}</h1>
                  {player.position && <Badge variant="secondary">{player.position}</Badge>}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  {player.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {player.city}
                    </span>
                  )}
                  {player.skill_level && (
                    <Badge variant="outline" className="capitalize">{player.skill_level}</Badge>
                  )}
                </div>

                {player.bio && (
                  <p className="text-muted-foreground mb-4">{player.bio}</p>
                )}

                {/* Stats */}
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats?.matches || 0}</p>
                    <p className="text-xs text-muted-foreground">Matches</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats?.followers || 0}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                  {stats?.avgRating && (
                    <div className="text-center">
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        {stats.avgRating}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats.ratingsCount} ratings</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isOwnProfile && user && (
                  <div className="flex gap-2">
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleMessage}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}

                {isOwnProfile && (
                  <Link to="/profile">
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="gallery">
          <TabsList>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Photos ({photos.length}/5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo: any) => (
                        <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={photo.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No photos yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Videos ({videos.length}/3)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {videos.length > 0 ? (
                    <div className="space-y-2">
                      {videos.map((video: any) => (
                        <div key={video.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <video
                            src={video.video_url}
                            controls
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No videos yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.rater?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {review.rater?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{review.rater?.name || "User"}</p>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No reviews yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
