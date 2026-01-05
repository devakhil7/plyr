import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Play, BarChart3, MapPin, Calendar, Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeMatchStatus } from "@/lib/matchStatus";

export default function PlayPage() {
  const { user, profile } = useAuth();

  // Fetch nearby/upcoming matches - filter by computed status
  const { data: upcomingMatches } = useQuery({
    queryKey: ["play-upcoming-matches", profile?.city],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*, turfs(name, city)")
        .eq("visibility", "public")
        .order("match_date", { ascending: true })
        .limit(20); // Fetch more to filter client-side

      const { data } = await query;
      if (!data) return [];
      
      // Filter to only show matches that are actually upcoming based on time
      return data.filter((match: any) => {
        const computedStatus = computeMatchStatus({
          match_date: match.match_date,
          match_time: match.match_time,
          duration_minutes: match.duration_minutes || 60,
        });
        return computedStatus === 'upcoming';
      }).slice(0, 5);
    },
  });

  // Fetch upcoming tournaments
  const { data: upcomingTournaments } = useQuery({
    queryKey: ["play-upcoming-tournaments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*, turfs(name, city)")
        .eq("status", "upcoming")
        .eq("registration_open", true)
        .gte("start_datetime", new Date().toISOString())
        .order("start_datetime", { ascending: true })
        .limit(3);

      return data || [];
    },
  });

  // Fetch user's registered tournament teams
  const { data: myTournamentTeams } = useQuery({
    queryKey: ["my-tournament-teams", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("tournament_teams")
        .select("tournament_id, id")
        .eq("captain_user_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getMyTeamForTournament = (tournamentId: string) => {
    return myTournamentTeams?.find(t => t.tournament_id === tournamentId);
  };

  const actionCards = [
    {
      icon: Users,
      title: "Join Match",
      description: "Find open games",
      href: "/matches",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
    },
    {
      icon: Play,
      title: "Host Game",
      description: "Start your own",
      href: "/host-match",
      iconBg: "bg-accent/15",
      iconColor: "text-accent",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "AI insights",
      href: "/get-analytics",
      iconBg: "bg-secondary/15",
      iconColor: "text-secondary",
    },
  ];

  return (
    <AppLayout>
      <div className="container-app py-3 md:py-4 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="px-1">
          <h1 className="text-xl md:text-2xl font-bold">Play</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Get on the field</p>
        </div>

        {/* Quick Action Cards - 3 Side by Side */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.href}>
                <Card className="glass-card hover:shadow-lg active:scale-[0.98] transition-all duration-300 group h-full touch-manipulation">
                  <CardContent className="p-3 md:p-4 flex flex-col items-center text-center">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-5 w-5 md:h-6 md:w-6 ${card.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-xs md:text-sm mb-0.5">{card.title}</h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Open Matches Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5 md:mb-3 px-1">
            <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Open Matches
            </h3>
            <Link to="/matches" className="text-xs text-primary font-medium flex items-center gap-1 active:opacity-70 touch-manipulation">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingMatches && upcomingMatches.length > 0 ? (
            <div className="space-y-2">
              {upcomingMatches.slice(0, 3).map((match: any) => (
                <Link key={match.id} to={`/matches/${match.id}`} className="block touch-manipulation">
                  <Card className="glass-card hover:shadow-md active:scale-[0.99] transition-all duration-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{match.match_name}</h4>
                          <div className="flex items-center gap-2 md:gap-3 text-[11px] md:text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {match.turfs?.name}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3" />
                              {new Date(match.match_date).toLocaleDateString("en-IN", { 
                                month: "short", 
                                day: "numeric" 
                              })}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="default" className="text-xs h-7 px-3 shrink-0">
                          Join
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No open matches available</p>
                <Link to="/host-match" className="text-xs text-primary font-medium mt-1 inline-block hover:underline">
                  Host your own match
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tournaments Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" />
              Tournaments
            </h3>
            <Link to="/tournaments" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingTournaments && upcomingTournaments.length > 0 ? (
            <div className="space-y-2">
              {upcomingTournaments.map((tournament: any) => (
                <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
                  <Card className="glass-card hover:shadow-md transition-all duration-200 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                            <Trophy className="h-5 w-5 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate">{tournament.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {tournament.city}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(tournament.start_datetime).toLocaleDateString("en-IN", { 
                                  month: "short", 
                                  day: "numeric" 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const myTeam = getMyTeamForTournament(tournament.id);
                          if (myTeam) {
                            return (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-3" asChild>
                                <Link to={`/tournaments/${tournament.id}/roster/${myTeam.id}`} onClick={(e) => e.stopPropagation()}>
                                  Manage Roster
                                </Link>
                              </Button>
                            );
                          }
                          return (
                            <Button size="sm" variant="default" className="text-xs h-7 px-3">
                              Register
                            </Button>
                          );
                        })()}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming tournaments</p>
                <Link to="/tournaments" className="text-xs text-primary font-medium mt-1 inline-block hover:underline">
                  Browse all tournaments
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
