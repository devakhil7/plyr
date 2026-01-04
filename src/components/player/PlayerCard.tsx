import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin } from "lucide-react";
import { useId } from "react";

interface PlayerStats {
  overall: number | null;
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physical: number | null;
  matches: number;
  goals: number;
  assists: number;
  wins: number;
}

interface PlayerCardProps {
  player: {
    name: string | null;
    position: string | null;
    city: string | null;
    profile_photo_url: string | null;
  };
  stats: PlayerStats;
  className?: string;
}

type CardTier = "gold" | "silver" | "bronze";

const tierColors = {
  gold: {
    primary: "45 90% 55%",      // Golden yellow
    secondary: "40 85% 45%",    // Darker gold
    accent: "45 100% 70%",      // Bright gold
    gradient: "linear-gradient(135deg, hsl(45, 90%, 55%) 0%, hsl(40, 85%, 45%) 50%, hsl(35, 80%, 35%) 100%)",
    cardBg: "linear-gradient(180deg, hsl(40, 30%, 15%) 0%, hsl(35, 25%, 8%) 100%)",
    textPrimary: "45 85% 60%",
    textSecondary: "45 60% 50%",
  },
  silver: {
    primary: "220 15% 70%",     // Silver
    secondary: "220 10% 55%",   // Darker silver
    accent: "220 20% 80%",      // Bright silver
    gradient: "linear-gradient(135deg, hsl(220, 15%, 70%) 0%, hsl(220, 10%, 55%) 50%, hsl(220, 8%, 40%) 100%)",
    cardBg: "linear-gradient(180deg, hsl(220, 15%, 20%) 0%, hsl(220, 12%, 10%) 100%)",
    textPrimary: "220 20% 80%",
    textSecondary: "220 15% 60%",
  },
  bronze: {
    primary: "25 60% 45%",      // Bronze
    secondary: "20 55% 35%",    // Darker bronze
    accent: "30 65% 55%",       // Bright bronze
    gradient: "linear-gradient(135deg, hsl(25, 60%, 45%) 0%, hsl(20, 55%, 35%) 50%, hsl(15, 50%, 25%) 100%)",
    cardBg: "linear-gradient(180deg, hsl(20, 25%, 15%) 0%, hsl(15, 20%, 8%) 100%)",
    textPrimary: "30 65% 55%",
    textSecondary: "25 50% 45%",
  },
};

