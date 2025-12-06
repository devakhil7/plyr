import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Users, MapPin, Trophy, Shield, Plus, Trash2, Star, Search, 
  Calendar, ChevronLeft, ChevronRight, Building, Eye, Power
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["overview", "turfs", "users", "matches"] as const;
type TabType = typeof TABS[number];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchMatches, setSearchMatches] = useState("");
  const [searchTurfs, setSearchTurfs] = useState("");

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
      toast.error("Access denied. Admin only.");
    }
  }, [user, isAdmin, loading, rolesLoading, navigate]);

  // Queries
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: matches } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, profiles!matches_host_id_fkey(name), turfs(name)")
        .order("match_date", { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: turfs } = useQuery({
    queryKey: ["admin-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: turfOwners } = useQuery({
    queryKey: ["admin-turf-owners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turf_owners")
        .select("*, profiles(name, email), turfs(name)");
      return data || [];
    },
    enabled: isAdmin,
  });

  // Get user's roles
  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles?.filter((r: any) => r.user_id === userId).map((r: any) => r.role as AppRole) || [];
  };

  // Get turf owners for a turf
  const getTurfOwners = (turfId: string) => {
    return turfOwners?.filter((to: any) => to.turf_id === turfId) || [];
  };

  // Mutations
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: AppRole; action: "add" | "remove" }) => {
      if (action === "add") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("User role updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const toggleTurfActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("turfs").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turfs"] });
      toast.success("Turf status updated");
    },
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ table, id, featured }: { table: "matches" | "turfs"; id: string; featured: boolean }) => {
      const { error } = await supabase.from(table).update({ is_featured: !featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-turfs"] });
      toast.success("Featured status updated");
    },
  });

  type MatchStatus = "open" | "full" | "in_progress" | "completed" | "cancelled";

  const updateMatchStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MatchStatus }) => {
      const { error } = await supabase.from("matches").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast.success("Match status updated");
    },
  });

  const deleteTurfMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("turfs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turfs"] });
      toast.success("Turf deleted");
    },
  });

  const assignTurfOwnerMutation = useMutation({
    mutationFn: async ({ userId, turfId }: { userId: string; turfId: string }) => {
      // Ensure user has turf_owner role
      const hasRole = getUserRoles(userId).includes("turf_owner");
      if (!hasRole) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "turf_owner" });
      }
      // Create turf_owners entry
      const { error } = await supabase.from("turf_owners").insert({ user_id: userId, turf_id: turfId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turf-owners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Turf owner assigned");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign owner");
    },
  });

  const removeTurfOwnerMutation = useMutation({
    mutationFn: async ({ userId, turfId }: { userId: string; turfId: string }) => {
      const { error } = await supabase.from("turf_owners").delete().eq("user_id", userId).eq("turf_id", turfId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turf-owners"] });
      toast.success("Turf owner removed");
    },
  });

  // Filter data
  const filteredUsers = users?.filter((u: any) =>
    u.name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredMatches = matches?.filter((m: any) =>
    m.match_name?.toLowerCase().includes(searchMatches.toLowerCase())
  );

  const filteredTurfs = turfs?.filter((t: any) =>
    t.name?.toLowerCase().includes(searchTurfs.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchTurfs.toLowerCase())
  );

  // Stats
  const todayMatches = matches?.filter((m: any) => {
    const today = new Date().toISOString().split("T")[0];
    return m.match_date === today;
  }).length || 0;

  if (loading || rolesLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="p-2 space-y-1">
          {TABS.map((tab) => {
            const icons = { overview: Trophy, turfs: MapPin, users: Users, matches: Calendar };
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
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Overview</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <Users className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-3xl font-bold">{users?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <MapPin className="h-10 w-10 text-secondary" />
                  <div>
                    <p className="text-3xl font-bold">{turfs?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Turfs</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <Trophy className="h-10 w-10 text-accent" />
                  <div>
                    <p className="text-3xl font-bold">{matches?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Matches</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <Calendar className="h-10 w-10 text-green-500" />
                  <div>
                    <p className="text-3xl font-bold">{todayMatches}</p>
                    <p className="text-sm text-muted-foreground">Matches Today</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "turfs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Turfs</h1>
              <div className="flex gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search turfs..." value={searchTurfs} onChange={(e) => setSearchTurfs(e.target.value)} className="pl-10" />
                </div>
                <AddTurfDialog users={users || []} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-turfs"] })} />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Price/hr</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Assigned Owners</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTurfs?.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.city}</TableCell>
                        <TableCell>{t.sport_type}</TableCell>
                        <TableCell>₹{t.price_per_hour}</TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {t.owner_email && <p className="text-muted-foreground">{t.owner_email}</p>}
                            {t.owner_contact && <p className="text-muted-foreground">{t.owner_contact}</p>}
                            {!t.owner_email && !t.owner_contact && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getTurfOwners(t.id).map((to: any) => (
                              <Badge key={to.id} variant="secondary" className="text-xs">
                                {to.profiles?.name || to.profiles?.email}
                                <button
                                  onClick={() => removeTurfOwnerMutation.mutate({ userId: to.user_id, turfId: t.id })}
                                  className="ml-1 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                            <AssignOwnerDialog 
                              turfId={t.id} 
                              users={users || []} 
                              existingOwners={getTurfOwners(t.id).map((to: any) => to.user_id)}
                              onAssign={(userId) => assignTurfOwnerMutation.mutate({ userId, turfId: t.id })}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={t.active !== false} 
                            onCheckedChange={() => toggleTurfActiveMutation.mutate({ id: t.id, active: t.active !== false })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFeatureMutation.mutate({ table: "turfs", id: t.id, featured: t.is_featured })}
                          >
                            <Star className={cn("h-4 w-4", t.is_featured && "fill-amber-500 text-amber-500")} />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link to={`/turfs/${t.id}`}>
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => confirm("Delete this turf?") && deleteTurfMutation.mutate(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Users</h1>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((u: any) => {
                      const roles = getUserRoles(u.id);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name || "-"}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.city || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {roles.map((role) => (
                                <Badge key={role} variant={role === "admin" ? "default" : role === "turf_owner" ? "secondary" : "outline"}>
                                  {role}
                                </Badge>
                              ))}
                              {roles.length === 0 && <Badge variant="outline">player</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString("en-IN")}</TableCell>
                          <TableCell>
                            <Select
                              onValueChange={(value) => {
                                const [action, role] = value.split("-") as ["add" | "remove", AppRole];
                                changeRoleMutation.mutate({ userId: u.id, role, action });
                              }}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Change role" />
                              </SelectTrigger>
                              <SelectContent>
                                {!roles.includes("admin") && (
                                  <SelectItem value="add-admin">Add Admin</SelectItem>
                                )}
                                {roles.includes("admin") && u.id !== user?.id && (
                                  <SelectItem value="remove-admin">Remove Admin</SelectItem>
                                )}
                                {!roles.includes("turf_owner") && (
                                  <SelectItem value="add-turf_owner">Add Turf Owner</SelectItem>
                                )}
                                {roles.includes("turf_owner") && (
                                  <SelectItem value="remove-turf_owner">Remove Turf Owner</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Matches</h1>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search matches..." value={searchMatches} onChange={(e) => setSearchMatches(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match</TableHead>
                      <TableHead>Turf</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches?.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.match_name}</TableCell>
                        <TableCell>{m.turfs?.name || "-"}</TableCell>
                        <TableCell>{new Date(m.match_date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>{m.match_time?.slice(0, 5)}</TableCell>
                        <TableCell>{m.profiles?.name || "-"}</TableCell>
                        <TableCell>
                          <Select
                            value={m.status}
                            onValueChange={(status: MatchStatus) => updateMatchStatusMutation.mutate({ id: m.id, status })}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="full">Full</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {m.team_a_score !== null ? `${m.team_a_score} - ${m.team_b_score}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFeatureMutation.mutate({ table: "matches", id: m.id, featured: m.is_featured })}
                            >
                              <Star className={cn("h-4 w-4", m.is_featured && "fill-amber-500 text-amber-500")} />
                            </Button>
                            <Link to={`/matches/${m.id}`}>
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// Add Turf Dialog
function AddTurfDialog({ users, onSuccess }: { users: any[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    city: "",
    latitude: null as number | null,
    longitude: null as number | null,
    price_per_hour: 1000,
    sport_type: "Football",
    description: "",
    owner_contact: "",
    owner_email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("turfs").insert({ ...form, active: true });
      if (error) throw error;
      toast.success("Turf added!");
      setOpen(false);
      setForm({ name: "", location: "", city: "", latitude: null, longitude: null, price_per_hour: 1000, sport_type: "Football", description: "", owner_contact: "", owner_email: "" });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add turf");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Add Turf</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Turf</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Turf Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., LaunchPad Sports Arena" />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required placeholder="e.g., Mumbai" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Full Address / Location *</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required placeholder="e.g., Near XYZ Mall, Andheri West" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price/hour (₹)</Label>
              <Input type="number" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Sport</Label>
              <Input value={form.sport_type} onChange={(e) => setForm({ ...form, sport_type: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner Email</Label>
              <Input type="email" placeholder="owner@example.com" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Owner Contact</Label>
              <Input type="tel" placeholder="+91 9876543210" value={form.owner_contact} onChange={(e) => setForm({ ...form, owner_contact: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding..." : "Add Turf"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Assign Owner Dialog
function AssignOwnerDialog({ 
  turfId, 
  users, 
  existingOwners,
  onAssign 
}: { 
  turfId: string; 
  users: any[]; 
  existingOwners: string[];
  onAssign: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const availableUsers = users.filter((u) => !existingOwners.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
          <Plus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Turf Owner</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {availableUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onAssign(u.id);
                setOpen(false);
              }}
              className="w-full p-3 text-left rounded-lg border hover:bg-muted transition-colors"
            >
              <p className="font-medium">{u.name || "Unnamed"}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </button>
          ))}
          {availableUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No available users</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
