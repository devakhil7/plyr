import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

interface PendingPlayer {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    id: string;
    name: string | null;
    profile_photo_url: string | null;
    skill_level: string | null;
    city: string | null;
  } | null;
}

interface PendingJoinRequestsProps {
  matchId: string;
  pendingPlayers: PendingPlayer[];
  slotsLeft: number;
  onRefetch: () => void;
}

export function PendingJoinRequests({
  matchId,
  pendingPlayers,
  slotsLeft,
  onRefetch,
}: PendingJoinRequestsProps) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const player = pendingPlayers.find((p) => p.id === playerId);
      if (!player) throw new Error("Player not found");

      // Update join status to confirmed
      const { error } = await supabase
        .from("match_players")
        .update({ join_status: "confirmed" })
        .eq("id", playerId);

      if (error) throw error;

      // Create notification for the player
      if (player.user_id) {
        await supabase.from("notifications").insert({
          user_id: player.user_id,
          type: "match_join_approved",
          title: "Join Request Approved",
          message: "Your request to join the match has been approved!",
          link: `/matches/${matchId}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Player approved!");
      onRefetch();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve player");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const player = pendingPlayers.find((p) => p.id === playerId);
      if (!player) throw new Error("Player not found");

      // Update join status to rejected
      const { error } = await supabase
        .from("match_players")
        .update({ join_status: "rejected" })
        .eq("id", playerId);

      if (error) throw error;

      // Create notification for the player
      if (player.user_id) {
        await supabase.from("notifications").insert({
          user_id: player.user_id,
          type: "match_join_rejected",
          title: "Join Request Declined",
          message: "Your request to join the match was declined by the host.",
          link: `/matches/${matchId}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Player request declined");
      onRefetch();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to decline player");
    },
  });

  if (pendingPlayers.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-amber-600" />
          Pending Join Requests
          <Badge variant="secondary" className="ml-auto">
            {pendingPlayers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border"
          >
            <Link to={`/players/${player.user_id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={player.profiles?.profile_photo_url || ""} />
                <AvatarFallback>
                  {player.profiles?.name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                to={`/players/${player.user_id}`}
                className="font-medium text-sm hover:text-primary truncate block"
              >
                {player.profiles?.name || "Unknown Player"}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {player.profiles?.skill_level && (
                  <span className="capitalize">{player.profiles.skill_level}</span>
                )}
                {player.profiles?.city && (
                  <>
                    <span>•</span>
                    <span>{player.profiles.city}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {new Date(player.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                onClick={() => rejectMutation.mutate(player.id)}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                onClick={() => approveMutation.mutate(player.id)}
                disabled={
                  approveMutation.isPending ||
                  rejectMutation.isPending ||
                  slotsLeft <= 0
                }
                title={slotsLeft <= 0 ? "No slots available" : "Approve player"}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {slotsLeft <= 0 && (
          <p className="text-xs text-amber-600 text-center">
            Match is full. Approve a player to replace slots or reject pending requests.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
