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
}

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

const getSkillRating = (level: string | null | undefined) => {
  switch (level) {
    case "pro": return 90;
    case "advanced": return 78;
    case "intermediate": return 65;
    case "beginner": return 52;
    default: return null;
  }
};

export function TournamentPlayerCard({ player, index }: TournamentPlayerCardProps) {
  const isRegisteredUser = !!player.user_id;
  const positionAbbrev = getPositionAbbrev(player.position);
  const skillRating = isRegisteredUser ? getSkillRating(player.profile?.skill_level) : null;

  // Colors based on registration status
  const cardColors = isRegisteredUser 
    ? {
        bg: "linear-gradient(160deg, #c9a227 0%, #d4af37 20%, #f4d03f 40%, #d4af37 60%, #c9a227 100%)",
        border: "#c9a227",
        text: "#1a1a0a",
        accent: "#8b7500",
      }
    : {
        bg: "linear-gradient(160deg, #6b7280 0%, #9ca3af 30%, #d1d5db 50%, #9ca3af 70%, #6b7280 100%)",
        border: "#6b7280",
        text: "#1f2937",
        accent: "#4b5563",
      };

  return (
    <div className="relative w-[85px] mx-auto group cursor-pointer transition-transform hover:scale-105">
      {/* Card Shape SVG */}
      <svg
        viewBox="0 0 85 120"
        className="w-full h-auto drop-shadow-lg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`cardBg-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {isRegisteredUser ? (
              <>
                <stop offset="0%" stopColor="#c9a227" />
                <stop offset="30%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#f4d03f" />
                <stop offset="70%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#c9a227" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="30%" stopColor="#9ca3af" />
                <stop offset="50%" stopColor="#d1d5db" />
                <stop offset="70%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#6b7280" />
              </>
            )}
          </linearGradient>
          <filter id={`shadow-${player.id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          <clipPath id={`avatarClip-${player.id}`}>
            <circle cx="42.5" cy="52" r="22" />
          </clipPath>
        </defs>
        
        {/* Main Card Shape */}
        <path
          d="M 8 0 
             L 77 0 
             Q 85 0 85 8 
             L 85 100 
             Q 85 108 80 112 
             L 50 120 
             Q 42.5 122 35 120 
             L 5 112 
             Q 0 108 0 100 
             L 0 8 
             Q 0 0 8 0"
          fill={`url(#cardBg-${player.id})`}
          filter={`url(#shadow-${player.id})`}
        />
        
        {/* Inner card line */}
        <path
          d="M 10 3 
             L 75 3 
             Q 82 3 82 10 
             L 82 98 
             Q 82 105 78 109 
             L 49 116 
             Q 42.5 118 36 116 
             L 7 109 
             Q 3 105 3 98 
             L 3 10 
             Q 3 3 10 3"
          fill="none"
          stroke={cardColors.border}
          strokeWidth="0.5"
          opacity="0.4"
        />

        {/* Shine effect */}
        <path
          d="M 20 0 L 45 0 L 30 35 L 5 35 L 5 15 Z"
          fill="white"
          opacity="0.15"
        />
      </svg>

      {/* Card Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center pt-1.5">
        {/* Rating & Position */}
        <div className="flex flex-col items-center mb-0.5">
          <span 
            className="text-xl font-black leading-none"
            style={{ 
              color: cardColors.text,
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: "0 1px 1px rgba(255,255,255,0.3)"
            }}
          >
            {skillRating ?? "--"}
          </span>
          <span 
            className="text-[8px] font-bold tracking-wide leading-none"
            style={{ color: cardColors.accent }}
          >
            {positionAbbrev}
          </span>
        </div>

        {/* Player Avatar */}
        <div className="relative mb-1">
          <Avatar 
            className="h-11 w-11 border-2"
            style={{ borderColor: cardColors.accent }}
          >
            {isRegisteredUser && player.profile?.profile_photo_url ? (
              <AvatarImage src={player.profile.profile_photo_url} className="object-cover" />
            ) : null}
            <AvatarFallback 
              className="text-lg font-bold"
              style={{ 
                backgroundColor: isRegisteredUser ? "#d4af37" : "#9ca3af",
                color: cardColors.text 
              }}
            >
              {player.player_name?.charAt(0) || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Player Name */}
        <div 
          className="w-full px-1 mb-0.5"
        >
          <div 
            className="text-[7px] font-bold text-center truncate px-0.5 py-0.5 rounded mx-1"
            style={{ 
              backgroundColor: `${cardColors.accent}20`,
              color: cardColors.text,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {player.player_name?.split(' ').pop()?.toUpperCase() || "PLAYER"}
          </div>
        </div>

        {/* Jersey Number Badge */}
        <div 
          className="absolute top-1 left-1 text-[6px] font-bold w-3 h-3 flex items-center justify-center rounded-sm"
          style={{ 
            backgroundColor: cardColors.accent,
            color: isRegisteredUser ? "#f4d03f" : "#e5e7eb"
          }}
        >
          {player.jersey_number || index + 1}
        </div>

        {/* Guest indicator for non-registered */}
        {!isRegisteredUser && (
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[5px] font-medium px-1 py-0.5 rounded bg-slate-500/50 text-white"
          >
            GUEST
          </div>
        )}
      </div>
    </div>
  );
}
