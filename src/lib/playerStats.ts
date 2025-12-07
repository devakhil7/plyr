import { supabase } from "@/integrations/supabase/client";

/**
 * Calculates wins for a player based on their team assignment in completed matches.
 * A player wins if they were on Team A and team_a_score > team_b_score,
 * or on Team B and team_b_score > team_a_score.
 */
export async function calculatePlayerWins(userId: string): Promise<number> {
  // Get all matches the player participated in
  const { data: playerMatches } = await supabase
    .from("match_players")
    .select("match_id, team")
    .eq("user_id", userId);

  if (!playerMatches || playerMatches.length === 0) {
    return 0;
  }

  const matchIds = playerMatches.map(pm => pm.match_id);
  
  // Get completed matches with scores
  const { data: completedMatches } = await supabase
    .from("matches")
    .select("id, team_a_score, team_b_score")
    .in("id", matchIds)
    .eq("status", "completed");

  if (!completedMatches) {
    return 0;
  }

  let wins = 0;
  for (const match of completedMatches) {
    const playerTeam = playerMatches.find(pm => pm.match_id === match.id)?.team;
    if (match.team_a_score !== null && match.team_b_score !== null) {
      if (playerTeam === "A" && match.team_a_score > match.team_b_score) {
        wins++;
      } else if (playerTeam === "B" && match.team_b_score > match.team_a_score) {
        wins++;
      }
    }
  }

  return wins;
}

/**
 * Determines if a player won a specific match based on their team assignment.
 */
export function didPlayerWin(
  playerTeam: string | null | undefined,
  teamAScore: number | null,
  teamBScore: number | null
): boolean {
  if (teamAScore === null || teamBScore === null || !playerTeam) {
    return false;
  }
  
  if (playerTeam === "A" && teamAScore > teamBScore) {
    return true;
  }
  if (playerTeam === "B" && teamBScore > teamAScore) {
    return true;
  }
  
  return false;
}

/**
 * Calculates wins and losses for a player from a list of match participation data.
 */
export function calculateWinsLosses(
  matchParticipations: Array<{
    team: string | null;
    matches: {
      team_a_score: number | null;
      team_b_score: number | null;
      status: string | null;
    } | null;
  }>
): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;

  matchParticipations.forEach((mp) => {
    const match = mp.matches;
    if (match && match.team_a_score !== null && match.team_b_score !== null) {
      if (mp.team === "A" && match.team_a_score > match.team_b_score) {
        wins++;
      } else if (mp.team === "B" && match.team_b_score > match.team_a_score) {
        wins++;
      } else if (mp.team === "A" && match.team_a_score < match.team_b_score) {
        losses++;
      } else if (mp.team === "B" && match.team_b_score < match.team_a_score) {
        losses++;
      }
    }
  });

  return { wins, losses };
}
