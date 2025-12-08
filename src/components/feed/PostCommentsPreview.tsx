import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  profiles: {
    name: string | null;
    profile_photo_url: string | null;
  } | null;
  user_id: string;
}

interface PostCommentsPreviewProps {
  comments: Comment[];
  totalCount: number;
  onViewAll: () => void;
}

export function PostCommentsPreview({ comments, totalCount, onViewAll }: PostCommentsPreviewProps) {
  if (comments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {comments.slice(0, 2).map((comment) => (
        <div key={comment.id} className="flex gap-2 items-start">
          <Link 
            to={`/players/${comment.user_id}`}
            className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0 hover:ring-2 hover:ring-primary/50 transition-all"
          >
            {comment.profiles?.profile_photo_url ? (
              <img
                src={comment.profiles.profile_photo_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              comment.profiles?.name?.charAt(0) || <User className="h-3 w-3" />
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <Link 
                to={`/players/${comment.user_id}`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {comment.profiles?.name || "User"}
              </Link>
              <span className="text-muted-foreground ml-2">{comment.text}</span>
            </p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
      
      {totalCount > 2 && (
        <button
          onClick={onViewAll}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View all {totalCount} comments
        </button>
      )}
    </div>
  );
}
