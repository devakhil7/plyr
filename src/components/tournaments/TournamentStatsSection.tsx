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

  if (completedMatches.length === 0 && (!matchEvents || matchEvents.length === 0)) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          {completedMatches.length > 0 && (
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-lg font-semibold text-primary">
                {(totalGoals / completedMatches.length).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Goals per Match</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Scorers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-yellow-500" />
            Top Scorers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topScorers.length > 0 ? (
            <div className="space-y-3">
              {topScorers.map((scorer, index) => (
                <Link
                  key={scorer.player.id}
                  to={`/players/${scorer.player.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={scorer.player.profile_photo_url} />
                    <AvatarFallback>
                      {scorer.player.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium truncate">
                    {scorer.player.name || "Unknown"}
                  </span>
                  <span className="font-bold text-primary">
                    {scorer.goals} {scorer.goals === 1 ? "goal" : "goals"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No goals recorded yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Assisters */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users2 className="h-5 w-5 text-green-500" />
            Top Assist Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topAssisters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {topAssisters.map((assister, index) => (
                <Link
                  key={assister.player.id}
                  to={`/players/${assister.player.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <span className="text-lg font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={assister.player.profile_photo_url} />
                    <AvatarFallback>
                      {assister.player.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {assister.player.name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assister.assists} {assister.assists === 1 ? "assist" : "assists"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No assists recorded yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
