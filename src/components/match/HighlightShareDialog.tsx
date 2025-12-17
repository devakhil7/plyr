import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Rss, Copy, Search, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface HighlightShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight: {
    id: string;
    event_type: string;
    timestamp_seconds: number;
    player_name: string | null;
    clip_url: string | null;
    team: string | null;
    generate_highlight?: boolean;
  } | null;
  matchId?: string;
  matchName?: string;
  videoUrl?: string | null;
}

export function HighlightShareDialog({
  open,
  onOpenChange,
  highlight,
  matchId,
  matchName,
  videoUrl,
}: HighlightShareDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("feed");
  const [caption, setCaption] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dmMessage, setDmMessage] = useState("");

  const highlightUrl = highlight
    ? `${window.location.origin}/matches/${matchId}?highlight=${highlight.id}`
    : "";

  const defaultCaption = highlight
    ? `Check out this ${highlight.event_type}${highlight.player_name ? ` by ${highlight.player_name}` : ""}! 🔥`
    : "";

  // Search users for DM
  const { data: users, isLoading: isSearching } = useQuery({
    queryKey: ["users-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, name, profile_photo_url")
        .ilike("name", `%${searchQuery}%`)
        .neq("id", user?.id || "")
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Check if clip is available - allow if clip_url exists OR if it's a generated highlight
  const hasClip = !!highlight?.clip_url || (highlight?.generate_highlight !== false);
  const mediaUrlToUse = highlight?.clip_url || videoUrl;

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user || !highlight) throw new Error("Missing data");
      if (!mediaUrlToUse) throw new Error("No video available");

      const finalCaption = caption || defaultCaption;

      const { error } = await supabase.from("feed_posts").insert({
        user_id: user.id,
        caption: `${finalCaption}\n\n🔗 ${highlightUrl}`,
        media_url: mediaUrlToUse,
        highlight_type: highlight.event_type,
        match_id: matchId || null,
        post_type: "highlight",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Posted to feed!");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create post");
    },
  });

  // Send DM mutation
  const sendDMMutation = useMutation({
    mutationFn: async () => {
      if (!user || !highlight || selectedUsers.length === 0)
        throw new Error("Missing data");

      const message =
        dmMessage ||
        `Check out this highlight: ${highlightUrl}`;

      // Create or get conversations and send messages
      for (const recipientId of selectedUsers) {
        // Check for existing conversation
        const { data: existingConvo } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        let conversationId: string | null = null;

        if (existingConvo && existingConvo.length > 0) {
          // Check if any of these conversations include the recipient
          for (const convo of existingConvo) {
            const { data: participant } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("conversation_id", convo.conversation_id)
              .eq("user_id", recipientId)
              .single();

            if (participant) {
              conversationId = convo.conversation_id;
              break;
            }
          }
        }

        // Create new conversation if none exists
        if (!conversationId) {
          const { data: newConvo, error: convoError } = await supabase
            .from("conversations")
            .insert({ created_by: user.id })
            .select("id")
            .single();

          if (convoError) throw convoError;
          conversationId = newConvo.id;

          // Add participants
          await supabase.from("conversation_participants").insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: recipientId },
          ]);
        }

        // Send the message
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message,
          message_type: "text",
        });
      }
    },
    onSuccess: () => {
      toast.success(`Sent to ${selectedUsers.length} user(s)!`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const resetForm = () => {
    setCaption("");
    setSearchQuery("");
    setSelectedUsers([]);
    setDmMessage("");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(highlightUrl);
    toast.success("Link copied!");
  };

  if (!highlight) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Highlight</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed" className="gap-1">
              <Rss className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="dm" className="gap-1">
              <Send className="h-4 w-4" />
              DM
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1">
              <Copy className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* Share to Feed */}
          <TabsContent value="feed" className="space-y-4 pt-4">
            {hasClip ? (
              <>
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Textarea
                    placeholder={defaultCaption}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createPostMutation.mutate()}
                  disabled={createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Rss className="h-4 w-4 mr-2" />
                      Post to Feed
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Clip not generated yet. Please generate the highlight clip first before sharing to feed.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Send as DM */}
          <TabsContent value="dm" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users && users.length > 0 ? (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        selectedUsers.includes(u.id)
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.profile_photo_url || undefined} />
                        <AvatarFallback>
                          {u.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-left text-sm font-medium">
                        {u.name}
                      </span>
                      {selectedUsers.includes(u.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : searchQuery.length >= 2 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : null}

            {selectedUsers.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Message (optional)</Label>
                  <Textarea
                    placeholder="Add a message..."
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => sendDMMutation.mutate()}
                  disabled={sendDMMutation.isPending}
                >
                  {sendDMMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {selectedUsers.length} user(s)
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          {/* Copy Link */}
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                type="text"
                value={highlightUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-muted-foreground outline-none truncate"
              />
            </div>
            <Button className="w-full" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
