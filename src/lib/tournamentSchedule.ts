// Tournament schedule generation utilities

export interface ScheduleSlot {
  round: string;
  matchOrder: number;
  slotA: string;
  slotB: string;
  groupName?: string;
}

// Generate slot labels (Team A, Team B, etc.)
export function getSlotLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) {
    return `Team ${letters[index]}`;
  }
  // For more than 26 teams, use AA, AB, etc.
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `Team ${letters[first]}${letters[second]}`;
}

// Generate knockout bracket schedule
export function generateKnockoutSchedule(numTeams: number): ScheduleSlot[] {
  const schedule: ScheduleSlot[] = [];
  let currentRound = numTeams;
  let matchOrder = 1;
  let slotIndex = 0;
  
  // First round - all teams play
  const firstRoundMatches = numTeams / 2;
  const firstRoundName = getRoundName(numTeams);
  
  for (let i = 0; i < firstRoundMatches; i++) {
    schedule.push({
      round: firstRoundName,
      matchOrder: matchOrder++,
      slotA: getSlotLabel(slotIndex++),
      slotB: getSlotLabel(slotIndex++),
    });
  }
  
  // Subsequent rounds
  currentRound = numTeams / 2;
  while (currentRound >= 2) {
    const roundName = getRoundName(currentRound);
    const matches = currentRound / 2;
    
    for (let i = 0; i < matches; i++) {
      const prevRoundName = getRoundName(currentRound * 2);
      schedule.push({
        round: roundName,
        matchOrder: matchOrder++,
        slotA: `Winner ${prevRoundName} M${(i * 2) + 1}`,
        slotB: `Winner ${prevRoundName} M${(i * 2) + 2}`,
      });
    }
    
    currentRound = currentRound / 2;
  }
  
  // Add third place match if more than 2 teams
  if (numTeams > 2) {
    schedule.push({
      round: 'third-place',
      matchOrder: matchOrder++,
      slotA: 'Loser Semi 1',
      slotB: 'Loser Semi 2',
    });
  }
  
  return schedule;
}

// Generate group stage + knockout schedule
export function generateGroupKnockoutSchedule(numTeams: number): ScheduleSlot[] {
  const schedule: ScheduleSlot[] = [];
  
  // Determine number of groups (4 teams per group typically)
  const teamsPerGroup = 4;
  const numGroups = Math.ceil(numTeams / teamsPerGroup);
  const groupLetters = 'ABCDEFGHIJKLMNOP';
  
  let matchOrder = 1;
  let teamIndex = 0;
  
  // Generate group stage matches
  for (let g = 0; g < numGroups; g++) {
    const groupName = `Group ${groupLetters[g]}`;
    const groupTeams: string[] = [];
    
    for (let t = 0; t < teamsPerGroup && teamIndex < numTeams; t++) {
      groupTeams.push(getSlotLabel(teamIndex++));
    }
    
    // Round robin within group
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        schedule.push({
          round: 'group',
          matchOrder: matchOrder++,
          slotA: groupTeams[i],
          slotB: groupTeams[j],
          groupName,
        });
      }
    }
  }
  
  // Add knockout rounds based on number of groups
  const knockoutTeams = numGroups * 2; // Top 2 from each group
  
  if (knockoutTeams >= 8) {
    // Quarter finals
    for (let i = 0; i < 4; i++) {
      schedule.push({
        round: 'quarter-final',
        matchOrder: matchOrder++,
        slotA: i < 2 ? `1st Group ${groupLetters[i * 2]}` : `2nd Group ${groupLetters[(i - 2) * 2 + 1]}`,
        slotB: i < 2 ? `2nd Group ${groupLetters[i * 2 + 1]}` : `1st Group ${groupLetters[(i - 2) * 2 + 1]}`,
      });
    }
  }
  
  if (knockoutTeams >= 4) {
    // Semi finals
    for (let i = 0; i < 2; i++) {
      schedule.push({
        round: 'semi-final',
        matchOrder: matchOrder++,
        slotA: `Winner QF ${i * 2 + 1}`,
        slotB: `Winner QF ${i * 2 + 2}`,
      });
    }
  }
  
  // Third place
  schedule.push({
    round: 'third-place',
    matchOrder: matchOrder++,
    slotA: 'Loser SF 1',
    slotB: 'Loser SF 2',
  });
  
  // Final
  schedule.push({
    round: 'final',
    matchOrder: matchOrder++,
    slotA: 'Winner SF 1',
    slotB: 'Winner SF 2',
  });
  
  return schedule;
}

function getRoundName(teamsInRound: number): string {
  switch (teamsInRound) {
    case 2: return 'final';
    case 4: return 'semi-final';
    case 8: return 'quarter-final';
    case 16: return 'round-of-16';
    case 32: return 'round-of-32';
    case 64: return 'round-of-64';
    default: return `round-of-${teamsInRound}`;
  }
}

// Shuffle array using Fisher-Yates algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Map registered teams to schedule slots
export function assignTeamsToSlots(
  teams: { id: string; team_name: string }[],
  numSlots: number,
  shuffle: boolean = true
): Map<string, { teamId: string; teamName: string } | null> {
  const slotMap = new Map<string, { teamId: string; teamName: string } | null>();
  
  // Create all slots
  for (let i = 0; i < numSlots; i++) {
    slotMap.set(getSlotLabel(i), null);
  }
  
  // Assign teams (optionally shuffled)
  const orderedTeams = shuffle ? shuffleArray(teams) : teams;
  orderedTeams.forEach((team, index) => {
    if (index < numSlots) {
      slotMap.set(getSlotLabel(index), { teamId: team.id, teamName: team.team_name });
    }
  });
  
  return slotMap;
}
