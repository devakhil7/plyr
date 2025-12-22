import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, IndianRupee, ArrowLeft, Calendar, Users, Clock, Phone, Star, CreditCard, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { TurfBookingDialog } from "@/components/TurfBookingDialog";

export default function TurfDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const { data: turf, isLoading } = useQuery({
    queryKey: ["turf", id],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").eq("id", id).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: upcomingMatches } = useQuery({
    queryKey: ["turf-matches", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select(`*, profiles!matches_host_id_fkey(name), match_players(user_id, join_status)`)
        .eq("turf_id", id)
        .eq("visibility", "public")
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!id,
  });

  // Separate photos and videos from turf.photos array
  const { photos, video } = useMemo(() => {
    const allMedia = turf?.photos || [];
    const videoExtensions = ['.mp4', '.webm', '.mov'];
    const videoItem = allMedia.find((url: string) => 
      videoExtensions.some(ext => url.toLowerCase().includes(ext))
    );
    const photoItems = allMedia.filter((url: string) => 
      !videoExtensions.some(ext => url.toLowerCase().includes(ext))
    );
    return { photos: photoItems, video: videoItem || null };
  }, [turf?.photos]);

  const allMedia = useMemo(() => {
    const items: { type: 'photo' | 'video'; url: string }[] = photos.map((url: string) => ({ type: 'photo' as const, url }));
    if (video) items.push({ type: 'video', url: video });
    return items;
  }, [photos, video]);

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % allMedia.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!turf) {
    return (
      <AppLayout>
        <div className="container-app py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Turf not found</h2>
          <Link to="/turfs">
            <Button>Browse Turfs</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-app py-8">
        <Link to="/turfs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to turfs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero with Media Gallery */}
            <Card className="overflow-hidden">
              <div className="relative h-72 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20">
                {allMedia.length > 0 ? (
                  <>
                    {allMedia[currentMediaIndex].type === 'photo' ? (
                      <img
                        src={allMedia[currentMediaIndex].url}
                        alt={`${turf.name} photo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={allMedia[currentMediaIndex].url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Navigation arrows */}
                    {allMedia.length > 1 && (
                      <>
                        <button
                          onClick={prevMedia}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={nextMedia}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Thumbnail strip */}
                    {allMedia.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-background/80 backdrop-blur-sm rounded-lg">
                        {allMedia.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentMediaIndex(index)}
                            className={`relative w-12 h-8 rounded overflow-hidden border-2 transition-all ${
                              index === currentMediaIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            {item.type === 'photo' ? (
                              <img src={item.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Play className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-4xl">⚽</span>
                    </div>
                  </div>
                )}
                
                {turf.is_featured && (
                  <Badge className="absolute top-4 right-4 bg-amber-500 text-white">
                    <Star className="h-3 w-3 mr-1" /> Featured Venue
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="sport" className="mb-2">{turf.sport_type}</Badge>
                    <h1 className="text-2xl font-bold">{turf.name}</h1>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-2xl font-bold text-primary">
                      <IndianRupee className="h-6 w-6" />
                      {turf.price_per_hour}
                    </div>
                    <p className="text-sm text-muted-foreground">per hour</p>
                  </div>
                </div>

                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{turf.location}, {turf.city}</span>
                </div>

                {turf.description && (
                  <p className="text-muted-foreground">{turf.description}</p>
                )}

                {turf.owner_contact && (
                  <div className="flex items-center mt-4 pt-4 border-t border-border">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{turf.owner_contact}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Matches at This Turf</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingMatches && upcomingMatches.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingMatches.map((match: any) => {
                      const confirmedPlayers = match.match_players?.filter((p: any) => p.join_status === "confirmed").length || 0;
                      return (
                        <Link
                          key={match.id}
                          to={`/matches/${match.id}`}
                          className="block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{match.match_name}</h4>
                            <Badge variant="open">Open</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {new Date(match.match_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              {match.match_time?.slice(0, 5)}
                            </span>
                            <span className="flex items-center">
                              <Users className="h-3.5 w-3.5 mr-1" />
                              {confirmedPlayers}/{match.total_slots}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">No upcoming matches at this turf</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Book Turf Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Book This Turf
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Reserve your slot and pay securely online.
                </p>
                <div className="flex items-center justify-between mb-4 p-3 bg-background rounded-lg">
                  <span className="text-sm text-muted-foreground">Starting at</span>
                  <span className="text-xl font-bold text-primary">₹{turf.price_per_hour}/hr</span>
                </div>
                {user ? (
                  <Button className="w-full" size="lg" onClick={() => setBookingOpen(true)}>
                    Book Now
                  </Button>
                ) : (
                  <Link to="/auth">
                    <Button className="w-full" size="lg">Sign In to Book</Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Host a Match Here</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Organize a game at this venue and invite players to join.
                </p>
                {user ? (
                  <Link to={`/host-match?turf=${turf.id}`}>
                    <Button className="w-full" variant="outline">Host a Match</Button>
                  </Link>
                ) : (
                  <Link to="/auth">
                    <Button className="w-full" variant="outline">Sign In to Host</Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Venue Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sport</span>
                    <span className="font-medium">{turf.sport_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City</span>
                    <span className="font-medium">{turf.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">₹{turf.price_per_hour}/hr</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <TurfBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        turf={turf}
        onBookingComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["turf-bookings"] });
        }}
      />
    </AppLayout>
  );
}
