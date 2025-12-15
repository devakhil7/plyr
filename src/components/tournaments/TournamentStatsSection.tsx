import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Target, Users2, Swords } from "lucide-react";
import { Link } from "react-router-dom";

interface TournamentStatsSectionProps {
  tournamentId: string;
  tournamentMatches: Array<{
    match_id: string;
    matches: {
      id: string;
      team_a_score: number | null;
      team_b_score: number | null;
      status: string | null;
    } | null;
  }>;
}

export function TournamentStatsSection({ tournamentId, tournamentMatches }: TournamentStatsSectionProps) {
  const matchIds = tournamentMatches
    .filter((tm) => tm.matches)
    .map((tm) => tm.match_id);

  // Fetch match events (goals/assists) for tournament matches
  const { data: matchEvents } = useQuery({
    queryKey: ["tournament-match-events", tournamentId],
    queryFn: async () => {
      if (matchIds.length === 0) return [];
      
      const { data } = await supabase
        .from("match_events")
        .select(`
          id,
          match_id,
          team,
          minute,
          scorer_user_id,
          assist_user_id,
          scorer:scorer_user_id (id, name, profile_photo_url),
          assister:assist_user_id (id, name, profile_photo_url)
        `)
        .in("match_id", matchIds);
      
      return data || [];
    },
    enabled: matchIds.length > 0,
  });

  // Calculate stats
  const completedMatches = tournamentMatches.filter(
    (tm) => tm.matches?.status === "completed"
  );

  const totalGoals = completedMatches.reduce((sum, tm) => {
    const scoreA = tm.matches?.team_a_score || 0;
    const scoreB = tm.matches?.team_b_score || 0;
    return sum + scoreA + scoreB;
  }, 0);

  // Calculate top scorers
  const scorerMap = new Map<string, { player: any; goals: number }>();
  matchEvents?.forEach((event: any) => {
    if (event.scorer_user_id && event.scorer) {
      const existing = scorerMap.get(event.scorer_user_id);
      if (existing) {
        existing.goals += 1;
      } else {
        scorerMap.set(event.scorer_user_id, { player: event.scorer, goals: 1 });
      }
    }
  });
  const topScorers = Array.from(scorerMap.values())
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  // Calculate top assisters
  const assisterMap = new Map<string, { player: any; assists: number }>();
  matchEvents?.forEach((event: any) => {
    if (event.assist_user_id && event.assister) {
      const existing = assisterMap.get(event.assist_user_id);
      if (existing) {
        existing.assists += 1;
      } else {
        assisterMap.set(event.assist_user_id, { player: event.assister, assists: 1 });
      }
    }
  });
  const topAssisters = Array.from(assisterMap.values())
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 5);

  // Always show stats section with placeholders

  // Get top scorer
  const topScorer = topScorers[0] || null;
  
  // Get top assister
  const topAssister = topAssisters[0] || null;

  return (
    <div className="space-y-6">
      {/* Award Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Top Goal Scorer */}
        <Card className="text-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              Top Goal Scorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topScorer ? (
              <Link to={`/players/${topScorer.player.id}`} className="block hover:opacity-80 transition-opacity">
                <Avatar className="h-16 w-16 mx-auto mb-2 ring-2 ring-yellow-500/50">
                  <AvatarImage src={topScorer.player.profile_photo_url} />
                  <AvatarFallback>{topScorer.player.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <p className="font-semibold truncate">{topScorer.player.name || "Unknown"}</p>
                <p className="text-lg font-bold text-primary">{topScorer.goals} goals</p>
              </Link>
            ) : (
              <div className="py-4">
                <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                  <Target className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">TBD</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Assists */}
        <Card className="text-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Users2 className="h-4 w-4 text-green-500" />
              Top Assists
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAssister ? (
              <Link to={`/players/${topAssister.player.id}`} className="block hover:opacity-80 transition-opacity">
                <Avatar className="h-16 w-16 mx-auto mb-2 ring-2 ring-green-500/50">
                  <AvatarImage src={topAssister.player.profile_photo_url} />
                  <AvatarFallback>{topAssister.player.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <p className="font-semibold truncate">{topAssister.player.name || "Unknown"}</p>
                <p className="text-lg font-bold text-primary">{topAssister.assists} assists</p>
              </Link>
            ) : (
              <div className="py-4">
                <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                  <Users2 className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">TBD</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most POTM */}
        <Card className="text-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Swords className="h-4 w-4 text-orange-500" />
              Most POTM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-4">
              <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                <Swords className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">TBD</p>
            </div>
          </CardContent>
        </Card>

        {/* Player of the Tournament */}
        <Card className="text-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Player of Tournament
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-4">
              <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">TBD</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournament Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Swords className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{completedMatches.length}</p>
              <p className="text-sm text-muted-foreground">Matches Played</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalGoals}</p>
              <p className="text-sm text-muted-foreground">Total Goals</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {completedMatches.length > 0 ? (totalGoals / completedMatches.length).toFixed(1) : "0"}
              </p>
              <p className="text-sm text-muted-foreground">Goals per Match</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
