import { useState, useEffect } from "react";
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
import { Save, Image, X } from "lucide-react";

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

export function TurfListingTab({ turfId, turf, onUpdate }: TurfListingTabProps) {
  const queryClient = useQueryClient();
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
    }
  }, [turf]);

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
          <CardTitle>Photos</CardTitle>
          <CardDescription>Upload photos of your turf (coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Photo upload feature coming soon</p>
            <p className="text-sm text-muted-foreground mt-1">
              Current photos: {turf?.photos?.length || 0}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
