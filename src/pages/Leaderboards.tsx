import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Star, Target, Users, Award, Medal, Crown, CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { didPlayerWin } from "@/lib/playerStats";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";

type TimePeriod = "month" | "3months" | "6months" | "year" | "custom" | "all";

function getDateRangeForPeriod(period: TimePeriod, customStart?: Date, customEnd?: Date): { start: Date | null; end: Date | null } {
  const now = new Date();
  
  switch (period) {
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "3months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case "6months":
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return { start: customStart || null, end: customEnd || null };
    case "all":
    default:
      return { start: null, end: null };
  }
}

interface LeaderboardEntry {
  id: string;
  name: string;
  profile_photo_url: string | null;
  city: string | null;
  value: number;
  secondaryValue?: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
};

const getRankBadgeClass = (rank: number) => {
  if (rank === 1) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (rank === 2) return "bg-slate-400/10 text-slate-500 border-slate-400/20";
  if (rank === 3) return "bg-amber-700/10 text-amber-700 border-amber-700/20";
  return "";
};

function LeaderboardCard({ 
  title, 
  icon: Icon, 
  entries, 
  loading,
  valueLabel,
  secondaryLabel,
  formatValue = (v: number) => v.toString(),
  showViewAll = false,
  onViewAll
}: {
  title: string;
  icon: React.ElementType;
  entries: LeaderboardEntry[];
  loading: boolean;
  valueLabel: string;
  secondaryLabel?: string;
  formatValue?: (value: number) => string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}) {
  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {showViewAll && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No data available</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <Link
                key={entry.id}
                to={`/players/${entry.id}`}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                  index < 3 ? getRankBadgeClass(index + 1) + " border" : ""
                }`}
              >
                <div className="flex items-center justify-center w-6">
                  {getRankIcon(index + 1)}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {entry.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.name || "Unknown"}</p>
                  {entry.city && (
                    <p className="text-xs text-muted-foreground truncate">{entry.city}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{formatValue(entry.value)}</p>
                  {secondaryLabel && entry.secondaryValue !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {entry.secondaryValue} {secondaryLabel}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Leaderboards() {
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedTurf, setSelectedTurf] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [viewAllDialog, setViewAllDialog] = useState<{
    open: boolean;
    title: string;
    entries: LeaderboardEntry[];
    formatValue: (v: number) => string;
    secondaryLabel?: string;
    page: number;
  }>({ open: false, title: "", entries: [], formatValue: (v) => v.toString(), page: 0 });

  const ITEMS_PER_PAGE = 50;
  const MAX_ENTRIES = 100;

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(selectedPeriod, customStartDate, customEndDate);
  }, [selectedPeriod, customStartDate, customEndDate]);
  // Fetch cities
  const { data: cities = [] } = useQuery({
    queryKey: ["leaderboard-cities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .not("city", "is", null)
        .order("city");
      
      const uniqueCities = [...new Set(data?.map(p => p.city).filter(Boolean))];
      return uniqueCities as string[];
    }
  });

  // Fetch turfs
  const { data: turfs = [] } = useQuery({
    queryKey: ["leaderboard-turfs", selectedCity],
    queryFn: async () => {
      let query = supabase.from("turfs").select("id, name, city").eq("active", true);
      if (selectedCity !== "all") {
        query = query.eq("city", selectedCity);
      }
      const { data } = await query.order("name");
      return data || [];
    }
  });

  const RATINGS_QUERY_VERSION = 2;

  // Rating leaderboard - weighted by count
  const { data: ratingLeaderboard = [], isLoading: loadingRatings } = useQuery({
    queryKey: ["leaderboard-ratings", RATINGS_QUERY_VERSION, selectedCity, selectedTurf, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      // Issue: the backend can cap responses (returns 206 Partial Content),
      // so a single `.limit()` may undercount ratings. We page through all rows.
      const PAGE_SIZE = 1000;

      const fetchAllRatings = async () => {
        const all: any[] = [];
        for (let from = 0; ; from += PAGE_SIZE) {
          let pageQuery = supabase
            .from("player_ratings")
            .select(
              `
              rated_user_id,
              rating,
              match_id,
              created_at,
              matches(turf_id, match_date, turfs(city))
            `
            )
            .eq("moderation_status", "approved")
            .order("created_at", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

          // Apply date filter
          if (dateRange.start) {
            pageQuery = pageQuery.gte("created_at", dateRange.start.toISOString());
          }
          if (dateRange.end) {
            pageQuery = pageQuery.lte("created_at", dateRange.end.toISOString());
          }

          const { data, error } = await pageQuery;
          if (error) throw error;

          const rows = data || [];
          all.push(...rows);
          if (rows.length < PAGE_SIZE) break;
        }
        return all;
      };

      const ratings = await fetchAllRatings();
      if (!ratings.length) return [];

      // Filter by city/turf
      let filteredRatings = ratings;
      if (selectedCity !== "all") {
        filteredRatings = filteredRatings.filter(
          (r: any) => r.matches?.turfs?.city === selectedCity
        );
      }
      if (selectedTurf !== "all") {
        filteredRatings = filteredRatings.filter(
          (r: any) => r.matches?.turf_id === selectedTurf
        );
      }

      // Aggregate by player
      const playerRatings = new Map<string, { sum: number; count: number }>();
      filteredRatings.forEach((r: any) => {
        const current = playerRatings.get(r.rated_user_id) || { sum: 0, count: 0 };
        playerRatings.set(r.rated_user_id, {
          sum: current.sum + r.rating,
          count: current.count + 1
        });
      });

      // Calculate weighted score: avg * log(count + 1) to give weight to rating count
      const playerIds = Array.from(playerRatings.keys());
      if (playerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url, city")
        .in("id", playerIds);

      const results: LeaderboardEntry[] = [];
      profiles?.forEach((profile) => {
        const stats = playerRatings.get(profile.id);
        if (stats && stats.count > 0) {
          const avg = stats.sum / stats.count;
          results.push({
            id: profile.id,
            name: profile.name || "Unknown",
            profile_photo_url: profile.profile_photo_url,
            city: profile.city,
            value: parseFloat(avg.toFixed(2)),
            secondaryValue: stats.count
          });
        }
      });

      // Sort by weighted score: 75% rating + 25% normalized count
      // Normalize count by max count to make it comparable to rating scale (0-5)
      const maxCount = Math.max(...results.map(r => r.secondaryValue || 0), 1);
      results.sort((a, b) => {
        const normalizedCountA = ((a.secondaryValue || 0) / maxCount) * 5; // Scale to 0-5
        const normalizedCountB = ((b.secondaryValue || 0) / maxCount) * 5;
        const weightedScoreA = (a.value * 0.75) + (normalizedCountA * 0.25);
        const weightedScoreB = (b.value * 0.75) + (normalizedCountB * 0.25);
        return weightedScoreB - weightedScoreA;
      });

      return results; // Return all results, we'll slice in display
    }
  });

  // Get display data (top 10) and full data for each leaderboard
  const ratingLeaderboardTop10 = ratingLeaderboard.slice(0, 10);

  // Goals leaderboard
  const { data: goalsLeaderboard = [], isLoading: loadingGoals } = useQuery({
    queryKey: ["leaderboard-goals", selectedCity, selectedTurf, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("match_events")
        .select(`
          scorer_user_id,
          match_id,
          created_at,
          matches!inner(turf_id, match_date, turfs(city))
        `);

      // Apply date filter
      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start.toISOString());
      }
      if (dateRange.end) {
        query = query.lte("created_at", dateRange.end.toISOString());
      }

      const { data: events } = await query;
      if (!events) return [];

      // Filter by city/turf
      let filteredEvents = events;
      if (selectedCity !== "all") {
        filteredEvents = filteredEvents.filter(
          (e: any) => e.matches?.turfs?.city === selectedCity
        );
      }
      if (selectedTurf !== "all") {
        filteredEvents = filteredEvents.filter(
          (e: any) => e.matches?.turf_id === selectedTurf
        );
      }

      // Count goals per player
      const goalCounts = new Map<string, number>();
      filteredEvents.forEach((e: any) => {
        const current = goalCounts.get(e.scorer_user_id) || 0;
        goalCounts.set(e.scorer_user_id, current + 1);
      });

      const playerIds = Array.from(goalCounts.keys());
      if (playerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url, city")
        .in("id", playerIds);

      const results: LeaderboardEntry[] = [];
      profiles?.forEach((profile) => {
        const goals = goalCounts.get(profile.id) || 0;
        results.push({
          id: profile.id,
          name: profile.name || "Unknown",
          profile_photo_url: profile.profile_photo_url,
          city: profile.city,
          value: goals
        });
      });

      results.sort((a, b) => b.value - a.value);
      return results;
    }
  });
  const goalsLeaderboardTop10 = goalsLeaderboard.slice(0, 10);

  // Assists leaderboard
  const { data: assistsLeaderboard = [], isLoading: loadingAssists } = useQuery({
    queryKey: ["leaderboard-assists", selectedCity, selectedTurf, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("match_events")
        .select(`
          assist_user_id,
          match_id,
          created_at,
          matches!inner(turf_id, match_date, turfs(city))
        `)
        .not("assist_user_id", "is", null);

      // Apply date filter
      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start.toISOString());
      }
      if (dateRange.end) {
        query = query.lte("created_at", dateRange.end.toISOString());
      }

      const { data: events } = await query;
      if (!events) return [];

      // Filter by city/turf
      let filteredEvents = events;
      if (selectedCity !== "all") {
        filteredEvents = filteredEvents.filter(
          (e: any) => e.matches?.turfs?.city === selectedCity
        );
      }
      if (selectedTurf !== "all") {
        filteredEvents = filteredEvents.filter(
          (e: any) => e.matches?.turf_id === selectedTurf
        );
      }

      // Count assists per player
      const assistCounts = new Map<string, number>();
      filteredEvents.forEach((e: any) => {
        if (e.assist_user_id) {
          const current = assistCounts.get(e.assist_user_id) || 0;
          assistCounts.set(e.assist_user_id, current + 1);
        }
      });

      const playerIds = Array.from(assistCounts.keys());
      if (playerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url, city")
        .in("id", playerIds);

      const results: LeaderboardEntry[] = [];
      profiles?.forEach((profile) => {
        const assists = assistCounts.get(profile.id) || 0;
        results.push({
          id: profile.id,
          name: profile.name || "Unknown",
          profile_photo_url: profile.profile_photo_url,
          city: profile.city,
          value: assists
        });
      });

      results.sort((a, b) => b.value - a.value);
      return results;
    }
  });
  const assistsLeaderboardTop10 = assistsLeaderboard.slice(0, 10);

  // Wins leaderboard
  const { data: winsLeaderboard = [], isLoading: loadingWins } = useQuery({
    queryKey: ["leaderboard-wins", selectedCity, selectedTurf, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      // Get completed matches with scores
      let query = supabase
        .from("matches")
        .select(`
          id,
          team_a_score,
          team_b_score,
          turf_id,
          match_date,
          turfs(city),
          match_players(user_id, team)
        `)
        .eq("status", "completed")
        .not("team_a_score", "is", null)
        .not("team_b_score", "is", null);

      // Apply date filter
      if (dateRange.start) {
        query = query.gte("match_date", format(dateRange.start, "yyyy-MM-dd"));
      }
      if (dateRange.end) {
        query = query.lte("match_date", format(dateRange.end, "yyyy-MM-dd"));
      }

      const { data: matches } = await query;
      if (!matches) return [];

      // Filter by city/turf
      let filteredMatches = matches;
      if (selectedCity !== "all") {
        filteredMatches = filteredMatches.filter(
          (m: any) => m.turfs?.city === selectedCity
        );
      }
      if (selectedTurf !== "all") {
        filteredMatches = filteredMatches.filter(
          (m: any) => m.turf_id === selectedTurf
        );
      }

      // Count wins per player using shared utility
      const winCounts = new Map<string, number>();
      filteredMatches.forEach((match: any) => {
        match.match_players?.forEach((player: any) => {
          if (didPlayerWin(player.team, match.team_a_score, match.team_b_score)) {
            const current = winCounts.get(player.user_id) || 0;
            winCounts.set(player.user_id, current + 1);
          }
        });
      });

      const playerIds = Array.from(winCounts.keys());
      if (playerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url, city")
        .in("id", playerIds);

      const results: LeaderboardEntry[] = [];
      profiles?.forEach((profile) => {
        const wins = winCounts.get(profile.id) || 0;
        results.push({
          id: profile.id,
          name: profile.name || "Unknown",
          profile_photo_url: profile.profile_photo_url,
          city: profile.city,
          value: wins
        });
      });

      results.sort((a, b) => b.value - a.value);
      return results;
    }
  });
  const winsLeaderboardTop10 = winsLeaderboard.slice(0, 10);

  // Most matches played leaderboard
  const { data: matchesLeaderboard = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["leaderboard-matches", selectedCity, selectedTurf, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("match_players")
        .select(`
          user_id,
          match_id,
          matches!inner(turf_id, status, match_date, turfs(city))
        `)
        .eq("join_status", "confirmed")
        .eq("matches.status", "completed");

      // Apply date filter via matches
      if (dateRange.start) {
        query = query.gte("matches.match_date", format(dateRange.start, "yyyy-MM-dd"));
      }
      if (dateRange.end) {
        query = query.lte("matches.match_date", format(dateRange.end, "yyyy-MM-dd"));
      }

      const { data: players } = await query;
      if (!players) return [];

      // Filter by city/turf
      let filteredPlayers = players;
      if (selectedCity !== "all") {
        filteredPlayers = filteredPlayers.filter(
          (p: any) => p.matches?.turfs?.city === selectedCity
        );
      }
      if (selectedTurf !== "all") {
        filteredPlayers = filteredPlayers.filter(
          (p: any) => p.matches?.turf_id === selectedTurf
        );
      }

      // Count matches per player
      const matchCounts = new Map<string, number>();
      filteredPlayers.forEach((p: any) => {
        const current = matchCounts.get(p.user_id) || 0;
        matchCounts.set(p.user_id, current + 1);
      });

      const playerIds = Array.from(matchCounts.keys());
      if (playerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url, city")
        .in("id", playerIds);

      const results: LeaderboardEntry[] = [];
      profiles?.forEach((profile) => {
        const matches = matchCounts.get(profile.id) || 0;
        results.push({
          id: profile.id,
          name: profile.name || "Unknown",
          profile_photo_url: profile.profile_photo_url,
          city: profile.city,
          value: matches
        });
      });

      results.sort((a, b) => b.value - a.value);
      return results;
    }
  });
  const matchesLeaderboardTop10 = matchesLeaderboard.slice(0, 10);

  const openViewAll = (title: string, entries: LeaderboardEntry[], formatValue: (v: number) => string, secondaryLabel?: string) => {
    // Limit to MAX_ENTRIES (100) for performance
    setViewAllDialog({ open: true, title, entries: entries.slice(0, MAX_ENTRIES), formatValue, secondaryLabel, page: 0 });
  };

  return (
    <>
    <AppLayout>
      <div className="container-app py-4 space-y-4">
        {/* Header */}
        <div className="hero-gradient -mx-4 px-4 py-6 rounded-b-3xl mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Leaderboards</h1>
              <p className="text-sm text-primary-foreground/70">Top performers on AthleteX</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {/* Time Period Filter */}
              <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => {
                setSelectedPeriod(value);
                if (value !== "custom") {
                  setCustomStartDate(undefined);
                  setCustomEndDate(undefined);
                }
              }}>
                <SelectTrigger className="w-[140px] bg-background/50">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Pickers */}
              {selectedPeriod === "custom" && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[120px] justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {customStartDate ? format(customStartDate, "PP") : <span>Start</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        disabled={(date) => date > new Date() || (customEndDate ? date > customEndDate : false)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[120px] justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {customEndDate ? format(customEndDate, "PP") : <span>End</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}

              <Select value={selectedCity} onValueChange={(value) => {
                setSelectedCity(value);
                setSelectedTurf("all");
              }}>
                <SelectTrigger className="w-[140px] bg-background/50">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTurf} onValueChange={setSelectedTurf}>
                <SelectTrigger className="w-[160px] bg-background/50">
                  <SelectValue placeholder="All Turfs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Turfs</SelectItem>
                  {turfs.map((turf) => (
                    <SelectItem key={turf.id} value={turf.id}>
                      {turf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Active Filters Display */}
        {(selectedPeriod !== "all" || selectedCity !== "all" || selectedTurf !== "all") && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {selectedPeriod !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {selectedPeriod === "month" && "This Month"}
                {selectedPeriod === "3months" && "Last 3 Months"}
                {selectedPeriod === "6months" && "Last 6 Months"}
                {selectedPeriod === "year" && "This Year"}
                {selectedPeriod === "custom" && customStartDate && customEndDate && 
                  `${format(customStartDate, "MMM d")} - ${format(customEndDate, "MMM d, yyyy")}`}
                {selectedPeriod === "custom" && (!customStartDate || !customEndDate) && "Custom (incomplete)"}
              </Badge>
            )}
            {selectedCity !== "all" && (
              <Badge variant="secondary" className="text-xs">{selectedCity}</Badge>
            )}
            {selectedTurf !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {turfs.find(t => t.id === selectedTurf)?.name || "Selected Turf"}
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6"
              onClick={() => {
                setSelectedPeriod("all");
                setSelectedCity("all");
                setSelectedTurf("all");
                setCustomStartDate(undefined);
                setCustomEndDate(undefined);
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Leaderboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeaderboardCard
            title="Top Rated Players"
            icon={Star}
            entries={ratingLeaderboardTop10}
            loading={loadingRatings}
            valueLabel="avg rating"
            secondaryLabel="ratings"
            formatValue={(v) => `${v.toFixed(1)} ★`}
            showViewAll={ratingLeaderboard.length > 10}
            onViewAll={() => openViewAll("Top Rated Players", ratingLeaderboard, (v) => `${v.toFixed(1)} ★`, "ratings")}
          />

          <LeaderboardCard
            title="Top Goal Scorers"
            icon={Target}
            entries={goalsLeaderboardTop10}
            loading={loadingGoals}
            valueLabel="goals"
            formatValue={(v) => `${v} goals`}
            showViewAll={goalsLeaderboard.length > 10}
            onViewAll={() => openViewAll("Top Goal Scorers", goalsLeaderboard, (v) => `${v} goals`)}
          />

          <LeaderboardCard
            title="Top Assist Providers"
            icon={Users}
            entries={assistsLeaderboardTop10}
            loading={loadingAssists}
            valueLabel="assists"
            formatValue={(v) => `${v} assists`}
            showViewAll={assistsLeaderboard.length > 10}
            onViewAll={() => openViewAll("Top Assist Providers", assistsLeaderboard, (v) => `${v} assists`)}
          />

          <LeaderboardCard
            title="Most Wins"
            icon={Award}
            entries={winsLeaderboardTop10}
            loading={loadingWins}
            valueLabel="wins"
            formatValue={(v) => `${v} wins`}
            showViewAll={winsLeaderboard.length > 10}
            onViewAll={() => openViewAll("Most Wins", winsLeaderboard, (v) => `${v} wins`)}
          />

          <LeaderboardCard
            title="Most Matches Played"
            icon={Trophy}
            entries={matchesLeaderboardTop10}
            loading={loadingMatches}
            valueLabel="matches"
            formatValue={(v) => `${v} matches`}
            showViewAll={matchesLeaderboard.length > 10}
            onViewAll={() => openViewAll("Most Matches Played", matchesLeaderboard, (v) => `${v} matches`)}
          />
        </div>
      </div>
    </AppLayout>

    {/* View All Dialog */}
    <Dialog open={viewAllDialog.open} onOpenChange={(open) => setViewAllDialog(prev => ({ ...prev, open }))}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{viewAllDialog.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(viewAllDialog.entries.length, ITEMS_PER_PAGE)} of {viewAllDialog.entries.length} players
          </p>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-2">
            {viewAllDialog.entries
              .slice(viewAllDialog.page * ITEMS_PER_PAGE, (viewAllDialog.page + 1) * ITEMS_PER_PAGE)
              .map((entry, idx) => {
                const globalIndex = viewAllDialog.page * ITEMS_PER_PAGE + idx;
                return (
                  <Link
                    key={entry.id}
                    to={`/players/${entry.id}`}
                    onClick={() => setViewAllDialog(prev => ({ ...prev, open: false }))}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                      globalIndex < 3 ? getRankBadgeClass(globalIndex + 1) + " border" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center w-6">
                      {getRankIcon(globalIndex + 1)}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {entry.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.name || "Unknown"}</p>
                      {entry.city && (
                        <p className="text-xs text-muted-foreground truncate">{entry.city}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{viewAllDialog.formatValue(entry.value)}</p>
                      {viewAllDialog.secondaryLabel && entry.secondaryValue !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {entry.secondaryValue} {viewAllDialog.secondaryLabel}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
          </div>
        </ScrollArea>
        {/* Pagination controls */}
        {viewAllDialog.entries.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={viewAllDialog.page === 0}
              onClick={() => setViewAllDialog(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {viewAllDialog.page + 1} of {Math.ceil(viewAllDialog.entries.length / ITEMS_PER_PAGE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={(viewAllDialog.page + 1) * ITEMS_PER_PAGE >= viewAllDialog.entries.length}
              onClick={() => setViewAllDialog(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
