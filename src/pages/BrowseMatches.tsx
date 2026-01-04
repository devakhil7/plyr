import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Plus, Filter, User } from "lucide-react";
import { MatchCard } from "@/components/match/MatchCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BrowseMatches() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [viewMode, setViewMode] = useState<"all" | "my">("all");

  // Fetch user's match IDs for "My Matches" filter
  const { data: myMatchIds } = useQuery({
    queryKey: ["my-match-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get matches user joined
      const { data: joinedMatches } = await supabase
        .from("match_players")
        .select("match_id")
        .eq("user_id", user.id)
        .eq("join_status", "confirmed");
      
      // Get matches user hosted
      const { data: hostedMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("host_id", user.id);
      
      const joinedIds = joinedMatches?.map(m => m.match_id) || [];
      const hostedIds = hostedMatches?.map(m => m.id) || [];
      
      return [...new Set([...joinedIds, ...hostedIds])];
    },
    enabled: !!user?.id,
  });

  const { data: matches, isLoading } = useQuery({
    queryKey: ["all-matches", cityFilter, statusFilter, viewMode, myMatchIds],
    queryFn: async () => {
      // First get all tournament match IDs to exclude
      const { data: tournamentMatches } = await supabase
        .from("tournament_matches")
        .select("match_id");
      
      const tournamentMatchIds = tournamentMatches?.map(tm => tm.match_id) || [];

      let query = supabase
        .from("matches")
        .select(`
          *,
          turfs(name, city, location),
          profiles!matches_host_id_fkey(name),
          match_players(user_id, join_status)
        `)
        .order("match_date", { ascending: statusFilter === "all" || statusFilter === "completed" ? false : true });

      // For "My Matches" view, filter by user's matches and don't require public visibility
      if (viewMode === "my" && myMatchIds && myMatchIds.length > 0) {
        query = query.in("id", myMatchIds);
      } else if (viewMode === "my") {
        // No matches for user, return empty
        return [];
      } else {
        // All matches view - only show public
        query = query.eq("visibility", "public" as const);
      }

      // Only filter to future matches if not showing "all" or "completed"
      if (viewMode !== "my" && statusFilter !== "all" && statusFilter !== "completed") {
        query = query.gte("match_date", new Date().toISOString().split("T")[0]);
      }

      // Exclude tournament matches (only for "all" view)
      if (viewMode !== "my" && tournamentMatchIds.length > 0) {
        query = query.not("id", "in", `(${tournamentMatchIds.join(",")})`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "open" | "full" | "in_progress" | "completed" | "cancelled");
      }

      const { data } = await query;
      return data || [];
    },
  });

  const filteredMatches = matches?.filter((match: any) => {
    const matchesSearch = match.match_name.toLowerCase().includes(search.toLowerCase()) ||
      match.turfs?.name.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === "all" || match.turfs?.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  const cities = [...new Set(matches?.map((m: any) => m.turfs?.city).filter(Boolean))];

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-4">
        {/* Header */}
        <div className="hero-gradient -mx-4 px-4 py-6 rounded-b-3xl mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Browse Matches</h1>
              <p className="text-sm text-primary-foreground/70">Find and join games near you</p>
            </div>
            {user && (
              <Link to="/host-match">
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-1" />
                  Host
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* View Mode Tabs */}
        {user && (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "my")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4 mr-2" />
                All Matches
              </TabsTrigger>
              <TabsTrigger value="my" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-4 w-4 mr-2" />
                My Matches
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search matches or turfs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="flex gap-2">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="flex-1 bg-background/50">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city: any) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 bg-background/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Matches Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-card animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMatches && filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map((match: any) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No matches found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or host your own match!</p>
              {user && (
                <Link to="/host-match">
                  <Button className="btn-glow">
                    <Plus className="h-4 w-4 mr-2" />
                    Host a Match
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
