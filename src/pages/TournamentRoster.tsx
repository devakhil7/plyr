import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  UserPlus, 
  Trash2, 
  Loader2, 
  CheckCircle,
  Users,
  Trophy,
  Send,
  Clock,
  UserCheck,
  Save
} from "lucide-react";

interface Player {
  id?: string;
  player_name: string;
  phone: string;
  email: string;
  jersey_number: number | null;
  position: string;
  invite_status: string;
  user_id?: string | null;
}

const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Center Back",
  "Full Back",
  "Midfielder",
  "Central Midfielder",
  "Defensive Midfielder",
  "Attacking Midfielder",
  "Winger",
  "Forward",
  "Striker"
];

export default function TournamentRoster() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get("team");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch tournament and team details
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["tournament-team", teamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select(`
          *,
          tournament_team_players (*)
        `)
        .eq("id", teamId)
        .maybeSingle();
      
      if (data?.tournament_team_players) {
        const existingPlayers = data.tournament_team_players.map((p: any) => ({
          id: p.id,
          player_name: p.player_name,
          phone: p.phone || "",
          email: p.email || "",
          jersey_number: p.jersey_number,
          position: p.position || "",
          invite_status: p.invite_status || "pending",
          user_id: p.user_id,
        }));
        setPlayers(existingPlayers);
      }
      
      return data;
    },
    enabled: !!teamId,
  });

  const isLoading = tournamentLoading || teamLoading;

  // Check if current user is the captain
  const isCaptain = team?.captain_user_id === user?.id;

  const addPlayer = () => {
    if (tournament && players.length < tournament.max_players_per_team) {
      setPlayers([...players, {
        player_name: "",
        phone: "",
        email: "",
        jersey_number: null,
        position: "",
        invite_status: "pending",
      }]);
      setHasChanges(true);
    }
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updatePlayer = (index: number, field: keyof Player, value: any) => {
    const updated = [...players];
    (updated[index] as any)[field] = value;
    setPlayers(updated);
    setHasChanges(true);
  };

  // Save roster mutation
  const saveRoster = useMutation({
    mutationFn: async () => {
      if (!teamId || !user) throw new Error("Invalid state");

      setIsSaving(true);

      // Get existing player IDs
      const existingIds = players.filter(p => p.id).map(p => p.id);

      // Delete players that were removed
      const { data: currentPlayers } = await supabase
        .from("tournament_team_players")
        .select("id")
        .eq("tournament_team_id", teamId);

      const currentIds = currentPlayers?.map(p => p.id) || [];
      const toDelete = currentIds.filter(id => !existingIds.includes(id));

      if (toDelete.length > 0) {
        await supabase
          .from("tournament_team_players")
          .delete()
          .in("id", toDelete);
      }

      // Upsert players
      for (const player of players) {
        if (!player.player_name.trim()) continue;

        // Check if user exists with this phone or email
        let linkedUserId: string | null = null;
        if (player.phone || player.email) {
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .or(`email.eq.${player.email}`)
            .maybeSingle();
          
          if (existingUser) {
            linkedUserId = existingUser.id;
          }
        }

        if (player.id) {
          // Update existing
          await supabase
            .from("tournament_team_players")
            .update({
              player_name: player.player_name.trim(),
              phone: player.phone.trim() || null,
              email: player.email.trim() || null,
              jersey_number: player.jersey_number,
              position: player.position || null,
              user_id: linkedUserId,
              invite_status: linkedUserId ? "joined" : "pending",
            })
            .eq("id", player.id);
        } else {
          // Insert new
          await supabase
            .from("tournament_team_players")
            .insert({
              tournament_team_id: teamId,
              player_name: player.player_name.trim(),
              phone: player.phone.trim() || null,
              email: player.email.trim() || null,
              jersey_number: player.jersey_number,
              position: player.position || null,
              user_id: linkedUserId,
              invite_status: linkedUserId ? "joined" : "pending",
            });
        }
      }

      // Update team status if minimum players met
      const validPlayers = players.filter(p => p.player_name.trim());
      if (tournament && validPlayers.length >= tournament.min_players_per_team) {
        await supabase
          .from("tournament_teams")
          .update({ team_status: "pending_verification" })
          .eq("id", teamId);
      }

      return true;
    },
    onSuccess: () => {
      toast.success("Roster saved successfully!");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["tournament-team", teamId] });
    },
    onError: (error: any) => {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save roster");
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Submit roster for verification
  const submitRoster = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Invalid state");

      await supabase
        .from("tournament_teams")
        .update({ 
          team_status: "pending_verification",
          registration_status: "submitted"
        })
        .eq("id", teamId);

      return true;
    },
    onSuccess: () => {
      toast.success("Roster submitted for verification!");
      queryClient.invalidateQueries({ queryKey: ["tournament-team", teamId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit roster");
    },
  });

  const getInviteStatusIcon = (status: string) => {
    switch (status) {
      case "joined":
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getInviteStatusBadge = (status: string) => {
    switch (status) {
      case "joined":
        return <Badge variant="default" className="bg-green-600">Joined</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending Invite</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <Link to="/auth">
            <Button>Login / Sign Up</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!tournament || !team) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Team not found</h2>
          <Link to="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (!isCaptain) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only the team captain can manage the roster.</p>
          <Link to={`/tournaments/${id}`}>
            <Button>Back to Tournament</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const validPlayers = players.filter(p => p.player_name.trim());
  const canSubmit = validPlayers.length >= tournament.min_players_per_team && 
                    team.team_status === "pending_roster";

  return (
    <Layout>
      <div className="container-app py-8 max-w-3xl mx-auto">
        <Link to={`/tournaments/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tournament
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <Badge variant="sport" className="mb-2">{tournament.sport}</Badge>
            <h1 className="text-2xl font-bold">{team.team_name} - Player Roster</h1>
            <p className="text-muted-foreground">
              {validPlayers.length} of {tournament.min_players_per_team}-{tournament.max_players_per_team} players
            </p>
          </div>
          <Badge variant={team.team_status === "approved" ? "default" : "secondary"}>
            {team.team_status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Badge>
        </div>

        {team.team_status === "pending_verification" && (
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                <strong>Under Review:</strong> Your team is being verified by the organizer. 
                You'll receive a notification once approved.
              </p>
            </CardContent>
          </Card>
        )}

        {team.team_status === "approved" && (
          <Card className="bg-green-50 border-green-200 mb-6">
            <CardContent className="p-4">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <strong>Approved!</strong> Your team has been verified and is ready to play.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Players
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={addPlayer}
              disabled={players.length >= tournament.max_players_per_team}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No players added yet. Click "Add Player" to start building your roster.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {players.map((player, index) => (
                  <Card key={index} className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label>Player Name *</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={player.player_name}
                                onChange={(e) => updatePlayer(index, "player_name", e.target.value)}
                                placeholder="Enter player name"
                              />
                              {player.user_id && getInviteStatusBadge("joined")}
                              {!player.user_id && player.id && getInviteStatusBadge("pending")}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Phone</Label>
                            <Input
                              type="tel"
                              value={player.phone}
                              onChange={(e) => updatePlayer(index, "phone", e.target.value)}
                              placeholder="Phone number"
                            />
                          </div>
                          
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={player.email}
                              onChange={(e) => updatePlayer(index, "email", e.target.value)}
                              placeholder="Email address"
                            />
                          </div>
                          
                          <div>
                            <Label>Jersey Number</Label>
                            <Input
                              type="number"
                              min="1"
                              max="99"
                              value={player.jersey_number || ""}
                              onChange={(e) => updatePlayer(index, "jersey_number", e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="#"
                            />
                          </div>
                          
                          <div>
                            <Label>Position</Label>
                            <Select
                              value={player.position}
                              onValueChange={(value) => updatePlayer(index, "position", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                              <SelectContent>
                                {POSITIONS.map((pos) => (
                                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePlayer(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => saveRoster.mutate()}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
          
          {canSubmit && (
            <Button
              onClick={() => submitRoster.mutate()}
              disabled={submitRoster.isPending}
              className="flex-1"
            >
              {submitRoster.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit for Verification
            </Button>
          )}
        </div>

        {validPlayers.length < tournament.min_players_per_team && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Add at least {tournament.min_players_per_team - validPlayers.length} more player(s) to submit roster
          </p>
        )}
      </div>
    </Layout>
  );
}