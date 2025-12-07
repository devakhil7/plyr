import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin, Trophy, Heart } from "lucide-react";

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
    favourite_club: string | null;
  };
  stats: PlayerStats;
  className?: string;
}

export function PlayerCard({ player, stats, className = "" }: PlayerCardProps) {
  const formatStat = (value: number | null) => {
    if (value === null || value === 0) return "--";
    return Math.round(value * 20); // Convert 1-5 scale to 1-100
  };

  const getOverallRating = () => {
    if (stats.overall === null || stats.overall === 0) return "--";
    return Math.round(stats.overall * 20);
  };

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
      <div className="relative w-[280px] mx-auto">
        {/* Card Background SVG Shape */}
        <svg
          viewBox="0 0 280 400"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--card))" />
              <stop offset="100%" stopColor="hsl(var(--muted))" />
            </linearGradient>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(45, 80%, 55%)" />
              <stop offset="50%" stopColor="hsl(45, 90%, 65%)" />
              <stop offset="100%" stopColor="hsl(40, 75%, 50%)" />
            </linearGradient>
            <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3" />
            </filter>
          </defs>
          {/* Main card shape */}
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
            fill="url(#cardGradient)"
            stroke="url(#goldGradient)"
            strokeWidth="2"
            filter="url(#cardShadow)"
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
            stroke="url(#goldGradient)"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>

        {/* Card Content */}
        <div className="relative z-10 p-4 pt-3 h-[400px] flex flex-col">
          {/* Top Section - Rating and Position */}
          <div className="flex justify-between items-start mb-2">
            <div className="text-left">
              <div className="text-3xl font-black text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {getOverallRating()}
              </div>
              <div className="text-xs font-bold text-primary/80 tracking-wider">
                {getPositionAbbrev(player.position)}
              </div>
            </div>
            
            {/* City Badge */}
            {player.city && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[60px]">{player.city}</span>
              </div>
            )}
          </div>

          {/* Player Image Section */}
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="relative">
              {/* Glow effect behind avatar */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-full blur-xl scale-110" />
              <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-2xl relative">
                <AvatarImage src={player.profile_photo_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-primary text-4xl font-bold">
                  {player.name?.charAt(0) || <User className="h-16 w-16" />}
                </AvatarFallback>
              </Avatar>
              
              {/* Decorative diagonal lines */}
              <div className="absolute -left-4 top-1/4 w-8 h-0.5 bg-gradient-to-r from-transparent to-primary/30 rotate-45" />
              <div className="absolute -right-4 top-1/4 w-8 h-0.5 bg-gradient-to-l from-transparent to-primary/30 -rotate-45" />
            </div>
          </div>

          {/* Player Name */}
          <div className="text-center mb-3">
            <h3 className="text-lg font-bold text-foreground truncate px-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {player.name || "Player"}
            </h3>
          </div>

          {/* Attributes Grid */}
          <div className="grid grid-cols-6 gap-1 mb-3 px-2">
            {attributes.map((attr) => (
              <div key={attr.label} className="text-center">
                <div className="text-[10px] font-semibold text-muted-foreground tracking-wide">
                  {attr.label}
                </div>
                <div className="text-sm font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {attr.value}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Stats Row */}
          <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-muted/30 rounded-lg mb-2">
            <div className="text-center">
              <div className="text-xs font-bold text-foreground">{stats.matches}</div>
              <div className="text-[9px] text-muted-foreground">MATCHES</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-accent">{stats.wins}</div>
              <div className="text-[9px] text-muted-foreground">WINS</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-foreground">{stats.goals}</div>
              <div className="text-[9px] text-muted-foreground">GOALS</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-foreground">{stats.assists}</div>
              <div className="text-[9px] text-muted-foreground">ASSISTS</div>
            </div>
          </div>

          {/* Club Badge */}
          {player.favourite_club && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3 text-destructive fill-destructive" />
              <span className="truncate max-w-[150px]">{player.favourite_club}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
