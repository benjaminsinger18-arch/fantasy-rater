export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  injuryStatus?: string | null;
  avgPoints?: number;
  projectedRemaining?: number;
  rank?: number;
  form?: number;
  epNext?: number;
  age?: number;
  yearsExp?: number;
  searchRank?: number | null;
  photo?: string;         // Direct photo URL (e.g. IPL TheSportsDB)
  photoCode?: number;     // FPL player code for photo URL
  teamCode?: number;      // FPL team code for badge fallback
  espnId?: number;        // ESPN player ID for headshots
  rotowireId?: string;    // Rotowire player ID for headshots
  web_name?: string;      // FPL short name
  percentOwned?: number;  // ESPN ownership % (MLB)
  nationality?: string;   // IPL player nationality
  // FPL
  now_cost?: number;
  selected_by_percent?: string;
  total_points?: number;
}

export interface TradeScore {
  sideAScore: number;
  sideBScore: number;
  ratio: number;
  verdict: string;
  analysisHash: string;
}

export interface TeamScore {
  score: number;
  grade: string;
  positionBreakdown: Record<string, { score: number; grade: string }>;
  analysisHash: string;
}

export type Sport = 'nfl' | 'mlb' | 'fpl' | 'ipl';
export type Platform = 'sleeper' | 'espn' | 'yahoo' | 'fpl' | 'ipl';
export type ScoringFormat = 'PPR' | 'Half-PPR' | 'Standard' | 'FPL Standard' | 'Roto' | 'H2H Points' | 'Dream11 Points';

export interface LeagueConfig {
  sport: Sport;
  platform: Platform;
  leagueId: string;
  scoringFormat: ScoringFormat;
  leagueSize: number;
  weeksRemaining: number;
  currentWeek: number;
  espnS2?: string;
  swid?: string;
  yahooSessionId?: string;
  fplManagerId?: string;
  myRosterId?: string;
}

export interface LeagueTeam {
  rosterId: string | number;
  teamName: string;
  currentRecord: string;
  currentRank: number;
  rosterScore: number;
  rosterGrade: string;
  positionBreakdown: Record<string, { score: number; grade: string }>;
  projectedRank: number;
}

export interface LeagueTeamWithRange extends LeagueTeam {
  projectedRange: [number, number];
}

export interface LeaguePrediction {
  teams: LeagueTeam[];
  myTeam: LeagueTeamWithRange | null;
  leagueAvgRosterScore: number;
  analysisHash: string;
}
