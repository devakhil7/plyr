import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { User, Loader2, UserPlus, Users, CheckCircle } from "lucide-react";

interface AdminIndividualRegistrationsProps {
  tournamentId: string;
}

interface IndividualRegistration {
  id: string;
  user_id: string;
  payment_status: string;
  registration_status: string;
  amount_paid: number;
  preferred_position: string | null;
  notes: string | null;
  assigned_team_id: string | null;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    profile_photo_url: string | null;
    skill_level: string | null;
    position: string | null;
  } | null;
}

interface Team {
  id: string;
  team_name: string;
  tournament_team_players: { id: string }[];
}

export function AdminIndividualRegistrations({ tournamentId }: AdminIndividualRegistrationsProps) {
  const [selectedRegistration, setSelectedRegistration] = useState<IndividualRegistration | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");
  const [assignMode, setAssignMode] = useState<"existing" | "new">("existing");

  const queryClient = useQueryClient();

  // Fetch individual registrations
  const { data: registrations, isLoading } = useQuery({
    queryKey: ["tournament-individual-registrations", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_individual_registrations")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, profile_photo_url, skill_level, position")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data.map(reg => ({
          ...reg,
          profiles: profileMap.get(reg.user_id) || null,
        })) as IndividualRegistration[];
      }

      return [] as IndividualRegistration[];
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["tournament-teams-for-assignment", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          tournament_team_players (id)
        `)
        .eq("tournament_id", tournamentId)
        .order("team_name");

      return (data || []) as Team[];
    },
  });

  // Assign to existing team mutation
  const assignToTeam = useMutation({
    mutationFn: async ({ registrationId, teamId, userId, playerName, position }: {
      registrationId: string;
      teamId: string;
      userId: string;
      playerName: string;
      position: string | null;
    }) => {
      // Add player to team
      const { error: playerError } = await supabase
        .from("tournament_team_players")
        .insert({
          tournament_team_id: teamId,
          user_id: userId,
          player_name: playerName,
          position: position,
          invite_status: "joined",
        });

      if (playerError) throw playerError;

      // Update individual registration
      const { error: updateError } = await supabase
        .from("tournament_individual_registrations")
        .update({
          assigned_team_id: teamId,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (updateError) throw updateError;

      return true;
    },
    onSuccess: () => {
      toast.success("Player assigned to team successfully!");
      queryClient.invalidateQueries({ queryKey: ["tournament-individual-registrations", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament-teams-for-assignment", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tournament-teams", tournamentId] });
      setAssignDialogOpen(false);
      setSelectedRegistration(null);
      setSelectedTeamId("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign player");
    },
  });

  // Create new team and assign mutation
  const createTeamAndAssign = useMutation({
    mutationFn: async ({ registrationId, teamName, userId, playerName, position }: {
      registrationId: string;
      teamName: string;
      userId: string;
      playerName: string;
      position: string | null;
    }) => {
      // Create new team with the individual as captain
      const { data: team, error: teamError } = await supabase
        .from("tournament_teams")
        .insert({
          tournament_id: tournamentId,
          team_name: teamName,
          captain_user_id: userId,
          payment_status: "paid", // Assuming individual already paid
          registration_status: "confirmed",
          team_status: "approved",
          total_fee: 0,
          total_paid: 0,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add player to team
      const { error: playerError } = await supabase
        .from("tournament_team_players")
        .insert({
          tournament_team_id: team.id,
          user_id: userId,
          player_name: playerName,
          position: position,
          invite_status: "joined",
        });

      if (playerError) throw playerError;

      // Update individual registration
      const { error: updateError } = await supabase
        .from("tournament_individual_registrations")
        .update({
          assigned_team_id: team.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (updateError) throw updateError;

      return team;
    },
    onSuccess: () => {
      toast.success("New team created and player assigned!");
      queryClient.invalidateQueries({ queryKey: ["tournament-individual-registrations", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament-teams-for-assignment", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tournament-teams", tournamentId] });
      setAssignDialogOpen(false);
      setSelectedRegistration(null);
      setNewTeamName("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create team");
    },
  });

  const handleAssign = () => {
    if (!selectedRegistration) return;

    const playerName = selectedRegistration.profiles?.name || "Unknown Player";
    const position = selectedRegistration.preferred_position || selectedRegistration.profiles?.position || null;

    if (assignMode === "existing" && selectedTeamId) {
      assignToTeam.mutate({
        registrationId: selectedRegistration.id,
        teamId: selectedTeamId,
        userId: selectedRegistration.user_id,
        playerName,
        position,
      });
    } else if (assignMode === "new" && newTeamName.trim()) {
      createTeamAndAssign.mutate({
        registrationId: selectedRegistration.id,
        teamName: newTeamName.trim(),
        userId: selectedRegistration.user_id,
        playerName,
        position,
      });
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

  const unassignedCount = registrations?.filter(r => !r.assigned_team_id).length || 0;
  const assignedCount = registrations?.filter(r => r.assigned_team_id).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{registrations?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Individuals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{unassignedCount}</p>
            <p className="text-sm text-muted-foreground">Unassigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
            <p className="text-sm text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Individual Registrations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!registrations || registrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No individual registrations yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={reg.profiles?.profile_photo_url || undefined} />
                          <AvatarFallback>{reg.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{reg.profiles?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{reg.profiles?.skill_level || "N/A"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{reg.preferred_position || reg.profiles?.position || "-"}</span>
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(reg.payment_status)}</TableCell>
                    <TableCell>
                      {reg.assigned_team_id ? (
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Assigned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-500 text-orange-600">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!reg.assigned_team_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRegistration(reg);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Player to Team</DialogTitle>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4">
              {/* Player Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedRegistration.profiles?.profile_photo_url || undefined} />
                  <AvatarFallback>{selectedRegistration.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRegistration.profiles?.name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRegistration.preferred_position || "No position preference"}
                  </p>
                </div>
              </div>

              {selectedRegistration.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Player Notes:</p>
                  <p className="text-sm text-muted-foreground">{selectedRegistration.notes}</p>
                </div>
              )}

              {/* Assignment Mode */}
              <div className="space-y-3">
                <Label>Assignment Option</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={assignMode === "existing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAssignMode("existing")}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Existing Team
                  </Button>
                  <Button
                    variant={assignMode === "new" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAssignMode("new")}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    New Team
                  </Button>
                </div>
              </div>

              {assignMode === "existing" ? (
                <div>
                  <Label>Select Team</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.team_name} ({team.tournament_team_players.length} players)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>New Team Name</Label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This player will be the captain of the new team.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAssign}
                disabled={
                  (assignMode === "existing" && !selectedTeamId) ||
                  (assignMode === "new" && !newTeamName.trim()) ||
                  assignToTeam.isPending ||
                  createTeamAndAssign.isPending
                }
              >
                {(assignToTeam.isPending || createTeamAndAssign.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Assign to Team
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
