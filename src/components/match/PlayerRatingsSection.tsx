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

const RATING_ATTRIBUTES = [
  { key: "rating", label: "Overall" },
  { key: "passing", label: "Passing" },
  { key: "shooting", label: "Shooting" },
  { key: "dribbling", label: "Dribbling" },
  { key: "ball_control", label: "Ball Control" },
  { key: "finishing", label: "Finishing" },
  { key: "defending", label: "Defending" },
  { key: "pace", label: "Pace" },
] as const;

type RatingAttribute = typeof RATING_ATTRIBUTES[number]["key"];

interface PlayerRatings {
  rating: number;
  passing: number;
  shooting: number;
  dribbling: number;
  ball_control: number;
  finishing: number;
  defending: number;
  pace: number;
  comment: string;
}

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

const defaultRatings: PlayerRatings = {
  rating: 0,
  passing: 0,
  shooting: 0,
  dribbling: 0,
  ball_control: 0,
  finishing: 0,
  defending: 0,
  pace: 0,
  comment: "",
};

function AttributeRating({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-muted-foreground w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 hover:scale-110 transition-transform disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlayerRatingsSection({ matchId, userId, players }: PlayerRatingsSectionProps) {
  const queryClient = useQueryClient();
  const [ratings, setRatings] = useState<Record<string, PlayerRatings>>({});

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
    mutationFn: async ({ playerId, playerRatings }: { playerId: string; playerRatings: PlayerRatings }) => {
      if (!userId) throw new Error("Not authenticated");

      const isFlagged = containsProfanity(playerRatings.comment);

      const { error } = await supabase.from("player_ratings").upsert({
        match_id: matchId,
        rater_user_id: userId,
        rated_user_id: playerId,
        rating: playerRatings.rating,
        passing: playerRatings.passing,
        shooting: playerRatings.shooting,
        dribbling: playerRatings.dribbling,
        ball_control: playerRatings.ball_control,
        finishing: playerRatings.finishing,
        defending: playerRatings.defending,
        pace: playerRatings.pace,
        comment: playerRatings.comment || null,
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

  const handleAttributeChange = (playerId: string, attribute: RatingAttribute, value: number) => {
    setRatings(prev => ({
      ...prev,
      [playerId]: {
        ...defaultRatings,
        ...prev[playerId],
        [attribute]: value,
      }
    }));
  };

  const handleCommentChange = (playerId: string, comment: string) => {
    setRatings(prev => ({
      ...prev,
      [playerId]: {
        ...defaultRatings,
        ...prev[playerId],
        comment,
      }
    }));
  };

  const handleSubmit = (playerId: string) => {
    const playerRatings = ratings[playerId];
    if (!playerRatings?.rating) {
      toast.error("Please provide at least an Overall rating");
      return;
    }
    submitRating.mutate({ playerId, playerRatings });
  };

  const getPlayerRatings = (playerId: string): PlayerRatings => {
    const existing = existingRatings.find(r => r.rated_user_id === playerId);
    const current = ratings[playerId];
    
    if (current) {
      return current;
    }
    
    if (existing) {
      return {
        rating: existing.rating || 0,
        passing: existing.passing || 0,
        shooting: existing.shooting || 0,
        dribbling: existing.dribbling || 0,
        ball_control: existing.ball_control || 0,
        finishing: existing.finishing || 0,
        defending: existing.defending || 0,
        pace: existing.pace || 0,
        comment: existing.comment || "",
      };
    }
    
    return defaultRatings;
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
            const playerRatings = getPlayerRatings(player.user_id);

            return (
              <div key={player.user_id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
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

                {/* Attribute Ratings */}
                <div className="space-y-1 mb-4">
                  {RATING_ATTRIBUTES.map((attr) => (
                    <AttributeRating
                      key={attr.key}
                      label={attr.label}
                      value={playerRatings[attr.key]}
                      onChange={(value) => handleAttributeChange(player.user_id, attr.key, value)}
                      disabled={isRated}
                    />
                  ))}
                </div>

                {/* Comment */}
                <Textarea
                  value={playerRatings.comment}
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
