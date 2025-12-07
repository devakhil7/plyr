import { useState } from "react";
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
import { Calendar, Clock, Plus, Trash2, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TournamentMatchSchedulerProps {
  tournamentId: string;
  tournamentName: string;
  turfId?: string | null;
  sport?: string;
}

const ROUND_OPTIONS = [
  { value: "group", label: "Group Stage" },
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
}: TournamentMatchSchedulerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    round: "group",
    match_date: "",
    match_time: "",
    team_a_id: "",
    team_b_id: "",
  });

  // Fetch tournament teams (paid/partial only)
  const { data: teams = [] } = useQuery({
    queryKey: ["tournament-teams", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select("id, team_name, payment_status")
        .eq("tournament_id", tournamentId)
        .in("payment_status", ["paid", "partial"])
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
          id, round, match_id,
          matches (
            id, match_name, match_date, match_time, 
            team_a_score, team_b_score, status,
            match_players (id, team, offline_player_name)
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at");
      return data || [];
    },
  });

  // Create match mutation
  const createMatch = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!newMatch.match_date || !newMatch.match_time) {
        throw new Error("Date and time are required");
      }

      // Find team names
      const teamA = teams.find((t) => t.id === newMatch.team_a_id);
      const teamB = teams.find((t) => t.id === newMatch.team_b_id);

      // Generate match name
      const roundLabel = ROUND_OPTIONS.find((r) => r.value === newMatch.round)?.label || newMatch.round;
      const matchName = teamA && teamB 
        ? `${teamA.team_name} vs ${teamB.team_name}` 
        : `${tournamentName} - ${roundLabel}`;

      // Create the match first
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

      // Link to tournament
      const { error: linkError } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          match_id: match.id,
          round: newMatch.round,
        });

      if (linkError) throw linkError;

      // Add team names as offline players for visual representation
      if (teamA) {
        await supabase.from("match_players").insert({
          match_id: match.id,
          offline_player_name: `Team: ${teamA.team_name}`,
          team: "A",
        });
      }
      if (teamB) {
        await supabase.from("match_players").insert({
          match_id: match.id,
          offline_player_name: `Team: ${teamB.team_name}`,
          team: "B",
        });
      }

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
        team_a_id: "",
        team_b_id: "",
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

      // Delete tournament_match link
      await supabase.from("tournament_matches").delete().eq("id", tournamentMatchId);
      
      // Delete the actual match
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
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Match Schedule</h3>
          <p className="text-sm text-muted-foreground">
            {scheduledMatches.length} matches scheduled • {teams.length} teams registered
          </p>
        </div>

        <Dialog open={isAddingMatch} onOpenChange={setIsAddingMatch}>
          <DialogTrigger asChild>
            <Button>
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
                    <SelectItem value="">TBD (To Be Decided)</SelectItem>
                    {teams
                      .filter((t) => t.id !== newMatch.team_b_id)
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
                    <SelectItem value="">TBD (To Be Decided)</SelectItem>
                    {teams
                      .filter((t) => t.id !== newMatch.team_a_id)
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

      {/* Matches by Round */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading matches...</div>
      ) : scheduledMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No matches scheduled yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Add Match" to create match slots
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
                    const teamAPlayer = match?.match_players?.find((p: any) => p.team === "A");
                    const teamBPlayer = match?.match_players?.find((p: any) => p.team === "B");
                    const teamAName = teamAPlayer?.offline_player_name?.replace("Team: ", "") || "TBD";
                    const teamBName = teamBPlayer?.offline_player_name?.replace("Team: ", "") || "TBD";

                    return (
                      <div
                        key={tm.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[100px]">
                              <p className="font-semibold">{teamAName}</p>
                            </div>
                            <div className="text-center px-4">
                              {match?.team_a_score !== null ? (
                                <p className="text-xl font-bold">
                                  {match.team_a_score} - {match.team_b_score}
                                </p>
                              ) : (
                                <p className="text-muted-foreground">vs</p>
                              )}
                            </div>
                            <div className="text-center min-w-[100px]">
                              <p className="font-semibold">{teamBName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {match?.match_date ? format(new Date(match.match_date), "MMM d, yyyy") : "TBD"}
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
