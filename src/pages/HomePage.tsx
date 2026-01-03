import { Link, useNavigate } from "react-router-dom";
import communityHighlight1 from "@/assets/community-highlight-1.jpg";
import communityHighlight2 from "@/assets/community-highlight-2.jpg";
import communityHighlight3 from "@/assets/community-highlight-3.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Calendar, ArrowRight, Play, Trophy, 
  BarChart3, Zap, Crown, Medal, MapPin, Target,
  Plus, Heart, Award, Star, ChevronRight, ChevronDown, Navigation,
  Search, GraduationCap, Dumbbell, Shield, Crosshair, Wind, Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const navigate = useNavigate();
  const { latitude, longitude, loading: locationLoading } = useGeolocation();
  const [selectedCity, setSelectedCity] = useState<string>("Current Location");
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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

  // Fetch nearby tournaments
  const { data: nearbyTournaments } = useQuery({
    queryKey: ["home-nearby-tournaments", selectedCity],
    queryFn: async () => {
      const today = new Date().toISOString();
      const { data } = await supabase
        .from("tournaments")
        .select("*, turfs(name, city)")
        .or(`status.eq.draft,status.eq.in_progress,status.eq.upcoming`)
        .gte("end_datetime", today)
        .order("start_datetime", { ascending: true })
        .limit(10);

      if (!data) return [];

      // Filter by city if not "Current Location"
      if (selectedCity !== "Current Location") {
        return data.filter((t: any) => t.city === selectedCity || t.turfs?.city === selectedCity).slice(0, 3);
      }

      return data.slice(0, 3);
    },
  });

  // Fetch featured turfs/venues
  const { data: featuredTurfs } = useQuery({
    queryKey: ["home-featured-turfs", selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("turfs")
        .select("*")
        .eq("active", true)
        .order("is_featured", { ascending: false })
        .limit(10);

      const { data } = await query;

      if (!data) return [];

      // Filter by city if not "Current Location"
      if (selectedCity !== "Current Location") {
        return data.filter((t: any) => t.city === selectedCity).slice(0, 3);
      }

      return data.slice(0, 3);
    },
  });

  // Helper function to get tournament status badge
  const getTournamentStatus = (tournament: any) => {
    const now = new Date();
    const start = new Date(tournament.start_datetime);
    const regDeadline = tournament.registration_deadline ? new Date(tournament.registration_deadline) : null;
    
    if (tournament.status === "in_progress") {
      return { label: "Live", variant: "destructive" as const };
    }
    if (tournament.registration_open && regDeadline && now < regDeadline) {
      return { label: "Registrations Open", variant: "default" as const };
    }
    if (now < start) {
      return { label: "Upcoming", variant: "secondary" as const };
    }
    return { label: "Upcoming", variant: "secondary" as const };
  };

  const quickActions = [
    { icon: Plus, label: "Join Match", description: "Join open games near you", href: "/matches", color: "bg-primary" },
    { icon: Play, label: "Host Match", description: "Organise a game at your venue", href: "/host-match", color: "bg-accent" },
    { icon: Trophy, label: "Tournaments", description: "Join leagues or host tournaments", href: "/tournaments", color: "bg-primary" },
    { icon: Award, label: "Leaderboards", description: "See top players and teams", href: "/leaderboards", color: "bg-accent" },
    { icon: BarChart3, label: "Analytics", description: "Track your match performance", href: "/get-analytics", color: "bg-primary" },
    { icon: Zap, label: "Improve", description: "Learn skills and train better", href: "/improve/football", color: "bg-accent" },
  ];

  const improveCategories = [
    { 
      icon: Shield, 
      label: "Defending", 
      description: "Tackling, positioning & marking",
      href: "/improve/football",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    { 
      icon: Crosshair, 
      label: "Shooting", 
      description: "Finishing, power & accuracy",
      href: "/improve/football",
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    { 
      icon: Wind, 
      label: "Dribbling", 
      description: "Ball control & skill moves",
      href: "/improve/football",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    { 
      icon: Target, 
      label: "Passing", 
      description: "Vision, accuracy & timing",
      href: "/improve/football",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
  ];

  const searchItems = [
    { type: "page", label: "Browse Matches", href: "/matches", icon: Users },
    { type: "page", label: "Tournaments", href: "/tournaments", icon: Trophy },
    { type: "page", label: "Leaderboards", href: "/leaderboards", icon: Award },
    { type: "page", label: "Host a Match", href: "/host-match", icon: Play },
    { type: "page", label: "Improve Skills", href: "/improve/football", icon: GraduationCap },
    { type: "page", label: "Analytics", href: "/get-analytics", icon: BarChart3 },
    { type: "page", label: "Community", href: "/community", icon: Users },
    { type: "page", label: "Find Turfs", href: "/turfs", icon: MapPin },
  ];

  const filteredSearchItems = searchItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(href);
  };

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
      <div className="min-h-screen-safe">
        {/* Top Bar - Location + Search */}
        <div className="bg-background/95 backdrop-blur-xl border-b border-border/30 px-3 md:px-4 py-2.5 sticky top-12 md:top-14 z-40">
          <div className="flex items-center gap-2">
            {/* Location Selector */}
            <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 gap-1 h-8 px-2.5 active:scale-95 transition-transform touch-manipulation"
                >
                  {selectedCity === "Current Location" ? (
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className="max-w-[80px] truncate text-xs">
                    {selectedCity === "Current Location" 
                      ? (locationLoading ? "Locating..." : "Near Me") 
                      : selectedCity}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
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

            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Search matches, players, tournaments..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  // Delay closing to allow click on results
                  setTimeout(() => setSearchOpen(false), 200);
                }}
                className="pl-9 h-9 bg-muted/50"
              />
              {searchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                  {filteredSearchItems.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No results found.</div>
                  ) : (
                    <div className="p-1">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Quick Links</div>
                      {filteredSearchItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.href}
                            onClick={() => handleSearchSelect(item.href)}
                            className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent cursor-pointer"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Section - Player Card + Quick Actions */}
        <div className="hero-gradient px-3 md:px-6 pt-4 pb-5 md:pb-6 rounded-b-3xl">
          {/* Desktop: Side-by-side layout | Mobile: Stacked layout */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            
            {/* Player Card Section - Fixed height container */}
            <div className="flex flex-col md:shrink-0 md:w-[200px]">
              <div className="flex items-start gap-4 md:flex-col md:items-start">
                {/* Player Card with proper containment */}
                <div className="relative h-[160px] w-[120px] md:h-[200px] md:w-[160px] shrink-0">
                  <Link to="/profile" className="active:scale-95 transition-transform touch-manipulation block">
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
                      className="transform scale-[0.40] md:scale-[0.50] origin-top-left"
                    />
                  </Link>
                </div>
                
                {/* Mobile: Level badge next to player card */}
                <div className="flex flex-col gap-2 md:hidden pt-2">
                  <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-primary-foreground/20 inline-flex items-center gap-2 w-fit">
                    <Star className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-primary-foreground/70 text-[9px]">Level</p>
                      <p className="text-primary-foreground font-semibold text-xs">
                        {getPlayerLevel(userStats?.ratingCount || 0, userStats?.rating || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* CTA text below player card */}
              <p className="text-primary-foreground/60 text-[9px] md:text-[10px] italic leading-tight mt-2">Start playing to build your profile</p>
            </div>

            {/* Right Side - Level (desktop) + Quick Actions */}
            <div className="flex-1 flex flex-col gap-3 md:gap-3">
              {/* Desktop: Player Level Badge */}
              <div className="hidden md:inline-flex bg-primary-foreground/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-primary-foreground/20 items-center gap-2 w-fit">
                <Star className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-primary-foreground/70 text-[10px]">Level</p>
                  <p className="text-primary-foreground font-semibold text-sm">
                    {getPlayerLevel(userStats?.ratingCount || 0, userStats?.rating || 0)}
                  </p>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.href} className="group active:scale-95 transition-transform touch-manipulation">
                      <div className="flex flex-col items-center justify-center gap-1.5 md:gap-2 px-2 py-3 md:py-5 rounded-xl md:rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 active:bg-primary-foreground/25 hover:bg-primary-foreground/20 transition-colors">
                        <div className={`w-8 h-8 md:w-11 md:h-11 rounded-full ${action.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        <span className="text-[11px] md:text-sm font-medium text-primary-foreground text-center leading-tight">
                          {action.label}
                        </span>
                        <span className="text-[9px] md:text-xs text-primary-foreground/60 text-center leading-tight line-clamp-2 px-1 hidden sm:block">
                          {action.description}
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
        <div className="px-3 md:px-4 pt-4 space-y-5 md:space-y-6 pb-28">

          {/* Three-Column Discovery Section */}
          <div className="space-y-4 md:space-y-6">
            {/* Section Header */}
            <h2 className="font-bold text-lg md:text-xl text-foreground">Discover</h2>

            {/* Horizontal Scroll on Mobile, Grid on larger screens */}
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth-touch lg:grid lg:grid-cols-3 lg:overflow-visible -mx-3 md:-mx-4 px-3 md:px-4">
              
              {/* Column 1: Matches Near You */}
              <div className="min-w-[300px] w-[85vw] max-w-[360px] flex-shrink-0 snap-start lg:w-auto lg:min-w-0 lg:max-w-none">
                <Card className="glass-card h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="mb-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-base">Matches Near You</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-[52px]">Find and join local games</p>
                    </div>

                    <div className="flex flex-col gap-8 flex-1">
                      {nearbyMatches && nearbyMatches.length > 0 ? (
                        nearbyMatches.slice(0, 3).map((match: any) => (
                          <Link key={match.id} to={`/matches/${match.id}`} className="block">
                            <div className="p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 shadow-sm hover:shadow-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-accent">
                                  {new Date(match.match_date).toLocaleDateString("en-IN", { 
                                    day: "2-digit", month: "short" 
                                  })} • {match.match_time?.slice(0, 5)}
                                </p>
                                {match.distance !== null && match.distance !== undefined && (
                                  <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-md font-medium">
                                    {formatDistance(match.distance)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium line-clamp-1 mb-1">{match.match_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{match.turfs?.name}</p>
                              <Button size="sm" variant="ghost" className="mt-3 h-8 text-xs w-full justify-center text-primary hover:text-primary">
                                Join Match <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                              </Button>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No matches nearby</p>
                        </div>
                      )}
                    </div>

                    <Link to="/matches" className="mt-4 pt-4 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="w-full text-sm h-9 text-primary hover:text-primary">
                        View all matches <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Column 2: Tournaments Around You */}
              <div className="min-w-[300px] w-[85vw] max-w-[360px] flex-shrink-0 snap-start lg:w-auto lg:min-w-0 lg:max-w-none">
                <Card className="glass-card h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="mb-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-accent" />
                        </div>
                        <h3 className="font-semibold text-base">Tournaments Nearby</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-[52px]">Leagues, knockouts & weekend competitions</p>
                    </div>

                    <div className="flex flex-col gap-8 flex-1">
                      {nearbyTournaments && nearbyTournaments.length > 0 ? (
                        nearbyTournaments.slice(0, 3).map((tournament: any) => {
                          const status = getTournamentStatus(tournament);
                          return (
                            <Link key={tournament.id} to={`/tournaments/${tournament.id}`} className="block">
                              <div className="p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 shadow-sm hover:shadow-md">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant={status.variant} className="text-[10px] px-2 py-0.5">
                                    {status.label}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(tournament.start_datetime).toLocaleDateString("en-IN", { 
                                      day: "2-digit", month: "short" 
                                    })}
                                  </p>
                                </div>
                                <p className="text-sm font-medium line-clamp-1 mb-1">{tournament.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{tournament.city}</p>
                                <Button size="sm" variant="ghost" className="mt-3 h-8 text-xs w-full justify-center text-accent hover:text-accent">
                                  View Tournament <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                              </div>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center">
                          <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No tournaments nearby</p>
                        </div>
                      )}
                    </div>

                    <Link to="/tournaments" className="mt-4 pt-4 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="w-full text-sm h-9 text-accent hover:text-accent">
                        Explore all tournaments <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Column 3: Book Venues */}
              <div className="min-w-[300px] w-[85vw] max-w-[360px] flex-shrink-0 snap-start lg:w-auto lg:min-w-0 lg:max-w-none">
                <Card className="glass-card h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="mb-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-base">Book a Venue</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-[52px]">Find turfs and grounds to play</p>
                    </div>

                    <div className="flex flex-col gap-8 flex-1">
                      {featuredTurfs && featuredTurfs.length > 0 ? (
                        featuredTurfs.slice(0, 3).map((turf: any) => (
                          <Link key={turf.id} to={`/turfs/${turf.id}`} className="block">
                            <div className="p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 shadow-sm hover:shadow-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-primary">
                                  ₹{turf.price_per_hour}/hr
                                </p>
                                {turf.is_featured && (
                                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium line-clamp-1 mb-1">{turf.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{turf.city}</p>
                              <Button size="sm" variant="ghost" className="mt-3 h-8 text-xs w-full justify-center text-primary hover:text-primary">
                                Book Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                              </Button>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No venues nearby</p>
                        </div>
                      )}
                    </div>

                    <Link to="/turfs" className="mt-4 pt-4 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="w-full text-sm h-9 text-primary hover:text-primary">
                        View all venues <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>

          {/* Top Players */}
          {topPlayers && topPlayers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  Top Players
                </h2>
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

          {/* Community Highlights Section */}
          <div className="pt-2">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                {/* Carousel */}
                <div className="relative h-48 overflow-hidden">
                  <div className="flex animate-[slide_15s_linear_infinite] hover:[animation-play-state:paused]">
                    <img 
                      src={communityHighlight1} 
                      alt="Football action" 
                      className="w-full h-48 object-cover flex-shrink-0"
                    />
                    <img 
                      src={communityHighlight2} 
                      alt="Match in progress" 
                      className="w-full h-48 object-cover flex-shrink-0"
                    />
                    <img 
                      src={communityHighlight3} 
                      alt="Goal celebration" 
                      className="w-full h-48 object-cover flex-shrink-0"
                    />
                    <img 
                      src={communityHighlight1} 
                      alt="Football action" 
                      className="w-full h-48 object-cover flex-shrink-0"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                </div>
                
                {/* Content */}
                <div className="p-5 -mt-12 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Community Highlights</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 ml-[52px]">
                    Goals, moments & performances from players like you
                  </p>
                  <Link to="/community">
                    <Button variant="outline" className="w-full h-11 text-sm font-medium">
                      Explore the community <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* About SportsIQ Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">SportsIQ</h2>
                <p className="text-xs text-muted-foreground">Your Sports Companion</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Discover local matches, host your own games, and track your performance with AI-powered analytics. Connect with players in your city and elevate your game.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-xl bg-background/50">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs font-medium">Join Matches</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-background/50">
                <Play className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs font-medium">Host Games</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-background/50">
                <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs font-medium">Get Analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickActionsFAB />
    </AppLayout>
  );
}
