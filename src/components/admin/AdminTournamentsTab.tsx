import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO, subDays } from "date-fns";
import { 
  Trophy, Users, IndianRupee, CheckCircle, XCircle, Eye, 
  Download, Calendar, Search, Clock, TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createNotification } from "@/hooks/useNotifications";

export function AdminTournamentsTab() {
  const [activeSubTab, setActiveSubTab] = useState("registrations");
  const [statusFilter, setStatusFilter] = useState<string>("pending_payment");
  const [searchTeam, setSearchTeam] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const queryClient = useQueryClient();

  // Fetch all tournaments with counts
  const { data: tournaments } = useQuery({
    queryKey: ["admin-tournaments-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(`
          id, name, sport, status,
          tournament_teams (id, payment_status, total_fee, total_paid)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch all tournament teams
  const { data: allTeams, isLoading: teamsLoading } = useQuery({
    queryKey: ["admin-all-tournament-teams", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("tournament_teams")
        .select(`
          *,
          tournaments (id, name, sport, entry_fee),
          tournament_team_players (id, player_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("team_status", statusFilter);
      }

      const { data } = await query;
      
      // Fetch captain profiles
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
        }));
      }
      return [];
    },
  });

  // Fetch tournament payments
  const { data: tournamentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-tournament-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(`
          *,
          turfs (name, city),
          tournaments (id, name),
          tournament_teams (id, team_name)
        `)
        .not("tournament_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Update team status mutation
  const updateTeamStatus = useMutation({
    mutationFn: async ({ teamId, status, notes, team }: { teamId: string; status: string; notes?: string; team?: any }) => {
      const { error } = await supabase
        .from("tournament_teams")
        .update({
          team_status: status,
          verification_notes: notes || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (error) throw error;

      // Send notification to captain
      if (team?.captain_user_id && (status === "approved" || status === "rejected")) {
        const tournamentName = team.tournaments?.name || "Tournament";
        const teamName = team.team_name || "Your team";
        
        // Create database notification
        try {
          await createNotification({
            userId: team.captain_user_id,
            type: status === "approved" ? "tournament_team_approved" : "tournament_team_rejected",
            title: status === "approved" ? "Team Approved!" : "Team Registration Update",
            message: status === "approved"
              ? `Great news! Your team "${teamName}" has been approved for ${tournamentName}. Get ready to compete!`
              : `Your team "${teamName}" registration for ${tournamentName} was not approved.${notes ? ` Reason: ${notes}` : ""}`,
            link: `/tournaments/${team.tournament_id}`,
            metadata: { 
              tournamentId: team.tournament_id,
              teamId: teamId,
              status 
            },
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }

        // Also send system message (legacy)
        const { data: existingConversation } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", team.captain_user_id)
          .limit(1)
          .maybeSingle();

        let conversationId = existingConversation?.conversation_id;
        
        if (!conversationId) {
          const { data: newConversation } = await supabase
            .from("conversations")
            .insert({ created_by: team.captain_user_id })
            .select()
            .single();
          
          if (newConversation) {
            conversationId = newConversation.id;
            await supabase.from("conversation_participants").insert({
              conversation_id: conversationId,
              user_id: team.captain_user_id,
            });
          }
        }

        if (conversationId) {
          const messageContent = status === "approved"
            ? `🎉 Great news! Your team "${teamName}" has been approved for ${tournamentName}. Get ready to compete!`
            : `Your team "${teamName}" registration for ${tournamentName} was not approved.${notes ? ` Reason: ${notes}` : ""} Please contact the organizer for more details.`;

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: team.captain_user_id,
            content: messageContent,
            message_type: "system",
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Team status updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-all-tournament-teams"] });
      setSelectedTeam(null);
      setVerificationNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update team status");
    },
  });

  // Filter teams
  const filteredTeams = allTeams?.filter(team =>
    team.team_name?.toLowerCase().includes(searchTeam.toLowerCase()) ||
    team.tournaments?.name?.toLowerCase().includes(searchTeam.toLowerCase())
  ) || [];

  // Calculate stats
  const stats = {
    totalTournaments: tournaments?.length || 0,
    activeTournaments: tournaments?.filter(t => t.status === "upcoming" || t.status === "live").length || 0,
    totalTeams: allTeams?.length || 0,
    pendingVerification: allTeams?.filter(t => t.team_status === "pending_payment" || t.team_status === "pending_verification").length || 0,
    totalRevenue: tournamentPayments?.filter(p => p.status === "paid").reduce((acc, p) => acc + Number(p.amount_total), 0) || 0,
    platformFees: tournamentPayments?.filter(p => p.status === "paid").reduce((acc, p) => acc + Number(p.platform_fee), 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending_verification: "secondary",
      rejected: "destructive",
      pending_payment: "outline",
      pending_roster: "outline",
    };
    const labels: Record<string, string> = {
      approved: "Approved",
      pending_verification: "Pending Review",
      rejected: "Rejected",
      pending_payment: "Awaiting Payment",
      pending_roster: "Pending Roster",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      partial: "secondary",
      unpaid: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const exportPaymentsCSV = () => {
    if (!tournamentPayments || tournamentPayments.length === 0) return;
    
    const headers = ["Date", "Tournament", "Team", "Status", "Amount", "Platform Fee", "Payment Method"];
    const rows = tournamentPayments.map((p: any) => [
      p.paid_at ? format(parseISO(p.paid_at), "yyyy-MM-dd") : "-",
      p.tournaments?.name || "-",
      p.tournament_teams?.team_name || "-",
      p.status,
      p.amount_total,
      p.platform_fee,
      p.payment_method,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tournament_payments_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournament Management</h1>
        <Link to="/admin/tournaments">
          <Button variant="outline">
            <Trophy className="h-4 w-4 mr-2" />
            Full Tournament Admin
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTournaments}</p>
                <p className="text-xs text-muted-foreground">Tournaments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeTournaments}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTeams}</p>
                <p className="text-xs text-muted-foreground">Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingVerification}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">₹{stats.platformFees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Platform Fees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="registrations">
            Team Registrations
            {stats.pendingVerification > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs rounded-full">
                {stats.pendingVerification}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Tournament Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team or tournament..."
                    value={searchTeam}
                    onChange={(e) => setSearchTeam(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    <SelectItem value="pending_payment">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Teams Table */}
          <Card>
            <CardContent className="p-0">
              {teamsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredTeams.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No teams found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Captain</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeams.map((team: any) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <div className="font-medium">{team.team_name}</div>
                          <div className="text-xs text-muted-foreground">{team.contact_phone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{team.tournaments?.name}</div>
                          <div className="text-xs text-muted-foreground">{team.tournaments?.sport}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={team.profiles?.profile_photo_url || undefined} />
                              <AvatarFallback className="text-xs">{team.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{team.profiles?.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{team.tournament_team_players?.length || 0}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getPaymentStatusBadge(team.payment_status)}
                            <div className="text-xs text-muted-foreground">
                              ₹{team.total_paid?.toLocaleString() || 0} / ₹{team.total_fee?.toLocaleString() || 0}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(team.team_status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(team);
                                setVerificationNotes(team.verification_notes || "");
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {team.team_status !== "approved" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => updateTeamStatus.mutate({ teamId: team.id, status: "approved", team })}
                                disabled={updateTeamStatus.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {team.team_status !== "rejected" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedTeam(team);
                                  setVerificationNotes("");
                                }}
                                disabled={updateTeamStatus.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {/* Payments Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tournament Entry Payments</CardTitle>
                <Button variant="outline" size="sm" onClick={exportPaymentsCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : !tournamentPayments || tournamentPayments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tournament payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournamentPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.paid_at ? format(parseISO(payment.paid_at), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{payment.tournaments?.name || "-"}</div>
                        </TableCell>
                        <TableCell>{payment.tournament_teams?.team_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_purpose === "tournament_entry_advance" ? "Advance" :
                             payment.payment_purpose === "tournament_entry_balance" ? "Balance" :
                             payment.payment_purpose === "tournament_entry_full" ? "Full" : payment.payment_purpose}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{Number(payment.amount_total).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-primary">
                          ₹{Number(payment.platform_fee).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Detail Dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.team_name}</DialogTitle>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tournament</p>
                  <p className="font-medium">{selectedTeam.tournaments?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTeam.team_status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <div>
                    {getPaymentStatusBadge(selectedTeam.payment_status)}
                    <p className="text-sm mt-1">
                      ₹{selectedTeam.total_paid?.toLocaleString()} / ₹{selectedTeam.total_fee?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Players</p>
                  <p className="font-medium">{selectedTeam.tournament_team_players?.length || 0}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Captain</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedTeam.profiles?.profile_photo_url || undefined} />
                    <AvatarFallback>{selectedTeam.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span>{selectedTeam.profiles?.name}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Verification Notes</p>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add notes (optional for approval, required for rejection)"
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedTeam(null)}>
                  Close
                </Button>
                {selectedTeam.team_status !== "rejected" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!verificationNotes.trim()) {
                        toast.error("Please add a reason for rejection");
                        return;
                      }
                      updateTeamStatus.mutate({ 
                        teamId: selectedTeam.id, 
                        status: "rejected",
                        notes: verificationNotes,
                        team: selectedTeam
                      });
                    }}
                    disabled={updateTeamStatus.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
                {selectedTeam.team_status !== "approved" && (
                  <Button
                    onClick={() => updateTeamStatus.mutate({ 
                      teamId: selectedTeam.id, 
                      status: "approved",
                      notes: verificationNotes || undefined,
                      team: selectedTeam
                    })}
                    disabled={updateTeamStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
