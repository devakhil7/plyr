import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Loader2, 
  Trophy,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Phone,
  Mail,
  IndianRupee,
  Image,
  User
} from "lucide-react";
import { AdminIndividualRegistrations } from "@/components/tournaments/AdminIndividualRegistrations";

interface Team {
  id: string;
  team_name: string;
  team_logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payment_status: string;
  team_status: string;
  total_fee: number;
  total_paid: number;
  verification_notes: string | null;
  captain_user_id: string;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    profile_photo_url: string | null;
  } | null;
  tournament_team_players: Array<{
    id: string;
    player_name: string;
    phone: string | null;
    email: string | null;
    jersey_number: number | null;
    position: string | null;
    invite_status: string;
    user_id: string | null;
  }>;
}

export default function AdminTournamentTeams() {
  const { tournamentId: id } = useParams<{ tournamentId: string }>();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("teams");

  // Fetch tournament
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Fetch teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["admin-tournament-teams", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select(`
          *,
          tournament_team_players (*)
        `)
        .eq("tournament_id", id)
        .order("created_at", { ascending: false });
      
      // Fetch captain profiles separately
      if (data) {
        const captainIds = [...new Set(data.map(t => t.captain_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, profile_photo_url")
          .in("id", captainIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data.map(team => ({
          ...team,
          profiles: profileMap.get(team.captain_user_id) || null,
        })) as Team[];
      }
      return [] as Team[];
    },
    enabled: !!id,
  });

  const isLoading = tournamentLoading || teamsLoading;

  // Filter teams
  const filteredTeams = teams?.filter(team => {
    if (statusFilter === "all") return true;
    return team.team_status === statusFilter;
  }) || [];

  // Update team status mutation
  const updateTeamStatus = useMutation({
    mutationFn: async ({ teamId, status, notes }: { teamId: string; status: string; notes?: string }) => {
      const updateData: any = {
        team_status: status,
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
      };
      
      if (notes !== undefined) {
        updateData.verification_notes = notes;
      }

      const { error } = await supabase
        .from("tournament_teams")
        .update(updateData)
        .eq("id", teamId);

      if (error) throw error;

      // TODO: Send notification to captain
      // This would integrate with an edge function for email notifications

      return true;
    },
    onSuccess: () => {
      toast.success("Team status updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-tournament-teams", id] });
      setSelectedTeam(null);
      setVerificationNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update team status");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-600">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending_verification":
        return <Badge variant="secondary">Pending Verification</Badge>;
      case "pending_roster":
        return <Badge variant="outline">Pending Roster</Badge>;
      case "pending_payment":
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Pending Payment</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>;
      case "partial":
        return <Badge className="bg-orange-500">Partial</Badge>;
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Tournament not found</h2>
          <Link to="/admin/tournaments">
            <Button>Back to Tournaments</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Stats
  const stats = {
    total: teams?.length || 0,
    approved: teams?.filter(t => t.team_status === "approved").length || 0,
    pending: teams?.filter(t => t.team_status === "pending_verification").length || 0,
    rejected: teams?.filter(t => t.team_status === "rejected").length || 0,
    totalPaid: teams?.reduce((sum, t) => sum + (t.total_paid || 0), 0) || 0,
    totalDue: teams?.reduce((sum, t) => sum + ((t.total_fee || 0) - (t.total_paid || 0)), 0) || 0,
  };

  return (
    <Layout>
      <div className="container-app py-8">
        <Link to="/admin/tournaments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tournaments
        </Link>

        <div className="mb-8">
          <Badge variant="sport" className="mb-2">{tournament.sport}</Badge>
          <h1 className="text-2xl font-bold">{tournament.name} - Teams</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Teams</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">₹{stats.totalPaid.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">₹{stats.totalDue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Teams and Individuals */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Teams ({teams?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="individuals" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Individuals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending_roster">Pending Roster</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Teams Table */}
            <Card>
              <CardContent className="p-0">
                {filteredTeams.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No teams found</p>
                  </div>
                ) : (
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Captain</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {team.team_logo_url ? (
                            <img 
                              src={team.team_logo_url} 
                              alt={team.team_name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Image className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{team.team_name}</p>
                            <p className="text-xs text-muted-foreground">{team.contact_phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={team.profiles?.profile_photo_url || undefined} />
                            <AvatarFallback>{team.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{team.profiles?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{team.tournament_team_players?.length || 0}</span>
                        <span className="text-muted-foreground text-sm"> players</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getPaymentStatusBadge(team.payment_status)}
                          <p className="text-xs text-muted-foreground">
                            ₹{team.total_paid?.toLocaleString() || 0} / ₹{team.total_fee?.toLocaleString() || 0}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(team.team_status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTeam(team);
                            setVerificationNotes(team.verification_notes || "");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="individuals">
            <AdminIndividualRegistrations tournamentId={id!} />
          </TabsContent>
        </Tabs>

        {/* Team Detail Dialog */}
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedTeam?.team_logo_url && (
                  <img 
                    src={selectedTeam.team_logo_url} 
                    alt={selectedTeam.team_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                {selectedTeam?.team_name}
              </DialogTitle>
            </DialogHeader>

            {selectedTeam && (
              <div className="space-y-6">
                {/* Status & Payment */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Team Status</p>
                    {getStatusBadge(selectedTeam.team_status)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                    {getPaymentStatusBadge(selectedTeam.payment_status)}
                    <p className="text-sm mt-1">
                      ₹{selectedTeam.total_paid?.toLocaleString() || 0} of ₹{selectedTeam.total_fee?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedTeam.contact_phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedTeam.contact_email || "N/A"}</span>
                  </div>
                </div>

                {/* Captain */}
                <div>
                  <p className="text-sm font-medium mb-2">Captain</p>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar>
                      <AvatarImage src={selectedTeam.profiles?.profile_photo_url || undefined} />
                      <AvatarFallback>{selectedTeam.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedTeam.profiles?.name || "Unknown"}</p>
                      <Link to={`/players/${selectedTeam.profiles?.id}`} className="text-sm text-primary hover:underline">
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Players */}
                <div>
                  <p className="text-sm font-medium mb-2">Players ({selectedTeam.tournament_team_players?.length || 0})</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedTeam.tournament_team_players?.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          {player.jersey_number && (
                            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {player.jersey_number}
                            </span>
                          )}
                          <div>
                            <p className="font-medium">{player.player_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {player.position || "No position"} • {player.phone || player.email || "No contact"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={player.invite_status === "joined" ? "default" : "secondary"} className="text-xs">
                          {player.invite_status === "joined" ? "Joined" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Notes */}
                <div>
                  <p className="text-sm font-medium mb-2">Verification Notes</p>
                  <Textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about verification decision..."
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => updateTeamStatus.mutate({
                      teamId: selectedTeam.id,
                      status: "rejected",
                      notes: verificationNotes
                    })}
                    disabled={updateTeamStatus.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateTeamStatus.mutate({
                      teamId: selectedTeam.id,
                      status: "pending_verification",
                      notes: verificationNotes
                    })}
                    disabled={updateTeamStatus.isPending}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Pending
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => updateTeamStatus.mutate({
                      teamId: selectedTeam.id,
                      status: "approved",
                      notes: verificationNotes
                    })}
                    disabled={updateTeamStatus.isPending}
                  >
                    {updateTeamStatus.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}