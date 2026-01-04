import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Share2, Copy, Trophy, Star, Target, MessageCircle, Instagram, Link, Youtube, Rss, Send, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { shareToWhatsApp, shareToInstagram, shareToYouTube } from "@/lib/shareUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  assist_player_id?: string | null;
  assist_player_name?: string | null;
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

  const playerStats: Map<string, PlayerStats> = new Map();

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

  let maxGoals = 0;
  let maxAssists = 0;
  let maxRating = 0;

  playerStats.forEach((stats) => {
    if (stats.goals > maxGoals) maxGoals = stats.goals;
    if (stats.assists > maxAssists) maxAssists = stats.assists;
    if (stats.avgRating > maxRating) maxRating = stats.avgRating;
  });

  playerStats.forEach((stats) => {
    const goalScore = maxGoals > 0 ? (stats.goals / maxGoals) * 50 : 0;
    const assistScore = maxAssists > 0 ? (stats.assists / maxAssists) * 30 : 0;
    const ratingScore = maxRating > 0 ? (stats.avgRating / maxRating) * 20 : 0;
    stats.motmScore = goalScore + assistScore + ratingScore;
  });

  let motm: PlayerStats | null = null;
  playerStats.forEach((stats) => {
    if (!motm || stats.motmScore > motm.motmScore) {
      motm = stats;
    }
  });

  if (motm && motm.motmScore === 0) {
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

function getTopAssists(matchEvents: MatchEvent[], videoEvents?: VideoEvent[]): { name: string; assists: number }[] {
  const assistMap: Map<string, { name: string; assists: number }> = new Map();

  // Check video events for assists first
  const videoGoals = videoEvents?.filter(e => e.event_type === "goal" && e.assist_player_name) || [];
  
  if (videoGoals.length > 0) {
    videoGoals.forEach((event) => {
      if (event.assist_player_name) {
        const assistName = event.assist_player_name;
        const assistId = event.assist_player_id || assistName;
        if (!assistMap.has(assistId)) {
          assistMap.set(assistId, { name: assistName, assists: 0 });
        }
        assistMap.get(assistId)!.assists += 1;
      }
    });
  } else {
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
  }

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scorecardRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [caption, setCaption] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dmMessage, setDmMessage] = useState("");

  const motm = calculateMOTM(players, matchEvents, playerRatings);
  const topScorers = getTopScorers(matchEvents, videoEvents);
  const topAssists = getTopAssists(matchEvents, videoEvents);

  const winningTeam =
    teamAScore > teamBScore ? "Team A" : teamBScore > teamAScore ? "Team B" : "Draw";

  const matchUrl = `${window.location.origin}/matches/${matchId}`;

  // Search users for DM
  const { data: users, isLoading: isSearching } = useQuery({
    queryKey: ["users-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url")
        .ilike("name", `%${searchQuery}%`)
        .neq("id", user?.id || "")
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(matchUrl);
    toast.success("Match link copied to clipboard!");
  };

  const defaultCaption = `⚽ ${matchName} - Final Score: ${teamAScore} - ${teamBScore}${motm ? ` | MOTM: ${motm.name}` : ""}${topScorers.length > 0 ? `\n🔥 Top Scorer: ${topScorers[0].name} (${topScorers[0].goals} goals)` : ""}`;

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");

      const finalCaption = caption || defaultCaption;

      const { error } = await supabase.from("feed_posts").insert([{
        user_id: user.id,
        caption: finalCaption,
        match_id: matchId,
        post_type: "stat" as const,
        highlight_type: "match",
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Posted to feed!");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      setCaption("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create post");
    },
  });

  // Send DM mutation
  const sendDMMutation = useMutation({
    mutationFn: async () => {
      if (!user || selectedUsers.length === 0)
        throw new Error("Missing data");

      const message = dmMessage || `Check out this match scorecard: ${matchUrl}`;

      for (const recipientId of selectedUsers) {
        const { data: existingConvo } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        let conversationId: string | null = null;

        if (existingConvo && existingConvo.length > 0) {
          for (const convo of existingConvo) {
            const { data: participant } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("conversation_id", convo.conversation_id)
              .eq("user_id", recipientId)
              .maybeSingle();

            if (participant) {
              conversationId = convo.conversation_id;
              break;
            }
          }
        }

        if (!conversationId) {
          const { data: newConvo, error: convoError } = await supabase
            .from("conversations")
            .insert({ created_by: user.id })
            .select("id")
            .single();

          if (convoError) throw convoError;
          conversationId = newConvo.id;

          await supabase.from("conversation_participants").insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: recipientId },
          ]);
        }

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message,
          message_type: "text",
        });
      }
    },
    onSuccess: () => {
      toast.success(`Sent to ${selectedUsers.length} user(s)!`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedUsers([]);
      setDmMessage("");
      setSearchQuery("");
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-white border-white/50 hover:bg-white/10 hover:text-white">
          <Share2 className="h-4 w-4 mr-2" />
          Share Scorecard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Scorecard</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
            <TabsTrigger value="feed" className="gap-1 text-xs">
              <Rss className="h-3 w-3" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="dm" className="gap-1 text-xs">
              <Send className="h-3 w-3" />
              DM
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1 text-xs">
              <Link className="h-3 w-3" />
              Share
            </TabsTrigger>
          </TabsList>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-3 pt-3">
            <div
              ref={scorecardRef}
              className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-xl p-4 border"
            >
              {/* Header */}
              <div className="text-center mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  SPORTIQ Match Report
                </p>
                <h3 className="font-bold text-base mt-1">{matchName}</h3>
                <p className="text-xs text-muted-foreground">
                  {matchDate} {turfName && `• ${turfName}`}
                </p>
              </div>

              {/* Score */}
              <Card className="bg-card/80 backdrop-blur mb-3">
                <CardContent className="p-3">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{teamAScore}</p>
                      <p className="text-[10px] text-muted-foreground">Team A</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg text-muted-foreground">-</span>
                      {winningTeam !== "Draw" && (
                        <Badge variant="default" className="mt-1 text-[9px]">
                          {winningTeam} Wins
                        </Badge>
                      )}
                      {winningTeam === "Draw" && (
                        <Badge variant="secondary" className="mt-1 text-[9px]">
                          Draw
                        </Badge>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{teamBScore}</p>
                      <p className="text-[10px] text-muted-foreground">Team B</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MOTM */}
              {motm && motm.motmScore > 0 && (
                <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30 mb-3">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center overflow-hidden">
                        {motm.profilePhoto ? (
                          <img
                            src={motm.profilePhoto}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Star className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          ⭐ Man of the Match
                        </p>
                        <p className="font-bold text-sm">{motm.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {motm.avgRating > 0 && `${motm.avgRating.toFixed(1)}★`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-500/50 text-[10px]">
                        Team {motm.team}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Goals & Assists */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="bg-card/60">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Trophy className="h-3 w-3 text-primary" />
                      <p className="text-[10px] font-medium">Top Scorers</p>
                    </div>
                    {topScorers.length > 0 ? (
                      <div className="space-y-0.5">
                        {topScorers.map((s, i) => (
                          <div key={i} className="flex justify-between text-[10px]">
                            <span className="truncate flex-1">{s.name}</span>
                            <span className="font-medium">{s.goals}⚽</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No goals</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="h-3 w-3 text-accent" />
                      <p className="text-[10px] font-medium">Top Assists</p>
                    </div>
                    {topAssists.length > 0 ? (
                      <div className="space-y-0.5">
                        {topAssists.map((a, i) => (
                          <div key={i} className="flex justify-between text-[10px]">
                            <span className="truncate flex-1">{a.name}</span>
                            <span className="font-medium">{a.assists}🎯</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No assists</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-border/50 text-center">
                <p className="text-[9px] text-muted-foreground">
                  Generated by SPORTIQ • sportiq.app
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Feed Tab */}
          <TabsContent value="feed" className="space-y-4 pt-4">
            {user ? (
              <>
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Textarea
                    placeholder={defaultCaption}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createPostMutation.mutate()}
                  disabled={createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Rss className="h-4 w-4 mr-2" />
                      Post to Feed
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Please log in to post to your feed.
                </p>
              </div>
            )}
          </TabsContent>

          {/* DM Tab */}
          <TabsContent value="dm" className="space-y-4 pt-4">
            {user ? (
              <>
                <div className="space-y-2">
                  <Label>Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users && users.length > 0 ? (
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-2">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => toggleUserSelection(u.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedUsers.includes(u.id)
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.profile_photo_url || undefined} />
                            <AvatarFallback>
                              {u.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-left text-sm font-medium">
                            {u.name}
                          </span>
                          {selectedUsers.includes(u.id) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : searchQuery.length >= 2 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                ) : null}

                {selectedUsers.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Message (optional)</Label>
                      <Textarea
                        placeholder="Add a message..."
                        value={dmMessage}
                        onChange={(e) => setDmMessage(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => sendDMMutation.mutate()}
                      disabled={sendDMMutation.isPending}
                    >
                      {sendDMMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {selectedUsers.length} user(s)
                        </>
                      )}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Please log in to send messages.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Link/Share Tab */}
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => {
                  const text = `${matchName} - Final Score: ${teamAScore} - ${teamBScore}${motm ? ` | MOTM: ${motm.name}` : ""}`;
                  shareToWhatsApp({ title: matchName, text, url: matchUrl });
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
                  const text = `${matchName} - Final Score: ${teamAScore} - ${teamBScore}${motm ? ` | MOTM: ${motm.name}` : ""}`;
                  shareToInstagram({ title: matchName, text, url: matchUrl });
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
                  const text = `${matchName} - Final Score: ${teamAScore} - ${teamBScore}${motm ? ` | MOTM: ${motm.name}` : ""}`;
                  shareToYouTube({ title: matchName, text, url: matchUrl });
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
                value={matchUrl}
                readOnly
                className="flex-1 bg-transparent text-xs text-muted-foreground outline-none truncate"
              />
              <Button size="sm" variant="ghost" onClick={handleCopyLink}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
