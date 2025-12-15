import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Trophy, Calendar, MapPin, Users, IndianRupee, ArrowLeft, FileText, Plus, Shuffle } from "lucide-react";
import { format, isPast } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import {
  generateGroupKnockoutSchedule,
  generateKnockoutSchedule,
  getSlotLabel,
  shuffleArray,
  type ScheduleSlot,
} from "@/lib/tournamentSchedule";
import { TournamentBracket } from "@/components/tournaments/TournamentBracket";

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

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
            id, team_name, captain_user_id, payment_status, total_fee, total_paid, verification_notes,
            profiles:captain_user_id (id, name, profile_photo_url)
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

  // Filter teams to show paid, partial, or "pay at ground" teams
  const registeredTeams = tournament?.tournament_teams?.filter(
    (team: any) =>
      team.payment_status === "paid" ||
      team.payment_status === "partial" ||
      team.verification_notes === "Pay at ground"
  ) || [];

  const myTeam = tournament?.tournament_teams?.find(
    (team: any) => team.captain_user_id === user?.id
  );

  const statusColors: Record<string, string> = {
    upcoming: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    live: "bg-green-500/10 text-green-600 border-green-500/20",
    completed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
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
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading tournament...</div>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Tournament not found</h2>
          <Link to="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-app py-8">
        <Link to="/tournaments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tournaments
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="sport">{tournament.sport}</Badge>
            <Badge className={statusColors[tournament.status]}>
              {tournament.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mb-4">{tournament.name}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Dates</p>
                <p className="font-medium">
                  {format(new Date(tournament.start_datetime), "MMM d")} - {format(new Date(tournament.end_datetime), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            {tournament.turfs && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">{tournament.turfs.name}, {tournament.turfs.city}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="font-medium">{registeredTeams.length} registered</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Entry Fee</p>
                <p className="font-medium">
                  {tournament.entry_fee > 0 ? `₹${tournament.entry_fee.toLocaleString()}` : "Free"}
                </p>
                {tournament.allow_part_payment && (
                  <p className="text-xs text-muted-foreground">
                    Part payment: {tournament.advance_type === "percentage" 
                      ? `${tournament.advance_value}%` 
                      : `₹${tournament.advance_value}`} advance
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Registration / Roster Button */}
          {user && myTeam ? (
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to={`/tournaments/${id}/register/roster?team=${myTeam.id}`}>
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team Roster
                </Button>
              </Link>
            </div>
          ) : (
            tournament.registration_open &&
            (!tournament.registration_deadline || !isPast(new Date(tournament.registration_deadline))) &&
            user && (
              <div className="mt-6">
                <Link to={`/tournaments/${id}/register`}>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Register Your Team
                  </Button>
                </Link>
              </div>
            )
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams ({registeredTeams.length})</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {tournament.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Format
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Players per team</span>
                    <span className="font-medium">{tournament.min_players_per_team} - {tournament.max_players_per_team}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Playing on field</span>
                    <span className="font-medium">{tournament.max_playing_players || 7}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max substitutes</span>
                    <span className="font-medium">{tournament.max_subs || 4}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Prizes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {tournament.prize_details || "Prize details to be announced."}
                  </p>
                </CardContent>
              </Card>

              {tournament.rules && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rules & Format</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {tournament.rules}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {registeredTeams.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {registeredTeams.map((team: any) => {
                      const isMyTeam = team.captain_user_id === user?.id;
                      const cardContent = (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold">{team.team_name}</p>
                            <Badge 
                              variant={team.payment_status === 'paid' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {team.payment_status === 'paid' ? 'Paid' : team.verification_notes === 'Pay at ground' ? 'Pay at Ground' : 'Partial'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Captain: {team.profiles?.name || "Unknown"}
                          </p>
                          {isMyTeam && (
                            <p className="text-xs text-primary mt-2">Click to manage roster →</p>
                          )}
                        </>
                      );

                      return isMyTeam ? (
                        <Link 
                          key={team.id} 
                          to={`/tournaments/${id}/register/roster?team=${team.id}`}
                          className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer block"
                        >
                          {cardContent}
                        </Link>
                      ) : (
                        <div key={team.id} className="p-4 border rounded-lg">
                          {cardContent}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No teams registered yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Match Schedule</h2>
                    <p className="text-sm text-muted-foreground">
                      {tournamentMatches.length} matches • {registeredTeams.length}/{tournamentNumTeams} teams registered
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      {tournamentMatches.length === 0 ? (
                        <Button
                          onClick={() => generateSchedule.mutate()}
                          disabled={generateSchedule.isPending || tournamentFormat === "league"}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Generate Schedule
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
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
                  <p className="text-center text-muted-foreground py-8">League schedule not yet available</p>
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
    </Layout>
  );
}
