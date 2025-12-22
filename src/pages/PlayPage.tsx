import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Play, BarChart3, ArrowRight, MapPin, Calendar } from "lucide-react";

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

  const actionCards = [
    {
      icon: Users,
      title: "Join a Match",
      description: "Find and join open matches near you",
      href: "/matches",
      gradient: "from-primary to-accent",
    },
    {
      icon: Play,
      title: "Start a Match",
      description: "Host your own game at a turf",
      href: "/host-match",
      gradient: "from-accent to-primary",
    },
    {
      icon: BarChart3,
      title: "Get Analytics",
      description: "Upload footage for AI insights",
      href: "/get-analytics",
      gradient: "from-primary/80 to-accent/80",
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

        {/* Main Action Cards */}
        <div className="space-y-4">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.href}>
                <Card className={`bg-gradient-to-br ${card.gradient} text-primary-foreground overflow-hidden group cursor-pointer`}>
                  <CardContent className="p-6 relative">
                    <div className="absolute -right-6 -bottom-6 opacity-10">
                      <Icon className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                          <Icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-bold">{card.title}</h2>
                          <p className="text-sm text-primary-foreground/80">{card.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Upcoming Matches */}
        {upcomingMatches && upcomingMatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Open Matches</h3>
              <Link to="/matches" className="text-xs text-primary font-medium flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingMatches.slice(0, 3).map((match: any) => (
                <Link key={match.id} to={`/matches/${match.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{match.match_name}</h4>
                        <span className="text-xs text-accent font-medium px-2 py-0.5 bg-accent/10 rounded-full">
                          {match.total_slots} slots
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {match.turfs?.name}, {match.turfs?.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(match.match_date).toLocaleDateString("en-IN", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
