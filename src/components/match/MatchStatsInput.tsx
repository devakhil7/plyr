import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Plus, Upload, Trash2, Loader2, Edit3, Send, Clock, CheckCircle, AlertCircle } from "lucide-react";

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
  existingEvents?: Array<{
    id: string;
    team: string;
    scorer_user_id: string;
    assist_user_id: string | null;
    minute: number | null;
  }>;
  onUpdate: () => void;
}

interface GoalEvent {
  id: string;
  team: "A" | "B";
  scorerId: string;
  assistId: string;
  minute: string;
  isExisting?: boolean; // Flag to track if this is an existing event from DB
}

export function MatchStatsInput({ matchId, players, existingScore, videoUrl, existingEvents = [], onUpdate }: MatchStatsInputProps) {
  const queryClient = useQueryClient();
  const [highlightUrl, setHighlightUrl] = useState(videoUrl || "");
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [submittingForAnalysis, setSubmittingForAnalysis] = useState(false);

  // Sync highlightUrl when videoUrl prop changes
  useEffect(() => {
    if (videoUrl && videoUrl !== highlightUrl) {
      setHighlightUrl(videoUrl);
    }
  }, [videoUrl]);

  // Fetch existing analysis job for this match
  const { data: analysisJob, refetch: refetchAnalysisJob } = useQuery({
    queryKey: ["match-analysis-job", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_analysis_jobs")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Fetch video events goals to calculate score from analytics
  const { data: videoEventsGoals = [] } = useQuery({
    queryKey: ["match-video-events-goals", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_video_events")
        .select("id, team, event_type")
        .eq("match_id", matchId)
        .eq("event_type", "goal");
      if (error) throw error;
      return data || [];
    },
    enabled: !!matchId,
  });

  // Calculate scores from video events (from admin tagging)
  const videoGoalsTeamA = videoEventsGoals.filter(e => e.team === "A").length;
  const videoGoalsTeamB = videoEventsGoals.filter(e => e.team === "B").length;

  // Derive scores from goal events, fallback to video events, then existing score
  const goalEventsTeamA = goalEvents.filter(e => e.team === "A" && e.scorerId).length;
  const goalEventsTeamB = goalEvents.filter(e => e.team === "B" && e.scorerId).length;
  
  // Priority: goal events > video events from analytics > existing score
  const teamAScore = goalEvents.length > 0 
    ? goalEventsTeamA 
    : videoEventsGoals.length > 0 
      ? videoGoalsTeamA 
      : (existingScore.teamA ?? 0);
  const teamBScore = goalEvents.length > 0 
    ? goalEventsTeamB 
    : videoEventsGoals.length > 0 
      ? videoGoalsTeamB 
      : (existingScore.teamB ?? 0);

  // Initialize goal events from existing data
  useEffect(() => {
    if (!initialized && existingEvents.length > 0) {
      setGoalEvents(
        existingEvents.map((e) => ({
          id: e.id,
          team: e.team as "A" | "B",
          scorerId: e.scorer_user_id,
          assistId: e.assist_user_id || "",
          minute: e.minute?.toString() || "",
          isExisting: true,
        }))
      );
      setInitialized(true);
    }
  }, [existingEvents, initialized]);

  const teamAPlayers = players.filter(p => p.team === "A" || p.team === "unassigned");
  const teamBPlayers = players.filter(p => p.team === "B" || p.team === "unassigned");
  const allPlayers = players;

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
      // Update match scores (derived from goal events)
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          team_a_score: teamAScore,
          team_b_score: teamBScore,
          video_url: highlightUrl || null,
          analytics_status: "completed",
        })
        .eq("id", matchId);

      if (matchError) throw matchError;

      // Delete existing events that are no longer in the list
      const existingIds = goalEvents.filter(e => e.isExisting).map(e => e.id);
      const removedIds = existingEvents.map(e => e.id).filter(id => !existingIds.includes(id));
      
      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("match_events")
          .delete()
          .in("id", removedIds);
        if (deleteError) throw deleteError;
      }

      // Insert new goal events (those without isExisting flag)
      const newEvents = goalEvents.filter(e => !e.isExisting && e.scorerId);
      if (newEvents.length > 0) {
        const { error: eventsError } = await supabase
          .from("match_events")
          .insert(
            newEvents.map(event => ({
              match_id: matchId,
              team: event.team,
              scorer_user_id: event.scorerId,
              assist_user_id: event.assistId || null,
              minute: event.minute ? parseInt(event.minute) : null,
            }))
          );

        if (eventsError) throw eventsError;
      }

      // Update existing events that changed
      const existingToUpdate = goalEvents.filter(e => e.isExisting);
      for (const event of existingToUpdate) {
        const original = existingEvents.find(ex => ex.id === event.id);
        if (original && (
          original.scorer_user_id !== event.scorerId ||
          (original.assist_user_id || "") !== event.assistId ||
          (original.minute?.toString() || "") !== event.minute ||
          original.team !== event.team
        )) {
          const { error: updateError } = await supabase
            .from("match_events")
            .update({
              team: event.team,
              scorer_user_id: event.scorerId,
              assist_user_id: event.assistId || null,
              minute: event.minute ? parseInt(event.minute) : null,
            })
            .eq("id", event.id);
          if (updateError) throw updateError;
        }
      }

      // Create/update feed post for the match (only if no existing one)
      const { data: existingPost } = await supabase
        .from("feed_posts")
        .select("id")
        .eq("match_id", matchId)
        .eq("post_type", "highlight")
        .maybeSingle();

      if (!existingPost) {
        await supabase.from("feed_posts").insert({
          match_id: matchId,
          post_type: "highlight",
          highlight_type: "match",
          caption: `Match completed! Final Score: ${teamAScore} - ${teamBScore}`,
          media_url: highlightUrl || null,
        });
      } else {
        await supabase.from("feed_posts").update({
          caption: `Match completed! Final Score: ${teamAScore} - ${teamBScore}`,
          media_url: highlightUrl || null,
        }).eq("id", existingPost.id);
      }
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${matchId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('match-videos')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('match-videos')
        .getPublicUrl(fileName);

      setHighlightUrl(publicUrl);
      toast.success("Video uploaded successfully!");
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleReuploadVideo = async () => {
    // Confirm before re-uploading as it clears all video events
    if (!confirm("Re-uploading will remove all tagged video events. Continue?")) {
      return;
    }

    try {
      // Delete existing video events for this match
      await supabase
        .from("match_video_events")
        .delete()
        .eq("match_id", matchId);

      // Delete existing analysis job
      if (analysisJob) {
        await supabase
          .from("video_analysis_jobs")
          .delete()
          .eq("id", analysisJob.id);
      }

      // Clear the video URL
      await supabase
        .from("matches")
        .update({ video_url: null })
        .eq("id", matchId);

      setHighlightUrl("");
      refetchAnalysisJob();
      queryClient.invalidateQueries({ queryKey: ["match-video-events", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-video-events-goals", matchId] });
      onUpdate();
      toast.success("Video cleared. You can now upload a new video.");
    } catch (err: any) {
      console.error("Re-upload error:", err);
      toast.error(err.message || "Failed to clear video");
    }
  };

  const handleSubmitForAnalysis = async () => {
    if (!highlightUrl) {
      toast.error("Please upload a video first");
      return;
    }

    setSubmittingForAnalysis(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Check if job already exists for this match
      const { data: existingJob } = await supabase
        .from("video_analysis_jobs")
        .select("id")
        .eq("match_id", matchId)
        .maybeSingle();

      if (existingJob) {
        // Update existing job with new video URL
        const { error: updateError } = await supabase
          .from("video_analysis_jobs")
          .update({
            video_url: highlightUrl,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingJob.id);

        if (updateError) throw updateError;
      } else {
        // Create new analysis job
        const { error: insertError } = await supabase
          .from("video_analysis_jobs")
          .insert({
            user_id: user.id,
            match_id: matchId,
            video_url: highlightUrl,
            status: "pending",
            title: `Match Video - ${matchId.slice(0, 8)}`,
          });

        if (insertError) throw insertError;
      }

      toast.success("Video submitted for admin analysis!");
      refetchAnalysisJob();
    } catch (err: any) {
      console.error("Submit for analysis error:", err);
      toast.error(err.message || "Failed to submit for analysis");
    } finally {
      setSubmittingForAnalysis(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-primary" />
          Update Match Stats
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manually enter the final score, goal scorers, and assist providers
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Highlight Video */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Highlight Video</Label>
            {highlightUrl ? (
              <a
                href={highlightUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Open
              </a>
            ) : null}
          </div>

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

          {highlightUrl ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                <video
                  key={highlightUrl}
                  src={highlightUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video bg-muted object-contain"
                  onError={() => toast.error("Couldn't play this video. Try re-uploading or use a direct .mp4 URL.")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleReuploadVideo}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove & Re-upload Video
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Upload a video or paste a direct video URL.
            </p>
          )}

          {/* Submit for Analysis Section */}
          {highlightUrl && (
            <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
              {analysisJob ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {analysisJob.status === "pending" && (
                      <>
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Pending admin review</span>
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30">Pending</Badge>
                      </>
                    )}
                    {analysisJob.status === "analyzing" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-sm">Being analyzed</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-500/30">Analyzing</Badge>
                      </>
                    )}
                    {analysisJob.status === "processing" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-sm">Processing</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-500/30">Processing</Badge>
                      </>
                    )}
                    {analysisJob.status === "completed" && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Analysis complete</span>
                        <Badge variant="outline" className="text-green-600 border-green-500/30">Completed</Badge>
                      </>
                    )}
                    {analysisJob.status === "failed" && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Analysis failed</span>
                        <Badge variant="outline" className="text-red-600 border-red-500/30">Failed</Badge>
                      </>
                    )}
                  </div>
                  {(analysisJob.status === "failed" || analysisJob.status === "completed") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSubmitForAnalysis}
                      disabled={submittingForAnalysis}
                    >
                      {submittingForAnalysis ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Re-submit
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Submit for Admin Tagging</p>
                    <p className="text-xs text-muted-foreground">
                      Request admin to tag goals, assists, and highlights
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSubmitForAnalysis}
                    disabled={submittingForAnalysis}
                  >
                    {submittingForAnalysis ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Submit for Analysis
                  </Button>
                </div>
              )}
              {analysisJob?.admin_notes && (
                <div className="mt-2 p-2 bg-background rounded text-xs">
                  <p className="font-medium">Admin Notes:</p>
                  <p className="text-muted-foreground">{analysisJob.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Final Score - Derived from Goal Events */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <Label className="text-xs text-muted-foreground">Final Score (auto-calculated from goals)</Label>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="text-center">
              <p className="text-3xl font-bold">{teamAScore}</p>
              <p className="text-xs text-muted-foreground">Team A</p>
            </div>
            <span className="text-xl text-muted-foreground">-</span>
            <div className="text-center">
              <p className="text-3xl font-bold">{teamBScore}</p>
              <p className="text-xs text-muted-foreground">Team B</p>
            </div>
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
                    value={event.assistId || "_none"}
                    onValueChange={(v) => updateGoalEvent(event.id, "assistId", v === "_none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
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
