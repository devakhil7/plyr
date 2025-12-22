import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Calendar, ArrowRight, Play, Trophy, 
  BarChart3, Zap, Crown, Medal, MapPin, Target,
  Plus, Heart, Award
} from "lucide-react";
import { QuickActionsFAB } from "@/components/home/QuickActionsFAB";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function HomePage() {
  const { user, profile } = useAuth();

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { matches: 0, rating: 0, ratingCount: 0 };
      
      const { count: matchCount } = await supabase
        .from("match_players")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("join_status", "confirmed");

      const { data: ratings } = await supabase
        .from("player_ratings")
        .select("rating")
        .eq("rated_user_id", user.id)
        .eq("moderation_status", "approved");

      const ratingCount = ratings?.length || 0;
      const avgRating = ratingCount > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
        : 0;

      return { matches: matchCount || 0, rating: avgRating, ratingCount };
    },
    enabled: !!user?.id,
  });

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
        .limit(5);

      if (profile?.city) {
        query = query.eq("turfs.city", profile.city);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const quickActions = [
    { icon: Plus, label: "Join Match", href: "/matches", color: "bg-primary" },
    { icon: Play, label: "Start Match", href: "/host-match", color: "bg-accent" },
    { icon: Trophy, label: "Tournaments", href: "/tournaments", color: "bg-primary" },
    { icon: Award, label: "Leaderboard", href: "/leaderboards", color: "bg-accent" },
    { icon: BarChart3, label: "Analytics", href: "/get-analytics", color: "bg-primary" },
    { icon: Zap, label: "Improve", href: "/improve/football", color: "bg-accent" },
  ];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getPlayerLevel = (ratingCount: number, overallRating: number) => {
    if (ratingCount < 10) return "New Player";
    if (overallRating < 30) return "Beginner";
    if (overallRating < 50) return "Amateur";
    if (overallRating < 80) return "Professional";
    return "Advanced";
  };

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Hero Header with User Info */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent px-4 pt-6 pb-8 rounded-b-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-14 w-14 border-2 border-white/30">
              <AvatarImage src={profile?.profile_photo_url || ""} />
              <AvatarFallback className="bg-white/20 text-white text-lg">
                {profile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-white">
                Hey, {profile?.name?.split(" ")[0] || "Player"}!
              </h1>
              <p className="text-white/70 text-sm">{profile?.city || "Ready to play?"}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <p className="text-white/70 text-xs">Level</p>
              <p className="text-white font-semibold text-sm">
                {getPlayerLevel(userStats?.ratingCount || 0, userStats?.rating || 0)}
              </p>
            </div>
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <p className="text-white/70 text-xs">Matches</p>
              <p className="text-white font-semibold text-sm">{userStats?.matches || 0}</p>
            </div>
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <p className="text-white/70 text-xs">Rating</p>
              <p className="text-white font-semibold text-sm">
                {userStats?.rating ? userStats.rating.toFixed(1) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 -mt-4 space-y-6 pb-24">
          {/* Quick Actions Grid */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.href}>
                      <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-center text-foreground">
                          {action.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Matches */}
          {upcomingMatches && upcomingMatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Upcoming Matches</h2>
                <Link to="/matches">
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
                    View all
                  </Button>
                </Link>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2">
                  {upcomingMatches.map((match: any) => (
                    <Link key={match.id} to={`/matches/${match.id}`}>
                      <Card className="w-[260px] flex-shrink-0 hover:shadow-md transition-shadow border">
                        <CardContent className="p-4">
                          <div className="text-xs text-primary font-medium mb-2">
                            {new Date(match.match_date).toLocaleDateString("en-IN", { 
                              day: "2-digit",
                              month: "short" 
                            })} • {match.match_time?.slice(0, 5)}
                          </div>
                          <h3 className="font-medium text-sm mb-2 line-clamp-2 text-foreground">
                            {match.match_name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{match.turfs?.name || "TBD"}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {match.turfs?.name?.charAt(0) || "M"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">Open</span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary text-xs h-6 px-2">
                              Join
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Top Players */}
          {topPlayers && topPlayers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Top Players</h2>
                <Link to="/leaderboards">
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
                    View all
                  </Button>
                </Link>
              </div>
              <Card className="border">
                <CardContent className="p-4 space-y-1">
                  {topPlayers.map((player, index) => (
                    <Link
                      key={player.id}
                      to={`/players/${player.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-6 flex items-center justify-center">
                        {getRankIcon(index)}
                      </div>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={player.profile_photo_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {player.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {player.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{player.city || "India"}</p>
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {player.avgRating.toFixed(1)}
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Community Feed Link */}
          <Link to="/community">
            <Card className="border hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">Community Feed</h3>
                    <p className="text-xs text-muted-foreground">See highlights & connect</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <QuickActionsFAB />
    </AppLayout>
  );
}