export function PlayerCard({ player, stats, className = "" }: PlayerCardProps) {
  const uniqueId = useId();
  
  // Convert 1-5 scale to 1-100 scale
  const convertTo100 = (value: number | null): number | null => {
    if (value === null || value === 0) return null;
    return Math.round(value * 20);
  };

  const formatStat = (value: number | null): string => {
    const converted = convertTo100(value);
    if (converted === null) return "--";
    return converted.toString();
  };

  const getOverallRating = (): number | null => {
    return convertTo100(stats.overall);
  };

  const getOverallDisplay = (): string => {
    const rating = getOverallRating();
    if (rating === null) return "--";
    return rating.toString();
  };

  // Determine card tier based on converted rating
  const getTier = (): CardTier => {
    const rating = getOverallRating();
    if (rating === null || rating < 60) return "bronze";
    if (rating >= 80) return "gold";
    return "silver";
  };

  const tier = getTier();
  const colors = tierColors[tier];

  const getPositionAbbrev = (position: string | null) => {
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

  const attributes = [
    { label: "PAC", value: formatStat(stats.pace) },
    { label: "SHO", value: formatStat(stats.shooting) },
    { label: "PAS", value: formatStat(stats.passing) },
    { label: "DRI", value: formatStat(stats.dribbling) },
    { label: "DEF", value: formatStat(stats.defending) },
    { label: "PHY", value: formatStat(stats.physical) },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Card Container with FIFA-style shape */}
      <div className="relative w-[280px] h-[400px] mx-auto">
        {/* Card Background SVG Shape */}
        <svg
          viewBox="0 0 280 400"
          className="absolute inset-0 w-[280px] h-[400px]"
          style={{ width: '280px', height: '400px' }}
        >
          <defs>
            <linearGradient id={`cardGradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={`hsl(${colors.primary})`} stopOpacity="0.1" />
              <stop offset="100%" stopColor={`hsl(${colors.secondary})`} stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id={`tierGradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={`hsl(${colors.primary})`} />
              <stop offset="50%" stopColor={`hsl(${colors.accent})`} />
              <stop offset="100%" stopColor={`hsl(${colors.secondary})`} />
            </linearGradient>
            <filter id={`cardShadow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* Main card shape with tier-colored background */}
          <path
            d="M 20 0 
               L 260 0 
               Q 280 0 280 20 
               L 280 350 
               Q 280 370 270 380 
               L 160 400 
               Q 140 402 120 400 
               L 10 380 
               Q 0 370 0 350 
               L 0 20 
               Q 0 0 20 0"
            fill={tier === "gold" ? "#1a1508" : tier === "silver" ? "#151820" : "#1a1210"}
            stroke={`url(#tierGradient-${uniqueId})`}
            strokeWidth="3"
            filter={`url(#cardShadow-${uniqueId})`}
          />
          {/* Inner decorative lines */}
          <path
            d="M 25 10 
               L 255 10 
               Q 270 10 270 25 
               L 270 345 
               Q 270 360 262 368 
               L 158 386 
               Q 140 388 122 386 
               L 18 368 
               Q 10 360 10 345 
               L 10 25 
               Q 10 10 25 10"
            fill="none"
            stroke={`url(#tierGradient-${uniqueId})`}
            strokeWidth="0.5"
            opacity="0.4"
          />
          {/* Diagonal shine effect */}
          <path
            d="M 60 0 L 140 0 L 80 120 L 0 120 L 0 60 Z"
            fill={`url(#tierGradient-${uniqueId})`}
            opacity="0.08"
          />
        </svg>

        {/* Card Content */}
        <div className="relative z-10 p-4 pt-3 h-[400px] flex flex-col">
          {/* Top Section - Rating and Position */}
          <div className="flex justify-between items-start mb-2">
            <div className="text-left">
              <div 
                className="text-3xl font-black" 
                style={{ 
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: `hsl(${colors.textPrimary})`,
                  textShadow: `0 0 20px hsl(${colors.primary} / 0.5)`
                }}
              >
                {getOverallDisplay()}
              </div>
              <div 
                className="text-xs font-bold tracking-wider"
                style={{ color: `hsl(${colors.textSecondary})` }}
              >
                {getPositionAbbrev(player.position)}
              </div>
            </div>
            
            {/* Tier Badge */}
            <div 
              className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ 
                background: `linear-gradient(135deg, hsl(${colors.primary} / 0.3), hsl(${colors.secondary} / 0.3))`,
                color: `hsl(${colors.textPrimary})`,
                border: `1px solid hsl(${colors.primary} / 0.5)`
              }}
            >
              {tier}
            </div>
          </div>

          {/* Player Image Section */}
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="relative">
              {/* Glow effect behind avatar */}
              <div 
                className="absolute inset-0 rounded-full blur-xl scale-125" 
                style={{ background: `radial-gradient(circle, hsl(${colors.primary} / 0.4), transparent)` }}
              />
              <Avatar 
                className="h-32 w-32 shadow-2xl relative"
                style={{ 
                  border: `4px solid hsl(${colors.primary} / 0.6)`,
                  boxShadow: `0 0 30px hsl(${colors.primary} / 0.3)`
                }}
              >
                <AvatarImage src={player.profile_photo_url || undefined} className="object-cover" />
                <AvatarFallback 
                  className="text-4xl font-bold"
                  style={{ 
                    background: `linear-gradient(135deg, hsl(${colors.primary} / 0.3), hsl(${colors.secondary} / 0.3))`,
                    color: `hsl(${colors.textPrimary})`
                  }}
                >
                  {player.name?.charAt(0) || <User className="h-16 w-16" />}
                </AvatarFallback>
              </Avatar>
              
              {/* Decorative diagonal lines */}
              <div 
                className="absolute -left-4 top-1/4 w-8 h-0.5 rotate-45" 
                style={{ background: `linear-gradient(to right, transparent, hsl(${colors.primary} / 0.5))` }}
              />
              <div 
                className="absolute -right-4 top-1/4 w-8 h-0.5 -rotate-45" 
                style={{ background: `linear-gradient(to left, transparent, hsl(${colors.primary} / 0.5))` }}
              />
            </div>
          </div>

          {/* Player Name */}
          <div className="text-center mb-3">
            <h3 
              className="text-lg font-bold truncate px-2" 
              style={{ 
                fontFamily: "'Space Grotesk', sans-serif",
                color: `hsl(${colors.textPrimary})`
              }}
            >
              {player.name || "Player"}
            </h3>
            {player.city && (
              <div 
                className="flex items-center justify-center gap-1 text-xs mt-1"
                style={{ color: `hsl(${colors.textSecondary})` }}
              >
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{player.city}</span>
              </div>
            )}
          </div>

          {/* Attributes Grid */}
          <div className="grid grid-cols-6 gap-1 mb-3 px-2">
            {attributes.map((attr) => (
              <div key={attr.label} className="text-center">
                <div 
                  className="text-[10px] font-semibold tracking-wide"
                  style={{ color: `hsl(${colors.textSecondary})` }}
                >
                  {attr.label}
                </div>
                <div 
                  className="text-sm font-black" 
                  style={{ 
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: `hsl(${colors.textPrimary})`
                  }}
                >
                  {attr.value}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Stats Row */}
          <div 
            className="grid grid-cols-4 gap-1 px-3 py-2 rounded-lg mb-2"
            style={{ background: `hsl(${colors.primary} / 0.1)` }}
          >
            <div className="text-center">
              <div className="text-xs font-bold" style={{ color: `hsl(${colors.textPrimary})` }}>{stats.matches}</div>
              <div className="text-[9px]" style={{ color: `hsl(${colors.textSecondary})` }}>MATCHES</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-emerald-400">{stats.wins}</div>
              <div className="text-[9px]" style={{ color: `hsl(${colors.textSecondary})` }}>WINS</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold" style={{ color: `hsl(${colors.textPrimary})` }}>{stats.goals}</div>
              <div className="text-[9px]" style={{ color: `hsl(${colors.textSecondary})` }}>GOALS</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold" style={{ color: `hsl(${colors.textPrimary})` }}>{stats.assists}</div>
              <div className="text-[9px]" style={{ color: `hsl(${colors.textSecondary})` }}>ASSISTS</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
