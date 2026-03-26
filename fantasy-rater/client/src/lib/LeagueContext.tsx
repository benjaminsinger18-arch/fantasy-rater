import React, { createContext, useContext, useState, useEffect } from 'react';
import type { LeagueConfig, Sport } from '../types/index.ts';

const DEFAULT_CONFIG: LeagueConfig = {
  sport: 'nfl',
  platform: 'sleeper',
  leagueId: '',
  scoringFormat: 'PPR',
  leagueSize: 12,
  weeksRemaining: 10,
  currentWeek: 1,
};

interface LeagueContextType {
  config: LeagueConfig;
  setConfig: (c: Partial<LeagueConfig>) => void;
  setSport: (s: Sport) => void;
}

const LeagueContext = createContext<LeagueContextType>({
  config: DEFAULT_CONFIG,
  setConfig: () => {},
  setSport: () => {},
});

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<LeagueConfig>(() => {
    try {
      const stored = localStorage.getItem('fantasy-rater-league');
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  useEffect(() => {
    localStorage.setItem('fantasy-rater-league', JSON.stringify(config));
  }, [config]);

  // Pick up Yahoo session from URL on redirect back from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yahooSession = params.get('yahoo_session');
    if (yahooSession) {
      setConfigState(prev => ({ ...prev, yahooSessionId: yahooSession }));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const setConfig = (partial: Partial<LeagueConfig>) => {
    setConfigState(prev => ({ ...prev, ...partial }));
  };

  const setSport = (sport: Sport) => {
    const formatMap: Record<Sport, LeagueConfig['scoringFormat']> = {
      nfl: 'PPR',
      mlb: 'H2H Points',
      fpl: 'FPL Standard',
    };
    const platformMap: Record<Sport, LeagueConfig['platform']> = {
      nfl: 'sleeper',
      mlb: 'espn',
      fpl: 'fpl',
    };
    setConfigState(prev => ({
      ...prev,
      sport,
      scoringFormat: formatMap[sport],
      platform: platformMap[sport],
    }));
  };

  return (
    <LeagueContext.Provider value={{ config, setConfig, setSport }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
}
