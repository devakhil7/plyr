import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface TournamentPlayerCardProps {
  player: {
    id: string;
    player_name: string;
    jersey_number?: number | null;
    position?: string | null;
    user_id?: string | null;
    profile?: {
      profile_photo_url?: string | null;
      skill_level?: string | null;
    } | null;
  };
  index: number;
  rating?: number; // Actual rating from player_ratings table (1-100 scale)
}

type CardTier = "gold" | "silver" | "bronze";

// Same tier colors as PlayerCard.tsx for consistency
const tierColors = {
  gold: {
    primary: "45 90% 55%",
    secondary: "40 85% 45%",
    accent: "45 100% 70%",
    cardBg: "#1a1508",
    textPrimary: "45 90% 65%",
    textSecondary: "45 70% 75%",
  },
  silver: {
    primary: "220 15% 70%",
    secondary: "220 10% 55%",
    accent: "220 20% 80%",
    cardBg: "#151820",
    textPrimary: "220 15% 75%",
    textSecondary: "220 10% 65%",
  },
  bronze: {
    primary: "25 60% 45%",
    secondary: "20 55% 35%",
    accent: "30 65% 55%",
    cardBg: "#1a1210",
    textPrimary: "25 55% 60%",
    textSecondary: "25 45% 50%",
  },
};

const getPositionAbbrev = (position: string | null | undefined) => {
  if (!position) return "POS";
  const abbrevMap: Record<string, string> = {
    "Goalkeeper": "GK",
    "Defender": "DEF",
    "Center Back": "CB",
    "Left Back": "LB",
    "Right Back": "RB",
    "Midfielder": "MID",
    "Central Midfielder": "CM",
    "Defensive Midfielder": "CDM",
    "Attacking Midfielder": "CAM",
    "Left Midfielder": "LM",
    "Right Midfielder": "RM",
    "Forward": "FWD",
    "Striker": "ST",
    "Left Winger": "LW",
    "Right Winger": "RW",
    "Center Forward": "CF",
  };
  return abbrevMap[position] || position.substring(0, 3).toUpperCase();
};

// Tier based on actual rating
const getTierFromRating = (rating: number | undefined): CardTier => {
  if (!rating) return "bronze";
  if (rating >= 80) return "gold";
  if (rating >= 60) return "silver";
  return "bronze";
};

export function TournamentPlayerCard({ player, index, rating }: TournamentPlayerCardProps) {
  const isRegisteredUser = !!player.user_id;
  const positionAbbrev = getPositionAbbrev(player.position);
  
  // Use actual rating to determine tier
  const tier = getTierFromRating(rating);
  const colors = tierColors[tier];
  
  // Display actual rating or "-" if not available
  const displayRating = rating ? rating.toString() : "-";

  return (
    <div className="relative w-[100px] mx-auto group">
      {/* Card Shape SVG - matching PlayerCard style */}
      <svg
        viewBox="0 0 100 140"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`tierGradient-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`hsl(${colors.primary})`} />
            <stop offset="50%" stopColor={`hsl(${colors.accent})`} />
            <stop offset="100%" stopColor={`hsl(${colors.secondary})`} />
          </linearGradient>
          <filter id={`cardShadow-${player.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
          </filter>
        </defs>
        
        {/* Main card shape */}
        <path
          d="M 8 0 
             L 92 0 
             Q 100 0 100 8 
             L 100 120 
             Q 100 130 93 135 
             L 57 140 
             Q 50 142 43 140 
             L 7 135 
             Q 0 130 0 120 
             L 0 8 
             Q 0 0 8 0"
          fill={colors.cardBg}
          stroke={`url(#tierGradient-${player.id})`}
          strokeWidth="2"
          filter={`url(#cardShadow-${player.id})`}
        />
        
        {/* Inner decorative line */}
        <path
          d="M 10 4 
             L 90 4 
             Q 96 4 96 10 
             L 96 118 
             Q 96 126 90 130 
             L 56 135 
             Q 50 137 44 135 
             L 10 130 
             Q 4 126 4 118 
             L 4 10 
             Q 4 4 10 4"
          fill="none"
          stroke={`url(#tierGradient-${player.id})`}
          strokeWidth="0.5"
          opacity="0.4"
        />
        
        {/* Diagonal shine effect */}
        <path
          d="M 20 0 L 50 0 L 30 40 L 0 40 L 0 20 Z"
          fill={`url(#tierGradient-${player.id})`}
          opacity="0.08"
        />
      </svg>

      {/* Card Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center p-2 pt-2">
        {/* Top Section - Rating and Position */}
        <div className="w-full flex justify-between items-start mb-1 px-1">
          <div className="text-left">
            <div 
              className="text-lg font-black leading-none" 
              style={{ 
                fontFamily: "'Space Grotesk', sans-serif",
                color: `hsl(${colors.textPrimary})`,
                textShadow: `0 0 10px hsl(${colors.primary} / 0.5)`
              }}
            >
              {displayRating}
            </div>
            <div 
              className="text-[8px] font-bold tracking-wider"
              style={{ color: `hsl(${colors.textSecondary})` }}
            >
              {positionAbbrev}
            </div>
          </div>
          
          {/* Tier Badge */}
          <div 
            className="px-1.5 py-0.5 rounded-full text-[6px] font-bold uppercase tracking-wider"
            style={{ 
              background: `linear-gradient(135deg, hsl(${colors.primary} / 0.3), hsl(${colors.secondary} / 0.3))`,
              color: `hsl(${colors.textPrimary})`,
              border: `1px solid hsl(${colors.primary} / 0.5)`
            }}
          >
            {tier}
          </div>
        </div>

        {/* Player Avatar */}
        <div className="relative my-1">
          <div 
            className="absolute inset-0 rounded-full blur-md scale-110" 
            style={{ background: `radial-gradient(circle, hsl(${colors.primary} / 0.3), transparent)` }}
          />
          <Avatar 
            className="h-12 w-12 relative"
            style={{ 
              border: `2px solid hsl(${colors.primary} / 0.6)`,
              boxShadow: `0 0 15px hsl(${colors.primary} / 0.3)`
            }}
          >
            {isRegisteredUser && player.profile?.profile_photo_url ? (
              <AvatarImage src={player.profile.profile_photo_url} className="object-cover" />
            ) : null}
            <AvatarFallback 
              className="text-lg font-bold"
              style={{ 
                background: `linear-gradient(135deg, hsl(${colors.primary} / 0.3), hsl(${colors.secondary} / 0.3))`,
                color: `hsl(${colors.textPrimary})`
              }}
            >
              {player.player_name?.charAt(0) || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Player Name */}
        <div className="text-center w-full px-1">
          <h3 
            className="text-[9px] font-bold truncate" 
            style={{ 
              fontFamily: "'Space Grotesk', sans-serif",
              color: `hsl(${colors.textPrimary})`
            }}
          >
            {player.player_name || "Player"}
          </h3>
        </div>

        {/* Jersey Number - bottom left */}
        <div 
          className="absolute bottom-3 left-2 text-[8px] font-bold"
          style={{ color: `hsl(${colors.textSecondary})` }}
        >
          #{player.jersey_number || index + 1}
        </div>

        {/* Guest indicator for non-registered */}
        {!isRegisteredUser && (
          <div 
            className="absolute bottom-3 right-2 text-[6px] font-medium px-1 rounded"
            style={{ 
              background: `hsl(${colors.primary} / 0.2)`,
              color: `hsl(${colors.textSecondary})`
            }}
          >
            GUEST
          </div>
        )}
      </div>
    </div>
  );
}
