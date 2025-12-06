import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const positions = ["Striker", "Midfielder", "Defender", "Goalkeeper", "Winger", "Forward", "All-rounder"];
const skillLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function CompleteProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    location: "",
    sport_preference: "Football",
    position: "",
    skill_level: "intermediate",
    bio: "",
    favourite_club: "",
    favourite_player: "",
    height_cm: "",
    weight_kg: "",
    date_of_birth: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (profile) {
      setFormData({
        name: profile.name || "",
        city: profile.city || "",
        location: profile.location || "",
        sport_preference: profile.sport_preference || "Football",
        position: profile.position || "",
        skill_level: profile.skill_level || "intermediate",
        bio: profile.bio || "",
        favourite_club: (profile as any).favourite_club || "",
        favourite_player: (profile as any).favourite_player || "",
        height_cm: (profile as any).height_cm?.toString() || "",
        weight_kg: (profile as any).weight_kg?.toString() || "",
        date_of_birth: (profile as any).date_of_birth || "",
      });
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          city: formData.city,
          location: formData.location,
          sport_preference: formData.sport_preference,
          position: formData.position,
          skill_level: formData.skill_level as "beginner" | "intermediate" | "advanced",
          bio: formData.bio,
          favourite_club: formData.favourite_club || null,
          favourite_player: formData.favourite_player || null,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
          date_of_birth: formData.date_of_birth || null,
          profile_completed: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile completed!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="container-app py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Complete Your Player Profile</CardTitle>
              <CardDescription>
                Tell us about yourself so we can match you with the right games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Bangalore"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Area / Locality</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Koramangala"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Preferred Position *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill_level">Skill Level *</Label>
                    <Select
                      value={formData.skill_level}
                      onValueChange={(value) => setFormData({ ...formData, skill_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        {skillLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell others about your playing style..."
                    rows={3}
                  />
                </div>

                {/* Physical Stats Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Physical Stats (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height_cm">Height (cm)</Label>
                      <Input
                        id="height_cm"
                        type="number"
                        value={formData.height_cm}
                        onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                        placeholder="e.g., 175"
                        min="100"
                        max="250"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight_kg">Weight (kg)</Label>
                      <Input
                        id="weight_kg"
                        type="number"
                        value={formData.weight_kg}
                        onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                        placeholder="e.g., 70"
                        min="30"
                        max="200"
                      />
                    </div>
                  </div>
                </div>

                {/* Favourites Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Favourites (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="favourite_club">Favourite Club</Label>
                      <Input
                        id="favourite_club"
                        value={formData.favourite_club}
                        onChange={(e) => setFormData({ ...formData, favourite_club: e.target.value })}
                        placeholder="e.g., Manchester United"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="favourite_player">Favourite Player</Label>
                      <Input
                        id="favourite_player"
                        value={formData.favourite_player}
                        onChange={(e) => setFormData({ ...formData, favourite_player: e.target.value })}
                        placeholder="e.g., Cristiano Ronaldo"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Saving..." : "Complete Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}