import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, subDays, parseISO } from "date-fns";
import { Trophy, Users, TrendingUp, DollarSign, Percent, Eye } from "lucide-react";

interface TurfOverviewTabProps {
  turfId: string;
  turf: any;
}

export function TurfOverviewTab({ turfId, turf }: TurfOverviewTabProps) {
  // Analytics for last 30 days
  const { data: analytics } = useQuery({
    queryKey: ["turf-overview-analytics", turfId],
    queryFn: async () => {
      if (!turfId) return null;
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

      // Get matches in last 30 days
      const { data: recentMatches } = await supabase
        .from("matches")
        .select("id, duration_minutes")
        .eq("turf_id", turfId)
        .gte("match_date", thirtyDaysAgo);

      // Get unique players
      const matchIds = recentMatches?.map((m) => m.id) || [];
      let uniquePlayers = 0;
      if (matchIds.length > 0) {
        const { data: players } = await supabase
          .from("match_players")
          .select("user_id")
          .in("match_id", matchIds);
        uniquePlayers = new Set(players?.map((p) => p.user_id)).size;
      }

      // Get payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount_total, turf_amount")
        .eq("turf_id", turfId)
        .eq("status", "paid")
        .gte("created_at", subDays(new Date(), 30).toISOString());

      const grossRevenue = payments?.reduce((acc, p) => acc + Number(p.amount_total), 0) || 0;
      const netEarnings = payments?.reduce((acc, p) => acc + Number(p.turf_amount), 0) || 0;

      const matchCount = recentMatches?.length || 0;
      const totalHours = recentMatches?.reduce((acc, m) => acc + (m.duration_minutes || 60) / 60, 0) || 0;

      // Rough occupancy (assuming 12 hours/day availability)
      const availableHours = 30 * 12;
      const occupancy = availableHours > 0 ? Math.round((totalHours / availableHours) * 100) : 0;

      return {
        matchCount,
        uniquePlayers,
        grossRevenue,
        netEarnings,
        occupancy: Math.min(occupancy, 100),
      };
    },
    enabled: !!turfId,
  });

  // Top recurring players
  const { data: topPlayers } = useQuery({
    queryKey: ["turf-top-players", turfId],
    queryFn: async () => {
      if (!turfId) return [];
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("turf_id", turfId);
      
      if (!matches || matches.length === 0) return [];
      
      const matchIds = matches.map(m => m.id);
      const { data: players } = await supabase
        .from("match_players")
        .select("user_id, profiles!match_players_user_id_fkey(name, email)")
        .in("match_id", matchIds);
      
      if (!players) return [];

      // Count by user_id
      const counts: Record<string, { count: number; name: string; email: string }> = {};
      players.forEach((p: any) => {
        if (!counts[p.user_id]) {
          counts[p.user_id] = { 
            count: 0, 
            name: p.profiles?.name || "Unknown", 
            email: p.profiles?.email || "" 
          };
        }
        counts[p.user_id].count++;
      });

      return Object.entries(counts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    enabled: !!turfId,
  });

  // Upcoming matches
  const { data: upcomingMatches } = useQuery({
    queryKey: ["turf-upcoming-matches", turfId],
    queryFn: async () => {
      if (!turfId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("matches")
        .select("*, profiles!matches_host_id_fkey(name)")
        .eq("turf_id", turfId)
        .gte("match_date", today)
        .order("match_date", { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!turfId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Business snapshot for the last 30 days</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{analytics?.matchCount || 0}</p>
                <p className="text-xs text-muted-foreground">Matches Hosted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{analytics?.uniquePlayers || 0}</p>
                <p className="text-xs text-muted-foreground">Unique Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Percent className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{analytics?.occupancy || 0}%</p>
                <p className="text-xs text-muted-foreground">Occupancy Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">₹{(analytics?.grossRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Gross Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">₹{(analytics?.netEarnings || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Net Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMatches && upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{m.match_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(m.match_date), "dd MMM")} at {m.match_time?.slice(0, 5)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{m.status}</Badge>
                      <Link to={`/matches/${m.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No upcoming matches</p>
            )}
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Recurring Players</CardTitle>
          </CardHeader>
          <CardContent>
            {topPlayers && topPlayers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Matches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPlayers.map((p: any, i: number) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <span>{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">No player data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
