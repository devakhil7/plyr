import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Copy, Trophy, Star, Target, MessageCircle, Instagram, Link } from "lucide-react";
import { toast } from "sonner";

interface MatchEvent {
  id: string;
  team: string;
  scorer_user_id: string;
  assist_user_id: string | null;
  minute: number | null;
  scorer?: { id: string; name: string };
  assist?: { id: string; name: string } | null;
}

interface VideoEvent {
  id: string;
  event_type: string;
  team: string;
  player_id: string | null;
  player_name: string | null;
}

interface PlayerRating {
  rated_user_id: string;
  rating: number;
}

interface Player {
  user_id: string;
  team: string;
  profiles: {
    id: string;
    name: string;
    profile_photo_url?: string;
  };
}

interface MatchScorecardProps {
  matchId: string;
  matchName: string;
  matchDate: string;
  turfName?: string;
  teamAScore: number;
  teamBScore: number;
  matchEvents: MatchEvent[];
  videoEvents?: VideoEvent[];
  players: Player[];
  playerRatings: PlayerRating[];
}

interface PlayerStats {
  id: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
  avgRating: number;
  motmScore: number;
  profilePhoto?: string;
}

function calculateMOTM(
  players: Player[],
  matchEvents: MatchEvent[],
  playerRatings: PlayerRating[]
): PlayerStats | null {
  if (players.length === 0) return null;

  // Calculate stats for each player
  const playerStats: Map<string, PlayerStats> = new Map();

  // Initialize all players
  players.forEach((p) => {
    if (p.user_id) {
      playerStats.set(p.user_id, {
        id: p.user_id,
        name: p.profiles?.name || "Unknown",
        team: p.team,
        goals: 0,
        assists: 0,
        avgRating: 0,
        motmScore: 0,
        profilePhoto: p.profiles?.profile_photo_url,
      });
    }
  });

  // Count goals
  matchEvents.forEach((event) => {
    if (event.scorer_user_id && playerStats.has(event.scorer_user_id)) {
      const stats = playerStats.get(event.scorer_user_id)!;
      stats.goals += 1;
    }
    if (event.assist_user_id && playerStats.has(event.assist_user_id)) {
      const stats = playerStats.get(event.assist_user_id)!;
      stats.assists += 1;
    }
  });

  // Calculate average ratings
  const ratingsByPlayer: Map<string, number[]> = new Map();
  playerRatings.forEach((r) => {
    if (!ratingsByPlayer.has(r.rated_user_id)) {
      ratingsByPlayer.set(r.rated_user_id, []);
    }
    ratingsByPlayer.get(r.rated_user_id)!.push(r.rating);
  });

  ratingsByPlayer.forEach((ratings, playerId) => {
    if (playerStats.has(playerId)) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      playerStats.get(playerId)!.avgRating = avg;
    }
  });

  // Find max values for normalization
  let maxGoals = 0;
  let maxAssists = 0;
  let maxRating = 0;

  playerStats.forEach((stats) => {
    if (stats.goals > maxGoals) maxGoals = stats.goals;
    if (stats.assists > maxAssists) maxAssists = stats.assists;
    if (stats.avgRating > maxRating) maxRating = stats.avgRating;
  });

  // Calculate MOTM score: goals (50%), assists (30%), rating (20%)
  playerStats.forEach((stats) => {
    const goalScore = maxGoals > 0 ? (stats.goals / maxGoals) * 50 : 0;
    const assistScore = maxAssists > 0 ? (stats.assists / maxAssists) * 30 : 0;
    const ratingScore = maxRating > 0 ? (stats.avgRating / maxRating) * 20 : 0;
    stats.motmScore = goalScore + assistScore + ratingScore;
  });

  // Find player with highest MOTM score
  let motm: PlayerStats | null = null;
  playerStats.forEach((stats) => {
    if (!motm || stats.motmScore > motm.motmScore) {
      motm = stats;
    }
  });

  // Only return MOTM if they have some contribution
  if (motm && motm.motmScore === 0) {
    // If no one has any stats, pick the highest rated player
    playerStats.forEach((stats) => {
      if (stats.avgRating > 0 && (!motm || stats.avgRating > motm.avgRating)) {
        motm = stats;
      }
    });
  }

  return motm;
}

function getTopScorers(matchEvents: MatchEvent[], videoEvents?: VideoEvent[]): { name: string; goals: number }[] {
  const scorerMap: Map<string, { name: string; goals: number }> = new Map();

  // Prioritize video events (match key events) if available
  const videoGoals = videoEvents?.filter(e => e.event_type === "goal") || [];
  
  if (videoGoals.length > 0) {
    videoGoals.forEach((event) => {
      const scorerName = event.player_name || "Unknown";
      const scorerId = event.player_id || scorerName;
      if (scorerId) {
        if (!scorerMap.has(scorerId)) {
          scorerMap.set(scorerId, { name: scorerName, goals: 0 });
        }
        scorerMap.get(scorerId)!.goals += 1;
      }
    });
  } else {
    // Fallback to match events
    matchEvents.forEach((event) => {
      const scorerName = event.scorer?.name || "Unknown";
      const scorerId = event.scorer_user_id;
      if (scorerId) {
        if (!scorerMap.has(scorerId)) {
          scorerMap.set(scorerId, { name: scorerName, goals: 0 });
        }
        scorerMap.get(scorerId)!.goals += 1;
      }
    });
  }

  return Array.from(scorerMap.values())
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
}

