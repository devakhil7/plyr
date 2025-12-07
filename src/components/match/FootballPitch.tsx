import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shuffle, Users, User, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Player {
  id: string;
  user_id: string;
  team: "A" | "B" | "unassigned";
  role: string;
  profiles: {
    id: string;
    name: string | null;
    profile_photo_url: string | null;
    position: string | null;
  } | null;
}

interface FootballPitchProps {
  matchId: string;
  players: Player[];
  isHost: boolean;
  teamAssignmentMode: "auto" | "manual";
  onRefetch: () => void;
}

// Mini player card for pitch display
function PlayerChip({ 
  player, 
  team, 
  isHost, 
  onMoveToTeam 
}: { 
  player: Player; 
  team: "A" | "B" | "unassigned";
  isHost: boolean;
  onMoveToTeam?: (playerId: string, team: "A" | "B" | "unassigned") => void;
}) {
  const teamColors = {
    A: "from-blue-500/20 to-blue-600/20 border-blue-500/50",
    B: "from-red-500/20 to-red-600/20 border-red-500/50",
    unassigned: "from-gray-500/20 to-gray-600/20 border-gray-500/50",
  };

  const teamTextColors = {
    A: "text-blue-400",
    B: "text-red-400",
    unassigned: "text-gray-400",
  };

  return (
    <div className="group relative">
      <Link 
        to={`/players/${player.user_id}`}
        className={`
          flex flex-col items-center p-2 rounded-lg 
          bg-gradient-to-b ${teamColors[team]} 
          border backdrop-blur-sm
          hover:scale-105 transition-transform duration-200
          min-w-[70px]
        `}
      >
        <Avatar className="h-10 w-10 border-2 border-background shadow-lg">
          <AvatarImage src={player.profiles?.profile_photo_url || undefined} />
          <AvatarFallback className={`${teamTextColors[team]} bg-background/80 text-xs font-bold`}>
            {player.profiles?.name?.charAt(0) || "P"}
          </AvatarFallback>
        </Avatar>
        <span className="text-[10px] font-medium text-white mt-1 truncate max-w-[60px] text-center drop-shadow-lg">
          {player.profiles?.name?.split(' ')[0] || "Player"}
        </span>
        {player.profiles?.position && (
          <span className="text-[8px] text-white/70 uppercase tracking-wider">
            {player.profiles.position.substring(0, 3)}
          </span>
        )}
      </Link>

      {/* Host controls for manual assignment */}
      {isHost && onMoveToTeam && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {team !== "A" && (
            <button
              onClick={(e) => { e.preventDefault(); onMoveToTeam(player.id, "A"); }}
              className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 shadow-lg"
              title="Move to Team A"
            >
              A
            </button>
          )}
          {team !== "B" && (
            <button
              onClick={(e) => { e.preventDefault(); onMoveToTeam(player.id, "B"); }}
              className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 shadow-lg"
              title="Move to Team B"
            >
              B
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FootballPitch({ matchId, players, isHost, teamAssignmentMode, onRefetch }: FootballPitchProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  const teamA = players.filter(p => p.team === "A");
  const teamB = players.filter(p => p.team === "B");
  const unassigned = players.filter(p => p.team === "unassigned");

  const handleAutoSplit = async () => {
    setIsAssigning(true);
    try {
      // Shuffle players randomly
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const half = Math.ceil(shuffled.length / 2);
      
      // Assign first half to Team A, rest to Team B
      for (let i = 0; i < shuffled.length; i++) {
        const team = i < half ? "A" : "B";
        const { error } = await supabase
          .from("match_players")
          .update({ team })
          .eq("id", shuffled[i].id);
        
        if (error) throw error;
      }

      toast.success("Teams have been auto-assigned!");
      onRefetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign teams");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMoveToTeam = async (playerId: string, team: "A" | "B" | "unassigned") => {
    try {
      const { error } = await supabase
        .from("match_players")
        .update({ team })
        .eq("id", playerId);
      
      if (error) throw error;
      onRefetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to move player");
    }
  };

  // Formation positions (4-3-3 style layout)
  const getFormationPositions = (teamPlayers: Player[], isTeamB: boolean) => {
    const positions = [
      { top: "85%", left: "50%" }, // GK
      { top: "65%", left: "20%" }, // LB
      { top: "65%", left: "40%" }, // CB1
      { top: "65%", left: "60%" }, // CB2
      { top: "65%", left: "80%" }, // RB
      { top: "45%", left: "30%" }, // LM
      { top: "45%", left: "50%" }, // CM
      { top: "45%", left: "70%" }, // RM
      { top: "25%", left: "25%" }, // LW
      { top: "25%", left: "50%" }, // ST
      { top: "25%", left: "75%" }, // RW
    ];

    // Flip positions for Team B (they play on top half)
    if (isTeamB) {
      return positions.map(p => ({
        top: `${100 - parseFloat(p.top)}%`,
        left: p.left,
      }));
    }
    return positions;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      {isHost && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoSplit}
            disabled={isAssigning || players.length < 2}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {isAssigning ? "Assigning..." : "Auto Split Teams"}
          </Button>
          
          <Badge variant="secondary" className="text-xs">
            {teamAssignmentMode === "auto" ? "Auto Assignment" : "Manual Assignment"}
          </Badge>

          {unassigned.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {unassigned.length} unassigned player{unassigned.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Football Pitch */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] max-w-3xl mx-auto rounded-xl overflow-hidden shadow-2xl">
        {/* Pitch Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 to-emerald-700">
          {/* Pitch markings */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Outer boundary */}
            <rect x="5" y="2" width="90" height="96" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            
            {/* Center line */}
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            
            {/* Center circle */}
            <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.5)" />
            
            {/* Top penalty area */}
            <rect x="25" y="2" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <rect x="35" y="2" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <circle cx="50" cy="14" r="0.5" fill="rgba(255,255,255,0.5)" />
            
            {/* Bottom penalty area */}
            <rect x="25" y="80" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <rect x="35" y="90" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <circle cx="50" cy="86" r="0.5" fill="rgba(255,255,255,0.5)" />
            
            {/* Corner arcs */}
            <path d="M 5 5 Q 8 5 8 2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <path d="M 95 5 Q 92 5 92 2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <path d="M 5 95 Q 8 95 8 98" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <path d="M 95 95 Q 92 95 92 98" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
          </svg>

          {/* Team Labels */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-red-500/80 text-white border-0 shadow-lg">
              Team B ({teamB.length})
            </Badge>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-blue-500/80 text-white border-0 shadow-lg">
              Team A ({teamA.length})
            </Badge>
          </div>
        </div>

        {/* Team B Players (Top Half) */}
        <div className="absolute inset-0 top-0 h-1/2">
          <div className="relative w-full h-full">
            {teamB.map((player, index) => {
              const positions = getFormationPositions(teamB, true);
              const pos = positions[index % positions.length];
              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <PlayerChip 
                    player={player} 
                    team="B" 
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Team A Players (Bottom Half) */}
        <div className="absolute inset-0 top-1/2 h-1/2">
          <div className="relative w-full h-full">
            {teamA.map((player, index) => {
              const positions = getFormationPositions(teamA, false);
              const pos = positions[index % positions.length];
              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <PlayerChip 
                    player={player} 
                    team="A" 
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unassigned Players */}
      {unassigned.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unassigned Players ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3 justify-center">
              {unassigned.map((player) => (
                <PlayerChip 
                  key={player.id} 
                  player={player} 
                  team="unassigned"
                  isHost={isHost}
                  onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {players.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No players have joined yet</p>
        </div>
      )}
    </div>
  );
}
