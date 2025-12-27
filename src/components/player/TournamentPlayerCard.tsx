import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  if (!position) return null;
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

const getSkillColor = (level: string | null | undefined) => {
  switch (level) {
    case "pro": return "text-yellow-500";
    case "advanced": return "text-purple-500";
    case "intermediate": return "text-blue-500";
    case "beginner": return "text-green-500";
    default: return "text-muted-foreground";
  }
};

export function TournamentPlayerCard({ player, index }: TournamentPlayerCardProps) {
  const isRegisteredUser = !!player.user_id;
  const jerseyNumber = player.jersey_number || index + 1;
  const positionAbbrev = getPositionAbbrev(player.position);
  const skillLevel = player.profile?.skill_level;

  return (
    <div className="relative group">
      {/* Card with FIFA-style gradient border */}
      <div 
        className={`
          relative overflow-hidden rounded-lg p-2.5 
          ${isRegisteredUser 
            ? 'bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-amber-950/40 border border-amber-600/30' 
            : 'bg-gradient-to-br from-slate-800/40 via-slate-700/20 to-slate-800/40 border border-slate-600/30'
          }
          transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
        `}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white via-transparent to-transparent" />
        
        <div className="relative flex items-center gap-2.5">
          {/* Jersey Number Badge */}
          <div 
            className={`
              absolute -top-1 -left-1 w-6 h-6 flex items-center justify-center 
              text-[10px] font-bold rounded-br-lg z-10
              ${isRegisteredUser 
                ? 'bg-amber-600 text-amber-950' 
                : 'bg-slate-600 text-slate-200'
              }
            `}
          >
            {jerseyNumber}
          </div>

          {/* Avatar */}
          <Avatar className={`h-10 w-10 ml-4 ${isRegisteredUser ? 'ring-2 ring-amber-500/50' : 'ring-1 ring-slate-500/30'}`}>
            {isRegisteredUser && player.profile?.profile_photo_url ? (
              <AvatarImage src={player.profile.profile_photo_url} className="object-cover" />
            ) : null}
            <AvatarFallback 
              className={`text-sm font-semibold ${
                isRegisteredUser 
                  ? 'bg-amber-800/50 text-amber-200' 
                  : 'bg-slate-700/50 text-slate-300'
              }`}
            >
              {player.player_name?.charAt(0) || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${isRegisteredUser ? 'text-amber-100' : 'text-slate-200'}`}>
              {player.player_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {positionAbbrev && (
                <Badge 
                  variant="outline" 
                  className={`text-[9px] px-1 py-0 h-4 ${
                    isRegisteredUser 
                      ? 'border-amber-600/40 text-amber-300 bg-amber-900/30' 
                      : 'border-slate-500/40 text-slate-400 bg-slate-800/30'
                  }`}
                >
                  {positionAbbrev}
                </Badge>
              )}
              {isRegisteredUser && skillLevel && (
                <span className={`text-[9px] font-medium capitalize ${getSkillColor(skillLevel)}`}>
                  {skillLevel}
                </span>
              )}
              {!isRegisteredUser && (
                <span className="text-[9px] text-slate-500 italic">Guest</span>
              )}
            </div>
          </div>

          {/* Skill Rating Placeholder for registered users */}
          {isRegisteredUser && (
            <div className="text-right">
              <div className="text-xs font-bold text-amber-400">
                {skillLevel === 'pro' ? '90+' : skillLevel === 'advanced' ? '75+' : skillLevel === 'intermediate' ? '60+' : '50+'}
              </div>
              <div className="text-[8px] text-amber-500/60 uppercase tracking-wide">OVR</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
