import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trophy, Target, TrendingUp, Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { calculateWinsLosses } from "@/lib/playerStats";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem("redirectAfterAuth", window.location.pathname + window.location.search);
      navigate("/auth");
    } else if (!loading && user && profile && !profile.profile_completed) {
      navigate("/complete-profile");
    }
  }, [user, profile, loading, navigate]);

  const { data: upcomingMatches } = useQuery({
    queryKey: ["my-upcoming-matches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("match_players")
        .select(`
          match_id,
          role,
          team,
          matches(*, turfs(name, city))
        `)
        .eq("user_id", user.id)
        .eq("join_status", "confirmed")
        .gte("matches.match_date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false })
        .limit(5);
      return data?.filter(mp => mp.matches) || [];
    },
    enabled: !!user,
  });

  const { data: pastMatches } = useQuery({
    queryKey: ["my-past-matches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("match_players")
        .select(`
          match_id,
          role,
          team,
          matches(*, turfs(name, city), analytics(*))
        `)
        .eq("user_id", user.id)
        .eq("join_status", "confirmed")
        .lt("matches.match_date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false })
        .limit(5);
      return data?.filter(mp => mp.matches) || [];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["my-stats", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, wins: 0, losses: 0 };
      const { data: matchData } = await supabase
        .from("match_players")
        .select(`
          team,
          matches!inner(status, team_a_score, team_b_score)
        `)
        .eq("user_id", user.id)
        .eq("join_status", "confirmed")
        .eq("matches.status", "completed");

      const completed = matchData || [];
      const { wins, losses } = calculateWinsLosses(completed);

      return { total: completed.length, wins, losses };
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome back, {profile?.name?.split(" ")[0] || "Player"}!</h1>
            <p className="text-muted-foreground">Here's your sports activity at a glance</p>
          </div>
          <div className="flex gap-3">
            <Link to="/matches">
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Find Matches
              </Button>
            </Link>
            <Link to="/host-match">
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Host a Match
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Matches Played</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.wins || 0}</p>
                  <p className="text-sm text-muted-foreground">Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.total ? Math.round((stats.wins / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Matches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Upcoming Matches</CardTitle>
              <Link to="/matches">
                <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingMatches && upcomingMatches.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMatches.map((mp: any) => (
                    <Link
                      key={mp.match_id}
                      to={`/matches/${mp.match_id}`}
                      className="block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{mp.matches.match_name}</h4>
                        <Badge variant={mp.role === "host" ? "default" : "secondary"}>
                          {mp.role === "host" ? "Hosting" : "Joined"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {mp.matches.turfs?.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {new Date(mp.matches.match_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No upcoming matches</p>
                  <Link to="/matches" className="text-primary text-sm hover:underline">Find a match to join</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Matches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {pastMatches && pastMatches.length > 0 ? (
                <div className="space-y-3">
                  {pastMatches.slice(0, 5).map((mp: any) => (
                    <Link
                      key={mp.match_id}
                      to={`/matches/${mp.match_id}`}
                      className="block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{mp.matches.match_name}</h4>
                        {mp.matches.team_a_score !== null && (
                          <span className="text-sm font-semibold">
                            {mp.matches.team_a_score} - {mp.matches.team_b_score}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {mp.matches.turfs?.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {new Date(mp.matches.match_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No past matches yet</p>
                  <p className="text-sm">Play your first game!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
