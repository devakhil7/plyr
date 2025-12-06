import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Send, User } from "lucide-react";
import { toast } from "sonner";

interface CommentsDialogProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export function CommentsDialog({ postId, isOpen, onClose, userId }: CommentsDialogProps) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select(`
          *,
          profiles(name, profile_photo_url)
        `)
        .eq("feed_post_id", postId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!userId) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("comments")
        .insert({ user_id: userId, feed_post_id: postId, text });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4 p-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold flex-shrink-0">
                    {comment.profiles?.profile_photo_url ? (
                      <img
                        src={comment.profiles.profile_photo_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      comment.profiles?.name?.charAt(0) || <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.profiles?.name || "User"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No comments yet. Be the first!</p>
            </div>
          )}
        </ScrollArea>

        {userId ? (
          <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={addCommentMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground pt-4 border-t">
            Sign in to comment
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
