import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, MapPin, Trophy, Calendar, User } from "lucide-react";
import { FeedPostActions } from "./FeedPostActions";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";

interface MatchHighlightCardProps {
  post: {
    id: string;
    caption: string | null;
    media_url: string | null;
    likes: number | null;
    views: number | null;
    shares: number | null;
    comments_count: number | null;
    created_at: string | null;
    match_id: string | null;
    matches?: {
      match_name: string | null;
      team_a_score: number | null;
      team_b_score: number | null;
      match_date: string | null;
      turfs?: {
        name: string | null;
      } | null;
    } | null;
    profiles?: {
      name: string | null;
      profile_photo_url: string | null;
    } | null;
  };
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  userId: string | null;
}

export function MatchHighlightCard({ 
  post, 
  isLiked, 
  onLike, 
  onComment, 
  onShare,
  userId 
}: MatchHighlightCardProps) {
  const hasScore = post.matches?.team_a_score !== null && post.matches?.team_b_score !== null;
  const displayName = post.profiles?.name || (post.matches?.match_name ? "SPORTIQ" : "User");

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
          {post.profiles?.profile_photo_url ? (
            <img 
              src={post.profiles.profile_photo_url} 
              alt={displayName} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <Trophy className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{displayName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {post.created_at && (
              <span>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            )}
            {post.matches?.match_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(post.matches.match_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full">
          <Trophy className="h-3 w-3" />
          Match
        </div>
      </div>

      {/* Video/Score Section */}
      <div className="aspect-video bg-gradient-to-br from-primary/10 to-amber-500/10 relative group cursor-pointer">
        {post.media_url ? (
          <video 
            src={post.media_url} 
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        ) : hasScore ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <p className="text-sm text-muted-foreground mb-3">Final Score</p>
            <div className="flex items-center gap-6 text-5xl font-bold">
              <span className="text-primary">{post.matches?.team_a_score}</span>
              <span className="text-muted-foreground text-3xl">-</span>
              <span className="text-primary">{post.matches?.team_b_score}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{post.matches?.match_name}</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Play className="h-16 w-16 text-primary/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Match Highlight</p>
            </div>
          </div>
        )}
        
        {post.media_url && (
          <Button
            variant="glass"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="h-5 w-5" />
          </Button>
        )}
        
        {(post.views || 0) > 0 && (
          <div className="absolute top-4 left-4 flex items-center gap-1 text-xs bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
            <Eye className="h-3 w-3" />
            {post.views?.toLocaleString()}
          </div>
        )}
      </div>

      {/* Caption & Actions */}
      <CardContent className="p-4">
        {post.caption && (
          <p className="text-sm mb-3 text-foreground">{post.caption}</p>
        )}
        
        {post.matches?.turfs?.name && (
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {post.matches.turfs.name}
          </p>
        )}

        <div className="flex items-center justify-between">
          <FeedPostActions 
            likes={post.likes || 0}
            comments={post.comments_count || 0}
            shares={post.shares || 0}
            isLiked={isLiked}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            disabled={!userId}
          />
          
          {post.match_id && (
            <Link to={`/matches/${post.match_id}`}>
              <Button variant="outline" size="sm">
                View Match
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
