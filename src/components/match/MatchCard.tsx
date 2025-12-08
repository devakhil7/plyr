import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MatchCardProps {
  match: {
    id: string;
    match_name: string;
    sport: string;
    status: string;
    match_date: string;
    match_time: string;
    duration_minutes: number;
    total_slots: number;
    required_skill_min: string;
    turfs?: { name: string; city: string; location: string } | null;
    profiles?: { name: string } | null;
    match_players?: { user_id: string; join_status: string }[] | null;
  };
}

const statusVariants: Record<string, "open" | "full" | "progress" | "completed" | "cancelled"> = {
  open: "open",
  full: "full",
  in_progress: "progress",
  completed: "completed",
  cancelled: "cancelled",
};

// Tier colors matching the PlayerCard component
const tierColors = {
  gold: {
    bg: "bg-amber-500",
    text: "text-amber-900",
  },
  silver: {
    bg: "bg-slate-400",
    text: "text-slate-900",
  },
  bronze: {
    bg: "bg-orange-700",
    text: "text-orange-100",
  },
};

function getTierFromRating(overallRating: number): "gold" | "silver" | "bronze" {
  if (overallRating >= 80) return "gold";
  if (overallRating >= 60) return "silver";
  return "bronze";
}

function convertTo100(value: number | null): number {
  if (value === null || value === undefined) return 50;
  return Math.round((value / 5) * 100);
}

function calculateOverallFromStats(stats: {
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  ball_control: number | null;
}): number {
  const pace = convertTo100(stats.pace);
  const shooting = convertTo100(stats.shooting);
  const passing = convertTo100(stats.passing);
  const dribbling = convertTo100(stats.dribbling);
  const defending = convertTo100(stats.defending);
  const ballControl = convertTo100(stats.ball_control);
  
  return Math.round((pace + shooting + passing + dribbling + defending + ballControl) / 6);
}

export function MatchCard({ match }: MatchCardProps) {
  const confirmedPlayerIds = match.match_players
    ?.filter((p) => p.join_status === "confirmed" && p.user_id)
    .map((p) => p.user_id) || [];

  // Check if slot is confirmed (paid booking exists)
  const { data: slotConfirmed } = useQuery({
    queryKey: ["match-slot-status", match.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("turf_bookings")
        .select("id, payment_status")
        .eq("match_id", match.id)
        .eq("payment_status", "paid")
        .maybeSingle();
      
      return !!data;
    },
    staleTime: 60000,
  });

  // Fetch player ratings to determine tiers
  const { data: playerTiers } = useQuery({
    queryKey: ["match-player-tiers", match.id, confirmedPlayerIds],
    queryFn: async () => {
      if (confirmedPlayerIds.length === 0) return { gold: 0, silver: 0, bronze: 0 };

      // Get average ratings for each player
      const { data: ratings } = await supabase
        .from("player_ratings")
        .select("rated_user_id, pace, shooting, passing, dribbling, defending, ball_control")
        .in("rated_user_id", confirmedPlayerIds)
        .eq("moderation_status", "approved");

      // Calculate tier counts
      const tierCounts = { gold: 0, silver: 0, bronze: 0 };
      const playerRatings: Record<string, { count: number; totals: any }> = {};

      // Aggregate ratings per player
      ratings?.forEach((r) => {
        if (!playerRatings[r.rated_user_id]) {
          playerRatings[r.rated_user_id] = {
            count: 0,
            totals: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, ball_control: 0 },
          };
        }
        const pr = playerRatings[r.rated_user_id];
        pr.count++;
        pr.totals.pace += r.pace || 0;
        pr.totals.shooting += r.shooting || 0;
        pr.totals.passing += r.passing || 0;
        pr.totals.dribbling += r.dribbling || 0;
        pr.totals.defending += r.defending || 0;
        pr.totals.ball_control += r.ball_control || 0;
      });

      // Calculate tier for each confirmed player
      confirmedPlayerIds.forEach((playerId) => {
        const pr = playerRatings[playerId];
        if (pr && pr.count > 0) {
          const avgStats = {
            pace: pr.totals.pace / pr.count,
            shooting: pr.totals.shooting / pr.count,
            passing: pr.totals.passing / pr.count,
            dribbling: pr.totals.dribbling / pr.count,
            defending: pr.totals.defending / pr.count,
            ball_control: pr.totals.ball_control / pr.count,
          };
          const overall = calculateOverallFromStats(avgStats);
          const tier = getTierFromRating(overall);
          tierCounts[tier]++;
        } else {
          // Players without ratings default to bronze
          tierCounts.bronze++;
        }
      });

      return tierCounts;
    },
    enabled: confirmedPlayerIds.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });

  const confirmedPlayers = confirmedPlayerIds.length;
  const slotsLeft = match.total_slots - confirmedPlayers;

  return (
    <Link to={`/matches/${match.id}`}>
      <Card className="h-full card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="sport">{match.sport}</Badge>
              {slotConfirmed ? (
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmed
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unconfirmed
                </Badge>
              )}
            </div>
            <Badge variant={statusVariants[match.status] || "secondary"}>
              {match.status === "in_progress" ? "In Progress" : match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-lg mb-3">{match.match_name}</h3>

          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{match.turfs?.name}, {match.turfs?.city}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              {new Date(match.match_date).toLocaleDateString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
              {match.match_time?.slice(0, 5)} • {match.duration_minutes} min
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                {confirmedPlayers}/{match.total_slots} players
                {slotsLeft > 0 && (
                  <span className="ml-2 text-accent font-medium">({slotsLeft} left)</span>
                )}
              </div>
            </div>
            
            {/* Player Tier Indicators */}
            {confirmedPlayers > 0 && playerTiers && (
              <div className="flex items-center gap-2 pt-1">
                {playerTiers.gold > 0 && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${tierColors.gold.bg} ${tierColors.gold.text} text-xs font-semibold`}>
                    <span className="text-[10px]">🥇</span>
                    <span>{playerTiers.gold}</span>
                  </div>
                )}
                {playerTiers.silver > 0 && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${tierColors.silver.bg} ${tierColors.silver.text} text-xs font-semibold`}>
                    <span className="text-[10px]">🥈</span>
                    <span>{playerTiers.silver}</span>
                  </div>
                )}
                {playerTiers.bronze > 0 && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${tierColors.bronze.bg} ${tierColors.bronze.text} text-xs font-semibold`}>
                    <span className="text-[10px]">🥉</span>
                    <span>{playerTiers.bronze}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Hosted by {match.profiles?.name || "Player"}
            </span>
            <Badge variant={match.required_skill_min as any} className="capitalize">
              {match.required_skill_min}+
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
