import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  Flame, 
  Footprints, 
  Heart, 
  Moon, 
  TrendingUp, 
  Zap,
  Calendar,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  Link2,
  Trophy,
  Timer
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

export default function FitnessInsights() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch connected providers
  const { data: connectedProviders } = useQuery({
    queryKey: ["connected-providers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("connected_providers")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch fitness sessions
  const { data: fitnessSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["fitness-sessions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("fitness_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", thirtyDaysAgo)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch daily metrics
  const { data: dailyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["daily-metrics", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", fourteenDaysAgo)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    if (!dailyMetrics || !fitnessSessions) return null;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const thisWeekMetrics = dailyMetrics.filter(m => {
      const date = new Date(m.date);
      return date >= weekStart && date <= weekEnd;
    });

    const thisWeekSessions = fitnessSessions.filter(s => {
      const date = new Date(s.start_time);
      return date >= weekStart && date <= weekEnd;
    });

    // Calculate totals
    const totalSteps = thisWeekMetrics.reduce((sum, m) => sum + (m.steps || 0), 0);
    const totalActiveMinutes = thisWeekMetrics.reduce((sum, m) => sum + (m.active_minutes || 0), 0);
    const totalCalories = thisWeekMetrics.reduce((sum, m) => sum + (m.calories_burned || 0), 0);
    const avgSleep = thisWeekMetrics.length > 0 
      ? thisWeekMetrics.reduce((sum, m) => sum + (Number(m.sleep_hours) || 0), 0) / thisWeekMetrics.length 
      : 0;
    const avgRecovery = thisWeekMetrics.filter(m => m.recovery_score).length > 0
      ? thisWeekMetrics.filter(m => m.recovery_score).reduce((sum, m) => sum + (Number(m.recovery_score) || 0), 0) / thisWeekMetrics.filter(m => m.recovery_score).length
      : null;
    const avgHRV = thisWeekMetrics.filter(m => m.hrv).length > 0
      ? Math.round(thisWeekMetrics.filter(m => m.hrv).reduce((sum, m) => sum + (m.hrv || 0), 0) / thisWeekMetrics.filter(m => m.hrv).length)
      : null;

    // Calculate training streak
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(now, i).toISOString().split("T")[0];
      const hasSession = fitnessSessions.some(s => 
        s.start_time.split("T")[0] === checkDate
      );
      if (hasSession) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalSteps,
      totalActiveMinutes,
      totalCalories,
      avgSleep,
      avgRecovery,
      avgHRV,
      trainingStreak: streak,
      sessionsThisWeek: thisWeekSessions.length,
    };
  }, [dailyMetrics, fitnessSessions]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!dailyMetrics) return [];
    
    return dailyMetrics.map(m => ({
      date: format(new Date(m.date), "MMM d"),
      steps: m.steps || 0,
      activeMinutes: m.active_minutes || 0,
      calories: m.calories_burned || 0,
      sleep: Number(m.sleep_hours) || 0,
      hrv: m.hrv || 0,
      restingHR: m.resting_hr || 0,
    }));
  }, [dailyMetrics]);

  // Activity type breakdown
  const activityBreakdown = useMemo(() => {
    if (!fitnessSessions) return [];
    
    const typeCounts: Record<string, { count: number; duration: number; calories: number }> = {};
    
    fitnessSessions.forEach(session => {
      if (!typeCounts[session.type]) {
        typeCounts[session.type] = { count: 0, duration: 0, calories: 0 };
      }
      typeCounts[session.type].count++;
      typeCounts[session.type].duration += session.duration_seconds || 0;
      typeCounts[session.type].calories += session.calories || 0;
    });

    return Object.entries(typeCounts)
      .map(([type, data]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: data.count,
        duration: Math.round(data.duration / 60),
        calories: data.calories,
      }))
      .sort((a, b) => b.count - a.count);
  }, [fitnessSessions]);

  const isLoading = authLoading || sessionsLoading || metricsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // No connected providers
  if (!connectedProviders || connectedProviders.length === 0) {
    return (
      <Layout>
        <div className="container max-w-4xl py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Connected Apps</h2>
              <p className="text-muted-foreground mb-6">
                Connect your fitness apps to see personalized insights and training data
              </p>
              <Button onClick={() => navigate("/connected-apps")}>
                Connect Apps
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fitness Insights</h1>
            <p className="text-muted-foreground">
              Your weekly summary and training trends
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/connected-apps")}>
            Manage Apps
          </Button>
        </div>

        {/* Weekly Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Footprints className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Steps</p>
                  <p className="text-2xl font-bold">{weeklyStats?.totalSteps.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calories Burned</p>
                  <p className="text-2xl font-bold">{weeklyStats?.totalCalories.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Minutes</p>
                  <p className="text-2xl font-bold">{weeklyStats?.totalActiveMinutes || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Sleep</p>
                  <p className="text-2xl font-bold">{weeklyStats?.avgSleep.toFixed(1) || 0}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training Streak & Recovery */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Training Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-primary">
                  {weeklyStats?.trainingStreak || 0}
                </div>
                <div>
                  <p className="text-lg font-medium">Days</p>
                  <p className="text-sm text-muted-foreground">
                    {weeklyStats?.sessionsThisWeek || 0} sessions this week
                  </p>
                </div>
              </div>
              <Progress 
                value={Math.min((weeklyStats?.trainingStreak || 0) * 10, 100)} 
                className="mt-4" 
              />
            </CardContent>
          </Card>

          {weeklyStats?.avgRecovery !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-500" />
                  Recovery Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${
                    (weeklyStats?.avgRecovery || 0) >= 70 ? 'text-green-500' :
                    (weeklyStats?.avgRecovery || 0) >= 50 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {Math.round(weeklyStats?.avgRecovery || 0)}
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {(weeklyStats?.avgRecovery || 0) >= 70 ? 'Optimal' :
                       (weeklyStats?.avgRecovery || 0) >= 50 ? 'Moderate' : 'Low'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {weeklyStats?.avgHRV ? `HRV: ${weeklyStats.avgHRV}ms` : 'Based on your data'}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={weeklyStats?.avgRecovery || 0} 
                  className="mt-4" 
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Steps Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Steps</CardTitle>
              <CardDescription>Last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Bar dataKey="steps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Heart Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Heart Rate Trends</CardTitle>
              <CardDescription>Resting HR & HRV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Line type="monotone" dataKey="restingHR" stroke="#ef4444" strokeWidth={2} dot={false} name="Resting HR" />
                    <Line type="monotone" dataKey="hrv" stroke="#22c55e" strokeWidth={2} dot={false} name="HRV" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sleep Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sleep Duration</CardTitle>
              <CardDescription>Hours per night</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sleep" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.2} 
                      name="Sleep (hrs)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Activity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Breakdown</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityBreakdown.slice(0, 5).map((activity) => (
                  <div key={activity.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{activity.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {activity.count} sessions
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{activity.duration} min</p>
                      <p className="text-xs text-muted-foreground">{activity.calories} cal</p>
                    </div>
                  </div>
                ))}
                {activityBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activities recorded yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Training Sessions</CardTitle>
            <CardDescription>Your latest workouts and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fitnessSessions?.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{session.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.start_time), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    {session.duration_seconds && (
                      <div className="text-right">
                        <p className="font-medium">{Math.round(session.duration_seconds / 60)} min</p>
                        <p className="text-muted-foreground">Duration</p>
                      </div>
                    )}
                    {session.distance_meters && (
                      <div className="text-right">
                        <p className="font-medium">{(session.distance_meters / 1000).toFixed(1)} km</p>
                        <p className="text-muted-foreground">Distance</p>
                      </div>
                    )}
                    {session.calories && (
                      <div className="text-right">
                        <p className="font-medium">{session.calories}</p>
                        <p className="text-muted-foreground">Calories</p>
                      </div>
                    )}
                    {session.avg_hr && (
                      <div className="text-right">
                        <p className="font-medium flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" />
                          {session.avg_hr}
                        </p>
                        <p className="text-muted-foreground">Avg HR</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!fitnessSessions || fitnessSessions.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No training sessions recorded yet. Connect your fitness apps to get started!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}