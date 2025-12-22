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
  Plus, Heart, Award, Star, ChevronRight, ChevronDown, Navigation
} from "lucide-react";
import { QuickActionsFAB } from "@/components/home/QuickActionsFAB";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useGeolocation, calculateDistance, formatDistance, getCityCoordinates } from "@/hooks/useGeolocation";
import { useMemo, useState } from "react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { calculateWinsLosses } from "@/lib/playerStats";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const AVAILABLE_CITIES = [
  "Current Location",
  "Mumbai",
  "Bangalore", 
  "Delhi",
  "Gurgaon",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Noida",
];

export default function HomePage() {
  const { user, profile } = useAuth();
  const { latitude, longitude, loading: locationLoading } = useGeolocation();
  const [selectedCity, setSelectedCity] = useState<string>("Current Location");
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);

  // Fetch user stats for PlayerCard
  const { data: userStats } = useQuery({
    queryKey: ["user-stats-full", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch favourite_club from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("favourite_club")
        .eq("id", user.id)
        .single();
      
      // Match count
      const { count: matchCount } = await supabase
        .from("match_players")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("join_status", "confirmed");

      // Player ratings with averages
      const { data: ratings } = await supabase
        .from("player_ratings")
        .select("rating, pace, shooting, passing, dribbling, defending, ball_control")
        .eq("rated_user_id", user.id)
        .eq("moderation_status", "approved");

      const ratingCount = ratings?.length || 0;
      const avgRating = ratingCount > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount : 0;
      const avgPace = ratingCount > 0 ? ratings.reduce((sum, r) => sum + (r.pace || 0), 0) / ratingCount : null;
      const avgShooting = ratingCount > 0 ? ratings.reduce((sum, r) => sum + (r.shooting || 0), 0) / ratingCount : null;
      const avgPassing = ratingCount > 0 ? ratings.reduce((sum, r) => sum + (r.passing || 0), 0) / ratingCount : null;
      const avgDribbling = ratingCount > 0 ? ratings.reduce((sum, r) => sum + (r.dribbling || 0), 0) / ratingCount : null;
      const avgDefending = ratingCount > 0 ? ratings.reduce((sum, r) => sum + (r.defending || 0), 0) / ratingCount : null;
      const avgPhysical = ratingCount > 0 ? ratings.reduce((sum, r) => sum + (r.ball_control || 0), 0) / ratingCount : null;

      // Goals and assists
      const { data: matchEventsAsScorer } = await supabase
        .from("match_events")
        .select("id")
        .eq("scorer_user_id", user.id);
      
      const { data: matchEventsAsAssist } = await supabase
        .from("match_events")
        .select("id")
        .eq("assist_user_id", user.id);

      // Wins calculation
      const { data: matchParticipations } = await supabase
        .from("match_players")
        .select("team, matches(team_a_score, team_b_score, status)")
        .eq("user_id", user.id)
        .eq("join_status", "confirmed");

      const { wins } = calculateWinsLosses(matchParticipations || []);

      return {
        matches: matchCount || 0,
        rating: avgRating,
        ratingCount,
        pace: avgPace,
        shooting: avgShooting,
        passing: avgPassing,
        dribbling: avgDribbling,
        defending: avgDefending,
        physical: avgPhysical,
        goals: matchEventsAsScorer?.length || 0,
        assists: matchEventsAsAssist?.length || 0,
        wins,
        favourite_club: profileData?.favourite_club || null,
      };
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

    // Get user coordinates based on selected city or current location
    let userLat: number | null = null;
    let userLng: number | null = null;

    if (selectedCity === "Current Location") {
      // Use geolocation or fall back to profile city
      userLat = latitude;
      userLng = longitude;
      if (!userLat || !userLng) {
        if (profile?.city) {
          const cityCoords = getCityCoordinates(profile.city);
          if (cityCoords) {
            userLat = cityCoords.lat;
            userLng = cityCoords.lng;
          }
        }
      }
    } else {
      // Use selected city coordinates
      const cityCoords = getCityCoordinates(selectedCity);
      if (cityCoords) {
        userLat = cityCoords.lat;
        userLng = cityCoords.lng;
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
  }, [allNearbyMatches, latitude, longitude, profile?.city, selectedCity]);

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
        {/* Hero Section - Player Card + Quick Actions */}
        <div className="hero-gradient px-4 pt-4 pb-6 rounded-b-3xl">
          <div className="flex gap-3 items-stretch">
            {/* Player Card - Left */}
            <Link to="/profile" className="shrink-0 w-[160px]">
              <div className="h-full flex items-center">
                <PlayerCard
                  player={{
                    name: profile?.name || null,
                    position: profile?.position || null,
                    city: profile?.city || null,
                    profile_photo_url: profile?.profile_photo_url || null,
                    favourite_club: userStats?.favourite_club || null,
                  }}
                  stats={{
                    overall: userStats?.rating || null,
                    pace: userStats?.pace || null,
                    shooting: userStats?.shooting || null,
                    passing: userStats?.passing || null,
                    dribbling: userStats?.dribbling || null,
                    defending: userStats?.defending || null,
                    physical: userStats?.physical || null,
                    matches: userStats?.matches || 0,
                    goals: userStats?.goals || 0,
                    assists: userStats?.assists || 0,
                    wins: userStats?.wins || 0,
                  }}
                  className="transform scale-[0.57] origin-top-left -mr-[120px] -mb-[172px]"
                />
              </div>
            </Link>

            {/* Right Side - Level + Quick Actions */}
            <div className="flex-1 flex flex-col gap-2">
              {/* Player Level Badge */}
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-primary-foreground/20 inline-flex items-center gap-2 w-fit">
                <Star className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-primary-foreground/70 text-[10px]">Level</p>
                  <p className="text-primary-foreground font-semibold text-sm">
                    {getPlayerLevel(userStats?.ratingCount || 0, userStats?.rating || 0)}
                  </p>
                </div>
              </div>

              {/* Quick Actions - 2 rows × 3 columns */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.href} className="h-full">
                      <div className="flex flex-col items-center justify-center gap-2 px-3 py-4 h-full rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-colors">
                        <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-primary-foreground text-center leading-tight">
                          {action.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 mt-2 space-y-6 pb-24">

          {/* Matches Section - Split into Two */}
          <div className="grid grid-cols-2 gap-3">
            {/* Matches Near Me */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="font-semibold text-sm flex items-center gap-1.5 hover:text-primary transition-colors">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {selectedCity === "Current Location" ? "Near Me" : selectedCity}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      {AVAILABLE_CITIES.map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            setSelectedCity(city);
                            setLocationPopoverOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                            selectedCity === city 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "hover:bg-muted"
                          }`}
                        >
                          {city === "Current Location" ? (
                            <Navigation className="h-3.5 w-3.5" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                          {city}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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
