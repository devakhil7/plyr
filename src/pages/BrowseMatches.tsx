import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Plus } from "lucide-react";
import { MatchCard } from "@/components/match/MatchCard";

export default function BrowseMatches() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["all-matches", cityFilter, statusFilter],
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
        .eq("visibility", "public" as const)
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true });

      // Exclude tournament matches
      if (tournamentMatchIds.length > 0) {
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
    <Layout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Browse Matches</h1>
            <p className="text-muted-foreground">Find and join games near you</p>
          </div>
          {user && (
            <Link to="/host-match">
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Host a Match
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search matches or turfs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-40">
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
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Matches Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMatches && filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match: any) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No matches found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or host your own match!</p>
            {user && (
              <Link to="/host-match">
                <Button>Host a Match</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
