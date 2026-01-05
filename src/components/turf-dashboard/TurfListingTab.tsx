import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Image, X, Upload, Video, Loader2, Trash2 } from "lucide-react";

const AMENITIES_OPTIONS = [
  "Parking", "Washroom", "Floodlights", "Drinking Water", 
  "Shoes Rental", "First Aid", "Changing Room", "Cafeteria",
  "WiFi", "Spectator Seating", "Coaching Available"
];

interface TurfListingTabProps {
  turfId: string;
  turf: any;
  onUpdate: () => void;
}

const MAX_PHOTOS = 7;
const MAX_VIDEO = 1;

export function TurfListingTab({ turfId, turf, onUpdate }: TurfListingTabProps) {
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    location: "",
    city: "",
    google_maps_link: "",
    sport_type: "",
    description: "",
    rules: "",
    amenities: [] as string[],
    cancellation_policy: "",
    refund_policy: "",
    active: true,
  });

  useEffect(() => {
    if (turf) {
      setForm({
        name: turf.name || "",
        location: turf.location || "",
        city: turf.city || "",
        google_maps_link: turf.google_maps_link || "",
        sport_type: turf.sport_type || "",
        description: turf.description || "",
        rules: turf.rules || "",
        amenities: turf.amenities || [],
        cancellation_policy: turf.cancellation_policy || "",
        refund_policy: turf.refund_policy || "",
        active: turf.active !== false,
      });
      setPhotos(turf.photos || []);
      // Extract video from photos array if it exists (videos stored as last item or separate field)
      const existingVideos = (turf.photos || []).filter((url: string) => 
        url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')
      );
      if (existingVideos.length > 0) {
        setVideoUrl(existingVideos[0]);
        setPhotos((turf.photos || []).filter((url: string) => 
          !url.includes('.mp4') && !url.includes('.webm') && !url.includes('.mov')
        ));
      }
    }
  }, [turf]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploadingPhoto(true);

    try {
      const uploadedUrls: string[] = [];
      
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${turfId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('turf-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('turf-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      const newPhotos = [...photos, ...uploadedUrls];
      setPhotos(newPhotos);
      
      // Save to database
      const allMedia = videoUrl ? [...newPhotos, videoUrl] : newPhotos;
      await supabase.from('turfs').update({ photos: allMedia }).eq('id', turfId);
      
      toast.success(`${uploadedUrls.length} photo(s) uploaded`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoUrl) {
      toast.error("Only 1 video allowed. Delete existing video first.");
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }

    setUploadingVideo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${turfId}/video-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('turf-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('turf-media')
        .getPublicUrl(fileName);

      setVideoUrl(publicUrl);
      
      // Save to database
      const allMedia = [...photos, publicUrl];
      await supabase.from('turfs').update({ photos: allMedia }).eq('id', turfId);
      
      toast.success("Video uploaded successfully");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload video");
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      const newPhotos = photos.filter(p => p !== photoUrl);
      setPhotos(newPhotos);
      
      const allMedia = videoUrl ? [...newPhotos, videoUrl] : newPhotos;
      await supabase.from('turfs').update({ photos: allMedia }).eq('id', turfId);
      
      toast.success("Photo removed");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to remove photo");
    }
  };

  const handleDeleteVideo = async () => {
    try {
      setVideoUrl(null);
      await supabase.from('turfs').update({ photos }).eq('id', turfId);
      
      toast.success("Video removed");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to remove video");
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("turfs")
        .update(form)
        .eq("id", turfId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turf-details", turfId] });
      onUpdate();
      toast.success("Listing updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update listing");
    },
  });

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listing & Details</h1>
          <p className="text-muted-foreground">Manage how your turf appears to players</p>
        </div>
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Turf Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input 
                  value={form.city} 
                  onChange={(e) => setForm({ ...form, city: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Sport Type</Label>
                <Input 
                  value={form.sport_type} 
                  onChange={(e) => setForm({ ...form, sport_type: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Full Address</Label>
              <Input 
                value={form.location} 
                onChange={(e) => setForm({ ...form, location: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Google Maps Link (optional)</Label>
              <Input 
                value={form.google_maps_link} 
                onChange={(e) => setForm({ ...form, google_maps_link: e.target.value })} 
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive turfs won't appear in player search
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Description & Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Description & Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your turf, its features, and what makes it special..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Rules & Regulations</Label>
              <Textarea 
                value={form.rules} 
                onChange={(e) => setForm({ ...form, rules: e.target.value })}
                placeholder="e.g., No studs allowed, arrive 10 minutes before booking..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
            <CardDescription>Select the facilities available at your turf</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_OPTIONS.map((amenity) => (
                <Badge
                  key={amenity}
                  variant={form.amenities.includes(amenity) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenity}
                  {form.amenities.includes(amenity) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Policy</Label>
              <Textarea 
                value={form.cancellation_policy} 
                onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                placeholder="e.g., Free cancellation up to 24 hours before booking..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Refund Rules</Label>
              <Textarea 
                value={form.refund_policy} 
                onChange={(e) => setForm({ ...form, refund_policy: e.target.value })}
                placeholder="e.g., Full refund for cancellations made 48 hours in advance..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photos
          </CardTitle>
          <CardDescription>Upload up to {MAX_PHOTOS} photos of your turf</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border">
                  <img 
                    src={photo} 
                    alt={`Turf photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <div 
              onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
              className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click to upload photos</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {photos.length}/{MAX_PHOTOS} photos uploaded
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video
          </CardTitle>
          <CardDescription>Upload 1 promotional video of your turf (max 100MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />

          {videoUrl && (
            <div className="relative group rounded-lg overflow-hidden border">
              <video 
                src={videoUrl}
                controls
                className="w-full max-h-[300px]"
              />
              <button
                onClick={handleDeleteVideo}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {!videoUrl && (
            <div 
              onClick={() => !uploadingVideo && videoInputRef.current?.click()}
              className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploadingVideo ? (
                <>
                  <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Uploading video...</p>
                </>
              ) : (
                <>
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click to upload video</p>
                  <p className="text-sm text-muted-foreground mt-1">MP4, WebM, MOV supported</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
