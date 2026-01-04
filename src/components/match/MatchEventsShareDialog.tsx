import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Copy, Trophy, Target, MessageCircle, Instagram, Link, Youtube } from "lucide-react";
import { toast } from "sonner";
import { shareToWhatsApp, shareToInstagram, shareToYouTube, copyLink } from "@/lib/shareUtils";

interface MatchEvent {
  id: string;
  team: string;
  scorer_user_id: string;
  assist_user_id: string | null;
  minute: number | null;
  scorer?: { id: string; name: string };
  assist?: { id: string; name: string } | null;
}

interface MatchEventsShareDialogProps {
  matchId: string;
  matchName: string;
  matchDate: string;
  turfName?: string;
  matchEvents: MatchEvent[];
}

function getTopScorers(matchEvents: MatchEvent[]): { name: string; goals: number }[] {
  const scorerMap: Map<string, { name: string; goals: number }> = new Map();

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

  return Array.from(scorerMap.values())
    .sort((a, b) => b.goals - a.goals);
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
    .sort((a, b) => b.assists - a.assists);
}

export function MatchEventsShareDialog({
  matchId,
  matchName,
  matchDate,
  turfName,
  matchEvents,
}: MatchEventsShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const teamAScore = matchEvents.filter(e => e.team === "A").length;
  const teamBScore = matchEvents.filter(e => e.team === "B").length;
  const topScorers = getTopScorers(matchEvents);
  const topAssists = getTopAssists(matchEvents);

  const winningTeam =
    teamAScore > teamBScore ? "Team A" : teamBScore > teamAScore ? "Team B" : "Draw";

  const handleCopyLink = () => {
    const url = `${window.location.origin}/matches/${matchId}`;
    navigator.clipboard.writeText(url);
    toast.success("Match link copied to clipboard!");
  };

  const generateShareText = () => {
    let text = `⚽ ${matchName}\n📅 ${matchDate}${turfName ? ` • ${turfName}` : ""}\n\n`;
    text += `🏆 Final Score: ${teamAScore} - ${teamBScore}\n\n`;

    if (topScorers.length > 0) {
      text += `⚽ Goal Scorers:\n`;
      topScorers.forEach((s) => {
        text += `• ${s.name} (${s.goals})\n`;
      });
      text += "\n";
    }

    if (topAssists.length > 0) {
      text += `🎯 Assists:\n`;
      topAssists.forEach((a) => {
        text += `• ${a.name} (${a.assists})\n`;
      });
      text += "\n";
    }

    text += `\n🔗 ${window.location.origin}/matches/${matchId}`;
    return text;
  };

  const handleShare = async () => {
    const shareData = {
      title: matchName,
      text: generateShareText(),
      url: `${window.location.origin}/matches/${matchId}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (matchEvents.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-white border-white/50 hover:bg-white/10 hover:text-white">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Match Key Events</DialogTitle>
        </DialogHeader>

        {/* Card Preview */}
        <div
          ref={cardRef}
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

          {/* Timeline of Events */}
          <Card className="bg-card/60 mb-4">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Match Timeline</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {matchEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                  >
                    <Badge variant={event.team === "A" ? "default" : "secondary"} className="text-xs shrink-0">
                      {event.team}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">⚽ {event.scorer?.name || "Unknown"}</span>
                        {event.minute && (
                          <span className="text-xs text-muted-foreground shrink-0">({event.minute}')</span>
                        )}
                      </div>
                      {event.assist?.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          🎯 Assist: {event.assist.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Goals & Assists Summary */}
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
                    {topScorers.slice(0, 3).map((s, i) => (
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
                    {topAssists.slice(0, 3).map((a, i) => (
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
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => {
                const url = `${window.location.origin}/matches/${matchId}`;
                shareToWhatsApp({ title: matchName, text: generateShareText(), url });
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
              onClick={() => {
                const url = `${window.location.origin}/matches/${matchId}`;
                shareToInstagram({ title: matchName, text: generateShareText(), url });
              }}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Instagram className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs">Instagram</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => {
                const url = `${window.location.origin}/matches/${matchId}`;
                shareToYouTube({ title: matchName, text: generateShareText(), url });
              }}
            >
              <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
                <Youtube className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs">YouTube</span>
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
