import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  User, Settings, Trophy, Target, TrendingUp, Calendar, 
  MapPin, ChevronRight, Zap, BarChart3, Building, MessageSquare
} from "lucide-react";
import { calculateWinsLosses } from "@/lib/playerStats";

export default function MyProfilePage() {
  const { user, profile } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["my-profile-stats", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, wins: 0, losses: 0 };
      const { data: matchData } = await supabase
        .from("match_players")
        .select(`team, matches!inner(status, team_a_score, team_b_score)`)
        .eq("user_id", user.id)
        .eq("join_status", "confirmed")
        .eq("matches.status", "completed");

      const completed = matchData || [];
      const { wins, losses } = calculateWinsLosses(completed);
      return { total: completed.length, wins, losses };
    },
    enabled: !!user,
  });

  const { data: upcomingMatches } = useQuery({
    queryKey: ["my-upcoming-matches-profile", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("match_players")
        .select(`match_id, matches(*, turfs(name, city))`)
        .eq("user_id", user.id)
        .eq("join_status", "confirmed")
        .gte("matches.match_date", new Date().toISOString().split("T")[0])
        .limit(3);
      return data?.filter(mp => mp.matches) || [];
    },
    enabled: !!user,
  });

  const moreLinks = [
    { icon: Building, label: "Browse Turfs", href: "/turfs" },
    { icon: Zap, label: "Improve Skills", href: "/improve/football" },
    { icon: Trophy, label: "Tournaments", href: "/tournaments" },
    { icon: MessageSquare, label: "Messages", href: "/messages" },
    { icon: Settings, label: "Edit Profile", href: "/profile" },
  ];

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.profile_photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {profile?.name?.charAt(0) || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{profile?.name || "Player"}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {profile?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.city}
                    </span>
                  )}
                  {profile?.position && (
                    <Badge variant="secondary" className="text-xs">{profile.position}</Badge>
                  )}
                </div>
              </div>
              <Link to="/profile">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-accent" />
              <p className="text-xl font-bold">{stats?.wins || 0}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">
                {stats?.total ? Math.round((stats.wins / stats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Matches */}
        {upcomingMatches && upcomingMatches.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Upcoming Matches</h3>
            <div className="space-y-2">
              {upcomingMatches.map((mp: any) => (
                <Link key={mp.match_id} to={`/matches/${mp.match_id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{mp.matches.match_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(mp.matches.match_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* More Links */}
        <div>
          <h3 className="font-semibold mb-3">More</h3>
          <Card>
            <CardContent className="p-0">
              {moreLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm">{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
