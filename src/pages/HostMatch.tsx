import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, IndianRupee, Navigation, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { CalendarSlotPicker } from "@/components/CalendarSlotPicker";
import { useGeolocation, calculateDistance, formatDistance, getCityCoordinates } from "@/hooks/useGeolocation";
import { Badge } from "@/components/ui/badge";

const skillLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function HostMatch() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const geolocation = useGeolocation();
  const [formData, setFormData] = useState({
    sport: "Football",
    turf_id: searchParams.get("turf") || "",
    visibility: "public",
    required_skill_min: "beginner",
    required_skill_max: "advanced",
    total_slots: 10,
    team_assignment_mode: "auto",
    notes: "",
  });

  const { data: turfs } = useQuery({
    queryKey: ["all-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").order("name");
      return data || [];
    },
  });

  // Calculate distances for turfs and sort by distance
  const turfsWithDistance = useMemo(() => {
    if (!turfs) return [];
    
    return turfs.map((turf: any) => {
      let distance: number | null = null;
      
      // Try to calculate distance from user location
      if (geolocation.latitude && geolocation.longitude) {
        if (turf.latitude && turf.longitude) {
          distance = calculateDistance(
            geolocation.latitude,
            geolocation.longitude,
            Number(turf.latitude),
            Number(turf.longitude)
          );
        } else {
          // Fall back to city coordinates
          const cityCoords = getCityCoordinates(turf.city);
          if (cityCoords) {
            distance = calculateDistance(
              geolocation.latitude,
              geolocation.longitude,
              cityCoords.lat,
              cityCoords.lng
            );
          }
        }
      }
      
      return { ...turf, distance };
    }).sort((a: any, b: any) => {
      // Sort by distance (nulls last)
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [turfs, geolocation.latitude, geolocation.longitude]);

  // Get selected turf details
  const selectedTurf = useMemo(() => {
    return turfsWithDistance.find((t: any) => t.id === formData.turf_id);
  }, [turfsWithDistance, formData.turf_id]);

  // Generate match name automatically
  const generateMatchName = () => {
    const dayName = format(selectedDate, "EEEE"); // e.g., "Saturday"
    const timeOfDay = selectedTime ? (() => {
      const hour = parseInt(selectedTime.split(":")[0]);
      if (hour < 12) return "Morning";
      if (hour < 17) return "Afternoon";
      return "Evening";
    })() : "";
    
    const turfName = selectedTurf?.name || "";
    
    if (turfName && timeOfDay) {
      return `${dayName} ${timeOfDay} ${formData.sport} @ ${turfName}`;
    } else if (timeOfDay) {
      return `${dayName} ${timeOfDay} ${formData.sport}`;
    }
    return `${dayName} ${formData.sport} Match`;
  };

  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem("redirectAfterAuth", window.location.pathname + window.location.search);
      navigate("/auth");
    } else if (!loading && user && profile && !profile.profile_completed) {
      navigate("/complete-profile");
    }
  }, [user, profile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedTime) {
      toast.error("Please select a time slot");
      return;
    }

    setSubmitting(true);
    try {
      // Generate match name automatically
      const matchName = generateMatchName();
      
      // Create match
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          match_name: matchName,
          sport: formData.sport,
          turf_id: formData.turf_id || null,
          match_date: format(selectedDate, "yyyy-MM-dd"),
          match_time: selectedTime,
          duration_minutes: duration,
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
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false}>
      <div className="container-app py-4 space-y-4">
        {/* Header */}
        <div className="hero-gradient -mx-4 px-4 py-6 rounded-b-3xl mb-2">
          <Link to="/dashboard" className="inline-flex items-center text-sm text-primary-foreground/70 hover:text-primary-foreground mb-3">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <Play className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Host a Match</h1>
              <p className="text-sm text-primary-foreground/70">Create and invite players</p>
            </div>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      <SelectContent className="max-h-80">
                        {turfsWithDistance.map((turf: any) => (
                          <SelectItem key={turf.id} value={turf.id} className="py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{turf.name}</span>
                                {turf.is_featured && (
                                  <Badge variant="secondary" className="text-xs">Featured</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {turf.location}, {turf.city}
                                </span>
                                {turf.distance !== null && (
                                  <span className="flex items-center gap-1 text-primary">
                                    <Navigation className="h-3 w-3" />
                                    {formatDistance(turf.distance)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <IndianRupee className="h-3 w-3" />
                                  {turf.price_per_hour}/hr
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Location status */}
                    {geolocation.loading ? (
                      <p className="text-xs text-muted-foreground">Detecting location...</p>
                    ) : geolocation.error ? (
                      <p className="text-xs text-muted-foreground">Enable location for distance sorting</p>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Navigation className="h-3 w-3 text-primary" />
                        Sorted by distance from your location
                      </p>
                    )}
                  </div>
                </div>

                {/* Selected Turf Details Card */}
                {selectedTurf && (
                  <Card className="bg-muted/30 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{selectedTurf.name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {selectedTurf.location}, {selectedTurf.city}
                            </span>
                            {selectedTurf.distance !== null && (
                              <span className="flex items-center gap-1 text-primary">
                                <Navigation className="h-4 w-4" />
                                {formatDistance(selectedTurf.distance)} away
                              </span>
                            )}
                          </div>
                          {selectedTurf.sport_type && (
                            <Badge variant="outline" className="text-xs">
                              {selectedTurf.sport_type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary flex items-center">
                            <IndianRupee className="h-5 w-5" />
                            {selectedTurf.price_per_hour}
                          </div>
                          <p className="text-xs text-muted-foreground">per hour</p>
                          {duration && (
                            <p className="text-sm font-medium mt-1">
                              Est. ₹{Math.round((selectedTurf.price_per_hour || 0) * (duration / 60))} for {duration} mins
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Calendar Slot Picker */}
                <div className="space-y-2">
                  <Label>Select Date & Time Slot *</Label>
                  <CalendarSlotPicker
                    turfId={formData.turf_id || null}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    duration={duration}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                    onDurationChange={setDuration}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_slots">Maximum Players</Label>
                    <Input
                      id="total_slots"
                      type="number"
                      min={2}
                      max={22}
                      value={formData.total_slots}
                      onChange={(e) => setFormData({ ...formData, total_slots: Math.min(22, Math.max(2, Number(e.target.value) || 2)) })}
                      placeholder="Enter max players (2-22)"
                    />
                    <p className="text-xs text-muted-foreground">Players per team: {Math.ceil(formData.total_slots / 2)}</p>
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

                <Button type="submit" className="w-full btn-glow" size="lg" disabled={submitting}>
                  {submitting ? "Creating Match..." : "Create Match"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }
