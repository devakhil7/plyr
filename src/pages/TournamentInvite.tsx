import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trophy, 
  Users, 
  Loader2, 
  CheckCircle, 
  Calendar,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

export default function TournamentInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  const tournamentId = searchParams.get("tournament");
  const teamId = searchParams.get("team");
  const playerId = searchParams.get("player");

  // Fetch tournament details
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(`
          *,
          turfs (id, name, city, location)
        `)
        .eq("id", tournamentId)
        .maybeSingle();
      return data;
    },
    enabled: !!tournamentId,
  });

  // Fetch team details
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["tournament-team-invite", teamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select("*")
        .eq("id", teamId)
        .maybeSingle();
      
      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, profile_photo_url")
          .eq("id", data.captain_user_id)
          .maybeSingle();
        return { ...data, profiles: profile };
      }
      return data;
    },
    enabled: !!teamId,
  });

  // Fetch player invite details
  const { data: playerInvite, isLoading: playerLoading } = useQuery({
    queryKey: ["tournament-player-invite", playerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_team_players")
        .select("*")
        .eq("temp_invite_id", playerId)
        .maybeSingle();
      return data;
    },
    enabled: !!playerId,
  });

  const isLoading = tournamentLoading || teamLoading || playerLoading || authLoading;

  // Join team mutation
  const joinTeam = useMutation({
    mutationFn: async () => {
      if (!user || !playerId) throw new Error("Invalid state");

      setIsJoining(true);

      // Update the player record to link to this user
      const { error } = await supabase
        .from("tournament_team_players")
        .update({
          user_id: user.id,
          invite_status: "joined",
        })
        .eq("temp_invite_id", playerId);

      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      toast.success("You've joined the team!");
      navigate(`/tournaments/${tournamentId}`);
    },
    onError: (error: any) => {
      console.error("Join error:", error);
      toast.error(error.message || "Failed to join team");
    },
    onSettled: () => {
      setIsJoining(false);
    },
  });

  if (isLoading) {
    return (
      <AppLayout showBottomNav={false}>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tournament || !team) {
    return (
      <AppLayout showBottomNav={false}>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Invalid Invite</h2>
          <p className="text-muted-foreground mb-6">This invite link is invalid or has expired.</p>
          <Link to="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Check if invite is already used
  if (playerInvite?.invite_status === "joined") {
    return (
      <AppLayout showBottomNav={false}>
        <div className="container-app py-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Already Joined</h2>
          <p className="text-muted-foreground mb-6">
            This invite has already been used. You're part of team <strong>{team.team_name}</strong>.
          </p>
          <Link to={`/tournaments/${tournamentId}`}>
            <Button>View Tournament</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <AppLayout showBottomNav={false}>
        <div className="container-app py-12 max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>You're Invited!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground">
                  You've been invited to join team <strong>{team.team_name}</strong> for:
                </p>
                <p className="text-lg font-semibold mt-2">{tournament.name}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(tournament.start_datetime), "MMM d, yyyy")}</span>
                </div>
                {tournament.turfs && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.turfs.name}, {tournament.turfs.city}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Login or sign up to accept this invitation
                </p>
                <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                  <Button className="w-full">Login / Sign Up</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false}>
      <div className="container-app py-12 max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Join {team.team_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Badge variant="sport" className="mb-2">{tournament.sport}</Badge>
              <h3 className="text-xl font-semibold">{tournament.name}</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(tournament.start_datetime), "MMM d")} - {format(new Date(tournament.end_datetime), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {tournament.turfs && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Venue</p>
                    <p className="font-medium">{tournament.turfs.name}, {tournament.turfs.city}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Team</p>
                  <p className="font-medium">{team.team_name}</p>
                  <p className="text-xs text-muted-foreground">Captain: {(team as any).profiles?.name || "Unknown"}</p>
                </div>
              </div>
            </div>

            {playerInvite && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  You're joining as: <strong>{playerInvite.player_name}</strong>
                  {playerInvite.position && ` (${playerInvite.position})`}
                </p>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={() => joinTeam.mutate()}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept & Join Team
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By joining, you confirm your participation in this tournament
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}