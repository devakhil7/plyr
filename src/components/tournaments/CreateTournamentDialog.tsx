import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trophy, Loader2, ImageIcon, X } from "lucide-react";

interface FormData {
  name: string;
  description: string;
  turf_id: string;
  sport: string;
  city: string;
  start_datetime: string;
  end_datetime: string;
  entry_fee: number;
  prize_details: string;
  rules: string;
}

export function CreateTournamentDialog() {
  const [open, setOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      turf_id: "",
      sport: "Football",
      city: "",
      start_datetime: "",
      end_datetime: "",
      entry_fee: 0,
      prize_details: "",
      rules: "",
    },
  });

  const { data: turfs = [] } = useQuery({
    queryKey: ["turfs-for-tournament"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turfs")
        .select("id, name, city")
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingPoster(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `tournament-${Date.now()}.${fileExt}`;
      const filePath = `tournament-posters/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("team-logos")
        .getPublicUrl(filePath);

      setPosterUrl(publicUrl);
      toast.success("Poster uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload poster");
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const removePoster = () => {
    setPosterUrl(null);
  };

  const createTournament = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("tournaments").insert({
        name: data.name,
        description: data.description || null,
        turf_id: data.turf_id || null,
        sport: data.sport,
        city: data.city,
        start_datetime: data.start_datetime,
        end_datetime: data.end_datetime,
        entry_fee: data.entry_fee || 0,
        prize_details: data.prize_details || null,
        rules: data.rules || null,
        created_by: user?.id,
        status: "upcoming",
        cover_image_url: posterUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Tournament created successfully!");
      reset();
      setPosterUrl(null);
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error creating tournament:", error);
      toast.error("Failed to create tournament");
    },
  });

  const onSubmit = (data: FormData) => {
    createTournament.mutate(data);
  };

  const selectedTurf = turfs.find((t: any) => t.id === watch("turf_id"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Host Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Create New Tournament
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                {...register("name", { required: "Name is required" })}
                placeholder="e.g., Summer Football Championship 2024"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sport">Sport</Label>
              <Select
                defaultValue="Football"
                onValueChange={(val) => setValue("sport", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Football">Football</SelectItem>
                  <SelectItem value="Cricket">Cricket</SelectItem>
                  <SelectItem value="Basketball">Basketball</SelectItem>
                  <SelectItem value="Badminton">Badminton</SelectItem>
                  <SelectItem value="Tennis">Tennis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="turf_id">Venue (Turf)</Label>
              <Select
                onValueChange={(val) => {
                  setValue("turf_id", val);
                  const turf = turfs.find((t: any) => t.id === val);
                  if (turf) {
                    setValue("city", turf.city);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a turf" />
                </SelectTrigger>
                <SelectContent>
                  {turfs.map((turf: any) => (
                    <SelectItem key={turf.id} value={turf.id}>
                      {turf.name} - {turf.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register("city", { required: "City is required" })}
                placeholder="e.g., Mumbai"
              />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="entry_fee">Entry Fee (₹)</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                {...register("entry_fee", { valueAsNumber: true })}
                placeholder="0 for free entry"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_datetime">Start Date & Time *</Label>
              <Input
                id="start_datetime"
                type="datetime-local"
                {...register("start_datetime", { required: "Start date is required" })}
              />
              {errors.start_datetime && (
                <p className="text-sm text-destructive mt-1">{errors.start_datetime.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_datetime">End Date & Time *</Label>
              <Input
                id="end_datetime"
                type="datetime-local"
                {...register("end_datetime", { required: "End date is required" })}
              />
              {errors.end_datetime && (
                <p className="text-sm text-destructive mt-1">{errors.end_datetime.message}</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe your tournament..."
                rows={3}
              />
            </div>

            {/* Tournament Poster Upload */}
            <div>
              <Label>Tournament Poster</Label>
              <div className="mt-2">
                {posterUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={posterUrl}
                      alt="Tournament Poster"
                      className="w-48 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removePoster}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-48 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePosterUpload}
                      disabled={isUploadingPoster}
                    />
                    {isUploadingPoster ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload Poster</span>
                      </>
                    )}
                  </label>
                )}
                <p className="text-xs text-muted-foreground mt-2">Recommended: 1200x630px, max 5MB</p>
              </div>
            </div>

            <div>
              <Label htmlFor="prize_details">Prize Details</Label>
              <Input
                id="prize_details"
                {...register("prize_details")}
                placeholder="e.g., Winner: ₹50,000 | Runner-up: ₹25,000"
              />
            </div>

            <div>
              <Label htmlFor="rules">Rules & Format</Label>
              <Textarea
                id="rules"
                {...register("rules")}
                placeholder="Tournament rules, format (knockout/league), team size, etc."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTournament.isPending}>
              {createTournament.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Tournament
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
