import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trophy, Plus, Edit, Users, Trash2, IndianRupee, ArrowLeft, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { AdminTournamentForm } from "@/components/tournaments/AdminTournamentForm";
import { AdminTournamentTeamsList } from "@/components/tournaments/AdminTournamentTeamsList";
import { TournamentMatchScheduler } from "@/components/tournaments/TournamentMatchScheduler";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function AdminTournaments() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTeamsFor, setViewingTeamsFor] = useState<any>(null);
  const [schedulingMatchesFor, setSchedulingMatchesFor] = useState<any>(null);
  const [deletingTournament, setDeletingTournament] = useState<any>(null);
  const { isAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!deletingTournament) return;
    
    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", deletingTournament.id);

    if (error) {
      toast.error("Failed to delete tournament: " + error.message);
    } else {
      toast.success("Tournament deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
    }
    setDeletingTournament(null);
  };

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["admin-tournaments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(`
          *,
          turfs (name, city),
          tournament_teams (id, payment_status),
          tournament_matches (id)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const statusColors: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700 border-blue-200",
    live: "bg-green-100 text-green-700 border-green-200",
    completed: "bg-gray-100 text-gray-700 border-gray-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-app py-8">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Tournament Management
            </h1>
            <p className="text-muted-foreground mt-1">Create and manage tournaments</p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreating || !!editingId} onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingId(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                {editingId ? "Edit Tournament" : "Create New Tournament"}
              </DialogTitle>
            </DialogHeader>
            <AdminTournamentForm
              tournamentId={editingId || undefined}
              onSuccess={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* View Teams Dialog */}
        <Dialog open={!!viewingTeamsFor} onOpenChange={() => setViewingTeamsFor(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingTeamsFor?.name} - Teams</DialogTitle>
            </DialogHeader>
            {viewingTeamsFor && (
              <AdminTournamentTeamsList
                tournamentId={viewingTeamsFor.id}
                entryFee={viewingTeamsFor.entry_fee || 0}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule Matches Dialog */}
        <Dialog open={!!schedulingMatchesFor} onOpenChange={() => setSchedulingMatchesFor(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {schedulingMatchesFor?.name} - Match Schedule
              </DialogTitle>
            </DialogHeader>
            {schedulingMatchesFor && (
              <TournamentMatchScheduler
                tournamentId={schedulingMatchesFor.id}
                tournamentName={schedulingMatchesFor.name}
                turfId={schedulingMatchesFor.turf_id}
                sport={schedulingMatchesFor.sport}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Tournaments Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tournaments ({tournaments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse py-8 text-center text-muted-foreground">
                Loading tournaments...
              </div>
            ) : tournaments.length === 0 ? (
              <div className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No tournaments created yet</p>
                <Button className="mt-4" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Tournament
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Entry Fee</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament: any) => {
                    const teamCount = tournament.tournament_teams?.length || 0;
                    const paidTeams = tournament.tournament_teams?.filter(
                      (t: any) => t.payment_status === "paid"
                    ).length || 0;

                    return (
                      <TableRow key={tournament.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tournament.name}</p>
                            <p className="text-xs text-muted-foreground">{tournament.sport}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tournament.turfs ? (
                            <div className="text-sm">
                              <p>{tournament.turfs.name}</p>
                              <p className="text-muted-foreground">{tournament.turfs.city}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(tournament.start_datetime), "MMM d")} -{" "}
                          {format(new Date(tournament.end_datetime), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {tournament.entry_fee?.toLocaleString() || "Free"}
                          </div>
                          {tournament.allow_part_payment && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Part payment allowed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tournament.registration_open ? "default" : "secondary"}>
                            {tournament.registration_open ? "Open" : "Closed"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingTeamsFor(tournament)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            {teamCount} ({paidTeams} paid)
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSchedulingMatchesFor(tournament)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            {tournament.tournament_matches?.length || 0}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[tournament.status]}>
                            {tournament.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(tournament.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingTournament(tournament)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingTournament} onOpenChange={() => setDeletingTournament(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingTournament?.name}"? This action cannot be undone and will remove all associated teams and registrations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}