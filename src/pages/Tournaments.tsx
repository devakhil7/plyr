import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Calendar, MapPin, Users, IndianRupee, ArrowRight, UserPlus } from "lucide-react";
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
    upcoming: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    live: "bg-green-500/10 text-green-600 border-green-500/20",
    completed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
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
    // Store the tournament ID in session storage to redirect after login
    if (pendingTournamentId) {
      sessionStorage.setItem("redirectAfterAuth", `/tournaments/${pendingTournamentId}/register`);
    }
    navigate("/auth");
  };

  return (
    <Layout>
      <div className="container-app py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Tournaments
            </h1>
            <p className="text-muted-foreground">
              Compete in organized sports events and win prizes
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <CreateTournamentDialog />
              <Link to="/admin/tournaments">
                <Button variant="outline">
                  Manage Tournaments
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["upcoming", "live", "completed", "all"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* Tournaments List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No tournaments found</h3>
              <p className="text-muted-foreground">
                {statusFilter === "upcoming"
                  ? "Check back later for upcoming tournaments"
                  : "No tournaments match your filter criteria"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament: any) => (
              <Card key={tournament.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Cover Image */}
                <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                  {tournament.cover_image_url ? (
                    <img
                      src={tournament.cover_image_url}
                      alt={tournament.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <Badge className={`absolute top-3 right-3 ${statusColors[tournament.status]}`}>
                    {tournament.status}
                  </Badge>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{tournament.name}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(tournament.start_datetime), "MMM d")} -{" "}
                      {format(new Date(tournament.end_datetime), "MMM d, yyyy")}
                    </span>
                  </div>

                  {tournament.turfs && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{tournament.turfs.name}, {tournament.turfs.city}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{tournament.tournament_teams?.length || 0} teams requested</span>
                    </div>
                    {tournament.entry_fee > 0 && (
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <span>₹{tournament.entry_fee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {tournament.prize_details && (
                    <p className="text-sm text-green-600 font-medium">
                      🏆 {tournament.prize_details}
                    </p>
                  )}

                  <div className="flex gap-2 mt-2">
                    {tournament.status === "upcoming" && tournament.registration_open && (() => {
                      const userTeam = getUserTeam(tournament);
                      if (userTeam) {
                        return (
                          <Link to={`/tournaments/${tournament.id}/register/roster?team=${userTeam.id}`} className="flex-1">
                            <Button className="w-full">
                              <Users className="h-4 w-4 mr-2" />
                              Manage Roster
                            </Button>
                          </Link>
                        );
                      }
                      return (
                        <Button 
                          className="flex-1" 
                          onClick={() => handleRegisterClick(tournament.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Register Team
                        </Button>
                      );
                    })()}
                    <Link to={`/tournaments/${tournament.id}`} className={tournament.status === "upcoming" && tournament.registration_open ? "" : "flex-1"}>
                      <Button variant="outline" className="w-full">
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2" />
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
        <DialogContent className="sm:max-w-md">
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
            <Button onClick={handleLoginRedirect}>
              Login / Sign Up
            </Button>
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
