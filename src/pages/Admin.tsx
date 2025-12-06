import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, MapPin, Trophy, Shield, Plus, Pencil, Trash2, Star, Search } from "lucide-react";

export default function Admin() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchUsers, setSearchUsers] = useState("");
  const [searchMatches, setSearchMatches] = useState("");

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [user, profile, loading, navigate]);

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.is_admin,
  });

  const { data: matches } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, profiles!matches_host_id_fkey(name), turfs(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.is_admin,
  });

  const { data: turfs } = useQuery({
    queryKey: ["admin-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.is_admin,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_admin: !isAdmin }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated");
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

  const filteredUsers = users?.filter((u: any) =>
    u.name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredMatches = matches?.filter((m: any) =>
    m.match_name?.toLowerCase().includes(searchMatches.toLowerCase())
  );

  if (loading || !profile?.is_admin) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container-app py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage users, matches, and turfs</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Trophy className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{matches?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <MapPin className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{turfs?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Turfs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="turfs">Turfs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchUsers}
                      onChange={(e) => setSearchUsers(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "-"}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.city || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={u.skill_level as any} className="capitalize">
                            {u.skill_level || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.is_admin ? (
                            <Badge variant="default">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAdminMutation.mutate({ userId: u.id, isAdmin: u.is_admin })}
                            disabled={u.id === user?.id}
                          >
                            {u.is_admin ? "Remove Admin" : "Make Admin"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Matches</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search matches..."
                      value={searchMatches}
                      onChange={(e) => setSearchMatches(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Turf</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches?.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.match_name}</TableCell>
                        <TableCell>{m.profiles?.name || "-"}</TableCell>
                        <TableCell>{m.turfs?.name || "-"}</TableCell>
                        <TableCell>{new Date(m.match_date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant={m.status as any} className="capitalize">{m.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {m.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFeatureMutation.mutate({ table: "matches", id: m.id, featured: m.is_featured })}
                            >
                              {m.is_featured ? "Unfeature" : "Feature"}
                            </Button>
                            <Link to={`/matches/${m.id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turfs" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Turfs</CardTitle>
                  <AddTurfDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-turfs"] })} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Price/hr</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turfs?.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.location}</TableCell>
                        <TableCell>{t.city}</TableCell>
                        <TableCell>₹{t.price_per_hour}</TableCell>
                        <TableCell>{t.sport_type}</TableCell>
                        <TableCell>
                          {t.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFeatureMutation.mutate({ table: "turfs", id: t.id, featured: t.is_featured })}
                            >
                              {t.is_featured ? "Unfeature" : "Feature"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Delete this turf?")) {
                                  deleteTurfMutation.mutate(t.id);
                                }
                              }}
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function AddTurfDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    city: "",
    price_per_hour: 1000,
    sport_type: "Football",
    description: "",
    owner_contact: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("turfs").insert(form);
      if (error) throw error;
      toast.success("Turf added!");
      setOpen(false);
      setForm({ name: "", location: "", city: "", price_per_hour: 1000, sport_type: "Football", description: "", owner_contact: "" });
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Turf
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Turf</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location *</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
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
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Owner Contact</Label>
            <Input value={form.owner_contact} onChange={(e) => setForm({ ...form, owner_contact: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding..." : "Add Turf"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
