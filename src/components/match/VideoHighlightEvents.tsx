import { useState } from "react";
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
  MessageCircle,
  Copy,
  Send
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ShareDialog } from "@/components/feed/ShareDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [shareHighlightOpen, setShareHighlightOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<VideoEvent | null>(null);

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
    setShareHighlightOpen(true);
  };

  const handleCopyHighlightLink = (event: VideoEvent) => {
    const url = `${window.location.origin}/matches/${effectiveMatchId}?highlight=${event.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Highlight link copied!");
  };

  const handleShareToFeed = async (event: VideoEvent) => {
    // This would typically open a create post dialog with the highlight pre-filled
    toast.success("Opening share to feed...");
    // Navigate to feed with share intent
    window.open(`/feed?share_highlight=${event.id}&match=${effectiveMatchId}`, "_blank");
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Match Key Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team-wise Stats Summary */}
        {(teamAEvents.length > 0 || teamBEvents.length > 0) && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Team-wise Statistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team A Stats */}
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <h5 className="font-semibold mb-3 text-center">Team A</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(EVENT_CONFIGS).map(([type, config]) => {
                    const count = teamAStats[type] || 0;
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                        <Icon className="h-4 w-4 opacity-70" />
                        <span className="text-sm">{config.label}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team B Stats */}
              <div className="p-4 rounded-lg border bg-secondary/5 border-secondary/20">
                <h5 className="font-semibold mb-3 text-center">Team B</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(EVENT_CONFIGS).map(([type, config]) => {
                    const count = teamBStats[type] || 0;
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                        <Icon className="h-4 w-4 opacity-70" />
                        <span className="text-sm">{config.label}:</span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(EVENT_CONFIGS).map(([type, config]) => {
            const count = eventCounts[type] || 0;
            const Icon = config.icon;
            return (
              <div
                key={type}
                className={`p-4 rounded-lg border ${config.bgColor} text-center`}
              >
                <Icon className="h-6 w-6 mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{config.label}</div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {highlightEvents.map((event, index) => {
                const config = EVENT_CONFIGS[event.event_type as keyof typeof EVENT_CONFIGS];
                const clipStart = Math.max(0, event.timestamp_seconds - 10);
                const clipEnd = event.timestamp_seconds + 5;
                
                return (
                  <div
                    key={event.id}
                    className="p-3 bg-muted/50 rounded-lg border"
                  >
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
                      {event.clip_url && (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Play className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyHighlightLink(event)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShareHighlight(event)}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Share Highlight Dialog */}
      <Dialog open={shareHighlightOpen} onOpenChange={setShareHighlightOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Share Highlight</DialogTitle>
          </DialogHeader>
          {selectedHighlight && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {EVENT_CONFIGS[selectedHighlight.event_type as keyof typeof EVENT_CONFIGS]?.label || selectedHighlight.event_type}
                  {selectedHighlight.player_name && ` by ${selectedHighlight.player_name}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  at {formatTime(selectedHighlight.timestamp_seconds)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => handleShareToFeed(selectedHighlight)}
                >
                  <Send className="h-5 w-5" />
                  <span className="text-sm">Share to Feed</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => {
                    const url = `${window.location.origin}/messages?share_highlight=${selectedHighlight.id}`;
                    window.open(url, "_blank");
                    setShareHighlightOpen(false);
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">Send as DM</span>
                </Button>
              </div>
              
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleCopyHighlightLink(selectedHighlight)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}