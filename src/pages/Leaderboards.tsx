import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  formatValue = (v: number) => v.toString()
}: {
  title: string;
  icon: React.ElementType;
  entries: LeaderboardEntry[];
  loading: boolean;
  valueLabel: string;
  secondaryLabel?: string;
  formatValue?: (value: number) => string;
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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
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

  // Rating leaderboard - weighted by count
  const { data: ratingLeaderboard = [], isLoading: loadingRatings } = useQuery({
    queryKey: ["leaderboard-ratings", selectedCity, selectedTurf, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      // Get all approved ratings with profile and match info
      let query = supabase
        .from("player_ratings")
        .select(`
          rated_user_id,
          rating,
          match_id,
          created_at,
          matches!inner(turf_id, match_date, turfs(city))
        `)
        .eq("moderation_status", "approved");

      // Apply date filter
      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start.toISOString());
      }
      if (dateRange.end) {
        query = query.lte("created_at", dateRange.end.toISOString());
      }

      const { data: ratings } = await query;
      if (!ratings) return [];

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
          // Weighted score: average * (1 + log10(count))
          const weightedScore = avg * (1 + Math.log10(stats.count));
          results.push({
            id: profile.id,
            name: profile.name || "Unknown",
            profile_photo_url: profile.profile_photo_url,
            city: profile.city,
            value: parseFloat(avg.toFixed(1)),
            secondaryValue: stats.count
          });
        }
      });

      // Sort by weighted score (recalculate for sorting)
      results.sort((a, b) => {
        const aWeighted = a.value * (1 + Math.log10((a.secondaryValue || 0) + 1));
        const bWeighted = b.value * (1 + Math.log10((b.secondaryValue || 0) + 1));
        return bWeighted - aWeighted;
      });

      return results.slice(0, 10);
    }
  });

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
      return results.slice(0, 10);
    }
  });

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
      return results.slice(0, 10);
    }
  });

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
      return results.slice(0, 10);
    }
  });

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
      return results.slice(0, 10);
    }
  });

  return (
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
              <p className="text-sm text-primary-foreground/70">Top performers on SPORTIQ</p>
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
            entries={ratingLeaderboard}
            loading={loadingRatings}
            valueLabel="avg rating"
            secondaryLabel="ratings"
            formatValue={(v) => `${v.toFixed(1)} ★`}
          />

          <LeaderboardCard
            title="Top Goal Scorers"
            icon={Target}
            entries={goalsLeaderboard}
            loading={loadingGoals}
            valueLabel="goals"
            formatValue={(v) => `${v} goals`}
          />

          <LeaderboardCard
            title="Top Assist Providers"
            icon={Users}
            entries={assistsLeaderboard}
            loading={loadingAssists}
            valueLabel="assists"
            formatValue={(v) => `${v} assists`}
          />

          <LeaderboardCard
            title="Most Wins"
            icon={Award}
            entries={winsLeaderboard}
            loading={loadingWins}
            valueLabel="wins"
            formatValue={(v) => `${v} wins`}
          />

          <LeaderboardCard
            title="Most Matches Played"
            icon={Trophy}
            entries={matchesLeaderboard}
            loading={loadingMatches}
            valueLabel="matches"
            formatValue={(v) => `${v} matches`}
          />
        </div>
      </div>
    </AppLayout>
  );
}
