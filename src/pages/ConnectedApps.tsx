import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Activity, 
  Heart, 
  Watch, 
  Zap, 
  Link2, 
  Unlink, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Shield,
  Trash2,
  Settings
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Provider = "strava" | "fitbit" | "apple_health" | "ultrahuman";

interface ProviderInfo {
  id: Provider;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    description: "Sync workouts, heart rate, steps and sleep data from your iPhone",
    icon: <Heart className="h-8 w-8" />,
    color: "from-pink-500 to-red-500",
    features: ["Workouts", "Heart Rate", "Steps", "Sleep", "Active Calories"],
  },
  {
    id: "strava",
    name: "Strava",
    description: "Connect your running, cycling and training activities",
    icon: <Activity className="h-8 w-8" />,
    color: "from-orange-500 to-red-600",
    features: ["Activities", "Distance", "Pace", "Heart Rate", "Elevation"],
  },
  {
    id: "fitbit",
    name: "Fitbit",
    description: "Track daily activity, sleep patterns and heart rate trends",
    icon: <Watch className="h-8 w-8" />,
    color: "from-teal-400 to-cyan-500",
    features: ["Steps", "Sleep", "Heart Rate", "Active Minutes", "Calories"],
  },
  {
    id: "ultrahuman",
    name: "Ultrahuman",
    description: "Get recovery scores, HRV insights and metabolic health data",
    icon: <Zap className="h-8 w-8" />,
    color: "from-purple-500 to-indigo-600",
    features: ["Recovery Score", "HRV", "Sleep Quality", "Movement Index"],
  },
];

