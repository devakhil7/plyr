import { useState, useEffect, useRef } from "react";
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
  onRemove,
  isDragging,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  positionIndex,
}: { 
  player: Player; 
  team: "A" | "B" | "unassigned";
  isHost: boolean;
  onMoveToTeam?: (playerId: string, team: "A" | "B" | "unassigned") => void;
  onRemove?: (playerId: string) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, playerId: string, positionIndex?: number) => void;
  onDragEnd?: () => void;
  onTouchStart?: (playerId: string, team: "A" | "B" | "unassigned", positionIndex?: number) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  positionIndex?: number;
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

  const handleDragStart = (e: React.DragEvent) => {
    if (isHost && onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(e, player.id, positionIndex);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isHost && onTouchStart) {
      e.preventDefault();
      onTouchStart(player.id, team, positionIndex);
    }
  };

  const content = (
    <div
      draggable={isHost}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`
        flex flex-col items-center p-2 rounded-lg 
        bg-gradient-to-b ${teamColors[team]} 
        border backdrop-blur-sm
        hover:scale-105 transition-transform duration-200
        min-w-[70px]
        ${isHost ? 'cursor-grab active:cursor-grabbing touch-none' : ''}
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
    >
      <Avatar className="h-10 w-10 border-2 border-background shadow-lg pointer-events-none">
        <AvatarImage src={player.profiles?.profile_photo_url || undefined} />
        <AvatarFallback className={`${teamTextColors[team]} bg-background/80 text-xs font-bold`}>
          {displayName?.charAt(0) || "P"}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] font-medium text-white mt-1 truncate max-w-[60px] text-center drop-shadow-lg pointer-events-none">
        {displayName?.split(' ')[0] || "Player"}
      </span>
      {isOfflinePlayer && (
        <span className="text-[8px] text-yellow-300/80 uppercase tracking-wider pointer-events-none">
          Offline
        </span>
      )}
      {!isOfflinePlayer && player.profiles?.position && (
        <span className="text-[8px] text-white/70 uppercase tracking-wider pointer-events-none">
          {player.profiles.position.substring(0, 3)}
        </span>
      )}
    </div>
  );

  return (
    <div className="group relative">
      {isHost || isOfflinePlayer ? (
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

// Placeholder chip for empty slots - now clickable and droppable for hosts
function PlaceholderChip({ 
  team, 
  isHost, 
  onAddOfflinePlayer,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: { 
  team: "A" | "B"; 
  isHost: boolean;
  onAddOfflinePlayer?: (team: "A" | "B") => void;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const teamColors = {
    A: "from-blue-500/10 to-blue-600/10 border-blue-500/30",
    B: "from-red-500/10 to-red-600/10 border-red-500/30",
  };

  return (
    <div
      onClick={() => isHost && onAddOfflinePlayer?.(team)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg 
        bg-gradient-to-b ${teamColors[team]} 
        border border-dashed backdrop-blur-sm
        min-w-[70px] min-h-[70px]
        transition-all
        ${isDragOver ? 'opacity-100 scale-110 ring-2 ring-yellow-400 border-yellow-400' : 'opacity-50'}
        ${isHost ? 'cursor-pointer hover:opacity-80 hover:scale-105' : ''}
      `}
    >
      <div className={`h-10 w-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
        isDragOver ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/30'
      }`}>
        {isHost ? (
          <Plus className={`h-5 w-5 ${isDragOver ? 'text-yellow-400' : 'text-white/60'}`} />
        ) : (
          <User className="h-5 w-5 text-white/40" />
        )}
      </div>
      <span className={`text-[10px] font-medium mt-1 ${isDragOver ? 'text-yellow-400' : 'text-white/40'}`}>
        {isDragOver ? "Drop here" : isHost ? "Add" : "Empty"}
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
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dragOverTeam, setDragOverTeam] = useState<"A" | "B" | null>(null);
  const [dragOverPlaceholder, setDragOverPlaceholder] = useState<{ team: "A" | "B"; index: number } | null>(null);

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

  // Track dragging player's source position for swapping
  const [draggingSourceTeam, setDraggingSourceTeam] = useState<"A" | "B" | "unassigned" | null>(null);
  const [draggingSourceIndex, setDraggingSourceIndex] = useState<number | null>(null);
  const [dragOverPositionIndex, setDragOverPositionIndex] = useState<number | null>(null);
  
  // Touch drag state
  const touchDragRef = useRef<{
    playerId: string;
    sourceTeam: "A" | "B" | "unassigned";
    sourceIndex?: number;
    ghostEl?: HTMLDivElement;
  } | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, playerId: string, positionIndex?: number) => {
    const player = players.find(p => p.id === playerId);
    setDraggingPlayerId(playerId);
    setDraggingSourceTeam(player?.team || null);
    setDraggingSourceIndex(positionIndex ?? null);
    e.dataTransfer.setData('text/plain', playerId);
  };

  const handleDragEnd = () => {
    setDraggingPlayerId(null);
    setDragOverTeam(null);
    setDraggingSourceTeam(null);
    setDraggingSourceIndex(null);
    setDragOverPositionIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, team: "A" | "B") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTeam(team);
  };

  const handleDragLeave = () => {
    setDragOverTeam(null);
    setDragOverPositionIndex(null);
  };

  const handlePositionDragOver = (e: React.DragEvent, team: "A" | "B", posIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTeam(team);
    setDragOverPositionIndex(posIndex);
  };

  const handlePositionDrop = async (e: React.DragEvent, targetTeam: "A" | "B", targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedPlayerId = e.dataTransfer.getData('text/plain');
    
    if (!draggedPlayerId) return;
    
    const draggedPlayer = players.find(p => p.id === draggedPlayerId);
    if (!draggedPlayer) return;

    // Find target player at this position
    const targetTeamPlayers = targetTeam === "A" ? sortedTeamA : sortedTeamB;
    const targetPlayer = targetTeamPlayers[targetIndex];

    if (targetPlayer && targetPlayer.id !== draggedPlayerId) {
      // Swap positions: move target player to dragged player's original team/position
      try {
        // Update dragged player to target position/team
        await supabase.from("match_players").update({ team: targetTeam }).eq("id", draggedPlayerId);
        // Update target player to dragged player's original team
        if (draggingSourceTeam && draggingSourceTeam !== "unassigned") {
          await supabase.from("match_players").update({ team: draggingSourceTeam }).eq("id", targetPlayer.id);
        }
        toast.success("Players swapped!");
        onRefetch();
      } catch (error: any) {
        toast.error("Failed to swap players");
      }
    } else {
      // Just move to new team
      await handleMoveToTeam(draggedPlayerId, targetTeam);
    }

    handleDragEnd();
  };

  const handleDrop = async (e: React.DragEvent, team: "A" | "B") => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    if (playerId) {
      await handleMoveToTeam(playerId, team);
    }
    handleDragEnd();
  };

  // Touch event handlers for mobile
  const handleTouchStart = (playerId: string, team: "A" | "B" | "unassigned", positionIndex?: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setDraggingPlayerId(playerId);
    setDraggingSourceTeam(team);
    setDraggingSourceIndex(positionIndex ?? null);

    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'fixed pointer-events-none z-50 opacity-80 scale-110';
    ghost.innerHTML = `
      <div class="flex flex-col items-center p-2 rounded-lg bg-gradient-to-b from-primary/30 to-primary/50 border border-primary/50 backdrop-blur-sm min-w-[70px]">
        <div class="h-10 w-10 rounded-full bg-background/80 flex items-center justify-center text-xs font-bold">
          ${(player.profiles?.name || player.offline_player_name || 'P').charAt(0)}
        </div>
        <span class="text-[10px] font-medium text-white mt-1">${(player.profiles?.name || player.offline_player_name || 'Player').split(' ')[0]}</span>
      </div>
    `;
    document.body.appendChild(ghost);

    touchDragRef.current = {
      playerId,
      sourceTeam: team,
      sourceIndex: positionIndex,
      ghostEl: ghost,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragRef.current?.ghostEl) return;
    
    const touch = e.touches[0];
    touchDragRef.current.ghostEl.style.left = `${touch.clientX - 35}px`;
    touchDragRef.current.ghostEl.style.top = `${touch.clientY - 35}px`;

    // Detect which half of the pitch we're over
    if (pitchRef.current) {
      const pitchRect = pitchRef.current.getBoundingClientRect();
      const relativeY = touch.clientY - pitchRect.top;
      const halfHeight = pitchRect.height / 2;
      
      if (relativeY < halfHeight) {
        setDragOverTeam("B");
      } else if (relativeY > halfHeight && relativeY < pitchRect.height) {
        setDragOverTeam("A");
      } else {
        setDragOverTeam(null);
      }
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!touchDragRef.current) return;

    const { playerId, ghostEl } = touchDragRef.current;

    // Remove ghost element
    if (ghostEl) {
      ghostEl.remove();
    }

    // Get final touch position
    const touch = e.changedTouches[0];
    
    if (pitchRef.current) {
      const pitchRect = pitchRef.current.getBoundingClientRect();
      const relativeY = touch.clientY - pitchRect.top;
      const halfHeight = pitchRect.height / 2;

      // Determine target team
      let targetTeam: "A" | "B" | null = null;
      if (relativeY >= 0 && relativeY < halfHeight) {
        targetTeam = "B";
      } else if (relativeY >= halfHeight && relativeY < pitchRect.height) {
        targetTeam = "A";
      }

      if (targetTeam) {
        // Check for swap target - find element at touch point
        const elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
        const playerChipEl = elementsAtPoint.find(el => el.closest('[data-player-id]'));
        const targetPlayerId = playerChipEl?.closest('[data-player-id]')?.getAttribute('data-player-id');

        if (targetPlayerId && targetPlayerId !== playerId) {
          // Swap players
          const targetPlayer = players.find(p => p.id === targetPlayerId);
          if (targetPlayer && touchDragRef.current.sourceTeam !== "unassigned") {
            try {
              await supabase.from("match_players").update({ team: targetTeam }).eq("id", playerId);
              await supabase.from("match_players").update({ team: touchDragRef.current.sourceTeam }).eq("id", targetPlayerId);
              toast.success("Players swapped!");
              onRefetch();
            } catch (error) {
              toast.error("Failed to swap players");
            }
          } else {
            await handleMoveToTeam(playerId, targetTeam);
          }
        } else {
          await handleMoveToTeam(playerId, targetTeam);
        }
      }
    }

    touchDragRef.current = null;
    handleDragEnd();
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
      <div 
        ref={pitchRef}
        className="relative w-full aspect-[3/4] sm:aspect-[4/3] max-w-3xl mx-auto rounded-xl overflow-hidden shadow-2xl"
      >
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

        {/* Team B Players (Top Half) - Drop Zone */}
        <div 
          className={`absolute inset-0 top-0 h-1/2 transition-all ${
            isHost && dragOverTeam === "B" ? 'bg-red-500/20 ring-2 ring-red-500 ring-inset' : ''
          }`}
          onDragOver={isHost ? (e) => handleDragOver(e, "B") : undefined}
          onDragLeave={isHost ? handleDragLeave : undefined}
          onDrop={isHost ? (e) => handleDrop(e, "B") : undefined}
        >
          <div className="relative w-full h-full">
            {/* Active players */}
            {sortedTeamB.map((player, index) => {
              const positions = getFormationPositions(slotsPerTeam, true);
              const pos = positions[index % positions.length];
              const isDropTarget = dragOverTeam === "B" && dragOverPositionIndex === index && draggingPlayerId !== player.id;
              return (
                <div
                  key={player.id}
                  data-player-id={player.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all ${
                    isDropTarget ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110' : ''
                  }`}
                  style={{ top: pos?.top, left: pos?.left }}
                  onDragOver={isHost ? (e) => handlePositionDragOver(e, "B", index) : undefined}
                  onDrop={isHost ? (e) => handlePositionDrop(e, "B", index) : undefined}
                >
                  <PlayerChip 
                    player={player} 
                    team="B" 
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                    onRemove={isHost && !player.user_id ? handleRemoveOfflinePlayer : undefined}
                    isDragging={draggingPlayerId === player.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    positionIndex={index}
                  />
                </div>
              );
            })}
            {/* Empty placeholders */}
            {Array.from({ length: teamBEmpty }).map((_, index) => {
              const positions = getFormationPositions(slotsPerTeam, true);
              const pos = positions[(sortedTeamB.length + index) % positions.length];
              const isPlaceholderDragOver = dragOverPlaceholder?.team === "B" && dragOverPlaceholder?.index === index;
              return (
                <div
                  key={`empty-b-${index}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos?.top, left: pos?.left }}
                >
                  <PlaceholderChip 
                    team="B" 
                    isHost={isHost} 
                    onAddOfflinePlayer={handleAddOfflinePlayer}
                    isDragOver={isPlaceholderDragOver}
                    onDragOver={isHost ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverPlaceholder({ team: "B", index });
                      setDragOverTeam("B");
                    } : undefined}
                    onDragLeave={() => setDragOverPlaceholder(null)}
                    onDrop={isHost ? async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const playerId = e.dataTransfer.getData('text/plain');
                      if (playerId) {
                        await handleMoveToTeam(playerId, "B");
                      }
                      setDragOverPlaceholder(null);
                      handleDragEnd();
                    } : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Team A Players (Bottom Half) - Drop Zone */}
        <div 
          className={`absolute inset-0 top-1/2 h-1/2 transition-all ${
            isHost && dragOverTeam === "A" ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' : ''
          }`}
          onDragOver={isHost ? (e) => handleDragOver(e, "A") : undefined}
          onDragLeave={isHost ? handleDragLeave : undefined}
          onDrop={isHost ? (e) => handleDrop(e, "A") : undefined}
        >
          <div className="relative w-full h-full">
            {/* Active players */}
            {sortedTeamA.map((player, index) => {
              const positions = getFormationPositions(slotsPerTeam, false);
              const pos = positions[index % positions.length];
              const isDropTarget = dragOverTeam === "A" && dragOverPositionIndex === index && draggingPlayerId !== player.id;
              return (
                <div
                  key={player.id}
                  data-player-id={player.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all ${
                    isDropTarget ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110' : ''
                  }`}
                  style={{ top: pos?.top, left: pos?.left }}
                  onDragOver={isHost ? (e) => handlePositionDragOver(e, "A", index) : undefined}
                  onDrop={isHost ? (e) => handlePositionDrop(e, "A", index) : undefined}
                >
                  <PlayerChip 
                    player={player} 
                    team="A" 
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                    onRemove={isHost && !player.user_id ? handleRemoveOfflinePlayer : undefined}
                    isDragging={draggingPlayerId === player.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    positionIndex={index}
                  />
                </div>
              );
            })}
            {/* Empty placeholders */}
            {Array.from({ length: teamAEmpty }).map((_, index) => {
              const positions = getFormationPositions(slotsPerTeam, false);
              const pos = positions[(sortedTeamA.length + index) % positions.length];
              const isPlaceholderDragOver = dragOverPlaceholder?.team === "A" && dragOverPlaceholder?.index === index;
              return (
                <div
                  key={`empty-a-${index}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: pos?.top, left: pos?.left }}
                >
                  <PlaceholderChip 
                    team="A" 
                    isHost={isHost} 
                    onAddOfflinePlayer={handleAddOfflinePlayer}
                    isDragOver={isPlaceholderDragOver}
                    onDragOver={isHost ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverPlaceholder({ team: "A", index });
                      setDragOverTeam("A");
                    } : undefined}
                    onDragLeave={() => setDragOverPlaceholder(null)}
                    onDrop={isHost ? async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const playerId = e.dataTransfer.getData('text/plain');
                      if (playerId) {
                        await handleMoveToTeam(playerId, "A");
                      }
                      setDragOverPlaceholder(null);
                      handleDragEnd();
                    } : undefined}
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
                <div key={player.id} data-player-id={player.id}>
                  <PlayerChip 
                    player={player} 
                    team="unassigned"
                    isHost={isHost}
                    onMoveToTeam={isHost ? handleMoveToTeam : undefined}
                    onRemove={isHost && !player.user_id ? handleRemoveOfflinePlayer : undefined}
                    isDragging={draggingPlayerId === player.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                </div>
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
