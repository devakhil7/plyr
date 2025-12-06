import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, useOwnedTurfs } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  MapPin, Trophy, Calendar, Users, DollarSign, TrendingUp,
  ChevronLeft, ChevronRight, Building, Eye, Power, Settings, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, isAfter, parseISO } from "date-fns";

const TABS = ["overview", "matches", "settings"] as const;
type TabType = typeof TABS[number];

export default function TurfDashboard() {
  const { user, loading } = useAuth();
  const { isTurfOwner, loading: rolesLoading } = useUserRoles();
  const { data: ownedTurfsData, isLoading: turfsLoading } = useOwnedTurfs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    price_per_hour: 0,
    active: true,
    description: "",
  });

  const ownedTurfs = ownedTurfsData?.map((to: any) => to.turfs).filter(Boolean) || [];
  const selectedTurf = ownedTurfs.find((t: any) => t.id === selectedTurfId) || ownedTurfs[0];

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || !isTurfOwner)) {
      navigate("/dashboard");
      toast.error("Access denied. Turf owners only.");
    }
  }, [user, isTurfOwner, loading, rolesLoading, navigate]);

  useEffect(() => {
    if (ownedTurfs.length > 0 && !selectedTurfId) {
      setSelectedTurfId(ownedTurfs[0].id);
    }
  }, [ownedTurfs, selectedTurfId]);

  useEffect(() => {
    if (selectedTurf) {
      setEditForm({
        price_per_hour: selectedTurf.price_per_hour || 0,
        active: selectedTurf.active !== false,
        description: selectedTurf.description || "",
      });
    }
  }, [selectedTurf]);

  // Fetch matches for selected turf
  const { data: turfMatches } = useQuery({
    queryKey: ["turf-matches", selectedTurf?.id],
    queryFn: async () => {
      if (!selectedTurf?.id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("matches")
        .select("*, profiles!matches_host_id_fkey(name), match_players(count)")
        .eq("turf_id", selectedTurf.id)
        .gte("match_date", today)
        .order("match_date", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTurf?.id,
  });

  // Fetch bookings for calendar view
  const { data: turfBookings } = useQuery({
    queryKey: ["turf-bookings", selectedTurf?.id],
    queryFn: async () => {
      if (!selectedTurf?.id) return [];
      const { data } = await supabase
        .from("turf_bookings")
        .select("*")
        .eq("turf_id", selectedTurf.id)
        .eq("payment_status", "paid")
        .order("booking_date", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTurf?.id,
  });

  // Analytics - last 30 days
  const { data: analytics } = useQuery({
    queryKey: ["turf-analytics", selectedTurf?.id],
    queryFn: async () => {
      if (!selectedTurf?.id) return null;
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];
      
      // Get matches in last 30 days
      const { data: recentMatches } = await supabase
        .from("matches")
        .select("id, duration_minutes")
        .eq("turf_id", selectedTurf.id)
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

      const matchCount = recentMatches?.length || 0;
      const totalHours = recentMatches?.reduce((acc, m) => acc + (m.duration_minutes || 60) / 60, 0) || 0;
      const estimatedRevenue = totalHours * (selectedTurf?.price_per_hour || 0);

      return {
        matchCount,
        uniquePlayers,
        estimatedRevenue,
        totalHours,
      };
    },
    enabled: !!selectedTurf?.id,
  });

  // Update turf mutation
  const updateTurfMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTurf?.id) return;
      const { error } = await supabase
        .from("turfs")
        .update({
          price_per_hour: editForm.price_per_hour,
          active: editForm.active,
          description: editForm.description,
        })
        .eq("id", selectedTurf.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owned-turfs"] });
      toast.success("Turf settings updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update turf");
    },
  });

  if (loading || rolesLoading || turfsLoading || !isTurfOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (ownedTurfs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">No Turfs Assigned</h2>
            <p className="text-muted-foreground mb-4">
              You don't have any turfs assigned to your account yet. Contact an admin to get started.
            </p>
            <Link to="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "h-screen sticky top-0 border-r border-border bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Turf Dashboard</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Turf Selector */}
        {!sidebarCollapsed && ownedTurfs.length > 1 && (
          <div className="p-4 border-b border-border">
            <Label className="text-xs text-muted-foreground">Select Turf</Label>
            <Select value={selectedTurfId || ""} onValueChange={setSelectedTurfId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select turf" />
              </SelectTrigger>
              <SelectContent>
                {ownedTurfs.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="p-2 space-y-1">
          {TABS.map((tab) => {
            const icons = { overview: BarChart3, matches: Calendar, settings: Settings };
            const Icon = icons[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="capitalize">{tab}</span>}
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className={cn("w-full", sidebarCollapsed && "px-2")}>
              {sidebarCollapsed ? "←" : "← Back to Dashboard"}
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {activeTab === "overview" && selectedTurf && (
          <div className="space-y-6">
            {/* Turf Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{selectedTurf.name}</h1>
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedTurf.location}, {selectedTurf.city}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedTurf.active !== false ? "default" : "secondary"}>
                  {selectedTurf.active !== false ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{selectedTurf.sport_type}</Badge>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <DollarSign className="h-10 w-10 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">₹{selectedTurf.price_per_hour}</p>
                    <p className="text-sm text-muted-foreground">Price / Hour</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <Trophy className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{analytics?.matchCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Matches (30 days)</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <Users className="h-10 w-10 text-secondary" />
                  <div>
                    <p className="text-2xl font-bold">{analytics?.uniquePlayers || 0}</p>
                    <p className="text-sm text-muted-foreground">Unique Players</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <TrendingUp className="h-10 w-10 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">₹{(analytics?.estimatedRevenue || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Est. Revenue (30d)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Matches */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Matches</CardTitle>
                <CardDescription>Matches scheduled at this turf</CardDescription>
              </CardHeader>
              <CardContent>
                {turfMatches && turfMatches.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Match</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turfMatches.slice(0, 10).map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.match_name}</TableCell>
                          <TableCell>{format(parseISO(m.match_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{m.match_time?.slice(0, 5)}</TableCell>
                          <TableCell>{m.profiles?.name || "-"}</TableCell>
                          <TableCell>{m.match_players?.[0]?.count || 0} / {m.total_slots}</TableCell>
                          <TableCell>
                            <Badge variant={m.status as any}>{m.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`/matches/${m.id}`}>
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming matches scheduled
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Calendar View */}
            <Card>
              <CardHeader>
                <CardTitle>Booked Slots</CardTitle>
                <CardDescription>Time slots blocked by bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {turfBookings && turfBookings.length > 0 ? (
                  <div className="space-y-2">
                    {turfBookings.slice(0, 10).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{format(parseISO(b.booking_date), "EEEE, dd MMM")}</p>
                          <p className="text-sm text-muted-foreground">
                            {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)} ({b.duration_minutes} min)
                          </p>
                        </div>
                        <Badge variant="outline">₹{b.amount_paid} paid</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No bookings yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">All Matches</h1>
            <Card>
              <CardContent className="p-0">
                {turfMatches && turfMatches.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Match</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turfMatches.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.match_name}</TableCell>
                          <TableCell>{format(parseISO(m.match_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{m.match_time?.slice(0, 5)}</TableCell>
                          <TableCell>{m.duration_minutes} min</TableCell>
                          <TableCell>{m.profiles?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={m.status as any}>{m.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`/matches/${m.id}`}>
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No matches at this turf yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "settings" && selectedTurf && (
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold">Turf Settings</h1>
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Availability</CardTitle>
                <CardDescription>Update your turf's pricing and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Price per Hour (₹)</Label>
                  <Input
                    type="number"
                    value={editForm.price_per_hour}
                    onChange={(e) => setEditForm({ ...editForm, price_per_hour: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      When inactive, the turf won't appear in listings
                    </p>
                  </div>
                  <Switch
                    checked={editForm.active}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, active: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={() => updateTurfMutation.mutate()}
                  disabled={updateTurfMutation.isPending}
                  className="w-full"
                >
                  {updateTurfMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Turf Details</CardTitle>
                <CardDescription>Basic information (contact admin to change)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedTurf.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sport Type</Label>
                    <p className="font-medium">{selectedTurf.sport_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">{selectedTurf.location}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">City</Label>
                    <p className="font-medium">{selectedTurf.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
