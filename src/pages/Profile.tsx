import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "react-router-dom";

const positions = ["Striker", "Midfielder", "Defender", "Goalkeeper", "Winger", "Forward", "All-rounder"];
const skillLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const TOP_CLUBS = [
  "Real Madrid", "Barcelona", "Manchester United", "Manchester City", "Liverpool",
  "Chelsea", "Arsenal", "Bayern Munich", "Borussia Dortmund", "Paris Saint-Germain",
  "Juventus", "AC Milan", "Inter Milan", "Napoli", "Roma",
  "Atletico Madrid", "Sevilla", "Tottenham Hotspur", "Newcastle United", "Aston Villa",
  "RB Leipzig", "Bayer Leverkusen", "Ajax", "Benfica", "Porto",
  "Sporting CP", "Celtic", "Rangers", "Marseille", "Lyon",
  "Monaco", "Villarreal", "Real Sociedad", "Athletic Bilbao", "Valencia",
  "Fiorentina", "Lazio", "Atalanta", "West Ham United", "Brighton",
  "Wolverhampton", "Everton", "Leicester City", "Leeds United", "Nottingham Forest",
  "Galatasaray", "Fenerbahce", "Besiktas", "Club Brugge", "Feyenoord"
];

export default function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showCustomClub, setShowCustomClub] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    location: "",
    sport_preference: "Football",
    position: "",
    skill_level: "intermediate",
    bio: "",
    favourite_club: "",
    custom_club: "",
    favourite_player: "",
    height_cm: "",
    weight_kg: "",
    date_of_birth: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (profile) {
      const savedClub = (profile as any).favourite_club || "";
      const isCustomClub = savedClub && !TOP_CLUBS.includes(savedClub);
      setShowCustomClub(isCustomClub);
      setFormData({
        name: profile.name || "",
        city: profile.city || "",
        location: profile.location || "",
        sport_preference: profile.sport_preference || "Football",
        position: profile.position || "",
        skill_level: profile.skill_level || "intermediate",
        bio: profile.bio || "",
        favourite_club: isCustomClub ? "other" : savedClub,
        custom_club: isCustomClub ? savedClub : "",
        favourite_player: (profile as any).favourite_player || "",
        height_cm: (profile as any).height_cm?.toString() || "",
        weight_kg: (profile as any).weight_kg?.toString() || "",
        date_of_birth: (profile as any).date_of_birth || "",
      });
    }
  }, [user, profile, loading, navigate]);

  const handleClubChange = (value: string) => {
    if (value === "other") {
      setShowCustomClub(true);
      setFormData({ ...formData, favourite_club: "other", custom_club: "" });
    } else {
      setShowCustomClub(false);
      setFormData({ ...formData, favourite_club: value, custom_club: "" });
    }
  };

  const getFinalClub = () => {
    if (formData.favourite_club === "other") {
      return formData.custom_club || null;
    }
    return formData.favourite_club || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
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
          favourite_club: getFinalClub(),
          favourite_player: formData.favourite_player || null,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
          date_of_birth: formData.date_of_birth || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container-app py-8">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {profile?.name?.charAt(0) || <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile?.name || "Your Profile"}</CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Bangalore"
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
                    <Label htmlFor="position">Preferred Position</Label>
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
                    <Label htmlFor="skill_level">Skill Level</Label>
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
                  <Label htmlFor="bio">Bio</Label>
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
                      <Select
                        value={formData.favourite_club}
                        onValueChange={handleClubChange}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a club" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-[300px]">
                          {TOP_CLUBS.map((club) => (
                            <SelectItem key={club} value={club}>{club}</SelectItem>
                          ))}
                          <SelectItem value="other">Other (Enter manually)</SelectItem>
                        </SelectContent>
                      </Select>
                      {showCustomClub && (
                        <Input
                          value={formData.custom_club}
                          onChange={(e) => setFormData({ ...formData, custom_club: e.target.value })}
                          placeholder="Enter your club name"
                          className="mt-2"
                        />
                      )}
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

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}