import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, subDays, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from "date-fns";
import { CalendarIcon, Download, BarChart3, Users, Clock } from "lucide-react";

interface TurfReportsTabProps {
  turfId: string;
  turf: any;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_BANDS = [
  { name: "Morning", start: 6, end: 12 },
  { name: "Afternoon", start: 12, end: 17 },
  { name: "Evening", start: 17, end: 21 },
  { name: "Night", start: 21, end: 24 },
];

export function TurfReportsTab({ turfId, turf }: TurfReportsTabProps) {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch matches for reports
  const { data: matches } = useQuery({
    queryKey: ["turf-reports-matches", turfId, dateRange],
    queryFn: async () => {
      if (!turfId) return [];
      const { data } = await supabase
        .from("matches")
        .select("id, match_date, match_time, duration_minutes, status")
        .eq("turf_id", turfId)
        .gte("match_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("match_date", format(dateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
    enabled: !!turfId,
  });

  // Fetch payments for revenue
  const { data: payments } = useQuery({
    queryKey: ["turf-reports-payments", turfId, dateRange],
    queryFn: async () => {
      if (!turfId) return [];
      const { data } = await supabase
        .from("payments")
        .select("amount_total, turf_amount, paid_at, created_at")
        .eq("turf_id", turfId)
        .eq("status", "paid")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
      return data || [];
    },
    enabled: !!turfId,
  });

  // Fetch players
  const { data: playerStats } = useQuery({
    queryKey: ["turf-reports-players", turfId, dateRange],
    queryFn: async () => {
      if (!turfId) return { total: 0, topPlayers: [] };
      
      const { data: matchList } = await supabase
        .from("matches")
        .select("id")
        .eq("turf_id", turfId)
        .gte("match_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("match_date", format(dateRange.to, "yyyy-MM-dd"));
      
      if (!matchList || matchList.length === 0) return { total: 0, topPlayers: [] };
      
      const matchIds = matchList.map(m => m.id);
      const { data: players } = await supabase
        .from("match_players")
        .select("user_id, created_at, profiles!match_players_user_id_fkey(name, email)")
        .in("match_id", matchIds);
      
      if (!players) return { total: 0, topPlayers: [] };

      // Count by user
      const counts: Record<string, { count: number; name: string; firstSeen: string }> = {};
      players.forEach((p: any) => {
        if (!counts[p.user_id]) {
          counts[p.user_id] = { 
            count: 0, 
            name: p.profiles?.name || p.profiles?.email || "Unknown",
            firstSeen: p.created_at,
          };
        }
        counts[p.user_id].count++;
      });

      const topPlayers = Object.entries(counts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { total: Object.keys(counts).length, topPlayers };
    },
    enabled: !!turfId,
  });

  // Calculate occupancy by day of week
  const occupancyByDay = () => {
    const dayStats: Record<number, { total: number; hours: number }> = {};
    for (let i = 0; i < 7; i++) dayStats[i] = { total: 0, hours: 0 };

    matches?.forEach((m: any) => {
      const dayOfWeek = getDay(parseISO(m.match_date));
      dayStats[dayOfWeek].total++;
      dayStats[dayOfWeek].hours += (m.duration_minutes || 60) / 60;
    });

    return DAY_NAMES.map((name, i) => ({
      name,
      matches: dayStats[i].total,
      hours: dayStats[i].hours.toFixed(1),
    }));
  };

  // Calculate occupancy by time band
  const occupancyByTimeBand = () => {
    const bandStats: Record<string, number> = {};
    TIME_BANDS.forEach(b => bandStats[b.name] = 0);

    matches?.forEach((m: any) => {
      if (!m.match_time) return;
      const hour = parseInt(m.match_time.split(":")[0]);
      const band = TIME_BANDS.find(b => hour >= b.start && hour < b.end);
      if (band) bandStats[band.name]++;
    });

    return TIME_BANDS.map(b => ({
      name: b.name,
      range: `${b.start}:00 - ${b.end}:00`,
      matches: bandStats[b.name],
    }));
  };

  // Revenue by period
  const revenueByPeriod = () => {
    const daily: Record<string, { gross: number; net: number }> = {};
    
    payments?.forEach((p: any) => {
      const date = format(parseISO(p.paid_at || p.created_at), "yyyy-MM-dd");
      if (!daily[date]) daily[date] = { gross: 0, net: 0 };
      daily[date].gross += Number(p.amount_total);
      daily[date].net += Number(p.turf_amount);
    });

    return Object.entries(daily)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const exportBookingsCSV = () => {
    if (!matches || matches.length === 0) return;
    
    const headers = ["Date", "Time", "Duration (min)", "Status"];
    const rows = matches.map(m => [
      m.match_date,
      m.match_time,
      m.duration_minutes,
      m.status,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const totalGross = payments?.reduce((acc, p) => acc + Number(p.amount_total), 0) || 0;
  const totalNet = payments?.reduce((acc, p) => acc + Number(p.turf_amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Export</h1>
          <p className="text-muted-foreground">Analytics and data exports for your turf</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold">{matches?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unique Players</p>
            <p className="text-2xl font-bold">{playerStats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Gross Revenue</p>
            <p className="text-2xl font-bold">₹{totalGross.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Net Revenue</p>
            <p className="text-2xl font-bold">₹{totalNet.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Occupancy by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occupancyByDay().map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{row.matches}</TableCell>
                    <TableCell className="text-right">{row.hours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Occupancy by Time Band */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Occupancy by Time Band
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time Band</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occupancyByTimeBand().map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.range}</TableCell>
                    <TableCell className="text-right">{row.matches}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 10 Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats?.topPlayers && playerStats.topPlayers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerStats.topPlayers.map((p: any, i: number) => (
                    <TableRow key={p.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right font-medium">{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">No player data</p>
            )}
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>Download reports for your records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={exportBookingsCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Bookings CSV
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export Payments CSV (Use Payments tab)
            </Button>
            <p className="text-xs text-muted-foreground">
              More export options coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
