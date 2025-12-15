import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Target, Users2, Swords, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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

interface PlayerStat {
  player: { id: string; name: string | null; profile_photo_url: string | null };
  count: number;
}

function ExpandableStatCard({
  title,
  icon,
  iconColor,
  topPlayer,
  allPlayers,
  statLabel,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  topPlayer: PlayerStat | null;
  allPlayers: PlayerStat[];
  statLabel: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="text-center">
      <CardHeader 
        className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
        onClick={() => allPlayers.length > 0 && setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
          {icon}
          {title}
          {allPlayers.length > 0 && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isExpanded ? (
          topPlayer ? (
            <Link to={`/players/${topPlayer.player.id}`} className="block hover:opacity-80 transition-opacity">
              <Avatar className={cn("h-16 w-16 mx-auto mb-2 ring-2", iconColor)}>
                <AvatarImage src={topPlayer.player.profile_photo_url || undefined} />
                <AvatarFallback>{topPlayer.player.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <p className="font-semibold truncate">{topPlayer.player.name || "Unknown"}</p>
              <p className="text-lg font-bold text-primary">{topPlayer.count} {statLabel}</p>
            </Link>
          ) : (
            <div className="py-4">
              <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                {icon}
              </div>
              <p className="text-sm text-muted-foreground">TBD</p>
            </div>
          )
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allPlayers.map((player, index) => (
              <Link
                key={player.player.id}
                to={`/players/${player.player.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className={cn(
                  "text-sm font-bold w-6 text-center",
                  index === 0 && "text-yellow-500",
                  index === 1 && "text-gray-400",
                  index === 2 && "text-amber-600"
                )}>
                  {index + 1}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.player.profile_photo_url || undefined} />
                  <AvatarFallback>{player.player.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <span className="flex-1 font-medium truncate text-left text-sm">
                  {player.player.name || "Unknown"}
                </span>
                <span className="font-bold text-primary text-sm">
                  {player.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  const scorerMap = new Map<string, PlayerStat>();
  matchEvents?.forEach((event: any) => {
    if (event.scorer_user_id && event.scorer) {
      const existing = scorerMap.get(event.scorer_user_id);
      if (existing) {
        existing.count += 1;
      } else {
        scorerMap.set(event.scorer_user_id, { player: event.scorer, count: 1 });
      }
    }
  });
  const topScorers = Array.from(scorerMap.values())
    .sort((a, b) => b.count - a.count);

  // Calculate top assisters
  const assisterMap = new Map<string, PlayerStat>();
  matchEvents?.forEach((event: any) => {
    if (event.assist_user_id && event.assister) {
      const existing = assisterMap.get(event.assist_user_id);
      if (existing) {
        existing.count += 1;
      } else {
        assisterMap.set(event.assist_user_id, { player: event.assister, count: 1 });
      }
    }
  });
  const topAssisters = Array.from(assisterMap.values())
    .sort((a, b) => b.count - a.count);

  // Always show stats section with placeholders

  return (
    <div className="space-y-6">
      {/* Award Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ExpandableStatCard
          title="Top Goal Scorer"
          icon={<Target className="h-4 w-4 text-yellow-500" />}
          iconColor="ring-yellow-500/50"
          topPlayer={topScorers[0] || null}
          allPlayers={topScorers}
          statLabel="goals"
        />

        <ExpandableStatCard
          title="Top Assists"
          icon={<Users2 className="h-4 w-4 text-green-500" />}
          iconColor="ring-green-500/50"
          topPlayer={topAssisters[0] || null}
          allPlayers={topAssisters}
          statLabel="assists"
        />

        {/* Most POTM - Placeholder for now */}
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

        {/* Player of the Tournament - Placeholder for now */}
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
