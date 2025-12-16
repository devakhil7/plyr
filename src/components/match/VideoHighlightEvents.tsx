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
  Scissors
} from "lucide-react";
import { Link } from "react-router-dom";

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
}

interface VideoHighlightEventsProps {
  events: VideoEvent[];
  videoUrl: string | null;
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

export function VideoHighlightEvents({ events, videoUrl }: VideoHighlightEventsProps) {
  if (events.length === 0) {
    return null;
  }

  // Group events by type
  const eventCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get highlight events (those marked for clip generation)
  const highlightEvents = events.filter(e => e.generate_highlight);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Match Key Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Event Stats Summary */}
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
                      <Badge className={config?.color || "bg-gray-500"} variant="secondary">
                        {config?.label || event.event_type}
                      </Badge>
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
                    {event.clip_url && (
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        <Play className="h-3 w-3 mr-1" />
                        Watch Clip
                      </Button>
                    )}
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
