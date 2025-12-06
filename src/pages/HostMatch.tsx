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
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const skillLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function HostMatch() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    match_name: "",
    sport: "Football",
    turf_id: "",
    match_date: "",
    match_time: "",
    duration_minutes: 60,
    visibility: "public",
    required_skill_min: "beginner",
    required_skill_max: "advanced",
    total_slots: 10,
    team_assignment_mode: "auto",
    notes: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && user && profile && !profile.profile_completed) {
      navigate("/complete-profile");
    }
  }, [user, profile, loading, navigate]);

  const { data: turfs } = useQuery({
    queryKey: ["all-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").order("name");
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      // Create match
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          match_name: formData.match_name,
          sport: formData.sport,
          turf_id: formData.turf_id || null,
          match_date: formData.match_date,
          match_time: formData.match_time,
          duration_minutes: formData.duration_minutes,
          visibility: formData.visibility as "public" | "private",
          required_skill_min: formData.required_skill_min as "beginner" | "intermediate" | "advanced",
          required_skill_max: formData.required_skill_max as "beginner" | "intermediate" | "advanced",
          total_slots: formData.total_slots,
          team_assignment_mode: formData.team_assignment_mode as "auto" | "manual",
          notes: formData.notes,
          host_id: user.id,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Add host as player
      const { error: playerError } = await supabase.from("match_players").insert({
        match_id: match.id,
        user_id: user.id,
        role: "host",
        join_status: "confirmed",
        team: "A",
      });

      if (playerError) throw playerError;

      toast.success("Match created successfully!");
      navigate(`/matches/${match.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create match");
    } finally {
      setSubmitting(false);
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
              <CardTitle className="text-2xl">Host a Match</CardTitle>
              <CardDescription>Create a new match and invite players to join</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="match_name">Match Name *</Label>
                  <Input
                    id="match_name"
                    value={formData.match_name}
                    onChange={(e) => setFormData({ ...formData, match_name: e.target.value })}
                    placeholder="e.g., Saturday Evening Football"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sport">Sport</Label>
                    <Select
                      value={formData.sport}
                      onValueChange={(value) => setFormData({ ...formData, sport: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Football">Football</SelectItem>
                        <SelectItem value="Cricket">Cricket</SelectItem>
                        <SelectItem value="Basketball">Basketball</SelectItem>
                        <SelectItem value="Badminton">Badminton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turf_id">Turf</Label>
                    <Select
                      value={formData.turf_id}
                      onValueChange={(value) => setFormData({ ...formData, turf_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a turf" />
                      </SelectTrigger>
                      <SelectContent>
                        {turfs?.map((turf: any) => (
                          <SelectItem key={turf.id} value={turf.id}>
                            {turf.name} - {turf.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="match_date">Date *</Label>
                    <Input
                      id="match_date"
                      type="date"
                      value={formData.match_date}
                      onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="match_time">Time *</Label>
                    <Input
                      id="match_time"
                      type="time"
                      value={formData.match_time}
                      onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Select
                      value={String(formData.duration_minutes)}
                      onValueChange={(value) => setFormData({ ...formData, duration_minutes: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_slots">Total Player Slots</Label>
                    <Select
                      value={String(formData.total_slots)}
                      onValueChange={(value) => setFormData({ ...formData, total_slots: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 players</SelectItem>
                        <SelectItem value="10">10 players</SelectItem>
                        <SelectItem value="14">14 players</SelectItem>
                        <SelectItem value="22">22 players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public (anyone can join)</SelectItem>
                        <SelectItem value="private">Private (invite only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Skill Level</Label>
                    <Select
                      value={formData.required_skill_min}
                      onValueChange={(value) => setFormData({ ...formData, required_skill_min: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {skillLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Skill Level</Label>
                    <Select
                      value={formData.required_skill_max}
                      onValueChange={(value) => setFormData({ ...formData, required_skill_max: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional info for players..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? "Creating Match..." : "Create Match"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
