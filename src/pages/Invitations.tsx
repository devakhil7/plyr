import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Calendar, 
  MapPin, 
  Check, 
  X, 
  Loader2,
  ArrowLeft,
  Inbox
} from "lucide-react";
import { format } from "date-fns";

interface TournamentInvite {
  id: string;
  player_name: string;
  invite_status: string;
  temp_invite_id: string;
  tournament_team_id: string;
  tournament_teams: {
    id: string;
    team_name: string;
    tournament_id: string;
    captain_user_id: string;
    tournaments: {
      id: string;
      name: string;
      start_datetime: string;
      city: string;
      turfs: {
        name: string;
        location: string;
      } | null;
    };
    profiles: {
      name: string;
      profile_photo_url: string | null;
    } | null;
  };
}

interface MatchInvite {
  id: string;
  match_id: string;
  join_status: string;
  matches: {
    id: string;
    match_name: string;
    match_date: string;
    match_time: string;
    sport: string;
    turfs: {
      name: string;
      city: string;
    } | null;
    profiles: {
      name: string;
    } | null;
  };
}

export default function Invitations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem("redirectAfterAuth", "/invitations");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch pending tournament invites
  const { data: tournamentInvites = [], isLoading: tournamentLoading } = useQuery({
    queryKey: ["pending-tournament-invites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("tournament_team_players")
        .select(`
          id,
          player_name,
          invite_status,
          temp_invite_id,
          tournament_team_id,
          tournament_teams (
            id,
            team_name,
            tournament_id,
            captain_user_id,
            tournaments (
              id,
              name,
              start_datetime,
              city,
              turfs (name, location)
            ),
            profiles:captain_user_id (name, profile_photo_url)
          )
        `)
        .eq("user_id", user.id)
        .eq("invite_status", "pending");

      if (error) throw error;
      return (data || []) as unknown as TournamentInvite[];
    },
    enabled: !!user,
  });

  // Fetch pending match invites (join_status = 'invited')
  const { data: matchInvites = [], isLoading: matchLoading } = useQuery({
    queryKey: ["pending-match-invites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("match_players")
        .select(`
          id,
          match_id,
          join_status,
          matches (
            id,
            match_name,
            match_date,
            match_time,
            sport,
            turfs (name, city),
            profiles:host_id (name)
          )
        `)
        .eq("user_id", user.id)
        .eq("join_status", "invited" as any); // Type will be updated after types regenerate

      if (error) throw error;
      return (data || []) as unknown as MatchInvite[];
    },
    enabled: !!user,
  });

  // Accept tournament invite
  const acceptTournamentInvite = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("tournament_team_players")
        .update({ invite_status: "joined" })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You've joined the team!");
      queryClient.invalidateQueries({ queryKey: ["pending-tournament-invites"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to accept invite");
    },
  });

  // Decline tournament invite
  const declineTournamentInvite = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("tournament_team_players")
        .update({ invite_status: "declined", user_id: null })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite declined");
      queryClient.invalidateQueries({ queryKey: ["pending-tournament-invites"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to decline invite");
    },
  });

  // Accept match invite
  const acceptMatchInvite = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("match_players")
        .update({ join_status: "confirmed" })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You've joined the match!");
      queryClient.invalidateQueries({ queryKey: ["pending-match-invites"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to accept invite");
    },
  });

  // Decline match invite
  const declineMatchInvite = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite declined");
      queryClient.invalidateQueries({ queryKey: ["pending-match-invites"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to decline invite");
    },
  });

  const isLoading = authLoading || tournamentLoading || matchLoading;
  const totalInvites = tournamentInvites.length + matchInvites.length;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/home" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Invitations</h1>
            <p className="text-sm text-muted-foreground">
              {totalInvites > 0 ? `${totalInvites} pending invite${totalInvites > 1 ? 's' : ''}` : 'No pending invites'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalInvites === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">No Pending Invites</h2>
              <p className="text-muted-foreground mb-6">
                When someone invites you to a match or tournament team, it will appear here.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/matches">
                  <Button variant="outline">Browse Matches</Button>
                </Link>
                <Link to="/tournaments">
                  <Button>Explore Tournaments</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Tournament Invites */}
            {tournamentInvites.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Tournament Invites
                </h2>
                {tournamentInvites.map((invite) => (
                  <Card key={invite.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="sport">{invite.tournament_teams?.tournaments?.name}</Badge>
                          </div>
                          <h3 className="font-semibold">
                            Join "{invite.tournament_teams?.team_name}"
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Invited by {invite.tournament_teams?.profiles?.name || "Team Captain"}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {invite.tournament_teams?.tournaments?.start_datetime 
                                ? format(new Date(invite.tournament_teams.tournaments.start_datetime), "MMM d, yyyy")
                                : "TBD"
                              }
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {invite.tournament_teams?.tournaments?.turfs?.name || invite.tournament_teams?.tournaments?.city}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => declineTournamentInvite.mutate(invite.id)}
                            disabled={declineTournamentInvite.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => acceptTournamentInvite.mutate(invite.id)}
                            disabled={acceptTournamentInvite.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Match Invites */}
            {matchInvites.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Match Invites
                </h2>
                {matchInvites.map((invite) => (
                  <Card key={invite.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="sport">{invite.matches?.sport || "Football"}</Badge>
                          </div>
                          <h3 className="font-semibold">{invite.matches?.match_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Hosted by {invite.matches?.profiles?.name || "Unknown"}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {invite.matches?.match_date 
                                ? format(new Date(invite.matches.match_date), "MMM d, yyyy")
                                : "TBD"
                              } at {invite.matches?.match_time?.slice(0, 5) || "TBD"}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {invite.matches?.turfs?.name || "TBD"}, {invite.matches?.turfs?.city}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => declineMatchInvite.mutate(invite.id)}
                            disabled={declineMatchInvite.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => acceptMatchInvite.mutate(invite.id)}
                            disabled={acceptMatchInvite.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
