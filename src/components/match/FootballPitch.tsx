import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shuffle, Users, User, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Player {
  id: string;
  user_id: string | null;
  team: "A" | "B" | "unassigned";
  role: string;
  offline_player_name?: string | null;
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
  totalSlots: number;
  onRefetch: () => void;
}

// Mini player card for pitch display
function PlayerChip({ 
  player, 
  team, 
  isHost, 
  onMoveToTeam,
  onRemove
}: { 
  player: Player; 
  team: "A" | "B" | "unassigned";
  isHost: boolean;
  onMoveToTeam?: (playerId: string, team: "A" | "B" | "unassigned") => void;
  onRemove?: (playerId: string) => void;
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

  const isOfflinePlayer = !player.user_id && player.offline_player_name;
  const displayName = isOfflinePlayer ? player.offline_player_name : player.profiles?.name;

  const content = (
    <div
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
          {displayName?.charAt(0) || "P"}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] font-medium text-white mt-1 truncate max-w-[60px] text-center drop-shadow-lg">
        {displayName?.split(' ')[0] || "Player"}
      </span>
      {isOfflinePlayer && (
        <span className="text-[8px] text-yellow-300/80 uppercase tracking-wider">
          Offline
        </span>
      )}
      {!isOfflinePlayer && player.profiles?.position && (
        <span className="text-[8px] text-white/70 uppercase tracking-wider">
          {player.profiles.position.substring(0, 3)}
        </span>
      )}
    </div>
  );

  return (
    <div className="group relative">
      {isOfflinePlayer ? (
        content
      ) : (
        <Link to={`/players/${player.user_id}`}>
          {content}
        </Link>
      )}

      {/* Host controls for manual assignment */}
      {isHost && onMoveToTeam && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {team !== "A" && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToTeam(player.id, "A"); }}
              className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 shadow-lg"
              title="Move to Team A"
            >
              A
            </button>
          )}
          {team !== "B" && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToTeam(player.id, "B"); }}
              className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 shadow-lg"
              title="Move to Team B"
            >
              B
            </button>
          )}
          {isOfflinePlayer && onRemove && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(player.id); }}
              className="w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold hover:bg-destructive/80 shadow-lg flex items-center justify-center"
              title="Remove offline player"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Placeholder chip for empty slots - now clickable for hosts
