import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Trophy, Calendar, MapPin, Users, IndianRupee, ArrowLeft, FileText, Plus, Shuffle, UserPlus, ChevronDown, User } from "lucide-react";
import { format, isPast } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateGroupKnockoutSchedule,
  generateKnockoutSchedule,
  getSlotLabel,
  shuffleArray,
  type ScheduleSlot,
} from "@/lib/tournamentSchedule";
import { TournamentBracket } from "@/components/tournaments/TournamentBracket";
import { TournamentShareDialog } from "@/components/tournaments/TournamentShareDialog";
import { TournamentStatsSection } from "@/components/tournaments/TournamentStatsSection";
import { TournamentPlayerCard } from "@/components/player/TournamentPlayerCard";

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { isAdmin } = useUserRoles();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(`
          *,
          turfs (id, name, city, location),
          tournament_teams (
            id, team_name, captain_user_id, payment_status, total_fee, total_paid, verification_notes, team_status,
            profiles:captain_user_id (id, name, profile_photo_url),
            tournament_team_players (
              id, player_name, jersey_number, position, user_id,
              profiles:user_id (profile_photo_url, skill_level)
            )
          ),
          tournament_matches (
            id, round, match_id, slot_a, slot_b, team_a_id, team_b_id, match_order, group_name,
            matches (id, match_name, match_date, match_time, team_a_score, team_b_score, status)
          ),
          profiles:created_by (id, name)
        `)
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Total teams requested (all registrations regardless of approval)
  const teamsRequested = tournament?.tournament_teams?.length || 0;

  // Only show teams that have been approved by admin
  const registeredTeams = tournament?.tournament_teams?.filter(
    (team: any) => team.team_status === "approved"
  ) || [];

  const myTeam = tournament?.tournament_teams?.find(
    (team: any) => team.captain_user_id === user?.id
  );

  const statusColors: Record<string, string> = {
    upcoming: "bg-accent/15 text-accent border-accent/30",
    live: "bg-green-500/15 text-green-600 border-green-500/30",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const tournamentMatches = (tournament?.tournament_matches || []) as any[];
  const tournamentFormat = (tournament as any)?.format || "knockout";
  const tournamentNumTeams = Number((tournament as any)?.num_teams || 8);

  const ROUND_LABELS: Record<string, string> = {
    group: "Group Stage",
    "round-of-64": "Round of 64",
    "round-of-32": "Round of 32",
    "round-of-16": "Round of 16",
    "quarter-final": "Quarter Final",
    "semi-final": "Semi Final",
    "third-place": "Third Place",
    final: "Final",
  };

  const generateSlots = (): ScheduleSlot[] => {
    if (tournamentFormat === "knockout") return generateKnockoutSchedule(tournamentNumTeams);
    if (tournamentFormat === "group_knockout") return generateGroupKnockoutSchedule(tournamentNumTeams);
    throw new Error("League format schedule is not available yet");
  };

  const generateSchedule = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!id) throw new Error("Missing tournament id");
      if (tournamentMatches.length > 0) return;

      const schedule = generateSlots();

      for (const slot of schedule) {
        const roundLabel = ROUND_LABELS[slot.round] || slot.round;
        const matchName = slot.groupName
          ? `${tournament.name} - ${slot.groupName} - ${slot.slotA} vs ${slot.slotB}`
          : `${tournament.name} - ${roundLabel} - ${slot.slotA} vs ${slot.slotB}`;

        const { data: match, error: matchError } = await supabase
          .from("matches")
          .insert({
            match_name: matchName,
            match_date: new Date(tournament.start_datetime).toISOString().split("T")[0],
            match_time: "18:00",
            host_id: user.id,
            turf_id: tournament.turf_id,
            sport: tournament.sport,
            status: "open",
            visibility: "public",
            total_slots: 22,
            notes: `Tournament: ${tournament.name}`,
          })
          .select()
          .single();

        if (matchError) throw matchError;

        const { error: linkError } = await supabase.from("tournament_matches").insert({
          tournament_id: id,
          match_id: match.id,
          round: slot.round,
          slot_a: slot.slotA,
          slot_b: slot.slotB,
          match_order: slot.matchOrder,
          group_name: slot.groupName || null,
        });

        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      toast.success("Match schedule generated");
    },
    onError: (e) => {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate schedule");
    },
  });

  const randomizeTeams = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing tournament id");
      if (registeredTeams.length === 0) throw new Error("No teams registered yet");
      if (tournamentMatches.length === 0) throw new Error("Generate schedule first");

      const shuffled = shuffleArray(registeredTeams).slice(0, tournamentNumTeams);
      const slotToTeam = new Map<string, { id: string; name: string }>();
      shuffled.forEach((team: any, index: number) => {
        slotToTeam.set(getSlotLabel(index), { id: team.id, name: team.team_name });
      });

      for (const tm of tournamentMatches) {
        const teamA = slotToTeam.get(tm.slot_a || "");
        const teamB = slotToTeam.get(tm.slot_b || "");

        if (!teamA && !teamB) continue;

        await supabase
          .from("tournament_matches")
          .update({
            team_a_id: teamA?.id || null,
            team_b_id: teamB?.id || null,
          })
          .eq("id", tm.id);

        const teamAName = teamA?.name || tm.slot_a || "TBD";
        const teamBName = teamB?.name || tm.slot_b || "TBD";
        const roundLabel = ROUND_LABELS[tm.round] || tm.round;

        await supabase
          .from("matches")
          .update({ match_name: `${teamAName} vs ${teamBName} - ${roundLabel}` })
          .eq("id", tm.match_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      toast.success("Teams randomized");
    },
    onError: (e) => {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to randomize teams");
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading tournament...</div>
        </div>
      </AppLayout>
    );
  }

  if (!tournament) {
    return (
      <AppLayout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Tournament not found</h2>
          <Link to="/tournaments">
            <Button className="btn-glow">Browse Tournaments</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-4">
        <Link to="/tournaments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tournaments
        </Link>

        {/* Hero Header */}
        <div className="hero-gradient -mx-4 px-4 py-6 rounded-b-3xl">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="sport" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
              {tournament.sport}
            </Badge>
            <Badge className={statusColors[tournament.status]}>
              {tournament.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-4">{tournament.name}</h1>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Calendar className="h-4 w-4" />
              <div>
                <p className="text-xs text-primary-foreground/70">Dates</p>
                <p className="text-sm font-medium">
                  {format(new Date(tournament.start_datetime), "MMM d")} - {format(new Date(tournament.end_datetime), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Users className="h-4 w-4" />
              <div>
                <p className="text-xs text-primary-foreground/70">Teams</p>
                <p className="text-sm font-medium">{registeredTeams.length} approved</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-primary-foreground/90">
              <IndianRupee className="h-4 w-4" />
              <div>
                <p className="text-xs text-primary-foreground/70">Entry Fee</p>
                <p className="text-sm font-medium">
                  {tournament.entry_fee > 0 ? `₹${tournament.entry_fee.toLocaleString()}` : "Free"}
                </p>
                {tournament.allow_part_payment && (
                  <p className="text-xs text-primary-foreground/60">
                    Part payment: {tournament.advance_type === "percentage" 
                      ? `${tournament.advance_value}%` 
                      : `₹${tournament.advance_value}`} advance
                  </p>
                )}
              </div>
            </div>

            {tournament.turfs && (
              <div className="flex items-center gap-2 text-primary-foreground/90 col-span-2 lg:col-span-1">
                <MapPin className="h-4 w-4" />
                <div>
                  <p className="text-xs text-primary-foreground/70">Venue</p>
                  <p className="text-sm font-medium truncate">{tournament.turfs.name}, {tournament.turfs.city}</p>
                </div>
              </div>
            )}
          </div>

          {/* Registration / Roster Button */}
          <div className="mt-4 flex flex-wrap gap-3">
            {user && myTeam ? (
              <Link to={`/tournaments/${id}/register/roster?team=${myTeam.id}`}>
                <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team Roster
                </Button>
              </Link>
            ) : (
              tournament.registration_open &&
              (!tournament.registration_deadline || !isPast(new Date(tournament.registration_deadline))) && (
                user ? (
                  <Link to={`/tournaments/${id}/register`}>
                    <Button className="btn-glow bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register Your Team
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={() => setLoginDialogOpen(true)}
                    className="btn-glow bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register Your Team
                  </Button>
                )
              )
            )}
            
            <TournamentShareDialog
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              startDate={tournament.start_datetime}
              endDate={tournament.end_datetime}
              city={tournament.city}
              entryFee={tournament.entry_fee}
              prizeDetails={tournament.prize_details}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-card w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="teams">Teams ({registeredTeams.length})</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {tournament.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Team Format
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Players per team</span>
                    <span className="font-medium">{tournament.min_players_per_team} - {tournament.max_players_per_team}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Playing on field</span>
                    <span className="font-medium">{tournament.max_playing_players || 7}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max substitutes</span>
                    <span className="font-medium">{tournament.max_subs || 4}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Prizes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {tournament.prize_details || "Prize details to be announced."}
                  </p>
                </CardContent>
              </Card>

              {tournament.rules && (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Rules & Format</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {tournament.rules}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <TournamentStatsSection 
              tournamentId={id!} 
              tournamentMatches={tournamentMatches}
            />
          </TabsContent>

          <TabsContent value="teams">
            <Card className="glass-card">
              <CardContent className="p-4">
                {registeredTeams.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {registeredTeams.map((team: any) => {
                      const isMyTeam = team.captain_user_id === user?.id;
                      const players = team.tournament_team_players || [];
                      const isExpanded = expandedTeams[team.id] || false;

                      return (
                        <Collapsible 
                          key={team.id} 
                          open={isExpanded} 
                          onOpenChange={() => toggleTeamExpanded(team.id)}
                        >
                          <div className="border rounded-lg glass-card overflow-hidden">
                            <CollapsibleTrigger className="w-full p-3 text-left hover:bg-primary/5 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-sm">{team.team_name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={team.payment_status === 'paid' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {team.payment_status === 'paid' ? 'Paid' : team.verification_notes === 'Pay at ground' ? 'Pay at Ground' : 'Partial'}
                                  </Badge>
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Captain: {team.profiles?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {players.length} player{players.length !== 1 ? 's' : ''}
                              </p>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="border-t px-3 py-3 bg-muted/30">
                                {players.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-2">
                                    {players.map((player: any, index: number) => (
                                      <TournamentPlayerCard 
                                        key={player.id} 
                                        player={{
                                          ...player,
                                          profile: player.profiles
                                        }} 
                                        index={index} 
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    No players added yet
                                  </p>
                                )}
                                
                                {isMyTeam && (
                                  <Link 
                                    to={`/tournaments/${id}/register/roster?team=${team.id}`}
                                    className="block mt-3 text-xs text-primary hover:underline text-center"
                                  >
                                    Manage roster →
                                  </Link>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No approved teams yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-semibold">Match Schedule</h2>
                    <p className="text-xs text-muted-foreground">
                      {tournamentMatches.length} matches • {registeredTeams.length}/{tournamentNumTeams} teams registered
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      {tournamentMatches.length === 0 ? (
                        <Button
                          onClick={() => generateSchedule.mutate()}
                          disabled={generateSchedule.isPending || tournamentFormat === "league"}
                          size="sm"
                          className="btn-glow"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Generate Schedule
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => randomizeTeams.mutate()}
                          disabled={randomizeTeams.isPending || registeredTeams.length === 0}
                        >
                          <Shuffle className="h-4 w-4 mr-2" />
                          Randomize Teams
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {tournamentFormat === "league" ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">League schedule not yet available</p>
                ) : (
                  <TournamentBracket 
                    matches={tournamentMatches}
                    teams={registeredTeams.map((t: any) => ({ id: t.id, team_name: t.team_name }))}
                    format={tournamentFormat}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Login Required
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to register your team for this tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              className="btn-glow"
              onClick={() => {
                sessionStorage.setItem("redirectAfterAuth", `/tournaments/${id}/register`);
                navigate("/auth");
              }}
            >
              Login / Sign Up
            </Button>
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
