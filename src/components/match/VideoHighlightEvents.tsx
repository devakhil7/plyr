import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Footprints, 
  ArrowRightLeft, 
  Sparkles,
  Play,
  Clock,
  User,
  Scissors,
  Share2,
  Copy,
  Pause,
  Volume2,
  VolumeX,
  Maximize
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { HighlightShareDialog } from "./HighlightShareDialog";
import { toast } from "sonner";

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
  assist_player_id: string | null;
  assist_player_name: string | null;
}

interface VideoHighlightEventsProps {
  events: VideoEvent[];
  videoUrl: string | null;
  matchId?: string;
  matchName?: string;
}

const EVENT_CONFIGS = {
  goal: { 
    icon: Target, 
    label: "Goals", 
    color: "bg-green-500 text-white",
    bgColor: "bg-green-500/10 border-green-500/20"
  },
  assist: { 
    icon: ArrowRightLeft, 
    label: "Assists", 
    color: "bg-blue-500 text-white",
    bgColor: "bg-blue-500/10 border-blue-500/20"
  },
  "key-pass": { 
    icon: Sparkles, 
    label: "Key Passes", 
    color: "bg-yellow-500 text-black",
    bgColor: "bg-yellow-500/10 border-yellow-500/20"
  },
  dribble: { 
    icon: Footprints, 
    label: "Dribbles", 
    color: "bg-purple-500 text-white",
    bgColor: "bg-purple-500/10 border-purple-500/20"
  },
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function VideoHighlightEvents({ events, videoUrl, matchId, matchName }: VideoHighlightEventsProps) {
  const params = useParams();
  const effectiveMatchId = matchId || params.id;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<VideoEvent | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [mutedClips, setMutedClips] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const clipBoundsRef = useRef<Map<string, { start: number; end: number }>>(new Map());

  if (events.length === 0) {
    return null;
  }

  // Group events by type
  const eventCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group events by team
  const teamAEvents = events.filter(e => e.team === "A");
  const teamBEvents = events.filter(e => e.team === "B");

  const getTeamStats = (teamEvents: VideoEvent[]) => {
    return teamEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const teamAStats = getTeamStats(teamAEvents);
  const teamBStats = getTeamStats(teamBEvents);

  // Get highlight events (those marked for clip generation)
  const highlightEvents = events.filter(e => e.generate_highlight);

  const handleShareHighlight = (event: VideoEvent) => {
    setSelectedHighlight(event);
    setShareDialogOpen(true);
  };

  const handleCopyHighlightLink = (event: VideoEvent) => {
    const url = `${window.location.origin}/matches/${effectiveMatchId}?highlight=${event.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Highlight link copied!");
  };

  const getClipBounds = (event: VideoEvent) => {
    const start = Math.max(0, event.timestamp_seconds - 10);
    const end = event.timestamp_seconds + 5;
    return { start, end };
  };

  const togglePlayClip = (eventId: string, event: VideoEvent) => {
    const video = videoRefs.current.get(eventId);
    if (!video) return;

    if (playingClipId === eventId) {
      video.pause();
      setPlayingClipId(null);
    } else {
      // Pause other videos
      videoRefs.current.forEach((v, id) => {
        if (id !== eventId) v.pause();
      });
      
      // Set clip bounds and start from the correct position
      const bounds = getClipBounds(event);
      clipBoundsRef.current.set(eventId, bounds);
      video.currentTime = bounds.start;
      video.play();
      setPlayingClipId(eventId);
    }
  };

  const handleTimeUpdate = (eventId: string, video: HTMLVideoElement) => {
    const bounds = clipBoundsRef.current.get(eventId);
    if (bounds && video.currentTime >= bounds.end) {
      video.pause();
      video.currentTime = bounds.start; // Reset to start for replay
      setPlayingClipId(null);
    }
  };

  const toggleMuteClip = (eventId: string) => {
    setMutedClips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Match Key Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Team-wise Stats Summary */}
        {(teamAEvents.length > 0 || teamBEvents.length > 0) && (
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-medium text-xs sm:text-sm text-muted-foreground">Team-wise Statistics</h4>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {/* Team A Stats */}
              <div className="p-2 sm:p-4 rounded-lg border bg-primary/5 border-primary/20">
                <h5 className="font-semibold mb-2 sm:mb-3 text-center text-sm sm:text-base">Team A</h5>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {Object.entries(EVENT_CONFIGS).map(([type, config]) => {
                    const count = teamAStats[type] || 0;
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-background/50 rounded text-xs sm:text-sm">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 opacity-70 shrink-0" />
                        <span className="truncate">{config.label}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team B Stats */}
              <div className="p-2 sm:p-4 rounded-lg border bg-secondary/5 border-secondary/20">
                <h5 className="font-semibold mb-2 sm:mb-3 text-center text-sm sm:text-base">Team B</h5>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {Object.entries(EVENT_CONFIGS).map(([type, config]) => {
                    const count = teamBStats[type] || 0;
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-background/50 rounded text-xs sm:text-sm">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 opacity-70 shrink-0" />
                        <span className="truncate">{config.label}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overall Event Stats Summary */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {Object.entries(EVENT_CONFIGS).map(([type, config]) => {
            const count = eventCounts[type] || 0;
            const Icon = config.icon;
            return (
              <div
                key={type}
                className={`p-2 sm:p-4 rounded-lg border ${config.bgColor} text-center`}
              >
                <Icon className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 opacity-80" />
                <div className="text-lg sm:text-2xl font-bold">{count}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{config.label}</div>
              </div>
            );
          })}
        </div>

        {/* Events Timeline */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Event Timeline</h4>
          <div className="space-y-2">
            {events
              .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
              .map((event) => {
                const config = EVENT_CONFIGS[event.event_type as keyof typeof EVENT_CONFIGS];
                const Icon = config?.icon || Target;
                
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">
                        {formatTime(event.timestamp_seconds)}
                      </span>
                    </div>
                    
                    {event.team && (
                      <Badge variant={event.team === "A" ? "default" : "secondary"}>
                        Team {event.team}
                      </Badge>
                    )}
                    
                    <Badge className={config?.color || "bg-gray-500"}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config?.label || event.event_type}
                    </Badge>
                    
                    {event.player_name && (
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        <span>{event.player_name}</span>
                        {event.jersey_number && (
                          <span className="text-muted-foreground">#{event.jersey_number}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Show assist for goals */}
                    {event.event_type === "goal" && event.assist_player_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>Assist: {event.assist_player_name}</span>
                      </div>
                    )}
                    
                    {event.player_id && (
                      <Link 
                        to={`/players/${event.player_id}`}
                        className="text-sm text-primary hover:underline ml-auto"
                      >
                        View Profile
                      </Link>
                    )}
                    
                    {event.generate_highlight && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        <Scissors className="h-3 w-3 mr-1" />
                        Highlight
                      </Badge>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Highlight Clips Section */}
        {highlightEvents.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium flex items-center gap-2">
              <Play className="h-4 w-4" />
              Highlight Clips ({highlightEvents.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {highlightEvents.map((event, index) => {
                const config = EVENT_CONFIGS[event.event_type as keyof typeof EVENT_CONFIGS];
                const clipStart = Math.max(0, event.timestamp_seconds - 10);
                const clipEnd = event.timestamp_seconds + 5;
                const hasClip = !!event.clip_url || !!videoUrl;
                const isPlaying = playingClipId === event.id;
                const isMuted = mutedClips.has(event.id);
                
                return (
                  <div
                    key={event.id}
                    className="bg-muted/50 rounded-lg border overflow-hidden"
                  >
                    {/* Video Player */}
                    {hasClip && (
                      <div className="relative aspect-video bg-black">
                        <video
                          ref={(el) => {
                            if (el) videoRefs.current.set(event.id, el);
                          }}
                          src={event.clip_url || videoUrl || ""}
                          className="w-full h-full object-contain"
                          muted={isMuted}
                          playsInline
                          onEnded={() => setPlayingClipId(null)}
                          onTimeUpdate={(e) => handleTimeUpdate(event.id, e.currentTarget)}
                        />
                        {/* Play/Pause Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-black/50 hover:bg-black/70"
                            onClick={() => togglePlayClip(event.id, event)}
                          >
                            {isPlaying ? (
                              <Pause className="h-6 w-6 text-white" />
                            ) : (
                              <Play className="h-6 w-6 text-white" />
                            )}
                          </Button>
                        </div>
                        {/* Video Controls */}
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/50 hover:bg-black/70"
                            onClick={() => toggleMuteClip(event.id)}
                          >
                            {isMuted ? (
                              <VolumeX className="h-4 w-4 text-white" />
                            ) : (
                              <Volume2 className="h-4 w-4 text-white" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/50 hover:bg-black/70"
                            onClick={() => {
                              const video = videoRefs.current.get(event.id);
                              if (video) {
                                if (video.requestFullscreen) {
                                  video.requestFullscreen();
                                } else if ((video as any).webkitRequestFullscreen) {
                                  (video as any).webkitRequestFullscreen();
                                }
                              }
                            }}
                          >
                            <Maximize className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Info Section */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Highlight {index + 1}</span>
                        <div className="flex items-center gap-2">
                          {event.team && (
                            <Badge variant={event.team === "A" ? "default" : "secondary"} className="text-xs">
                              Team {event.team}
                            </Badge>
                          )}
                          <Badge className={config?.color || "bg-gray-500"} variant="secondary">
                            {config?.label || event.event_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(clipStart)} - {formatTime(clipEnd)}
                        </div>
                        {event.player_name && (
                          <div className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {event.player_name}
                            {event.jersey_number && ` (#${event.jersey_number})`}
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-white border-white/50 hover:bg-white/10 hover:text-white"
                          onClick={() => handleShareHighlight(event)}
                        >
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopyHighlightLink(event)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Share Highlight Dialog */}
      <HighlightShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        highlight={selectedHighlight}
        matchId={effectiveMatchId}
        matchName={matchName}
        videoUrl={videoUrl}
      />
    </Card>
  );
}