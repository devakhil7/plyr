import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Image, Video, AtSign, MapPin, Trophy, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditPostDialogProps {
  post: {
    id: string;
    caption: string | null;
    media_url: string | null;
    highlight_type: string | null;
    player_id: string | null;
    match_id: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function EditPostDialog({ post, isOpen, onClose }: EditPostDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState(post.caption || "");
  const [mediaUrl, setMediaUrl] = useState(post.media_url || "");
  const [highlightType, setHighlightType] = useState<string>(post.highlight_type || "other");
  const [selectedPlayers, setSelectedPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<{ id: string; name: string } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<{ id: string; name: string } | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [showTurfSearch, setShowTurfSearch] = useState(false);
  const [showMatchSearch, setShowMatchSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(
    post.media_url ? { name: "Current media", url: post.media_url } : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when post changes
  useEffect(() => {
    setCaption(post.caption || "");
    setMediaUrl(post.media_url || "");
    setHighlightType(post.highlight_type || "other");
    setUploadedFile(post.media_url ? { name: "Current media", url: post.media_url } : null);
  }, [post]);

  // Load existing tagged player
  useQuery({
    queryKey: ["tagged-player", post.player_id],
    queryFn: async () => {
      if (!post.player_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", post.player_id)
        .maybeSingle();
      if (data) {
        setSelectedPlayers([{ id: data.id, name: data.name || "Unknown" }]);
      }
      return data;
    },
    enabled: !!post.player_id,
  });

  // Load existing tagged match
  useQuery({
    queryKey: ["tagged-match", post.match_id],
    queryFn: async () => {
      if (!post.match_id) return null;
      const { data } = await supabase
        .from("matches")
        .select("id, match_name, turf_id, turfs(id, name)")
        .eq("id", post.match_id)
        .maybeSingle();
      if (data) {
        setSelectedMatch({ id: data.id, name: data.match_name });
        if (data.turfs) {
          setSelectedTurf({ id: data.turfs.id, name: data.turfs.name });
        }
      }
      return data;
    },
    enabled: !!post.match_id,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Please upload an image or video file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const bucket = isImage ? "post-images" : "post-videos";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setUploadedFile({ name: file.name, url: publicUrl });
      setMediaUrl(publicUrl);
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setMediaUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const { data: players } = useQuery({
    queryKey: ["players-search", playerSearch],
    queryFn: async () => {
      if (!playerSearch) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .ilike("name", `%${playerSearch}%`)
        .limit(5);
      return data || [];
    },
    enabled: playerSearch.length > 1,
  });

  const { data: turfs } = useQuery({
    queryKey: ["turfs-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turfs")
        .select("id, name")
        .eq("active", true)
        .limit(10);
      return data || [];
    },
  });

  const { data: matches } = useQuery({
    queryKey: ["matches-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, match_name")
        .eq("visibility", "public")
        .order("match_date", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const taggedPlayerIds = selectedPlayers.map((p) => p.id);
      const taggedMatchId = selectedMatch?.id;

      // Build caption with tags
      let finalCaption = caption.split("\n\n🏷️")[0].split("\n📍")[0].split("\n🏆")[0]; // Remove old tags
      if (selectedPlayers.length > 0) {
        finalCaption += `\n\n🏷️ Tagged: ${selectedPlayers.map((p) => `@${p.name}`).join(", ")}`;
      }
      if (selectedTurf) {
        finalCaption += `\n📍 ${selectedTurf.name}`;
      }
      if (selectedMatch) {
        finalCaption += `\n🏆 ${selectedMatch.name}`;
      }

      const { error } = await supabase
        .from("feed_posts")
        .update({
          caption: finalCaption,
          media_url: mediaUrl || null,
          highlight_type: highlightType,
          player_id: taggedPlayerIds[0] || null,
          match_id: taggedMatchId || null,
        })
        .eq("id", post.id)
        .eq("user_id", user.id); // Ensure user owns the post

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to update post");
      console.error(error);
    },
  });

  const addPlayer = (player: { id: string; name: string }) => {
    if (!selectedPlayers.find((p) => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
    setPlayerSearch("");
    setShowPlayerSearch(false);
  };

  const removePlayer = (id: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Post Type */}
          <div className="space-y-2">
            <Label>Post Type</Label>
            <Select value={highlightType} onValueChange={setHighlightType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goal">⚽ Goal</SelectItem>
                <SelectItem value="assist">🎯 Assist</SelectItem>
                <SelectItem value="save">🧤 Save</SelectItem>
                <SelectItem value="skill">✨ Skill Move</SelectItem>
                <SelectItem value="match_recap">📊 Match Recap</SelectItem>
                <SelectItem value="announcement">📢 Announcement</SelectItem>
                <SelectItem value="other">📝 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label>Caption</Label>
            <Textarea
              placeholder="What's happening in the game?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          {/* Media Upload/URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Photo/Video
            </Label>
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Image className="h-4 w-4" />
                    Change Media
                  </>
                )}
              </Button>
            </div>

            {uploadedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <span className="text-sm truncate flex-1">{uploadedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeUploadedFile}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!uploadedFile && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Or paste a URL</span>
                <Input
                  placeholder="https://youtube.com/... or image URL"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tag Players */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Tag Players
            </Label>
            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedPlayers.map((player) => (
                  <Badge key={player.id} variant="secondary" className="gap-1">
                    @{player.name}
                    <button onClick={() => removePlayer(player.id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Input
                placeholder="Search players..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                onFocus={() => setShowPlayerSearch(true)}
              />
              {showPlayerSearch && players && players.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                      onClick={() => addPlayer({ id: player.id, name: player.name || "Unknown" })}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tag Turf */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Tag Venue
            </Label>
            {selectedTurf ? (
              <Badge variant="secondary" className="gap-1">
                📍 {selectedTurf.name}
                <button onClick={() => setSelectedTurf(null)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTurfSearch(!showTurfSearch)}
                >
                  Select Venue
                </Button>
                {showTurfSearch && turfs && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {turfs.map((turf) => (
                      <button
                        key={turf.id}
                        className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                        onClick={() => {
                          setSelectedTurf({ id: turf.id, name: turf.name });
                          setShowTurfSearch(false);
                        }}
                      >
                        {turf.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tag Match */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Tag Match
            </Label>
            {selectedMatch ? (
              <Badge variant="secondary" className="gap-1">
                🏆 {selectedMatch.name}
                <button onClick={() => setSelectedMatch(null)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMatchSearch(!showMatchSearch)}
                >
                  Select Match
                </Button>
                {showMatchSearch && matches && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {matches.map((match) => (
                      <button
                        key={match.id}
                        className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                        onClick={() => {
                          setSelectedMatch({ id: match.id, name: match.match_name });
                          setShowMatchSearch(false);
                        }}
                      >
                        {match.match_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => updatePostMutation.mutate()}
              disabled={!caption.trim() || updatePostMutation.isPending}
            >
              {updatePostMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
