import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Users, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string;
    status: string;
    sport: string | null;
    city: string;
    cover_image_url: string | null;
    turfs?: {
      name: string | null;
      location: string | null;
    } | null;
    profiles?: {
      name: string | null;
    } | null;
  };
  isBookmarked: boolean;
  onBookmark: () => void;
  userId: string | null;
}

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  live: "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  upcoming: "UPCOMING",
  live: "LIVE NOW",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

export function EventCard({ event, isBookmarked, onBookmark, userId }: EventCardProps) {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      <div className="aspect-[2/1] bg-gradient-to-br from-primary/20 to-secondary/30 relative">
        {event.cover_image_url ? (
          <img 
            src={event.cover_image_url} 
            alt={event.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-16 w-16 text-primary/30" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className={cn(
          "absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border",
          statusColors[event.status] || statusColors.upcoming
        )}>
          {statusLabels[event.status] || event.status.toUpperCase()}
        </div>

        {/* Bookmark Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 right-4 rounded-full bg-background/80 backdrop-blur-sm",
            isBookmarked && "text-primary"
          )}
          onClick={onBookmark}
          disabled={!userId}
        >
          <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
        </Button>

        {/* Sport Badge */}
        {event.sport && (
          <div className="absolute bottom-4 left-4 px-2 py-1 rounded-full text-xs bg-background/80 backdrop-blur-sm">
            {event.sport}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Event Name */}
        <h3 className="font-bold text-lg mb-2 text-foreground line-clamp-2">{event.name}</h3>
        
        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
        )}

        {/* Event Details */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{format(new Date(event.start_datetime), "EEEE, MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              {format(new Date(event.start_datetime), "h:mm a")} - {format(new Date(event.end_datetime), "h:mm a")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{event.turfs?.name || event.city}</span>
          </div>
        </div>

        {/* Action */}
        <Link to={`/events/${event.id}`}>
          <Button className="w-full" variant={event.status === "live" ? "default" : "outline"}>
            {event.status === "live" ? "Join Now" : event.status === "upcoming" ? "View Details" : "See Results"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
