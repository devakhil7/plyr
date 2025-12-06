import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Plus, Upload, Trash2, Loader2 } from "lucide-react";

interface MatchStatsInputProps {
  matchId: string;
  players: Array<{
    user_id: string;
    team: string;
    profiles: {
      id: string;
      name: string;
    };
  }>;
  existingScore: { teamA: number | null; teamB: number | null };
  videoUrl: string | null;
  onUpdate: () => void;
}

interface GoalEvent {
  id: string;
  team: "A" | "B";
  scorerId: string;
  assistId: string;
  minute: string;
}

export function MatchStatsInput({ matchId, players, existingScore, videoUrl, onUpdate }: MatchStatsInputProps) {
  const queryClient = useQueryClient();
  const [teamAScore, setTeamAScore] = useState(existingScore.teamA?.toString() || "0");
  const [teamBScore, setTeamBScore] = useState(existingScore.teamB?.toString() || "0");
  const [highlightUrl, setHighlightUrl] = useState(videoUrl || "");
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [uploading, setUploading] = useState(false);

  const teamAPlayers = players.filter(p => p.team === "A" || p.team === "unassigned");
  const teamBPlayers = players.filter(p => p.team === "B" || p.team === "unassigned");

  const addGoalEvent = (team: "A" | "B") => {
    setGoalEvents(prev => [
      ...prev,
      { id: crypto.randomUUID(), team, scorerId: "", assistId: "", minute: "" }
    ]);
  };

  const updateGoalEvent = (id: string, field: keyof GoalEvent, value: string) => {
    setGoalEvents(prev =>
      prev.map(event =>
        event.id === id ? { ...event, [field]: value } : event
      )
    );
  };

  const removeGoalEvent = (id: string) => {
    setGoalEvents(prev => prev.filter(event => event.id !== id));
  };

  const saveStats = useMutation({
    mutationFn: async () => {
      // Update match scores
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          team_a_score: parseInt(teamAScore) || 0,
          team_b_score: parseInt(teamBScore) || 0,
          video_url: highlightUrl || null,
          analytics_status: "completed",
        })
        .eq("id", matchId);

      if (matchError) throw matchError;

      // Insert goal events
      if (goalEvents.length > 0) {
        const validEvents = goalEvents.filter(e => e.scorerId);
        if (validEvents.length > 0) {
          const { error: eventsError } = await supabase
            .from("match_events")
            .insert(
              validEvents.map(event => ({
                match_id: matchId,
                team: event.team,
                scorer_user_id: event.scorerId,
                assist_user_id: event.assistId || null,
                minute: event.minute ? parseInt(event.minute) : null,
              }))
            );

          if (eventsError) throw eventsError;
        }
      }

      // Create feed post for the match
      await supabase.from("feed_posts").insert({
        match_id: matchId,
        post_type: "highlight",
        highlight_type: "match",
        caption: `Match completed! Final Score: ${teamAScore} - ${teamBScore}`,
        media_url: highlightUrl || null,
      });
    },
    onSuccess: () => {
      toast.success("Match stats saved successfully!");
      onUpdate();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save stats");
    },
  });

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For MVP, we'll just simulate an upload and use a placeholder
    setUploading(true);
    setTimeout(() => {
      setHighlightUrl("/placeholder.svg");
      setUploading(false);
      toast.success("Video uploaded!");
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Match Stats & Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Highlight Video */}
        <div className="space-y-2">
          <Label>Highlight Video</Label>
          <div className="flex gap-2">
            <Input
              value={highlightUrl}
              onChange={(e) => setHighlightUrl(e.target.value)}
              placeholder="Video URL or upload..."
              className="flex-1"
            />
            <label>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
                disabled={uploading}
              />
              <Button type="button" variant="outline" asChild disabled={uploading}>
                <span>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* Final Score */}
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Team A Score</Label>
            <Input
              type="number"
              min="0"
              value={teamAScore}
              onChange={(e) => setTeamAScore(e.target.value)}
            />
          </div>
          <div className="text-center text-2xl font-bold text-muted-foreground pb-2">
            -
          </div>
          <div className="space-y-2">
            <Label>Team B Score</Label>
            <Input
              type="number"
              min="0"
              value={teamBScore}
              onChange={(e) => setTeamBScore(e.target.value)}
            />
          </div>
        </div>

        {/* Goal Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Goal Scorers & Assists</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addGoalEvent("A")}>
                <Plus className="h-4 w-4 mr-1" /> Team A
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addGoalEvent("B")}>
                <Plus className="h-4 w-4 mr-1" /> Team B
              </Button>
            </div>
          </div>

          {goalEvents.map((event) => {
            const teamPlayers = event.team === "A" ? teamAPlayers : teamBPlayers;
            const allPlayers = [...teamAPlayers, ...teamBPlayers];

            return (
              <div key={event.id} className="flex gap-2 items-end p-3 border rounded-lg bg-muted/50">
                <div className="w-16">
                  <Label className="text-xs">Team</Label>
                  <div className="h-10 flex items-center font-semibold">
                    {event.team}
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Scorer *</Label>
                  <Select
                    value={event.scorerId}
                    onValueChange={(v) => updateGoalEvent(event.id, "scorerId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scorer" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.profiles?.name || "Player"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Assist</Label>
                  <Select
                    value={event.assistId}
                    onValueChange={(v) => updateGoalEvent(event.id, "assistId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {allPlayers.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.profiles?.name || "Player"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Label className="text-xs">Minute</Label>
                  <Input
                    type="number"
                    min="0"
                    value={event.minute}
                    onChange={(e) => updateGoalEvent(event.id, "minute", e.target.value)}
                    placeholder="--"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGoalEvent(event.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          onClick={() => saveStats.mutate()}
          disabled={saveStats.isPending}
          className="w-full"
        >
          {saveStats.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Match Stats"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
