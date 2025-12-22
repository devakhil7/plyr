import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Save,
  Search,
  X
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
  profile_photo_url?: string | null;
}

interface SearchedUser {
  id: string;
  name: string;
  email: string | null;
  profile_photo_url: string | null;
  city: string | null;
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
  const teamIdParam = searchParams.get("team");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [teamId, setTeamId] = useState<string | null>(teamIdParam);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [searchingPlayerIndex, setSearchingPlayerIndex] = useState<number | null>(null);
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);

  useEffect(() => {
    setTeamId(teamIdParam);
  }, [teamIdParam]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch confirmed players from OTHER teams in this tournament (to prevent duplicates)
  const { data: confirmedPlayersInTournament = [] } = useQuery({
    queryKey: ["tournament-confirmed-players", id, teamId],
    queryFn: async () => {
      if (!id) return [];
      // Get all teams in this tournament except current team
      const { data: otherTeams } = await supabase
        .from("tournament_teams")
        .select("id")
        .eq("tournament_id", id)
        .neq("id", teamId || "");
      
      if (!otherTeams || otherTeams.length === 0) return [];
      
      const otherTeamIds = otherTeams.map(t => t.id);
      
      // Get confirmed players from those teams
      const { data: confirmedPlayers } = await supabase
        .from("tournament_team_players")
        .select("user_id")
        .in("tournament_team_id", otherTeamIds)
        .eq("invite_status", "joined")
        .not("user_id", "is", null);
      
      return (confirmedPlayers || []).map(p => p.user_id).filter(Boolean) as string[];
    },
    enabled: !!id,
  });

  // Search for existing users
  const { data: searchedUsers = [], isLoading: isSearchingUsers } = useQuery({
    queryKey: ["player-search", playerSearchQuery],
    queryFn: async () => {
      if (!playerSearchQuery || playerSearchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, profile_photo_url, city")
        .ilike("name", `%${playerSearchQuery}%`)
        .neq("id", user?.id || "")
        .limit(5);
      return (data || []) as SearchedUser[];
    },
    enabled: playerSearchQuery.length >= 2,
  });

  // Filter out users already in the roster AND confirmed players from other teams
  const filteredSearchedUsers = useMemo(() => {
    const existingUserIds = players.filter(p => p.user_id).map(p => p.user_id);
    return searchedUsers.filter(u => 
      !existingUserIds.includes(u.id) && 
      !confirmedPlayersInTournament.includes(u.id)
    );
  }, [searchedUsers, players, confirmedPlayersInTournament]);

  // Select a user from search results
  const selectSearchedUser = (searchedUser: SearchedUser, index: number) => {
    const updated = [...players];
    updated[index] = {
      ...updated[index],
      player_name: searchedUser.name || "",
      email: searchedUser.email || "",
      user_id: searchedUser.id,
      profile_photo_url: searchedUser.profile_photo_url,
      invite_status: "pending", // Will be "pending" until user accepts
    };
    setPlayers(updated);
    setHasChanges(true);
    setPlayerSearchQuery("");
    setSearchingPlayerIndex(null);
    setSearchPopoverOpen(false);
  };

  // Clear linked user
  const clearLinkedUser = (index: number) => {
    const updated = [...players];
    updated[index] = {
      ...updated[index],
      user_id: null,
      profile_photo_url: null,
      invite_status: "pending",
    };
    setPlayers(updated);
    setHasChanges(true);
  };

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


  useEffect(() => {
    (async () => {
      if (!id || !user || teamId) return;
      const { data } = await supabase
        .from("tournament_teams")
        .select("id")
        .eq("tournament_id", id)
        .eq("captain_user_id", user.id)
        .maybeSingle();

      if (data?.id) {
        setTeamId(data.id);
        navigate(`/tournaments/${id}/register/roster?team=${data.id}`, { replace: true });
      }
    })();
  }, [id, user, teamId, navigate]);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["tournament-team", teamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select(`
          *,
          tournament_team_players (
            *,
            profiles:user_id (profile_photo_url)
          )
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
          profile_photo_url: p.profiles?.profile_photo_url || null,
        }));
        setPlayers(existingPlayers);
      }
      
      return data;
    },
    enabled: !!teamId,
  });

  const isLoading = tournamentLoading || teamLoading;

  const minPlayers = tournament?.min_players_per_team ?? 5;
  const maxPlayers = tournament?.max_players_per_team ?? 11;

  // Check if current user is the captain
  const isCaptain = team?.captain_user_id === user?.id;

  const addPlayer = () => {
    if (tournament && players.length < maxPlayers) {
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

        // Use the user_id from the player if already linked via search
        // Otherwise, try to link via email match
        let linkedUserId: string | null = player.user_id || null;
        if (!linkedUserId) {
          const email = player.email?.trim();
          if (email) {
            const { data: existingUser } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", email)
              .maybeSingle();

            if (existingUser?.id) linkedUserId = existingUser.id;
          }
        }

        // Determine invite_status:
        // - If user is linked and status is already "joined", keep it
        // - If user is newly linked (either via search or email), set to "pending"
        // - If no user linked, set to "pending" (manual entry)
        const currentStatus = player.invite_status;
        const inviteStatus = linkedUserId 
          ? (currentStatus === "joined" ? "joined" : "pending")
          : "pending";

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
              invite_status: inviteStatus,
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
              invite_status: inviteStatus,
            });
        }
      }

      // Update team status if minimum players met
      const validPlayers = players.filter(p => p.player_name.trim());
       if (tournament && validPlayers.length >= minPlayers) {
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

  // Submit roster for verification and sync to match_players
  const submitRoster = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Invalid state");

      // Update team status
      await supabase
        .from("tournament_teams")
        .update({ 
          team_status: "pending_verification",
          registration_status: "submitted"
        })
        .eq("id", teamId);

      // Sync players to match_players for any tournament matches this team is assigned to
      const { data: tournamentMatches } = await supabase
        .from("tournament_matches")
        .select("match_id, team_a_id, team_b_id")
        .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`);

      if (tournamentMatches && tournamentMatches.length > 0) {
        // Get current team players
        const { data: teamPlayers } = await supabase
          .from("tournament_team_players")
          .select("*")
          .eq("tournament_team_id", teamId);

        if (teamPlayers && teamPlayers.length > 0) {
          for (const tm of tournamentMatches) {
            // Determine which team (A or B) this is for the match
            const teamSide: "A" | "B" = tm.team_a_id === teamId ? "A" : "B";

            for (const player of teamPlayers) {
              // Check if player already exists in match_players
              const existingQuery = player.user_id 
                ? supabase.from("match_players").select("id").eq("match_id", tm.match_id).eq("user_id", player.user_id).maybeSingle()
                : supabase.from("match_players").select("id").eq("match_id", tm.match_id).eq("offline_player_name", player.player_name).maybeSingle();
              
              const { data: existing } = await existingQuery;

              if (!existing) {
                // Insert new match player
                await supabase.from("match_players").insert({
                  match_id: tm.match_id,
                  user_id: player.user_id || null,
                  offline_player_name: player.user_id ? null : player.player_name,
                  team: teamSide,
                  role: "player",
                  join_status: "confirmed",
                });
              }
            }
          }
        }
      }

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

  const getInviteStatusBadge = (status: string, hasUserId: boolean) => {
    if (hasUserId && status === "joined") {
      return <Badge variant="default" className="bg-green-600 text-xs">Confirmed</Badge>;
    }
    if (hasUserId && status === "pending") {
      return <Badge variant="secondary" className="text-orange-600 border-orange-300 text-xs">Unconfirmed</Badge>;
    }
    if (!hasUserId) {
      return null;
    }
    return <Badge variant="outline" className="text-xs">Unknown</Badge>;
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <Link to="/auth">
            <Button className="btn-glow">Login / Sign Up</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tournament || !team) {
    return (
      <AppLayout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Team not found</h2>
          <Link to="/tournaments">
            <Button className="btn-glow">Browse Tournaments</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!isCaptain) {
    return (
      <AppLayout>
        <div className="container-app py-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only the team captain can manage the roster.</p>
          <Link to={`/tournaments/${id}`}>
            <Button className="btn-glow">Back to Tournament</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const validPlayers = players.filter(p => p.player_name.trim());
  const canSubmit = validPlayers.length >= minPlayers &&
                    team.team_status === "pending_roster";

  return (
    <AppLayout>
      <div className="container-app py-4 max-w-3xl mx-auto space-y-4">
        <Link to={`/tournaments/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tournament
        </Link>

        <div className="hero-gradient -mx-4 px-4 py-5 rounded-b-3xl">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="sport" className="mb-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                {tournament.sport}
              </Badge>
              <h1 className="text-xl font-bold text-primary-foreground">{team.team_name} - Player Roster</h1>
              <p className="text-sm text-primary-foreground/70">
                {validPlayers.length} of {minPlayers}-{maxPlayers} players
              </p>
            </div>
            <Badge variant={team.team_status === "approved" ? "default" : "secondary"} className="shrink-0">
              {team.team_status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Badge>
          </div>
        </div>

        {team.team_status === "pending_verification" && (
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="p-4">
              <p className="text-sm text-accent-foreground">
                <strong>Under Review:</strong> Your team is being verified by the organizer. 
                You'll receive a notification once approved.
              </p>
            </CardContent>
          </Card>
        )}

        {team.team_status === "approved" && (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <strong>Approved!</strong> Your team has been verified and is ready to play.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Players
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={addPlayer}
              disabled={players.length >= maxPlayers}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No players added yet. Click "Add Player" to start building your roster.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {players.map((player, index) => (
                  <Card key={index} className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Player Avatar (if linked user) */}
                        {player.user_id && player.profile_photo_url && (
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={player.profile_photo_url} />
                            <AvatarFallback>{player.player_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label className="text-xs">Player Name *</Label>
                            <div className="flex items-center gap-2">
                              {player.user_id ? (
                                // Linked user - show name with status and remove option
                                <div className="flex items-center gap-2 flex-1 p-2 bg-muted/50 rounded-md">
                                  <span className="flex-1 font-medium text-sm">{player.player_name}</span>
                                  {getInviteStatusBadge(player.invite_status, true)}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => clearLinkedUser(index)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                // Manual input + optional search button
                                <>
                                  <Input
                                    value={player.player_name}
                                    onChange={(e) => updatePlayer(index, "player_name", e.target.value)}
                                    placeholder="Enter player name"
                                    className="flex-1"
                                  />
                                  <Popover 
                                    open={searchPopoverOpen && searchingPlayerIndex === index} 
                                    onOpenChange={(open) => {
                                      setSearchPopoverOpen(open);
                                      if (open) {
                                        setSearchingPlayerIndex(index);
                                        setPlayerSearchQuery("");
                                      } else {
                                        setSearchingPlayerIndex(null);
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        type="button"
                                        title="Search & link existing player"
                                      >
                                        <Search className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0" align="end">
                                      <div className="p-3 border-b">
                                        <p className="text-xs text-muted-foreground mb-2">
                                          Search for existing SPORTIQ players to invite
                                        </p>
                                        <Input
                                          value={playerSearchQuery}
                                          onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                          placeholder="Search by name..."
                                          autoFocus
                                        />
                                      </div>
                                      {isSearchingUsers ? (
                                        <div className="p-4 text-center">
                                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                        </div>
                                      ) : filteredSearchedUsers.length > 0 ? (
                                        <div className="max-h-48 overflow-y-auto">
                                          {filteredSearchedUsers.map((searchedUser) => (
                                            <button
                                              key={searchedUser.id}
                                              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                              onClick={() => selectSearchedUser(searchedUser, index)}
                                            >
                                              <Avatar className="h-8 w-8">
                                                <AvatarImage src={searchedUser.profile_photo_url || undefined} />
                                                <AvatarFallback>{searchedUser.name?.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{searchedUser.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                  {searchedUser.city || searchedUser.email || "SPORTIQ Player"}
                                                </p>
                                              </div>
                                              <UserPlus className="h-4 w-4 text-primary shrink-0" />
                                            </button>
                                          ))}
                                        </div>
                                      ) : playerSearchQuery.length >= 2 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                          No players found matching "{playerSearchQuery}"
                                        </div>
                                      ) : (
                                        <div className="p-4 text-center text-xs text-muted-foreground">
                                          Type at least 2 characters to search
                                        </div>
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                </>
                              )}
                            </div>
                            {player.user_id ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                {player.invite_status === "joined" 
                                  ? "This player has confirmed their participation" 
                                  : "Invite sent - waiting for player to accept"}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter name manually, or click <Search className="h-3 w-3 inline" /> to link an existing player
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <Label className="text-xs">Phone {!player.user_id && <span className="text-muted-foreground">(for SMS invite)</span>}</Label>
                            <Input
                              type="tel"
                              value={player.phone}
                              onChange={(e) => updatePlayer(index, "phone", e.target.value)}
                              placeholder="+91 9876543210"
                              disabled={!!player.user_id}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Email {!player.user_id && <span className="text-muted-foreground">(for email invite)</span>}</Label>
                            <Input
                              type="email"
                              value={player.email}
                              onChange={(e) => updatePlayer(index, "email", e.target.value)}
                              placeholder="player@email.com"
                              disabled={!!player.user_id}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Jersey Number</Label>
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
                            <Label className="text-xs">Position</Label>
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
                          className="text-destructive hover:text-destructive shrink-0"
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
              className="flex-1 btn-glow"
            >
              {submitRoster.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit for Verification
            </Button>
          )}
        </div>

        {validPlayers.length < minPlayers && (
          <p className="text-xs text-muted-foreground text-center">
            Add at least {minPlayers - validPlayers.length} more player(s) to submit roster
          </p>
        )}
      </div>
    </AppLayout>
  );
}
