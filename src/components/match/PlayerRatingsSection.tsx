import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { containsProfanity } from "@/lib/profanityFilter";

interface PlayerRatingsSectionProps {
  matchId: string;
  userId: string | null;
  players: Array<{
    user_id: string;
    profiles: {
      id: string;
      name: string;
      profile_photo_url: string | null;
    };
  }>;
}

export function PlayerRatingsSection({ matchId, userId, players }: PlayerRatingsSectionProps) {
  const queryClient = useQueryClient();
  const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string }>>({});

  const { data: existingRatings = [] } = useQuery({
    queryKey: ["player-ratings", matchId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("player_ratings")
        .select("*")
        .eq("match_id", matchId)
        .eq("rater_user_id", userId);
      return data || [];
    },
    enabled: !!userId && !!matchId,
  });

  const submitRating = useMutation({
    mutationFn: async ({ playerId, rating, comment }: { playerId: string; rating: number; comment: string }) => {
      if (!userId) throw new Error("Not authenticated");

      // Check for profanity
      const isFlagged = containsProfanity(comment);

      const { error } = await supabase.from("player_ratings").upsert({
        match_id: matchId,
        rater_user_id: userId,
        rated_user_id: playerId,
        rating,
        comment: comment || null,
        is_flagged: isFlagged,
        moderation_status: isFlagged ? 'pending' : 'approved',
      }, {
        onConflict: 'match_id,rater_user_id,rated_user_id'
      });

      if (error) throw error;

      if (isFlagged) {
        toast.warning("Your review has been submitted for moderation.");
      }
    },
    onSuccess: () => {
      toast.success("Rating submitted!");
      queryClient.invalidateQueries({ queryKey: ["player-ratings", matchId, userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit rating");
    },
  });

  const otherPlayers = players.filter(p => p.user_id !== userId);
  const ratedPlayerIds = existingRatings.map(r => r.rated_user_id);

  const handleRatingChange = (playerId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], rating, comment: prev[playerId]?.comment || "" }
    }));
  };

  const handleCommentChange = (playerId: string, comment: string) => {
    setRatings(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], comment, rating: prev[playerId]?.rating || 0 }
    }));
  };

  const handleSubmit = (playerId: string) => {
    const playerRating = ratings[playerId];
    if (!playerRating?.rating) {
      toast.error("Please select a rating");
      return;
    }
    submitRating.mutate({
      playerId,
      rating: playerRating.rating,
      comment: playerRating.comment
    });
  };

  if (otherPlayers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Rate Players
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {otherPlayers.map((player) => {
            const isRated = ratedPlayerIds.includes(player.user_id);
            const existingRating = existingRatings.find(r => r.rated_user_id === player.user_id);
            const currentRating = ratings[player.user_id]?.rating || existingRating?.rating || 0;
            const currentComment = ratings[player.user_id]?.comment || existingRating?.comment || "";

            return (
              <div key={player.user_id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.profiles?.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {player.profiles?.name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{player.profiles?.name || "Player"}</p>
                    {isRated && (
                      <p className="text-xs text-green-600">✓ Rated</p>
                    )}
                  </div>
                </div>

                {/* Star Rating */}
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(player.user_id, star)}
                      className="p-1 hover:scale-110 transition-transform"
                      disabled={isRated}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          star <= currentRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>

                {/* Comment */}
                <Textarea
                  value={currentComment}
                  onChange={(e) => handleCommentChange(player.user_id, e.target.value)}
                  placeholder="Add a comment (optional)..."
                  className="mb-3"
                  rows={2}
                  disabled={isRated}
                />

                {!isRated && (
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(player.user_id)}
                    disabled={!ratings[player.user_id]?.rating || submitRating.isPending}
                  >
                    {submitRating.isPending ? "Submitting..." : "Submit Rating"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
