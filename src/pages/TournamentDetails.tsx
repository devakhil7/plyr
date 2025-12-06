import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Trophy, Calendar, MapPin, Users, IndianRupee, ArrowLeft, FileText, CreditCard } from "lucide-react";
import { format, isPast } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { TournamentRegistrationDialog } from "@/components/tournaments/TournamentRegistrationDialog";
import { PayBalanceDialog } from "@/components/tournaments/PayBalanceDialog";

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(`
          *,
          turfs (id, name, city, location),
          tournament_teams (
            id, team_name, captain_user_id,
            profiles:captain_user_id (id, name, profile_photo_url)
          ),
          tournament_matches (
            id, round, match_id,
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

  const statusColors: Record<string, string> = {
    upcoming: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    live: "bg-green-500/10 text-green-600 border-green-500/20",
    completed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  };

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
                <p className="font-medium">{tournament.tournament_teams?.length || 0} registered</p>
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

          {/* Registration Button */}
          {tournament.registration_open && 
           (!tournament.registration_deadline || !isPast(new Date(tournament.registration_deadline))) && 
           user && (
            <div className="mt-6">
              <TournamentRegistrationDialog tournament={tournament as any} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams ({tournament.tournament_teams?.length || 0})</TabsTrigger>
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
                <Card className="md:col-span-2">
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
                {tournament.tournament_teams?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {tournament.tournament_teams.map((team: any) => (
                      <div key={team.id} className="p-4 border rounded-lg">
                        <p className="font-semibold mb-1">{team.team_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Captain: {team.profiles?.name || "Unknown"}
                        </p>
                      </div>
                    ))}
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
                {tournament.tournament_matches?.length > 0 ? (
                  <div className="space-y-4">
                    {tournament.tournament_matches.map((tm: any) => (
                      <div key={tm.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">{tm.round}</Badge>
                          <p className="font-medium">{tm.matches?.match_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tm.matches?.match_date} at {tm.matches?.match_time?.slice(0, 5)}
                          </p>
                        </div>
                        {tm.matches?.team_a_score !== null && (
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {tm.matches?.team_a_score} - {tm.matches?.team_b_score}
                            </p>
                          </div>
                        )}
                        <Link to={`/matches/${tm.match_id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Match schedule not yet available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
