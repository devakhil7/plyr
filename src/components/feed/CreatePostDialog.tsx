import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Image, Video, AtSign, MapPin, Trophy, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function CreatePostDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [highlightType, setHighlightType] = useState<string>("other");
  const [selectedPlayers, setSelectedPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<{ id: string; name: string } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<{ id: string; name: string } | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [showTurfSearch, setShowTurfSearch] = useState(false);
  const [showMatchSearch, setShowMatchSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Please upload an image or video file");
      return;
    }

    // Validate file size (50MB max)
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

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const taggedPlayerIds = selectedPlayers.map((p) => p.id);
      const taggedTurfId = selectedTurf?.id;
      const taggedMatchId = selectedMatch?.id;

      // Build caption with tags
      let finalCaption = caption;
      if (selectedPlayers.length > 0) {
        finalCaption += `\n\n🏷️ Tagged: ${selectedPlayers.map((p) => `@${p.name}`).join(", ")}`;
      }
      if (selectedTurf) {
        finalCaption += `\n📍 ${selectedTurf.name}`;
      }
      if (selectedMatch) {
        finalCaption += `\n🏆 ${selectedMatch.name}`;
      }

      const { error } = await supabase.from("feed_posts").insert({
        user_id: user.id,
        caption: finalCaption,
        media_url: mediaUrl || null,
        highlight_type: highlightType,
        player_id: taggedPlayerIds[0] || null,
        match_id: taggedMatchId || null,
        post_type: "highlight",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post created successfully!");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create post");
      console.error(error);
    },
  });

  const resetForm = () => {
    setCaption("");
    setMediaUrl("");
    setHighlightType("other");
    setSelectedPlayers([]);
    setSelectedTurf(null);
    setSelectedMatch(null);
    setPlayerSearch("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
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
            
            {/* Upload Button */}
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
                disabled={isUploading || !!uploadedFile}
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
                    Upload Photo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !!uploadedFile}
                className="gap-2"
              >
                <Video className="h-4 w-4" />
                Upload Video
              </Button>
            </div>

            {/* Uploaded File Preview */}
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

            {/* Or use URL */}
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

          {/* Submit */}
          <Button
            className="w-full"
            onClick={() => createPostMutation.mutate()}
            disabled={!caption.trim() || createPostMutation.isPending}
          >
            {createPostMutation.isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