export default function ConnectedApps() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cloudSync, setCloudSync] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: connectedProviders, isLoading } = useQuery({
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

  const connectMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      if (!user) throw new Error("Not authenticated");
      
      // Simulate OAuth flow - in production this would redirect to provider
      const mockToken = `mock_${provider}_token_${Date.now()}`;
      const mockRefreshToken = `mock_${provider}_refresh_${Date.now()}`;
      
      const { error } = await supabase.from("connected_providers").insert({
        user_id: user.id,
        provider,
        access_token: mockToken,
        refresh_token: mockRefreshToken,
        external_user_id: `${provider}_user_${user.id.slice(0, 8)}`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        scopes: { read: true, write: false },
        last_synced_at: new Date().toISOString(),
        sync_status: "idle",
      });
      
      if (error) throw error;
      
      // Generate mock fitness data
      await generateMockFitnessData(user.id, provider);
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["connected-providers"] });
      queryClient.invalidateQueries({ queryKey: ["fitness-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      toast.success(`${PROVIDERS.find(p => p.id === provider)?.name} connected successfully!`);
    },
    onError: (error) => {
      toast.error("Failed to connect: " + error.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      if (!user) throw new Error("Not authenticated");
      
      // Delete provider connection
      const { error: providerError } = await supabase
        .from("connected_providers")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);
      
      if (providerError) throw providerError;
      
      // Optionally delete associated data
      await supabase
        .from("fitness_sessions")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);
      
      await supabase
        .from("daily_metrics")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["connected-providers"] });
      queryClient.invalidateQueries({ queryKey: ["fitness-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      toast.success(`${PROVIDERS.find(p => p.id === provider)?.name} disconnected`);
    },
    onError: (error) => {
      toast.error("Failed to disconnect: " + error.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      if (!user) throw new Error("Not authenticated");
      
      // Update sync status
      await supabase
        .from("connected_providers")
        .update({ sync_status: "syncing" })
        .eq("user_id", user.id)
        .eq("provider", provider);
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate new mock data
      await generateMockFitnessData(user.id, provider);
      
      // Update last synced
      await supabase
        .from("connected_providers")
        .update({ 
          last_synced_at: new Date().toISOString(),
          sync_status: "idle"
        })
        .eq("user_id", user.id)
        .eq("provider", provider);
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["connected-providers"] });
      queryClient.invalidateQueries({ queryKey: ["fitness-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      toast.success("Sync completed successfully!");
    },
    onError: (error) => {
      toast.error("Sync failed: " + error.message);
    },
  });

  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      await supabase.from("fitness_sessions").delete().eq("user_id", user.id);
      await supabase.from("daily_metrics").delete().eq("user_id", user.id);
      await supabase.from("connected_providers").delete().eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-providers"] });
      queryClient.invalidateQueries({ queryKey: ["fitness-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      toast.success("All connected app data deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete data: " + error.message);
    },
  });

  const getConnectionStatus = (provider: Provider) => {
    return connectedProviders?.find(p => p.provider === provider);
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Connected Apps</h1>
          <p className="text-muted-foreground">
            Connect your fitness and wearable apps to sync training data and unlock personalized insights
          </p>
        </div>

        {/* Provider Cards */}
        <div className="grid gap-4">
          {PROVIDERS.map((provider) => {
            const connection = getConnectionStatus(provider.id);
            const isConnected = !!connection;
            const isSyncing = connection?.sync_status === "syncing" || 
                             syncMutation.isPending && syncMutation.variables === provider.id;
            const isConnecting = connectMutation.isPending && connectMutation.variables === provider.id;
            const isDisconnecting = disconnectMutation.isPending && disconnectMutation.variables === provider.id;

            return (
              <Card key={provider.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 p-6">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${provider.color} text-white shrink-0`}>
                      {provider.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{provider.name}</h3>
                            {isConnected && (
                              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {provider.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {provider.features.map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isConnected ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncMutation.mutate(provider.id)}
                                disabled={isSyncing}
                              >
                                {isSyncing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-2 hidden sm:inline">Sync</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => disconnectMutation.mutate(provider.id)}
                                disabled={isDisconnecting}
                              >
                                {isDisconnecting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Unlink className="h-4 w-4" />
                                )}
                                <span className="ml-2 hidden sm:inline">Disconnect</span>
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => connectMutation.mutate(provider.id)}
                              disabled={isConnecting}
                              className={`bg-gradient-to-r ${provider.color} hover:opacity-90`}
                            >
                              {isConnecting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Link2 className="h-4 w-4 mr-2" />
                              )}
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Connection Info */}
                      {isConnected && connection.last_synced_at && (
                        <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Last synced: {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
                          </span>
                          {isSyncing && (
                            <span className="flex items-center text-primary">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Syncing...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Privacy & Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Data Settings
            </CardTitle>
            <CardDescription>
              Control how your fitness data is stored and used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cloud-sync">Store wearable data in cloud</Label>
                <p className="text-sm text-muted-foreground">
                  Enable cloud sync to access your fitness insights across devices
                </p>
              </div>
              <Switch
                id="cloud-sync"
                checked={cloudSync}
                onCheckedChange={setCloudSync}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Delete all connected app data</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently remove all synced fitness data and disconnect all apps
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all fitness data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your synced fitness sessions, daily metrics, 
                      and disconnect all connected apps. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllDataMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Link to Fitness Insights */}
        {connectedProviders && connectedProviders.length > 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">View Your Fitness Insights</h3>
                <p className="text-sm text-muted-foreground">
                  See trends, training summaries, and match-day performance data
                </p>
              </div>
              <Button onClick={() => navigate("/fitness-insights")}>
                View Insights
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

// Helper function to generate mock fitness data
async function generateMockFitnessData(userId: string, provider: Provider) {
  const activityTypes = {
    strava: ["run", "ride", "swim", "walk", "workout"],
    fitbit: ["walk", "run", "workout", "bike"],
    apple_health: ["football", "run", "workout", "walk", "cycling"],
    ultrahuman: ["workout", "run", "strength"],
  };

  const now = new Date();
  
  // Generate fitness sessions for last 30 days
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() - daysAgo);
    startTime.setHours(Math.floor(Math.random() * 12) + 6, Math.floor(Math.random() * 60), 0);
    
    const durationMins = 30 + Math.floor(Math.random() * 90);
    const endTime = new Date(startTime.getTime() + durationMins * 60000);
    
    const types = activityTypes[provider];
    const type = types[Math.floor(Math.random() * types.length)];
    
    await supabase.from("fitness_sessions").insert({
      user_id: userId,
      provider,
      external_activity_id: `${provider}_${Date.now()}_${i}`,
      type,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: durationMins * 60,
      distance_meters: type === "run" || type === "ride" || type === "walk" ? Math.floor(Math.random() * 15000) + 1000 : null,
      calories: 200 + Math.floor(Math.random() * 600),
      avg_hr: 120 + Math.floor(Math.random() * 40),
      max_hr: 160 + Math.floor(Math.random() * 30),
    });
  }

  // Generate daily metrics for last 14 days
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Check if metrics already exist for this date
    const { data: existing } = await supabase
      .from("daily_metrics")
      .select("id")
      .eq("user_id", userId)
      .eq("date", dateStr)
      .eq("provider", provider)
      .maybeSingle();

    if (!existing) {
      await supabase.from("daily_metrics").insert({
        user_id: userId,
        date: dateStr,
        provider,
        steps: 5000 + Math.floor(Math.random() * 10000),
        active_minutes: 30 + Math.floor(Math.random() * 90),
        calories_burned: 1800 + Math.floor(Math.random() * 800),
        sleep_hours: 5 + Math.random() * 4,
        recovery_score: provider === "ultrahuman" ? 50 + Math.random() * 50 : null,
        resting_hr: 55 + Math.floor(Math.random() * 15),
        hrv: 30 + Math.floor(Math.random() * 50),
      });
    }
  }
}