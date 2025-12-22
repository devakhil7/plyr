import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Calendar, MapPin, Users, IndianRupee, ArrowRight, UserPlus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useUserRoles } from "@/hooks/useUserRoles";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Tournaments() {
  const [statusFilter, setStatusFilter] = useState<string>("upcoming");
  const { isAdmin } = useUserRoles();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [pendingTournamentId, setPendingTournamentId] = useState<string | null>(null);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("tournaments")
        .select(`
          *,
          turfs (name, city, location),
          tournament_teams (id, captain_user_id)
        `)
        .order("start_datetime", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Helper to find user's team in a tournament
  const getUserTeam = (tournament: any) => {
    if (!user) return null;
    return tournament.tournament_teams?.find((t: any) => t.captain_user_id === user.id);
  };

  const statusColors: Record<string, string> = {
    upcoming: "bg-accent/15 text-accent border-accent/30",
    live: "bg-green-500/15 text-green-600 border-green-500/30",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const handleRegisterClick = (tournamentId: string) => {
    if (!user) {
      setPendingTournamentId(tournamentId);
      setLoginDialogOpen(true);
    } else {
      navigate(`/tournaments/${tournamentId}/register`);
    }
  };

  const handleLoginRedirect = () => {
    if (pendingTournamentId) {
      sessionStorage.setItem("redirectAfterAuth", `/tournaments/${pendingTournamentId}/register`);
    }
    navigate("/auth");
  };

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-4">
        {/* Header */}
        <div className="hero-gradient -mx-4 px-4 py-6 rounded-b-3xl mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Tournaments</h1>
                <p className="text-sm text-primary-foreground/70">Compete & win prizes</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <CreateTournamentDialog />
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["upcoming", "live", "completed", "all"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "btn-glow" : ""}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* Tournaments List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card animate-pulse">
                <CardContent className="p-4">
                  <div className="h-32 bg-muted rounded-lg mb-3" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No tournaments found</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === "upcoming"
                  ? "Check back later for upcoming tournaments"
                  : "No tournaments match your filter"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((tournament: any) => (
              <Card key={tournament.id} className="glass-card overflow-hidden hover:shadow-lg transition-all">
                {/* Cover Image */}
                <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 relative">
                  {tournament.cover_image_url ? (
                    <img
                      src={tournament.cover_image_url}
                      alt={tournament.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="h-12 w-12 text-primary/30" />
                    </div>
                  )}
                  <Badge className={`absolute top-2 right-2 text-xs ${statusColors[tournament.status]}`}>
                    {tournament.status}
                  </Badge>
                </div>

                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold line-clamp-1">{tournament.name}</h3>
                  
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(tournament.start_datetime), "MMM d")} - {format(new Date(tournament.end_datetime), "MMM d")}
                      </span>
                    </div>

                    {tournament.turfs && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{tournament.turfs.name}, {tournament.turfs.city}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{tournament.tournament_teams?.length || 0} teams</span>
                      </div>
                      {tournament.entry_fee > 0 && (
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <IndianRupee className="h-3.5 w-3.5" />
                          <span>{tournament.entry_fee.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {tournament.prize_details && (
                    <p className="text-xs text-accent font-medium bg-accent/10 px-2 py-1 rounded-full inline-block">
                      🏆 {tournament.prize_details}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    {tournament.status === "upcoming" && tournament.registration_open && (() => {
                      const userTeam = getUserTeam(tournament);
                      if (userTeam) {
                        return (
                          <Link to={`/tournaments/${tournament.id}/register/roster?team=${userTeam.id}`} className="flex-1">
                            <Button className="w-full" size="sm">
                              <Users className="h-3.5 w-3.5 mr-1" />
                              Manage Roster
                            </Button>
                          </Link>
                        );
                      }
                      return (
                        <Button 
                          className="flex-1 btn-glow" 
                          size="sm"
                          onClick={() => handleRegisterClick(tournament.id)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Register
                        </Button>
                      );
                    })()}
                    <Link to={`/tournaments/${tournament.id}`} className={tournament.status === "upcoming" && tournament.registration_open ? "" : "flex-1"}>
                      <Button variant="outline" size="sm" className="w-full">
                        Details
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Login Required
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to register your team for this tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={handleLoginRedirect} className="btn-glow">
              Login / Sign Up
            </Button>
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
