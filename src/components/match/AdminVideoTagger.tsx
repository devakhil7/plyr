import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Clock, 
  Tag, 
  Video,
  Scissors,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Player {
  id: string;
  user_id: string | null;
  offline_player_name: string | null;
  profiles?: {
    id: string;
    name: string;
  } | null;
}

interface VideoEvent {
  id: string;
  event_type: string;
  timestamp_seconds: number;
  player_id: string | null;
  player_name: string | null;
  jersey_number: number | null;
  generate_highlight: boolean;
  clip_url: string | null;
  notes: string | null;
  team: string | null;
}

interface AdminVideoTaggerProps {
  matchId?: string;
  videoAnalysisJobId?: string;
  videoUrl: string | null;
  matchPlayers?: Player[];
  onEventAdded?: () => void;
}

const EVENT_TYPES = [
  { value: "goal", label: "Goal", color: "bg-green-500" },
  { value: "key-pass", label: "Key Pass", color: "bg-yellow-500" },
  { value: "dribble", label: "Dribble", color: "bg-purple-500" },
];

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

export function AdminVideoTagger({ 
  matchId, 
  videoAnalysisJobId,
  videoUrl, 
  matchPlayers = [],
  onEventAdded 
}: AdminVideoTaggerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // New event form state
  const [eventType, setEventType] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [team, setTeam] = useState<string>("");
  const [generateHighlight, setGenerateHighlight] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingClip, setGeneratingClip] = useState<string | null>(null);
  // Assist provider state for goals
  const [assistPlayerId, setAssistPlayerId] = useState<string>("");
  const [assistPlayerName, setAssistPlayerName] = useState("");

  // Fetch existing events
  const { data: existingEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ["video-events", matchId, videoAnalysisJobId],
    queryFn: async () => {
      let query = supabase.from("match_video_events").select("*");
      
      if (matchId) {
        query = query.eq("match_id", matchId);
      } else if (videoAnalysisJobId) {
        query = query.eq("video_analysis_job_id", videoAnalysisJobId);
      } else {
        return [];
      }
      
      const { data, error } = await query.order("timestamp_seconds", { ascending: true });
      if (error) throw error;
      return data as VideoEvent[];
    },
    enabled: !!(matchId || videoAnalysisJobId),
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(seconds, duration));
  };

  const skip = (seconds: number) => {
    seekTo(currentTime + seconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    const player = matchPlayers.find(p => p.user_id === playerId || p.profiles?.id === playerId);
    if (player) {
      setPlayerName(player.profiles?.name || player.offline_player_name || "");
    }
  };

  const handleAssistPlayerSelect = (playerId: string) => {
    setAssistPlayerId(playerId);
    const player = matchPlayers.find(p => p.user_id === playerId || p.profiles?.id === playerId);
    if (player) {
      setAssistPlayerName(player.profiles?.name || player.offline_player_name || "");
    }
  };

  const handleTagEvent = async () => {
    if (!eventType) {
      toast.error("Please select an event type");
      return;
    }

    if (!matchId && !videoAnalysisJobId) {
      toast.error("Missing match or video analysis job reference");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build notes with assist info for goals
      let eventNotes = notes || "";
      if (eventType === "goal" && (assistPlayerId || assistPlayerName)) {
        const assistInfo = `Assist: ${assistPlayerName || "Unknown"}${assistPlayerId ? ` (ID: ${assistPlayerId})` : ""}`;
        eventNotes = eventNotes ? `${eventNotes}\n${assistInfo}` : assistInfo;
      }

      const insertData: any = {
        event_type: eventType,
        timestamp_seconds: Math.floor(currentTime),
        player_id: selectedPlayerId || null,
        player_name: playerName || null,
        jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
        team: team || null,
        generate_highlight: generateHighlight,
        notes: eventNotes || null,
        created_by: user.id,
      };

      if (matchId) {
        insertData.match_id = matchId;
      }
      if (videoAnalysisJobId) {
        insertData.video_analysis_job_id = videoAnalysisJobId;
      }

      const { error } = await supabase.from("match_video_events").insert(insertData);

      if (error) throw error;

      toast.success("Event tagged successfully!");
      
      // Reset form
      setEventType("");
      setSelectedPlayerId("");
      setPlayerName("");
      setJerseyNumber("");
      setTeam("");
      setGenerateHighlight(false);
      setNotes("");
      setAssistPlayerId("");
      setAssistPlayerName("");
      
      refetchEvents();
      onEventAdded?.();
    } catch (err: any) {
      console.error("Error tagging event:", err);
      toast.error(err.message || "Failed to tag event");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("match_video_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
      
      toast.success("Event deleted");
      refetchEvents();
      onEventAdded?.();
    } catch (err: any) {
      toast.error("Failed to delete event");
    }
  };

  const handleGenerateClip = async (event: VideoEvent) => {
    setGeneratingClip(event.id);
    
    try {
      const clipStart = Math.max(0, event.timestamp_seconds - 10);
      const clipEnd = event.timestamp_seconds + 5;
      
      const { error } = await supabase
        .from("match_video_events")
        .update({ 
          generate_highlight: true,
          notes: `${event.notes || ''}\nClip: ${formatTime(clipStart)} - ${formatTime(clipEnd)}`.trim()
        })
        .eq("id", event.id);

      if (error) throw error;
      
      toast.success(`Highlight clip marked for generation (${formatTime(clipStart)} - ${formatTime(clipEnd)})`);
      refetchEvents();
      onEventAdded?.();
    } catch (err: any) {
      toast.error("Failed to generate clip");
    } finally {
      setGeneratingClip(null);
    }
  };

  const jumpToEvent = (timestamp: number) => {
    seekTo(timestamp);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPES.find(et => et.value === type) || EVENT_TYPES[0];
  };

  if (!videoUrl) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Event Tagger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No video uploaded. Upload a video first to tag events.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Event Tagger (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Player */}
        <div className="space-y-4">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full rounded-lg bg-black max-h-[400px]"
            crossOrigin="anonymous"
          />
          
          {/* Timeline */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={([value]) => seekTo(value)}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => skip(-10)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => skip(-5)}>
              -5s
            </Button>
            
            <Button size="lg" onClick={togglePlay} className="h-12 w-12 rounded-full">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button variant="outline" size="icon" onClick={() => skip(5)}>
              +5s
            </Button>
            <Button variant="outline" size="icon" onClick={() => skip(10)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Speed:</span>
            {PLAYBACK_SPEEDS.map((speed) => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "default" : "outline"}
                size="sm"
                onClick={() => changePlaybackSpeed(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        {/* Tag Event Form */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tag Event at {formatTime(currentTime)}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {matchPlayers.length > 0 && (
              <div className="space-y-2">
                <Label>Player (from match)</Label>
                <Select value={selectedPlayerId} onValueChange={handlePlayerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchPlayers.map((player) => (
                      <SelectItem 
                        key={player.id} 
                        value={player.user_id || player.profiles?.id || player.id}
                      >
                        {player.profiles?.name || player.offline_player_name || "Unknown Player"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Player Name (manual)</Label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Team A</SelectItem>
                  <SelectItem value="B">Team B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jersey Number (optional)</Label>
              <Input
                type="number"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {/* Assist Provider - only show for goals */}
          {eventType === "goal" && (
            <div className="border rounded-lg p-4 bg-blue-500/10 space-y-4">
              <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400">Assist Provider (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchPlayers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assist by (from match)</Label>
                    <Select value={assistPlayerId} onValueChange={handleAssistPlayerSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assist provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assist</SelectItem>
                        {matchPlayers.map((player) => (
                          <SelectItem 
                            key={player.id} 
                            value={player.user_id || player.profiles?.id || player.id}
                          >
                            {player.profiles?.name || player.offline_player_name || "Unknown Player"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Assist Provider Name (manual)</Label>
                  <Input
                    value={assistPlayerName}
                    onChange={(e) => setAssistPlayerName(e.target.value)}
                    placeholder="Enter assist provider name"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this event"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="generateHighlight"
              checked={generateHighlight}
              onCheckedChange={(checked) => setGenerateHighlight(!!checked)}
            />
            <Label htmlFor="generateHighlight" className="cursor-pointer">
              Generate 15-second highlight clip (10s before to 5s after)
            </Label>
          </div>

          <Button 
            onClick={handleTagEvent} 
            disabled={saving || !eventType}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Tag Event
              </>
            )}
          </Button>
        </div>

        {/* Tagged Events List */}
        {existingEvents.length > 0 && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Tagged Events ({existingEvents.length})</h3>
            <div className="space-y-3">
              {existingEvents
                .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
                .map((event) => {
                  const config = getEventTypeConfig(event.event_type);
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => jumpToEvent(event.timestamp_seconds)}
                          className="font-mono"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(event.timestamp_seconds)}
                        </Button>
                        <Badge className={config.color}>{config.label}</Badge>
                        {event.team && (
                          <Badge variant={event.team === "A" ? "default" : "secondary"}>
                            Team {event.team}
                          </Badge>
                        )}
                        {event.player_name && (
                          <span className="text-sm">
                            {event.player_name}
                            {event.jersey_number && ` (#${event.jersey_number})`}
                          </span>
                        )}
                        {event.generate_highlight && (
                          <Badge variant="outline" className="text-xs">
                            <Scissors className="h-3 w-3 mr-1" />
                            Highlight
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!event.generate_highlight && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateClip(event)}
                            disabled={generatingClip === event.id}
                          >
                            {generatingClip === event.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Scissors className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
