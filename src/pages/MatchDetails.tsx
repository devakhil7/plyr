import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOwnedTurfs, useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Calendar, Clock, Users, ArrowLeft, Play, Upload, Trophy, Target, Percent, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { MatchInviteDialog } from "@/components/match/MatchInviteDialog";
import { MatchShareDialog } from "@/components/match/MatchShareDialog";
import { FootballPitch } from "@/components/match/FootballPitch";
import { MatchStatsInput } from "@/components/match/MatchStatsInput";
import { MatchScorecard } from "@/components/match/MatchScorecard";
import { PlayerRatingsSection } from "@/components/match/PlayerRatingsSection";
import { AdminVideoTagger } from "@/components/match/AdminVideoTagger";
import { VideoHighlightEvents } from "@/components/match/VideoHighlightEvents";

const statusVariants: Record<string, "open" | "full" | "progress" | "completed" | "cancelled"> = {
  open: "open",
  full: "full",
  in_progress: "progress",
  completed: "completed",
  cancelled: "cancelled",
};

export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [bookingTurf, setBookingTurf] = useState(false);

  const { data: match, isLoading, refetch } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select(`
          *,
          turfs(*),
          profiles!matches_host_id_fkey(id, name, profile_photo_url),
          match_players(*, profiles(*)),
          analytics(*)
        `)
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Check if this match is part of a tournament
  const { data: tournamentMatch } = useQuery({
    queryKey: ["tournament-match", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_matches")
        .select("id, tournament_id, team_a_id, team_b_id, tournaments(name)")
        .eq("match_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const isTournamentMatch = !!tournamentMatch;

  // Auto-sync tournament roster players to match_players if missing
  useEffect(() => {
    const syncTournamentPlayersToMatch = async () => {
      if (!tournamentMatch || !match || !id) return;
      
      // Only sync if match has no players and tournament has assigned teams
      const hasPlayers = match.match_players && match.match_players.length > 0;
      const hasTeams = tournamentMatch.team_a_id || tournamentMatch.team_b_id;
      
      if (hasPlayers || !hasTeams) return;

      const syncTeamPlayers = async (teamId: string, teamSide: "A" | "B") => {
        const { data: teamPlayers } = await supabase
          .from("tournament_team_players")
          .select("*")
          .eq("tournament_team_id", teamId);

        if (teamPlayers && teamPlayers.length > 0) {
          for (const player of teamPlayers) {
            await supabase.from("match_players").insert({
              match_id: id,
              user_id: player.user_id || null,
              offline_player_name: player.user_id ? null : player.player_name,
              team: teamSide,
              role: "player",
              join_status: "confirmed",
            });
          }
        }
      };

      try {
        if (tournamentMatch.team_a_id) {
          await syncTeamPlayers(tournamentMatch.team_a_id, "A");
        }
        if (tournamentMatch.team_b_id) {
          await syncTeamPlayers(tournamentMatch.team_b_id, "B");
        }
        // Refetch match data to show synced players
        refetch();
      } catch (error) {
        console.error("Error syncing tournament players:", error);
      }
    };

    syncTournamentPlayersToMatch();
  }, [tournamentMatch, match?.match_players?.length, id]);

  // Check if user owns the turf for this match
  const { data: ownedTurfs = [] } = useOwnedTurfs();
  const { isAdmin } = useUserRoles();
  const isTurfOwner = match?.turf_id && ownedTurfs.some((ot: any) => ot.turfs?.id === match.turf_id);

  const isHost = user && match?.host_id === user.id;
  const canEditStats = isHost || isTurfOwner || isAdmin;
  const canTagEvents = isHost || isTurfOwner || isAdmin;
  const confirmedPlayers = match?.match_players?.filter((p: any) => p.join_status === "confirmed") || [];
  const isJoined = confirmedPlayers.some((p: any) => p.user_id === user?.id);
  const slotsLeft = (match?.total_slots || 0) - confirmedPlayers.length;
  const analytics = match?.analytics?.[0];

  // Fetch match events (goals/assists)
  const { data: matchEvents = [] } = useQuery({
    queryKey: ["match-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_events")
        .select(`
          *,
          scorer:profiles!match_events_scorer_user_id_fkey(id, name),
          assist:profiles!match_events_assist_user_id_fkey(id, name)
        `)
        .eq("match_id", id)
        .order("minute", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch player ratings for this match
  const { data: playerRatings = [] } = useQuery({
    queryKey: ["match-player-ratings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_ratings")
        .select("rated_user_id, rating")
        .eq("match_id", id)
        .eq("moderation_status", "approved");
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch video events (manually tagged events)
  const { data: videoEvents = [], refetch: refetchVideoEvents } = useQuery({
    queryKey: ["match-video-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_video_events")
        .select("*")
        .eq("match_id", id)
        .order("timestamp_seconds", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Check if turf is booked for this match
  const { data: turfBooking } = useQuery({
    queryKey: ["match-turf-booking", id],
    queryFn: async () => {
      if (!match?.turf_id) return null;
      const { data } = await supabase
        .from("turf_bookings")
        .select("*")
        .eq("match_id", id)
        .eq("payment_status", "completed")
        .maybeSingle();
      return data;
    },
    enabled: !!match?.turf_id && !!id,
  });

  const isTurfBooked = !!turfBooking;

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user || !match) throw new Error("Not authenticated");
      const { error } = await supabase.from("match_players").insert({
        match_id: match.id,
        user_id: user.id,
        role: "player",
        join_status: "confirmed",
        team: "unassigned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You've joined the match!");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to join match");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !match) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("match_id", match.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You've left the match");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to leave match");
    },
  });

  // Helper to convert time to end time
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
  };

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Book turf for this match
  const handleBookTurf = async () => {
    if (!user || !match || !match.turfs) return;

    setBookingTurf(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const amount = (match.turfs.price_per_hour || 0) * (match.duration_minutes / 60);
      const endTime = calculateEndTime(match.match_time, match.duration_minutes);

      // Create order
      const response = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          turf_id: match.turf_id,
          booking_date: match.match_date,
          start_time: match.match_time,
          end_time: endTime,
          duration_minutes: match.duration_minutes,
          amount: amount,
          match_id: match.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create order');
      }

      const orderData = response.data;

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SPORTIQ',
        description: `Turf Booking - ${match.turfs.name}`,
        order_id: orderData.order_id,
        handler: async (razorpayResponse: any) => {
          try {
            const verifyResponse = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                booking_id: orderData.booking_id,
              },
            });

            if (verifyResponse.error) {
              throw new Error('Payment verification failed');
            }

            toast.success('Turf booked successfully! Your slot is now reserved.');
            queryClient.invalidateQueries({ queryKey: ["match-turf-booking", id] });
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#0A3D91',
        },
        modal: {
          ondismiss: () => {
            setBookingTurf(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to process booking');
    } finally {
      setBookingTurf(false);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "open" | "full" | "in_progress" | "completed" | "cancelled") => {
      if (!match) throw new Error("No match");
      const { error } = await supabase
        .from("matches")
        .update({ status: newStatus })
        .eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match status updated");
      refetch();
    },
  });

  const generateAnalytics = async () => {
    if (!match) return;

    // Generate dummy analytics
    const teamAScore = Math.floor(Math.random() * 5);
    const teamBScore = Math.floor(Math.random() * 5);
    const possessionA = Math.floor(Math.random() * 40) + 30;

    const { error: analyticsError } = await supabase.from("analytics").insert({
      match_id: match.id,
      goals_team_a: teamAScore,
      goals_team_b: teamBScore,
      assists_team_a: Math.floor(Math.random() * teamAScore + 1),
      assists_team_b: Math.floor(Math.random() * teamBScore + 1),
      shots_on_target_a: teamAScore + Math.floor(Math.random() * 5),
      shots_on_target_b: teamBScore + Math.floor(Math.random() * 5),
      possession_team_a: possessionA,
      possession_team_b: 100 - possessionA,
      heatmap_url: "/placeholder.svg",
      highlights_url: "/placeholder.svg",
    });

    if (analyticsError) throw analyticsError;

    // Update match with score
    await supabase.from("matches").update({
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      analytics_status: "completed",
    }).eq("id", match.id);

    // Create feed post
    await supabase.from("feed_posts").insert({
      match_id: match.id,
      user_id: match.host_id,
      post_type: "highlight",
      caption: `Match completed: ${match.match_name} at ${match.turfs?.name}. Final Score: ${teamAScore} - ${teamBScore}`,
      media_url: "/placeholder.svg",
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !match) return;

    setUploading(true);
    try {
      // Update analytics status to processing
      await supabase.from("matches").update({ analytics_status: "processing" }).eq("id", match.id);
      refetch();

      // Upload video to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${match.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('match-videos')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('match-videos')
        .getPublicUrl(fileName);

      // Update match with video URL
      await supabase.from("matches").update({ 
        video_url: publicUrl,
        analytics_status: "completed" 
      }).eq("id", match.id);

      toast.success("Video uploaded successfully!");
      refetch();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || "Failed to upload video");
      // Reset analytics status on error
      await supabase.from("matches").update({ analytics_status: "none" }).eq("id", match.id);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading match...</div>
        </div>
      </AppLayout>
    );
  }

  if (!match) {
    return (
      <AppLayout>
        <div className="container-app py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Match not found</h2>
          <Link to="/matches">
            <Button className="btn-glow">Browse Matches</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-app py-4 space-y-4">
        {/* Back Button */}
        <Link to="/matches" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to matches
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="hero-gradient -mx-4 px-4 py-5 rounded-b-3xl lg:rounded-3xl lg:mx-0">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="sport" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  {match.sport}
                </Badge>
                <Badge variant={statusVariants[match.status] || "secondary"}>
                  {match.status === "in_progress" ? "In Progress" : match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-primary-foreground mb-4">{match.match_name}</h1>
              
              <div className="grid grid-cols-2 gap-3 text-primary-foreground/90">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <div>
                    <p className="font-medium text-sm">{match.turfs?.name}</p>
                    <p className="text-xs text-primary-foreground/70">{match.turfs?.location}, {match.turfs?.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(match.match_date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-primary-foreground/70">{match.match_time?.slice(0, 5)} • {match.duration_minutes} min</p>
                  </div>
                </div>
              </div>

              {/* Invite & Share Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {user && (isHost || isJoined) && match.status === "open" && (
                  <MatchInviteDialog
                    matchId={match.id}
                    matchDetails={{
                      name: match.match_name,
                      date: new Date(match.match_date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }),
                      time: match.match_time?.slice(0, 5),
                      turf: match.turfs?.name || "TBD",
                    }}
                    userId={user.id}
                    existingPlayerIds={confirmedPlayers.map((p: any) => p.user_id)}
                    matchCity={match.turfs?.city}
                  />
                )}
                <MatchShareDialog
                  matchId={match.id}
                  matchName={match.match_name}
                  matchDate={new Date(match.match_date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  matchTime={match.match_time?.slice(0, 5)}
                  turfName={match.turfs?.name || "TBD"}
                />
              </div>
            </div>
          </div>

          {/* Action Card */}
          <Card className="glass-card lg:w-80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Players</span>
                <span className="font-semibold">{confirmedPlayers.length}/{match.total_slots}</span>
              </div>
              <Progress value={(confirmedPlayers.length / match.total_slots) * 100} className="mb-4" />
              
              {user ? (
                isHost ? (
                  <div className="space-y-3">
                    {/* Turf Booking Status for Host */}
                    {match.turf_id && (
                      isTurfBooked ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-green-700">Turf Booked</p>
                            <p className="text-xs text-green-600">Payment confirmed</p>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          onClick={handleBookTurf}
                          disabled={bookingTurf}
                        >
                          {bookingTurf ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Book Turf (₹{((match.turfs?.price_per_hour || 0) * match.duration_minutes / 60).toLocaleString('en-IN')})
                            </>
                          )}
                        </Button>
                      )
                    )}
                    
                    {match.status === "open" && (
                      <Button className="w-full btn-glow" size="sm" onClick={() => updateStatusMutation.mutate("in_progress")}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Match
                      </Button>
                    )}
                    {match.status === "in_progress" && (
                      <Button className="w-full btn-glow" size="sm" onClick={() => updateStatusMutation.mutate("completed")}>
                        Complete Match
                      </Button>
                    )}
                    <p className="text-xs text-center text-muted-foreground">You're hosting this match</p>
                  </div>
                ) : isJoined ? (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending || match.status !== "open"}
                    >
                      {leaveMutation.isPending ? "Leaving..." : "Leave Match"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">You're in this match!</p>
                  </div>
                ) : isTournamentMatch ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-muted/50 border border-border rounded-lg text-center">
                      <Trophy className="h-4 w-4 mx-auto mb-2 text-primary" />
                      <p className="text-xs font-medium">Tournament Match</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Players join via team roster
                      </p>
                    </div>
                    <Link to={`/tournaments/${tournamentMatch?.tournament_id}`}>
                      <Button variant="outline" className="w-full" size="sm">
                        View Tournament
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button
                    className="w-full btn-glow"
                    size="sm"
                    onClick={() => joinMutation.mutate()}
                    disabled={joinMutation.isPending || slotsLeft === 0 || match.status !== "open"}
                  >
                    {joinMutation.isPending ? "Joining..." : slotsLeft === 0 ? "Match Full" : "Join Match"}
                  </Button>
                )
              ) : (
                <Link to="/auth">
                  <Button className="w-full btn-glow" size="sm">Sign in to Join</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-card w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="players">Players ({confirmedPlayers.length})</TabsTrigger>
            <TabsTrigger value="analytics">Video & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Match Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Skill Level</span>
                    <span className="capitalize">{match.required_skill_min} - {match.required_skill_max}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team Mode</span>
                    <span className="capitalize">{match.team_assignment_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility</span>
                    <span className="capitalize">{match.visibility}</span>
                  </div>
                  {match.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-xs mb-1">Notes</p>
                      <p className="text-xs">{match.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Host</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link 
                    to={`/players/${match.host_id}`}
                    className="flex items-center gap-3 hover:bg-accent/50 p-2 -m-2 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold overflow-hidden">
                      {match.profiles?.profile_photo_url ? (
                        <img src={match.profiles.profile_photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        match.profiles?.name?.charAt(0) || "H"
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm hover:text-primary">{match.profiles?.name || "Host"}</p>
                      <p className="text-xs text-muted-foreground">Match Organizer</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Players on the Pitch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FootballPitch
                  matchId={match.id}
                  players={confirmedPlayers.map((mp: any) => ({
                    id: mp.id,
                    user_id: mp.user_id,
                    team: mp.team as "A" | "B" | "unassigned",
                    role: mp.role,
                    profiles: mp.profiles,
                  }))}
                  isHost={!!isHost}
                  teamAssignmentMode={match.team_assignment_mode || "auto"}
                  totalSlots={match.total_slots || 10}
                  onRefetch={refetch}
                />
              </CardContent>
            </Card>

            {/* Player Ratings Section - Only show for completed matches */}
            {match.status === "completed" && user && isJoined && (
              <PlayerRatingsSection
                matchId={match.id}
                userId={user.id}
                players={confirmedPlayers
                  .filter((p: any) => p.user_id)
                  .map((mp: any) => ({
                    user_id: mp.user_id,
                    profiles: mp.profiles,
                  }))}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {match.status === "completed" ? (
              <>
                {/* Share Scorecard Button */}
                {match.team_a_score !== null && (
                  <div className="flex justify-end">
                    <MatchScorecard
                      matchId={match.id}
                      matchName={match.match_name}
                      matchDate={new Date(match.match_date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      turfName={match.turfs?.name}
                      teamAScore={match.team_a_score}
                      teamBScore={match.team_b_score}
                      matchEvents={matchEvents}
                      players={confirmedPlayers.map((mp: any) => ({
                        user_id: mp.user_id,
                        team: mp.team,
                        profiles: mp.profiles,
                      }))}
                      playerRatings={playerRatings}
                    />
                  </div>
                )}

                {/* Score Display - Derived from match events if available */}
                {(matchEvents.length > 0 || match.team_a_score !== null) && (
                  <Card className="glass-card bg-gradient-to-r from-primary/5 to-secondary/5">
                    <CardContent className="p-6 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Final Score</p>
                      <div className="flex items-center justify-center gap-6">
                        <div>
                          <p className="text-3xl font-bold">
                            {matchEvents.length > 0 
                              ? matchEvents.filter((e: any) => e.team === "A").length 
                              : match.team_a_score}
                          </p>
                          <p className="text-xs text-muted-foreground">Team A</p>
                        </div>
                        <span className="text-xl text-muted-foreground">-</span>
                        <div>
                          <p className="text-3xl font-bold">
                            {matchEvents.length > 0 
                              ? matchEvents.filter((e: any) => e.team === "B").length 
                              : match.team_b_score}
                          </p>
                          <p className="text-xs text-muted-foreground">Team B</p>
                        </div>
                      </div>
                      {matchEvents.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Based on {matchEvents.length} recorded goal{matchEvents.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Goal Scorers & Assists Display */}
                {matchEvents.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        Goal Scorers & Assists
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {matchEvents.map((event: any) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                          >
                            <Badge variant={event.team === "A" ? "default" : "secondary"} className="text-xs">
                              Team {event.team}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">⚽ {event.scorer?.name || "Unknown"}</span>
                                {event.minute && (
                                  <span className="text-xs text-muted-foreground">({event.minute}')</span>
                                )}
                              </div>
                              {event.assist?.name && (
                                <p className="text-xs text-muted-foreground">
                                  Assist: {event.assist.name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Match Video Player */}
                {match.video_url && (
                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Play className="h-4 w-4 text-primary" />
                        Match Video
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden rounded-lg border bg-muted/30">
                        <video
                          src={match.video_url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full aspect-video bg-muted object-contain"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Video Highlight Events - Visible to everyone */}
                <VideoHighlightEvents 
                  events={videoEvents}
                  videoUrl={match.video_url}
                  matchId={match.id}
                  matchName={match.match_name}
                />

                {/* Analytics */}
                {analytics && (
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-lg font-bold">{analytics.goals_team_a} - {analytics.goals_team_b}</p>
                        <p className="text-xs text-muted-foreground">Goals</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <Target className="h-6 w-6 mx-auto mb-2 text-accent" />
                        <p className="text-lg font-bold">{analytics.shots_on_target_a} - {analytics.shots_on_target_b}</p>
                        <p className="text-xs text-muted-foreground">Shots on Target</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <Percent className="h-6 w-6 mx-auto mb-2 text-secondary" />
                        <p className="text-lg font-bold">{analytics.possession_team_a}% - {analytics.possession_team_b}%</p>
                        <p className="text-xs text-muted-foreground">Possession</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Manual Stats Input for Host/Turf Owner */}
                {canEditStats && (
                  <MatchStatsInput
                    matchId={match.id}
                    players={confirmedPlayers.map((mp: any) => ({
                      user_id: mp.user_id,
                      team: mp.team,
                      profiles: mp.profiles,
                    }))}
                    existingScore={{
                      teamA: match.team_a_score,
                      teamB: match.team_b_score,
                    }}
                    videoUrl={match.video_url}
                    existingEvents={matchEvents}
                    onUpdate={() => {
                      refetch();
                      queryClient.invalidateQueries({ queryKey: ["match-events", id] });
                    }}
                  />
                )}

                {/* Admin Video Event Tagger */}
                {canTagEvents && match.video_url && (
                  <AdminVideoTagger
                    matchId={match.id}
                    videoUrl={match.video_url}
                    matchPlayers={confirmedPlayers.map((mp: any) => ({
                      id: mp.id,
                      user_id: mp.user_id,
                      team: mp.team,
                      profiles: mp.profiles,
                      offline_player_name: mp.offline_player_name,
                    }))}
                    onEventAdded={refetchVideoEvents}
                  />
                )}
              </>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="font-semibold text-sm mb-1">Match Not Yet Complete</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Analytics and video highlights will be available after the match is completed.
                  </p>

                  {match.video_url && (
                    <div className="mt-4 overflow-hidden rounded-lg border bg-muted/30">
                      <video
                        src={match.video_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full aspect-video bg-muted object-contain"
                      />
                    </div>
                  )}

                  {isHost && match.analytics_status !== "processing" && (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        As the host, you can upload match video to generate highlights:
                      </p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoUpload}
                          disabled={uploading}
                        />
                        <Button variant="outline" size="sm" disabled={uploading}>
                          {uploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {uploading ? "Processing..." : "Upload Match Video"}
                        </Button>
                      </label>
                    </>
                  )}
                  {match.analytics_status === "processing" && (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing video...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
