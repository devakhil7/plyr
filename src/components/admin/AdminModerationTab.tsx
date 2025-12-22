import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import { Flag, Check, X, AlertTriangle, Star, MessageSquare } from "lucide-react";
import { createNotification } from "@/hooks/useNotifications";

export function AdminModerationTab() {
  const { isAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  const { data: flaggedRatings = [], isLoading } = useQuery({
    queryKey: ["flagged-ratings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_ratings")
        .select(`
          *,
          rater:rater_user_id (id, name),
          rated:rated_user_id (id, name),
          matches:match_id (id, match_name)
        `)
        .or("is_flagged.eq.true,moderation_status.eq.pending")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ id, status, rating }: { id: string; status: "approved" | "rejected"; rating?: any }) => {
      const { error } = await supabase
        .from("player_ratings")
        .update({
          moderation_status: status,
          is_flagged: status === "rejected",
        })
        .eq("id", id);
      if (error) throw error;

      // Send notification to the rated user
      if (rating?.rated_user_id) {
        try {
          await createNotification({
            userId: rating.rated_user_id,
            type: status === "approved" ? "rating_approved" : "rating_rejected",
            title: status === "approved" ? "New Rating Received" : "Rating Update",
            message: status === "approved"
              ? `You received a new rating from ${rating.rater?.name || "a player"} for the match "${rating.matches?.match_name || "a match"}".`
              : `A rating you received has been reviewed and removed for policy violations.`,
            link: "/profile",
            metadata: { matchId: rating.match_id, raterId: rating.rater_user_id },
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }
      }
    },
    onSuccess: () => {
      toast.success("Rating moderated");
      queryClient.invalidateQueries({ queryKey: ["flagged-ratings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to moderate");
    },
  });

  const pendingRatings = flaggedRatings.filter((r: any) => r.moderation_status === "pending");
  const flaggedOnly = flaggedRatings.filter((r: any) => r.is_flagged && r.moderation_status !== "pending");

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRatings.length})
          </TabsTrigger>
          <TabsTrigger value="flagged">
            Flagged ({flaggedOnly.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : pendingRatings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-muted-foreground">No pending reviews to moderate</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRatings.map((rating: any) => (
                <Card key={rating.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pending Review
                          </Badge>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= rating.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">{rating.rater?.name}</span>
                          {" → "}
                          <span className="font-medium text-foreground">{rating.rated?.name}</span>
                          {" in "}
                          <span>{rating.matches?.match_name}</span>
                        </div>

                        {rating.comment && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{rating.comment}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => moderateMutation.mutate({ id: rating.id, status: "approved", rating })}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => moderateMutation.mutate({ id: rating.id, status: "rejected", rating })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="flagged" className="mt-4">
          {flaggedOnly.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No rejected/flagged reviews
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {flaggedOnly.map((rating: any) => (
                <Card key={rating.id} className="border-red-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">
                        <Flag className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{rating.rater?.name}</span>
                      {" → "}
                      <span className="font-medium text-foreground">{rating.rated?.name}</span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-muted-foreground mt-2 line-through opacity-50">
                        {rating.comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