function getTopAssists(matchEvents: MatchEvent[]): { name: string; assists: number }[] {
  const assistMap: Map<string, { name: string; assists: number }> = new Map();

  matchEvents.forEach((event) => {
    if (event.assist_user_id && event.assist?.name) {
      const assistName = event.assist.name;
      const assistId = event.assist_user_id;
      if (!assistMap.has(assistId)) {
        assistMap.set(assistId, { name: assistName, assists: 0 });
      }
      assistMap.get(assistId)!.assists += 1;
    }
  });

  return Array.from(assistMap.values())
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 3);
}

export function MatchScorecard({
  matchId,
  matchName,
  matchDate,
  turfName,
  teamAScore,
  teamBScore,
  matchEvents,
  videoEvents,
  players,
  playerRatings,
}: MatchScorecardProps) {
  const scorecardRef = useRef<HTMLDivElement>(null);

  const motm = calculateMOTM(players, matchEvents, playerRatings);
  const topScorers = getTopScorers(matchEvents, videoEvents);
  const topAssists = getTopAssists(matchEvents);

  const winningTeam =
    teamAScore > teamBScore ? "Team A" : teamBScore > teamAScore ? "Team B" : "Draw";

  const handleCopyLink = () => {
    const url = `${window.location.origin}/matches/${matchId}`;
    navigator.clipboard.writeText(url);
    toast.success("Match link copied to clipboard!");
  };

  const handleShare = async () => {
    const shareData = {
      title: matchName,
      text: `${matchName} - Final Score: ${teamAScore} - ${teamBScore}${motm ? ` | MOTM: ${motm.name}` : ""}`,
      url: `${window.location.origin}/matches/${matchId}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share Scorecard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Match Scorecard</DialogTitle>
        </DialogHeader>

        {/* Scorecard Preview */}
        <div
          ref={scorecardRef}
          className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-xl p-6 border"
        >
          {/* Header */}
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              SPORTIQ Match Report
            </p>
            <h3 className="font-bold text-lg mt-1">{matchName}</h3>
            <p className="text-sm text-muted-foreground">
              {matchDate} {turfName && `• ${turfName}`}
            </p>
          </div>

          {/* Score */}
          <Card className="bg-card/80 backdrop-blur mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{teamAScore}</p>
                  <p className="text-xs text-muted-foreground">Team A</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl text-muted-foreground">-</span>
                  {winningTeam !== "Draw" && (
                    <Badge variant="default" className="mt-1 text-[10px]">
                      {winningTeam} Wins
                    </Badge>
                  )}
                  {winningTeam === "Draw" && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Draw
                    </Badge>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{teamBScore}</p>
                  <p className="text-xs text-muted-foreground">Team B</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MOTM */}
          {motm && motm.motmScore > 0 && (
            <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center overflow-hidden">
                    {motm.profilePhoto ? (
                      <img
                        src={motm.profilePhoto}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Star className="h-6 w-6 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ⭐ Man of the Match
                    </p>
                    <p className="font-bold">{motm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {motm.goals > 0 && `${motm.goals} goal${motm.goals > 1 ? "s" : ""}`}
                      {motm.goals > 0 && motm.assists > 0 && " • "}
                      {motm.assists > 0 && `${motm.assists} assist${motm.assists > 1 ? "s" : ""}`}
                      {motm.avgRating > 0 && ` • ${motm.avgRating.toFixed(1)}★`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                    Team {motm.team}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goals & Assists */}
          <div className="grid grid-cols-2 gap-3">
            {/* Top Scorers */}
            <Card className="bg-card/60">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-2">
                  <Trophy className="h-3 w-3 text-primary" />
                  <p className="text-xs font-medium">Top Scorers</p>
                </div>
                {topScorers.length > 0 ? (
                  <div className="space-y-1">
                    {topScorers.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="truncate flex-1">{s.name}</span>
                        <span className="font-medium">{s.goals}⚽</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No goals recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Top Assists */}
            <Card className="bg-card/60">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-2">
                  <Target className="h-3 w-3 text-accent" />
                  <p className="text-xs font-medium">Top Assists</p>
                </div>
                {topAssists.length > 0 ? (
                  <div className="space-y-1">
                    {topAssists.map((a, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="truncate flex-1">{a.name}</span>
                        <span className="font-medium">{a.assists}🎯</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No assists recorded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground">
              Generated by SPORTIQ • sportiq.app
            </p>
          </div>
        </div>

        {/* Share Actions */}
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => {
                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `${matchName} - Final Score: ${teamAScore} - ${teamBScore}${motm ? ` | MOTM: ${motm.name}` : ""}\n\n${window.location.origin}/matches/${matchId}`
                )}`;
                window.location.href = whatsappUrl;
              }}
            >
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs">WhatsApp</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={handleShare}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Instagram className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs">Instagram</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={handleCopyLink}
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Link className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xs">Copy Link</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <input
              type="text"
              value={`${window.location.origin}/matches/${matchId}`}
              readOnly
              className="flex-1 bg-transparent text-xs text-muted-foreground outline-none truncate"
            />
            <Button size="sm" variant="ghost" onClick={handleCopyLink}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