function PlaceholderChip({ 
  team, 
  isHost, 
  onAddOfflinePlayer 
}: { 
  team: "A" | "B"; 
  isHost: boolean;
  onAddOfflinePlayer?: (team: "A" | "B") => void;
}) {
  const teamColors = {
    A: "from-blue-500/10 to-blue-600/10 border-blue-500/30",
    B: "from-red-500/10 to-red-600/10 border-red-500/30",
  };

  return (
    <div
      onClick={() => isHost && onAddOfflinePlayer?.(team)}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg 
        bg-gradient-to-b ${teamColors[team]} 
        border border-dashed backdrop-blur-sm
        min-w-[70px] min-h-[70px]
        opacity-50
        ${isHost ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all' : ''}
      `}
    >
      <div className="h-10 w-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
        {isHost ? (
          <Plus className="h-5 w-5 text-white/60" />
        ) : (
          <User className="h-5 w-5 text-white/40" />
        )}
      </div>
      <span className="text-[10px] font-medium text-white/40 mt-1">
        {isHost ? "Add" : "Empty"}
      </span>
    </div>
  );
}

export function FootballPitch({ matchId, players, isHost, teamAssignmentMode, totalSlots, onRefetch }: FootballPitchProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [autoAssignAttempted, setAutoAssignAttempted] = useState(false);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [addPlayerTeam, setAddPlayerTeam] = useState<"A" | "B">("A");
  const [offlinePlayerName, setOfflinePlayerName] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  const teamA = players.filter(p => p.team === "A");
  const teamB = players.filter(p => p.team === "B");
  const unassigned = players.filter(p => p.team === "unassigned" || !p.team);
  
  // Calculate slots per team
  const slotsPerTeam = Math.ceil(totalSlots / 2);
  const teamAEmpty = Math.max(0, slotsPerTeam - teamA.length);
  const teamBEmpty = Math.max(0, slotsPerTeam - teamB.length);

  // Position mapping for sorting players by role
  const positionPriority: Record<string, number> = {
    "goalkeeper": 0, "gk": 0,
    "defender": 1, "cb": 1, "lb": 2, "rb": 3, "def": 1,
    "midfielder": 4, "cm": 5, "cdm": 4, "cam": 6, "lm": 4, "rm": 4, "mid": 5,
    "forward": 7, "striker": 8, "st": 8, "lw": 7, "rw": 7, "cf": 8, "att": 8,
  };

  const getPositionPriority = (position: string | null | undefined): number => {
    if (!position) return 99; // No position = fill remaining spots
    const lower = position.toLowerCase();
    for (const [key, priority] of Object.entries(positionPriority)) {
      if (lower.includes(key)) return priority;
    }
    return 99;
  };

  // Sort players by position priority for proper formation placement
  const sortPlayersByPosition = (teamPlayers: Player[]): Player[] => {
    return [...teamPlayers].sort((a, b) => {
      const priorityA = getPositionPriority(a.profiles?.position);
      const priorityB = getPositionPriority(b.profiles?.position);
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Random tiebreaker for same position
      return Math.random() - 0.5;
    });
  };

  // Auto-assign unassigned players to teams
  const autoAssignUnassigned = async () => {
    if (unassigned.length === 0 || isAssigning) return;
    
    setIsAssigning(true);
    
    try {
      // Sort by position priority first
      const sorted = [...unassigned].sort((a, b) => {
        return getPositionPriority(a.profiles?.position) - getPositionPriority(b.profiles?.position);
      });
      
      // Distribute evenly between teams, considering current team sizes
      let teamACount = teamA.length;
      let teamBCount = teamB.length;
      let successCount = 0;
      
      for (const player of sorted) {
        // Assign to the team with fewer players
        const team = teamACount <= teamBCount ? "A" : "B";
        
        const { error } = await supabase
          .from("match_players")
          .update({ team })
          .eq("id", player.id);
        
        if (error) {
          console.error("Failed to assign player:", error);
          continue;
        }
        
        successCount++;
        if (team === "A") teamACount++;
        else teamBCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} player${successCount > 1 ? 's' : ''} auto-assigned to teams!`);
        onRefetch();
      }
    } catch (error: any) {
      console.error("Auto-assign failed:", error);
      toast.error("Failed to auto-assign players");
    } finally {
      setIsAssigning(false);
    }
  };

  // Auto-assign on mount if host and there are unassigned players
  useEffect(() => {
    // Only attempt auto-assign if: host, has unassigned players, hasn't attempted yet, and players are loaded
    if (isHost && unassigned.length > 0 && !autoAssignAttempted && players.length > 0) {
      setAutoAssignAttempted(true);
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        autoAssignUnassigned();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isHost, unassigned.length, autoAssignAttempted, players.length]);

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

  // Handle adding offline player
  const handleAddOfflinePlayer = (team: "A" | "B") => {
    setAddPlayerTeam(team);
    setOfflinePlayerName("");
    setShowAddPlayerDialog(true);
  };

  const handleConfirmAddPlayer = async () => {
    if (!offlinePlayerName.trim()) {
      toast.error("Please enter a player name");
      return;
    }

    setIsAddingPlayer(true);
    try {
      const { error } = await supabase
        .from("match_players")
        .insert({
          match_id: matchId,
          team: addPlayerTeam,
          offline_player_name: offlinePlayerName.trim(),
          role: "player",
          join_status: "confirmed",
        });

      if (error) throw error;
      
      toast.success(`Added ${offlinePlayerName.trim()} to Team ${addPlayerTeam}`);
      setShowAddPlayerDialog(false);
      setOfflinePlayerName("");
      onRefetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to add player");
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleRemoveOfflinePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("id", playerId);
      
      if (error) throw error;
      toast.success("Player removed");
      onRefetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove player");
    }
  };

  // Dynamic formation positions based on team size
  const getFormationPositions = (playerCount: number, isTeamB: boolean) => {
    // Define positions from GK -> DEF -> MID -> FWD (bottom to top for Team A)
    const allPositions = [
      { top: "88%", left: "50%", role: "GK" },
      { top: "70%", left: "20%", role: "LB" },
      { top: "70%", left: "40%", role: "CB" },
      { top: "70%", left: "60%", role: "CB" },
      { top: "70%", left: "80%", role: "RB" },
      { top: "50%", left: "25%", role: "LM" },
      { top: "50%", left: "50%", role: "CM" },
      { top: "50%", left: "75%", role: "RM" },
      { top: "30%", left: "20%", role: "LW" },
      { top: "30%", left: "50%", role: "ST" },
      { top: "30%", left: "80%", role: "RW" },
    ];

    // Select positions based on player count
    const selectedPositions = allPositions.slice(0, Math.min(playerCount, allPositions.length));

    // Flip for Team B
    if (isTeamB) {
      return selectedPositions.map(p => ({
        ...p,
        top: `${100 - parseFloat(p.top)}%`,
      }));
    }
    return selectedPositions;
  };

  // Get sorted players for display
  const sortedTeamA = sortPlayersByPosition(teamA);
  const sortedTeamB = sortPlayersByPosition(teamB);

  return (
    <div className="space-y-4">
      {/* Controls - shown to host */}
      {isHost ? (
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
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Team A: {teamA.length} | Team B: {teamB.length}</span>
          {unassigned.length > 0 && (
            <span className="text-yellow-600">• {unassigned.length} unassigned</span>
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
            {/* Active players */}
            {sortedTeamB.map((player, index) => {
              const positions = getFormationPositions(slotsPerTeam, true);
              const pos = positions[index % positions.length];
              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos?.top, left: pos?.left }}
                >
                  <PlayerChip 
                    player={player} 
                    team="B" 
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                    onRemove={isHost && !player.user_id ? handleRemoveOfflinePlayer : undefined}
                  />
                </div>
              );
            })}
            {/* Empty placeholders */}
            {Array.from({ length: teamBEmpty }).map((_, index) => {
              const positions = getFormationPositions(slotsPerTeam, true);
              const pos = positions[(sortedTeamB.length + index) % positions.length];
              return (
                <div
                  key={`empty-b-${index}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos?.top, left: pos?.left }}
                >
                  <PlaceholderChip team="B" isHost={isHost} onAddOfflinePlayer={handleAddOfflinePlayer} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Team A Players (Bottom Half) */}
        <div className="absolute inset-0 top-1/2 h-1/2">
          <div className="relative w-full h-full">
            {/* Active players */}
            {sortedTeamA.map((player, index) => {
              const positions = getFormationPositions(slotsPerTeam, false);
              const pos = positions[index % positions.length];
              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos?.top, left: pos?.left }}
                >
                  <PlayerChip 
                    player={player} 
                    team="A" 
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                    onRemove={isHost && !player.user_id ? handleRemoveOfflinePlayer : undefined}
                  />
                </div>
              );
            })}
            {/* Empty placeholders */}
            {Array.from({ length: teamAEmpty }).map((_, index) => {
              const positions = getFormationPositions(slotsPerTeam, false);
              const pos = positions[(sortedTeamA.length + index) % positions.length];
              return (
                <div
                  key={`empty-a-${index}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos?.top, left: pos?.left }}
                >
                  <PlaceholderChip team="A" isHost={isHost} onAddOfflinePlayer={handleAddOfflinePlayer} />
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
                  onRemove={isHost && !player.user_id ? handleRemoveOfflinePlayer : undefined}
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

      {/* Add Offline Player Dialog */}
      <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Offline Player to Team {addPlayerTeam}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Player Name</label>
              <Input
                placeholder="Enter player name"
                value={offlinePlayerName}
                onChange={(e) => setOfflinePlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmAddPlayer()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPlayerDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAddPlayer}
              disabled={isAddingPlayer || !offlinePlayerName.trim()}
            >
              {isAddingPlayer ? "Adding..." : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
