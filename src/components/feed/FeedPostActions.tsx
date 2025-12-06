import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedPostActionsProps {
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  disabled?: boolean;
}

export function FeedPostActions({
  likes,
  comments,
  shares,
  isLiked,
  onLike,
  onComment,
  onShare,
  disabled = false,
}: FeedPostActionsProps) {
  return (
    <div className="flex items-center gap-1 pt-3 border-t border-border/50">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-2 hover:text-destructive",
          isLiked && "text-destructive"
        )}
        onClick={onLike}
        disabled={disabled}
      >
        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        <span>{likes > 0 ? likes.toLocaleString() : ""}</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 hover:text-primary"
        onClick={onComment}
        disabled={disabled}
      >
        <MessageCircle className="h-4 w-4" />
        <span>{comments > 0 ? comments.toLocaleString() : ""}</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 hover:text-green-500"
        onClick={onShare}
        disabled={disabled}
      >
        <Share2 className="h-4 w-4" />
        <span>{shares > 0 ? shares.toLocaleString() : ""}</span>
      </Button>
    </div>
  );
}
