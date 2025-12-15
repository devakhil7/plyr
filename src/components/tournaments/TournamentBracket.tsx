import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TournamentMatch {
  id: string;
  round: string;
  match_id: string;
  slot_a: string | null;
  slot_b: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  match_order: number | null;
  group_name?: string | null;
  matches?: {
    id: string;
    match_name: string;
    match_date: string;
    match_time: string;
    team_a_score: number | null;
    team_b_score: number | null;
    status: string;
  };
}

interface Team {
  id: string;
  team_name: string;
}

interface TournamentBracketProps {
  matches: TournamentMatch[];
  teams: Team[];
  format: string;
}

const ROUND_ORDER = [
  "round-of-64",
  "round-of-32", 
  "round-of-16",
  "quarter-final",
  "semi-final",
  "final",
  "third-place",
];

const ROUND_LABELS: Record<string, string> = {
  "round-of-64": "Round of 64",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  "quarter-final": "Quarter Finals",
  "semi-final": "Semi Finals",
  final: "Final",
  "third-place": "Third Place",
  group: "Group Stage",
};

export function TournamentBracket({ matches, teams, format }: TournamentBracketProps) {
  const getTeamName = (match: TournamentMatch, side: "a" | "b") => {
    const teamId = side === "a" ? match.team_a_id : match.team_b_id;
    const slot = side === "a" ? match.slot_a : match.slot_b;
    
    if (teamId) {
      const team = teams.find(t => t.id === teamId);
      return team?.team_name || "TBD";
    }
    return slot || "TBD";
  };

  // Separate group matches and knockout matches
  const groupMatches = matches.filter(m => m.round === "group");
  const knockoutMatches = matches.filter(m => m.round !== "group");

  // Organize knockout matches by round
  const matchesByRound: Record<string, TournamentMatch[]> = {};
  knockoutMatches.forEach(match => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = [];
    }
    matchesByRound[match.round].push(match);
  });

  // Sort matches within each round by match_order
  Object.keys(matchesByRound).forEach(round => {
    matchesByRound[round].sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0));
  });

  // Get rounds that have matches
  const activeRounds = ROUND_ORDER.filter(round => matchesByRound[round]?.length > 0);
  
  // For bracket layout, separate left and right sides
  const leftRounds = activeRounds.filter(r => r !== "final" && r !== "third-place");
  const hasMultipleSemis = (matchesByRound["semi-final"]?.length ?? 0) >= 2;
  
  // Split early rounds for left/right sides
  const splitRounds = leftRounds.slice(0, -1); // All except semi-finals
  const semiFinalsRound = leftRounds.includes("semi-final") ? "semi-final" : null;

  const MatchCard = ({ match, compact = false }: { match: TournamentMatch; compact?: boolean }) => {
    const teamA = getTeamName(match, "a");
    const teamB = getTeamName(match, "b");
    const hasScore = match.matches?.team_a_score !== null && match.matches?.team_b_score !== null;
    const scoreA = match.matches?.team_a_score ?? "-";
    const scoreB = match.matches?.team_b_score ?? "-";

    return (
      <Link 
        to={`/matches/${match.match_id}`}
        className={cn(
          "block bg-card border rounded-lg hover:border-primary/50 transition-colors",
          compact ? "p-2" : "p-3"
        )}
      >
        <div className="space-y-1">
          <div className={cn(
            "flex items-center justify-between gap-2",
            compact ? "text-xs" : "text-sm"
          )}>
            <span className="font-medium truncate flex-1">{teamA}</span>
            <span className={cn(
              "font-bold min-w-[24px] text-center",
              hasScore && match.matches?.team_a_score! > match.matches?.team_b_score! && "text-primary"
            )}>
              {hasScore ? scoreA : ""}
            </span>
          </div>
          <div className={cn(
            "flex items-center justify-between gap-2",
            compact ? "text-xs" : "text-sm"
          )}>
            <span className="font-medium truncate flex-1">{teamB}</span>
            <span className={cn(
              "font-bold min-w-[24px] text-center",
              hasScore && match.matches?.team_b_score! > match.matches?.team_a_score! && "text-primary"
            )}>
              {hasScore ? scoreB : ""}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  const RoundColumn = ({ 
    round, 
    matches: roundMatches, 
    side 
  }: { 
    round: string; 
    matches: TournamentMatch[]; 
    side: "left" | "right" | "center" 
  }) => {
    // For left/right sides, split matches in half
    let displayMatches = roundMatches;
    if (side === "left") {
      displayMatches = roundMatches.slice(0, Math.ceil(roundMatches.length / 2));
    } else if (side === "right") {
      displayMatches = roundMatches.slice(Math.ceil(roundMatches.length / 2));
    }

    return (
      <div className="flex flex-col">
        <div className="text-center mb-3">
          <Badge variant="outline" className="text-xs font-semibold">
            {ROUND_LABELS[round] || round}
          </Badge>
        </div>
        <div className={cn(
          "flex flex-col justify-around flex-1 gap-2",
          round === "final" && "justify-center"
        )}>
          {displayMatches.map((match) => (
            <MatchCard key={match.id} match={match} compact={displayMatches.length > 2} />
          ))}
        </div>
      </div>
    );
  };

  // If no knockout matches yet, show empty state
  if (knockoutMatches.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Match schedule not yet available
      </div>
    );
  }

  // Determine bracket structure
  const semiFinals = matchesByRound["semi-final"] || [];
  const finals = matchesByRound["final"] || [];
  const thirdPlace = matchesByRound["third-place"] || [];
  const quarterFinals = matchesByRound["quarter-final"] || [];
  const roundOf16 = matchesByRound["round-of-16"] || [];
  const roundOf32 = matchesByRound["round-of-32"] || [];

  return (
    <div className="space-y-8">
      {/* Knockout Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[800px]">
          {/* Main bracket grid */}
          <div className="flex items-stretch gap-4">
            {/* Left side rounds */}
            <div className="flex gap-4 flex-1">
              {/* Round of 32 left */}
              {roundOf32.length > 0 && (
                <div className="flex-1 max-w-[140px]">
                  <RoundColumn round="round-of-32" matches={roundOf32} side="left" />
                </div>
              )}
              
              {/* Round of 16 left */}
              {roundOf16.length > 0 && (
                <div className="flex-1 max-w-[140px]">
                  <RoundColumn round="round-of-16" matches={roundOf16} side="left" />
                </div>
              )}
              
              {/* Quarter Finals left */}
              {quarterFinals.length > 0 && (
                <div className="flex-1 max-w-[160px]">
                  <RoundColumn round="quarter-final" matches={quarterFinals} side="left" />
                </div>
              )}
              
              {/* Semi Finals left */}
              {semiFinals.length > 0 && (
                <div className="flex-1 max-w-[160px]">
                  <RoundColumn round="semi-final" matches={semiFinals} side="left" />
                </div>
              )}
            </div>

            {/* Center - Finals */}
            <div className="flex flex-col gap-6 w-[180px]">
              {/* Final */}
              {finals.length > 0 && (
                <div className="flex-1">
                  <div className="text-center mb-3">
                    <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                      🏆 Final
                    </Badge>
                  </div>
                  <div className="flex flex-col justify-center h-full">
                    {finals.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Third Place */}
              {thirdPlace.length > 0 && (
                <div className="flex-1">
                  <div className="text-center mb-3">
                    <Badge variant="outline" className="text-xs">
                      🥉 Third Place
                    </Badge>
                  </div>
                  <div className="flex flex-col justify-center">
                    {thirdPlace.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right side rounds (mirrored) */}
            <div className="flex gap-4 flex-row-reverse flex-1">
              {/* Round of 32 right */}
              {roundOf32.length > 0 && (
                <div className="flex-1 max-w-[140px]">
                  <RoundColumn round="round-of-32" matches={roundOf32} side="right" />
                </div>
              )}
              
              {/* Round of 16 right */}
              {roundOf16.length > 0 && (
                <div className="flex-1 max-w-[140px]">
                  <RoundColumn round="round-of-16" matches={roundOf16} side="right" />
                </div>
              )}
              
              {/* Quarter Finals right */}
              {quarterFinals.length > 0 && (
                <div className="flex-1 max-w-[160px]">
                  <RoundColumn round="quarter-final" matches={quarterFinals} side="right" />
                </div>
              )}
              
              {/* Semi Finals right */}
              {semiFinals.length > 0 && (
                <div className="flex-1 max-w-[160px]">
                  <RoundColumn round="semi-final" matches={semiFinals} side="right" />
                </div>
              )}
            </div>
          </div>

          {/* Connector lines visualization hint */}
          <div className="flex justify-center mt-6">
            <p className="text-xs text-muted-foreground">
              Click any match to view details
            </p>
          </div>
        </div>
      </div>

      {/* Group Stage */}
      {groupMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Group Stage</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupMatches
              .sort((a, b) => {
                // Sort by group name, then match order
                const groupCompare = (a.group_name || "").localeCompare(b.group_name || "");
                if (groupCompare !== 0) return groupCompare;
                return (a.match_order ?? 0) - (b.match_order ?? 0);
              })
              .map(match => (
                <Link
                  key={match.id}
                  to={`/matches/${match.match_id}`}
                  className="p-3 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <Badge variant="outline" className="text-xs mb-2">
                    {match.group_name || "Group"}
                  </Badge>
                  <p className="font-medium text-sm">
                    {getTeamName(match, "a")} vs {getTeamName(match, "b")}
                  </p>
                  {match.matches?.team_a_score !== null && (
                    <p className="text-lg font-bold mt-1">
                      {match.matches.team_a_score} - {match.matches.team_b_score}
                    </p>
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
