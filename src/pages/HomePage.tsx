import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Calendar, ArrowRight, Play, Trophy, 
  BarChart3, Zap, Target, Crown, Medal, Plus,
  MapPin
} from "lucide-react";
import { QuickActionsFAB } from "@/components/home/QuickActionsFAB";

export default function HomePage() {
  const { user, profile } = useAuth();

  // Fetch top 3 leaderboard players
  const { data: topPlayers } = useQuery({
    queryKey: ["top-leaderboard-players"],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_ratings")
        .select(`
          rated_user_id,
          rating,
          profiles!player_ratings_rated_user_id_fkey(id, name, profile_photo_url, city)
        `)
        .eq("moderation_status", "approved");

      if (!data) return [];

      // Aggregate ratings by player
      const playerRatings: Record<string, { total: number; count: number; profile: any }> = {};
      data.forEach((r: any) => {
        if (!r.profiles) return;
        const id = r.rated_user_id;
        if (!playerRatings[id]) {
          playerRatings[id] = { total: 0, count: 0, profile: r.profiles };
        }
        playerRatings[id].total += r.rating;
        playerRatings[id].count += 1;
      });

      // Sort by average rating and take top 3
      return Object.entries(playerRatings)
        .map(([id, data]) => ({
          id,
          name: data.profile.name,
          city: data.profile.city,
          profile_photo_url: data.profile.profile_photo_url,
          avgRating: data.total / data.count,
        }))
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 3);
    },
  });

  // Fetch upcoming matches near user
  const { data: upcomingMatches } = useQuery({
    queryKey: ["home-upcoming-matches", profile?.city],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*, turfs(name, city)")
        .eq("visibility", "public")
        .eq("status", "open")
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true })
        .limit(3);

      if (profile?.city) {
        query = query.eq("turfs.city", profile.city);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const quickActions = [
    { 
      icon: Play, 
      label: "Start Match", 
      href: "/host-match",
      color: "from-primary to-accent"
    },
    { 
      icon: Trophy, 
      label: "Tournaments", 
      href: "/tournaments",
      color: "from-accent to-primary"
    },
    { 
      icon: BarChart3, 
      label: "Analytics", 
      href: "/get-analytics",
      color: "from-primary/80 to-accent/80"
    },
    { 
      icon: Zap, 
      label: "Improve", 
      href: "/improve/football",
      color: "from-accent/80 to-primary"
    },
  ];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return null;
  };

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {profile?.name ? `Hey, ${profile.name.split(" ")[0]}!` : "Welcome!"}
            </h1>
            <p className="text-sm text-muted-foreground">Ready to play?</p>
          </div>
        </div>

        {/* Primary Action Card - Join a Match */}
        <Link to="/matches">
          <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground overflow-hidden group cursor-pointer">
            <CardContent className="p-6 relative">
              <div className="absolute -right-8 -bottom-8 opacity-10">
                <Users className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Join a Match</h2>
                    <p className="text-sm text-primary-foreground/80">Matches happening near you</p>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-4">
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.href}>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Community Highlights - Top Players */}
        {topPlayers && topPlayers.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Top Players</h3>
                </div>
                <Link to="/leaderboards">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {topPlayers.map((player, index) => (
                  <Link
                    key={player.id}
                    to={`/players/${player.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-6">
                      {getRankIcon(index)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {player.profile_photo_url ? (
                        <img src={player.profile_photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-primary">
                          {player.name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{player.city || "India"}</p>
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {player.avgRating.toFixed(1)}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Matches Near You */}
        {upcomingMatches && upcomingMatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Matches Near You</h3>
              <Link to="/matches">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingMatches.map((match: any) => (
                <Link key={match.id} to={`/matches/${match.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{match.match_name}</h4>
                        <span className="text-xs text-accent font-medium">Open</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {match.turfs?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(match.match_date).toLocaleDateString("en-IN", { 
                            month: "short", 
                            day: "numeric" 
                          })} at {match.match_time?.slice(0, 5)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Community Feed Link */}
        <Link to="/community">
          <Card className="border-dashed">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Community Feed</h3>
                  <p className="text-xs text-muted-foreground">See highlights & events</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Floating Action Button */}
      <QuickActionsFAB />
    </AppLayout>
  );
}
