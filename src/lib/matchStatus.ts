// Match status utilities for auto-determining status based on time

export type ComputedMatchStatus = 'upcoming' | 'in_progress' | 'completed';

interface MatchTimeInfo {
  match_date: string;
  match_time: string;
  duration_minutes: number;
}

/**
 * Computes the real-time status of a match based on its scheduled time
 */
export function computeMatchStatus(match: MatchTimeInfo): ComputedMatchStatus {
  const now = new Date();
  
  // Parse match start time
  const [hours, minutes] = match.match_time.split(':').map(Number);
  const matchStart = new Date(match.match_date);
  matchStart.setHours(hours, minutes, 0, 0);
  
  // Calculate match end time
  const matchEnd = new Date(matchStart.getTime() + (match.duration_minutes * 60 * 1000));
  
  if (now < matchStart) {
    return 'upcoming';
  } else if (now >= matchStart && now <= matchEnd) {
    return 'in_progress';
  } else {
    return 'completed';
  }
}

/**
 * Maps computed status to display status
 */
export function getDisplayStatus(computedStatus: ComputedMatchStatus): string {
  const statusMap: Record<ComputedMatchStatus, string> = {
    upcoming: 'open',
    in_progress: 'in_progress',
    completed: 'completed'
  };
  return statusMap[computedStatus];
}

/**
 * Check if a match has started (for features that only work after match starts)
 */
export function hasMatchStarted(match: MatchTimeInfo): boolean {
  const status = computeMatchStatus(match);
  return status === 'in_progress' || status === 'completed';
}

/**
 * Check if a match has completed (for features that only work after match ends)
 */
export function hasMatchCompleted(match: MatchTimeInfo): boolean {
  return computeMatchStatus(match) === 'completed';
}
