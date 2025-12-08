import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  Flame, 
  Footprints, 
  Moon, 
  Zap,
  Trophy,
  Link2,
  ArrowRight,
  Loader2
} from "lucide-react";
import { subDays, startOfWeek, endOfWeek } from "date-fns";

interface FitnessInsightsSectionProps {
  userId: string;
}

export default function FitnessInsightsSection({ userId }: FitnessInsightsSectionProps) {
  // Fetch connected providers
  const { data: connectedProviders, isLoading: providersLoading } = useQuery({
    queryKey: ["connected-providers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connected_providers")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch daily metrics for current week
  const { data: dailyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["daily-metrics-week", userId],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("date", weekStart.toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch fitness sessions for streak calculation
  const { data: fitnessSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["fitness-sessions-recent", userId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("fitness_sessions")
        .select("start_time")
        .eq("user_id", userId)
        .gte("start_time", thirtyDaysAgo);
      if (error) throw error;
      return data;
    },
  });

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    if (!dailyMetrics || !fitnessSessions) return null;

    const totalSteps = dailyMetrics.reduce((sum, m) => sum + (m.steps || 0), 0);
    const totalActiveMinutes = dailyMetrics.reduce((sum, m) => sum + (m.active_minutes || 0), 0);
    const totalCalories = dailyMetrics.reduce((sum, m) => sum + (m.calories_burned || 0), 0);
    const avgSleep = dailyMetrics.length > 0 
      ? dailyMetrics.reduce((sum, m) => sum + (Number(m.sleep_hours) || 0), 0) / dailyMetrics.length 
      : 0;
    const avgRecovery = dailyMetrics.filter(m => m.recovery_score).length > 0
      ? dailyMetrics.filter(m => m.recovery_score).reduce((sum, m) => sum + (Number(m.recovery_score) || 0), 0) / dailyMetrics.filter(m => m.recovery_score).length
      : null;

    // Calculate training streak
    let streak = 0;
    const now = new Date();
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
      trainingStreak: streak,
    };
  }, [dailyMetrics, fitnessSessions]);

  const isLoading = providersLoading || metricsLoading || sessionsLoading;

  // No connected providers - show connect prompt
  if (!isLoading && (!connectedProviders || connectedProviders.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fitness Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            Connect your fitness apps to see training insights
          </p>
          <Button asChild>
            <Link to="/connected-apps">Connect Apps</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fitness Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Fitness Insights
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/fitness-insights" className="flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Footprints className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Steps</span>
            </div>
            <p className="text-xl font-bold">{weeklyStats?.totalSteps.toLocaleString() || 0}</p>
          </div>

          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Calories</span>
            </div>
            <p className="text-xl font-bold">{weeklyStats?.totalCalories.toLocaleString() || 0}</p>
          </div>

          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg Sleep</span>
            </div>
            <p className="text-xl font-bold">{weeklyStats?.avgSleep.toFixed(1) || 0}h</p>
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Streak</span>
            </div>
            <p className="text-xl font-bold">{weeklyStats?.trainingStreak || 0} days</p>
          </div>
        </div>

        {/* Recovery Score */}
        {weeklyStats?.avgRecovery !== null && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Recovery Score</span>
              </div>
              <Badge variant={
                (weeklyStats.avgRecovery || 0) >= 70 ? "default" :
                (weeklyStats.avgRecovery || 0) >= 50 ? "secondary" : "destructive"
              }>
                {Math.round(weeklyStats.avgRecovery || 0)}%
              </Badge>
            </div>
            <Progress value={weeklyStats.avgRecovery || 0} className="h-2" />
          </div>
        )}

        {/* Connected Apps */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground">Connected:</span>
          <div className="flex gap-1">
            {connectedProviders?.map(p => (
              <Badge key={p.provider} variant="outline" className="text-xs capitalize">
                {p.provider.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}