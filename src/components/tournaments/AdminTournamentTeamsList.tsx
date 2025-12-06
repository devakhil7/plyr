import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Users, Eye, IndianRupee, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

interface AdminTournamentTeamsListProps {
  tournamentId: string;
  entryFee: number;
}

export function AdminTournamentTeamsList({ tournamentId, entryFee }: AdminTournamentTeamsListProps) {
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["admin-tournament-teams", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select(`
          *,
          profiles:captain_user_id (id, name, email),
          tournament_team_players (id, player_name, player_contact)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["tournament-payments", selectedTeam?.id],
    queryFn: async () => {
      if (!selectedTeam) return [];
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("tournament_team_id", selectedTeam.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedTeam,
  });

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700 border-green-200";
      case "partial": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-red-100 text-red-700 border-red-200";
    }
  };

  const getRegistrationStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-700 border-green-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  // Stats
  const totalTeams = teams.length;
  const paidTeams = teams.filter((t: any) => t.payment_status === "paid").length;
  const partialTeams = teams.filter((t: any) => t.payment_status === "partial").length;
  const unpaidTeams = teams.filter((t: any) => t.payment_status === "unpaid").length;
  const totalDue = totalTeams * entryFee;
  const totalCollected = teams.reduce((acc: number, t: any) => acc + (t.total_paid || 0), 0);

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading teams...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{totalTeams}</p>
            <p className="text-sm text-muted-foreground">Total Teams</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-600">{paidTeams}</p>
            <p className="text-sm text-muted-foreground">Fully Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{partialTeams}</p>
            <p className="text-sm text-muted-foreground">Partial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">₹{totalCollected.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">of ₹{totalDue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Teams ({totalTeams})</CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No teams registered yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Captain</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team: any) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.team_name}</TableCell>
                    <TableCell>
                      <div>
                        <p>{team.profiles?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{team.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{team.tournament_team_players?.length || 0}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getPaymentStatusColor(team.payment_status)}>
                          {team.payment_status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          ₹{team.total_paid?.toLocaleString() || 0} / ₹{team.total_fee?.toLocaleString() || entryFee}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRegistrationStatusColor(team.registration_status)}>
                        {team.registration_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Team Detail Dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.team_name}</DialogTitle>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-4">
              {/* Captain Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Captain</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="font-medium">{selectedTeam.profiles?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTeam.profiles?.email}</p>
                </CardContent>
              </Card>

              {/* Players */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    Players ({selectedTeam.tournament_team_players?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-2">
                    {selectedTeam.tournament_team_players?.map((player: any) => (
                      <div key={player.id} className="flex justify-between text-sm">
                        <span>{player.player_name}</span>
                        <span className="text-muted-foreground">{player.player_contact || "-"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Payment History</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Fee</span>
                      <span>₹{selectedTeam.total_fee?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="text-green-600">₹{selectedTeam.total_paid?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Remaining</span>
                      <span className={selectedTeam.total_paid >= selectedTeam.total_fee ? "text-green-600" : "text-orange-600"}>
                        ₹{Math.max(0, (selectedTeam.total_fee || 0) - (selectedTeam.total_paid || 0)).toLocaleString()}
                      </span>
                    </div>
                    <hr />
                    {payments.length > 0 ? (
                      <div className="space-y-2">
                        {payments.map((payment: any) => (
                          <div key={payment.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                            <div>
                              <p className="font-medium">₹{payment.amount_total?.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {payment.payment_purpose?.replace(/_/g, " ")}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={payment.status === "paid" ? "default" : "destructive"}>
                                {payment.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {payment.paid_at && format(new Date(payment.paid_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">No payment records</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}