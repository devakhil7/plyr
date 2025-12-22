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
  Plus, Heart, Award, Star, ChevronRight
} from "lucide-react";
import { QuickActionsFAB } from "@/components/home/QuickActionsFAB";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useGeolocation, calculateDistance, formatDistance, getCityCoordinates } from "@/hooks/useGeolocation";
import { useMemo } from "react";

export default function HomePage() {
  const { user, profile } = useAuth();
  const { latitude, longitude, loading: locationLoading } = useGeolocation();

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

  // Fetch matches near user (public open matches)
  const { data: allNearbyMatches } = useQuery({
    queryKey: ["home-nearby-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, turfs(name, city, latitude, longitude)")
        .eq("visibility", "public")
        .eq("status", "open")
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true })
        .limit(20);

      return data || [];
    },
  });

  // Sort matches by distance if we have user location
  const nearbyMatches = useMemo(() => {
    if (!allNearbyMatches) return [];

    // Get user coordinates - either from geolocation or from profile city
    let userLat = latitude;
    let userLng = longitude;

    if (!userLat || !userLng) {
      // Fall back to profile city coordinates
      if (profile?.city) {
        const cityCoords = getCityCoordinates(profile.city);
        if (cityCoords) {
          userLat = cityCoords.lat;
          userLng = cityCoords.lng;
        }
      }
    }

    // If we have location, calculate distances and sort
    if (userLat && userLng) {
      const matchesWithDistance = allNearbyMatches.map((match: any) => {
        let distance: number | null = null;
        
        // First try turf coordinates
        if (match.turfs?.latitude && match.turfs?.longitude) {
          distance = calculateDistance(userLat!, userLng!, match.turfs.latitude, match.turfs.longitude);
        } else if (match.turfs?.city) {
          // Fall back to city coordinates
          const turfCityCoords = getCityCoordinates(match.turfs.city);
          if (turfCityCoords) {
            distance = calculateDistance(userLat!, userLng!, turfCityCoords.lat, turfCityCoords.lng);
          }
        }
        
        return { ...match, distance };
      });

      // Sort by distance (null distances go to end)
      return matchesWithDistance
        .sort((a: any, b: any) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        })
        .slice(0, 3);
    }

    // No location, just return first 3
    return allNearbyMatches.slice(0, 3);
  }, [allNearbyMatches, latitude, longitude, profile?.city]);

  // Fetch user's upcoming matches (joined or hosted)
  const { data: myUpcomingMatches } = useQuery({
    queryKey: ["home-my-matches", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Matches user joined
      const { data: joinedMatches } = await supabase
        .from("match_players")
        .select("match_id, matches(*, turfs(name, city))")
        .eq("user_id", user.id)
        .eq("join_status", "confirmed");

      // Matches user hosted
      const { data: hostedMatches } = await supabase
        .from("matches")
        .select("*, turfs(name, city)")
        .eq("host_id", user.id)
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true });

      const joinedIds = new Set((hostedMatches || []).map(m => m.id));
      const joined = (joinedMatches || [])
        .filter((mp: any) => mp.matches && !joinedIds.has(mp.matches.id))
        .map((mp: any) => ({ ...mp.matches, isJoined: true }))
        .filter((m: any) => m.match_date >= new Date().toISOString().split("T")[0]);

      const hosted = (hostedMatches || []).map((m: any) => ({ ...m, isHosted: true }));

      return [...hosted, ...joined]
        .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
        .slice(0, 3);
    },
    enabled: !!user?.id,
  });

  // Fetch past matches for rating (matches user participated in that are completed)
  const { data: matchesToRate } = useQuery({
    queryKey: ["matches-to-rate", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get matches user played in
      const { data: myMatches } = await supabase
        .from("match_players")
        .select(`
          match_id,
          matches(
            id, 
            match_name, 
            match_date,
            status,
            turfs(name)
          )
        `)
        .eq("user_id", user.id)
        .eq("join_status", "confirmed");

      if (!myMatches) return [];

      // Filter completed matches
      const completedMatches = myMatches
        .filter((mp: any) => mp.matches?.status === "completed")
        .map((mp: any) => mp.matches);

      // Get ratings user already gave
      const { data: existingRatings } = await supabase
        .from("player_ratings")
        .select("match_id")
        .eq("rater_user_id", user.id);

      const ratedMatchIds = new Set((existingRatings || []).map(r => r.match_id));

      // Filter out matches user already rated
      return completedMatches
        .filter((m: any) => !ratedMatchIds.has(m.id))
        .slice(0, 3);
    },
    enabled: !!user?.id,
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
        {/* Hero Header */}
        <div className="hero-gradient px-4 pt-6 pb-8 rounded-b-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-14 w-14 border-2 border-primary-foreground/30 ring-2 ring-primary-foreground/10">
              <AvatarImage src={profile?.profile_photo_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary-foreground text-lg font-bold">
                {profile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">
                Hey, {profile?.name?.split(" ")[0] || "Player"}!
              </h1>
              <p className="text-primary-foreground/70 text-sm">{profile?.city || "Ready to play?"}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-primary-foreground/20">
              <p className="text-primary-foreground/70 text-xs">Level</p>
              <p className="text-primary-foreground font-semibold text-sm">
                {getPlayerLevel(userStats?.ratingCount || 0, userStats?.rating || 0)}
              </p>
            </div>
            <div className="flex-1 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-primary-foreground/20">
              <p className="text-primary-foreground/70 text-xs">Matches</p>
              <p className="text-primary-foreground font-semibold text-sm">{userStats?.matches || 0}</p>
            </div>
            <div className="flex-1 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-primary-foreground/20">
              <p className="text-primary-foreground/70 text-xs">Rating</p>
              <p className="text-primary-foreground font-semibold text-sm">
                {userStats?.rating ? userStats.rating.toFixed(1) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 -mt-4 space-y-6 pb-24">
          {/* Quick Actions Grid */}
          <Card className="glass-card shadow-lg border-0">
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

          {/* Matches Section - Split into Two */}
          <div className="grid grid-cols-2 gap-3">
            {/* Matches Near Me */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Near Me
                </h3>
                <Link to="/matches" className="text-xs text-primary flex items-center">
                  All <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {nearbyMatches && nearbyMatches.length > 0 ? (
                  nearbyMatches.map((match: any) => (
                    <Link key={match.id} to={`/matches/${match.id}`}>
                      <Card className="glass-card hover:shadow-md transition-all">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-accent font-medium">
                              {new Date(match.match_date).toLocaleDateString("en-IN", { 
                                day: "2-digit", month: "short" 
                              })}
                            </p>
                            {match.distance !== null && match.distance !== undefined && (
                              <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                                {formatDistance(match.distance)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium line-clamp-1 mb-1">{match.match_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {match.turfs?.name}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                ) : (
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">No matches nearby</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* My Upcoming Matches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  My Matches
                </h3>
                <Link to="/matches" className="text-xs text-primary flex items-center">
                  All <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {myUpcomingMatches && myUpcomingMatches.length > 0 ? (
                  myUpcomingMatches.map((match: any) => (
                    <Link key={match.id} to={`/matches/${match.id}`}>
                      <Card className="glass-card hover:shadow-md transition-all">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-[10px] text-accent font-medium">
                              {new Date(match.match_date).toLocaleDateString("en-IN", { 
                                day: "2-digit", month: "short" 
                              })}
                            </p>
                            {match.isHosted && (
                              <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">Host</span>
                            )}
                          </div>
                          <p className="text-xs font-medium line-clamp-1 mb-1">{match.match_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {match.turfs?.name}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                ) : (
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Calendar className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">No upcoming</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

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
              <Card className="glass-card">
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

          {/* Rate Players Section */}
          {matchesToRate && matchesToRate.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-accent" />
                  Rate Players
                </h2>
              </div>
              <Card className="glass-card">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Rate players from your past matches
                  </p>
                  {matchesToRate.map((match: any) => (
                    <Link
                      key={match.id}
                      to={`/matches/${match.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{match.match_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(match.match_date).toLocaleDateString("en-IN", { 
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                          {match.turfs?.name && ` • ${match.turfs.name}`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="ml-2 h-8 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Rate
                      </Button>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Spacing before Community Feed */}
          <div className="pt-2">
            {/* Community Feed Link */}
            <Link to="/community">
              <Card className="glass-card hover:shadow-md transition-shadow">
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
      </div>

      <QuickActionsFAB />
    </AppLayout>
  );
}
