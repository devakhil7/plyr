import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Video, Plus, Trash2, Loader2 } from "lucide-react";

interface ProfileMediaSectionProps {
  userId: string;
}

export function ProfileMediaSection({ userId }: ProfileMediaSectionProps) {
  const queryClient = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ["user-photos", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_photos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["user-videos", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_videos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addPhoto = useMutation({
    mutationFn: async (url: string) => {
      if (photos.length >= 5) throw new Error("Maximum 5 photos allowed");
      const { error } = await supabase
        .from("user_photos")
        .insert({ user_id: userId, photo_url: url });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo added!");
      setPhotoUrl("");
      queryClient.invalidateQueries({ queryKey: ["user-photos", userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add photo");
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_photos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      queryClient.invalidateQueries({ queryKey: ["user-photos", userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete photo");
    },
  });

  const addVideo = useMutation({
    mutationFn: async (url: string) => {
      if (videos.length >= 3) throw new Error("Maximum 3 videos allowed");
      const { error } = await supabase
        .from("user_videos")
        .insert({ user_id: userId, video_url: url });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video added!");
      setVideoUrl("");
      queryClient.invalidateQueries({ queryKey: ["user-videos", userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add video");
    },
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_videos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video deleted");
      queryClient.invalidateQueries({ queryKey: ["user-videos", userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete video");
    },
  });

  return (
    <div className="space-y-6">
      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos ({photos.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Photo */}
          <div className="flex gap-2">
            <Input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Enter photo URL..."
              disabled={photos.length >= 5}
            />
            <Button
              onClick={() => photoUrl && addPhoto.mutate(photoUrl)}
              disabled={!photoUrl || photos.length >= 5 || addPhoto.isPending}
            >
              {addPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Photos Grid */}
          {photosLoading ? (
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {photos.map((photo: any) => (
                <div key={photo.id} className="aspect-square relative group">
                  <img
                    src={photo.photo_url}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deletePhoto.mutate(photo.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No photos added yet</p>
          )}
        </CardContent>
      </Card>

      {/* Videos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5" />
            Videos ({videos.length}/3)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Video */}
          <div className="flex gap-2">
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Enter video URL..."
              disabled={videos.length >= 3}
            />
            <Button
              onClick={() => videoUrl && addVideo.mutate(videoUrl)}
              disabled={!videoUrl || videos.length >= 3 || addVideo.isPending}
            >
              {addVideo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Videos List */}
          {videosLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="aspect-video bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : videos.length > 0 ? (
            <div className="space-y-2">
              {videos.map((video: any) => (
                <div key={video.id} className="relative group">
                  <video
                    src={video.video_url}
                    controls
                    className="w-full aspect-video rounded-lg object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteVideo.mutate(video.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No videos added yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
