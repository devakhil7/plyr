import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Play, BarChart3, ArrowRight, MapPin, Calendar, Trophy, ChevronRight } from "lucide-react";

export default function PlayPage() {
  const { user, profile } = useAuth();

  // Fetch nearby/upcoming matches
  const { data: upcomingMatches } = useQuery({
    queryKey: ["play-upcoming-matches", profile?.city],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*, turfs(name, city)")
        .eq("visibility", "public")
        .eq("status", "open")
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true })
        .limit(5);

      const { data } = await query;
      return data || [];
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
      <div className="container-app py-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Play</h1>
          <p className="text-sm text-muted-foreground">Get on the field</p>
        </div>

        {/* Quick Action Cards - 3 Side by Side */}
        <div className="grid grid-cols-3 gap-3">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.href}>
                <Card className="glass-card hover:shadow-lg transition-all duration-300 group h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5">{card.title}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Open Matches Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Open Matches
            </h3>
            <Link to="/matches" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingMatches && upcomingMatches.length > 0 ? (
            <div className="space-y-2">
              {upcomingMatches.slice(0, 3).map((match: any) => (
                <Link key={match.id} to={`/matches/${match.id}`}>
                  <Card className="glass-card hover:shadow-md transition-all duration-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{match.match_name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {match.turfs?.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(match.match_date).toLocaleDateString("en-IN", { 
                                month: "short", 
                                day: "numeric" 
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2 py-1 bg-accent/15 text-accent rounded-full">
                            {match.total_slots} slots
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
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
                        <div className="flex items-center gap-2">
                          {tournament.entry_fee && (
                            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                              ₹{tournament.entry_fee}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
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
