import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, Plus, Trash2, Shuffle, Loader2, AlertCircle } from "lucide-react";
import { format as formatDate } from "date-fns";
import {
  generateKnockoutSchedule,
  generateGroupKnockoutSchedule,
  getSlotLabel,
  shuffleArray,
  type ScheduleSlot,
} from "@/lib/tournamentSchedule";

interface TournamentMatchSchedulerProps {
  tournamentId: string;
  tournamentName: string;
  turfId?: string | null;
  sport?: string;
  format?: string;
  numTeams?: number;
}

const ROUND_OPTIONS = [
  { value: "group", label: "Group Stage" },
  { value: "round-of-64", label: "Round of 64" },
  { value: "round-of-32", label: "Round of 32" },
  { value: "round-of-16", label: "Round of 16" },
  { value: "quarter-final", label: "Quarter Final" },
  { value: "semi-final", label: "Semi Final" },
  { value: "third-place", label: "Third Place" },
  { value: "final", label: "Final" },
];

export function TournamentMatchScheduler({
  tournamentId,
  tournamentName,
  turfId,
  sport = "Football",
  format = "knockout",
  numTeams = 8,
}: TournamentMatchSchedulerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [newMatch, setNewMatch] = useState({
    round: "group",
    match_date: "",
    match_time: "",
    team_a_id: "tbd",
    team_b_id: "tbd",
  });

  // Fetch tournament teams (approved teams only - including pay at ground)
  const { data: teams = [] } = useQuery({
    queryKey: ["tournament-teams", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select("id, team_name, payment_status, team_status")
        .eq("tournament_id", tournamentId)
        .eq("team_status", "approved")
        .order("team_name");
      return data || [];
    },
  });

  // Fetch scheduled matches
  const { data: scheduledMatches = [], isLoading } = useQuery({
    queryKey: ["tournament-matches", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_matches")
        .select(`
          id, round, match_id, slot_a, slot_b, team_a_id, team_b_id, match_order, group_name,
          matches (
            id, match_name, match_date, match_time, 
            team_a_score, team_b_score, status
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("match_order");
      return data || [];
    },
  });

  // Create team lookup map
  const teamLookup = new Map(teams.map((t) => [t.id, t.team_name]));

  // Generate schedule mutation
  const generateSchedule = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      // Delete existing matches first
      const existingMatchIds = scheduledMatches.map((m) => m.match_id);
      if (existingMatchIds.length > 0) {
        await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId);
        await supabase.from("matches").delete().in("id", existingMatchIds);
      }

      // Generate schedule based on format
      let schedule: ScheduleSlot[];
      if (format === "knockout") {
        schedule = generateKnockoutSchedule(numTeams);
      } else if (format === "group_knockout") {
        schedule = generateGroupKnockoutSchedule(numTeams);
      } else {
        // League format - no auto-generation
        throw new Error("League format schedule will be generated when all teams register");
      }

      // Create matches and tournament_matches entries
      for (const slot of schedule) {
        const roundLabel = ROUND_OPTIONS.find((r) => r.value === slot.round)?.label || slot.round;
        const matchName = slot.groupName 
          ? `${tournamentName} - ${slot.groupName} - ${slot.slotA} vs ${slot.slotB}`
          : `${tournamentName} - ${roundLabel} - ${slot.slotA} vs ${slot.slotB}`;

        // Create match
        const { data: match, error: matchError } = await supabase
          .from("matches")
          .insert({
            match_name: matchName,
            match_date: new Date().toISOString().split("T")[0], // Placeholder date
            match_time: "18:00",
            host_id: user.id,
            turf_id: turfId,
            sport,
            status: "open",
            visibility: "public",
            total_slots: 22,
            notes: `Tournament: ${tournamentName}`,
          })
          .select()
          .single();

        if (matchError) throw matchError;

        // Link to tournament with slot info
        const { error: linkError } = await supabase
          .from("tournament_matches")
          .insert({
            tournament_id: tournamentId,
            match_id: match.id,
            round: slot.round,
            slot_a: slot.slotA,
            slot_b: slot.slotB,
            match_order: slot.matchOrder,
            group_name: slot.groupName || null,
          });

        if (linkError) throw linkError;
      }

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      toast.success("Match schedule generated successfully");
      setShowGenerateConfirm(false);
    },
    onError: (error) => {
      console.error("Error generating schedule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate schedule");
    },
  });

  // Helper function to sync team players to match_players
  const syncTeamPlayersToMatch = async (matchId: string, teamId: string, teamSide: "A" | "B") => {
    // Get team players from roster
    const { data: teamPlayers } = await supabase
      .from("tournament_team_players")
      .select("*")
      .eq("tournament_team_id", teamId);

    if (teamPlayers && teamPlayers.length > 0) {
      for (const player of teamPlayers) {
        // Check if player already exists in match_players
        const existingQuery = player.user_id 
          ? supabase.from("match_players").select("id").eq("match_id", matchId).eq("user_id", player.user_id).maybeSingle()
          : supabase.from("match_players").select("id").eq("match_id", matchId).eq("offline_player_name", player.player_name).maybeSingle();
        
        const { data: existing } = await existingQuery;

        if (!existing) {
          // Insert new match player
          await supabase.from("match_players").insert({
            match_id: matchId,
            user_id: player.user_id || null,
            offline_player_name: player.user_id ? null : player.player_name,
            team: teamSide,
            role: "player",
            join_status: "confirmed",
          });
        }
      }
    }
  };

  // Randomize team assignments mutation
  const randomizeTeams = useMutation({
    mutationFn: async () => {
      if (teams.length === 0) {
        throw new Error("No teams registered yet");
      }

      // Shuffle teams
      const shuffledTeams = shuffleArray(teams);
      
      // Create slot to team mapping
      const slotToTeam = new Map<string, { id: string; name: string }>();
      shuffledTeams.forEach((team, index) => {
        slotToTeam.set(getSlotLabel(index), { id: team.id, name: team.team_name });
      });

      // Update tournament_matches with team assignments
      for (const match of scheduledMatches) {
        const teamA = slotToTeam.get(match.slot_a || "");
        const teamB = slotToTeam.get(match.slot_b || "");

        if (teamA || teamB) {
          await supabase
            .from("tournament_matches")
            .update({
              team_a_id: teamA?.id || null,
              team_b_id: teamB?.id || null,
            })
            .eq("id", match.id);

          // Update match name
          const teamAName = teamA?.name || match.slot_a || "TBD";
          const teamBName = teamB?.name || match.slot_b || "TBD";
          const roundLabel = ROUND_OPTIONS.find((r) => r.value === match.round)?.label || match.round;

          await supabase
            .from("matches")
            .update({
              match_name: `${teamAName} vs ${teamBName} - ${roundLabel}`,
            })
            .eq("id", match.match_id);

          // Sync players from tournament rosters to match_players
          if (teamA) {
            await syncTeamPlayersToMatch(match.match_id, teamA.id, "A");
          }
          if (teamB) {
            await syncTeamPlayersToMatch(match.match_id, teamB.id, "B");
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      toast.success("Teams randomized in schedule");
    },
    onError: (error) => {
      console.error("Error randomizing teams:", error);
      toast.error(error instanceof Error ? error.message : "Failed to randomize teams");
    },
  });

  // Create match mutation
  const createMatch = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!newMatch.match_date || !newMatch.match_time) {
        throw new Error("Date and time are required");
      }

      const teamA = newMatch.team_a_id !== "tbd" ? teams.find((t) => t.id === newMatch.team_a_id) : null;
      const teamB = newMatch.team_b_id !== "tbd" ? teams.find((t) => t.id === newMatch.team_b_id) : null;

      const roundLabel = ROUND_OPTIONS.find((r) => r.value === newMatch.round)?.label || newMatch.round;
      const matchName = teamA && teamB 
        ? `${teamA.team_name} vs ${teamB.team_name}` 
        : `${tournamentName} - ${roundLabel}`;

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          match_name: matchName,
          match_date: newMatch.match_date,
          match_time: newMatch.match_time,
          host_id: user.id,
          turf_id: turfId,
          sport,
          status: "open",
          visibility: "public",
          total_slots: 22,
          notes: `Tournament match: ${tournamentName} - ${roundLabel}`,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      const { error: linkError } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          match_id: match.id,
          round: newMatch.round,
          team_a_id: newMatch.team_a_id === "tbd" ? null : newMatch.team_a_id || null,
          team_b_id: newMatch.team_b_id === "tbd" ? null : newMatch.team_b_id || null,
          match_order: scheduledMatches.length + 1,
        });

      if (linkError) throw linkError;

      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      toast.success("Match scheduled successfully");
      setIsAddingMatch(false);
      setNewMatch({
        round: "group",
        match_date: "",
        match_time: "",
        team_a_id: "tbd",
        team_b_id: "tbd",
      });
    },
    onError: (error) => {
      console.error("Error creating match:", error);
      toast.error("Failed to schedule match");
    },
  });

  // Delete match mutation
  const deleteMatch = useMutation({
    mutationFn: async (tournamentMatchId: string) => {
      const match = scheduledMatches.find((m) => m.id === tournamentMatchId);
      if (!match) throw new Error("Match not found");

      await supabase.from("tournament_matches").delete().eq("id", tournamentMatchId);
      await supabase.from("matches").delete().eq("id", match.match_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      toast.success("Match removed");
    },
    onError: (error) => {
      console.error("Error deleting match:", error);
      toast.error("Failed to remove match");
    },
  });

  // Group matches by round
  const matchesByRound = scheduledMatches.reduce((acc: Record<string, any[]>, tm) => {
    const round = tm.round || "other";
    if (!acc[round]) acc[round] = [];
    acc[round].push(tm);
    return acc;
  }, {});

  const getRoundLabel = (round: string) => {
    return ROUND_OPTIONS.find((r) => r.value === round)?.label || round;
  };

  const getRoundColor = (round: string) => {
    switch (round) {
      case "final": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "semi-final": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "quarter-final": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "third-place": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "group": return "bg-green-500/10 text-green-600 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  // Get display name for a slot (team name if assigned, otherwise slot label)
  const getTeamDisplayName = (match: any, side: "A" | "B") => {
    const teamId = side === "A" ? match.team_a_id : match.team_b_id;
    const slot = side === "A" ? match.slot_a : match.slot_b;
    
    if (teamId && teamLookup.has(teamId)) {
      return teamLookup.get(teamId);
    }
    return slot || "TBD";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Match Schedule</h3>
          <p className="text-sm text-muted-foreground">
            {scheduledMatches.length} matches • {teams.length}/{numTeams} teams registered • {format === "knockout" ? "Knockout" : format === "league" ? "League" : "Group + Knockout"}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {format === "league" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Schedule generated after all teams register
            </div>
          ) : (
            <>
              {scheduledMatches.length === 0 ? (
                <Button onClick={() => setShowGenerateConfirm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Schedule
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => randomizeTeams.mutate()}
                  disabled={randomizeTeams.isPending || teams.length === 0}
                >
                  {randomizeTeams.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shuffle className="h-4 w-4 mr-2" />
                  )}
                  Randomize Teams
                </Button>
              )}
            </>
          )}

          <Dialog open={isAddingMatch} onOpenChange={setIsAddingMatch}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Match
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Match</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Round</Label>
                  <Select
                    value={newMatch.round}
                    onValueChange={(val) => setNewMatch({ ...newMatch, round: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newMatch.match_date}
                      onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={newMatch.match_time}
                      onChange={(e) => setNewMatch({ ...newMatch, match_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Team A</Label>
                  <Select
                    value={newMatch.team_a_id}
                    onValueChange={(val) => setNewMatch({ ...newMatch, team_a_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team or leave empty (TBD)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tbd">TBD (To Be Decided)</SelectItem>
                      {teams
                        .filter((t) => t.id !== newMatch.team_b_id && newMatch.team_b_id !== "tbd" ? t.id !== newMatch.team_b_id : true)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Team B</Label>
                  <Select
                    value={newMatch.team_b_id}
                    onValueChange={(val) => setNewMatch({ ...newMatch, team_b_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team or leave empty (TBD)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tbd">TBD (To Be Decided)</SelectItem>
                      {teams
                        .filter((t) => newMatch.team_a_id !== "tbd" ? t.id !== newMatch.team_a_id : true)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsAddingMatch(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMatch.mutate()}
                    disabled={createMatch.isPending || !newMatch.match_date || !newMatch.match_time}
                  >
                    {createMatch.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Schedule Match
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Generate Schedule Confirmation */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Match Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {format === "knockout" ? numTeams - 1 : "all"} matches for your {format === "knockout" ? "knockout" : "group + knockout"} tournament with {numTeams} teams.
              Teams will be assigned placeholder names (Team A, Team B, etc.) until they register.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => generateSchedule.mutate()}
              disabled={generateSchedule.isPending}
            >
              {generateSchedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Matches by Round */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading matches...</div>
      ) : scheduledMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No matches scheduled yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {format === "league" 
                ? "League schedule will be generated when all teams register"
                : "Click 'Generate Schedule' to create the match bracket"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {ROUND_OPTIONS.map((roundOpt) => {
            const roundMatches = matchesByRound[roundOpt.value];
            if (!roundMatches?.length) return null;

            return (
              <Card key={roundOpt.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className={getRoundColor(roundOpt.value)}>
                      {roundOpt.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground font-normal">
                      {roundMatches.length} {roundMatches.length === 1 ? "match" : "matches"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roundMatches.map((tm: any) => {
                    const match = tm.matches;
                    const teamAName = getTeamDisplayName(tm, "A");
                    const teamBName = getTeamDisplayName(tm, "B");
                    const isPlaceholder = !tm.team_a_id && !tm.team_b_id;

                    return (
                      <div
                        key={tm.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          isPlaceholder ? "bg-muted/30 border-dashed" : "bg-card hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            {tm.group_name && (
                              <Badge variant="outline" className="text-xs">
                                {tm.group_name}
                              </Badge>
                            )}
                            <div className="text-center min-w-[100px]">
                              <p className={`font-semibold ${isPlaceholder && !tm.team_a_id ? "text-muted-foreground italic" : ""}`}>
                                {teamAName}
                              </p>
                            </div>
                            <div className="text-center px-4">
                              {match?.team_a_score !== null && match?.team_b_score !== null ? (
                                <p className="text-xl font-bold">
                                  {match.team_a_score} - {match.team_b_score}
                                </p>
                              ) : (
                                <p className="text-muted-foreground">vs</p>
                              )}
                            </div>
                            <div className="text-center min-w-[100px]">
                              <p className={`font-semibold ${isPlaceholder && !tm.team_b_id ? "text-muted-foreground italic" : ""}`}>
                                {teamBName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {match?.match_date ? formatDate(new Date(match.match_date), "MMM d, yyyy") : "TBD"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {match?.match_time?.slice(0, 5) || "TBD"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMatch.mutate(tm.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
