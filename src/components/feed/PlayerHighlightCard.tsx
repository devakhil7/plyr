import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Play, Eye, User, MapPin } from "lucide-react";
import { FeedPostActions } from "./FeedPostActions";

interface PlayerHighlightCardProps {
  post: {
    id: string;
    caption: string | null;
    media_url: string | null;
    likes: number | null;
    views: number | null;
    shares: number | null;
    comments_count: number | null;
    created_at: string | null;
    player_id: string | null;
    profiles?: {
      name: string | null;
      profile_photo_url: string | null;
      position: string | null;
      city: string | null;
    } | null;
    matches?: {
      turfs?: {
        name: string | null;
      } | null;
    } | null;
  };
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  userId: string | null;
}

export function PlayerHighlightCard({ 
  post, 
  isLiked, 
  onLike, 
  onComment, 
  onShare,
  userId 
}: PlayerHighlightCardProps) {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
          {post.profiles?.profile_photo_url ? (
            <img 
              src={post.profiles.profile_photo_url} 
              alt={post.profiles?.name || "Player"} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            post.profiles?.name?.charAt(0) || <User className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{post.profiles?.name || "Unknown Player"}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {post.profiles?.position && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {post.profiles.position}
              </span>
            )}
            {post.profiles?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {post.profiles.city}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
          <User className="h-3 w-3" />
          Player Highlight
        </div>
      </div>

      {/* Video/Media */}
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative group cursor-pointer">
        {post.media_url ? (
          <video 
            src={post.media_url} 
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Play className="h-16 w-16 text-primary/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Highlight Video</p>
            </div>
          </div>
        )}
        <Button
          variant="glass"
          size="icon"
          className="absolute bottom-4 right-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="h-5 w-5" />
        </Button>
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

        <FeedPostActions 
          postId={post.id}
          caption={post.caption || undefined}
          likes={post.likes || 0}
          comments={post.comments_count || 0}
          shares={post.shares || 0}
          isLiked={isLiked}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          disabled={!userId}
        />
      </CardContent>
    </Card>
  );
}
