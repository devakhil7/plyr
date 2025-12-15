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

  const MatchCard = ({ match }: { match: TournamentMatch }) => {
    const teamA = getTeamName(match, "a");
    const teamB = getTeamName(match, "b");
    const hasScore = match.matches?.team_a_score !== null && match.matches?.team_b_score !== null;
    const scoreA = match.matches?.team_a_score ?? "-";
    const scoreB = match.matches?.team_b_score ?? "-";

    return (
      <Link 
        to={`/matches/${match.match_id}`}
        className="block bg-card border rounded-lg hover:border-primary/50 transition-colors p-2 w-[140px]"
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1 text-xs">
            <span className="font-medium truncate flex-1">{teamA}</span>
            <span className={cn(
              "font-bold min-w-[20px] text-center",
              hasScore && match.matches?.team_a_score! > match.matches?.team_b_score! && "text-primary"
            )}>
              {hasScore ? scoreA : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 text-xs">
            <span className="font-medium truncate flex-1">{teamB}</span>
            <span className={cn(
              "font-bold min-w-[20px] text-center",
              hasScore && match.matches?.team_b_score! > match.matches?.team_a_score! && "text-primary"
            )}>
              {hasScore ? scoreB : ""}
            </span>
          </div>
        </div>
      </Link>
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

  // Get matches by round
  const quarterFinals = matchesByRound["quarter-final"] || [];
  const semiFinals = matchesByRound["semi-final"] || [];
  const finals = matchesByRound["final"] || [];
  const thirdPlace = matchesByRound["third-place"] || [];
  const roundOf16 = matchesByRound["round-of-16"] || [];

  // Split matches for left and right sides
  const leftQF = quarterFinals.slice(0, 2);
  const rightQF = quarterFinals.slice(2, 4);
  const leftSF = semiFinals.slice(0, 1);
  const rightSF = semiFinals.slice(1, 2);
  const leftR16 = roundOf16.slice(0, 4);
  const rightR16 = roundOf16.slice(4, 8);

  return (
    <div className="space-y-8">
      {/* Knockout Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[900px]">
          {/* Headers */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex gap-8">
              {roundOf16.length > 0 && (
                <div className="w-[140px] text-center">
                  <Badge variant="outline" className="text-xs">Round of 16</Badge>
                </div>
              )}
              {quarterFinals.length > 0 && (
                <div className="w-[140px] text-center">
                  <Badge variant="outline" className="text-xs">Quarter Finals</Badge>
                </div>
              )}
              {semiFinals.length > 0 && (
                <div className="w-[140px] text-center">
                  <Badge variant="outline" className="text-xs">Semi Finals</Badge>
                </div>
              )}
            </div>
            
            <div className="w-[160px] text-center">
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                🏆 Final
              </Badge>
            </div>
            
            <div className="flex gap-8 flex-row-reverse">
              {roundOf16.length > 0 && (
                <div className="w-[140px] text-center">
                  <Badge variant="outline" className="text-xs">Round of 16</Badge>
                </div>
              )}
              {quarterFinals.length > 0 && (
                <div className="w-[140px] text-center">
                  <Badge variant="outline" className="text-xs">Quarter Finals</Badge>
                </div>
              )}
              {semiFinals.length > 0 && (
                <div className="w-[140px] text-center">
                  <Badge variant="outline" className="text-xs">Semi Finals</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Bracket Grid */}
          <div className="flex items-stretch justify-between gap-4">
            {/* Left Side */}
            <div className="flex gap-4">
              {/* Round of 16 Left */}
              {leftR16.length > 0 && (
                <div className="flex flex-col justify-around gap-2">
                  {leftR16.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
              
              {/* Quarter Finals Left */}
              {leftQF.length > 0 && (
                <div className="flex flex-col justify-around" style={{ gap: leftR16.length > 0 ? '4rem' : '2rem' }}>
                  {leftQF.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
              
              {/* Semi Finals Left */}
              {leftSF.length > 0 && (
                <div className="flex flex-col justify-center">
                  {leftSF.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </div>

            {/* Center - Finals & Third Place */}
            <div className="flex flex-col items-center justify-center gap-6 w-[160px]">
              {finals.length > 0 && (
                <div>
                  {finals.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
              
              {thirdPlace.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    🥉 Third Place
                  </Badge>
                  {thirdPlace.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Side (Mirrored) */}
            <div className="flex gap-4 flex-row-reverse">
              {/* Round of 16 Right */}
              {rightR16.length > 0 && (
                <div className="flex flex-col justify-around gap-2">
                  {rightR16.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
              
              {/* Quarter Finals Right */}
              {rightQF.length > 0 && (
                <div className="flex flex-col justify-around" style={{ gap: rightR16.length > 0 ? '4rem' : '2rem' }}>
                  {rightQF.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
              
              {/* Semi Finals Right */}
              {rightSF.length > 0 && (
                <div className="flex flex-col justify-center">
                  {rightSF.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer hint */}
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
